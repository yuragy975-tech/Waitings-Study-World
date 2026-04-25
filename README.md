# 生词宝典 · ShengCi BaoDian

我的个人英语学习网站，部署在 [www.waiting66.com](https://www.waiting66.com)。

## 功能规划

- **生词记忆笔记本**：输入生词 → 中文释义 / 音标 / 词根 / 英文解释 / 例句 / 一键发音；记录复习次数。
- **听写**：每日定额任务，系统给中文 + 朗读英文，用户拼写并自动判分。

## 技术栈

- 前端：Next.js + Tailwind CSS
- 数据库：SQLite（本地） → Supabase（部署后）
- 词典数据：[ECDICT](https://github.com/skywind3000/ECDICT) + [Free Dictionary API](https://dictionaryapi.dev)
- 朗读：Web Speech API
- RAG：LangChain.js + Chroma（用于例句检索 / 上下文解释）
- 部署：Vercel

## 进度

- [x] 阶段 0：环境与账号准备
- [ ] 阶段 1：Hello World 上线 www.waiting.com
- [ ] 阶段 2：生词查询 MVP
- [ ] 阶段 3：生词本 + 复习标记
- [ ] 阶段 4：发音小喇叭
- [ ] 阶段 5：RAG 模块（例句检索）
- [ ] 阶段 6：听写功能
- [ ] 阶段 7：打磨 + 上线

## 本地开发

> 待阶段 1 后补充。
