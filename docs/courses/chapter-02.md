---
title: "Apollo 系统架构详解"
collection: teaching
type: "Undergraduate course"
permalink: /teaching/2025-autumn-teaching/apollo-chapter-2
venue: "常州工业职业技术学院, 信息工程学院"
date: 2025-09-08
location: "Changzhou, China"
---

# 第二章 Apollo 系统架构详解

> Apollo 采用模块化分层设计架构，支持灵活的组件替换与功能扩展

---

## 📐 整体系统架构

### 1. 分层架构设计
| 层级 | 功能说明 | 包含模块 |
|------|---------|---------|
| 硬件抽象层 | 传感器与车辆硬件接口 | 驱动适配、硬件抽象 |
| 基础平台层 | 操作系统与中间件 | CyberRT、工具链、依赖库 |
| 核心功能层 | 自动驾驶核心算法 | 感知、定位、规划、控制 |
| 应用服务层 | 业务逻辑与功能 | 导航、决策、人机交互 |
| 云端服务层 | 后台支持服务 | 高精地图、OTA、数据平台 |

### 2. 核心模块组成
```
Apollo 系统
├─ 感知模块 (Perception)
├─ 定位模块 (Localization)
├─ 高精地图 (HD Map)
├─ 规划模块 (Planning)
├─ 控制模块 (Control)
├─ 底盘模块 (Chassis)
└─ 监控与可视化
```

---

## 🔄 CyberRT 通信中间件

### 1. 核心特性
- **高性能异步通信**：低延迟高吞吐量
- **发布订阅模式**：松耦合组件通信
- **共享内存传输**：零拷贝数据传递
- **时间同步机制**：分布式系统时间对齐

### 2. 基本概念
| 概念 | 说明 |
|------|------|
| Node | 通信节点，每个模块对应一个Node |
| Channel | 数据传输通道，消息主题 |
| Reader/Writer | 消息收发接口 |
| Service | 请求响应式服务调用 |

### 3. 常用操作命令
```bash
# 查看运行节点
cyber_node list

# 查看可用通道
cyber_channel list

# 监听通道数据
cyber_echo /apollo/perception/obstacles

# 查看节点拓扑
cyber_monitor
```

---

## 📊 数据流与调度

### 1. 数据流转流程
```
传感器数据 → 感知处理 → 障碍物检测 → 定位融合
     ↓
  全局地图 → 路径规划 → 轨迹生成 → 车辆控制 → 底盘执行
```

### 2. 任务调度机制
- 基于优先级的调度策略
- 实时任务与非实时任务分离
- 周期触发与事件触发结合
- 资源隔离与负载均衡

---

## ⚙️ 配置与参数系统

### 1. 配置文件结构
```
config/
├─ component/      # 组件配置
├─ dag/            # 启动拓扑配置
├─ launch/         # 启动脚本
├─ model/          # 模型参数
└─ params/         # 算法参数
```

### 2. 参数动态调整
```bash
# 查看参数
cyber_param list

# 获取参数值
cyber_param get /apollo/planning/trajectory_time_length

# 修改参数
cyber_param set /apollo/planning/trajectory_time_length 8.0
```

---

## 💡 最佳实践

1. **模块划分原则**：单一职责、接口清晰、独立部署
2. **通信设计规范**：数据格式统一、流量合理控制
3. **性能优化要点**：避免不必要的数据拷贝、合理设置线程优先级
4. **错误处理策略**：容错设计、降级方案、故障隔离

---