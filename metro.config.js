const { getDefaultConfig } = require('@expo/metro-config');

function escapeForRegex(value) {
  return value.replace(/[|\\{}()[\]^$+*?.]/g, '\\$&');
}

function buildFolderBlockPattern(folderName) {
  const escapedFolderName = escapeForRegex(folderName);
  return new RegExp(`(?:^|[\\\\/])${escapedFolderName}(?:[\\\\/].*)?$`);
}

const config = getDefaultConfig(__dirname);

config.resolver.blockList = [
  ...config.resolver.blockList,
  buildFolderBlockPattern('.git'),
  buildFolderBlockPattern('.next'),
  buildFolderBlockPattern('.open-next'),
  buildFolderBlockPattern('.worktrees'),
];

module.exports = config;
