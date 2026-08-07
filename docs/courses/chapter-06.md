# 赛道图像预处理实验指导



## 目录

- [1.实验描述](#1.实验描述)
- [2.实验目标](#2.实验目标)
- [3.实验步骤](#3.实验步骤)
  - [步骤 1：将智能汽车与 PC 电脑相连接](#步骤1：将智能汽车与PC电脑相连接)
  - [步骤 2：打开 Visual Studio Code 学习部分源码逻辑](#步骤2：打开VisualStudioCode学习部分源码逻辑)
  - [步骤 3：图像预处理](#步骤3：图像预处理)
- [1.调用 cv2 库中的 threshold 函数完成图像的二值化；](#1.调用cv2库中的threshold函数完成图像的二值化；)
- [2.这个函数有四个参数：第一个为原图像，第二个为进行分类的阈值，](#2.这个函数有四个参数：第一个为原图像，第二个为进行分类的阈值，)
  - [步骤 4：图像合成视频(src/python/image2video.py)](#步骤4：图像合成视频(src/python/image2video.py))
  - [步骤 5：运行代码文件，在 PC 查看可视化结果](#步骤5：运行代码文件，在PC查看可视化结果)
  - [步骤 6：补全代码，尝试实车运行，观察可视化运行结果](#步骤6：补全代码，尝试实车运行，观察可视化运行结果)


## 1.实验描述

通过本章节前几部分的理论和实践学习，我们对智能汽车的图像采集、相机
标定、图像校正方法都有一定的了解和掌握，接下来我们要结合这些实践，完成
智能汽车赛道图像预处理的任务。
对摄像头采集到的赛道图像进行实时的预处理，包括图像校正、图像二值化、
图像合成视频等操作；也可以读取本地的“MP4”视频对赛道进行图像预处理相
关操作。本次课程我们尝试读取视频完成赛道图像的预处理实验。
## 2.实验目标

（1）理解图像预处理作用及原理；
（2）掌握图像校正、图像二值化、图像合成方法，了解二值化图像在智能
汽车项目中的应用；
（3）参考教材内容及源码文件，完成本实验的部分代码补全任务。
## 3.实验步骤

### 步骤 1：将智能汽车与 PC 电脑相连接

第一步，插入网线，将智能汽车通过网线与 PC 相连。PC 电脑需要参照实
训一步骤设置好静态 IP 地址，并完成网络映射相关设置。
第二步，打开 MobaXterm，建立 SSH 远程连接，将本地 PC 与智能汽车
Edgeboard 板卡建立远程连接，进而可通过命令行的方式对智能汽车的源码进行
启动等操作。
通过 MobaXterm，我们可以在电脑上看到智能汽车 Edgeboard 板卡上所展示
的界面内容。
68

---

赛道图像预处理
### 步骤 2：打开 Visual Studio Code 学习部分源码逻辑

在前面的环境准备阶段，我们已经安装了 Visual Studio Code，本次任务需要
结合 EdgeBoard 嵌入式 AI 计算卡与本地计算机完成。
在上述步骤 1 基础上进行如下操作：
第 一 步 ， 把 部 署 在 EdgeBoard 嵌 入 式 AI 计 算 卡 中 的
Intelligentcar_T710_python_v2 工程通过 Visual Studio Code 可视化界面打开。
第二步，准备进行图像预处理的视频。在该工程下，进入 res/samples/文件
夹内，存放图像预处理使用的 MP4 视频，如果我们采用读取本地视频的方式进
行图像预处理，通过这个文件路径读取对应的视频文件。
第 三 步 ， 准 备 图 像 预 处 理 源 码 文 件 。 在 本 实 验 中 ， 通 过 路 径
src/python/image_preprocess.py 找到本实验提供的图像校正、图像二值化部分源
码。通过路径 src/python/image2video.py 找到本实验提供的图像合成视频部分源
码。
工程文件的结构如下图所示。
69

---

赛道图像预处理
图 6-1 工程文件结构
### 步骤 3：图像预处理

在“src/python/image_preprocess.py”文件中，图像预处理主要分为四个步骤：
OpenCV 读取摄像头画面、图像校正、RGB 图像转换成灰度图像、图像二值化。
在“src/python/image2video.py”文件中将会实现图像合成视频。
（1）引入函数库（src/python/ image_preprocess.py）
引入 Python OpenCV 的函数库，同时引入我们自己开发的智能汽车函数库
intelligentCar_v2，在关于赛道处理的过程中可以调用 intelligentCar_v2 库中的函
数功能帮助我们完成实验任务。
70

---

赛道图像预处理
import base64
import cv2
import numpy as np
import sys
sys.path.append("../lib") # 引用 C++库
import intelligentCar_v2 # 引用图像预处理库
（2）读取本地视频（src/python/ image_preprocess.py）
在代码测试阶段，智能汽车无法回到赛道上去实时采集图像，这时就可以读
取本地提前录制好的视频，并且设置视频的分辨率为 320×240。
capture = cv2.VideoCapture("../../res/samples/demo.mp4") # 选择本
地视频
capture.set(cv2.CAP_PROP_FRAME_WIDTH, 320) # 设置视频分辨
率:320*240
capture.set(cv2.CAP_PROP_FRAME_HEIGHT, 240)
（3）初始化智能汽车类（src/python/ image_preprocess.py）
# 初始化智能汽车类
icar = intelligentCar_v2.IntelligentCar()
# 相机矫正参数初始化
icar.imageCorrecteInit()
（4）图像二值化（src/python/ image_preprocess.py）——补
全代码
第一步，读取视频帧，展示源视频的效果，用于对照组；
while True:
# 读取视频帧
isTrue, imageFrame = capture.read()
if isTrue:
cv2.waitKey(1)
else:
print("视频播放完毕")
break
第二步，图像校正，对录制的源视频或者实时采集的赛道图像信息进行图像
校正，供下一步骤使用；
# 图像矫正
base64Frame = matToBase64(imageFrame)
base64Corret = icar.imageCorrection(base64Frame)
71

---

赛道图像预处理
imageCorret = base64ToMat(base64Corret)
第三步，将 RGB 彩色图像转换成灰度图像；
# RGB 图像转换成灰度图像
imageGray = cv2.cvtColor(imageCorret, cv2.COLOR_BGR2GRAY)
第四步，图像二值化，调用图像二值化的函数对经过第二步与第三步处理后
的图像进行二值化转换，把视频中的每一帧图像转换为二值化图像（黑白图像）。
有缺失代码需要填充补全。
# 图像二值化
# #### 代码填空开始处 #### #
"""
代码填空提示：
1.调用 cv2 库中的 threshold 函数完成图像的二值化；
2.这个函数有四个参数：第一个为原图像，第二个为进行分类的阈值，
第三个是高于（低于）阈值时赋予的新值，第四个是一个方法选择参数，填写为
cv2.THRESH_OTSU
"""
# #### 代码填空结束处 #### #
imageBinary = np.expand_dims(imageBinary, axis=2) #
将单通道灰度图转换成 RGB
imageBinary = np.concatenate((imageBinary, imageBinary,
imageBinary), axis=-1)
cv2.putText(imageFrame, "[1] frame",(10, 30),
cv2.FONT_HERSHEY_TRIPLEX, 1,(255, 0, 0), 1)
cv2.putText(imageCorret, "[2] imgCorret",(10, 30),
cv2.FONT_HERSHEY_TRIPLEX, 1,(255, 0, 0), 1)
cv2.putText(imageBinary, "[3] imgBinary",(10, 30),
cv2.FONT_HERSHEY_TRIPLEX, 1,(255, 0, 0), 1)
preprocess = np.hstack((imageFrame, imageCorret))
preprocess = np.hstack((preprocess, imageBinary))
cv2.imshow("preprocess", preprocess)
缺失代码填写可参考步骤 4 列出的源码文件。
### 步骤 4：图像合成视频(src/python/image2video.py)

视频实质是连续的图像序列，包含多幅图像，并包含图像的运动信息。由于
人眼识别图像的频率有限，这个频率一般为每秒 25 张图片，即 25 帧/秒。当单
位时间内看到的图像数量超过一定数目时，给人造成的感觉就是画面是运动的，
72

---

赛道图像预处理
这就是所谓的视频。
在本实验中，设置生成的视频帧率为 30 帧每秒，分辨率为 320×240 。参
照如下代码，设定好生成的视频路径与名称，帧率，视频格式，即可将图片添加
并合成为相应视频。
video_dir = "../../res/samples/sample.mp4" # 生成的视频路径和名称
width = 320 # 照片的大小
height = 240
fps = 30 # 视频的帧率
fourcc = cv2.VideoWriter_fourcc(*"mp4v") # 将转化后的视频格式设置为 mp4
videoWriter = cv2.VideoWriter(video_dir, fourcc, fps, (width,
height)) # 将照片添加到视频中
img_dir = "../../res/samples/train/"
for i in range(5000):
image = cv2.imread(img_dir + str(i + 1) + ".jpg")
if image is not None:
videoWriter.write(image)
print("index = ", i + 1)
videoWriter.release() # 资源释放
print("finished!")
### 步骤 5：运行代码文件，在 PC 查看可视化结果

运行代码之前，关掉电脑防火墙，打开 MobaXterm 界面，在 SSH 连接完成
的 前 提 下 ， 在 命 令 行 中 输 入 “ cd
workspace/intelligentcar_T710_python_v2/src/python/”切换目录命令后按回车，再
次输入命令“python3 image_preprocess.py”回车：
图 6-2 运行代码
出现下面的窗口，选择“是”即可：
73

---

赛道图像预处理
图 6-3 弹窗
随后将会出现可视化窗口，等待代码运行完成。如下图所示，左侧 frame 为
原图，中间 imgCorrect 为图像校正的效果，右侧 imgBinary 为图像校正之后继而
进行二值化处理的效果。
图 6-4 运行结果
### 步骤 6：补全代码，尝试实车运行，观察可视化运行结果

打开本实验项目的实践代码，对缺失代码的文件进行代码填充操作，进一步
掌握本工程代码实现方法。
图 6-5 代码文件
将填充完毕的代码文件尝试替换智能汽车源文件中的对应文件，运行程序，
观察可视化运行结果，验证代码填充是否正确。为防止代码错误或丢失，务必将
源文件提前备份。
74

---