# Debug 仿真模式使用指南

## 1. 原理
- 当 `config.debug == true` 时，视频源走本地文件而非摄像头：
  ```cpp
  capture = make_shared<cv::VideoCapture>(params->config.video);
  ```
- **不再使用** USB 摄像头 `/dev/video0`。

## 2. 配置 `res/config.json`

```json
{
    "通用配置参数": {
        "debug": true,                       // ← 必须！进入仿真模式
        "video": "../res/samples/train/%d.jpg", // ← 图片序列路径（见 §4.3）
        "saveImg": false,                    // ← 建议关，防止仿真时写入新图
        "saveIpm": false,                    // ← 建议关
        "model": "../res/models/yolov3_mobilenet_v1"
    },
    // ... 其余配置保持不变
}
```

## 3. 图片序列两种读取方式

### 方式 A：先用 `img2video` 合成 MP4（推荐，最稳定）
```bash
# 编译工具
make img2video
# 运行——会自动把 train/1.jpg,2.jpg... 合成 sample.mp4 (20FPS, 320x240)
./img2video
```
然后在 config 中保持默认值：
```json
"video": "../res/samples/sample.mp4"
```

### 方式 B：直接用 `%d.jpg` 模式读图片序列
```json
"video": "../res/samples/train/%d.jpg"
```
OpenCV VideoCapture 会按数字序号逐张读取，`CAP_PROP_FRAME_COUNT` 能正确获取总帧数。你存的图是 `1.jpg,2.jpg...`（无零填充），用 `%d.jpg` 即可；`%03d` 只用于 `001.jpg` 这种前导零命名。

## 4. 仿真交互方式
Debug 仿真是**逐帧回放 + 识别结果观察**，不是连续自动播放：

| 控件 | 操作 |
|------|------|
| Window | `ICAR`，分辨率约 640×480 |
| 子窗口 [0] Bin | 二值化结果 |
| 子窗口 [1] Track | 赛道识别线 |
| 子窗口 [2] Ctrl | 控制叠加图 |
| 子窗口 [3] Cam | 原始相机图 |
| Frame 滑条 | 拖到任意帧号回车即跳到该帧 |
| 鼠标滚轮 | 向上下一帧、向上一帧 |

每帧都完整跑一遍 pipeline（二值化 → 赛道识别 → AI 检测 → 控制输出），可实时看到各阶段中间结果。按 ESC / 关闭窗口退出程序。

## 5. 图像尺寸注意事项
- 你的训练图都是 **320×240**（`COLSCAMERA`），与 debug 窗口 `COLSIMAGE=320` 完全一致，无需额外缩放处理。
- 如需用之前保存的图片做推理训练，注意目前 `saveImg` 只存原始图，如需标注图可用 §3.4 的方案补充。

---

## 6. 环境与技术约束速查

| 项目 | 值/说明 |
|------|---------|
| 目标平台 | Linux ARM（Edgeboard），不能在 Windows 直接编译运行 |
| 编译标志 | `-mcpu=native` |
| 依赖 API | `unistd.h`, `pthread`, `pthread_setaffinity_np`（POSIX） |
| 图像分辨率 | COLSCAMERA/ROWSCAMERA = 320×240；COLSIMAGE/ROWSIMAGE = 320×240 |
| IPM 输出 | COLSIMAGEIPM/ROWSIMAGEIPM = 800×500 |
| 控制周期 | 30 FPS（主循环 1s/30） |
| 串口 | 树莓派 GPIO UART (`/dev/ttyAMA0`) |
| WiFi | 自动连接 `Tencent-a49b` |
| 日志目录 | `<项目根>/logs/run_YYYYMMDDHHMM.log` |