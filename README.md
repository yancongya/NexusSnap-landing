---
关联文档:
  - docs/downloads.json
涉及文件:
  - docs/index.html
  - ../scripts/package-release.mjs
依赖服务:
  - GitHub Pages
  - GitHub Releases
---

# NexusSnap Landing

NexusSnap 的公开落地页与发布仓库。`docs/` 由 GitHub Pages 托管，Browser 扩展与 AE/PS CEP 插件通过 GitHub Releases 发布；自定义网盘可作为备用下载源。

> 当前页面包含普通浏览器中的交互 Mock。它用于说明工作流，不等于已安装扩展、真实 AE/PS CEP 或真实文件导入验证。

## 仓库结构

```text
docs/
  index.html          # GitHub Pages 入口
  logo.svg
  downloads.json      # 下载版本、主链接、镜像与 SHA-256
release-assets/
  v0.0.8/             # 本地生成，上传 GitHub Release，不提交 ZIP
README.md
```

扩展源码位于父级 NexusSnap 主仓库 `../`：

- `browser-ext/`：Chromium Manifest V3 浏览器扩展。
- `ae-cep-ext/`：After Effects / Photoshop CEP 扩展。
- `scripts/package-release.mjs`：统一发布打包入口。

## 本地预览

```bash
python3 -m http.server 4173 --directory docs
```

访问 <http://127.0.0.1:4173/>。这是静态站点预览，不会加载真实扩展 API 或 Adobe 宿主。

## 生成发布包

在上级 NexusSnap 主仓库执行：

```bash
node scripts/package-release.mjs
```

本地需要 Node.js 与系统 `zip` 命令；创建 GitHub Release 的示例另外需要 GitHub CLI `gh`。

首次使用保护版构建前安装发布工具依赖：

```bash
npm install
```

脚本会：

1. 校验 Browser `manifest.json` 与 CEP `manifest.xml` 版本一致。
2. 排除测试、预览适配器和系统文件。
3. 生成 `NexusSnap-Browser-<version>.zip`。
4. 生成 `NexusSnap-CEP-<version>.zip`。
5. 生成 `SHA256SUMS.txt` 与 `release-manifest.json`。
6. 更新 `docs/downloads.json`。

落地页的 Browser 与 CEP 下载按钮读取这份 JSON。`primary` 用作 GitHub Release 主下载；当 `mirrors` 非空时，快速安装区会自动增加“备用下载”。

### 保护版发布包

```bash
npm run package:protected
```

保护版只处理临时发布目录，不覆盖 Browser 或 CEP 源码：

- Browser 第一方 JavaScript 使用兼容 Manifest V3 CSP 的适度混淆，不启用 `eval`、属性名混淆或全局重命名。
- CEP Client 第一方 JavaScript使用相同策略，保留 `CSInterface.js` 与第三方库。
- `manifest.json`、HTML、CSS、SVG、协议字段和 CEP `CSXS/manifest.xml` 保持宿主可读取。
- 当前构建报告会把 CEP Host 标记为 `plain-jsx`；只有配置并验证 JSXBIN 编译器后才能宣称宿主脚本已保护。

输出文件名带 `-protected`，同时生成 `protection-report-protected.json`，记录实际处理范围。客户端混淆只能提高分析成本，不能替代服务器签名许可证或构成绝对保密。

指定版本、仓库或备用网盘：

```bash
node scripts/package-release.mjs \
  --version 0.0.8 \
  --github-repo yancongya/NexusSnap-landing \
  --mirror-base https://download.example.com/nexussnap/v0.0.8
```

`--version` 必须与两个扩展清单一致。网盘基础地址末尾不需要 `/`。

## 发布 GitHub Release

1. 在两个扩展清单中更新同一个版本号。
2. 运行项目测试与 `node scripts/package-release.mjs`。
3. 在本仓库创建同名标签，例如 `v0.0.8`。
4. 创建 GitHub Release，上传 `release-assets/v0.0.8/` 中的两个 ZIP、`SHA256SUMS.txt` 和 `release-manifest.json`。
5. 提交更新后的 `docs/downloads.json` 与站点源码。
6. 检查 GitHub Pages 下载按钮与 Release 资产名称完全一致。

推荐从主仓库执行完整的本地发布入口：

```bash
npm run version:set -- 1.1.0
npm run package:protected
npm run release:publish
```

`release:publish` 会验证登录状态、保护版标记、文件是否存在及 SHA-256，并拒绝覆盖已经存在的版本。需要先提交并推送版本源码和落地页的 `docs/downloads.json`，再发布 Release。预发布可用 `--channel beta` 生成更新清单。

使用 GitHub CLI 的示例：

```bash
gh release create v0.0.8 \
  release-assets/v0.0.8/*.zip \
  release-assets/v0.0.8/SHA256SUMS.txt \
  release-assets/v0.0.8/release-manifest.json \
  --title "NexusSnap 0.0.8" \
  --generate-notes
```

## 备用网盘

推荐把与 GitHub Release 完全相同的文件上传到网盘，并保持文件名不变。发布时传入 `--mirror-base`，脚本会把备用地址写入 `docs/downloads.json` 的 `mirrors` 数组。

主下载不可用时，页面可以按数组顺序提供“备用下载”入口。不要让网盘包与 GitHub Release 使用相同版本号却包含不同内容；以 SHA-256 为准核对。

## 版本检查与热更新边界

`docs/downloads.json` 是 Browser、CEP 和落地页共同读取的更新清单，包含当前版本、`stable`/`beta` 通道、发布时间、更新日志地址、下载地址和校验值。客户端比较语义版本后可以显示升级提醒。

Browser MV3 与 CEP 都不应从远端下载 JavaScript 后直接执行。安全的“热更新”流程是：发现新版本 → 显示更新说明 → 用户下载受保护安装包 → 校验 SHA-256 → 重新加载 Browser 扩展或重启 Adobe 面板。内容配置若以后需要无重启更新，应单独设计带签名、白名单和回滚版本的配置通道，不能复用代码执行能力。

## 安装边界

- Browser ZIP 是开发者模式加载的未签名 Chromium 扩展目录包，不是 Chrome Web Store 安装包。
- CEP ZIP 是扩展目录包，不是签名的 ZXP/系统安装器。
- Photoshop 代码与普通浏览器 Mock 已存在，但真实 Photoshop CEP、文件类型、图层位置和导入结果仍需在目标版本中验收后再作为稳定能力宣传。
