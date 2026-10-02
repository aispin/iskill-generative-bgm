/* ============================================================================
 * iskill-generative-bgm · 落地页内容
 * 事实来源：SKILL.md / README.md / engine/bgm.js / package.json / npm test 实测
 * ==========================================================================*/
window.PROMO = {
  name: "ISKILL-GENERATIVE-BGM",
  brand: "#8b5cf6",
  brand2: "#22d3ee",
  repo: "https://github.com/aispin/iskill-generative-bgm",
  repoLabel: "aispin/iskill-generative-bgm",

  platform: "all",
  license: "MIT",

  lang: {
    zh: {
      meta: {
        title: "ISKILL-GENERATIVE-BGM · 零素材，在浏览器里现合成 BGM",
        description: "纯前端生成式 BGM：Web Audio 实时合成，五种乐器音色、六个旋律主题、四个氛围预设，零音频素材、零依赖、完全离线。"
      },
      a11y: { skip: "跳到主要内容" },
      ui: { copy: "复制", copied: "已复制", failed: "复制失败" },
      nav: { features: "能力", shots: "截图", how: "上手", faq: "问答" },

      hero: {
        badge: "AI 技能",
        titlePre: "一个音频文件都不用，",
        titleAccent: "在浏览器里现合成配乐",
        titlePost: "",
        sub: "686 行 ESM 单文件，Web Audio 实时合成：6 个旋律主题 + 4 个氛围预设 × 5 种乐器音色，完全离线。",
        ctaPrimary: "复制安装提示词",
        ctaSecondary: "看源码",
        meta1: "零音频素材",
        meta2: "纯 Web Audio",
        meta3: "完全离线"
      },
      chat: {
        title: "AI Agent · 对话现场",
        status: "在线",
        userLabel: "你",
        agentLabel: "AI",
        messages: [
          { role: "user", text: "给这个阅读器加一段雨夜氛围的 BGM，要纯前端" },
          { role: "agent", text: "Web Audio 实时合成，零音频素材、完全离线；雨夜是内置氛围预设，配八音盒或木吉他（Karplus-Strong 物理建模）都行。", tag: "已读 ABC 记谱" },
          { role: "user", text: "有人说话时要自动压低" },
          { role: "agent", text: "人声闪避（ducking）内置。另外记得在用户手势里 start——不然浏览器会拦住音频。" }
        ]
      },


      stats: [
        { value: "5", label: "种纯合成音色", note: "拨弦 / 钢琴 / 木吉他 / 八音盒 / FM 电钢" },
        { value: "686", label: "行单文件引擎", note: "engine/bgm.js，ESM 零依赖" },
        { value: "64–112", label: "BPM 主题区间", note: "bedtime 64 → cheerful 112" },
        { value: "37", label: "项测试断言", note: "26 解析 + 11 音色，npm test 全绿" }
      ],

      compare: {
        eyebrow: "对比",
        title: "采样素材 vs 生成式",
        sub: "",
        before: {
          title: "塞 mp3 那套",
          items: [
            "为了几段循环 BGM 往包里塞几 MB 音频",
            "要预加载、要处理跨域、要等下载完才响",
            "换一首就得重新找素材、重新核对授权"
          ]
        },
        after: {
          title: "实时合成那套",
          items: [
            "一个 ESM 文件，零音频素材、零依赖",
            "Web Audio 现场合成，装完就能离线跑",
            "换风格只是换个 id / voice 参数"
          ]
        }
      },

      features: {
        eyebrow: "能力",
        title: "它能做什么",
        sub: "",
        items: [
          { icon: "layers", title: "零素材纯合成", desc: "五档音色全由振荡器 / 噪声现场合成——拨弦、钢琴、木吉他（Karplus-Strong 物理建模）、八音盒、FM 电钢，仓库里没有一个音频文件。" },
          { icon: "grid", title: "6 主题 + 4 氛围", desc: "morning / cheerful / school / calm / bedtime / campfire 六个旋律主题，加 deepspace / rain / fire / guqin 四个氛围预设。" },
          { icon: "terminal", title: "ABC 记谱定义主题", desc: "用 X/T/M/Q/L/K 头 + “和弦”符号 + 音名时值写主题；只给和弦的小节，主旋律围绕和声自动生成，写着走也行。" },
          { icon: "gauge", title: "人声闪避 ducking", desc: "bgm.duck(.25, 300) 在朗读 / 对话时压低音乐，unduck 平滑恢复——旁白与配乐不再打架。" },
          { icon: "bolt", title: "lookahead 调度", desc: "40ms 轮询、提前 150ms 排音符，不受 setInterval 抖动影响，节拍稳。" },
          { icon: "refresh", title: "运行时换音色", desc: "start({ voice: 'guitar' }) 不动注册表就能让同一段旋律改由吉他弹。" }
        ]
      },

      showcase: {
        eyebrow: "实拍",
        title: "看一眼真东西",
        sub: "",
        items: []
      },

      steps: {
        eyebrow: "上手",
        title: "三步跑起来",
        sub: "命令由 agent 跑，你只说要什么、看结果。",
        items: [
          { title: "交给 AI 装", desc: "把这句话粘进对话框，agent 会自己拉代码、读文档，再告诉你用法。", codeKey: "install" },
          { title: "说要什么氛围", desc: "音乐是实时合成的，不是下载素材；场景、乐器、音量说清就行。", codeName: "prompt", code: "给这个阅读器加一段雨夜氛围的 BGM，纯前端合成，进页面才起播。" },
          { title: "戴上耳机听", desc: "代码接进页面后，你在浏览器里听效果；换情绪、换音色只是换一个 id。" }
        ]
      },


      faq: {
        eyebrow: "问答",
        title: "常见问题",
        items: [
          { q: "需要音频素材或联网吗？", a: "都不需要。音色是 Web Audio 现场合成，引擎是单个 ESM 文件，完全离线；只有安装的时候才需要联网。" },
          { q: "iOS 上为什么第一次不响？", a: "iOS 的自动播放策略要求音频在用户手势（点击 / 触摸）内启动。首次 <code>bgm.start()</code> 必须放在点击回调里；也可以先调 <code>bgm.unlock()</code> 预热 AudioContext。" },
          { q: "能用自己写的曲子吗？", a: "可以。用 <code>registerAbcTheme(id, abc, { voice })</code> 注册 ABC 记谱主题；只写和弦、不写旋律的小节，引擎会按调式自动生成主旋律。" },
          { q: "要装什么依赖？", a: "零第三方依赖，纯浏览器 Web Audio API + 原生 ESM。跑测试用 Node（<code>npm test</code>），也不需要额外安装包。" },
          { q: "引擎多大？性能如何？", a: "<code>engine/bgm.js</code> 单文件 686 行；调度是 lookahead（40ms 轮询 / 提前 150ms 排音符），不预生成整段音频，CPU 占用低。" }
        ]
      },

      cta: { title: "给页面配上会呼吸的 BGM", desc: "把安装提示词粘给 AI，装完就能在浏览器里现场合成配乐。", primary: "去 GitHub 看看", secondary: "复制安装提示词" },
      footer: { license: "MIT 许可", madeWith: "由 iskill-promo-page 生成" }
    },

    en: {
      meta: {
        title: "ISKILL-GENERATIVE-BGM · Zero assets, BGM synthesised in the browser",
        description: "A front-end generative BGM engine: Web Audio synthesis with five instrument voices, six themes and four ambience presets — no audio files, no deps, fully offline."
      },
      a11y: { skip: "Skip to content" },
      ui: { copy: "Copy", copied: "Copied", failed: "Copy failed" },
      nav: { features: "Features", shots: "Screens", how: "Get started", faq: "FAQ" },

      hero: {
        badge: "AI skill",
        titlePre: "No audio files at all — ",
        titleAccent: "music synthesised in the browser",
        titlePost: "",
        sub: "A 686-line ESM file that synthesises with Web Audio at runtime: 6 themes + 4 ambiences × 5 instrument voices, fully offline.",
        ctaPrimary: "Copy install prompt",
        ctaSecondary: "View source",
        meta1: "Zero audio assets",
        meta2: "Pure Web Audio",
        meta3: "Fully offline"
      },
      chat: {
        title: "AI Agent · live session",
        status: "online",
        userLabel: "You",
        agentLabel: "AI",
        messages: [
          { role: "user", text: "Add a rainy-night ambient BGM to this reader — front-end only" },
          { role: "agent", text: "Synthesized live with Web Audio: zero audio assets, fully offline. Rainy night is a built-in ambience preset; pair it with music box or the Karplus-Strong guitar model.", tag: "read ABC notation" },
          { role: "user", text: "It should duck when someone speaks" },
          { role: "agent", text: "Ducking is built in. One thing to remember: start it inside a user gesture, otherwise the browser blocks audio." }
        ]
      },


      stats: [
        { value: "5", label: "synthesised voices", note: "pluck / piano / guitar / musicbox / epiano" },
        { value: "686", label: "lines in one engine file", note: "engine/bgm.js, ESM, zero deps" },
        { value: "64–112", label: "BPM across themes", note: "bedtime 64 → cheerful 112" },
        { value: "37", label: "test assertions", note: "26 parse + 11 voice, all green" }
      ],

      compare: {
        eyebrow: "Comparison",
        title: "Sample-based vs generative",
        sub: "",
        before: {
          title: "Shipping mp3s",
          items: [
            "Bundling megabytes of audio for a few loops",
            "Preloading, CORS, waiting for downloads before it plays",
            "Every new track means new assets and new licence checks"
          ]
        },
        after: {
          title: "Synthesising live",
          items: [
            "One ESM file, zero audio assets, zero dependencies",
            "Web Audio synthesis at runtime — works offline once installed",
            "Changing the sound is just another id / voice argument"
          ]
        }
      },

      features: {
        eyebrow: "Features",
        title: "What it does",
        sub: "",
        items: [
          { icon: "layers", title: "Synthesised, no assets", desc: "All five voices are generated live from oscillators and noise — pluck, piano, guitar (Karplus-Strong modelling), music box and FM electric piano. Not a single audio file in the repo." },
          { icon: "grid", title: "6 themes + 4 ambiences", desc: "Six melodic themes (morning / cheerful / school / calm / bedtime / campfire) plus four ambience presets (deepspace / rain / fire / guqin)." },
          { icon: "terminal", title: "Themes in ABC notation", desc: "Define themes with X/T/M/Q/L/K headers, quoted chords and note durations. Bars with chords only get a melody generated around the harmony." },
          { icon: "gauge", title: "Voice-over ducking", desc: "bgm.duck(.25, 300) drops the music while narration plays; unduck fades it back smoothly." },
          { icon: "bolt", title: "Lookahead scheduling", desc: "Polling every 40ms and scheduling notes 150ms ahead — steady tempo, immune to setInterval jitter." },
          { icon: "refresh", title: "Swap voices at runtime", desc: "start({ voice: 'guitar' }) re-instruments the same melody without touching the registry." }
        ]
      },

      showcase: {
        eyebrow: "Screens",
        title: "See the real thing",
        sub: "",
        items: []
      },

      steps: {
        eyebrow: "Get started",
        title: "Up and running in three steps",
        sub: "The agent runs the commands. You say what you want and check the result.",
        items: [
          { title: "Let your agent install it", desc: "Paste the line into the chat — it clones the repo, reads the docs, and tells you how to use it.", codeKey: "install" },
          { title: "Say what mood you want", desc: "The music is synthesized live, not downloaded. Scene, instrument and volume are enough.", codeName: "prompt", code: "Add a rainy-night ambient BGM to this reader — pure front-end synthesis, starting on user gesture." },
          { title: "Listen with headphones", desc: "Once it's wired into the page, you judge it in the browser. Changing mood or timbre is just another id." }
        ]
      },


      faq: {
        eyebrow: "FAQ",
        title: "Frequently asked",
        items: [
          { q: "Does it need audio assets or a network?", a: "Neither. Voices are synthesised with Web Audio and the engine is a single ESM file, fully offline. Only installation needs the network." },
          { q: "Why is the first note silent on iOS?", a: "iOS autoplay policy requires audio to start inside a user gesture (tap/click). Call <code>bgm.start()</code> from a click handler, or pre-warm with <code>bgm.unlock()</code>." },
          { q: "Can I use my own melodies?", a: "Yes. Register an ABC-notation theme with <code>registerAbcTheme(id, abc, { voice })</code>. Bars that carry only chords get a generated melody in the key signature." },
          { q: "What do I have to install?", a: "Nothing third-party — plain browser Web Audio API and native ESM. Tests run on Node (<code>npm test</code>) with no extra packages." },
          { q: "How big is the engine?", a: "<code>engine/bgm.js</code> is a single 686-line file. Scheduling is lookahead-based (40ms poll / 150ms ahead) and no full track is pre-rendered, so CPU use stays low." }
        ]
      },

      cta: { title: "Give your page a soundtrack", desc: "Paste the install prompt into your agent and synthesise music in the browser.", primary: "Open on GitHub", secondary: "Copy install prompt" },
      footer: { license: "MIT licensed", madeWith: "Built with iskill-promo-page" }
    }
  }
};
