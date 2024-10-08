export default (pageData) => {
    const pf = pageData.frontmatter
    pf.title = pf.title ? pf.title : 'Justme.dev'
    pf.intro = pf.intro ? pf.intro : 'Just me, making it.'
    pf.image = pf.image ? pf.image : '/images/justme.jpg'
    pf.externalUrl = pf.gitlink ? `${pf.gitlink}` : pf.externalUrl;
    pf.externalUrlLabel = pf.gitlink ? 'View on Github' : 'View site'

    const badgeHost = 'https://img.shields.io/github';
    pf.watchersUrl = pf.gitlink ? `${badgeHost}/watchers/${pf.user}/${pf.project}?style=flat` : null
    pf.starsUrl = pf.gitlink ? `${badgeHost}/stars/${pf.user}/${pf.project}?style=flat` : null
    pf.forksUrl = pf.gitlink ? `${badgeHost}/forks/${pf.user}/${pf.project}?style=flat` : null
    pf.langArr = pf.languages ? pf.languages.split(',').map(s => s.trim()) : [];
    return pageData
}