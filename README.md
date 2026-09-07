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

## v4 · 世界书（World Info / Lorebook）
- 同时接受 V2 卡的 `character_book` 和 SillyTavern 原生世界书 JSON（`entries` 为对象或数组都行）
- 两级：角色世界书随卡导入导出（V2 格式）；全局世界书在设置栏管理（导入 / 新建 / 启停 / 删除），导出为 ST 原生格式
- 条目编辑器：标题、关键词（支持 `/正则/`）、次要关键词 + 四种逻辑、内容、常驻、区分大小写、整词匹配、
  插入位置（角色设定前 / 后）、顺序、概率、扫描深度、递归相关开关
- 触发逻辑：常驻恒带；关键词扫描最近 N 条；次要词逻辑 AND ANY / NOT ALL / NOT ANY / AND ALL；概率；
  递归扫描（世界书级开关 + 条目级 exclude / prevent）；禁用条目跳过；按 token 预算裁剪，order 高的优先保留
- 前置条目插在角色设定之前，其余在之后

## v4.1 · 按名字绑定的角色世界书
- 识别卡里的 `extensions.world`（SillyTavern 的「角色世界书」只存名字），编辑角色里可以看到并改绑
- 同名的全局世界书对该角色始终生效，即使全局未勾选；导出时写回 `extensions.world`
- 导入角色卡的提示会列出：正则几条、世界书是否嵌入、绑定了哪本、是否已关联

## v4.2–4.3 · 字数区间、灵感、抢话方式
- 回复长度改为字数区间：短 200–300 / 中 500–800 / 中长 800–1200 / 长 1200–2000 / 自定义
- 「灵感」按钮：按你的人设 + 最近对话，用 `sample.json` 生成 3 条不同走向的草稿，点一下填进输入框；输入框里已有的半句会作为草稿方向
- 「抢话」快速切换（输入框上方）：完全不抢话 / 不抢话但可写我的表情动作 / 可复述我的话 / 复述 + 扩展动作表情，直接改提示词里的对应规则

## v4.4 · 角色可挂多本世界书
- 角色世界书从单本改为列表：新建、导入到角色、逐本启停、逐本删除、编辑条目
- 导出角色卡时把启用的几本合并成一本 `character_book`
- 修复：世界书的启用 / 禁用状态在重开编辑器或刷新后丢失；卡里已嵌入同名世界书时不再提示「需另外导入」

## v4.5 · 记忆总结
- 每条消息显示楼层号 `#n`
- 「记忆」按钮（顶栏 / 设置栏）：选楼层范围（默认从上次总结的下一楼到最新），生成总结，可改后存为条目
- 首次保存自动创建绑定该角色的「记忆 · 角色名」世界书（`memory: true`），条目按 `起-止` 楼命名，常驻，插在角色设定之后
- 总结提示词可自定义并保存，占位符 `{{char}} {{user}} {{range}} {{messages}} {{previous}}`；此前的记忆会作为衔接喂给模型
- 可选：带入上下文时跳过已总结的楼层（保留最近 4 条）

## v5 · 记忆索引、上下文用量、楼层隐藏
- 页内全文检索（不依赖任何外部 API / WASM）：分词倒排索引 + BM25，中文按双字切、英文按词；索引从聊天记录即时重建
- 输入框右下角的「上下文」按钮显示本次会发送的大小（占 64 KiB 上限的比例）、楼层范围、隐藏数、检索数；超过 75% 或有楼层被丢弃时变红
- 上下文面板：分项大小、建议、「隐藏第 1–N 楼」批量隐藏、取消全部隐藏；每条消息也有「隐藏 / 取消隐藏」
- 隐藏的楼层不进上下文，但仍在记录里、仍可被检索
- 自动检索：发消息时用最新一条消息去搜不在上下文里的楼层（含隐藏），最多带入 5 / 10 / 20 / 30 楼，
  以「相关记忆」附在角色设定之后；过滤掉泛词，只保留相关度达到最高分 30% 的命中
- 手动搜索：面板里输入关键词，命中高亮，点结果跳到对应楼层
- 说明：Artifact 的 CSP 拦掉了 SQLite 的 WASM 下载，所以用同等原理的 JS 实现代替 FTS5

## 后续计划
见对话记录，一步一步加。
