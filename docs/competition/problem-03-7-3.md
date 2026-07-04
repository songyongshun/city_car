I0703 09:49:03.703569 45907 lane_borrow_path.cc:690] Obstacle found: id[2070] perception_id[2070] position[x=424022, y=4.43761e+06] dist_to_adc[euclidean=53.6451, sl=49.7503]] lane_id[Lane_1711] sl_boundary[start_s=103.666, end_s=103.867, start_l=-0.540361, end_l=-0.339975]


frame 70帧发现距离在35m 以内.

I0703 09:49:08.197924 45904 lane_borrow_path.cc:690] Obstacle found: id[28585] perception_id[28585] position[x=424022, y=4.43761e+06] dist_to_adc[euclidean=38.6383, sl=34.74]] lane_id[Lane_1711] sl_boundary[start_s=88.9051, end_s=89.1055, start_l=-0.540361, end_l=-0.339975]


lane_1710(左边车道), lane_1711(原始车道)
发现检查了车道线, dotted line.

确定最前面的两个障碍物是：
43052:
position[x=424022, y=4.43761e+06] dist_to_adc[euclidean=54.8342, sl=50.9304]
2070:
position[x=424022, y=4.43761e+06] dist_to_adc[euclidean=54.8249, sl=50.9332]


重新来过后是第3帧就发现了，距离50m以上。

11 帧:
obstacle 43052 will collision at:
x: 424019.08650332852, y: 4437609.85898263

14帧，判断为longterm
2070.

70帧，判断为nonmovable.
此时距离为33m.


64帧:
速度最大：
I0703 11:45:52.887771 60694 lane_borrow_path.cc:442] IsWithinSidePassingSpeedADC[true] speed[3.99202] max_speed[5]
距离还大于35m，但为什么开始减速了。

70帧，开始变道：

不过这两帧时间差别不大，1秒也就差个几米。

减速的逻辑跟变道是独立的.




