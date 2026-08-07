# 赛道图像的透视变换实验指导



## 目录

- [1.实验描述](#1.实验描述)
- [2.实验目标](#2.实验目标)
- [3.实验步骤](#3.实验步骤)
  - [步骤 1：将智能汽车与 PC 电脑相连接](#步骤1：将智能汽车与PC电脑相连接)
  - [步骤 2：打开 Visual Studio Code 学习部分源码逻辑](#步骤2：打开VisualStudioCode学习部分源码逻辑)
  - [步骤 3：图像透视变换](#步骤3：图像透视变换)
  - [步骤 4：运行代码文件，查看结果](#步骤4：运行代码文件，查看结果)
  - [步骤 5：补全代码，尝试实车运行，观察可视化运行结果](#步骤5：补全代码，尝试实车运行，观察可视化运行结果)


## 1.实验描述

在智能汽车中，车载摄像头有一定的俯视角度，采集到的道路图像不利于赛
道理解与识别，需要将道路图像转换成俯视图进行分析和处理，这种转换过程叫
透视变换，其本质是将图像投影到一个新的视平面，为智能汽车的下一步赛道识
别与检测做准备。
实验中赛道图像来源一方面可以通过摄像头对赛道进行实时采集，也可以读
取本地的“MP4”视频对视频中的赛道图像进行处理。本次课程我们选择读取视
频的方式完成赛道透视变换处理的任务。
## 2.实验目标

（1）掌握道路图像进行透视变换的方法；
（2）进一步理解透视变换的基本原理；
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
61

---

赛道图像的透视变换
### 步骤 2：打开 Visual Studio Code 学习部分源码逻辑

在前面的环境准备阶段，我们已经安装了 Visual Studio Code，本次任务需要
结合 EdgeBoard 嵌入式 AI 计算卡与本地计算机完成。
在上述步骤 1 基础上进行如下操作：
第 一 步 ， 把 部 署 在 EdgeBoard 嵌 入 式 AI 计 算 卡 中 的
Intelligentcar_T710_python_v2 工程通过 Visual Studio Code 可视化界面打开。
第二步，准备进行图像透视变换的视频。在该工程下，进入 res/samples/文
件夹内，存放本次实验使用的 MP4 视频，如果我们采用读取本地视频的方式进
行图像透视变换，通过修改代码中的读取视频源的方式读取本地的 MP4 视频。
第三步，准备赛道图像透视变换的源码文件。在本实验中，通过路径
src/python/perspective_mapping.py 找到本实验提供的部分源码供学习、参考和练
习。
工程文件结构如下图所示。
62

---

赛道图像的透视变换
图 5-1 工程文件结构
63

---

赛道图像的透视变换
### 步骤 3：图像透视变换

在“src/python/perspective_mapping.py”文件中，图像透视变换主要分为三
个步骤：OpenCV 读取摄像头画面、图像校正、图像透视变换（逆）。
（1）引入函数库（src/python/perspective_mapping.py）
引入 Python OpenCV 的函数库，同时引用我们自己开发的智能汽车功能库
intelligentCar_v2，可以调用相机矫正参数初始化功能的函数、透视变换功能的函
数去完成本次实验。
import base64
import cv2
import numpy as np
import string
import os
import sys
sys.path.append("../lib") # 引用 C++库
import intelligentCar_v2
（2）读取本地视频（src/python/perspective_mapping.py）
在代码测试阶段，智能汽车无法回到赛道上去实时采集图像，这时就需要读
取本地提前录制好的视频，并且设置视频的分辨率为 320×240。
capture = cv2.VideoCapture("../../res/samples/demo.mp4") # 读取本
地视频
capture.set(cv2.CAP_PROP_FRAME_WIDTH, 320) # 设置视频分辨
率:320*240
capture.set(cv2.CAP_PROP_FRAME_HEIGHT, 240)
（3）初始化智能汽车类(src/python/perspective_mapping.py）
初始化智能汽车类，并进行透视变换参数及相机矫正参数的初始化。
# 初始化智能汽车类
icar = intelligentCar_v2.IntelligentCar()
# 透视变换（IPM）参数初始化
icar.ipmInit()
# 相机矫正参数初始化
icar.imageCorrecteInit()
64

---

赛道图像的透视变换
（4）图像透视变换（src/python/perspective_mapping.py）
——补全代码
第一步，读取源视频帧；
第二步，对录制的源视频或者实时采集的赛道图像信息进行图像校正，用于
后续透视变换使用，并且展示图像校正后的赛道图像；
第三步，调用透视变换的函数对校正后的赛道图像进行透视变换处理。
while True:
# 读取视频帧
isTrue, imageFrame = capture.read()
# 图像矫正
base64Frame = matToBase64(imageFrame)
base64Corret = icar.imageCorrection(base64Frame)
imageCorret = base64ToMat(base64Corret)
if isTrue:
cv2.waitKey(1)
else:
print("视频播放完毕")
Break
# 透视变换
base64Ipm = icar.ipmHomography(base64Corret)
imageIpm = base64ToMat(base64Ipm)
imageIpm = cv2.resize(imageIpm, (320, 240))
cv2.putText(imageFrame, "[1] frame",(10, 30),
cv2.FONT_HERSHEY_TRIPLEX, 1,(255, 0, 0), 1)
cv2.putText(imageIpm, "[2] imgIpm",(10, 30),
cv2.FONT_HERSHEY_TRIPLEX, 1,(255, 0, 0), 1)
preprocess = np.hstack((imageFrame, imageIpm))
cv2.imshow("imageIpm", preprocess)
### 步骤 4：运行代码文件，查看结果

运行代码之前，关掉电脑防火墙，打开 MobaXterm 界面，在 SSH 连接完成
的 前 提 下 ， 在 命 令 行 中 输 入 “ cd
workspace/intelligentcar_T710_python_v2/src/python/”切换目录命令后按回车，再
次输入命令“python3 perspective_mapping.py”回车运行代码文件。
65

---

赛道图像的透视变换
图 5-2 运行代码
出现下面的窗口，选择“是”即可：
图 5-3 弹窗
随后将会出现图像透视变换的可视化窗口，等待代码运行完成。如下几幅图
片可以观察到在不同的赛道部分包括斑马线、弯道与十字路口，通过透视变换算
法处理的赛道结果。
图 5-4 斑马线透视变换处理结果
图 5-5 弯道透视变换处理结果
66

---

赛道图像的透视变换
图 5-6 十字路口透视变换处理结果
### 步骤 5：补全代码，尝试实车运行，观察可视化运行结果

打开本实验项目的实践代码，对缺失代码的文件进行代码填充操作，进一步
掌握本工程代码实现方法。
图 5-7 代码文件
将填充完毕的代码文件尝试替换智能汽车源文件中的对应文件，运行程序，
观察可视化运行结果，验证代码填充是否正确。为防止代码错误或丢失，务必将
源文件提前备份。
67

---