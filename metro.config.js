// metro.config.js
const { getDefaultConfig } = require("expo/metro-config");

const config = getDefaultConfig(__dirname);

// Add 'phar' to the list of known asset extensions
config.resolver.assetExts.push("phar");

module.exports = config;
