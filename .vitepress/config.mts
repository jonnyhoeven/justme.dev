import {defineConfig} from 'vitepress'
import transformPageData from './transformPageData';

export default async () => {
    //const posts = await (await fetch('https://my-cms.com/blog-posts')).json()
    return defineConfig({
        lang: 'en-US',
        title: "Justme.dev",
        description: "Justme.dev - Developer blog by Jonny van der Hoeven. Just me, making IT.",
        head: [
            ['link', {rel: 'apple-touch-icon', sizes: '76x76', href: '/apple-touch-icon.png'}],
            ['link', {rel: 'image/png', sizes: '32x32', href: '/favicon-32x32.png'}],
            ['link', {rel: 'image/png', sizes: '16x16', href: '/favicon-16x16.png'}],
            ['link', {rel: 'manifest', href: '/site.webmanifest'}],
            ['link', {rel: 'mask-icon', href: '/safari-pinned-tab.svg', color: '#5bbad5'}],
            ['meta', {name: 'apple-mobile-web-app-title', content: 'Justme.dev'}],
            ['meta', {name: 'application-name', content: 'Justme.dev'}],
            ['meta', {name: 'msapplication-TileColor', content: '#603cba'}],
            ['meta', {name: 'theme-color', content: '#ffffff'}],
            ['script', {src: 'https://www.googletagmanager.com/gtag/js?id=G-KX1KJ3KEMB'}],
            ['script',
                {},
                  `window.dataLayer = window.dataLayer || [];
                  function gtag(){dataLayer.push(arguments);}
                  gtag('js', new Date());
                  gtag('config', 'G-KX1KJ3KEMB');`
            ]
        ],
        base: "/",
        cleanUrls: true,
        markdown: {
            image: {
                lazyLoading: true
            }
        },
        lastUpdated: true,
        themeConfig: {
            logo: {
                light: '/images/logo.png',
                dark: '/images/logo_dark.png',
                alt: 'JH Logo',
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
                        svg: '<img src="/images/google.png" style="height:15pt;" alt="Google"/>',
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
                        ],
                    }
                ],
                '/projects/': [
                    {
                        text: 'Projects',
                        items: [
                            {text: 'All Projects', link: '/projects'},
                        ],
                    }
                ],
            },
            footer: {
                message: 'Released under the MIT License.',
                copyright: 'Copyright © 2024 Jonny van der Hoeven.',
            },
        },
        sitemap: {
            hostname: 'https://www.justme.dev'
        },
        transformPageData
    })
}


