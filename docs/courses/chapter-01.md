---
title: "Apollo 平台入门"
collection: teaching
type: "Undergraduate course"
permalink: /teaching/2025-autumn-teaching/apollo-chapter-1
venue: "常州工业职业技术学院, 信息工程学院"
date: 2025-09-01
location: "Changzhou, China"
---

# 第一章 Apollo 平台安装

> 适用于 Apollo 9.0 及以上版本，基于 Ubuntu 22.04 操作系统，参考[官方文档](https://apollo.baidu.com/docs/apollo/latest/md_docs_2_xE8_xB5_x9B_xE4_xBA_x8B_xE6_x80_xBB_xE6_xB1_x87_202___xE5_xAE_x89_xE8_xA3_x85_xE9_x83_873ec1164e139a42fc87d809846879d4.html)

---

## ✅ 前置准备

### 1. 系统要求
| 项目 | 推荐配置 |
|------|---------|
| 操作系统 | Ubuntu 22.04 LTS |
| CPU | 8核16线程以上 |
| 内存 | 32GB 以上 |
| 硬盘 | 200GB SSD |

### 2. 安装基础依赖
```bash
# 更新源cache
sudo apt update 
```

---

## 🛠️ 开发环境搭建

### 1. 安装 Docker 环境
```bash
# 安装 Docker(国内网络可靠)
# 更新清华源
sudo cp /etc/apt/sources.list /etc/apt/sources.list.bak && \
sudo sed -i 's#http://.*.ubuntu.com#https://tsinghua.edu.cn#g' /etc/apt/sources.list
sudo apt install docker.io

# 安装aem
# 添加 gpg key
sudo install -m 0755 -d /etc/apt/keyrings
curl -fsSL https://apollo-pkg-beta.cdn.bcebos.com/neo/beta/key/deb.gpg.key | sudo gpg --dearmor -o /etc/apt/keyrings/apolloauto.gpg
sudo chmod a+r /etc/apt/keyrings/apolloauto.gpg
 
# 设置源并更新
echo \
    "deb [arch="$(dpkg --print-architecture)" signed-by=/etc/apt/keyrings/apolloauto.gpg] https://apollo-pkg-beta.cdn.bcebos.com/apollo/core"\
    $(. /etc/os-release && echo "$VERSION_CODENAME") "main" | \
    sudo tee /etc/apt/sources.list.d/apolloauto.list

# 若是ubuntu 24.04，修改apollauto.list源文件。
sudo sed -i 's/noble/jammy/' /etc/apt/sources.list.d/apolloauto.list

# 更新源cache
sudo apt update

# 执行安装
sudo apt install apollo-neo-env-manager-dev --reinstall
```

至此，`aem`已经安装成功。


### 2. 获取 Apollo pnc 源码
```bash
# 克隆 Apollo 仓库
git clone https://github.com/ApolloAuto/application-pnc.git

# 进入工程目录
cd application-pnc
bash setup.sh
```

### 3. 拉取并启动docker容器
```bash
cd application-pnc
# 要保证在工程目录下执行
aem start

# 此后可以：
aem enter
```

---

## 📦 编译部署


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