# understand the L2 code

## lane_borrow_path.cc

- LaneBorrowPath::DecidePathBounds
  - DecidePathBounds(&candidate_path_boundaries)，这里的candidate_path_boundaries是多条路径.
  - bool LaneBorrowPath::IsNecessaryToBorrowLane() 这里对decided_side_pass_direction_进行赋值.
  - for (size_t i = 0; i < decided_side_pass_direction_.size(); i++),
    说明decided_side_pass_direction_可以多个值，但原文件只赋值了一个，说明留了L2的选项。
  - path_bound 是一个 PathBoundary对象.
  GetBoundaryFromNeighborLane(decided_side_pass_direction_[i],
                                     &path_bound, &borrow_lane_type)

- GetBoundaryFromNeighborLane
  - ReferencePoint: 
    继承自 hdmap::MapPathPoint，用于表示路径上的一个参考点，并额外存储了曲率信息.
    double heading_
    还包括一个LaneWayPoint结构体, 有s,l,lane
    其中lane的类型是LaneInfoConstPtr.
    using LaneInfoConstPtr = std::shared_ptr<const LaneInfo>;
    LaneInfo class, 有lane_.id(), road_id_等.
  - reference_points_: 是一系列参考点，对应一条路径
    std::vector<ReferencePoint> reference_points_;
  - reference_line, 就是参考线，包括各个点referencePoint
  - lanewaypoint()函数，返回std::vector<LaneWaypoint>&
    同一个 MapPathPoint 可能关联到多个车道，因此它可以持有多个 LaneWaypoint。
    *l_offset = ref_point.lane_waypoints().front().l;
    但返回的l_offset只是第一个元素的l

  - ReferenceLine::GetLaneWidth
  虽然参数只有s，但会通过s访问waypoint()函数获取车道中心距离左右的距离.
    reference_line.GetOffsetToMap(curr_s, &offset_to_lane_center);
    这里修正后，就是实际参考线左右车道的距离了.

  - reference_line_info_->GetNeighborLaneInfo(
              forward_type, curr_s, &neighbor_lane_id,
              &curr_neighbor_lane_width)
    获取了邻车道lane_width.
    l2_wp可以通过hdmap::LeftNeighborWaypoint(l1_wp)获取.

- 参考线生成逻辑
  - 先根据路由和高清地图生成参考线.
  - lane_follow里，pathboundsdecider，根据参考线，障碍物，得到可行驶边界
  - optimizepath，根据pathbounds，来优化，参数有偏离参考线代价，横向速度代价，横向加速度代价，加加速度(jerk)

  - ReferenceLineInfo里，不只有参考线的信息，还有path_data_的信息，也就是assess之后选择的path.
  candidate_path_data_是各task选出来的，没有经过assess.
  - path_bound->at(i), 第i 个point. 
  - towing_l: 不是硬约束. 
    double l2_center = path_boundary[i].towing_l;
    作为l2_center. 
    ref_l[i] = l2_center;
    我测试发现值就是l2的几何center. offset_to_map的值是0.

- DecidePathBounds很重要
  - 先    if (!GetBoundaryFromNeighborLane(decided_side_pass_direction_[i],
                                     &path_bound, &borrow_lane_type)) {
  得到path_bound.
  - L2借道的时候，利用towing_l，添加权重，来保证adc在l2_center上.

- dreamview_plus的显示
  - trajectory, 青色, 粗0.8
  - reference_line: 红色, 粗0.8
  - default，金橙色， 0.1
  - candidate_path/self, 亮黄色, 0.1 


- /apollo_workspace/modules/planning/planning_base/common/path_boundary.h
  - PathBoundPoint: 存储了特定s对应的l_lower, l_upper.
  - PathBound: 多个s，可能代表一条路径

- prefer_deep_borrow的作用
    if (prefer_deep_borrow_) {
              // Dense scene: commit to L2 only, do not fall back to L1.
              decided_side_pass_direction_.push_back(
                  SidePassDirection::LEFT_BORROW_L2);
            } else {
              decided_side_pass_direction_.push_back(
                  SidePassDirection::LEFT_BORROW);
              decided_side_pass_direction_.push_back(
                  SidePassDirection::LEFT_BORROW_L2);
            }
    这样没有L1作为candidate了
