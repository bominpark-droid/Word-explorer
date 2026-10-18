const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);
// The bundled dictionary is a SQLite file shipped as an asset; wasm is for
// expo-sqlite on web (used only for previewing the app in a browser).
config.resolver.assetExts.push('db', 'wasm');

module.exports = config;
