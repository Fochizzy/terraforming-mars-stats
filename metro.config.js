/* eslint-disable @typescript-eslint/no-require-imports */
const { getDefaultConfig } = require('@expo/metro-config');

function escapeForRegex(value) {
  return value.replace(/[|\\{}()[\]^$+*?.]/g, '\\$&');
}

function buildFolderBlockPattern(folderName) {
  const escapedFolderName = escapeForRegex(folderName);
  return new RegExp(`(?:^|[\\\\/])${escapedFolderName}(?:[\\\\/].*)?$`);
}

function buildFileSuffixBlockPattern(fileSuffixPattern) {
  return new RegExp(`(?:^|[\\\\/]).*${fileSuffixPattern}$`);
}

const config = getDefaultConfig(__dirname);

config.resolver.blockList = [
  ...config.resolver.blockList,
  buildFolderBlockPattern('.git'),
  buildFolderBlockPattern('.next'),
  buildFolderBlockPattern('.open-next'),
  buildFolderBlockPattern('.worktrees'),
  buildFolderBlockPattern('__tests__'),
  buildFileSuffixBlockPattern('\\.spec\\.[^\\\\/]+'),
  buildFileSuffixBlockPattern('\\.test\\.[^\\\\/]+'),
];

module.exports = config;
