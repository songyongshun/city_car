# saveImg 与 saveIpm 参数

## 1. saveImg — 保存【原始彩色图】

**触发逻辑（icar.hpp 主循环 ~L497-L500）：**
```cpp
if (params->config.saveImg && !params->config.debug)
    savePicture(img);                    // 保存原始图 img → ../res/samples/train/N.jpg
else if (params->config.saveImg && params->config.debug)
    show->save = true;                   // 让 Show 每帧存标注后的综合窗口图
```

- `savePicture(img)`（`tools.hpp:97`）→ 直接 `imwrite("../res/samples/train/<N>.jpg", image)`
- **保存的是未经任何处理的原相机 RGB 图**，没有任何识别框或标注线。
- 用途：采集训练样本 / 记录原始画面。

## 2. saveIpm — 保存【鸟瞰 IPM 逆透视变换图】

**触发逻辑（icar.hpp 主循环 ~L522-L527）：**
```cpp
if (params->config.saveIpm && params->config.saveImg) {
    cv::Mat imgIpm;
    ipm.homography(imgTrack, imgIpm);    // 赛道线 + IPM 逆透视变换
    savePicture(imgIpm);                 // → ../res/samples/train/<N>.jpg
}
```
注意整段包在 `if (params->config.debug)` 块内。

- 变换对象是 `imgTrack`，之前已由 `track->drawImage(imgTrack)` 画上了**赛道识别线**。
- 所以保存的图带有赛道线，但**不带 AI 检测框**（锥桶/行人）。
- 图像类型是**鸟瞰俯视图**（非车头正前方视角）。
- **前提条件苛刻**：必须 `debug=true` + `saveImg=true` + `saveIpm=true` 三者同时成立。

## 3. 对比总结

| 开关 | 保存内容 | 带识别信息? | 视角 | 前提条件 |
|------|---------|-------------|------|---------|
| `saveImg` | 原相机图 | ❌ 无任何 | 正前方 | 只需 true |
| `saveIpm` | IPM 鸟瞰图 | ✅ 仅赛道线 | 俯视 | debug+saveImg+saveIpm |

## 4. 如果想保存「正前方 + 完整标注」的图

目前两套开关都无法做到（`detection->drawBox(img)` 的结果只进调试窗口 Ctrl，从未被保存）。

**解决方案**：在 `debug` 分支里 `detection->drawBox(...); center->drawImage(...); motion->drawImage(...)` 之后加一行：
```cpp
if (params->config.debug && params->config.saveImg)
    savePicture(img);  // 保存带全部标注的正前方图
```