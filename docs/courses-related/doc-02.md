# 8080 端口摄像头推流问题排查与解耦

## 1.1 架构概述

```
ManualControlThread (manualControl.cpp)
    ├── TCP Server : 监听 8080 端口
    ├── 连接后      → startManualTakeover() （自动触发接管）
    └── 推流        → sendFrameToClient(clientFd, ...) [JPG over TCP]

icar.hpp
    ├── icarConnect → isConnected() ? 断开 : startManualTakeover()
    ├── 主循环推流  → if (params->manualTakeover && fsmFactory.manual->isConnected())
```

## 2.2 问题分析

**原推流条件（未解耦前）：**
```cpp
if (params->manualTakeover && fsmFactory.manual->isConnected()) { ... }
```

两个问题：
1. **条件过严**：只有同时在 manual 模式 + 有 8080 连接时才推流。如果只在 other 模式想远程看画面，不推流。
2. **连接即接管**：`icarConnect()` 中 `isConnected() == false` 时会自动调 `startManualTakeover()` —— 连上 8080 就变成 manual 状态，无法"只观看不控制"。

## 2.3 已完成的解耦改动

### 改动 1：推流条件改为仅判定 `isConnected()`
```cpp
// 修改前
if (params->manualTakeover && fsmFactory.manual->isConnected()) { ... }

// 修改后
if (fsmFactory.manual->isConnected()) { ... }
```
效果：只要有人连上 8080 就持续推流，不再需要处于 manual 模式。可以在 any 状态都远程查看实时画面。

### 改动 2：后续可选（待确认方向）
若需要"仅观看不接管"：
- A. 修改 `icarConnect()` 连接时不调 `startManualTakeover()`
- B. 修改 `startStop()` 回自动时不调 `disconnectClient()`

