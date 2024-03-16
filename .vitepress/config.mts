import {defineConfig} from 'vitepress'

// https://vitepress.dev/reference/site-config
export default defineConfig({
    lang: 'en-US',
    title: "JustMe.dev",
    description: "JustMe.dev Developer Blog - Jonny van der Hoeven",
    cleanUrls: true,
    markdown: {
        image: {
            lazyLoading: true
        }
    },
    lastUpdated: true,
    themeConfig: {
        logo: {
            light: '/logo.png',
            dark: '/logo_dark.png',
            alt: 'JH',
        },
        editLink: {
            pattern: 'https://github.com/jonnyhoeven/justme.dev/edit/main/:path'
        },
        search: {
          provider: 'local'
        },
        nav: [
            {text: 'Home', link: '/'},
            {text: 'Projects', link: '/projects'},
            {text: 'Blog', link: '/blog'}
        ],
        socialLinks: [
            {icon: 'github', link: 'https://github.com/jonnyhoeven'},
            {icon: 'linkedin', link: 'https://www.linkedin.com/in/jonnyhoeven/'},
            {
                icon: {
                    svg: '<img src="/google.png" style="height:17pt;"/>',
                },
                link: 'https://g.dev/jonnyvanderhoeven'
            },
        ],
        sidebar: {
            '/posts/': [
                {
                    text: 'Blog',
                    items: [
                        {text: 'All Posts', link: '/blog'},
                        {text: 'Latest Post', link: '/blog/latest-post'},
                        {text: 'Second Post', link: '/blog/second-post'}
                    ],
                }
            ]
        },
        footer: {
            message: 'Released under the MIT License.',
            copyright: 'Copyright © 2024 Jonny van der Hoeven',
        },
    },
    sitemap: {
        hostname: 'https://justme.dev'
    }
})
