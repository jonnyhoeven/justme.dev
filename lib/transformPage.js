
export default (pageData) => {
    const branch = pageData.frontmatter.branch ? pageData.frontmatter.branch : 'main';
    pageData.frontmatter.langArr = pageData.frontmatter.languages ? pageData.frontmatter.languages.split(',').map(n => n.trim()) : [];
    const badgeHost = 'https://img.shields.io/github';

    if (pageData.frontmatter.githost && pageData.frontmatter.user && pageData.frontmatter.project) {
        pageData.frontmatter.readmeUrl = `${pageData.frontmatter.githost}/${pageData.frontmatter.user}/${pageData.frontmatter.project}/raw/${branch}/README.md`;
        pageData.frontmatter.externalUrl = `${pageData.frontmatter.githost}/${pageData.frontmatter.user}/${pageData.frontmatter.project}`;

        pageData.frontmatter.watchersUrl = `${badgeHost}/watchers/${pageData.frontmatter.user}/${pageData.frontmatter.project}?style=flat`
        pageData.frontmatter.starsUrl = `${badgeHost}/stars/${pageData.frontmatter.user}/${pageData.frontmatter.project}?style=flat`
        pageData.frontmatter.forksUrl = `${badgeHost}/forks/${pageData.frontmatter.user}/${pageData.frontmatter.project}?style=flat`
    }
    return pageData
}