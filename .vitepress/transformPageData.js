// noinspection JSUnusedGlobalSymbols

import transformPage from "../lib/transformPage";

// noinspection JSUnusedLocalSymbols
export default async (pageData) => {
    pageData = transformPage(pageData);
    return pageData;
}


