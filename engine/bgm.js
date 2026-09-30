/* ============================================================
 * iskill-generative-bgm · 纯前端生成式 BGM 引擎 v1.1.0
 * 零依赖 ESM —— Web Audio 实时合成，无任何音频素材，完全离线。
 *
 * v1.1.0 新增 ABC 记谱支持：
 *   - parseAbc(abcText) 解析实用子集（X/T/M/Q/L/K 头 + "和弦"符号 + 音名时值 + z 休止）
 *   - registerAbcTheme(id, abc, opts) 把 ABC 注册成主题
 *   - 内置默认主题 cheerful = F-G-Am 欢乐点点和声循环（ABC 定义；主旋律围绕和弦生成：
 *     强拍取最近和弦音，弱拍沿调式音阶级进，短促拨弦音色）
 *
 * 两种音源：
 *   kind:'theme'    旋律型主题（和弦进行 + 拨弦旋律 + 低音 + 和声垫）
 *   kind:'ambience' 氛围型预设（深空/雨夜/篝火/古琴）
 *
 * 核心 API（createBgm() 返回）：
 *   start({ kind, id, volume })  开始播放（需在用户手势内首次调用）
 *   stop() / setVolume(v) / duck(level, ms) / unduck(ms) / unlock() / dispose()
 *   suggestTheme(tags)           按关键词/标签猜主题
 *   registerAbcTheme(id, abc)    用 ABC 记谱注册/覆盖主题
 *
 * 信号链：voices → bus → master(用户音量) → duckGain(闪避) → 压限器 → destination
 * 调度：lookahead（tale of two clocks）—— setInterval 40ms 轮询，提前 0.15s 排音符。
 * ============================================================ */

const AC = () => window.AudioContext || window.webkitAudioContext;

/* ============================================================
 * 一、ABC 记谱解析（实用子集）
 * ============================================================ */

const NOTE_SEMI = { C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11 };
/* 调号 → [主音音高(pc, C=0), 大/小]（音阶 = 主音 + 调式音级） */
const KEY_SIGS = {
  C: [0, 'maj'], G: [7, 'maj'], D: [2, 'maj'], A: [9, 'maj'], E: [4, 'maj'], B: [11, 'maj'],
  'F#': [6, 'maj'], F: [5, 'maj'], Bb: [10, 'maj'], Eb: [3, 'maj'],
  Am: [9, 'min'], Em: [4, 'min'], Bm: [11, 'min'], 'F#m': [6, 'min'], Cm: [0, 'min'], Dm: [2, 'min'], Gm: [7, 'min']
};
const MAJOR_PC = [0, 2, 4, 5, 7, 9, 11], MINOR_PC = [0, 2, 3, 5, 7, 8, 10];

/* 和弦符号 → { root(midi, C4=60), triad(midi 数组) }，支持 maj/m/m7/7/6/dim/aug/sus2/sus4 */
export function chordTriad(label) {
  const m = /^([A-G])([#b]?)(maj|min|m|maj7|m7|7|6|dim|aug|sus2|sus4)?$/.exec(String(label).trim());
  if (!m) return null;
  const [, r, acc, q0] = m;
  const q = q0 || '';
  const root = 60 + NOTE_SEMI[r] + (acc === '#' ? 1 : acc === 'b' ? -1 : 0);
  let iv = [0, 4, 7];
  if (q === 'm' || q === 'min' || q === 'm7') iv = [0, 3, 7];
  else if (q === 'dim') iv = [0, 3, 6];
  else if (q === 'aug') iv = [0, 4, 8];
  else if (q === 'sus2') iv = [0, 2, 7];
  else if (q === 'sus4') iv = [0, 5, 7];
  else if (q === '6') iv = [0, 4, 7, 9];
  else if (q === '7') iv = [0, 4, 7, 10];
  else if (q === 'm7') iv = [0, 3, 7, 10];
  else if (q === 'maj7') iv = [0, 4, 7, 11];
  return { root, triad: iv.map((i) => root + i) };
}

/* 拍号 → 每小节八分音符单位数 */
function meterUnits(m) {
  const x = /^(\d+)\/(\d+)/.exec((m || '4/4').trim());
  if (!x) return 8;
  return Math.round((+x[1]) * 8 / (+x[2]));
}
function tempoBpm(q) {
  if (!q) return 100;
  const x = /=\s*(\d+(?:\.\d+)?)/.exec(q);          /* Q:1/4=112 */
  if (x) return +x[1];
  const n = /(\d+(?:\.\d+)?)/.exec(q);              /* Q:112 */
  return n ? +n[1] : 100;
}

/** 解析 ABC（实用子集）。返回：
 *  { title, bpm, perBar, scalePC, bars:[{ chord, triad:[midi]|null, root, melody:[{midi,start,dur}]|null }] }
 *  melody=null 的小节只有和声（休止/无音符）→ 播放时围绕和弦生成旋律。 */
export function parseAbc(text) {
  const lines = String(text).split(/\r?\n/);
  const info = { X: '', T: '', M: '4/4', Q: '', L: '1/8', K: 'C' };
  const bodyLines = [];
  let inBody = false;
  for (const raw of lines) {
    const line = raw.trim();
    if (!line) continue;
    const h = /^([A-Za-z]):\s*(.+)$/.exec(line);
    if (h && !inBody && 'XTMQLK'.includes(h[1])) { info[h[1]] = h[2].trim(); continue; }
    bodyLines.push(line); inBody = true;
  }

  const bpm = tempoBpm(info.Q);
  const perBar = meterUnits(info.M);
  const Lx = /^(\d+)\/(\d+)$/.exec(info.L);
  const lNum = Lx ? +Lx[1] : 1, lDen = Lx ? +Lx[2] : 8;   /* 默认音长 L:1/8 */
  const lUnits = lNum * 8 / lDen;                          /* 一个默认音长 = 多少个八分单位 */

  const key = KEY_SIGS[info.K] ? info.K : 'C';
  const [tonic, mode] = KEY_SIGS[key];
  const scalePC = (mode === 'min' ? MINOR_PC : MAJOR_PC).map((p) => (tonic + p) % 12).sort((a, b) => a - b);

  const TOKEN = /"([^"]+)"|(\^|_|=)?([A-Ga-g])([,']*)(\d+)?(\/(\d+))?|(z)(\d+)?(\/(\d+))?/g;
  const bars = [];
  let cur = null, pos = 0, lastChord = null;

  const durUnits = (num, den, bare) => (num ? (den ? num / den : num) : bare) * lUnits;

  function newBar() {
    cur = { chord: lastChord, triad: null, root: null, melody: null };
    bars.push(cur); pos = 0;
  }

  for (const line of bodyLines) {
    if (/^%/.test(line)) continue;
    TOKEN.lastIndex = 0;
    let m;
    while ((m = TOKEN.exec(line))) {
      if (m[1] != null) {                                  /* "和弦" */
        const c = chordTriad(m[1]);
        lastChord = m[1];
        if (c) {
          /* 和弦出现在小节中间（pos>0 且已有和弦）→ 视为新小节开始 */
          if (!cur || (pos > 0 && cur.triad)) newBar();
          cur.chord = m[1]; cur.triad = c.triad; cur.root = c.root;
        }
        continue;
      }
      if (m[8] === 'z') {                                  /* 休止 */
        pos += durUnits(m[9] ? +m[9] : 0, m[11] ? +m[11] : 0, 1);
        continue;
      }
      /* 音名 */
      if (!cur) newBar();
      if (!cur.triad) {                                    /* 无和弦标记：按调内主和弦兜底 */
        const c = chordTriad(key);
        cur.triad = c ? c.triad : [60, 64, 67];
        cur.root = c ? c.root : 60;
        cur.chord = cur.chord || key;
      }
      let midi = 60 + NOTE_SEMI[m[3].toUpperCase()] + (m[3] === m[3].toLowerCase() ? 12 : 0);
      if (m[2] === '^') midi += 1; else if (m[2] === '_') midi -= 1;
      midi += (m[4] || '').split('').reduce((a, ch) => a + (ch === ',' ? -12 : 12), 0);
      const d = durUnits(m[5] ? +m[5] : 0, m[7] ? +m[7] : 0, 1);
      cur.melody = cur.melody || [];
      cur.melody.push({ midi, start: Math.min(pos, perBar - 1), dur: Math.max(1, d) });
      pos += d;
      if (pos >= perBar) { pos = 0; cur = null; }          /* 满小节自动换行 */
    }
    cur = null;                                            /* 行尾视为小节边界（简化约定） */
  }
  if (!bars.length) newBar();
  bars.forEach((b) => {
    if (!b.triad) { const c = chordTriad(key); b.triad = c.triad; b.root = c.root; }
  });
  return { title: info.T || '', bpm, perBar, scalePC, bars };
}

/* ============================================================
 * 二、主题库
 * ============================================================ */

/* 旧式 MIDI 三和弦数组 → bar 结构 */
function fromChords(chords, extra) {
  return { ...extra, bars: chords.map((triad) => ({ chord: '', triad, root: triad[0], melody: null })) };
}

const THEME_DEFS = {
  /* 晨光：C 大调五声，明亮轻快 */
  morning: {
    bpm: 96, wave: 'triangle', bright: 2800, staccato: false, padGain: .045, melodyGain: .11, bassGain: .12,
    ...fromChords([[57, 60, 64], [55, 59, 62], [53, 57, 60], [55, 59, 62]], { perBar: 8, scalePC: [0, 2, 4, 7, 9], base: 60 })
  },
  /* 默认欢乐点点：F-G-Am 和声循环（ABC 定义），主旋律围绕和弦生成 */
  cheerful: {
    abc: 'X:1\nT:Cheerful Dots (F-G-Am)\nM:4/4\nQ:1/4=112\nL:1/8\nK:C\n"F"z8 | "G"z8 | "Am"z8 |',
    wave: 'triangle', bright: 2400, staccato: true, padGain: .038, melodyGain: .1, bassGain: .11
  },
  /* 校园：C 大调，规整对拍 */
  school: {
    bpm: 104, wave: 'triangle', bright: 2400, staccato: false, padGain: .04, melodyGain: .1, bassGain: .11,
    ...fromChords([[60, 65, 69], [62, 65, 69], [65, 69, 72], [67, 72, 76]], { perBar: 8, scalePC: [0, 2, 4, 5, 7, 9, 11], base: 65 })
  },
  /* 平静：A 小调，慢而柔 */
  calm: {
    bpm: 76, wave: 'sine', bright: 1700, staccato: false, padGain: .055, melodyGain: .1, bassGain: .1,
    ...fromChords([[57, 60, 64], [53, 57, 60], [55, 60, 64], [52, 55, 60]], { perBar: 8, scalePC: [0, 2, 3, 5, 7, 8, 10], base: 57 })
  },
  /* 睡前：C 大调摇篮曲（3/4 感），八音盒音色 */
  bedtime: {
    bpm: 64, wave: 'sine', bright: 1500, staccato: false, padGain: .05, melodyGain: .1, bassGain: .09,
    ...fromChords([[60, 64, 67], [59, 62, 67], [57, 60, 64], [55, 59, 62]], { perBar: 6, scalePC: [0, 2, 4, 7, 9], base: 72 })
  }
};

/* 注册表：id → 运行时主题（ABC 主题解析成 bars；melody=null 的小节走生成式） */
const THEMES = {};
function resolveTheme(def) {
  if (def.bars) return def;
  const p = parseAbc(def.abc || '');
  return { ...def, perBar: p.perBar, base: 60, scalePC: p.scalePC, bars: p.bars, bpm: p.bpm };
}
for (const [id, def] of Object.entries(THEME_DEFS)) THEMES[id] = resolveTheme(def);

/** 用 ABC 记谱注册/覆盖主题；opts 可覆盖音色参数（wave/bright/staccato/各增益） */
export function registerAbcTheme(id, abc, opts = {}) {
  const p = parseAbc(abc);
  if (!p.bars.length) throw new Error('parseAbc: no bars');
  THEMES[id] = {
    wave: 'triangle', bright: 2400, staccato: false,
    padGain: .04, melodyGain: .1, bassGain: .11,
    ...opts,
    perBar: p.perBar, base: 60, scalePC: p.scalePC, bars: p.bars, bpm: p.bpm
  };
  return THEMES[id];
}

/* ---------- 关键词 → 主题映射（中英文都认） ---------- */
const TAG_MAP = [
  [['morning', 'park', '早晨', '清晨', '公园', '晨光'], 'morning'],
  [['school', 'study', 'class', '学校', '上学', '课堂', '学习'], 'school'],
  [['bath', 'bedtime', 'sleep', 'night', '洗澡', '睡前', '睡觉', '夜晚'], 'bedtime'],
  [['rain', 'weather', 'storm', '雨', '天气'], 'calm'],
  [['zoo', 'play', 'game', 'party', '动物园', '玩', '游戏', '派对'], 'cheerful'],
  [['food', 'cook', 'kitchen', 'supermarket', 'chores', '餐', '厨房', '做饭', '超市', '家务'], 'cheerful']
];

export function suggestTheme(tags) {
  const list = (tags || []).map((t) => String(t).toLowerCase());
  for (const [keys, id] of TAG_MAP)
    if (list.some((t) => keys.some((k) => t.includes(k)))) return id;
  return 'cheerful';
}

export const AMBIENCES = ['deepspace', 'rain', 'fire', 'guqin'];

/* ============================================================
 * 三、播放引擎
 * ============================================================ */

export function createBgm() {
  let ctx = null, master = null, duckG = null, bus = null, comp = null;
  let timer = 0, stoppers = [];
  let playing = false, theme = '', volume = .3;
  let nextT = 0, step = 0, curMidi = 72;

  function ensureCtx() {
    if (!ctx) {
      ctx = new AC();
      bus = ctx.createGain();
      master = ctx.createGain(); master.gain.value = 0;
      duckG = ctx.createGain(); duckG.gain.value = 1;
      comp = ctx.createDynamicsCompressor();
      comp.threshold.value = -14; comp.knee.value = 8; comp.ratio.value = 4;
      comp.attack.value = .005; comp.release.value = .3;
      bus.connect(master); master.connect(duckG); duckG.connect(comp); comp.connect(ctx.destination);
    }
    return ctx;
  }

  function fadeGain(g, to, ms) {
    const t = ctx.currentTime;
    g.gain.cancelScheduledValues(t);
    g.gain.setValueAtTime(Math.max(g.gain.value, 1e-4), t);
    g.gain.linearRampToValueAtTime(Math.max(to, 1e-4), t + ms / 1000);
  }

  function cleanup() {
    if (timer) { clearInterval(timer); timer = 0; }
    stoppers.forEach((f) => { try { f(); } catch (e) {} });
    stoppers = [];
  }

  /* ---------- 旋律声部 ---------- */
  const m2f = (m) => 440 * Math.pow(2, (m - 69) / 12);

  function pluck(t, midi, g0, dur, wave, filterF) {
    const o = ctx.createOscillator(); o.type = wave; o.frequency.value = m2f(midi);
    const f = ctx.createBiquadFilter(); f.type = 'lowpass'; f.frequency.value = filterF;
    const g = ctx.createGain();
    g.gain.setValueAtTime(0, t);
    g.gain.linearRampToValueAtTime(g0, t + .012);
    g.gain.exponentialRampToValueAtTime(1e-4, t + dur);
    o.connect(f); f.connect(g); g.connect(bus);
    o.start(t); o.stop(t + dur + .05);
  }

  function pad(t, midis, g0, len, bright) {
    midis.forEach((m, i) => {
      const o = ctx.createOscillator();
      o.type = i % 2 ? 'sine' : 'triangle';
      o.frequency.value = m2f(m); o.detune.value = (i - 1) * 5;
      const f = ctx.createBiquadFilter(); f.type = 'lowpass'; f.frequency.value = bright * .6;
      const g = ctx.createGain();
      g.gain.setValueAtTime(0, t);
      g.gain.linearRampToValueAtTime(g0, t + .5);
      g.gain.setValueAtTime(g0, Math.max(t + .5, t + len - .8));
      g.gain.linearRampToValueAtTime(1e-4, t + len + .3);
      o.connect(f); f.connect(g); g.connect(bus);
      o.start(t); o.stop(t + len + .4);
    });
  }

  function bass(t, midi, g0, len) {
    const o = ctx.createOscillator(); o.type = 'sine'; o.frequency.value = m2f(midi - 12);
    const g = ctx.createGain();
    g.gain.setValueAtTime(0, t);
    g.gain.linearRampToValueAtTime(g0, t + .04);
    g.gain.exponentialRampToValueAtTime(1e-4, t + len);
    o.connect(g); g.connect(bus);
    o.start(t); o.stop(t + len + .05);
  }

  /* 生成式旋律：强拍取最近和弦音（点点感），弱拍沿音阶级进过渡 */
  function pickNext(cfg, bar, strong) {
    const pool = bar.triad.flatMap((m) => [m + 12, m + 24]);
    if (strong) {
      pool.sort((a, b) => Math.abs(a - curMidi) - Math.abs(b - curMidi));
      return pool[Math.random() < .72 ? 0 : 1];
    }
    for (let d = 1; d <= 2; d++)
      for (const dm of [d, -d]) {
        const cand = curMidi + dm;
        if (cfg.scalePC.includes(((cand % 12) + 12) % 12)) return cand;
      }
    return pool[0];
  }

  function scheduleStep(cfg, s, t) {
    const spu = 60 / cfg.bpm / 2;               /* 一个八分单位的秒数 */
    const perBar = cfg.perBar || 8;
    const inBar = s % perBar;
    const bar = cfg.bars[Math.floor(s / perBar) % cfg.bars.length];

    if (inBar === 0) {
      const barLen = spu * perBar;
      pad(t, bar.triad, cfg.padGain, barLen, cfg.bright);
      bass(t, bar.root, cfg.bassGain, barLen * .92);
    }

    if (bar.melody && bar.melody.length) {
      /* 显式旋律：照谱演奏 */
      for (const n of bar.melody)
        if (n.start === inBar)
          pluck(t, n.midi, cfg.melodyGain, Math.max(.14, n.dur * spu * .92), cfg.wave, cfg.bright);
    } else {
      /* 生成式：围绕当前小节和弦 */
      const strong = inBar % 2 === 0;
      if (Math.random() < (strong ? .62 : .34)) {
        curMidi = pickNext(cfg, bar, strong);
        curMidi = Math.max(cfg.base + 12, Math.min(cfg.base + 31, curMidi));
        const dur = cfg.staccato ? .18 : spu * (1 + Math.random() * .8);
        pluck(t, curMidi, cfg.melodyGain * (strong ? 1 : .78), dur, cfg.wave, cfg.bright);
      }
    }
  }

  function startTheme(id) {
    const cfg = THEMES[id];
    if (!cfg) throw new Error('unknown theme: ' + id);
    theme = id;
    const spu = 60 / cfg.bpm / 2;
    const perBar = cfg.perBar || 8;
    nextT = ctx.currentTime + .08;
    step = 0; curMidi = (cfg.base || 60) + 14;
    timer = setInterval(() => {
      while (nextT < ctx.currentTime + .15) {
        scheduleStep(cfg, step, nextT);
        nextT += spu;
        step++;
      }
    }, 40);
  }

  /* ---------- 氛围声部 ---------- */
  function noiseBuf(seconds, kind) {
    const len = Math.floor(ctx.sampleRate * seconds);
    const buf = ctx.createBuffer(1, len, ctx.sampleRate);
    const d = buf.getChannelData(0);
    let last = 0;
    for (let i = 0; i < len; i++) {
      const w = Math.random() * 2 - 1;
      if (kind === 'brown') { last = (last + .02 * w) / 1.02; d[i] = last * 3.5; }
      else d[i] = w;
    }
    return buf;
  }
  const loopNoise = (kind) => {
    const s = ctx.createBufferSource(); s.buffer = noiseBuf(3, kind);
    s.loop = true; s.start(); stoppers.push(() => { try { s.stop(); } catch (e) {} });
    return s;
  };

  function startAmbience(id) {
    theme = id;
    if (id === 'deepspace') {
      const lp = ctx.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 420; lp.Q.value = .7; lp.connect(bus);
      [[55, .32], [82.41, .15], [110, .15]].forEach(([f, gv]) => {
        const o = ctx.createOscillator(); o.type = 'sine'; o.frequency.value = f;
        const g = ctx.createGain(); g.gain.value = gv;
        o.connect(g).connect(lp); o.start(); stoppers.push(() => o.stop());
      });
      const lfo = ctx.createOscillator(); lfo.frequency.value = .045;
      const lg = ctx.createGain(); lg.gain.value = 180;
      lfo.connect(lg).connect(lp.frequency); lfo.start(); stoppers.push(() => lfo.stop());
      const n = loopNoise('brown');
      const nf = ctx.createBiquadFilter(); nf.type = 'lowpass'; nf.frequency.value = 700;
      const ng = ctx.createGain(); ng.gain.value = .12;
      n.connect(nf).connect(ng).connect(bus);
      timer = setInterval(() => {
        const t = ctx.currentTime;
        const o = ctx.createOscillator(); o.type = 'sine';
        o.frequency.value = [523.25, 659.25, 783.99, 880][Math.floor(Math.random() * 4)];
        const g = ctx.createGain();
        g.gain.setValueAtTime(0, t);
        g.gain.linearRampToValueAtTime(.11, t + .02);
        g.gain.exponentialRampToValueAtTime(1e-4, t + 3.2);
        o.connect(g).connect(bus); o.start(t); o.stop(t + 3.3);
      }, 7000);
    } else if (id === 'rain') {
      const n = loopNoise('white');
      const bp = ctx.createBiquadFilter(); bp.type = 'bandpass'; bp.frequency.value = 1500; bp.Q.value = .55;
      const hp = ctx.createBiquadFilter(); hp.type = 'highpass'; hp.frequency.value = 500;
      const g = ctx.createGain(); g.gain.value = .16;
      n.connect(bp).connect(hp).connect(g).connect(bus);
      const n2 = loopNoise('brown');
      const lp2 = ctx.createBiquadFilter(); lp2.type = 'lowpass'; lp2.frequency.value = 220;
      const g2 = ctx.createGain(); g2.gain.value = .1;
      n2.connect(lp2).connect(g2).connect(bus);
      timer = setInterval(() => {
        const t = ctx.currentTime;
        const n3 = ctx.createBufferSource(); n3.buffer = noiseBuf(1.6, 'brown');
        const f = ctx.createBiquadFilter(); f.type = 'lowpass'; f.frequency.value = 160;
        const g3 = ctx.createGain();
        g3.gain.setValueAtTime(0, t);
        g3.gain.linearRampToValueAtTime(.14, t + .35);
        g3.gain.exponentialRampToValueAtTime(1e-4, t + 1.9);
        n3.connect(f).connect(g3).connect(bus); n3.start(t); n3.stop(t + 2);
      }, 17000);
    } else if (id === 'fire') {
      const n = loopNoise('brown');
      const lp = ctx.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 620;
      const g = ctx.createGain(); g.gain.value = .3;
      n.connect(lp).connect(g).connect(bus);
      timer = setInterval(() => {
        const t = ctx.currentTime;
        const bursts = 1 + Math.floor(Math.random() * 3);
        for (let i = 0; i < bursts; i++) {
          const s = t + Math.random() * .9;
          const n2 = ctx.createBufferSource(); n2.buffer = noiseBuf(.12, 'white');
          const f = ctx.createBiquadFilter(); f.type = 'bandpass'; f.frequency.value = 1800 + Math.random() * 1600; f.Q.value = 1.4;
          const g2 = ctx.createGain();
          g2.gain.setValueAtTime(0, s);
          g2.gain.linearRampToValueAtTime(.17 + Math.random() * .09, s + .006);
          g2.gain.exponentialRampToValueAtTime(1e-4, s + .09);
          n2.connect(f).connect(g2).connect(bus); n2.start(s); n2.stop(s + .12);
        }
      }, 2600);
    } else { /* guqin：五声散音 + 程序化混响 */
      const scale = [196, 220, 246.94, 293.66, 329.63, 392, 440];
      const rev = ctx.createConvolver();
      const rl = Math.floor(ctx.sampleRate * 2.2);
      const rb = ctx.createBuffer(2, rl, ctx.sampleRate);
      for (let ch = 0; ch < 2; ch++) {
        const d = rb.getChannelData(ch);
        for (let i = 0; i < rl; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / rl, 2.6);
      }
      rev.buffer = rb;
      const wet = ctx.createGain(); wet.gain.value = .4;
      rev.connect(wet).connect(bus);
      const pluckG = () => {
        const t = ctx.currentTime;
        const o = ctx.createOscillator(); o.type = 'triangle';
        o.frequency.value = scale[Math.floor(Math.random() * scale.length)];
        const g = ctx.createGain();
        g.gain.setValueAtTime(0, t);
        g.gain.linearRampToValueAtTime(.22, t + .012);
        g.gain.exponentialRampToValueAtTime(1e-4, t + 2.6);
        o.connect(g); g.connect(bus); g.connect(rev);
        o.start(t); o.stop(t + 2.7);
      };
      stoppers.push(() => { try { wet.disconnect(); } catch (e) {} });
      timer = setInterval(() => { if (Math.random() < .75) pluckG(); }, 3400);
      pluckG();
    }
  }

  /* ---------- 公开 API ---------- */
  return {
    /* 首次调用请在用户手势内（iOS 自动播放策略） */
    start(opts = {}) {
      const c = ensureCtx();
      this.stop(true);
      playing = true;
      if (c.state === 'suspended') { c.resume().catch(() => {}); }
      const kind = opts.kind || 'theme';
      const id = kind === 'theme' ? (opts.id || 'cheerful') : (opts.id || 'deepspace');
      if (opts.volume != null) volume = Math.max(0, Math.min(1, opts.volume));
      master.gain.setValueAtTime(0, c.currentTime);
      master.gain.linearRampToValueAtTime(volume, c.currentTime + .9);
      if (kind === 'theme') startTheme(id); else startAmbience(id);
      return true;
    },
    stop(fast) {
      cleanup();
      playing = false; theme = '';
      if (ctx && master) {
        const t = ctx.currentTime;
        master.gain.cancelScheduledValues(t);
        master.gain.setValueAtTime(master.gain.value, t);
        master.gain.linearRampToValueAtTime(1e-4, t + (fast ? .05 : .5));
      }
    },
    /* 人声闪避：level 0~1（0.25 左右适合铺底），ms 渐变毫秒数 */
    duck(level = .25, ms = 300) { if (ctx && playing) fadeGain(duckG, level, ms); },
    unduck(ms = 450) { if (ctx && playing) fadeGain(duckG, 1, ms); },
    setVolume(v) {
      volume = Math.max(0, Math.min(1, v));
      if (ctx && playing) fadeGain(master, volume, 220);
    },
    /* 在用户手势中调用一次，预热 AudioContext（提升 iOS 首次播放成功率） */
    unlock() { const c = ensureCtx(); if (c.state === 'suspended') c.resume().catch(() => {}); },
    dispose() {
      this.stop(true);
      setTimeout(() => { try { ctx && ctx.close(); } catch (e) {} ctx = null; }, 80);
    },
    get playing() { return playing; },
    get theme() { return theme; }
  };
}
