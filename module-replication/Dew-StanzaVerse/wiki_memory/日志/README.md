---
type: moc
status: active
kind: process
importance: medium
updated: 2026-08-24
topic: work-log-guide
source_logs: []
supersedes: null
---

# 工作日志说明

每次实质任务只创建一篇日期标题日志，使用 `kind` 区分功能、UI、Bug、讨论、测试和维护。日志保存历史事实；当前有效结论应沉淀到 `当前状态/`、`决策/` 或 `知识/`。

日志完成后运行：

```powershell
python 工具/memory_lint.py index
python 工具/memory_lint.py check
```

日志文件使用 `YYYY-MM-DD-任务标题.md`，并通过 `日志/MOC_工作日志.md` 建立统一索引。
