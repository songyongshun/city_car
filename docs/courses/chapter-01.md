# 第一章 Apollo 平台安装

> 适用于 Apollo 9.0 及以上版本，基于 Ubuntu 22.04 操作系统，参考[官方文档](https://apollo.baidu.com/docs/apollo/latest/md_docs_2_xE8_xB5_x9B_xE4_xBA_x8B_xE6_x80_xBB_xE6_xB1_x87_202___xE5_xAE_x89_xE8_xA3_x85_xE9_x83_873ec1164e139a42fc87d809846879d4.html)

## ✅ 前置准备

### 1. 系统要求


| 项目     | 推荐配置         |
| ---------- | ------------------ |
| 操作系统 | Ubuntu 22.04 LTS |
| CPU      | 8核16线程以上    |
| 内存     | 32GB 以上        |
| 硬盘     | 200GB SSD        |

### 2. 安装基础依赖

```bash
# 更新源cache
sudo apt update
```

## 🛠️ 开发环境搭建

### 1. 安装 Docker 环境

```bash
# 安装 Docker(国内网络可靠)
# 更新清华源
sudo cp /etc/apt/sources.list /etc/apt/sources.list.bak && \
sudo sed -i 's#http://.*.ubuntu.com#https://tsinghua.edu.cn#g' /etc/apt/sources.list
sudo apt install docker.io
```

### 2. 安装aem

`aem`是 Apollo 的环境管理工具，提供了容器化的开发环境，便于快速搭建和管理 Apollo 开发环境。
使用`aem`可以快速启动 Apollo 的开发环境，避免了繁琐的配置过程。如果不用`aem`，通常进入docker容器的方式是：

```bash
docker run -it --rm --gpus all --privileged -v /dev:/dev -v /tmp/.X11-unix:/tmp/.X11-unix -e DISPLAY=$DISPLAY -e NVIDIA_DRIVER_CAPABILITIES=all -e NVIDIA_VISIBLE_DEVICES=all apolloauto/apollo:dev-22.04-9.0.0
```

而使用`aem`，只需：

```bash
aem enter
```

由于`aem`不是 Ubuntu 官方源提供的软件包，需要手动添加 Apollo 的软件源。

```bash
# 添加 gpg key
# 以管理员权限创建一个安全的目录（/etc/apt/keyrings），专门用来存放第三方软件源的 GPG 公钥。
sudo install -m 0755 -d /etc/apt/keyrings
# 以管理员权限运行 GPG 工具，将 ASCII 文本格式（Armor）的公钥转换（解密/反伪装）为二进制格式。
curl -fsSL https://apollo-pkg-beta.cdn.bcebos.com/neo/beta/key/deb.gpg.key | sudo gpg --dearmor -o /etc/apt/keyrings/apolloauto.gpg
sudo chmod a+r /etc/apt/keyrings/apolloauto.gpg

# 设置源地址，指定源软件的gpg公钥
echo \
    "deb [arch="$(dpkg --print-architecture)" signed-by=/etc/apt/keyrings/apolloauto.gpg] https://apollo-pkg-beta.cdn.bcebos.com/apollo/core"\
    $(. /etc/os-release && echo "$VERSION_CODENAME") "main" | \
    sudo tee /etc/apt/sources.list.d/apolloauto.list
```

```bash
# 若是ubuntu 24.04，修改apollauto.list源文件。
sudo sed -i 's/noble/jammy/' /etc/apt/sources.list.d/apolloauto.list
```

```bash
# 更新源cache
sudo apt update

# 执行安装
sudo apt install apollo-neo-env-manager-dev --reinstall
```

至此，`aem`已经安装成功。

### 3. 获取 Apollo pnc 源码

```bash
# 克隆 Apollo 仓库, 注意这是最新的。
git clone https://github.com/ApolloAuto/application-pnc.git

# 进入工程目录
cd application-pnc
# 检查系统环境，写入`.workspace.json`文件
bash setup.sh
```

### 4. 拉取并启动docker容器

```bash
cd application-pnc
# 要保证在工程目录下执行
aem start

# 此后可以：
aem enter
```
