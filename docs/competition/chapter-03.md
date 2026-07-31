# 赛题三
| 赛题序号 | 赛题名称 | 赛题描述 | 评分标准 |
| --- | --- | --- | --- |
| 赛题三 | xh_2026_S弯场景 | 主车向前行驶进入 S 弯区域，该路段为连续弯道，道路较为狭窄。主车需要保持平滑轨迹通过 S 弯区域，限速 30km/h。如前方有障碍物，主车需安全评估后绕行通过，绕行过程中需保持与障碍物的安全横向距离，确保安全通行，避免与周围环境发生碰撞。 | 主车在规定时间内未完成相关任务，本场景分计 0 分；主车如果与障碍物或周围环境发生碰撞，该场景得 0 分；主车通过 S 弯区域时未限速，速度每超速 1m/s，本场景每帧扣 2 分；主车绕行障碍物时横向距离不足，扣 20 分。 |


# 解答思路

## 修改文件概览

| 文件 | 修改行数 |
|------|---------|
| `modules/planning/planning_interface_base/task_base/common/path_util/path_bounds_decider_util.cc` | +95 行 |
| `modules/planning/planning_interface_base/task_base/common/path_util/path_bounds_decider_util.h` | +6 行 |
| `modules/planning/tasks/lane_borrow_path/lane_borrow_path.cc` | +242 行 |
| `modules/planning/tasks/lane_borrow_path/lane_borrow_path.h` | +12 行 |

## 修改内容总结

本次修改主要为支持 **L2（第二层）借道**（double lane borrowing）功能。主要内容如下：

### 1. LaneBorrowPath（借道路径规划）

- **枚举扩展**：`SidePassDirection` 新增两个值：
  - `LEFT_BORROW_L2 = 3` — 向左借道两车道
  - `RIGHT_BORROW_L2 = 4` — 向右借道两车道
- **成员变量**：新增 `l2_left_borrow_`、`l2_right_borrow_`、`has_l2_right_nudge_obs_` 三个布尔变量，用于记录 L2 借道状态。
- **借道方向决策逻辑增强**：
  - 根据当前车道及相邻车道的障碍物情况，决定是否尝试 L1 或 L2 借道。

- **方向决策队列**:
  - 根据检测结果决定候选方向队列：

  | 条件 | 队列内容 |
  |------|----------|
  | 左可借 **且** `l2_left_borrow_ == true`（密集场景） | `[LEFT_BORROW_L2]` 仅 L2，无 L1 回退 |
  | 左可借 **且** `l2_left_borrow_ == false` | `[LEFT_BORROW, LEFT_BORROW_L2]` L1 优先，L2 回退 |
  | 右可借 **且** `l2_right_borrow_ == true`（密集场景） | `[RIGHT_BORROW_L2]` 仅 L2，无 L1 回退 |
  | 右可借 **且** `l2_right_borrow_ == false` | `[RIGHT_BORROW, RIGHT_BORROW_L2]` L1 优先，L2 回退 |

  > **关键点**：密集场景（障碍物同时占据当前车道和邻车道）下，L1 借道空间不足，直接提交 L2 借道，不添加 L1 作为回退选项。

- **L2 邻车道宽度获取**:
  - 对于 L2 借道方向，在获取 L1 邻车道宽度后，额外通过 `hdmap` 获取 L2 车道宽度：
    ```cpp
    // 获取 L1 车道 waypoint
    auto l1_wp = is_left ? hdmap::LeftNeighborWaypoint(wp)
                        : hdmap::RightNeighborWaypoint(wp);
    // 从 L1 再获取 L2 车道 waypoint
    auto l2_wp = is_left ? hdmap::LeftNeighborWaypoint(l1_wp)
                        : hdmap::RightNeighborWaypoint(l1_wp);
    // 累加 L2 宽度到路径边界
    path_bound[i].l_upper.l += l2_width;  // 左借
    // 或
    path_bound[i].l_lower.l -= l2_width;  // 右借
    ```
- **路径标签**:
  ```
  L1: "regular/left/forward" 或 "regular/right/forward" 或 reverse
  L2: "regular/left/l2/forward" 或 "regular/right/l2/forward" 或 reverse
  ```
  - 标签中带 `/l2` 表示这是 L2 借道路径。

- **L2 边界微调**：
  - 在 `DecidePathBounds()` 中，当路径边界标签包含 `/l2` 时，对边界进行**右侧偏移微调**：

  ```cpp
  if (label.find("/l2") != std::string::npos) {
    double corridor_width = bound.l_upper.l - bound.l_lower.l;
    double left_margin = bound.l_upper.l - (bound.l_upper.l + bound.l_lower.l) / 2.0;
    // 向右偏移最多 0.3m，不超过可用左侧空间的 20%
    double shift = std::min(0.3, left_margin * 0.2);
    bound.l_lower.l += shift;  // 将下边界右移
  }
  ```
  - 目的：让优化后的路径**远离右侧障碍物**（当前车道侧的障碍物），同时**尽可能靠近 L2 车道中心**.

### 2. PathBoundsDeciderUtil（路径边界决策工具）

- **函数签名扩展**:

  - `GetBoundaryFromStaticObstacles`
  ```cpp
  static bool GetBoundaryFromStaticObstacles(
      const ReferenceLineInfo& reference_line_info,
      std::vector<SLPolygon>* const sl_polygons, const SLState& init_sl_state,
      PathBoundary* const path_boundary, std::string* const blocking_obstacle_id,
      double* const narrowest_width,
      bool* has_l2_right_nudge_obs = nullptr);  // ← 新增参数
  ```
  - `UpdatePathBoundaryBySLPolygon`
  ```cpp
  static bool UpdatePathBoundaryBySLPolygon(
      const ReferenceLineInfo& reference_line_info,
      std::vector<SLPolygon>* const sl_polygon, const SLState& init_sl_state,
      PathBoundary* const path_boundary, std::string* const blocked_id,
      double* const narrowest_width,
      bool* has_l2_right_nudge_obs = nullptr);  // ← 新增参数
  ```

  > **说明**：`has_l2_right_nudge_obs` 为可选输出参数，默认 `nullptr`。当传入非空指针时，如果 L2 场景下左侧障碍物要求必须靠右行驶时，该参数会被设置为 `true`，供上层调用者（如 `LaneBorrowPath`）使用。

- **L2 路径检测**:
  - 通过路径边界标签判断是否为 L2 借道场景：

  ```cpp
  if (path_boundary->label().find("/l2") == std::string::npos) {
      // 非 L2 路径 → 标准逻辑
      last_max_nudge_l = *std::max_element(begin_it, center_l.end(), ...);
  } else {
      // L2 路径 → 特殊逻辑
      ...
  }
  ```

- **L2 特殊的 `last_max_nudge_l` 计算**:
  - 当路径标签包含 `/l2` 时，根据 `l2_right_nudge_obs` 状态分为两种模式：
    - 模式一：`l2_right_nudge_obs == false`（首次扫描，障碍物探查模式）
    此模式在 L2 场景下首次执行，遍历所有障碍物 SLPolygon，**区分两类障碍物**：
    ```cpp
    for (size_t p_idx = 0; p_idx < sl_polygon->size(); ++p_idx) {
        const auto& polygon = sl_polygon->at(p_idx);
        if (left_bound.l >= polygon.MaxL()) {
            // ① 障碍物在可通行区域内（正常情况）
            max_obs_l = std::max(max_obs_l, polygon.MaxL());
        } else if (polygon.MaxL() > target_obs_max_l) {
            // ② 障碍物超出左边界 → 记录最靠左的障碍物
            target_obs_max_l = polygon.MaxL();
            target_obs_s = polygon.MinS();
            target_obs_id = polygon.id();
        }
    }
    last_max_nudge_l = max_obs_l;
    ```
      **类型 ①**：障碍物在可通行区域内（`left_bound.l >= polygon.MaxL()`），正常记录最大 `MaxL` 值，并赋值给 `last_max_nudge_l`。

      **类型 ②**：障碍物超出左边界（`polygon.MaxL() > left_bound.l`），记录最靠左的障碍物信息

      距离最靠左的障碍物不足10m → 设置 `l2_right_nudge_obs = true`, 开始动态更新`last_max_nudge_l`，确保车辆靠右行驶避让障碍物.

    ```cpp
    if (!target_obs_id.empty()) {
        double adc_s = init_sl_state.first[0];
        if (target_obs_s - adc_s < 10.0) {
            l2_right_nudge_obs = true;  // 标记右侧有需要避让的障碍物
        }
    }
    ```

    - 模式二：`l2_right_nudge_obs == true`（已确认有障碍物需要避让）

    此时使用标准的 `last_max_nudge_l` 计算逻辑（与非 L2 路径相同）.


- **障碍物斜率一致性检查**:

  - 在确定 `last_max_nudge_l` 后、遍历障碍物判定 Nudge 方向之前，对相邻障碍物多边形进行**斜率一致性检查**，确保同一段连续障碍物的 nudge 方向一致：

  ```cpp
  // Check consecutive obstacle nudge direction consistency
  for (size_t p_idx = 1; p_idx < sl_polygon->size(); ++p_idx) {
      const auto& cur = sl_polygon->at(p_idx);
      const auto& prev = sl_polygon->at(p_idx - 1);
      double delta_l = cur.MaxL() - prev.MaxL();
      double delta_s = cur.MinS() - prev.MinS();
      if (std::abs(delta_s) > 1e-6 &&
          std::abs(delta_l / delta_s) < 0.3) {
          // δl/δs < 0.3 → 相邻障碍物横向变化平缓 → 视为连续障碍物
          SLPolygon::NudgeType consistent_nudge;
          if (sl_polygon->at(p_idx - 1).NudgeInfo() !=
              SLPolygon::UNDEFINED) {
              // 前一个已有 nudge 方向 → 沿用
              consistent_nudge = sl_polygon->at(p_idx - 1).NudgeInfo();
          } else {
              // 两者都未定义 → 根据中心位置与 last_max_nudge_l 判定
              double pair_mid_l = (cur.MaxL() + prev.MaxL()) / 2.0;
              consistent_nudge = (last_max_nudge_l < pair_mid_l)
                                    ? SLPolygon::RIGHT_NUDGE
                                    : SLPolygon::LEFT_NUDGE;
          }
          // 将一对相邻障碍物多边形设置为相同 nudge 方向
          sl_polygon->at(p_idx - 1).SetNudgeInfo(consistent_nudge);
          sl_polygon->at(p_idx).SetNudgeInfo(consistent_nudge);
      }
  }
  ```

  - **计算逻辑**：
    - 计算相邻障碍物多边形的横向变化量 `delta_l = cur.MaxL() - prev.MaxL()`
    - 计算纵向变化量 `delta_s = cur.MinS() - prev.MinS()`
    - 若 `|delta_l / delta_s| < 0.3`，说明该段障碍物横向变化平缓（近似平行于参考线），判断为**连续障碍物**
    - 连续障碍物应统一 nudge 方向：
      - 若前一个已有 nudge 信息 → 直接沿用
      - 否则根据两个多边形中心位置与 `last_max_nudge_l` 比较决定
    - 将此 nudge 方向同时设置给两个相邻多边形

    **目的**：避免同一段连续障碍物被分为左/右不同 nudge 方向，导致路径边界出现锯齿状异常。



## 总结流程图

```
┌──────────────────────────────────────────────────────────────────┐
│ GetBoundaryFromStaticObstacles()                                │
│   └── UpdatePathBoundaryBySLPolygon()                           │
│         ├── 初始化参数                                           │
│         ├── 遍历路径点 i (沿 s 方向)                              │
│         │   ├── 判断 label 是否含 "/l2"                          │
│         │   │   ├── 否 → 标准 last_max_nudge_l 计算              │
│         │   │   └── 是 → L2 特殊逻辑                            │
│         │   │       ├── l2_right_nudge_obs == false?             │
│         │   │       │   ├── 遍历所有障碍物多边形                  │
│         │   │       │   │   ├── 障碍物在可通行区域内 → 记录 MaxL  │
│         │   │       │   │   └── 障碍物超出左边界 → 记录最左障碍物 │
│         │   │       │   ├── 前方 10m 内有超界障碍物?             │
│         │   │       │   │   └── 是 → l2_right_nudge_obs = true  │
│         │   │       │   └── last_max_nudge_l = max_obs_l        │
│         │   │       └── l2_right_nudge_obs == true?             │
│         │   │           └── 标准 last_max_nudge_l 计算           │
│         │   ├── 障碍物斜率一致性检查 (δl/δs < 0.3)          │
│         │   │   └── 设置连续障碍物为一致的 nudge 方向        │
│         │   ├── 遍历障碍物多边形 j (沿 s 方向)                   │
│         │   │   ├── 判定 nudge 方向 (LEFT/RIGHT)               │
│         │   │   ├── 更新路径边界 (left_bound / right_bound)     │
│         │   │   ├── 阻塞检测 → 截断                             │
│         │   │   └── 更新 last_max_nudge_l                      │
│         │   │       ├── 非 L2 → 始终更新                       │
│         │   │       ├── L2 + l2_right_nudge_obs → 更新          │
│         │   │       └── L2 + !l2_right_nudge_obs → 跳过更新     │
│         │   └── 阻塞退出 / 继续                                 │
│         └── 返回结果                                            │
└──────────────────────────────────────────────────────────────────┘
```