# apollo环境开发

## 编译部署

### 1. 完整编译

```bash
# 在容器内编译
buildtool build -p core
```

### 2. 启动Dreamview

```bash
# 启动 Dreamview 可视化界面
aem bootstrap start --plus

# 访问 http://localhost:8888 查看界面
```

---

## 🚀 快速入门示例

### 1. 运行演示场景

```bash
# 下载演示数据包
./scripts/download_demo_data.sh

# 播放演示数据
./scripts/play_demo_rosbag.sh
```

### 2. 查看模块运行状态

```bash
# 查看所有模块状态
./scripts/monitor.sh

# 查看 CyberRT 拓扑
cyber_monitor
```

---

## 💡 常见问题

1. **Docker 启动失败**: 检查 NVIDIA 驱动是否正确安装
2. **编译内存不足**: 增加交换分区或减少编译线程数
3. **Dreamview 无法访问**: 检查 8888 端口是否被占用
4. **模块启动异常**: 查看 log 目录下的日志文件

---

