import { defineConfig } from 'vitepress'

// https://vitepress.dev/reference/site-config
export default defineConfig({
  title: "My Awesome Project",
  description: "A VitePress Site",
  themeConfig: {
    // https://vitepress.dev/reference/default-theme-config
    search: {
      provider: 'local'
    },
    nav: [
      { text: 'Home', link: '/' },
      { text: 'Courses', link: '/courses' },
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
      '/competition/': [
        {
          text: '比赛',
          items: [
            { text: 'Chapter 01: Apollo 平台安装', link: '/competition/chapter-01' },
            { text: 'Chapter 02: Apollo 系统架构详解', link: '/competition/chapter-02' },
            { text: 'Chapter 03: Apollo 与车路协同', link: '/competition/chapter-03' }
          ]
        }
      ]
    },

    socialLinks: [
      { icon: 'github', link: 'https://github.com/vuejs/vitepress' }
    ]
  }
})
