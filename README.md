# 📦🔗 `npm-missing-link` 📦🔗
`npm-missing-link` is the missing link for `npm link`.
`npm-missing-link` will link only **specific** folders within your project and only the needed **node_modules**.

## Table of Contents
* [Install](#install)
* [Usage](#usage)
  * [Configuration](#configuration)
  * [Linking](#linking)
* [Why?](#why)
* [`npm-missing-link` & `React`](#npm-missing-link--react)
* [Contributing](#contributing)

### Install
```
npm i --save-dev npm-missing-link
```

### Usage
#### Configuration
In your package.json you'll need to add two scripts
```json
"scripts:" {
  "link": "node_modules/.bin/npm-missing-link",
  "unlink": "node_modules/.bin/npm-missing-unlink"
}
```
Add a configuration file as described by [`cosmiconfig`](https://github.com/davidtheclark/cosmiconfig#explorersearch) with this shape:
```js
{
  // If you have script that watches & re-builds on change - you should specify it here.
  "watch": {
    // Whether or not to execute the watch after linking is done.
    "executeOnLink": true,
    // The script execute to watch & re-build on change.
    "script": "npm run watch"
  },
  // A list of custom paths to link
  "customDirectories": [
    {
      // The path you want to be linked.
      "path": "es",
      // In case the above path doesn't exist, running the "build" script should create it so it could be linked.
      "build": "npm run build"
    },
    {
      "path": "dist",
      "build": "npm run dist"
    }
  ]
}
```

#### Linking
Then, whenever you want, link your package somewhere else by running:
```
npm run link -- path/to/another/app/using/your/package
```
If your package has a `watch` script, you can run it now - unless you specified `executeOnLink: true`, in which case it'll automatically run.
Your app is linked successfully to your package! changes should be reflected instantly ⚡️ !

Done working? don't need the link anymore? want to go back to the previous state? no problem!
```
npm run unlink -- path/to/another/app/using/your/package
```

Simple as that!

### Why?
`npm link` is good in concept, but doesn't follow the npm installation algorithm.
`npm link` works by simply creating a [symlink](https://en.wikipedia.org/wiki/Symbolic_link) from your package to the node_modules of the app using it, so **all** the node_modules "go a long" with your package.
That's not how the installation algorithm works in the real world, that next level of node_modules is only added if there's a version conflict from another package the consuming app is installing.
That's a problem because when using `npm link` it won't reflect the actual state the consuming app is going to be in when installing your package.

Example time!

Let's assume we have a pacakge called `ju-jitsu` and an app called `thomas-anderson`.
This would be a part of the `package.json` defined by `thomas-anderson`:
```json
"depenencies": {
  "kick": "^1.0.0",
  "punch": "^1.2.0",
  "ju-jitsu": "1.0.0",
}
```

This would be a part of the `package.json` defined by `ju-jitsu`:
```json
"depenencies": {
  "kick": "^1.0.0",
  "punch": "^2.0.0",
}
```

And this would be the initial folder strucutre
```
ju-jitsu
  |
  |____ node_modules
  |      |____ kick
  |      |____ punch
  |
  |____ es
  |      |
  |      |____ index.js
  |
  |____ src
         |
         |____ index.js

thomas-anderson
  |
  |____ node_modules
         |
         |____ kick
         |____ punch
         |____ ju-jitsu
```
Now you want to add features to `ju-jitsu`, but you want to make sure these changes play nicely with `thomas-anderson`.

What happens when you use `npm link`?
```
thomas-anderson
  |
  |____ node_modules
         |
         |____ kick
         |____ punch
         |____ ju-jitsu (symlinked)
                |
                |____ node_modules
                |      |
                |      |____ kick
                |      |____ punch
                |
                |____ es
                |      |
                |      |____ index.js
                |
                |____ src
                       |
                       |____ index.js
```
This means that the module resolution from files under the `ju-jitsu`folder at this point would favor all the modules defined in `ju-jitsu/node_modules` folder because they are more "specific".

What happens when you use `npm-missing-link`?
```
thomas-anderson
  |
  |____ node_modules
         |
         |____ kick
         |____ punch
         |____ ju-jitsu
                |
                |____ node_modules
                |      |
                |      |____ punch (symlinked)
                |
                |____ es (symlinked)
                       |
                       |____ index.js
```
As you can see it's only linking the things you need (`src` is the pre-compiled code so you don't need it) and only the node_modules that will actually be installed (`kick` version matches between `thomas-anderson` and `ju-jitsu`)
This type of linking is much closer to the way `npm i --save ju-jitsu` would be - making the testing you make at this point much more realistic.

### `npm-missing-link` & `React`
Still not convinced you need this? Are you a `React` Component(s) package maintainer? If you do then you probably do need this.
`React` can't function properly when there are two versions of itself in the same app managing the same parts of the DOM.

It would probably only happen when someone wants to `npm link` your package to their app.
That would link all the node_modules including `react` and `react-dom`.
You, as a package maintainer, need them to be in `devDependencies` so you could test in development but in production they shouldn't be installed and just requested using `peerDependencies`.

Because `npm-missing-link` links only the modules defined in `dependencies` this will never happen. There will never be two versions of `react`/`react-dom`, even if you link in development.

### Contributing
Issues & Pull Requests are highly welcome!

### License 
MIT