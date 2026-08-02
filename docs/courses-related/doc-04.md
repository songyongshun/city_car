# bazel介绍

前面几篇讲了 Apollo 的 `aem enter`（进入开发容器）和 `buildtool build`（上层构建工具），而 `buildtool` 之所以能完成「从源码编译 + 安装」，底层真正执行编译动作的是 **Bazel**。本篇从零介绍 Bazel 是什么、核心概念，以及 Apollo 中最常用的基本用法。

## 1. 什么是 Bazel

- **Bazel** 是 Google 开源的构建工具（1999 年由内部工具 Blaze 演变而来），擅长构建**大型多语言、多仓库**项目，支持 C++、Java、Python、Go、proto 等。
- 核心口号：**只有真正变化的部分才会被重新构建**（增量构建），因此非常适合 Android、Chrome、Apollo 这类体量巨大的代码库。
- 关键能力：
  - **内容寻址 / 内容哈希**：依赖输入文件的哈希而非时间戳判断是否要重编；
  - **沙箱执行**：每个 target 在隔离沙箱中构建，保证可复现；
  - **远程缓存 / 分布式构建**：跨机器共享编译产物；
  - **可扩展（Starlark）**：通过 `.bzl` 文件自定义宏与规则（Apollo 的 `apollo_package()` 就是宏）。
- 在 Apollo 中，`buildtool` 是外层封装，它最终调用的是 `bazel build / bazel run`。

## 2. 核心概念

### 2.1 工作区（Workspace）
- 一个由 `WORKSPACE`文件标记的目录，是 Bazel 构建的根。
- Apollo 中工作区即 `/apollo_workspace`，`WORKSPACE` 会被 `buildtool` 改写，加载 `//dev/bazel:deps.bzl` 的 `init_deps`。

### 2.2 包（Package）
- 包含 `BUILD`（或 `BUILD.bazel`）文件的目录即一个包。
- 例如 `modules/planning/planning_base/BUILD` 定义了 `planning_base` 这个包。

### 2.3 目标（Target）
- 包内的构建单元，写在 `BUILD` 文件里。
- 常用规则：
  - `cc_library`：C++ 库
  - `cc_binary`：C++ 可执行文件
  - `cc_test`：C++ 测试
  - `proto_library` + `cc_proto_library`：protobuf
  - `py_binary` / `py_library`：Python
- 例：
  ```cpp
  // BUILD
  cc_binary(
    name = "hello_world",
    srcs = ["main.cc", "hello.cc"],
    hdrs = ["hello.h"],
    deps = ["//common:util"],
  )

  // main.cc
  #include "hello.h"

  int main() {
    say_hello();
    return 0;
  }

  // hello.h
  #pragma once
  void say_hello();

  // hello.cc
  #include <iostream>
  #include "hello.h"

  void say_hello() { std::cout << "Hello, Bazel C++ example\n"; }
  ```

- 上面的 `cc_binary` 等规则**不是 BUILD 自带的关键字**，而是由 Starlark 定义的符号，必须先用 `load` 语句从对应的 `.bzl` 文件导入才能使用，否则会报 `name 'cc_binary' is not defined`。例如真正的 `hello_world` BUILD 开头会有：
  ```python
  # BUILD
  load("@rules_cc//cc:defs.bzl", "cc_binary", "cc_library", "cc_test")
  load("//tools:apollo_package.bzl", "apollo_package")

  cc_binary(
    name = "hello_world",
    srcs = ["main.cc", "hello.cc"],
    hdrs = ["hello.h"],
    deps = ["//common:util"],
  )
  ```
- `load` 语法：`load("标签:文件", "符号1", "符号2", ...)`，即从某个 `.bzl` 文件里导入一个或多个符号（规则、宏、函数）。
- 常见的 `load` 来源：
  - **内置 / 规则集（@rules_xx / @bazel_tools）**：`@rules_cc//cc:defs.bzl`、`@rules_proto//proto:defs.bzl` 等，提供 `cc_library` / `proto_library` 这类通用规则；
  - **仓库内 `.bzl`（//tools、//dev 等）**：如 Apollo 的 `//tools:apollo_package.bzl`，提供 `apollo_package()` 这类项目自定义宏；
  - **第三方依赖（`@<pkg>//...`）**：由 `WORKSPACE` 中 `new_local_repository` 引入的 `3rd-*` 包提供的 `.bzl`。
- 在 Apollo 中，`bazel-extend-tools` 会对 `BUILD` 里的 `load` 做统一重写/补全（`tools/bazel_extend`），所以实际文件里的 `load` 往往比手写的更多、更全。

### 2.4 依赖（deps）
- target 之间通过 `deps` 显式声明依赖，Bazel 据此构建出**有向无环图（DAG）**并做拓扑排序，保证「依赖先于使用者」被构建。
- 这正是 doc-02 / doc-03 中 `buildtool` 反复提到的拓扑排序的底层来源。

## 3. 安装与常用命令

### 3.1 安装
Bazel 通过发行脚本或包管理器（apt/brew）安装，Apollo 容器内已预装，`bazel version` 可查看版本。

### 3.2 基础命令

| 命令 | 作用 |
|------|------|
| `bazel build //path:target` | 构建某个 target |
| `bazel build //modules/planning/...` | 构建某目录下所有 target（`...` 通配） |
| `bazel build //...` | 构建整个工作区 |
| `bazel run //path:target` | 构建并运行（`bazel run dev/bazel:mock_install` 即安装动作） |
| `bazel test //...` | 构建并运行所有测试 |
| `bazel query 'deps(//core:all)'` | 查询依赖关系 |
| `bazel clean` | 清理缓存（`bazel clean --expunge` 彻底清） |
| `bazel info output_base` | 查看输出目录位置 |

### 3.3 常用选项
- `-c dbg / -c opt`：选择编译模式（debug / release）。
- `--cpu` / `--gpu`：指定在 CPU / GPU 环境下构建。
- `--jobs n`（`-j`）：并行任务数。
- `--config=...`：读取 `.bazelrc` 中的预设配置。
- `--announce_rc`：显示实际加载的配置文件。

> `buildtool` 正是把这些 `-c`、`--cpu/--gpu`、`-j`、`-m` 等「known_options」透传给底层 `bazel build` 的（见 doc-02 第 2 节 b）。

## 4. `BUILD` 文件与 `WORKSPACE` 的配合

- **`WORKSPACE`**：声明第三方依赖与本地仓库，Apollo 中 buildtool 会加载 `dev/bazel/deps.bzl`，用 `new_local_repository` 把每个已安装的 `3rd-*` 包软链进来，并生成对应的 `dev/bazel/<pkg>.BUILD`。
- **`BUILD`**：描述每个包内有哪些 target 及其依赖。
- **`.bazelrc`**：全局/局部默认构建参数；buildtool 会把 `bazel/.bazelrc` 拷到工作区。
- **`.bzl`（Starlark）**：宏与规则实现文件。Apollo 的 `apollo_package()` 宏（定义在 `tools/` 下）会自动注入 `install` / `install_src` 等安装目标，doc-03 中 `mock_install` 引用的 72 个 `//modules/planning/...:install` 就是这么来的。

## 5. Apollo 中的 Bazel 使用小结

| 场景 | 命令 |
|------|------|
| 构建整个 planning 目录 | `bazel build //modules/planning/...` |
| 构建单个包 | `bazel build //modules/planning/planning_base:planning_base` |
| 构建并跑测试 | `bazel test //modules/planning/planning_base/...` |
| 安装（由 buildtool 封装） | `bazel run dev/bazel:mock_install -- /opt/apollo/neo` |
| 查看依赖树 | `bazel query 'deps(//core:all)'` |

> **推荐日常路径**：不必直接敲 bazel，而是使用 `buildtool build -p <包>` —— 它帮你完成「元数据解析 → 版本决策 → 拓扑排序 → 依赖安装 → bazel 编译 → 安装到 /opt/apollo/neo」的完整链路，bazel 只是其中的编译引擎。
