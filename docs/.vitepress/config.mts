import { defineConfig } from 'vitepress'

// https://vitepress.dev/reference/site-config
export default defineConfig({
  title: "apollo project",
  description: "A VitePress Site",
  themeConfig: {
    // https://vitepress.dev/reference/default-theme-config
    search: {
      provider: 'local'
    },
    nav: [
      { text: 'Home', link: '/' },
      { text: 'Courses', link: '/courses' },
      { text: 'courses相关', link: '/courses-related' }
    ],

    sidebar: {
      '/courses/': [
        {
          text: 'Courses',
          items: [
            { text: 'Chapter 01: 智能汽车配置实验指导', link: '/courses/chapter-01' },
            { text: 'Chapter 02: 智能汽车图像感知实验指导', link: '/courses/chapter-02' },
            { text: 'Chapter 03: 图像采集实验指导', link: '/courses/chapter-03' },
            { text: 'Chapter 04: 相机标定与图像校正实验指导', link: '/courses/chapter-04' },
            { text: 'Chapter 05: 赛道图像的透视变换实验指导', link: '/courses/chapter-05' },
            { text: 'Chapter 06: 赛道图像预处理实验指导', link: '/courses/chapter-06' },
            { text: 'Chapter 07: 赛道元素识别模型训练实验指导', link: '/courses/chapter-07' },
            { text: 'Chapter 08: 赛道与环岛识别实验指导', link: '/courses/chapter-08' },
            { text: 'Chapter 09: 十字路口与车库识别实验指导', link: '/courses/chapter-09' },
            { text: 'Chapter 10: 智能汽车 AI 模型部署实验指导', link: '/courses/chapter-10' },
            { text: 'Chapter 11: 基于 AI 的赛道元素检测与识别实验 1——农田检测', link: '/courses/chapter-11' },
            { text: 'Chapter 12: 基于 AI 的赛道元素检测与识别实验 2——粮仓与维护区检测', link: '/courses/chapter-12' },
            { text: 'Chapter 13: 基于 AI 的赛道元素检测与识别实验 3——坡道与减速区检测', link: '/courses/chapter-13' },
            { text: 'Chapter 14: 智能汽车控制与决策实验指导', link: '/courses/chapter-14' }
          ]
        }
      ],
      '/courses-related/': [
        {
          text: 'courses相关',
          items: [
            { text: 'Chapter 01: 给项目添加运行日志功能', link: '/courses-related/doc-01' },
            { text: 'Chapter 02: 8080 端口摄像头推流问题排查与解耦', link: '/courses-related/doc-02' },
            { text: 'Chapter 03: saveImg 与 saveIpm 参数', link: '/courses-related/doc-03' },
            { text: 'Chapter 04: Debug 仿真模式使用指南', link: '/courses-related/doc-04' },
            { text: 'Chapter 05: 小车启动流程详解', link: '/courses-related/doc-05' }
          ]
        }
      ]
    },

    socialLinks: [
      { icon: 'github', link: 'https://github.com/vuejs/vitepress' }
    ]
  }
})
