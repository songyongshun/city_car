# boot后台进程

## 1. 架构总览

这个项目有 **两层** 启动机制：

```
第一层（Python）: python3 src/start.py    ← 交互配置界面层
第二层（C++编译）: ./build/icar           ← 核心控制程序
```

## 2. `python3 src/start.py` 做了什么？

它执行了 **4 个步骤**，本质上是在做**配置**：

| 步骤 | 作用 | 写入位置 |
|------|------|---------|
| ① 语音指令解析 | 你输入自然语言（如"第一圈停停车场车位 4，第二圈走施工区"），LLM 解析成结构化的圈数计划 | — |
| ② 摄像头视觉识别 | 拍一张照片，识别障碍物/目标（锥桶、行人等），写入 `alertTarget` | — |
| ③ 写入圈数配置 | 把解析结果保存为 `res/config.json` | ✅ 写入磁盘 |
| ④ 启动小车程序 | 调用 `subprocess.Popen(["nohup", "./icar"])` 启动编译好的二进制 | 直接运行 |

## 3. 第③步是关键

在 `start.py` 的 `main()` 函数里（第 184–186 行）：

```python
from speech.speech import updateConfigJson
updateConfigJson(lapConfig, totalLaps, CONFIG_PATH)
# CONFIG_PATH = "../res/config.json"
```

这一步把你通过语音 + 视觉交互确定的所有参数——圈数、每圈的功能使能开关（park/busy/fork/slow/cross/station/stop 等）、速度值、PID 系数——全部写入了 **`res/config.json`** 文件。

## 4. 为什么之后只需 `./build/icar`？

因为：

1. **`start.py` 不做任何硬件控制**，它只是一个交互式配置工具。真正的控制逻辑都在 C++ 代码中。

2. **`icar` 二进制程序每次启动时自动读取 `config.json`**。当你编译构建后生成的 `./build/icar` 就是一个独立的 C++ 可执行程序，它会从同目录下的 `../res/config.json` 读取所有运行参数。

3. **一旦配置写入磁盘就不再需要 Python**。之后的启动过程变为：
   ```
   机器上电 → C++ 主程序 icar.cpp 启动 → 读取 config.json → 开始循迹/决策/控制
   ```

## 5. 完整对比

| 方式 | 需要什么 | 做什么 |
|------|---------|--------|
| `python3 src/start.py` | Python 3 + 各种库 | 交互配置 + 最终调用下面的程序 |
| `./build/icar` | 只是二进制文件 | 读已有的 config.json，直接开跑 |

**一句话总结**：`start.py` 负责 **"设置参数"**，`./build/icar` 负责 **"按参数跑"**。第一次用 Python 把参数设好存进 `config.json` 后，后续就只需要直接启动这个已编译好的 C++ 可执行程序即可，无需再经过 Python 层。


## 6. boot 进程详解

### 6.1 start.py 中关于 boot 的逻辑

`start.py` 的 `start_car_program()` 函数（第 146–151 行）会交互式询问：

```python
boot_needed = input("\n是否需要先启动boot？(y/n): ").strip().lower()
if boot_needed == "y":
    subprocess.Popen(["./boot"], cwd=BUILD_DIR,
                     stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
    print("已启动 boot，等待 3 秒...")
    time.sleep(3)
```

输入 `y` 则启动 `boot` 后台进程并等待 3 秒后再启动 `icar`；输入 `n` 或回车则跳过。**但这不是二选一——不启动 boot 会有严重问题。**

### 6.2 boot 到底做了什么？

`boot` **不是一个一次性初始化工具**，而是一个持续运行的守护进程（死循环），核心职责：

```
boot 进程 (while(1))
├── ① Socket 服务端 → 监听网络端口，提供远程控制接口
├── ② 发送串口心跳  → uart.sendHeart()    (每 200ms 一次)
└── ③ 响应远程指令:
      ├── killAll   → 紧急杀所有 icar/collection/camera 等进程 + 小车急刹停车
      ├── keypress  → 远程启停 icar 程序
      └── exitBoot  → 退出 boot 自身，同时杀死所有运行中的子程序
```

### 6.3 不启动 boot 的后果

| 缺少功能 | 后果 |
|---------|------|
| ❌ 没有串口心跳信号 | 小车的底层控制板（UART）收不到心跳，可能判定主控系统异常 → 触发保护停机 |
| ❌ 没有 Socket 远程控制 | 无法通过网络远程紧急停车、重启程序或查看状态 |
| ❌ 没有远程启停 icar | 不能通过终端按键随时开关小车 |

### 6.4 结论

**正常使用时必须启动 boot。** `start.py` 里询问时应该每次输入 `y`。只有在调试测试且确认底层硬件不需要心跳时才跳过。

从启动链路来看：

```
python3 src/start.py
  ├─ ① 语音解析 + ② 视觉识别 → config.json
  ├─ ③ 写入配置
  ├─ [问] 是否启动 boot? → y → ./boot 守护进程启动 (心跳 + 远程控制)
  └─ ④ 启动 icar → 读 config.json → 开始循迹/决策/控制
```

boot 和 icar **是两个独立的后台进程**，需要同时运行才能让整个系统正常工作。



## Boot 进程优雅关闭方案

`boot`（`src/tool/boot.cpp`）是智能车守护进程（串口心跳 + Socket 远程控制）。它唯一的"优雅退出"路径是硬件串口下发 `exitBoot` 指令；**软件/PC 侧没有任何内置关闭机制**——没有信号处理器、没有 pidfile。

`start.py` 用 `subprocess.Popen` 启动 boot 后"发射后不管"，不保存 PID，导致无法从软件侧优雅关闭。

### 给 boot 添加信号处理器 + 启动时写 PID 文件

这是 Unix 标准做法：注册 `SIGTERM`/`SIGINT` 信号处理器，收到信号后走与 `exitBoot` 相同的清理路径（关 socket + 关串口），同时写 pidfile 方便精确定位进程。

#### 修改步骤

##### 1. 添加头文件

在 `src/tool/boot.cpp` 顶部（`#include <sys/wait.h>` 之后）添加：

```cpp
#include <csignal>
#include <fstream>
```

##### 2. 添加全局信号处理器

在 `int launchCmd(...)` 声明之前添加：

```cpp
static Server *g_server = nullptr;
static volatile sig_atomic_t g_stop = 0;

void handleSignal(int sig)
{
    // 信号处理器中只能做 async-signal-safe 操作，
    // 所以只置标志位，真正的清理放到主循环
    g_stop = sig;
}
```

##### 3. 修改 `main()` 注册信号 + 写 pidfile + 主循环响应标志位

原代码：

```cpp
int main(int argc, char const *argv[])
{
    // 套接字服务器
    Server server;

    if (!server.start()) // 启动socket监听子线程
        return -1;

    printf("Boot is running!\n");
    while (1)
    {
        if (server.startApp)
```

修改为：

```cpp
int main(int argc, char const *argv[])
{
    // 套接字服务器
    Server server;
    g_server = &server;

    // 注册信号处理器：SIGTERM(默认 kill) / SIGINT(ctrl+c)
    signal(SIGTERM, handleSignal);
    signal(SIGINT,  handleSignal);

    // 启动时写入 pidfile，便于后续精确定位进程
    std::ofstream pidf("/tmp/icar_boot.pid");
    if (pidf.is_open())
        pidf << getpid();
    pidf.close();

    if (!server.start()) // 启动socket监听子线程
        return -1;

    printf("Boot is running!\n");
    while (1)
    {
        if (g_stop) // 收到 SIGTERM/SIGINT → 优雅退出
        {
            std::system("killall -9 icar collection img2video calibration camera detection main");
            server.closeServer(); // 关闭socket通信 + 释放串口
            printf("Boot was closed by signal %d!\n", g_stop);
            break;
        }
        if (server.startApp)
```

##### 4. 退出后清理 pidfile

修改函数末尾，在 `return 0;` 之前添加：

```cpp
    printf("Boot was closed!\n");
    server.closeServer(); // 关闭socket通信

    remove("/tmp/icar_boot.pid"); // 清理 pidfile

    return 0;
}
```

#### 使用方式

优雅关闭只需一行：

```bash
# 用 pidfile 精确定位，比 pkill 安全（不会误杀同名进程）
kill -TERM "$(cat /tmp/icar_boot.pid)"
```

#### 效果

| 项目 | 修改前 | 修改后 |
|------|--------|--------|
| 串口 `/dev/ttyUSB0` | kill 后不释放，残留锁 | `closeServer()` 正常释放 |
| Socket 8899 | kill 后端口残留 | 正常关闭 |
| 定位进程 | 手动 pgrep | pidfile 精确定位 |
| 子程序(icar等) | 无人清理 | 退出前 killall 清理 |


## 重复运行 start.py 时 boot 询问的选择

### 场景

`python3 src/start.py` 之前已经执行过（boot 已在运行），现在重新运行只想**重新生成 `res/config.json`**（语音指令 → 视觉识别 → 写入配置）。

### 结论

**此时 boot 询问必须选 `no`。**

### 原因

1. **config 生成与 boot 询问完全无关**——前 3 步（语音 → 视觉 → 写入 config.json）每次都会执行，永远不受该询问影响。
2. **选 `yes` 的后果**：会启动第二个 boot 进程，它尝试重复打开 `/dev/ttyUSB0` 并 bind 8899 端口。先启动的 boot 已占住端口，第二个进程在 `bind()` 处必然失败（`EADDRINUSE`）→ `server.start()` 返回 false → 进程以 -1 静默退出。
3. **`start.py` 把 boot 的 stdout/stderr 重定向到 `/dev/null`**，所以第二个 boot 的失败报错完全看不到——你只会白启动一个注定失败的进程。
4. **不会搞坏系统**，但纯属资源浪费；且两个进程在启动瞬间短暂竞争串口，有**极小概率干扰先启动 boot 的心跳信号**。

### 判断 boot 是否在运行

```bash
pgrep -x boot   # 有输出 → boot 在运行 → 选 no
                # 无输出 → boot 没在运行 → 选 yes
```