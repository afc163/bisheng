'use strict';

const R = require('ramda');
const exist = require('exist.js');
const join = require('path').join;

function hasParams(path) {
  return path.split('/').some((snippet) => snippet.startsWith(':'));
}

function has404(filesPath) {
  return filesPath.indexOf('/404.html') >= 0;
}

function flattenRoutes(routes) {
  let flattenedRoutes = [];
  (Array.isArray(routes) ? routes : [routes]).forEach((item) => {
    const copy = Object.assign({}, item);
    if (!copy.dataPath) {
      copy.dataPath = copy.path;
    }
    flattenedRoutes.push(copy);

    if (item.childRoutes) {
      const nestedRoutes = R.chain(flattenRoutes, item.childRoutes.map((child) => {
        return Object.assign({}, child, {
          path: join(item.path, child.path),
        });
      }));
      flattenedRoutes = flattenedRoutes.concat(nestedRoutes);
    }
  });
  return flattenedRoutes;
}

module.exports = function generateFilesPath(routes, markdown) {
  const flattenedRoutes = flattenRoutes(routes);

  const filesPath = R.chain((item) => {
    if (hasParams(item.path)) {
      const dataPathSnippets = item.dataPath.split('/').slice(1);
      const firstParamIndex = dataPathSnippets.findIndex((snippet) => snippet.startsWith(':'));
      const firstParam = dataPathSnippets[firstParamIndex];

      const dataSet = exist.get(markdown, dataPathSnippets.slice(0, firstParamIndex), {});
      const processedCompleteRoutes = Object.keys(dataSet).map((key) => {
        const pathSnippet = key.replace(/\.md/, '');
        const path = item.path.replace(firstParam, pathSnippet);
        const dataPath = item.dataPath.replace(firstParam, pathSnippet);
        return { path, dataPath, title: key };
      });

      return generateFilesPath(processedCompleteRoutes, markdown);
    } else if (item.path.endsWith('/')) {
      return [{
        path: `${item.path}index.html`,
        title: item.title,
        description: item.description,
      }];
    }
    return [{
      path: `${item.path}.html`,
      title: item.title,
      description: item.description,
    }];
  }, flattenedRoutes);

  return has404(filesPath) ? filesPath : filesPath.concat({
    path: '/404.html',
    title: '404 Not Found',
  });
};
