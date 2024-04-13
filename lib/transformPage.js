export default (pageData) => {
    const pfm = pageData.frontmatter
    const branch = pfm.branch ? pfm.branch : 'main';
    pfm.langArr = pfm.languages ? pfm.languages.split(',').map(s => s.trim()) : [];
    const badgeHost = 'https://img.shields.io/github';

    pfm.externalUrl = pfm.githost ? `${pfm.githost}/${pfm.user}/${pfm.project}` : pfm.externalUrl;
    pfm.externalUrlLabel = pfm.githost ? 'View on Github' : 'View'
    pfm.watchersUrl = pfm.githost ? `${badgeHost}/watchers/${pfm.user}/${pfm.project}?style=flat` : null
    pfm.starsUrl = pfm.githost ? `${badgeHost}/stars/${pfm.user}/${pfm.project}?style=flat` : null
    pfm.forksUrl = pfm.githost ? `${badgeHost}/forks/${pfm.user}/${pfm.project}?style=flat` : null
    return pageData
}