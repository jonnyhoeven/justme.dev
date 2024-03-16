import {defineConfig} from 'vitepress'

// https://vitepress.dev/reference/site-config
export default defineConfig({
    title: "JustMe.dev",
    description: "Developer Blog",
    cleanUrls: true,
    markdown: {
        image: {
            lazyLoading: true
        }
    },
    themeConfig: {
        logo: {
            light: '/logo.png',
            dark: '/logo_dark.png',
            alt: 'JH Logo',
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
            copyright: 'Copyright © 2023-present Jonny van der Hoeven You'
        },
    },
    sitemap: {
        hostname: 'https://justme.dev'
    }
})
