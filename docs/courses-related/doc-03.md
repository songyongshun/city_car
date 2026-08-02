# buildtool build -p module_name
## 1. 概览

以`buildtool build -p modules/planning` 为例进行分析

与 `build -p core`（无源码的元模块）正好相反，`-p modules/planning` 是**从源码编译**：

- `modules/planning` **自身没有** `cyberfile.xml`（它的 `BUILD` 是 0 字节），它只是一个**目录树**；
- 但这棵树里包含了 **72 个带 `cyberfile.xml` 的独立子包**（planners、scenarios、tasks、traffic_rules、planning_base 等）；
- `buildtool build -p modules/planning` = **把这 72 个 planning 子包全部识别、按拓扑序用 bazel 从源码编译、并安装到 `/opt/apollo/neo`**；

## 2. 工作区结构

| 项 | 值 |
|----|----|
| `modules/planning` 自身 cyberfile | 无（`modules/planning/BUILD` 为 0 字节） |
| 子包 cyberfile.xml 数量 | **72** |
| `*.cc` 源码数量 | 391 |
| `BUILD` 文件数量 | 144 |
| 工作区全部真实源码包 | 72 个 planning 子包 + `core`（其余 `cyberfile.xml` 都在 `.cache/bazel/.../external` 的 3rd 依赖里，不算工作区源码包） |

**72 个子包按目录分布：**

| 目录 | 子包数 | 说明 |
|------|-------|------|
| `planning_base/` | 1 | 包名 `planning-base`，核心库 |
| `planning_component/` | 1 | 包名 `planning`，顶层组件，聚合其余子包 |
| `planning_interface_base/` | 1 | 包名 `planning-interface-base` |
| `planning_open_space/` | 1 | open space 规划 |
| `park_data_center/` | 1 | 停车数据 |
| `planners/` | 4 | lattice / navi / public_road / rtk |
| `pnc_map/` | 1 | lane_follow_map |
| `scenarios/` | 17 | 各场景（lane_follow、pull_over、valet_parking 等） |
| `tasks/` | 35 | 各任务（path_decider、speed_decider、open_space_* 等） |
| `traffic_rules/` | 10 | 各交通规则（crosswalk、stop_sign、traffic_light 等） |

## 3. 参数解析与目标收集（`build.py`）


`process_args()`（`build.py:140`）：
- `workspaces=[os.getcwd()]`；`self.packages=[abspath(workspace, "modules/planning")]` = `/apollo_workspace/modules/planning`，要求必须在工作区内。

`execute()` 中（`build.py:237-284`）：
1. `_search_package_in_workspace()` → 递归 `_search_cyberfile()` 扫描整个工作区，把每个含 `cyberfile.xml` 的目录加入 `targets_path`（此时包含全部 72 个 planning 子包 + core）。
2. **关键过滤**（`build.py:242-248`）：`/apollo_workspace/modules/planning` 本身**不在** `targets_path`（它不是包），于是走 `for target in targets_path: if target.startswith(package)` → **按路径前缀收集其下全部 72 个子包**进 `packages_path`。这里可以看出，如果用户指定 `-p modules/planning/tasks/lane_follow_path`，就只会收集 `lane_follow_path` 子包。
3. `construct_targets_desc()` + `PackageIdentification.identify()`：逐个解析 72 个子包的 `cyberfile.xml` 生成 `PackageDesc`（`name`、`type=module`、`src_path=//modules/planning/...`）。
4. 生成`packages` 列表 = 这 72 个子包对应的 desc。

## 4. 导入类型判定：源码覆盖二进制(`build.py:292-300`)

`PackageDesc()` 调用 `package_descriptor.py`, 在后者里: 
- `default_import_type["module"]="src"`（`:113`）、`type_match_config["module"]=["binary","src"]`（`:123`）。
- 72 个子包都是 `module`，工作区路径与各自的 `src_path` 匹配 → **全部以 `import_type="src"` 导入，走源码编译**。
- 关键点（`package_descriptor.py:155-172`）：当某包同时被声明为 `binary`（core 里 `planning-*` 都是 binary）又被选中为 src 时，会**强制切成 src**并打印 `use src code of {name} in workspace`——即**用户工作区源码优先于已安装的二进制版本**。
- 72 个子包内部的依赖（planning_component 依赖 planning-base、planning-interface-base 及各 planning-* 子包）因都在选中范围内，也按 src 提供。
- **未被选中的依赖**（cyber、common、map、common-msgs、prediction、所有 `3rd-*`、`bazel-extend-tools` 等）仍按 `binary` 处理，走 `_install_package_before_proceed` 安装已装二进制或下载 `.deb`。

> `.deb` 不会被重复下载**，只是每次联网刷新一下小的元数据索引。真正会"重新下载"的只有两种情况：该包确实没装过，或远端该版本内容与本地 hash 不一致（需要更新）。


## 5. 版本决策与拓扑排序

- `self.decider(...)`（mixology 求解器）：从 `.workspace.json` 的 repository（apollo-edu 9.1.2 / apollo-tools 9.1.1 / apollo-core 9.1.1）拉取 72 包及其 binary 依赖的 cyberfile 元数据（联网时每次刷新 `Packages`/`Cyberfiles` 本地缓存）。
- `build_order()`：对 72 个 src 包 + 它们的 binary 依赖构造依赖图并拓扑排序，保证"依赖先于使用者"被构建。
- `check_real_src()`：确认每包的 `real_src`（如 `modules/planning/planning_base`）。
- **`install_target`**（`build.py:473-474`）：`filter(type=="module" and import_type=="src")` → 即 **72 个 planning 子包**，它们就是最终要编译+安装的对象。

## 6. 逐包 bazel 编译（`BazelBuildTask.run()`）

`build.py:418` 起按拓扑序 `for target in targets` 逐包执行：
- 选中 `self.builder["bazel"]`（`BazelBuildTask`）。
- `init_workspace()`：改写 `WORKSPACE`（加载 `//dev/bazel:deps.bzl` 的 `init_deps`，并写 `/opt/apollo/neo/setup.sh`）。(这里的`//`指的是当前工作区 `/apollo_workspace`)
- `builder.run(Context(...), pkg=target)`，其内部：
  - `import_depends()` 导入子依赖；
  - `router.find_preprocess_func()`（`handler/router.py`）按包类型路由到 `module_preprocess`（这些是 module/src）：
    - 生成 WORKSPACE 依赖声明、链接各 `3rd-*` 库（`deps.bzl` 里 `new_local_repository` + `*.BUILD` 软链）；
    - 处理 proto（生成 `tools/proto/proto.bzl`）；
    - 生成该包 `dev/bazel/xxx.BUILD`；
  - 执行 `bazel build //modules/planning/...` 编译该包的 `cc_library`/`cc_binary`/`proto` 等 target；
  - `postprocess`：把编译产物拷贝到安装暂存区。

## 7. 最终安装 `final_install_procedure()`（`build.py:467-487` + `task/bazel/__init__.py`）

- 把 72 个 src 模块作为 `install_target` 传入。
- 生成 `dev/bazel/buildtool/mock/BUILD`：`mock_install`/`mock_install_src` 的 deps **引用全部 72 个 `//modules/planning/...:install` 与 `...:install_src`**（由各子包 `apollo_package()` 宏自动注入的安装目标）。
- 执行：
  ```
  bazel run <args> dev/bazel:mock_install_src -- /opt/apollo/neo [--compatible-with-src]
  bazel run <args> dev/bazel:mock_install      -- /opt/apollo/neo
  ```
  `install.bzl` 的 `install`/`install_src_files` 规则把 72 个 planning 子包的编译产物（`.so`、可执行、protobuf 生成的 `.h`/py、配置文件）拷贝到 `/opt/apollo/neo`。
- 结束 `clean_local_target()`、`set_ld_path()`，打印 `compilation done!`。

## 8. 生成的文件在什么目录

**A. 工作区 `/apollo_workspace/`（中间生成物）：**
| 路径 | 内容 |
|------|------|
| `dev/bazel/<3rd>.BUILD` | 3rd 依赖 BUILD（软链到已装包） |
| `dev/bazel/deps.bzl`、`init.bzl` | 依赖注册宏（`new_local_repository`） |
| `dev/bazel/buildtool/mock/BUILD` | 引用 72 个 planning 安装目标的 mock_install |
| `tools/package/dynamic_deps.bzl`、`tools/proto/proto.bzl` | 动态依赖 & proto 模板产物 |
| `WORKSPACE`、`.bazelrc`、`CPPLINT.cfg` | 被改写/拷贝 |
| `.cache/bazel/`、`bazel-bin/`、`bazel-out/` | bazel 编译输出（含各 planning target 产物） |

**B. 安装根目录 `/opt/apollo/neo`：**
| 路径 | 内容 |
|------|------|
| `/opt/apollo/neo/lib/modules/planning/<subpkg>/` | 编译的 `.so`（如 `planning_base/libapollo_planning_planning_base.so`） |
| `/opt/apollo/neo/bin/modules/planning/<subpkg>/` | 可执行/脚本（如 `planning_task_stats`） |
| `/opt/apollo/neo/include/modules/planning/...` | 头文件 |
| `/opt/apollo/neo/share/modules/planning/...`、`conf/` | 配置、proto py 等 |
| `/opt/apollo/neo/share/packages/planning-*/` | 每个子包的安装元数据：cyberfile.xml、meta.txt、prerm/postrm、*.BUILD |
| `/opt/apollo/neo/share/buildtool/` | namespaces 索引、installed_package 等状态 |

> 实例：`/opt/apollo/neo/share/packages/planning-base/meta.txt` 里记录了 `modules/planning/planning_base/libapollo_planning_planning_base.so` 等条目，安装路径都以 `modules/planning/...` 为前缀。

## 9. 关键文件速查

- `core/action/build.py`（参数/-p 过滤/最终安装）
- `core/action/__init__.py`（`_search_cyberfile` 包扫描、`construct_targets_desc`）
- `core/package_descriptor.py`（`import_type` 判定、src 覆盖 binary、`type_match_config`）
- `core/package_identification/identifier.py`（解析 cyberfile.xml）
- `core/task/bazel/build.py` + `handler/preprocess.py`（`module_preprocess`）+ `handler/router.py`

## 10. 增量编译机制

**`buildtool build -p modules/planning` 是增量编译**，靠「bazel 引擎增量」+「buildtool 层安装跳过」两层共同实现。

> 编译侧由 **bazel 内容哈希构建图**保证——已编译且输入未变的 planning 子包直接用 `bazel-out` 缓存产物（`.cache/bazel`），只重编改动过的 target；依赖侧由 `_check_packages_is_installed` 保证——版本匹配的二进制依赖直接跳过下载。重复执行时实际工作往往只是"检查 + 极少量重编"。

