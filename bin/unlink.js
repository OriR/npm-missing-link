#!/usr/bin/env node
const fs = require('fs-extra');
const path = require('path');
const execa = require('execa');
const os = require('os');
const packageJson = require('../../../package.json');

// Still need to make sure this works
const detachLinkExtension = os.platform() === 'win32' ? '.bat' : '.sh';

// Removing the trailing " at the end because in windows it can turn the command to
// node npm-missing-unlink.js "C:\Users\oririner\awesome-project\"
// Causing the parser to think the last character is "
const pathToApp = process.argv[2].replace(/(.*)(?:")$/, (full, group) => group);

const appDependencies = require(path.relative(path.resolve('.', 'node_modules', 'npm-missing-link', 'bin'), path.resolve(pathToApp, 'package.json')).replace(/\\/g, '/')).dependencies;
const packageVersion = appDependencies[packageJson.name];

// The reason we're deferring the `npm i` command to a shell script is that for some reason when run inside node it doesn't always find the npm registry.
fs.remove(path.resolve(pathToApp, 'node_modules', packageJson.name.replace(/\//g, path.sep), 'node_modules'))
  .then(() => execa(path.join('node_modules', 'npm-missing-link', 'bin', `detach-link${detachLinkExtension}`), [pathToApp, `${packageJson.name}@${packageVersion}`], { stdio: 'inherit' }))
  .then(() => {
    console.log(`Unlinked ${packageJson.name} successfully!`);
  })
  .catch((err) => {
    throw new Error(`Unable to unlink for the following reason:\n${err}`);
  });
