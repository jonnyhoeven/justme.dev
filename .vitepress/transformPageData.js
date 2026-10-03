import transformPage from '../lib/transformPage';

export default async (pageData) => {
  pageData = transformPage(pageData);
  return pageData;
};
