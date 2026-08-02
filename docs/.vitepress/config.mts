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
      { text: 'courses相关', link: '/courses-related' },
      { text: '比赛', link: '/competition' }
    ],

    sidebar: {
      '/courses/': [
        {
          text: 'Courses',
          items: [
            { text: 'Chapter 01: Apollo 平台安装', link: '/courses/chapter-01' },
            { text: 'Chapter 02: Apollo 系统架构详解', link: '/courses/chapter-02' },
            { text: 'Chapter 03: Apollo 与车路协同', link: '/courses/chapter-03' }
          ]
        }
      ],
      '/courses-related/': [
        {
          text: 'courses相关',
          items: [
            { text: 'Chapter 01: aem', link: '/courses-related/doc-01' },
            { text: 'Chapter 02: buildtool: core', link: '/courses-related/doc-02' },
            { text: 'Chapter 03: buildtool: module', link: '/courses-related/doc-03' },
            { text: 'Chapter 04: bazel', link: '/courses-related/doc-04' },
            { text: 'Chapter 05: dreamview++', link: '/courses-related/doc-05' }
          ]
        }
      ],
      '/competition/': [
        {
          text: '比赛',
          items: [
            { text: 'Chapter 01: 赛题一解答', link: '/competition/chapter-01' },
            { text: 'Chapter 02: 赛题二解答', link: '/competition/chapter-02' },
            { text: 'Chapter 03: 赛题三解答', link: '/competition/chapter-03' }
          ]
        }
      ]
    },

    socialLinks: [
      { icon: 'github', link: 'https://github.com/vuejs/vitepress' }
    ]
  }
})
