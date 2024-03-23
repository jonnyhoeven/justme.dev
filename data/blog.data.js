import {createContentLoader} from 'vitepress'
import transformPage from '../lib/transformPage'

export default () => createContentLoader('blog/*.md', {
    includeSrc: false, // include raw markdown source?
    render: false,     // include rendered full page HTML?
    excerpt: false,    // include excerpt?
    transform(data) {
        return data.sort((a, b) => +new Date(b.frontmatter.date) - +new Date(a.frontmatter.date))
        .map((page) => transformPage(page))
    }
})

