import markdownit from 'markdown-it'

const md = markdownit()
export default async (url) => {
    return await fetch(url)
        .then(res => res.text())
        .then(str => md.render(str))
        .catch(err => {
            console.error(`Error fetching README.md: ${err}`);
            return `### Error fetching [README.md](${url})`;
        });
};