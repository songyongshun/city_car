# debug 什么时候planning意外退出

关键要点

- left borrow开始帧数: 160
- obstacle 93028在哪个lane的obstacle.
  - 还是在lane1711: obs l: 1.41245, 1.61245

- 在lane1710车道的obstacle
  - id 14533, obs l: 6.89505, 7.09505
  - line 77422, frame 160.
  - 也就是frame 160决定借道的时候，就看到了左侧lane上的obstacle!

- leftforward_ref_l有问题, 部分出现了100.00的数值.
  - 分析原因，发现是因为right nudge和left nudge的判定，还是根据当前的reference line，而不是当前的车道.
  - 修改为10，但仍热不行，错误出现在其他进程，导致该进程意外退出.

# debug另外一种思路

- 当检测到前方有障碍物的时候，立即减速.
