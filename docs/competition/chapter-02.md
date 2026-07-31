# 赛题介绍
| 赛题序号 | 赛题名称 | 赛题描述 | 评分标准 |
| --- | --- | --- | --- |
| 赛题二 | xh_2026_变道场景 | 主车在当前车道行驶，前方遇障碍物或车道占用，需变更至相邻车道通行。变道前，主车需观察目标车道后方来车情况，确认安全后完成变道。变道过程中需保持与前后车辆的安全距离，与后车保持安全跟车距离。变道区域限速 30km/h。 | 主车在规定时间内未完成相关任务，本场景分计 0 分；主车与障碍物或周围环境发生碰撞，该场景得 0 分；主车变道区域未限速，速度每超速 1m/s，本场景每帧扣 2 分；主车连续变道（一次跨越多条车道），扣 40 分。 |

# 赛题二解答

修改的文件
1. /apollo_workspace/modules/planning/planning_base/gflags/planning_gflags.h（第 51 行）
新增 gflag 的声明：
```c++
DECLARE_double(lane_change_max_speed);
```

2. /apollo_workspace/modules/planning/planning_base/gflags/planning_gflags.cc（第 81-84 行）
新增 gflag 的定义（默认值 8.33 m/s ≈ 30 km/h）：
```c++
DEFINE_double(lane_change_max_speed, 8.33,
              "Maximum speed (m/s) allowed for lane change. "
              "Default 8.33 m/s ≈ 30 km/h. If current speed exceeds this, "
              "lane change will be deferred until speed drops below.");
```

3. /apollo_workspace/modules/planning/tasks/lane_change_path/lane_change_path.cc（第 80-89 行）
在 Process() 方法中，状态检查通过后、开始规划路径之前，增加速度检查：

```c++
  // Check speed limit for lane change
  double ego_v =
      std::abs(reference_line_info->vehicle_state().linear_velocity());
  if (ego_v > FLAGS_lane_change_max_speed) {
    AINFO << "Lane change deferred: current speed " << ego_v
          << " m/s exceeds lane change max speed "
          << FLAGS_lane_change_max_speed << " m/s (≈ 30 km/h). "
          << "Slowing down before attempting lane change.";
    // Cap the cruise speed on this reference line so the fallback
    // speed planner generates a deceleration profile, allowing the vehicle
    // to drop below the threshold before the next lane-change attempt.
    reference_line_info->LimitCruiseSpeed(FLAGS_lane_change_max_speed);
    // Also apply the same cap to every other reference line currently held
    // by the frame (in particular the in-lane reference line that controls
    // the actual fallback speed planning). Without this, the in-lane
    // reference line keeps its original cruise speed and the vehicle never
    // actually decelerates between planning cycles.
    for (auto& rli : *frame_->mutable_reference_line_info()) {
      rli.LimitCruiseSpeed(FLAGS_lane_change_max_speed);
    }
    AINFO << "Applied lane-change speed cap "
          << FLAGS_lane_change_max_speed << " m/s to all "
          << frame_->reference_line_info().size()
          << " reference line(s).";
    return Status(ErrorCode::PLANNING_ERROR, "Speed too high for lane change");
  }
```


工作原理
1. 当路由或决策层发起变道请求时，LaneChangePath::Process() 会被调用
2. 首先通过 UpdateLaneChangeStatus() 更新变道状态机
3. 然后检查 status == ChangeLaneStatus::IN_CHANGE_LANE（确定正在变道中）
4. 新增检查：获取当前车速 ego_v，如果 ego_v > lane_change_max_speed (8.33 m/s ≈ 30km/h)：
   - 打印 AINFO 日志（说明当前速度、阈值、正在减速）
   - 返回 PLANNING_ERROR，延迟变道

可配置性
该阈值可通过 gflag 动态修改，无需重新编译即可在 planning.conf 中配置：
--lane_change_max_speed=8.33   # 默认 30 km/h

---