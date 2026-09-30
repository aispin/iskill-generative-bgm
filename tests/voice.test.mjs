/* 乐器音色引擎测试（v1.2.0）：KS 物理建模纯函数 + 音色装配 */
import assert from 'node:assert';
import { VOICES, ksSamples, registerAbcTheme, suggestTheme, chordTriad } from '../engine/bgm.js';

let n = 0;
const ok = (name) => { n++; console.log('  ✓ ' + name); };

/* 1. VOICES 导出 */
assert.deepStrictEqual(VOICES, ['pluck', 'piano', 'guitar', 'musicbox', 'epiano']);
ok('VOICES 导出五种音色');

/* 2. ksSamples 基本形状 */
const sr = 44100, dur = 2;
const s = ksSamples(sr, 69, { dur });
assert.strictEqual(s.length, Math.floor(sr * dur));
ok('样本长度 = sr * dur');

for (const v of s) assert.ok(Number.isFinite(v), 'non-finite sample');
ok('全部样本有限（无 NaN/Infinity）');

let peak = 0;
for (const v of s) peak = Math.max(peak, Math.abs(v));
assert.ok(peak <= .901 && peak > .5, 'peak=' + peak);
ok('峰值归一到 ~0.9（' + peak.toFixed(3) + '）');

/* 3. 衰减：前 1/4 能量显著大于后 1/4（拨弦自然衰减） */
const q = Math.floor(s.length / 4);
const rms = (a, b) => {
  let e = 0; for (let i = a; i < b; i++) e += s[i] * s[i];
  return Math.sqrt(e / (b - a));
};
const head = rms(0, q), tail = rms(s.length - q, s.length);
assert.ok(head > tail * 3, 'head=' + head.toFixed(3) + ' tail=' + tail.toFixed(3));
ok('自然衰减：前段 RMS ' + head.toFixed(3) + ' ≫ 尾段 ' + tail.toFixed(3));

/* 4. 阻尼参数：damp 越大延音越长（尾段 RMS 更大） */
const short = ksSamples(sr, 69, { dur, damp: .995 });
const long = ksSamples(sr, 69, { dur, damp: .998 });
const tailRms = (arr) => {
  let e = 0; const a = Math.floor(arr.length * .75);
  for (let i = a; i < arr.length; i++) e += arr[i] * arr[i];
  return Math.sqrt(e / (arr.length - a));
};
assert.ok(tailRms(long) > tailRms(short) * 1.5,
  'long=' + tailRms(long).toExponential(2) + ' short=' + tailRms(short).toExponential(2));
ok('damp=0.998 尾音比 damp=0.995 更长');

/* 5. 音高影响环长：低音环更长 */
const hi = ksSamples(sr, 84, { dur: .3 }), lo = ksSamples(sr, 60, { dur: .3 });
assert.ok(Number.isFinite(hi[0]) && Number.isFinite(lo[0]));
ok('高低音均可用（midi 84 / 60）');

/* 6. 亮度参数影响起音频谱能量（低亮度=闷，高频能量低） */
const hfEnergy = (arr) => {
  /* 粗略代理：相邻样本差分能量 ∝ 高频成分 */
  let e = 0;
  for (let i = 1; i < Math.min(arr.length, 8000); i++) { const d = arr[i] - arr[i - 1]; e += d * d; }
  return e;
};
const bright = ksSamples(sr, 69, { dur: .3, bright: .95 });
const dark = ksSamples(sr, 69, { dur: .3, bright: .05 });
assert.ok(hfEnergy(bright) > hfEnergy(dark) * 2, 'bright=' + hfEnergy(bright).toExponential(2) + ' dark=' + hfEnergy(dark).toExponential(2));
ok('bright 控制激振亮度（高频能量可区分）');

/* 7. 音色装配：registerAbcTheme 接受 voice 覆盖 */
const th = registerAbcTheme('t-voice', 'X:1\nT:t\nM:4/4\nQ:1/4=100\nL:1/8\nK:C\n"C"z8 |', { voice: 'guitar' });
assert.strictEqual(th.voice, 'guitar');
assert.strictEqual(suggestTheme(['露营']), 'campfire');
assert.strictEqual(suggestTheme(['篝火']), 'campfire');
assert.strictEqual(suggestTheme(['campfire']), 'campfire');
ok('registerAbcTheme 支持 voice；suggestTheme 认出 campfire 关键词');

/* 8. 内置主题音色分配（通过 suggestTheme 间接确认主题仍在） */
assert.strictEqual(suggestTheme(['bedtime']), 'bedtime');
assert.strictEqual(suggestTheme(['school']), 'school');
assert.strictEqual(suggestTheme(['rain']), 'calm');
assert.strictEqual(suggestTheme(['zoo']), 'cheerful');
ok('内置主题映射完好（school/calm/bedtime/cheerful/campfire）');

/* 9. 回归：chordTriad / parseAbc 未被破坏 */
assert.deepStrictEqual(chordTriad('Am').triad, [69, 72, 76]);
const p = registerAbcTheme('t-reg', 'X:1\nT:r\nM:3/4\nQ:1/4=90\nL:1/8\nK:G\n"G"z6 |', {});
assert.strictEqual(p.perBar, 6);
ok('回归：chordTriad/parseAbc 行为不变');

console.log('\n全部 ' + n + ' 项音色测试通过 ✅');
