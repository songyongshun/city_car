---
title: "Apollo 平台入门"
collection: teaching
type: "Undergraduate course"
permalink: /teaching/2025-autumn-teaching/apollo-chapter-1
venue: "常州工业职业技术学院, 信息工程学院"
date: 2025-09-01
location: "Changzhou, China"
---

# 赛题一解答

```bash
vi /apollo_workspace/modules/planning/scenarios/traffic_light_unprotected_right_turn/conf/scenario_conf.pb.txt
# change false to true
enable_right_turn_on_red: true
```

运行的时候，在场景红绿灯2里，发现进入的是protected，而不是unproctected，是因为地图lane没有属性right_turn.

查看
```bash
vi /apollo_workspace/modules/planning/scenarios/traffic_light_unprotected_right_turn/traffic_light_unprotected_right_turn_scenario.cc
# 定位到
  if (turn_type != hdmap::Lane::RIGHT_TURN) 
# 在获取地图lane的属性，而该地图的lane并没有标记，因此无法进入该scenario.
```

修改思路是除了判断lane的属性，还应该根据route路径进行判断。
```c++
  if (turn_type != hdmap::Lane::RIGHT_TURN) {
    AINFO << "RightTurnScenario CHECK: turn_type not RIGHT_TURN, "
          << "trying routing-based right turn detection";
    if (!IsRightTurnByRouting(frame, traffic_sign_overlap->start_s)) {
      AINFO << "RightTurnScenario REJECT: routing does not indicate right turn";
      return false;
    }
    AINFO << "RightTurnScenario CHECK: routing indicates right turn";
  }
  AINFO << "RightTurnScenario ACCEPT: entering right turn scenario";
  context_.current_traffic_light_overlap_ids.clear();
  for (const auto& overlap : next_traffic_lights) {
    context_.current_traffic_light_overlap_ids.push_back(overlap.object_id);
  }

```
IsRightTurnByRouting的实现为

```c++
bool TrafficLightUnprotectedRightTurnScenario::IsRightTurnByRouting(
    const Frame& frame, double traffic_light_start_s) const {
  // --- Approach: Use reference line heading comparison ---
  // The reference line already follows the turn from routing.
  // Compare heading before vs well after the traffic light to detect right turn.
  const auto& reference_line_info = frame.reference_line_info().front();
  const auto& reference_line = reference_line_info.reference_line();
  const double reference_line_length = reference_line.Length();

  // Measure heading at two points:
  //  - s_before: 5m before the traffic light (approach)
  //  - s_after:  20m after the traffic light (post-intersection)
  static constexpr double kLookbackDist = 5.0;
  static constexpr double kLookforwardDist = 20.0;

  const double s_before =
      std::max(0.0, traffic_light_start_s - kLookbackDist);
  const double s_after = std::min(reference_line_length,
                                  traffic_light_start_s + kLookforwardDist);

  // Need at least 10m separation for meaningful heading comparison
  if (s_after - s_before < 10.0) {
    AINFO << "IsRightTurnByRouting: reference line too short ("
          << (s_after - s_before) << "m) for heading comparison";
    return false;
  }

  auto ref_point_before = reference_line.GetReferencePoint(s_before);
  auto ref_point_after = reference_line.GetReferencePoint(s_after);

  double heading_before = ref_point_before.heading();
  double heading_after = ref_point_after.heading();

  // Compute heading difference normalized to [-pi, pi]
  double diff = heading_after - heading_before;
  while (diff > M_PI) diff -= 2.0 * M_PI;
  while (diff < -M_PI) diff += 2.0 * M_PI;

  const double diff_deg = diff * 180.0 / M_PI;

  AINFO << "IsRightTurnByRouting: s_before=" << s_before
        << " heading=" << heading_before
        << " s_after=" << s_after
        << " heading=" << heading_after
        << " diff_deg=" << diff_deg;

  // A right turn: heading change in [-135, -30] degrees
  // (negative means clockwise turn in standard math / ENU coordinate)
  static constexpr double kRightTurnMinDeg = -135.0;
  static constexpr double kRightTurnMaxDeg = -30.0;

  if (diff_deg >= kRightTurnMinDeg && diff_deg <= kRightTurnMaxDeg) {
    AINFO << "IsRightTurnByRouting: RIGHT TURN detected ("
          << diff_deg << " deg)";
    return true;
  }

  AINFO << "IsRightTurnByRouting: not a right turn ("
        << diff_deg << " deg)";
  return false;
}
```

由于使用了cmath，需要添加
```c++
#include <cmath>
```

此外，库文件添加

```bash
vi /apollo_workspace/modules/planning/scenarios/traffic_light_unprotected_right_turn/traffic_light_unprotected_right_turn_scenario.h
```

```c++
  bool IsRightTurnByRouting(const Frame& frame,
                            double traffic_light_start_s) const;
```


主车停止距离修改profile即可。

```c++
vi /apollo_workspace/profiles/default/modules/planning/traffic_rules/traffic_light/conf/default_conf.pb.txt

# 修改stop_distance
stop_distance: 1.7  #原始是1.0
```

需要重新编译运行。

---