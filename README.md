# 🎯 雅思词汇乐园 · IELTS Vocab Fun

一个纯前端、零依赖的趣味雅思背单词页面。打开 `index.html` 就能用，不需要安装任何东西。

## 特色

- **谐音梗记忆** —— 每个词都配一个中文谐音 + 小故事，先把词「塞进脑子」，再用例句和搭配巩固
- **真人发音** —— 英式 / 美式 / 慢速三种朗读，例句也能整句朗读（使用浏览器自带语音，无需联网 API）
- **四种玩法**
  - 🃏 学习：翻转卡片，音标 + 中文 + 谐音梗 + 雅思例句 + 常用搭配
  - 🎯 测验：看词选义 / 听音选词 / 看义选词
  - ⌨️ 拼写：听音拼单词，可逐字母提示
  - ✍️ 填空：在雅思风格例句里选出正确的词（干扰项与正确答案词性相同）
- **记忆系统** —— 简化版间隔重复（1 / 3 / 7 / 14 / 30 天），到期的词自动排到最前面
- **游戏化** —— XP、等级、连续打卡天数、答对撒花 + 音效
- **7 大雅思高频主题** —— 环境、教育、科技、健康、社会与工作、文化与媒体、学术万能词，共 70 词

所有进度保存在浏览器本地（localStorage），不上传任何数据。

## 在线使用（云端）

仓库自带 GitHub Pages 自动部署（`.github/workflows/pages.yml`）。推送后，Actions 会把页面发布到：

`https://<你的用户名>.github.io/my-roleplay-ai/`

如果第一次部署失败，去仓库 **Settings → Pages → Build and deployment → Source** 选 **GitHub Actions**，再重新运行一次 workflow 即可。

也可以离线用：`node scripts/build-single.js` 会生成 `dist/ielts-vocab.html` 单文件，发到手机上用浏览器打开就行。

## 本地使用

1. 直接双击 `index.html`
2. 推荐使用 Chrome / Edge / Safari，语音效果最好
3. 键盘快捷键（学习页）：`空格` 翻面，`←` `→` 切换，`1` `2` `3` 评分

## 添加 / 修改单词

词库源文件在 `data/<主题>.jsonl`，每行一个词：

```json
{"w":"drought","ipa":"/draʊt/","pos":"n.","cn":"干旱","pun":"抓土","story":"干旱时地里没水，一伸手只能抓到干土。","ex":"The region has suffered from severe drought for three years.","exCn":"该地区已连续三年遭受严重干旱。","col":["severe drought","drought-stricken areas"]}
```

改完后运行 `node scripts/build-words.js` 重新生成 `js/words.js`（会自动去重、编号）。

## 文件结构

```
index.html               页面骨架
css/style.css            样式
js/words.js              词库（由脚本生成，勿手改）
js/app.js                逻辑（发音、卡片、测验、拼写、填空、词库）
data/*.jsonl             各主题词库源文件
scripts/build-words.js   合并词库
scripts/build-single.js  打包成单文件
.github/workflows/       GitHub Pages 自动部署
```
