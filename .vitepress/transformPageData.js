import transformPage from "../lib/transformPage";

export default async (pageData, {siteConfig}) => {
    pageData = transformPage(pageData);
    return pageData;
}


