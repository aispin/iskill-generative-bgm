---
name: iskill-generative-bgm
description: 纯前端生成式 BGM 技能。Web Audio 实时合成背景音乐，零音频素材、完全离线。支持 ABC 记谱定义主题（和声循环 + 显式旋律/生成式旋律）、五种乐器音色（拨弦/钢琴/木吉他 Karplus-Strong 物理建模/八音盒/FM 电钢）、氛围音预设（深空/雨夜/篝火/古琴）、人声闪避（ducking）。适用于网页应用/H5/电子书/儿童教育等任何需要程序化配乐的前端项目。
---

# iskill-generative-bgm · 纯前端生成式 BGM

Web Audio 实时合成背景音乐，**零素材、零依赖、完全离线**。引擎单文件 `engine/bgm.js`（ESM，约 640 行），拷进任何前端项目即可用。

## 快速上手

```js
import { createBgm, suggestTheme } from './bgm.js';

const bgm = createBgm();

/* 在用户手势内调用（点击/触摸，iOS 自动播放策略要求） */
bgm.start({ kind: 'theme', id: suggestTheme(['morning']), volume: .3 });

/* 人声闪避：朗读/对话播放时压低音乐 */
bgm.duck(.25, 300);   // 人声起
bgm.unduck(450);      // 人声止

bgm.stop();
```

## 两种音源

| kind | 说明 | 可用 id |
|------|------|---------|
| `'theme'` | 旋律型主题：和弦进行（pad+低音）+ 乐器主旋律 | `morning` `cheerful`（默认）`school` `calm` `bedtime` `campfire` |
| `'ambience'` | 氛围型预设：噪声/振荡器现场合成 | `deepspace` `rain` `fire` `guqin` |

`suggestTheme(tags)`：按场景标签关键词（中英文）推荐主题，如 `['morning','park']→morning`、`['bedtime']→bedtime`、`['chores']→cheerful`、`['露营','篝火']→campfire`。

## 乐器音色（v1.2.0 核心）

五种**纯合成**音色（零采样素材），主题定义里用 `voice` 字段选择：

| voice | 实现方式 | 音色特点 |
|-------|----------|----------|
| `pluck`（默认） | 三角波 + 低通 + 指数衰减 | 短促拨弦「点点」感 |
| `piano` | 多泛音加法合成（微非谐倍频）+ 亮度扫频 | 声学钢琴，起音亮衰减暗 |
| `guitar` | **Karplus-Strong 物理建模**（激振噪声 + 延迟环内低通） | 木吉他拨弦，低音自然延音更长 |
| `musicbox` | 正弦基音 + 非谐泛音（3.36x / 6.7x） | 八音盒金属小锤质感 |
| `epiano` | FM 合成（1:1 载波/调制器 + tine 快衰减 + 铃音攻击） | Rhodes 式电钢 |

内置主题音色分配：`school`→钢琴、`calm`→电钢、`bedtime`→八音盒、`campfire`→吉他（C-G-Am-F 慢速，84bpm）、`morning`/`cheerful`→拨弦。

运行时覆盖音色（不改注册表）：

```js
bgm.start({ kind: 'theme', id: 'cheerful', voice: 'guitar' });  // 点点旋律改吉他弹
```

自定义主题同样支持：`registerAbcTheme(id, abc, { voice: 'piano' })`。

导出工具：`VOICES`（音色清单）、`ksSamples(sampleRate, midi, { damp, dur, bright })`——Karplus-Strong 纯函数（无 AudioContext），可在 Node 里直接测试。

## ABC 记谱（v1.1.0 核心）

主题可以用 ABC 记法定义——**和声循环给骨架，主旋律围绕和弦自动生成**。默认 `cheerful` 主题就是一个 F-G-Am 欢乐点点循环：

```js
import { registerAbcTheme } from './bgm.js';

registerAbcTheme('cheerful', `X:1
T:Cheerful Dots (F-G-Am)
M:4/4
Q:1/4=112
L:1/8
K:C
"F"z8 | "G"z8 | "Am"z8 |`, { staccato: true, wave: 'triangle', bright: 2400 });
```

### 支持的 ABC 子集

| 元素 | 语法 | 说明 |
|------|------|------|
| 头部 | `X:` `T:` `M:` `Q:` `L:` `K:` | 拍号（M:4/4、3/4、6/8）、速度（Q:1/4=112 或 Q:112）、默认音长（L:1/8）、调号 |
| 和弦 | `"F"` `"G"` `"Am"` `"G7"` `"Bb"` | 写在小节头，解析为三和弦做 pad+低音；支持 m/m7/7/6/dim/aug/sus2/sus4 |
| 音符 | `C D E` 大写中八度，`c d e` 高八度；`,` `'` 再降/升八度；`^` `_` 升降号 | 有音符的小节**照谱演奏** |
| 休止 | `z` `z4` `z/2` | 纯休止/只有和弦的小节 → **生成式旋律** |
| 时值 | 数字=倍数（`A4`=4 个默认音长），`/2` 减半 | 默认音长由 `L:` 决定（默认 1/8） |

### 生成式旋律规则（围绕和声展开）

- **强拍**（每小节 0/2/4 位）：取距上一音最近的**和弦音**（约 72% 概率出音，短促「点点」拨弦）
- **弱拍**：沿调式音阶级进过渡（约 34% 概率）
- 音域锁定在主音上方一个八度内（C4+12 ~ C4+31），避免跳进刺耳
- 调式音阶由 `K:` 自动推导（大调/自然小调，含升降号）

显式旋律与生成式可以**混排**：有的小节写死旋律，有的小节只给和弦让引擎即兴。

## API 一览

```js
const bgm = createBgm();
bgm.start({ kind:'theme'|'ambience', id, voice, volume })  // 开始（手势内首次调用；voice 可覆盖主题音色）
bgm.stop()                    // 停止（0.5s 淡出）
bgm.duck(level, ms)           // 闪避：压到 level（0~1，推荐 0.25）
bgm.unduck(ms)                // 恢复
bgm.setVolume(v)              // 主音量
bgm.unlock()                  // 手势内预热 AudioContext（提升 iOS 首播成功率）
bgm.dispose()                 // 彻底释放（关闭 AudioContext）
bgm.playing / bgm.theme       // 状态
```

信号链：`voices → bus → master(用户音量) → duckGain(闪避) → 压限器 → destination`。
调度：lookahead 模式（40ms 轮询、提前 150ms 排音符），不受 setInterval 抖动影响。

## 集成模式（推荐）

1. 把 `engine/bgm.js` **原样拷贝**进目标项目（如 `src/anim/bgm.js`），文件头保留出处注释
2. 播放器层负责生命周期：进入页面/点播 → `start`；人声前 `duck`、人声后 `unduck`；离开 → `stop`
3. 主题按项目场景关键词用 `suggestTheme` 自动匹配，或用 `registerAbcTheme` 自定义

## 测试

```bash
npm test   # 37 项断言：parse.test.mjs（解析器/和弦/调号/主题注册 26 项）+ voice.test.mjs（KS 物理建模/音色装配/衰减与亮度 11 项）
```

## 演进路线

- SFX 套件（pop/闪光/脚步/水泡等一次性合成音效）
- 节拍/强弱表情（accent、rit.）、变奏段（AABA）
- 与 iskill-music-beats 联动：BPM 对齐转场卡点

## 依赖同步

本仓库 `promo-page/assets/{app.js,style.css,icons.js}` 是 [iskill-promo-page](https://github.com/aispin/iskill-promo-page)
模板引擎的 vendored 副本（锁定版本见 `package.json` 的 `iskillDeps`），**不要手改**——
去真源仓库改并升 `@iskill-version`，再用 iskill-dep-sync 同步回来（本机无该工具时按下面自举）：

```bash
T="$HOME/.workbuddy/skills/iskill-dep-sync/scripts/skill-deps.mjs"
[ -f "$T" ] || { TMP="$(mktemp -d)"; curl -fsSL "https://raw.githubusercontent.com/aispin/iskill-dep-sync/HEAD/scripts/skill-deps.mjs" -o "$TMP/skill-deps.mjs"; T="$TMP/skill-deps.mjs"; }
node "$T" check "$(pwd)"     # 漂移检测；node "$T" sync "$(pwd)" 恢复/升级；node "$T" env "$(pwd)" 冷启动自检
```
