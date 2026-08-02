# buildtool build -p core

## 概览

`buildtool` 是 Apollo 的工具链二进制，

`-p core` 是指定要构建的**包路径**为工作区下的 `core` 目录。`core` 是一个**元模块（meta module）**：它自己的 `core/cyberfile.xml` 声明了约 100 个二进制依赖（canbus、planning、control 等），自身 `BUILD` 里只有一个 `apollo_package()` 宏。所以这条命令的核心工作 = **按拓扑序解析并安装 `core` 的全部二进制依赖、生成 bazel 的安装目标、最后用 bazel 编译并把产物安装到 Apollo 根目录**。

## 1. 命令入口与参数解析

- `/usr/bin/buildtool` 是指向软链：`/opt/apollo/neo/packages/buildtool/9.0.0-rc1-r19/bin/mainboard.py`
- `mainboard.py` 中 `PackageBuilder`：
  - `command = sys.argv[1]` → `build`
  - 通过 `EntryPoints`（`core/entry_point.py`）动态加载 `core/action/` 目录下所有 action 模块 (路径在`/opt/apollo/neo/packages/buildtool/9.0.0-rc1-r19/core`)
  - 只有与用户输入 command 匹配的 action 会被实例化：`build.py` 的 `Action`
- `build.py` 的 `add_argument()` 注册了 `-p/--packages`（`nargs='*'`）、`--gpu/--cpu/--dbg/--opt`、`-j/--jobs`、`-m/--memories` 等参数
- `PackageBuilder.main()` 先做环境检查：`check_esdcan_use` → `check_gpu_existence` → `check_in_docker_env` → `check_architecture_support` → `check_platfrom_support` → `check_minimal_memory_requirement`，然后执行 action

## 2. `build.Action.execute()`（`build.py:208`）

`execute()` 是主逻辑，核心步骤：

### a) 处理参数 `process_args()`
- `workspaces = [os.getcwd()]`，即 `/apollo_workspace`
- `-p core` 解析为绝对路径 `os.path.abspath(join(workspace, "core"))` = `/apollo_workspace/core`，要求必须位于工作区之内
- 计算 `known_options`：可添加 `--dbg`、`--opt`、`--cpu`、`--gpu`、`-j 8`、`-m 16G` 等 bazel 构建参数，默认, `-j -1`（自动检测 CPU 核数）和 `-m 0.75`（占用 75% 内存）

### b) 扫描工作区包 `_search_package_in_workspace()`（`action/__init__.py:163`）
- 递归查找工作区内所有含 `cyberfile.xml` 的包，生成 `self.targets_path`
- 由于给了 `-p core`，会把 `targets_path` 里前缀匹配 `/apollo_workspace/core` 的加入 `packages_path`

### c) 构造目标 `construct_targets_desc()`（`__init__.py:359`）
- 对每个本地模块包通过 `PackageIdentification.identify()` 解析 `cyberfile.xml` 生成 `PackageDesc`
- `core` 解析结果：`name=core, type=module, builder=bazel, src_path=//core`

### d) 版本决策 `self.decider(decided_targets)`(`version_decide/decider.py`)
- 从 `.workspace.json`（这里是 apollo-edu 9.1.2 / apollo-tools 9.1.1 / apollo-core 9.1.1）获取 repository
- 递归拉取 `core` 每个二进制依赖的 cyberfile 元数据（`metadata_cli.acquire_cyberfile`），做版本解析，填充 `cyberfile_source`（各包名的候选版本 desc 池）

> - **源头**：`MetaDataCli._init_metadata()`（`version_decide/cyberfile/__init__.py`）用 `RequestBase.get()` 从 `meta_api = https://apollo.baidu.com/packages/api/depo`下载整份 package index（`Packages`）与全部 cyberfile（`Cyberfiles`）。
> - **落地缓存**：下载后写入本地 `/opt/apollo/neo/share/buildtool/namespaces/<repo>/Packages` 与 `Cyberfiles`（`offline_metadata_prefix` 配置）。
> - **是否每次重新下载——是！** 只要在线（`online=True`）。
> - **例外（不重新下载）**：仅当 `online=False`（网络探测失败）或 `request.get()` 超时（`timeout_offline=True`）时走本地缓存分支，不联网。
> - **真正取数**：`acquire_cyberfile(name)`（`__init__.py:306`）解析**本地 `Cyberfiles` 文件，不发网络请求**。
> - **何时联网**：仅当构建开始时 `get_network_status()` 判定在线、`_init_metadata()` 刷新索引并重写缓存；或本地缓存缺失（离线+无缓存则直接报错，提示需联网初始化）。
> - **注意**：此处拿到的只是元数据（包名/版本/依赖），不含二进制包体；`.deb` 的实际下载与安装发生在后续 bazel 编译/安装阶段的 `_install_package_before_proceed`，不属本环节。

### e) 拓扑排序 `build_order()`（`topological_order.py`）
- `topological_sort()` 用最小堆 + 依赖计数实现 Kahn 算法，返回依赖先于使用者的构建顺序；检测到循环依赖会报错
- 拿到每一个node 的 `return_all_childs()`（后续传给 bazel 导入依赖用）

### f) 准备构建环境
- `_setup_rc_files()`：把 buildtool 包内 `bazel/.bazelrc`、`bazel/CPPLINT.cfg` 拷贝到工作区
- `_check_status_before_build()`：检查每个包状态均为 `VALID`

## 3. 真正的构建：`BazelBuildTask.run()`（`core/task/bazel/build.py`）

按拓扑序遍历每个 target，对每个包：
- 根据 `target.builder` 从 `self.builder` 选 bazel 构建器
- `Procedure.init_workspace()`：改写工作区 `WORKSPACE` 与生成 `dev/bazel/deps.bzl`（所有准备用`bazel`进行`build`的包的`BUILD`文件都在`dev/bazel`目录下）
- 调用 `builder.run(Context(...), pkg=target)`, 指向`BazelBuildTask.run()`

>   - 调用链：`BazelBuildTask.run()` → `router.find_preprocess_func()` → 按 `pkg_desc.type` 路由到 preprocess 函数（`task/bazel/handler/router.py`）。
>   - 各调用点（均在 `preprocess.py`）其内部：`_check_packages_is_installed()` 判定 installed（直接跳过）/ reinstall / not_installed；system 走 `apt install`，apollo 包走 `_request_apollo_package_in_playgroud()` + `_install_apollo_package_in_playgroud()`（下载 `.deb` 到 playground 并安装）；全程要求联网.

## 4. 最终安装：`final_install_procedure()`（`build.py:95` + `task/bazel/__init__.py`）

- 实际执行两条命令（`build.py:191-215`）：
  ```
  bazel run <args> dev/bazel:mock_install_src -- <apollo_root> [--compatible-with-src]
  bazel run <args> dev/bazel:mock_install      -- <apollo_root>
  ```
  `bazel run` 把编译产物拷贝安装到 `/opt/apollo/neo`（`apollo_root`）

- 结束后 `clean_local_target()` 清理，打印 `compilation done!`


## 关于 `core` 的特殊性

- `core` 是 **module 类型**，但**没有实际的源码 target**，它的 `BUILD` 只有 `apollo_package()` 宏，`cyberfile.xml` 里全是 `<depend type="binary">`（canbus、control、planning、prediction、localization、routing、map、dreamview 等）。
- 因此 `buildtool build -p core` 的实际效果：**以 core 为聚合入口，把它的整棵二进制/源码依赖树解析、安装到位，并生成以 `//core:install` 为汇聚点的 bazel 安装目标**。真正的编译量取决于这些依赖中哪些以源码（src）形式存在于工作区、哪些用已装好的二进制。

> ### 关键文件速查（均在 buildtool 包内 `9.0.0-rc1-r19/`）：
> - `bin/mainboard.py`（入口）
> - `core/entry_point.py`（action 分发）
> - `core/action/build.py`（主流程）
> - `core/action/__init__.py`（包扫描/rc 文件/目标构造）
> - `core/topological_order.py`（拓扑排序）
> - `core/version_decide/decider.py`（版本解析）
> - `core/task/bazel/build.py` + `handler/preprocess.py` + `handler/router.py`（bazel 构建）
> - 工作区：`core/cyberfile.xml`、`core/BUILD`、`WORKSPACE`、`.buildtool.conf`、`.workspace.json`


`build -p core` 基本不编译任何业务代码，主要做解析、版本决策、安装二进制依赖、生成 bazel 接入层，最后空壳安装一次。

**它实际做的事（几乎都不是编译）：**
1. **元数据解析与版本决策**：读 `core/cyberfile.xml`，联网刷新/解析 55 个二进制依赖的版本，构造依赖图并拓扑排序。
2. **安装二进制依赖（主要工作量）**：对 55 个依赖逐个 `_install_package_before_proceed`——已装且版本正确则仅检查跳过；否则下载 `.deb` 到 playground 并解包安装到 `/opt/apollo/neo/packages/<pkg>/`。这些 planning / control / canbus 等都是**仓库预编译好的二进制，并非现场编译**。
3. **生成 bazel 接入层**：`dev/bazel/*.BUILD`（软链到已装包）、`deps.bzl`、改写 `WORKSPACE`、渲染 `dynamic_deps.bzl` 等。
4. **最终安装**：生成 `mock_install`（deps=`//core:install`），执行 `bazel run dev/bazel:mock_install -- /opt/apollo/neo`——会启动 bazel 工具链，但因为 core 无业务源码，实际只是通过 `install` 规则做安装动作。


## 补充：EntryPoints 如何动态加载 action 模块

`buildtool` 支持很多子命令：`build`、`clean`、`install`、`test`、`map`、`profile`、`upgrade`…… 每个子命令在源码里对应 `core/action/` 目录下的一个 `.py` 文件（`build.py`、`clean.py`、`install.py`…）。这种"子命令 = 目录下的一个模块"的设计，让工具可以**通过扫描目录自动发现并注册命令**，而不需要在代码里硬编码 `if command == 'build'` 这样的分支。


## 生成的文件在什么目录

**A. 工作区 `/apollo_workspace/` 下的中间生成物：**

| 路径 | 内容 |
|------|------|
| `dev/bazel/<pkg>.BUILD` | 每个依赖的 BUILD（软链到已装包） |
| `dev/bazel/deps.bzl` | 依赖注册宏 |
| `dev/bazel/buildtool/mock/BUILD` | mock_install / mock_install_src 安装目标 |
| `tools/package/dynamic_deps.bzl` | 动态依赖列表 |
| `tools/proto/proto.bzl` | protobuf 模板替换产物 |
| `WORKSPACE`、`.bazelrc`、`CPPLINT.cfg` | 被改写/拷贝 |
| `.cache/bazel/...`（软链 `bazel-bin`、`bazel-out`） | bazel 编译输出 |

**B. 安装目录 `/opt/apollo/neo`（`module.conf` 的 `apollo_root=/opt/apollo/neo`）：**

| 路径 | 内容 |
|------|------|
| `/opt/apollo/neo/packages/<pkg>/latest/` | 下载安装的 `.deb` 解包内容（`apollo_package_path`） |
| `/opt/apollo/neo/lib/<pkg>`、`include/<pkg>`、`bin/<pkg>` | 安装的库/头文件/可执行 |
| `/opt/apollo/neo/share/packages/<pkg>/` | 包安装元数据：cyberfile.xml、prerm/postrm、meta.txt、`*.BUILD`（`package_meta_prefix`）——**core 的元数据也在这** |
| `/opt/apollo/neo/share/buildtool/` | 索引与状态：`namespaces/`、`installed_package`、`targets/`、`results/`、`cyberfile_source/` |


## 补充：binary 依赖 = 安装预编译产物 vs src 依赖 = 现场编译

以 `build -p core` 与 `dreamview_plus` 为例，说明「binary 依赖」与「src 依赖」对 `.so` 产物的本质区别。

### 结论

`build -p core` **不会现场编译** `/opt/apollo/neo/lib/modules/dreamview_plus/backend/libapollo_dreamview_plus_backend.so`——它只是把 `dreamview-plus` **预编译二进制包**里现成的 .so 安装到该目录（或已装则跳过）。它来自仓库预编译产物，不是 core 构建用 C++ 源码编出来的。

### 证据

1. **core 将其声明为 binary 依赖**（`core/cyberfile.xml:32-33`）：
   ```xml
   <depend repo_name="dreamview" type="binary">dreamview</depend>
   <depend repo_name="dreamview-plus" type="binary">dreamview-plus</depend>
   ```
   `type="binary"` → 走"下载/使用预编译二进制"，不走源码编译。

2. **该 .so 属于已安装包 `dreamview-plus` 的清单**（`/opt/apollo/neo/share/packages/dreamview-plus/meta.txt`）：
   ```
   modules/dreamview_plus/backend/libapollo_dreamview_plus_backend.so:lib/modules/dreamview_plus/backend/libapollo_dreamview_plus_backend.so
   ```


### 什么情况下这个 .so 才是"现场编译"？

只有在 `build -p modules/dreamview_plus`（且工作区存在 dreamview_plus 源码、`import_type="src"`）时，bazel 才会用源码现场编译 `libapollo_dreamview_plus_backend.so` 并覆盖安装。
