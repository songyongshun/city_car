# dreamview ++
可以通过`aem bootstrap start --plus`启动Dreamview++，然后在浏览器中访问`http://localhost:8888`即可。


# `aem bootstrap start --plus` 分析

## 1. 一句话结论

`aem bootstrap start --plus` = **启动 Dreamview+（新版前端后台，端口 8888）和 monitor（模块监控）两个 cyber 模块**，并等待 5 秒后用 HTTP 探测确认 Dreamview+ 是否就绪。

`--plus` 的含义：**启动的是"Dreamview+"新版本，而非旧版 Dreamview**（旧版 `dreamview bootstrap start` 启动的是 dreamview，端口 8899）。两者都会同时启动 monitor。


## 2. 命令分派链路

```
aem bootstrap start --plus
  └─ run.sh (aem)                 # /opt/apollo/aem/run.sh，解析子命令
        cmd="bootstrap" → exec "aem-bootstrap" "start" "--plus"
  └─ aem-bootstrap                # /opt/apollo/aem/aem-bootstrap
        parse_arguments start → start "--plus"
  └─ start() : --plus 分支
        buildtool bootstrap start dreamview_plus   # ① 启动 Dreamview+
        buildtool bootstrap start monitor          # ② 启动 monitor
        sleep 5
        curl -I http://localhost:8888   # ③ 探测是否 200
```

## 3. `buildtool bootstrap start <module>` 具体做什么

`buildtool` 的 `bootstrap` action（`core/action/bootstrap.py`）把 `start <module>` 交给 `run_module(module)`（`core/boot.py:31`）。对 `dreamview_plus`：

```
run_module('dreamview_plus')
  1. setup_device_for_amd64()      # core/boot.py:121 —— 准备 CAN 设备
       遍历 /dev/can0..can7，若不存在尝试把 /dev/zynq_canN 软链为 /dev/canN
  2. 定位 cyber_launch              # /opt/apollo/neo/bin/cyber_launch
     找不到则报 "Could not find cyber_launch. Is cyber already installed?"
  3. 构造 launch 文件路径
     module_launch = /apollo/modules/dreamview_plus/launch/dreamview_plus.launch
     （实际是软链 → /opt/apollo/neo/share/modules/dreamview_plus/launch/dreamview_plus.launch）
     不存在则报 "Could not find ... Is it already built?"
  4. 后台执行
     cyber_launch start <launch> > <apollo_root>/data/log/dreamview_plus.log 2>&1 &
```

对 `monitor` 同理，launch = `/apollo/modules/monitor/launch/monitor.launch`，日志 `monitor.log`。

**前提**：`dreamview_plus` / `monitor` 包必须已经"安装"到 `/apollo/modules/`

## 4. launch 文件内容（实际启动的进程）

**`dreamview_plus.launch`**（`/apollo/neo/share/modules/dreamview_plus/launch/dreamview_plus.launch`）：
```xml
<cyber>
    <module>
        <name>dreamview_plus</name>
        <dag_conf></dag_conf>
        <type>binary</type>
        <process_name>
            dreamview_plus --flagfile=/apollo/modules/dreamview_plus/conf/dreamview.conf
        </process_name>
        <exception_handler>respawn</exception_handler>
    </module>
</cyber>
```
即实际拉起 `dreamview_plus` 可执行文件，参数来自 `/apollo/modules/dreamview_plus/conf/dreamview.conf`，且 `exception_handler=respawn`（崩溃自动重启）。

`dreamview.conf` 的关键参数（实测）：
```
--flagfile=/apollo/modules/common/data/global_flagfile.txt
--static_file_dir=/apollo/modules/dreamview_plus/frontend/dist   # 前端静态资源
--server_ports=8888                                               # 监听端口（即 --plus 探测的 8888）
--default_hmi_mode=Default
```

**`monitor.launch`**：
```xml
<cyber>
    <module>
        <name>monitor</name>
        <dag_conf>/apollo/modules/monitor/dag/monitor.dag</dag_conf>
        <process_name>monitor</process_name>
    </module>
</cyber>
```
即启动 `monitor` 进程，加载 `monitor.dag`（模块运行状态监控/软看门狗）。

## 5. 相关文件速查

| 文件 | 作用 |
|------|------|
| `/opt/apollo/aem/run.sh` | aem 入口，按子命令 exec `aem-<cmd>` |
| `/opt/apollo/aem/aem-bootstrap` | bootstrap 子命令：start/stop/restart，`--plus` 分支在此 |
| `/opt/apollo/aem/aem-start` | `start` = `aem create`（创建环境，非 bootstrap） |
| `buildtool/core/action/bootstrap.py` | buildtool bootstrap action，`start` → `run_module` |
| `buildtool/core/boot.py` | `run_module`/`stop_module`/`setup_device_for_amd64` 真正执行启动 |
| `/opt/apollo/neo/bin/cyber_launch` | cyber 启动器，实际拉起 launch 里的进程 |
| `/apollo/modules/dreamview_plus/launch/dreamview_plus.launch` | 定义 dreamview_plus 进程（软链到 neo/share）|
| `/apollo/modules/monitor/launch/monitor.launch` | 定义 monitor 进程 |
| `/apollo/modules/dreamview_plus/conf/dreamview.conf` | 端口 8888、前端目录等配置 |
| `/opt/apollo/neo/data/log/` | 各模块与 cyber 日志（dreamview_plus.INFO / monitor.INFO 等） |

> 注意：`aem-start` 与 `aem bootstrap start` 是**不同子命令**。`aem start`（别名 create）创建环境；`aem bootstrap start` 才启动 Dreamview 系列服务。


## 6. 补充：`aem bootstrap start planning` / `planning_component` 能启动 planning 吗？

**结论：都不能。** 直接运行 `aem bootstrap start planning` 或 `aem bootstrap start planning_component` 都会失败，因为它们找不到 boot.py 拼出来的 launch 路径。

### 1) 底层原因

`boot.py` 的 `run_module` 是为"顶层模块 = `modules/<模块>/launch/<模块>.launch`"的**简单单 launch 结构**设计的（dreamview、monitor、dreamview_plus 都满足，所以能跑通）。而 **planning 是多子包的目录树**，launch 归在子包 `planning_component` 下且文件名与子包名不同，自动路径拼接无法命中。

### 2) 正确启动方式

绕开 boot.py 的路径拼接，**直接把 launch 文件喂给 `cyber_launch`**：
```bash
# 启动
cyber_launch start /apollo/modules/planning/planning_component/launch/planning.launch
# 停止
cyber_launch stop  /apollo/modules/planning/planning_component/launch/planning.launch
```
`planning.launch`（软链 → `/apollo_workspace/profiles/current/modules/planning/planning_component/launch/planning.launch`）内容会拉起两个 dag（`external_command_process.dag`、`planning.dag`）和 `planning` 进程：
```xml
<cyber>
    <module>
        <name>planning</name>
        <dag_conf>/apollo/modules/external_command/process_component/dag/external_command_process.dag</dag_conf>
        <dag_conf>/apollo/modules/planning/planning_component/dag/planning.dag</dag_conf>
        <process_name>planning</process_name>
    </module>
</cyber>
```

### 3) 判断某模块能否用 `aem bootstrap start` 的快速方法

检查是否存在顶层路径 `/apollo/modules/<模块>/launch/<模块>.launch`。存在 → 可以（如 dreamview_plus）；不存在 → 不行，需用 `cyber_launch start <实际 launch 路径>`。
