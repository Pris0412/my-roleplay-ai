#!/usr/bin/env node
// 把 index.html + css + js 打包成一个单文件 dist/ielts-vocab.html，方便发到任何地方或直接在手机上打开。
// 用法：node scripts/build-single.js            → dist/ielts-vocab.html（完整 html）
//       node scripts/build-single.js --fragment → 只输出 body 片段（给托管平台用）
const fs = require("fs"), path = require("path");
const ROOT = path.join(__dirname, "..");
const read = (p) => fs.readFileSync(path.join(ROOT, p), "utf8");
let html = read("index.html");
const css = read("css/style.css"), words = read("js/words.js"), app = read("js/app.js");
// 用函数形式替换，避免 $& $1 等在替换字符串里被当成特殊模式
html = html.replace('<link rel="stylesheet" href="css/style.css" />', () => "<style>\n" + css + "\n</style>");
html = html.replace('<script src="js/words.js"></script>', () => "<script>\n" + words + "\n</script>");
html = html.replace('<script src="js/app.js"></script>', () => "<script>\n" + app.replace(/<\/script>/g, "<\\/script>") + "\n</script>");
const fragment = process.argv.includes("--fragment");
let out = html;
if (fragment) {
  const title = /<title>[\s\S]*?<\/title>/.exec(html)[0];
  const body = /<body>([\s\S]*)<\/body>/.exec(html)[1];
  const style = /<style>[\s\S]*?<\/style>/.exec(html)[0];
  out = title + "\n" + style + "\n" + body.replace(style, () => "");
}
fs.mkdirSync(path.join(ROOT, "dist"), { recursive: true });
const file = path.join(ROOT, "dist", fragment ? "artifact.html" : "ielts-vocab.html");
fs.writeFileSync(file, out);
console.log("wrote", file, (out.length / 1024).toFixed(0) + " KB");
