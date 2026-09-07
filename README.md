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

## 后续计划
见对话记录，一步一步加。
