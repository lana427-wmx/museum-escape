# GitHub Pages 发布

原游戏目录保持不变，网站由 GitHub Actions 发布。工作流会将 index.html、CSS、js 与 assets 打包到 _site；不发布本地启动程序和测试报告。

1. 在 GitHub 创建公开仓库 museum-escape，并上传本目录源文件。
2. 仓库 Settings → Pages → Source 选择 GitHub Actions。
3. main 分支提交会执行 Publish museum game，也可在 Actions 页面手动运行。
4. 以 Pages 设置页和成功部署记录给出的网址为准。准备配置本身不代表已发布成功。

在线版本使用 HTTPS，首次使用需重新注册本地游戏账号；localhost 的存档不会自动迁移。游戏账号、最高分和进度仍只保存在访问者当前浏览器中。

本地检查发布内容：node scripts/prepare-pages.cjs。双击原启动程序仍可在本机游玩。
