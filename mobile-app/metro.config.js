// Configuration Metro (13.8, D-52).
//
// three.js ≥ 0.18x a rendu son entrée CommonJS (`build/three.cjs`) obsolète : elle appelle
// `process.emitWarning(...)`, qui n'existe pas dans React Native, puis ré-exporte le module ES.
// `@react-three/fiber/native` charge three par `require`, donc Metro choisissait cette entrée et
// l'application plantait au démarrage (« undefined is not a function », runtime not ready).
// On résout toujours `three` vers le module ES : même contenu, sans l'avertissement, et une seule
// copie de three dans le bundle (les chargeurs de modèles de 13.9 l'importent aussi).
const path = require('path');
const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);

const THREE_ESM = path.join(__dirname, 'node_modules', 'three', 'build', 'three.module.js');

const defaultResolve = config.resolver.resolveRequest;
config.resolver.resolveRequest = (context, moduleName, platform) => {
  if (moduleName === 'three') {
    return { type: 'sourceFile', filePath: THREE_ESM };
  }
  return defaultResolve
    ? defaultResolve(context, moduleName, platform)
    : context.resolveRequest(context, moduleName, platform);
};

module.exports = config;
