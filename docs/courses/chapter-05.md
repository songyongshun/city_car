---
title: "Apollo 平台入门"
collection: teaching
type: "Undergraduate course"
permalink: /teaching/2025-autumn-teaching/apollo-chapter-1
venue: "常州工业职业技术学院, 信息工程学院"
date: 2025-09-01
location: "Changzhou, China"
---
# 第一章 planning模块开发

## 环境配置

### 1. vscode

#### 兼容ubuntu 18.04的vscode 1.85.2版本下载

windows上，需要安装vscode v85版本，为了不跟已安装的新版本冲突，建议下载[便携版](https://vscode.download.prss.microsoft.com/dbazure/download/stable/8b3775030ed1a69b13e4f4c628c612102e30a681/VSCode-win32-x64-1.85.2.zip).

下载后，解压并放到`C:\Users\lenovo\soft`目录下，并将该目录加入环境变量。然后复制`\bin\code.cmd`为`\bin\codev85.cmd`，可以在terminal下通过`codev85`来启动。

#### 通过wsl连接ubuntu 22.04

vscode按照remote ssh插件，即可。

#### 通过dev container进入apollo容器
需要先启动apollo容器。然后编辑文件: 
```bash
cd C:\Users\swan\AppData\Roaming\Code\User\globalStorage\ms-vscode-remote.remote-containers\imageConfigs

cat .\registry.baidubce.com%2fapollo%2fapollo-env-gpu%3a9.0-latest.json
{
        "remoteUser": "swan",
        "extensions": [
                "eamodio.gitlens",
                "MS-CEINTL.vscode-language-pack-zh-hans",
                "ms-vscode.cpptools"
        ],
        "workspaceFolder": "/apollo_workspace"
}

```

默认vscode会下载最新版本的vscode server到容器里，而容器由于ubuntu版本较低，会无法运行。
建议离线下载vscode server。
```bash
# 8b3775030ed1a69b13e4f4c628c612102e30a681  是 vscode 1.85.2版本的commit id，可以通过帮助->关于查看。
wget https://vscode.download.prss.microsoft.com/dbazure/download/stable/8b3775030ed1a69b13e4f4c628c612102e30a681/vscode-server-linux-x64.tar.gz

# 然后
mkdir -p  ~/.vscode-server/bin/8b3775030ed1a69b13e4f4c628c612102e30a681
tar zxvf vscode-server-linux-x64.tar.gz 
mv vscode-server-linux-x64/* ~/.vscode-server/bin/8b3775030ed1a69b13e4f4c628c612102e30a681/
```
此时，重新dev container可以进入容器。

### 2. cline安装
要使用cline cli分析代码，需要安装cline.
而cline基于nodejs开发，需要nodejs最低版本是v22.0，但ubuntu 18.04的glibc版本是2.27，nodejs需要glibc 2.28。
解决办法是下载基于glibc 2.17版本编译好的nodejs包。
```bash
wget https://unofficial-builds.nodejs.org/download/release/v22.0.0/node-v22.0.0-linux-x64-glibc-217.tar.gz

tar zxvf node-v22.0.0-linux-x64-glibc-217.tar.gz
sudo mv node-v22.0.0-linux-x64-glibc-217 /usr/local
echo 'export PATH=/usr/local/node-v22.0.0-linux-x64-glibc-217/bin:$PATH' >> ~/.bashrc
source ~/.bashrc
node --version
# 接下来可以安装cline cli
npm install -g cline
```

cline启动需要`open-gdb`包，若有提示，需要安装：
```bash
sudo apt-get install xdg-utils
```

接下来可以使用cline里的免费大模型，比如`deepseek-v4-flash`进行辅助开发。
