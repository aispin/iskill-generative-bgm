/* parseAbc / chordTriad / suggestTheme 纯逻辑测试（node 直接跑，无 AudioContext） */
import { parseAbc, chordTriad, registerAbcTheme, suggestTheme, AMBIENCES } from '../engine/bgm.js';

let pass = 0, fail = 0;
const ok = (cond, name, extra = '') => {
  if (cond) { pass++; console.log('  ✓', name); }
  else { fail++; console.log('  ✗', name, extra); }
};

console.log('== chordTriad ==');
ok(chordTriad('F')?.triad.join(',') === '65,69,72', 'F 大三和弦 F-A-C');
ok(chordTriad('Am')?.triad.join(',') === '69,72,76', 'Am 小三和弦 A-C-E');
ok(chordTriad('G7')?.triad.length === 4, 'G7 四音');
ok(chordTriad('Bb')?.root === 70, '降号根音（B4=71 降半音）');
ok(chordTriad('Xyz') === null, '非法和弦返回 null');

console.log('== 默认欢乐点点 F-G-Am 循环 ==');
const def = parseAbc('X:1\nT:Cheerful Dots (F-G-Am)\nM:4/4\nQ:1/4=112\nL:1/8\nK:C\n"F"z8 | "G"z8 | "Am"z8 |');
ok(def.bpm === 112, 'Q:1/4=112 → bpm 112', 'got ' + def.bpm);
ok(def.perBar === 8, '4/4 → 每小节 8 个八分单位', 'got ' + def.perBar);
ok(def.bars.length === 3, '3 个小节', 'got ' + def.bars.length);
ok(def.bars[0].chord === 'F' && def.bars[1].chord === 'G' && def.bars[2].chord === 'Am', '和弦序 F-G-Am', JSON.stringify(def.bars.map(b=>b.chord)));
ok(def.bars[0].triad.join(',') === '65,69,72', 'F 小节三和弦正确');
ok(def.bars.every((b) => b.melody === null), '纯和声小节 melody=null（走生成式）');
ok(def.scalePC.join(',') === '0,2,4,5,7,9,11', 'K:C → C 大调音阶级');

console.log('== 显式旋律照谱演奏 ==');
const mel = parseAbc('X:1\nM:4/4\nQ:120\nL:1/8\nK:C\n"C"CDEF GABc | "G"z4 c4 |');
const b0 = mel.bars[0];
ok(b0.melody && b0.melody.length === 8, '第一小节 8 个音（CDEF GABc）', JSON.stringify(b0.melody));
ok(b0.melody[0].midi === 60 && b0.melody[0].start === 0, '首音 C4=60 落在 0');
ok(b0.melody[7].midi === 72, "小写 c 升八度 = 72", 'got ' + b0.melody[7].midi);
const b1 = mel.bars[1];
ok(b1.chord === 'G' && b1.melody && b1.melody[0].start === 4, '第二小节和弦 G、c4 从第 4 单位开始');
ok(b1.melody[0].dur === 4, '第二小节 c4 = 4 个八分单位（L:1/8 下数字是倍数）', 'got ' + b1.melody[0].dur);

console.log('== 调号/拍号 ==');
const g3 = parseAbc('X:1\nM:3/4\nQ:90\nK:G\n"G"z6 |');
ok(g3.perBar === 6, '3/4 → 6 单位');
ok(g3.scalePC.includes(6) && !g3.scalePC.includes(5), 'K:G → F#(6) 在阶、F(5) 不在', JSON.stringify(g3.scalePC));
const am = parseAbc('X:1\nM:4/4\nK:Am\n"Am"z8 |');
ok(am.scalePC.join(',') === '0,2,4,5,7,9,11', 'K:Am → A 自然小调音阶（与 C 大调同 pcs）');

console.log('== registerAbcTheme ==');
const t = registerAbcTheme('myloop', 'X:1\nM:4/4\nQ:130\nK:C\n"F"z8 | "G"z8 | "Am"z8 |', { staccato: true, bright: 2600 });
ok(t.bpm === 130 && t.staccato === true && t.bars.length === 3, '注册后可覆盖音色参数');

console.log('== suggestTheme ==');
ok(suggestTheme(['morning', 'weekend']) === 'morning', 'morning tag');
ok(suggestTheme(['chores', 'weekend']) === 'cheerful', 'chores → cheerful');
ok(suggestTheme(['bedtime']) === 'bedtime', 'bedtime tag');
ok(suggestTheme(['随机词']) === 'cheerful', '默认 cheerful');
ok(AMBIENCES.length === 4, '4 个氛围预设');

console.log(`\n${pass} pass, ${fail} fail`);
process.exit(fail ? 1 : 0);
