---
title: "Apollo 平台入门"
collection: teaching
type: "Undergraduate course"
permalink: /teaching/2025-autumn-teaching/apollo-chapter-1
venue: "常州工业职业技术学院, 信息工程学院"
date: 2025-09-01
location: "Changzhou, China"
---

# 赛题三解答



根据日志中 `lane_follow_stage.cc:169` 的性能统计输出，每个规划周期依次执行以下 11 个 Task：
顺序	Task 名称
1	LANE_CHANGE_PATH
2	LANE_FOLLOW_PATH
3	LANE_BORROW_PATH
4	FALLBACK_PATH
5	PATH_DECIDER
6	RULE_BASED_STOP_DECIDER
7	SPEED_BOUNDS_PRIORI_DECIDER
8	SPEED_HEURISTIC_OPTIMIZER
9	SPEED_DECIDER
10	SPEED_BOUNDS_FINAL_DECIDER
11	PIECEWISE_JERK_SPEED


车辆偏出车道边界（init_l = -0.61，超出左边界 -0.60），说明之前已轻微撞到障碍物或压线

Apollo 采用的是笛卡尔坐标系向 Frenet 坐标系的投影。确定左右使用的是右手定则：
\(s\) 轴：沿着参考线（车道线）前进的方向。
\(l\) 轴：垂直于参考线。当你右手大拇指朝向车辆前进方向（\(s\) 轴正方向），食指指向左侧，中指指向天空。因此，左侧为正（Left is Positive），右侧为负（Right is Negative）。



在 Apollo 规划器的路径边界决策中，*center_l* 是一个 `std::vector<double>` 类型的变量，用于记录路径边界在 Frenet 坐标系下的横向中心线历史位置。

`center_l` 记录的是 `path_boundary`（路径边界）在 Frenet 坐标系下的横向中心（l 坐标）随纵向距离 s 的变化：
```cpp
// 每个路径边界点处的中心
center_l.push_back((left_bound.l + right_bound.l) / 2.0);
```
由于这个边界会受到障碍物绕行的影响而偏向某侧（比如碰到障碍物后左边路变窄，中心就右移），所以 `center_l` 反映了：
在当前可行驶区域内，规划器"倾向于"让车走的中心线走向。


在 Apollo 9.0 中，“绝对地图中心”（更准确地说是 HDMap 车道中心线，Lane Central Curve）和“参考线中心”（Reference Line）是两个在不同阶段服务于自动驾驶的底层核心概念。


HDMap 车道中心线是高精地图里“静态、死板、未经打磨”的地理底座；而 Reference Line 则是规划模块（Planning）在车道中心线的基础上，结合车辆状态、交通规则、并经过数学平滑后生成的“动态、丝滑、直接用于控制优化”的局部导航线。也就是红色线!


Planning Trajectory（规划轨迹）：代表当前周期自车实际准备开过去的路线。当车辆避障、变道时，轨迹线会偏离参考线。

GetOffsetToMap 返回的是 地图车道中心线相对于 Reference Line 的偏移（正值=车道中心在参考线左边），






---
