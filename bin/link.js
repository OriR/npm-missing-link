#!/usr/bin/env node
const fs = require('fs-extra');
const execa = require('execa');
const path = require('path');
const semver = require('semver');
const packageJson = require('../../../package.json');
require('cosmiconfig')('npm-missing-link', {
  searchPlaces: [
    'package.json',
    '.npmmissinglink',
    '.npmmissinglink.json',
    '.npmmissinglink.yaml',
    '.npmmissinglink.yml',
    '.npmmissinglink.js',
    'npm-missing-link.config.js'
  ]
}).search()
  .catch(error => {
    console.error(`Could not load a configuration file for the following reason:\n${error}`);
    process.exit(1);
  })
  .then(result => {
    if (!result) {
      console.error(`Couldn't find a configuration file.`);
      process.exit(1);
    }
    const { config } = result;

    // Removing the trailing " at the end because in windows it can turn the command to
    // node npm-missing-link "C:\Users\oririner\awesome-project\"
    // Causing the parser to think the last character is "
    const pathToApp = process.argv[2].replace(/(.*)(?:")$/, (full, group) => group);
    const moduleInNodeModulesPath = path.resolve(pathToApp, path.join('node_modules', ...packageJson.name.split('/')));

    const getPaths = () => {
      // We only want to link the dependencies that the app doesn't install by itself and match the ones we need.
      // We're taking all of the dependencies for this package, checking if each dependency version doesn't exists in the apps package.json or it intersects with the version defined in our package.json
      // Granted, this isn't how npm actually operates because, as of npm@3.x.x it shrink-wraps the modules, so even if you don't specifically require a module it can still appear at the root.
      //
      // The alternative is to go through each module in the apps node_modules and check if the package.json defined there has a version that satisfies our requirement in the package.json for that module.
      // This approach has many pitfalls:
      //   * the user has missing dependencies so we'd need to make sure all the folders exist.
      //   * if the dependency isn't found at the top level does it mean we're the only package that needs it? it can also mean that the user didn't install all the dependencies
      //   * dealing with scoped packages might be problematic because nested folders
      //   * it's much more expensive to read n files and do n comparison than simply reading one file and do n comparisons.
      const appDependencies = require(
        path.relative(
          path.join('.', 'node_modules', 'npm-missing-link', 'bin'),
          path.resolve(pathToApp, 'package.json')
        ).replace(/\\/g, '/')
      ).dependencies;

      const uninstalledDependencies = Object.keys(packageJson.dependencies)
        .filter(module => !(appDependencies[module] && semver.intersects(packageJson.dependencies[module], appDependencies[module])))
        .map(dependency => {
          return {
            normalized: path.join('node_modules', dependency.replace(/\//g, path.sep)),
            dependency
          };
        });

      return {
        all: uninstalledDependencies.map(dep => dep.normalized).concat(config.customDirectories.map(entry => entry.path)),
        nodeModules: uninstalledDependencies
      };
    };

    const linkPath = (pathToLink) => fs.ensureSymlink(path.resolve(pathToLink), path.resolve(moduleInNodeModulesPath, pathToLink));

    const clearAppDirectories = (paths) => Promise.all(paths.all.map(p => fs.remove(path.resolve(moduleInNodeModulesPath, p))));

    const ensureLocalFoldersExist = (paths) => {
      return Promise.all([
        // If a requested path doesn't exist - run the build script specified for it.
        ...config.customDirectories.map(entry => fs.access(path.resolve(entry.path)).catch(() => execa.shell(entry.build))),
        // If a module doesn't exist - run `npm i` to make sure all of them are installed.
        Promise.all(paths.nodeModules.map(module => fs.access(path.resolve(module.normalized)).catch(() => execa('npm', ['i', module.dependency]))))
      ]);
    };

    Promise.resolve(getPaths())
      .then((paths) => Promise.all([clearAppDirectories(paths), ensureLocalFoldersExist(paths)]).then(() => paths))
      .then(paths => Promise.all(paths.all.map(linkPath)))
      .then(() => {
        if (config.watch && config.watch.executeOnLink) {
          return execa.shell(config.watch.script, { stdio: 'inherit' });
        } else if (config.watch && config.watch.script) {
        console.log(`\x1b[44mDone linking!\x1b[0m
Run \x1b[36m${config.watch.script}\x1b[0m to make sure your changes replicate here \x1b[33m${pathToApp}\x1b[0m.
Run \x1b[36mnpm run unlink -- ${pathToApp}\x1b[0m to remove the link.`);
        } else {
          console.log(`\x1b[44mDone linking!\x1b[0m
Run \x1b[36mnpm run unlink -- ${pathToApp}\x1b[0m to remove the link.`);
        }
    })
      .catch((e) => {
        console.error(`Unable to link for the following reason:
    ${e}`);
      });

  });
