import {defineConfig, HeadConfig} from 'vitepress'
//import {defineConfig} from 'vitepress'
import transformPageData from './transformPageData';

export default async () => {
    return defineConfig({
        lang: 'en-US',
        title: "Justme.dev",
        srcExclude: ['/README.md'],
        description: "Justme.dev - Developer blog by Jonny van der Hoeven. Just me, making it.",
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
            //Google Fonts
            ['link', {rel: 'preconnect', href: 'https://fonts.googleapis.com'}],
            ['link', {rel: 'preconnect', href: 'https://fonts.gstatic.com', crossorigin: ''}],
            ['link', {
                rel: 'stylesheet',
                href: 'https://fonts.googleapis.com/css2?family=Fira+Sans:wght@400&display=swap'
            }],
            //Google Analytics
            ['script', {async: 'true', src: 'https://www.googletagmanager.com/gtag/js?id=G-KX1KJ3KEMB'}],
            ['script', {}, "window.dataLayer = window.dataLayer || [];\nfunction gtag(){dataLayer.push(arguments);}\ngtag('js', new Date());\ngtag('config', 'G-KX1KJ3KEMB');"],
            ['script', {src: 'https://www.googletagmanager.com/gtag/js?id=G-KX1KJ3KEMB'}],
            ['script',
                {},
                `window.dataLayer = window.dataLayer || [];
                  function gtag(){dataLayer.push(arguments);}
                  gtag('js', new Date());
                  gtag('config', 'G-KX1KJ3KEMB');`
            ],
        ],
        transformHead: ({pageData}) => {
            const head: HeadConfig[] = []
            const pf = pageData.frontmatter
            //head.push(['meta', {property: 'debug:pagedata', content: JSON.stringify(pageData) }])
            head.push(['meta', {property: 'og:site_name', content: 'Justme.dev'}])
            head.push(['meta', {property: 'og:title', content: pf.title ? pf.title : 'Just make it!'}])
            head.push(['meta', {
                property: 'og:description',
                content: pf.intro ? pf.intro : 'This is my developer blog, where I share insights, experiences, and tutorials related to software development. I cover a wide range of topics including JavaScript, Python, TypeScript, and more. I also discuss my projects, providing a behind-the-scenes look at my development process. Whether you\'re a seasoned developer or just starting out, I hope you find the content here informative and inspiring.'
            }])
            head.push(['meta', {property: 'og:type', content: 'article'}])
            head.push(['meta', {property: 'og:url', content: `https://www.justme.dev/${pageData.relativePath}`}])
            head.push(['meta', {
                property: 'og:image',
                content: `https://www.justme.dev${(pf && pf.image) ? pf.image : '/images/ava.webp'}`
            }])
            head.push(['meta', {property: 'og:locale', content: 'en_US'}])
            head.push(['meta', {property: 'og:author', content: 'Jonny van der Hoeven'}])
            head.push(['meta', {property: 'og:section', content: 'Software engineering'}])
            return head
        },
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
                light: '/images/logo.webp',
                dark: '/images/logo_dark.webp',
                alt: 'JH Logo',
                width: 50,
                height: 50
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
                {icon: 'github', link: 'https://github.com/jonnyhoeven/'},
                {icon: 'linkedin', link: 'https://www.linkedin.com/in/jonnyhoeven/'},
                {
                    icon: {
                        svg: '<img src="/images/google.webp" style="height:15pt;" alt="Google"/>',
                    },
                    link: 'https://g.dev/jonnyvanderhoeven'
                },
            ],
            footer: {
                message: 'Released under the <a href="https://raw.githubusercontent.com/jonnyhoeven/justme.dev/main/LICENSE">MIT</a> License.',
                copyright: '© 2024 Jonny van der Hoeven.</br>' +
                    '<a href="https://github.com/jonnyhoeven/justme.dev/actions/workflows/deploy.yml" target="_blank"><img alt="Github deploy workflow status badge" class="homeBadge" src="https://github.com/jonnyhoeven/justme.dev/actions/workflows/deploy.yml/badge.svg?branch=main"></a>' +
                    '<a href="https://github.com/jonnyhoeven/justme.dev/actions/workflows/github-code-scanning/codeql" target="_blank"><img alt="Github code scanning badge" src="https://github.com/jonnyhoeven/justme.dev/actions/workflows/github-code-scanning/codeql/badge.svg"></a>'
            },
        },
        sitemap: {
            hostname: 'https://www.justme.dev/'
        },
        transformPageData
    })
}
