# iskill-generative-bgm

纯前端生成式背景音乐引擎。Web Audio 实时合成，零音频素材、零依赖、完全离线。

- **旋律主题**：和弦进行（pad + 低音）+ 围绕和声生成的乐器主旋律；内置 morning / cheerful（F-G-Am 欢乐点点循环）/ school / calm / bedtime / campfire
- **乐器音色**：五种纯合成音色零采样——拨弦 / 钢琴（多泛音加法）/ 木吉他（**Karplus-Strong 物理建模**）/ 八音盒 / FM 电钢；主题可配 voice，`start({voice})` 运行时覆盖
- **ABC 记谱**：用 ABC 子集定义主题——和声循环给骨架，主旋律强拍取和弦音、弱拍音阶级进；也支持写死显式旋律照谱演奏
- **氛围预设**：deepspace / rain / fire / guqin（噪声 + 振荡器现场合成）
- **人声闪避**：`duck/unduck` 增益渐变，人声播时音乐自动让路

```js
import { createBgm, suggestTheme } from './engine/bgm.js';
const bgm = createBgm();
btn.onclick = () => bgm.start({ kind: 'theme', id: suggestTheme(scene.tags), volume: .3 });
bgm.start({ kind: 'theme', id: 'cheerful', voice: 'guitar' });  // 运行时换吉他音色
voice.onstart = () => bgm.duck(.25);
voice.onend   = () => bgm.unduck();
```

详见 [SKILL.md](./SKILL.md)。测试：`npm test`（37 项断言）。

已应用于 [iskill-english-scene-app](https://github.com/aispin/iskill-english-scene-app) 的 Three.js 场景对话微动画。

> 依赖同步：本仓库含 iskill 共享真源的 vendored 副本（清单见 `package.json` 的 `iskillDeps`），**不要手改**。使用前请同时安装 iskill-utils：对 agent 说「请帮我安装 Skill：aispin/iskill-utils」；用法见 SKILL.md「依赖同步」节。
