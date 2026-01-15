// noinspection JSUnusedGlobalSymbols

import { defineConfig, HeadConfig } from 'vitepress'
import transformPageData from './transformPageData';
import { SITE_CONSTANTS } from './constants';

export default async () => {
    return defineConfig({
        lang: SITE_CONSTANTS.LANG,
        title: SITE_CONSTANTS.SITE_NAME,
        srcExclude: ['**/README.md'],
        description: SITE_CONSTANTS.DESCRIPTION,
        head: [

            // Static Opengraph stuff
            ['meta', { property: 'og:sitename', content: SITE_CONSTANTS.SITE_NAME }],
            ['meta', { property: 'og:locale', content: SITE_CONSTANTS.LANG }],
            ['meta', { property: 'og:type', content: 'article' }],
            ['meta', { property: 'article:author', content: SITE_CONSTANTS.AUTHOR }],
            ['meta', { name: 'author', content: SITE_CONSTANTS.AUTHOR }],
            ['link', { rel: 'apple-touch-icon', sizes: '76x76', href: '/apple-touch-icon.png' }],
            ['link', { rel: 'image/png', sizes: '32x32', href: '/favicon-32x32.png' }],
            ['link', { rel: 'image/png', sizes: '16x16', href: '/favicon-16x16.png' }],
            ['link', { rel: 'manifest', href: '/site.webmanifest' }],
            ['link', { rel: 'mask-icon', href: '/safari-pinned-tab.svg', color: SITE_CONSTANTS.IMAGES.FAVICON_MASK_COLOR }],
            ['meta', { name: 'apple-mobile-web-app-title', content: SITE_CONSTANTS.SITE_NAME }],
            ['meta', { name: 'application-name', content: SITE_CONSTANTS.SITE_NAME }],
            ['meta', { name: 'msapplication-TileColor', content: SITE_CONSTANTS.IMAGES.FAVICON_MASK_COLOR }],
            ['meta', { name: 'theme-color', content: SITE_CONSTANTS.IMAGES.THEME_COLOR }],
        ],
        transformHead: ({ pageData }) => {
            const head: HeadConfig[] = []
            const pf = pageData.frontmatter
            const intro_plh = 'Just me. Sharing insights, experiences, and tutorials related to software development and site reliability engineering.'
            const intro = (pf && pf.intro) ? pf.intro : intro_plh
            const image_plh = SITE_CONSTANTS.IMAGES.DEFAULT
            const image = `${SITE_CONSTANTS.HOSTNAME}${(pf && pf.image) ? pf.image : image_plh}`

            head.push(['meta', { name: 'title', property: 'og:title', content: pf.title ? pf.title : 'Just make IT!' }])
            head.push(['meta', {
                name: 'description', property: 'og:description', content: intro
            }])
            head.push(['meta', { name: 'keywords', content: SITE_CONSTANTS.KEYWORDS }])
            head.push(['meta', { property: 'og:url', content: `${SITE_CONSTANTS.HOSTNAME}/${pageData.relativePath}` }])
            head.push(['meta', {
                property: 'og:image',
                content: image
            }])
            head.push(['meta', { property: 'article:published_time', content: pf.date ? pf.date : '2025-01-01' }])
            head.push(['meta', { property: 'article:modified_time', content: pf.date ? pf.date : '2025-01-01' }])
            head.push(['meta', { name: 'twitter:image', content: image }])
            head.push(['meta', { property: 'twitter:url', content: `${SITE_CONSTANTS.HOSTNAME}/${pageData.relativePath}` }])
            head.push(['meta', { property: 'twitter:description', content: intro }])
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
                light: SITE_CONSTANTS.IMAGES.LOGO_LIGHT,
                dark: SITE_CONSTANTS.IMAGES.LOGO_DARK,
                alt: 'Logo',
            },
            editLink: {
                pattern: `${SITE_CONSTANTS.SOCIAL_LINKS.REPO}/edit/main/:path`
            },
            search: {
                provider: 'local'
            },
            nav: [
                { text: 'Home', link: '/' },
                { text: 'Projects', link: '/projects' },
                { text: 'Blog', link: '/blog' }
            ],
            socialLinks: [
                { icon: 'github', link: SITE_CONSTANTS.SOCIAL_LINKS.GITHUB },
                { icon: 'youtube', link: SITE_CONSTANTS.SOCIAL_LINKS.YOUTUBE },
                { icon: 'linkedin', link: SITE_CONSTANTS.SOCIAL_LINKS.LINKEDIN },
                {
                    icon: {
                        svg: `<img src="${SITE_CONSTANTS.IMAGES.GOOGLE_ICON}" width="20" height="20" alt="Google"/>`,
                    },
                    link: SITE_CONSTANTS.SOCIAL_LINKS.GOOGLE_DEV
                },
            ],
            footer: {
                message:
                    `<a href="${SITE_CONSTANTS.SOCIAL_LINKS.REPO}/actions/workflows/deploy.yml" target="_blank">` +
                    `   <img alt="Github deploy workflow status badge" class="homeBadgeLeft" width="143px" height="20px" src="${SITE_CONSTANTS.SOCIAL_LINKS.REPO}/actions/workflows/deploy.yml/badge.svg?branch=main">` +
                    '</a>' +
                    `<a href="${SITE_CONSTANTS.SOCIAL_LINKS.REPO}/actions/workflows/github-code-scanning/codeql" target="_blank">` +
                    `   <img alt="Github code scanning badge" class="homeBadgeRight" width="120px" height="20px" src="${SITE_CONSTANTS.SOCIAL_LINKS.REPO}/actions/workflows/github-code-scanning/codeql/badge.svg">` +
                    '</a>' +
                    `© ${new Date().getFullYear()} - <a href="https://raw.githubusercontent.com/jonnyhoeven/justme.dev/main/LICENSE">MIT</a>`
                ,
            },
        },
        sitemap: {
            hostname: `${SITE_CONSTANTS.HOSTNAME}/`
        },
        transformPageData
    })
}

