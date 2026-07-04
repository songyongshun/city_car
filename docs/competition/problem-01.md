
国赛赛题-2

I0625 09:38:27.987159 17871 lane_follow_map.cc:769] Lane_1740, add length: 29.8873, router_s: 97.6036, end_s: 180
I0625 09:38:27.987205 17871 lane_follow_map.cc:769] Lane_1737, add length: 0.650751, router_s: 98.2544, end_s: 180
I0625 09:38:27.987213 17871 lane_follow_map.cc:769] Lane_1745, add length: 21.3162, router_s: 119.571, end_s: 180
I0625 09:38:27.987219 17871 lane_follow_map.cc:769] Lane_1739, add length: 0.650735, router_s: 120.221, end_s: 180
I0625 09:38:27.987226 17871 lane_follow_map.cc:769] Lane_1744, add length: 21.1863, router_s: 141.408, end_s: 180
I0625 09:38:27.987231 17871 lane_follow_map.cc:769] Lane_1743, add length: 0.650756, router_s: 142.058, end_s: 180
I0625 09:38:27.987236 17871 lane_follow_map.cc:769] Lane_1748, add length: 26.0606, router_s: 168.119, end_s: 180
I0625 09:38:27.987241 17871 lane_follow_map.cc:769] Lane_1747, add length: 11.881, router_s: 180, end_s: 180

是全部lane的信息。

I0625 09:38:28.382149 17864 speed_decider.cc:63] speed: 0, slope: 2
I0625 09:38:28.382179 17864 speed_decider.cc:63] speed: 2.7, slope: 1
I0625 09:38:28.382189 17864 speed_decider.cc:63] speed: 5.4, slope: 0.75
I0625 09:38:28.382197 17864 speed_decider.cc:63] speed: 8.1, slope: 0.5

把排序后的“车速-斜率”表以 AINFO 级别打印到日志中。在调试时，如果发现跟车过近或过远，工程师可以通过查阅启动日志，确认这一帧加载的跟车控制参数是否符合预期。 并不是当前的速度。

I0625 09:38:28.461553 17864 scenario.cc:97] Create stage LANE_FOLLOW_STAGE
可以查看经过了哪些scenario.

reference_line是从车身后面开始的，红色粗线需要打开。

I0625 11:10:54.791877 80909 path_generation.cc:124] Plan at the starting point: x = 424041.970000, y = 4437922.990000, and angle = 0.001946

这是真正的path开始点.

  AINFO << "[LANE_FOLLOW] init_sl_state: s=" << init_sl_state_.first[0]
        << ", ds=" << init_sl_state_.first[1]
        << ", dds=" << init_sl_state_.first[2]
        << ", l=" << init_sl_state_.second[0]
        << ", dl=" << init_sl_state_.second[1]
        << ", ddl=" << init_sl_state_.second[2];

参数说明：s（纵向位置）、l（横向偏移）、ds（纵向速度）、dl（横向速度变化率）。

s是从reference line起点开始算的，l就是相对于reference line的横向偏移，最开始不一定是0，可能有一点点偏移.

分析发现最大左偏0.8 m.

  if (!DecidePathBounds(&candidate_path_boundaries)) {
  这一段会调用,并输出日志:
I0626 06:58:47.052677  9397 path_bounds_decider_util.cc:650] curr_s: 49.6671, offset_to_lane_center: 0.362028, curr_lane_left_width: 2.10792, curr_lane_right_width: 2.10775

这一段是冗余代码。

reference_line.GetLaneWidth 返回的并不是以“车道中心线”为基准的左右宽度，它返回的已经是相对于当前规划参考线（Reference Line）的左右物理边界距离。

既然地图吐出来的已经是相对于参考线的宽度，代码里却以为这是相对于车道中心的宽度，于是强行执行了：

```c++
curr_lane_left_width += offset_to_lane_center;   // 1.74588 + 0.362033 = 2.10791
curr_lane_right_width -= offset_to_lane_center;  // 2.46978 - 0.362033 = 2.10775
```

```
```

这一步加减法，硬生生地把原本已经是参考线坐标系的数据，强行扭回了对称的“车道中心坐标系”。
Step 3 又做了一次转换：

```c++
double offset_to_map = 0.0;
reference_line.GetOffsetToMap(curr_s, &offset_to_map); // 这个值通常和 offset_to_lane_center 是一样的

curr_left_bound = curr_lane_left_width - offset_to_map;    // 2.10791 - 0.362033 = 1.74588
curr_right_bound = -curr_lane_right_width - offset_to_map; // -2.10775 - 0.362033 = -2.46978
```

又把这个偏离量给减了回去

在经历了 Step 1 的“错误修正”和 Step 3 的“再次反向修正”后，最终算出来的 curr_left_bound（1.74588）和 curr_right_bound（2.46978）和地图刚吐出来的原始数据对上了。

编译后，不需要关闭dreamview，也是重启planning模块按钮即可！
最好在dreamview里先关闭planning，然后再aem bootstrap stop.

障碍物部分输出的理解:
(left_bound.l + right_bound.l) / 2.0
参考线l=0.
左边1.74, 右边是-2.46.
相加/2=-0.36  

也就是-0.36是车道中心线.
所以center_l是可以走的lane里的center.

接下来是optimize:

明白日志是一帧一帧的，这样就可以判断是哪一帧frame出问题，从而排查了!

E0626 10:01:20.601967 24605 on_lane_planning.cc:598]
planner failed to make a driving plan

极少帧会出现该error，大部分都可以成功的.
可能是性能计算超时 (Timeout).

debug:
475帧失败.
I0626 12:06:27.664113 34017 planning_base.cc:140] get_width_of_lane: 1, left_width: 2.51414, right_width: 1.70552
跟dreamview里的图片反应的一致，太靠右了.

![apollo1](../../../../../AppData/Local/nvim/lua/plugins/assets/2026-06-26-14-55-47.png)

搜索是446帧开始的.

I0626 12:06:22.434981 34018 lane_follow_path.cc:175] not in self lane maybe lane borrow or out of road. init l : -0.672233, path_bound l: [ -0.66802,1.44413 ]
具体错误是这个.
I0626 12:06:22.433284 34018 lane_follow_path.cc:60] [LANE_FOLLOW] init_sl_state: s=49.7605, ds=2.20703, dds=0.0482067, l=-0.672233, dl=0.047584, ddl=0.0163089

检查确实是这样的.

搜索returns error
E0626 16:52:27.496526 47501 scenario.cc:107] Stage 'LANE_FOLLOW_STAGE' returns error

u型弯道：是在I0626 16:52:27.497161 47501 on_lane_planning.cc:462] Planning end frame sequence id = [1216]

I0626 16:52:27.454629 47501 lane_follow_path.cc:175] not in self lane maybe lane borrow or out of road. init l : 0.799669, path_bound l: [ -1.61681,0.777202 ]
是太靠左了，也是符合的。

这次是
I0626 19:00:33.816154 59277 on_lane_planning.cc:462] Planning end frame sequence id = [408]
I0626 19:00:33.816708 59277 planning_base.cc:140] get_width_of_lane: 1, left_width: 1.82082, right_width: 2.64062
lane 还是 4米多的.

// 在 GetBoundaryFromSelfLane() 中，加入弯道缓冲偏移
// 将第 657-658 行的
curr_left_bound  = curr_lane_left_width  - offset_to_map;
curr_right_bound = -curr_lane_right_width - offset_to_map;
// 改为
curr_left_bound  = curr_lane_left_width  - offset_to_map + FLAGS_curve_lane_soft_buffer;
curr_right_bound = -curr_lane_right_width - offset_to_map - FLAGS_curve_lane_soft_buffer;

31帧的时候，l_weight切换了?
哦，是进入了yeild_sign scenario

l4520:
I0626 18:59:54.326933 59290 path_optimizer_util.cc:161] l_weight: 10, dl_weight: 50, ddl_weight: 500, dddl_weight: 5000

l4588
I0626 18:59:54.417788 59283 on_lane_planning.cc:330] Planning start frame sequence id = [32]
l4601
I0626 18:59:54.423785 59283 lane_change_path.cc:493] lane change update fromstatus: CHANGE_LANE_FINISHED

l4648:
I0626 18:59:54.424613 59283 path_optimizer_util.cc:161] l_weight: 1, dl_weight: 20, ddl_weight: 1000, dddl_weight: 50000

l56636:
I0626 19:00:33.892204 59286 lane_follow_path.cc:175] not in self lane maybe lane borrow or out of road. init l : 0.775748, path_bound l: [ -1.60545,0.770091 ]

l56699:
E0626 19:00:34.063706 59286 scenario.cc:107] Stage 'LANE_FOLLOW_STAGE' returns error

l55526:
I0627 10:11:10.347609  7704 path_optimizer_util.cc:161] l_weight: 10, dl_weight: 50, ddl_weight: 500, dddl_weight: 5000
l55593:
I0627 10:11:10.489764  7704 on_lane_planning.cc:462] Planning end frame sequence id = [404]

l55651:
I0627 10:11:10.496023  7704 lane_follow_path.cc:175] not in self lane maybe lane borrow or out of road. init l : 0.778388, path_bound l: [ -1.61687,0.77746 ]

l55677:
I0627 10:11:10.496876  7704 path_optimizer_util.cc:161] l_weight: 1, dl_weight: 20, ddl_weight: 1000, dddl_weight: 50000

l55723:
I0627 10:11:10.648181  7704 on_lane_planning.cc:462] Planning end frame sequence id = [405] [
