import transformPage from "../lib/transformPage";
import fetchReadme from "../lib/fetchReadme.js";

export default async (pageData, {siteConfig}) => {
    pageData = transformPage(pageData);
    pageData.frontmatter.readme = pageData.frontmatter.fetchReadme ?  await fetchReadme(pageData.frontmatter.readmeUrl) : null;
    return pageData;
}


