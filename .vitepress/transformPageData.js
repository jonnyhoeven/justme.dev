// noinspection JSUnusedGlobalSymbols

import transformPage from "../lib/transformPage";

// noinspection JSUnusedLocalSymbols
export default async (pageData, {siteConfig}) => {
    pageData = transformPage(pageData);
    return pageData;
}


