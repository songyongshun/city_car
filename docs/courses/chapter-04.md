# 相机标定与图像校正实验指导



## 目录

- [1.实验描述](#1.实验描述)
- [2.实验目标](#2.实验目标)
- [3.实验步骤](#3.实验步骤)
  - [步骤 1：将智能汽车与 PC 电脑相连接](#步骤1：将智能汽车与PC电脑相连接)
  - [步骤 2：打开 Visual Studio Code 学习部分源码逻辑](#步骤2：打开VisualStudioCode学习部分源码逻辑)
  - [步骤 3：理解相机标定主要流程](#步骤3：理解相机标定主要流程)
- [1.初始化世界坐标，用初始化焦点数量 cornerPointInt×格点长度](#1.初始化世界坐标，用初始化焦点数量cornerPointInt×格点长度)
- [2.初始化保存世界坐标列表：objectPoints；](#2.初始化保存世界坐标列表：objectPoints；)
- [3.初始化保存像素坐标列表：imagePoints；](#3.初始化保存像素坐标列表：imagePoints；)
- [0.5,](#0.5,)
  - [步骤 4：运行代码文件，查看结果](#步骤4：运行代码文件，查看结果)
  - [步骤 5: 补全代码，尝试实车运行，观察可视化运行结果](#步骤5:补全代码，尝试实车运行，观察可视化运行结果)


## 1.实验描述

通过前两个章节的学习，我们对智能汽车的架构和控制系统有一个全方位的
了解。
智能汽车是通过计算机视觉的图像处理技术对赛道各类图像进行处理、识别，
进而去完成赛道上的各项任务，通过摄像头采集的图片可能会发生径向畸变、切
向畸变、薄透镜畸变等情况，那么我们就需要通过相机标定的方法对摄像头采集
的图片进行标定，并且把最终标定的图片进行校正，供后续车辆使用各种算法进
行决策。
本次课程，我们尝试通过相机标定算法对标定板图片进行标定和图像校正。
## 2.实验目标

（1）理解相机标定原理；
（2）掌握张正友相机标定法，掌握标定图片的代码实现方法，并对标定结
果进行评价；
（3）掌握图片校正的相关方法与技术；
（4）参考教材内容及源码文件，完成本实验的部分代码补全任务。
## 3.实验步骤

### 步骤 1：将智能汽车与 PC 电脑相连接

第一步，插入网线，将智能汽车通过网线与 PC 相连。PC 电脑需要参照实
训一步骤设置好静态 IP 地址，并完成网络映射相关设置。
第二步，打开 MobaXterm，建立 SSH 远程连接，将本地 PC 与智能汽车
Edgeboard 板卡建立远程连接，进而可通过命令行的方式对智能汽车的源码进行
启动等操作。
通过 MobaXterm，我们可以在电脑上看到智能汽车 Edgeboard 板卡上所展示
48

---

相机标定与图像校正
的界面内容。
### 步骤 2：打开 Visual Studio Code 学习部分源码逻辑

在前面的环境准备阶段，我们已经安装了 Visual Studio Code，本次相机标定
任务需要结合 EdgeBoard 嵌入式 AI 计算卡与本地计算机完成。
在上述步骤 1 基础上进行如下操作：
第 一 步 ， 把 部 署 在 EdgeBoard 嵌 入 式 AI 计 算 卡 中 的
Intelligentcar_T710_python_v2 工程通过 Visual Studio Code 可视化界面打开。
第二步，准备标定板图片。在该工程下，进入 res/calibration/文件夹,该文件
夹 用 于 存 放 相 机 标 定 所 使 用 的 图 片 。 实 操 时 ， 可 以 删 除 已 经 存 在 的
calibration/temp 文件夹，学习重新新建该文件夹，然后将自己拍摄的棋盘格照片
（30 张左右即可）存入此文件夹中用于随后标定（打印所需的棋盘格图片文件
存放于项目根目录下）。
第三步，准备相机标定源码文件。
在本实验中，通过路径 src/python/camera_calibrate.py 找到本实验提供的部分
源码，这个文件中的代码可以实现相机标定与图像校正。
工程文件结构如下图所示。
49

---

相机标定与图像校正
图 4-1 工程文件结构
### 步骤 3：理解相机标定主要流程

在 camera_calibrate.py 文件中，相机标定与图像校正的核心代码流程主要分
为 5 个步骤：
（1）初始化头文件（src/python/camera_calibrate.py）
导入本实验所需要的一些函数库。
import sys
import os
import numpy as np
import cv2
50

---

相机标定与图像校正
import glob
import xml.etree.ElementTree as ET
from xml.etree.ElementTree import Element
import shutil
（2）主函数（src/python/camera_calibrate.py）
初始化操作，包括确定输入图像文件夹、确定输出图像文件夹、确定标定板
规格：11*8、格点长度 20mm、图像类型为 jpg 类型。其中，11*8 在 opencv 中
为内角点个数，为可输入参数。
if __name__ == "__main__":
inputFolder = "../../res/calibration/temp/" # 输入图像文件夹
outputFolder = "../../res/calibration/" # 输出图像文件夹
calibrationPlateSize = (11, 8) # opencv 输入参数为内角点个数，所以输入
参数为 11*8
latticeLength = 0.02 # 格点长度 20mm
imageType = "jpg" # 图像类型
（3）相机标定（src/python/camera_calibrate.py）
调 用 CalibrationCamera 函 数 可 以 直 接 进 行 相 机 标 定 。 下 面 对
CalibrationCamera 函数的定义过程以及相机标定的逻辑进行分步介绍，代码相应
拆解并进行分步解释说明。
① CalibrationCamera 函数功能主要是计算内参矩阵、畸变参数、平均误差、
标注角点集图片，理解函数返回值。
(internalMatrix, distortionCofficients, averageError,) =
CalibrationCamera(
calibrationPlateSize, latticeLength, inputFolder, imageType,
outputFolder
) # 相机标定
②函数定义如下，首先规定标定板规格，初始化角点与多维结构，初始化世
界坐标系等信息，定义好角点照片保存路径。
CalibrationCamera 函 数 中 涉 及 到 的 一 些 变 量 及 参 数 名 称 如 下 ：
calibrationPlateSize，标定板尺寸；latticeLength，格点长度；inputFolder，输入文
件夹；imageType，图片类型；返回值 return: 内参矩阵、畸变参数、平均误差、
标注角点集图片。
def CalibrationCamera(
calibrationPlateSize, latticeLength, inputFolder, imageType,
outputFolder
51

---

相机标定与图像校正
):
"""
用相机对张正友标定法的棋盘格进行不同角度的拍摄，得到一组图像；
对图像中的特征点如标定板角点进行检测，得到标定板角点的像素坐标值，根据已知的棋
盘格大小和世界坐标系原点，计算得到标定板角点的物理坐标值；
根据物理坐标值和像素坐标值的关系，求解相机内参矩阵，计算径向畸变参数。
:param calibrationPlateSize: 标定板尺寸
:param latticeLength: 格点长度
:param inputFolder: 输入文件夹
:param imageType: 图片类型
:outputFolder:输出路径
:return: 内参矩阵，畸变参数，平均误差，标注角点集图片
"""
width, height = calibrationPlateSize # 标定板规格
cornerPointInt = np.zeros((width * height, 3), np.float32) # 初始
化角点
cornerPointInt[:, :2] = np.mgrid[0:width, 0:height].T.reshape(-1,
2) # 初始化多维结构
# #### 代码填空开始处 #### #
"""
代码填空提示：
1.初始化世界坐标，用初始化焦点数量 cornerPointInt×格点长度 latticeLength；
2.初始化保存世界坐标列表：objectPoints；
3.初始化保存像素坐标列表：imagePoints；

"""
# #### 代码填空结束处 #### #
imageNames = [] # 保存有效照片名称
imageCorners = [] # 保存标注角点的图片
# 角点照片保存路径
outputCorners = outputFolder + "corners/"
if not os.path.exists(outputCorners): # 判断文件夹是否存在
os.makedirs(outputCorners) # 如果文件夹不存在，则创建文件夹
else:
shutil.rmtree(outputFolder + "corners")
os.makedirs(outputCorners) # 如果文件夹不存在，则创建文件夹
③获取需要标定的图像数据，同时将图像转换为灰度图像；
images = glob.glob(inputFolder + os.sep + "**." + imageType) # 获取
指定文件夹下的指定文件
for fileName in images:
image = cv2.imread(fileName) # 获取图像数据
grayImage = cv2.cvtColor(image, cv2.COLOR_BGR2GRAY) # 图像转换
为灰度
52

---

相机标定与图像校正
④通过上传这组图像，对图像中的特征点如标定板的角点进行检测，得到标
定板中角点的像素坐标值，根据已知的棋盘格的大小和世界坐标系原点，计算得
到标定板角点的物理坐标值；
mark, cornerPointImage = cv2.findChessboardCorners(
grayImage, (width, height), None
) # 查找棋盘内角的位置，cornerPointImage 为像素空间中的角点。
if mark == True: # 如果 ret 为 True，则保存。
objectPoints.append(cornerPointWorld) # 世界坐标集
imagePoints.append(cornerPointImage) # 像素坐标集
cv2.drawChessboardCorners(
image, (width, height), cornerPointImage, mark
) # 将检测到的角点集画出来。
imageCorners.append(image) # 保存绘制角点集的图片
# 保存角点照片名称
imageName = fileName.split(os.sep)[-1] # 获取图片名称
imageNames.append(imageName)
⑤根据物理坐标值和像素坐标值的关系，求解相机内参矩阵，计算径向畸变
参数。
try:
(
mark,
internalMatrix,
distortionCofficients,
rotationVectors,
translationVectors,
) = cv2.calibrateCamera(
objectPoints, imagePoints, grayImage.shape[::-1], None, None
) # 标定相机，依据世界坐标和像素坐标
except:
print("failure:相机标定-棋盘尺寸/格点长度/图片类型有误！")
sys.exit(0)
with open("../../res/calibration/assessment.txt", "w") as f:
head = "相机标定分辨率: 320x240"
f.write(head) # 写入头
f.write("\n")
head = "每幅图像的标定误差: "
f.write(head)
f.write("\n")
f.close()
totalError = 0
for i in range(len(objectPoints)):
imagePointsPlane, temp = cv2.projectPoints(
53

---

相机标定与图像校正
objectPoints[i],
rotationVectors[i],
translationVectors[i],
internalMatrix,
distortionCofficients,
) # 投影 3D 指向一个图像平面。
error = cv2.norm(imagePoints[i], imagePointsPlane, cv2.NORM_L2)
/ len(
imagePoints
) # 计算数组的绝对范数
with open("../../res/calibration/assessment.txt", "a") as f:
errorprint = "第" + str(i + 1) + "幅图像的平均误差:" + str(error)
f.write(errorprint) # 写入每一幅图像的误差
f.write("\n")
f.close()
cv2.putText(
imageCorners[i],
"error:" + str(round(error, 3)),
(10, 20),
cv2.FONT_HERSHEY_SIMPLEX,
0.5,

(0, 0, 255),
1,
)
cv2.imwrite(
outputCorners + os.sep + imageNames[i],
imageCorners[i],
) # 存储角点图片
cv2.imshow("calibration", imageCorners[i])
cv2.waitKey(500)
⑥计算径向畸变参数，返回内参矩阵，畸变参数，平均误差，标注角点集图
片。
totalError += error
averageError = totalError / len(objectPoints) # 平均误差
with open("../../res/calibration/assessment.txt", "a") as f:
averageerror = "总体平均误差:" + str(averageError)
internalmatrix = "相机内参数矩阵: " + str(internalMatrix)
cofficients = "相机畸变系数: " + str(distortionCofficients)
f.write("\n")
f.write(averageerror) # 写入平均误差
f.write("\n")
f.write(internalmatrix) # 写入内参矩阵
f.write("\n")
54

---

相机标定与图像校正
f.write(cofficients) # 写入相机畸变系数
f.write("\n")
f.close()
return (
internalMatrix,
distortionCofficients,
averageError,
) # 返回内参矩阵，畸变参数，平均误差，标注角点集图片
（4）处理畸变图像（src/python/camera_calibrate.py）
根据上一个步骤的内参矩阵和畸变参数，对原图进行校准，处理畸变图像。
主要是依据上一步骤所计算出来的一些用于相机标定的数据结合张正友标定法
完成对原图像的校准。畸变图像处理通过 DedistortionDeal 函数进行。
DedistortionDeal 函数中涉及到的一些变量及参数名称如下：
calibrationPlateSize，标定板尺寸；inputFolder，输入文件夹；imageType，图
片类型；outputFolder，输出文件夹；internalMatrix，内参矩阵；distortionCofficients，
畸变参数；angularPointImages，标注角点集的图片；
函数定义如下：
def DedistortionDeal(
inputFolder,
imageType,
outputFolder,
internalMatrix,
distortionCofficients,
):# 处理畸变图片
"""
根据内参矩阵和畸变参数对原图进行校准，并且拼接保存
:param inputFolder: 输入文件夹
:param imageType: 图片类型
:param outputFolder: 输出文件夹
:param internalMatrix: 内参矩阵
:param distortionCofficients: 畸变参数
"""
images = glob.glob(inputFolder + os.sep + "**." + imageType) # 获
取指定文件夹下的指定文件
outputCorrent = outputFolder + "correct/"
if not os.path.exists(outputCorrent): # 判断文件夹是否存在
os.makedirs(outputCorrent) # 如果文件夹不存在，则创建文件夹
else:
55

---

相机标定与图像校正
shutil.rmtree(outputFolder + "correct")
os.makedirs(outputCorrent) # 如果文件夹不存在，则创建文件夹
for index, fileName in enumerate(images):
imageName = fileName.split(os.sep)[-1] # 获取图片名称
image = cv2.imread(fileName) # 获取图片数据
imageCorrect = cv2.undistort(
image, internalMatrix, distortionCofficients, None,
internalMatrix
) # 变换图像以补偿镜头畸变
cv2.putText(image, "old", (10, 20), cv2.FONT_HERSHEY_SIMPLEX, 1,
(0, 0, 255), 1)
cv2.putText(
imageCorrect,
"New",
(10, 20),
cv2.FONT_HERSHEY_SIMPLEX,
1,
(0, 0, 255),
1,
)
jointImage = np.concatenate([image, imageCorrect], axis=1) # 水
平拼接
cv2.imwrite(outputCorrent + os.sep + imageName, jointImage) # 存
储图片
cv2.imshow("calibration", jointImage)
cv2.waitKey(500)
（5）将相机标定参数写入 Xml 文件，为图像预处理等后续操作
做好数据准备。（src/python/camera_calibrate.py）
通过 creatMatrixTree 函数与 creatCoeffsTree 得到内参矩阵的一些数据，通过
__indent 函数最终按照标准格式输出到 xml 文件中，具体函数代码请各位同学在
源码工程中查阅，本实验只展示主函数中调用过程。
# 将相机标定参数写入 Xml 文件
root = ET.Element("opencv_storage")
tree = ET.ElementTree(root)
root.append(creatMatrixTree(internalMatrix))
root.append(creatCoeffsTree(distortionCofficients))
__indent(root)
# [temp]文件夹下存放临时测试文件，[valid]文件夹下放置有效的标定文件
tree.write(
"../../res/calibration/calibration.xml",
56

---

相机标定与图像校正
encoding="utf-8",
xml_declaration=True,
)
在"../../res/calibration/valid/"文件路径下存放有效的标定文件。
### 步骤 4：运行代码文件，查看结果

（1）收集图片素材
参照实训 3 图像采集方法，可以通过手柄遥控智能汽车上的摄像头采集标定
板图像，进入智能汽车项目工程的根目录下，按照 res\calibration\temp 路径查看
收集的图片。
图 4-2 素材图片
（2）运行相机标定的程序代码
运行代码之前，关掉电脑防火墙，打开 MobaXterm 界面，在 SSH 连接完成
的 前 提 下 ， 在 命 令 行 中 输 入 “ cd
workspace/intelligentcar_T710_python_v2/src/python/”命令后按回车，再在命令行
输入“python3 camare_calibration.py”回车：
图 4-3 代码运行
出现下面的窗口，选择“是”即可：
57

---

相机标定与图像校正
图 4-4 弹窗
随后将会出现可视化窗口，等待代码运行完成。
（3）查看相机标定的图片
进入智能汽车项目工程的根目录下，按照 res\calibration\valid\corner 路径可
查看相机标定后的图片。
图 4-5 标定后图片
（4）查看图像矫正的图片
进入智能汽车项目工程的根目录下，按照 res\calibration\valid\correct 路径可
查看图像矫正后的图片。
58

---

相机标定与图像校正
图 4-6 校正后图片
（5）评价相机标定结果
进入智能汽车项目工程的根目录下，按照 res\calibration\valid\calibration.xml
路径查看生成的误差文件，包括每幅图像的平均误差、相机内参数矩阵、畸变系
数，以及每一幅图像的旋转向量、旋转矩阵、平移向量。
图 4-7 标定文件
### 步骤 5: 补全代码，尝试实车运行，观察可视化运行结果

打开本实验项目的实践代码，对缺失代码的文件进行代码填充操作，进一步
掌握本工程代码实现方法。
59

![img_p60_1](../assets/page-61-img-26.png)

---

相机标定与图像校正
图 4-8 代码文件
将填充完毕的代码文件尝试替换智能汽车源文件中的对应文件，运行程序，
观察可视化运行结果，验证代码填充是否正确。为防止代码错误或丢失，务必将
源文件提前备份。
60

---