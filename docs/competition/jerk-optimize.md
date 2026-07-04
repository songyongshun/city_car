# 关于jerk优化

属于分段二次导数问题优化问题

## 交替方向乘子法（Alternating Direction Method of Multipliers）

用于解决存在两个优化变量的只含等式约束的优化类问题，其一般形式为：

$\text{min}_{x,z} (f(x) + g(z))$

$\text{s.t. } Ax + Bz = c$

其中, $x\in \mathbb{R}^n$, $z \in \mathbb{R}^m$是优化变量，等式约束中 $A \in \mathbb{R}^{p \times n}$, $B \in \mathbb{R}^{p \times m}$, $c \in \mathbb{R}^p$, $f$ 和 $g$ 是凸函数。



## 增广拉格朗日函数（Augmented Lagrangian）
为解决此类凸优化问题，定义增广拉格朗日函数：

$L_\rho(x,z,u) = f(x) + g(z) + u^T(Ax + Bz - c) + \frac{\rho}{2}||Ax + Bz - c||_2^2$

## 算法流程
每一步只更新一个变量而固定另外两个变量，如此交替重复更新。即，对于 $k=1,2,...$，重复如下步骤：

1. **更新 $x$**: 固定 $z$ 和 $u$，求解以下优化问题：

   $x^{k} = \arg\min_x L_\rho(x, z^{k-1}, u^{k-1})$

2. **更新 $z$**: 固定 $x$ 和 $u$，求解以下优化问题：

    $z^{k} = \arg\min_z L_\rho(x^{k}, z, u^{k-1})$

3. **更新拉格朗日乘子 $u$**: 更新拉格朗日乘子：

   $u^{k} = u^{k-1} + \rho(Ax^{k} + Bz^{k} - c)$

ADMM 算法提供了一个将多优化变量问题转化为单优化变量问题的转化方式（即，交替方向），并未涉及具体的下降方法，其中关于$x$、$z$的更新过程需要结合具体的下降类算法，如梯度下降算法等。

## OSQP软件

OSQP（Operator Splitting Quadratic Program）是一个用于求解二次规划问题的开源软件包，基于交替方向乘子法（ADMM）实现。它能够高效地处理大规模稀疏二次规划问题，并且支持多种约束类型，包括等式约束和不等式约束。

```c++
  OSQPData* data = reinterpret_cast<OSQPData*>(c_malloc(sizeof(OSQPData)));
  if (FormulateProblem(data)) { // 将 Apollo 的边界约束转换成 OSQP 的矩阵形式
    FreeData(data);
    return false;
  }
```

FormulateProblem 函数会把你的车道线边界（Path Bounds）、障碍物边界（Obstacle Bounds）、以及车辆物理极限（最大加速度、最大曲率）全部填入 P、q、A、l、u 等数学矩阵中。如果约束冲突或矩阵构建失败，则释放内存并返回 false.

OSQP 求解器求解的标准数学问题形式如下：

$\min _{x} (\frac{1}{2}x^{T}Px+q^{T}x)$

$\text{s.t.} \quad l\le Ax\le u$

这五个核心矩阵和向量分别代表 优化目标（代价函数） 和 物理约束，它们的具体含义和在 Apollo 中的映射如下：

1. $P$ (Kernel Matrix / 核矩阵)

数学定义：一个对称正半定矩阵，用来定义优化目标的二次项系数（即平方项系数）。

在 Apollo 中的含义：代表各项性能指标的权重（Weights）的平方。
- 它决定了系统更在乎什么。例如，你在配置文件中设置的 `path_l_weight`（位置纵向/横向偏差权重）、`path_dl_weight`（速度/斜率权重）、`path_ddl_weight`（加速度/曲率权重）、`path_dddl_weight`（加加速度/曲率变化率权重）。
- 矩阵 $P$ 的对角线元素就是这些权重的组合。$P$ 越大，说明系统对该项指标的惩罚越重，生成的轨迹在该维度就越平滑。

2. $q$ (Linear Cost Vector / 一次项系数向量)

数学定义：一个列向量，用来定义优化目标的一次项系数。

在 Apollo 中的含义：代表轨迹趋向于某个“理想参考目标”的引导力。
- 例如，在横向路径规划中，系统希望车尽可能行驶在车道中心线（Reference Line）上。如果当前车道中心线对应的横向偏移坐标是 $l_{ref}$，那么代价函数中就会有一项：$w \cdot (l - l_{ref})^2 = w \cdot l^2 - 2w \cdot l_{ref} \cdot l + w \cdot l_{ref}^2$。
- 展开后的这一项中，$-2w \cdot l_{ref}$ 就会被填入向量 $q$ 对应的位置中，用来在求解时把车辆“拉”回车道中心。

3. $A$ (Linear Constraint Matrix / 约束系数矩阵)

数学定义：一个稀疏矩阵（Sparse Matrix），用来定义变量与变量之间的线性关系网。

在 Apollo 中的含义：在 Apollo 中，优化变量 $x$ 包含了所有离散点的【位置、一阶导、二阶导】。矩阵 $A$ 的核心任务是把这些变量用物理学公式串联起来：
- 运动学状态转移方程：它会把点 $i$ 的位置和点 $i+1$ 的位置、速度、加速度通过泰勒展开式动态关联（例如：$x_{i+1} = x_i + \Delta s \cdot dx_i + \frac{1}{2}\Delta s^2 \cdot ddx_i$）。
- 约束映射：它告诉求解器，哪一行约束是限制位置的，哪一行是限制速度的，哪一行是限制加速度的。

4. $l$ (Lower Bound Vector / 下限约束向量)

数学定义：一个列向量，定义了矩阵 $Ax$ 映射后的物理下限。

在 Apollo 中的含义：
- 安全/车道下限：在横向规划中，代表当前点 $s$ 处，道路右边界（或右侧锥桶边界） 允许主车行驶的最右侧极限。
- 物理极限下限：代表车辆硬性物理能力的下限，例如：最大制动减速度（\(-4.0 \, m/s^2\)）、最大右转向曲率。

5. $u$ (Upper Bound Vector / 上限约束向量)

数学定义：一个列向量，定义了矩阵 $Ax$ 映射后的物理上限。

在 Apollo 中的含义：与 $l$ 完美镜像对称。
- 安全/车道上限：在横向规划中，代表当前点 $s$ 处，道路左边界（或左侧锥桶边界） 允许主车行驶的最左侧极限。
- 物理极限上限：代表车辆硬性物理能力的上限，例如：最大加速度（\(2.0 \, m/s^2\)）、最大左转向曲率.




