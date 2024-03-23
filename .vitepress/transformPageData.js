import transformPage from "../lib/transformPage";
import fetchReadme from "../lib/fetchReadme.js";

export default async (pageData, {siteConfig}) => {
    pageData = transformPage(pageData);
    pageData.frontmatter.readme = await fetchReadme(pageData.frontmatter.readmeUrl);
    return pageData;
}


