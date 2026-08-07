# 给项目添加运行日志功能

可以方便提供给AI模型进行分析。

## 1. 新增文件
- **`include/utils/logger.hpp`** — `RunLogger` 单例类

## 2. 核心实现（fd（File Descriptor） 级 tee 方案）

- 使用了unistd.h 的 `pipe()` + `dup2()` + `setvbuf()` + 后台线程 pump() + 文件追加写入的组合方案。

| 步骤 | 说明 |
|------|------|
| ① 创建管道 | `pipe()` 打开一对 fd：`pf[0]`(读)、`pf[1]`(写) |
| ② dup2 重定向 | `dup2(pf[1], STDIN_FILENO)` / `dup2(pf[1], STDOUT_FILENO)` — stdin/stdout 同时重定向到管道 |
| ③ 取消缓冲 | `setvbuf(stdin/_IONBF)`、`setvbuf(stdout, NULL, _IONBF, 0)` — 确保立即 flush，日志无延迟 |
| ④ 后台线程 pump() | 从管道读端循环读取原始字节（buf 最大 4KB），调用 `tee_write()` 同时写两份 |
| ⑤ tee_write() | ① 写回原始 fd（屏幕输出不变）；② 追加日志文件（`\n` → `\r\n` 换行适配终端） |

**关键代码片段：**
```cpp
class RunLogger {
public:
    static bool start(const char* filename = "run");   // 一次性启动
    static void stop();                                  // 程序退出时清理

private:
    bool read_pipe();                                    // 从管道读取一次
    bool append_line(std::string& line);                // 追加到日志文件
};
```

## 3. 集成方式（`src/icar.cpp` → `main()`）

```cpp
// === 日志系统初始化 ===
bool log_ok = RunLogger::start("run");  // 在 main() 入口第一行
if (log_ok)
    printf("\n=== Logging started ===\n");
```

## 4. 日志文件格式与命名规则
- 文件名：`run_YYYYMMDDHHMM.log`（如 `run_202608071530.log`）
- 存储位置：程序工作目录下 `res/logs/run_XXXXXX.log`
- 内容：完整的 **stdout + stderr 输出**（包括 `printf`、`cout`、异常堆栈等一切标准流）

## 5. Linux 下编译验证
```bash
cd build && make -j4  # 日志自动写入 res/logs/
```