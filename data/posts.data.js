import {createContentLoader} from 'vitepress'
export default createContentLoader('posts/*.md', {
    includeSrc: false, // include raw markdown source?
    render: false,     // include rendered full page HTML?
    excerpt: true,    // include excerpt?
    transform(rawData) {
        return rawData.sort((a, b) => {
            return +new Date(b.frontmatter.date) - +new Date(a.frontmatter.date)
        })
    }
})
