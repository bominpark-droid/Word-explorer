const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);
// The bundled dictionary is a SQLite file shipped as an asset.
config.resolver.assetExts.push('db');

module.exports = config;
