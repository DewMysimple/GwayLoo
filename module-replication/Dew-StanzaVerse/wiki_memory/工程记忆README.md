# Dew-StanzaVerse 工程 Agent 记忆系统

这是 `Dew-StanzaVerse` 独立项目的持久化工程记忆。它把当前应相信的事实、经过确认的决策、稳定知识和历史日志分开保存，供本项目 Agent、Git 和普通 Markdown 工具使用。

## 目录结构

```text
wiki_memory/
├── 工程记忆README.md
├── AGENTS.md
├── llm-wiki.md
├── 当前状态/
├── 决策/
├── 知识/
│   ├── 模块/
│   ├── 流程/
│   ├── 规范/
│   └── 运维/
├── 日志/
├── 模板/
└── 工具/memory_lint.py
```

## 使用规则

1. 开始任务时读取 `AGENTS.md`，再按其中顺序读取当前状态和相关记忆。
2. 完成实质任务后，在 `日志/` 新增一篇日期标题日志并刷新 `日志/MOC_工作日志.md`。
3. 影响未来工作的结论先在日志中提出，确认后再沉淀到当前状态、决策或知识页。
4. 运行 `python 工具/memory_lint.py check` 检查页面元数据、链接和孤儿页面。

本记忆只服务于 `Dew-StanzaVerse`，不计入 Verminoble 主线 `wiki_memory/`。
