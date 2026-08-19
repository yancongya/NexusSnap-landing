/*
 * NexusSnap landing — feature showcase config.
 * Carousel card layout: each feature = one card, horizontal scroll.
 */
window.NEXUS_FEATURES_CONFIG = {
  schemaVersion: 5,
  header: {
    tag: { zh: "功能", en: "Features" },
    title: { zh: "从网页到 AE / PS，全帮你理顺", en: "From the web into AE / PS, all sorted" },
    desc: {
      zh: "收集、导入、整理、发送，素材进 AE / PS 的每一步都能在这里完成。",
      en: "Collect, import, organize, send — every step of getting assets into AE / PS."
    }
  },
  features: [
    {
      id: "web-media",
      icon: "sniff",
      order: 0,
      tag: { zh: "收集", en: "Collect" },
      title: { zh: "网页音视频抓取", en: "Web video & audio" },
      summary: {
        zh: "打开网页就能一键保存里面的视频和音乐，画质取到最高清。",
        en: "Open any page and save its video and music in one click, at the highest quality."
      },
      bullets: [
        { zh: "11 个主流平台原画原声", en: "Original quality from 11 platforms" },
        { zh: "任意网页 DOM 扫描 + 网络嗅探", en: "Any page via DOM scan + network sniffing" },
        { zh: "视频 / 图片 / 音频统一进入队列", en: "Video, image, audio all queue together" }
      ]
    },
    {
      id: "one-tray",
      icon: "basket",
      order: 1,
      tag: { zh: "整理", en: "Organize" },
      title: { zh: "一处收齐所有素材", en: "One tray for everything" },
      summary: {
        zh: "网页抓的、本地的、粘贴的，全进同一个篮子，排序筛选一眼看清。",
        en: "Web grabs, local files, pastes — all in one basket. Sort and filter at a glance."
      },
      bullets: [
        { zh: "所有来源统一在一个列表", en: "Every source in a single list" },
        { zh: "按类型、大小、来源筛选", en: "Filter by type, size, or source" },
        { zh: "常用规则存下来反复用", en: "Save rules you use often" }
      ]
    },
    {
      id: "panel",
      icon: "panel",
      order: 2,
      tag: { zh: "面板", en: "Panel" },
      title: { zh: "Quick Capture 一面板搞定", en: "Quick Capture panel" },
      summary: {
        zh: "选素材、选目标，一键发送；长按打开 Action Orbit 精确路由。",
        en: "Pick assets, pick target, one click to send; hold to open Action Orbit."
      },
      bullets: [
        { zh: "三种面板随心切：主面板 / 快捷 / Orbit", en: "Three panels: Main / Quick / Orbit" },
        { zh: "点击发送 = 按默认目标直达", en: "Click Send = straight to default target" },
        { zh: "长按发送 = 打开精确路由", en: "Hold Send = open precise routing" }
      ]
    },
    {
      id: "orbit",
      icon: "orbit",
      order: 3,
      tag: { zh: "路由", en: "Route" },
      title: { zh: "Action Orbit 手势落位", en: "Action Orbit routing" },
      summary: {
        zh: "按住发送并拖向目标节点，松手即确认，不执行任何多余操作。",
        en: "Hold Send and drag to a target node. Release to confirm."
      },
      bullets: [
        { zh: "按住 0.38s 连续拖动", en: "Hold 0.38s, drag continuously" },
        { zh: "多级分支：文件夹 → 图层 → 包装", en: "Multi-level: folder → layer → packaging" },
        { zh: "拖回中心 / Esc 取消", en: "Drag back or Esc to cancel" }
      ]
    },
    {
      id: "local",
      icon: "local",
      order: 4,
      tag: { zh: "传输", en: "Transfer" },
      title: { zh: "本地直传，不经服务器", en: "Local transfer, no server" },
      summary: {
        zh: "所有媒体通过本地 WebSocket 传输，隐私与速度兼得。",
        en: "All media travels over local WebSocket — private and fast."
      },
      bullets: [
        { zh: "本地直连，无云端中转", en: "Local connection, no cloud relay" },
        { zh: "媒体流不经任何服务器", en: "Never touches any server" },
        { zh: "确认后直接落位 AE / PS", en: "Lands directly in AE / PS" }
      ]
    },
    {
      id: "hosts",
      icon: "hosts",
      order: 5,
      tag: { zh: "归位", en: "Place" },
      title: { zh: "AE / PS 双端对称归位", en: "AE / PS placement" },
      summary: {
        zh: "同一套归位逻辑，AE 走合成 / 文件夹，PS 支持智能对象 / 普通图层。",
        en: "One placement logic: AE uses comps / folders, PS supports Smart Object / raster."
      },
      bullets: [
        { zh: "AE：合成 / 文件夹 / 图层顺序", en: "AE: comp / folder / layer order" },
        { zh: "PS：智能对象 / 栅格图层 / 本地图片", en: "PS: Smart Object / raster / local image" },
        { zh: "SVG 可保留 / 转形状 / 转图片", en: "SVG: keep / shapes / image" }
      ]
    }
  ]
};
