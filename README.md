# 提灯酒馆 (Lantern Tavern)

一个类似 SillyTavern 的 AI 角色扮演聊天页面，作为 claude.ai Artifact 发布。

- `index.html` — 整个应用（单文件，无构建步骤）。发布时由 Artifact 工具包上 `<!doctype html>` 外壳。
- 对话通过 Artifact 的 `sample` 能力调用 Claude，由查看者自己的账号付费；第一次发送会弹出授权。
- 角色、聊天记录、人设、设置全部存在浏览器 localStorage（`lantern-tavern.v1`）。

## 已有功能（v1）
- 角色卡：名字、标签、头像（表情/颜色/上传图片）、描述、性格、场景、开场白、对话示例
- `{{user}}` / `{{char}}` 占位符替换
- 用户人设（名字 + 描述）
- 流式回复、停止、重新生成、编辑/删除/复制消息、空消息发送 = 让角色继续
- 模型档位 / 回复长度 / 回复语言 / 上下文条数
- 深色优先，跟随系统主题

## v2 · SillyTavern 角色卡兼容
- 导入 `.png`（tEXt `chara` / `ccv3` 块）和 `.json`（v1 / v2 / v3），支持多选和拖入左栏
- PNG 卡的图片自动成为头像
- 字段映射：name / description / personality / scenario / first_mes / mes_example / alternate_greetings /
  creator_notes / system_prompt / post_history_instructions / tags / creator / character_version / character_book / extensions
- `system_prompt` 会替换默认扮演规则，支持 `{{original}}`；`post_history_instructions` 放在对话末尾
- 世界书（character_book）基础版：常驻条目总是带入，其余按关键词在最近几条消息里扫描；`selective` + `secondary_keys` 也认
- 备用开场白：开场白消息上可以切换
- 导出 V2 JSON，或导出 PNG（同时写入 `chara` v2 和 `ccv3` v3 块）；导出需要 Artifact 的 `downloads` 能力

## v3 · 正则脚本、Markdown/HTML 渲染、左右滑动
- 兼容 SillyTavern Regex 扩展的脚本格式（scriptName / findRegex / replaceString / trimStrings / placement /
  markdownOnly / promptOnly / substituteRegex / minDepth / maxDepth）
- 全局脚本在设置栏管理（导入 JSON、新建、编辑、启停、导出）；角色卡自带的 `extensions.regex_scripts` 随卡导入导出，在编辑角色的高级区管理
- 编辑器里可以贴一段文本实时预览替换结果
- 消息经过：占位符替换 → 正则（显示阶段）→ Markdown（marked）→ 消毒（DOMPurify，允许 style）→ 渲染到 Shadow DOM，卡片自带 CSS 不会污染页面
- 提示词阶段单独跑一遍正则（markdownOnly 的不跑，promptOnly 的只在这里跑）
- 回复支持多版本：‹ n/N ›，最后一条回复按 › 生成新版本；开场白在多个开场白之间循环切换
- 库从 cdnjs 加载，加载不到时退回纯文本渲染

## v3.1 · 前端卡渲染修复、宏、删除角色
- 渲染前先把成对的块级 HTML（div / table / details / style …）整体保护起来，再交给 marked，空行和缩进不再被拆成代码块
- DOMPurify 开 `FORCE_BODY`，开头的 `<style>` 不再被丢掉
- 常用宏：`{{persona}}` `{{description}}` `{{scenario}}` `{{time}}` `{{date}}` `{{random}}` `{{pick}}` `{{roll}}` `{{newline}}` `{{//注释}}`
  `{{lastMessage}}` 系列、`{{setvar/getvar/addvar/incvar/decvar}}` 和 global 版本
- 角色列表悬停出现 ✕，编辑角色底部有「删除角色」，设置栏原有的按钮保留
- 渲染库加载失败时页面顶部会提示

## 后续计划
见对话记录，一步一步加。
