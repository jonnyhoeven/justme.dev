export default (pageData) => {
    const pfm = pageData.frontmatter
    pfm.langArr = pfm.languages ? pfm.languages.split(',').map(s => s.trim()) : [];
    const badgeHost = 'https://img.shields.io/github';

    pfm.externalUrl = pfm.gitlink ? `${pfm.gitlink}` : pfm.externalUrl;
    pfm.externalUrlLabel = pfm.gitlink ? 'View on Github' : 'View'
    pfm.watchersUrl = pfm.gitlink ? `${badgeHost}/watchers/${pfm.user}/${pfm.project}?style=flat` : null
    pfm.starsUrl = pfm.gitlink ? `${badgeHost}/stars/${pfm.user}/${pfm.project}?style=flat` : null
    pfm.forksUrl = pfm.gitlink ? `${badgeHost}/forks/${pfm.user}/${pfm.project}?style=flat` : null
    return pageData
}