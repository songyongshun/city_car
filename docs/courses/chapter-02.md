# 智能汽车图像感知实验指导

## 目录

- [1. 实验描述](#_1-实验描述)
- [2. 实验目标](#_2-实验目标)
- [3. 实验步骤](#_3-实验步骤)
  - [步骤 1：将智能汽车与 PC 电脑相连接](#步骤-1-将智能汽车与-pc-电脑相连接)
  - [步骤 2：打开 Visual Studio Code 学习源码逻辑](#步骤-2-打开-visual-studio-code-学习源码逻辑)
  - [步骤 3：新建文件夹，用于存储采集的图像](#步骤-3-新建文件夹-用于存储采集的图像)
  - [步骤 4：端正摄像头——代码解读](#步骤-4-端正摄像头——代码解读)
  - [步骤 5：运行代码文件，查看实验结果](#步骤-5-运行代码文件-查看实验结果)
  - [步骤 6：补全代码，尝试实车运行，观察可视化运行结果](#步骤-6-补全代码-尝试实车运行-观察可视化运行结果)


## 1. 实验描述

通过智能汽车车辆架构与控制模块的内容学习，我们了解了智能汽车主要应用高清摄像头进行赛道环境感知，主要通过高清摄像头采集赛道图像进行后续的图像处理与识别；还熟悉了智能汽车的运动执行部件，了解了电机、舵机等工作原理及作用，并学习了智能汽车的 edgeboard 板卡是如何与运动控制等系统进行通信交互的。

那么，接下来我们将围绕摄像头与智能汽车成像的相关知识，进一步学习摄像头在智能汽车中的安装调试技巧，以及图像感知方面的内容。摄像头在智能汽车上的位置是否端正、镜头与路面的角度是否合适等因素都会影响图像感知的质量。

## 2. 实验目标

（1）熟悉智能汽车摄像头安装与成像方式，学习摄像头硬件调试技巧；
（2）掌握智能汽车图像感知编程技能；
（3）参考教材内容及源码文件，完成本实验的部分代码补全任务。

## 3. 实验步骤

### 步骤 1：将智能汽车与 PC 电脑相连接

第一步，插入网线，将智能汽车通过网线与 PC 相连。PC 电脑需要参照实训一步骤设置好静态 IP 地址，并完成网络映射相关设置。

第二步，打开 MobaXterm，建立 SSH 远程连接，将本地 PC 与智能汽车 Edgeboard 板卡建立远程连接，进而可通过命令行的方式对智能汽车的源码进行启动等操作。

通过 MobaXterm，我们可以在电脑上看到智能汽车 Edgeboard 板卡上所展示的界面内容。

### 步骤 2：打开 Visual Studio Code 学习源码逻辑

在前面的环境准备阶段，我们已经安装了 Visual Studio Code，本次图像感知任务需要结合 EdgeBoard 嵌入式 AI 计算卡与本地计算机完成。

在上述步骤 1 基础上进行如下操作：

第一步，把部署在 EdgeBoard 嵌入式 AI 计算卡中的 intelligentcar_T710_python_v2 工程通过 Visual Studio Code 可视化界面打开。

第二步，准备图像感知源码文件。在本实验中，通过路径 src/python/camera_display.py 找到本项目实验的部分源码，工程文件结构如下图所示。

**图 2-1 工程文件结构**

### 步骤 3：新建文件夹，用于存储采集的图像

在该工程下，进入 res/samples/文件夹内，新建名字为 train 的文件夹，用于存放通过摄像头收集的图片。收集的图像数据可以用于本节课，也可以用于后续课程实验。

### 步骤 4：端正摄像头——代码解读

通过何种方式去校正摄像头在智能汽车中的位置呢？

我们需要连接智能汽车，通过运行 camera_display.py 代码去打开摄像头，在 PC 上实时观测摄像头传回来的图像，观测位置是否合适。但是由于周围的环境可能会比较复杂，通过肉眼直接观测无法更好的校正摄像头的位置，那么我们采用了这样一种方法，在摄像头实时采集的图像上绘制网格线，通过网格线中的横线、竖线与采集图像的实物进行位置的比对和标定，达到可以通过人工肉眼的方式近似精确的调整摄像头的角度，从而端正摄像头的位置。
在 camera_display.py 文件中，绘制田字格作为基准线的核心步骤包括：
（1）绘制 8 行基准线；
（2）绘制 10 列基准线。

整体代码如下：

```python
# ① 调用外部库 CV2：
import cv2
# ② 接收视频数据并设定分辨率为 320*240：
cap = cv2.VideoCapture(0)
cap.set(cv2.CAP_PROP_FRAME_WIDTH, 320)
cap.set(cv2.CAP_PROP_FRAME_HEIGHT, 240)
# ③ 检测视频是否接收到,加入 exit()防止死循环：
if not cap.isOpened():
    print("Cannot open camera")
    exit()
# ③ 设置视频图像各类参数，如帧率、宽、高等：
rate = int(cap.get(cv2.CAP_PROP_FPS))
width = int(cap.get(cv2.CAP_PROP_FRAME_WIDTH))
height = int(cap.get(cv2.CAP_PROP_FRAME_HEIGHT))
print("Camera Param: frame rate = ", rate, " width = ", width, " height = ", height)
while 1:
    ret, frame = cap.read()
    if not ret:
        print("Cannot open camera")
        exit()
    k = cv2.waitKey(1)
    # 设定退出信号
    if k == ord("q"):
        break
# ④ 绘制田字格作为基准线：
rows = int(height / 30)
cols = int(width / 32)
for i in range(1, rows):
    ptStart = (0, 30 * i)
    ptEnd = (width - 1, 30 * i)
    cv2.line(frame, ptStart, ptEnd, (211, 211, 211), 1)
for i in range(1, cols):
    if i == cols / 2:
        ptStart = (32 * i, 0)
        ptEnd = (32 * i, height - 1)
        cv2.line(frame, ptStart, ptEnd, (0, 0, 255), 1)
    else:
        ptStart = (32 * i, 0)
        ptEnd = (32 * i, height - 1)
        cv2.line(frame, ptStart, ptEnd, (211, 211, 211), 1)
# 视频窗口名称设定与显示
cv2.imshow("frame", frame)
cv2.waitKey(10)
cap.release()
```
⑤ 代码如下，请在空缺的代码处进行补全（代码解读可参考课程讲义）：

```cpp
// 绘制田字格：基准线
// # #### 代码填空开始处 #### #
"""
代码填空提示：
1. 绘制 8 行基准线；2. 绘制 10 列基准线。
"""
// # #### 代码填空结束处 #### #
for (size_t i = 1; i < rows; i++)
{
line(frame, Point(0, 30 * i), Point(frame.cols - 1, 30 * i), Scalar(211, 211, 211), 1);
}
for (size_t i = 1; i < cols; i++)
{
if (i == cols / 2)
line(frame, Point(32 * i, 0), Point(32 * i, frame.rows - 1), Scalar(0, 0, 255), 1);
else
line(frame, Point(32 * i, 0), Point(32 * i, frame.rows - 1), Scalar(211, 211, 211), 1);
}
```
### 步骤 5：运行代码文件，查看实验结果

本次实训所用脚本文件为 camera_display.py，可使用 cd 命令找到 src/python
文件目录下按回车键进入：

**图 2-2 运行代码**

输入 python3 camera_display.py(注意空格)，运行后即可在弹出的可视化窗口查看结果。
根据摄像头传输的网格线图像，用手端正或调整摄像头的位置。需注意网格线图像是实时传输的，并不会存储到本地，网格线图如下所示。
**图 2-3 摄像头画面**

![img_p37_2](../assets/page-38-img-24.png)

如需退出只需在终端按 Ctrl+c 即可。

### 步骤 6：补全代码，尝试实车运行，观察可视化运行结果

打开本实验项目的实践代码，对缺失代码的文件进行代码填充操作，进一步掌握本工程代码实现方法。

**图 2-4 代码文件**

将填充完毕的代码文件尝试替换智能汽车源文件中的对应文件，运行程序，观察可视化运行结果，验证代码填充是否正确。为防止代码错误或丢失，务必将源文件提前备份。