/* 只打包浏览器运行所需内容，测试报告与本地启动程序不进入公开网站。 */
const fs = require('node:fs');
const path = require('node:path');
const root = path.resolve(__dirname, '..');
const output = path.resolve(root, '_site');
if (path.dirname(output) !== root || path.basename(output) !== '_site')
  throw new Error('发布目录校验失败');
if (fs.existsSync(output)) fs.rmSync(output, { recursive: true });
fs.mkdirSync(output);
const files = ['index.html', ...fs.readdirSync(root).filter((name) => name.endsWith('.css'))];
for (const file of files) fs.copyFileSync(path.join(root, file), path.join(output, file));
for (const dir of ['js', 'assets'])
  fs.cpSync(path.join(root, dir), path.join(output, dir), { recursive: true });
fs.writeFileSync(path.join(output, '.nojekyll'), '');
console.log('静态网站已准备：' + output);
