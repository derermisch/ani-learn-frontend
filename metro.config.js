const { getDefaultConfig } = require("expo/metro-config");
const { withNativeWind } = require("nativewind/metro");

const config = getDefaultConfig(__dirname);

config.resolver.assetExts.push("phar");
config.resolver.assetExts.push("html");
config.resolver.assetExts.push("php");
config.resolver.assetExts.push("txt");
config.resolver.assetExts.push("db");

module.exports = withNativeWind(config, { input: "./global.css" });
