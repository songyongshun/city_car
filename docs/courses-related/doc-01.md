# 给项目添加运行日志功能

可以方便提供给AI模型进行分析。

## 1. 新增文件
- **`include/utils/logger.hpp`** — `RunLogger` 单例类

## 2. 核心实现（fd（File Descriptor） 级 tee 方案）

- 使用了unistd.h 的 `pipe()` + `dup2()` + `setvbuf()` + 后台线程 pump() + 文件追加写入的组合方案。

| 步骤 | 说明 |
|------|------|
| ① 创建管道 | `pipe()` 打开两对 fd（stdout/stderr 各一对）：每对 `pf[0]`(读)、`pf[1]`(写) |
| ② dup2 重定向 | `dup2(pfOut[1], STDOUT_FILENO)` / `dup2(pfErr[1], STDERR_FILENO)` — stdout/stderr 分别重定向到两条管道的写端 |
| ③ 取消缓冲 | `setvbuf(stdout, nullptr, _IONBF, 0)`、`setvbuf(stderr, nullptr, _IONBF, 0)` — 确保立即 flush，日志无延迟 |
| ④ 后台线程 pump() | 各一条转发线程从管道读端循环读取原始字节（buf 最大 4KB），同时写两份 |
| ⑤ 双路写出 | ① 写回原始屏幕 fd（屏幕输出不变）；② 追加写入日志文件（原样字节，不做转换） |

**关键代码片段：**
```cpp
class RunLogger {
public:
    static bool start(const std::string &prefix = "run"); // 一次性启动
    static void stop();                                    // 程序退出时清理并恢复 stdout/stderr
    static std::string logPath();                          // 当前日志文件完整路径

private:
    static std::string resolveLogDir();                    // 定位日志目录：项目根下 logs/
    static void pump(int readFd, int outFd, int logFd);    // 转发线程：读管道并双写
};
```

## 3. 集成方式（`src/icar.cpp` → `main()`）

```cpp
// === 日志系统初始化 ===
RunLogger::start("run");  // 在 main() 入口第一行，stdout/stderr 同时输出到屏幕与日志
```

## 4. 日志文件格式与命名规则
- 文件名：`run_YYYYMMDDHHMM.log`（如 `run_202608071530.log`）
- 存储位置：项目根目录下 `logs/run_XXXXXX.log`（与 `src`、`build` 平级；目录不存在时自动创建，解析失败则回退到程序工作目录）
- 内容：完整的 **stdout + stderr 输出**（包括 `printf`、`cout`、异常堆栈等一切标准流）

## 5. Linux 下编译验证
```bash
cd build && make -j4  # 日志自动写入 <项目根>/logs/
```