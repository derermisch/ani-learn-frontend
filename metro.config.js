const { getDefaultConfig } = require("expo/metro-config");

const config = getDefaultConfig(__dirname);

// Add 'phar' and 'html' to assets
config.resolver.assetExts.push("phar");
config.resolver.assetExts.push("html");

module.exports = config;
