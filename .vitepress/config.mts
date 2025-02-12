// noinspection JSUnusedGlobalSymbols

import {defineConfig, HeadConfig} from 'vitepress'
import transformPageData from './transformPageData';

export default async () => {
    const author = 'Jonny van der Hoeven'
    const siteName = 'Justme.dev'
    const hostname = 'https://justme.dev'
    const lang = 'en-US'
    return defineConfig({
        lang: lang,
        title: siteName,
        srcExclude: ['/README.md'],
        description: `${siteName} - ${author}. Just make it!`,
        head: [

            // Static Opengraph stuff
            ['meta', {property: 'og:sitename', content: siteName}],
            ['meta', {property: 'og:locale', content: lang}],
            ['meta', {property: 'og:type', content: 'article'}],
            ['meta', {property: 'article:author', content: author}],
            ['meta', {name: 'author', content: author}],
            ['link', {rel: 'apple-touch-icon', sizes: '76x76', href: '/apple-touch-icon.png'}],
            ['link', {rel: 'image/png', sizes: '32x32', href: '/favicon-32x32.png'}],
            ['link', {rel: 'image/png', sizes: '16x16', href: '/favicon-16x16.png'}],
            ['link', {rel: 'manifest', href: '/site.webmanifest'}],
            ['link', {rel: 'mask-icon', href: '/safari-pinned-tab.svg', color: '#16673c'}],
            ['meta', {name: 'apple-mobile-web-app-title', content: 'Justme.dev'}],
            ['meta', {name: 'application-name', content: 'Justme.dev'}],
            ['meta', {name: 'msapplication-TileColor', content: '#16673c'}],
            ['meta', {name: 'theme-color', content: '#ffffff'}],
        ],
        transformHead: ({pageData}) => {
            const head: HeadConfig[] = []
            const pf = pageData.frontmatter
            const intro_plh = 'Just me. Sharing insights, experiences, and tutorials related to software development and site reliability engineering.'
            const intro = (pf && pf.intro) ? pf.intro : intro_plh
            const keywords = 'Personal Portfolio, jonnyhoeven, justme.dev, devops, Infrastructure as Code'
            const image_plh = '/images/justme.dev.webp'
            const image = `${hostname}${(pf && pf.image) ? pf.image : image_plh}`

            head.push(['meta', {name: 'title', property: 'og:title', content: pf.title ? pf.title : 'Just make it!'}])
            head.push(['meta', {
                name: 'description', property: 'og:description', content: intro
            }])
            head.push(['meta', {name: 'keywords', content: keywords}])
            head.push(['meta', {property: 'og:url', content: `${hostname}/${pageData.relativePath}`}])
            head.push(['meta', {
                property: 'og:image',
                content: image
            }])
            head.push(['meta', {property: 'article:published_time', content: pf.date ? pf.date : '2024-01-01'}])
            head.push(['meta', {property: 'article:modified_time', content: pf.date ? pf.date : '2024-01-01'}])
            head.push(['meta', {name: 'twitter:image', content: image}])
            head.push(['meta', {property: 'twitter:url', content: `${hostname}/${pageData.relativePath}`}])
            head.push(['meta', {property: 'twitter:description', content: intro}])
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
                alt: 'Logo',
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
                {icon: 'youtube', link: 'https://www.youtube.com/@JustDevMe'},
                {icon: 'linkedin', link: 'https://www.linkedin.com/in/jonnyhoeven/'},
                {
                    icon: {
                        svg: '<img src="/images/google.webp" width="20" height="20" alt="Google"/>',
                    },
                    link: 'https://g.dev/jonnyvanderhoeven'
                },
            ],
            footer: {
                message:
                    '<a href="https://github.com/jonnyhoeven/justme.dev/actions/workflows/deploy.yml" target="_blank">' +
                    '   <img alt="Github deploy workflow status badge" class="homeBadgeLeft" width="143px" height="20px" src="https://github.com/jonnyhoeven/justme.dev/actions/workflows/deploy.yml/badge.svg?branch=main">' +
                    '</a>' +
                    '<a href="https://github.com/jonnyhoeven/justme.dev/actions/workflows/github-code-scanning/codeql" target="_blank">' +
                    '   <img alt="Github code scanning badge" class="homeBadgeRight" width="120px" height="20px" src="https://github.com/jonnyhoeven/justme.dev/actions/workflows/github-code-scanning/codeql/badge.svg">' +
                    '</a>' +
                    `© ${new Date().getFullYear()} - <a href="https://raw.githubusercontent.com/jonnyhoeven/justme.dev/main/LICENSE">MIT</a>`
                ,
            },
        },
        sitemap: {
            hostname: `${hostname}/`
        },
        transformPageData
    })
}
