// SPDX-FileCopyrightText: Jonny van der Hoeven
// SPDX-License-Identifier: GPL-3.0-or-later
import transformPage from '../lib/transformPage';

export default async (pageData) => {
  pageData = transformPage(pageData);
  return pageData;
};
