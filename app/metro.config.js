const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);
// Das gepackte Spiel liegt als HTML-Asset in spiel/.
config.resolver.assetExts.push('html');

module.exports = config;
