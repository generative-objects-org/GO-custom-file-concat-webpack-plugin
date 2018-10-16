# Plugin description

This plugin is a GO-specific [Webpack]() plugin, aimed at concatenating several JavaScript files, located in the `options.filesDirectory` folder into one "big" JS file, which path is given by `options.targetFile`.

It is basically the same as doing the following in a shell _before_ running Webpack on the generated application.

```bash
cat "myDirectory/**.js" > "targetFile.js"
```

## Configuration

The plugin must be imported in your Webpack config file:

```js
const CustomFileConcatPlugin = require('go-custom-file-concat-webpack-plugin');
```

then can be added to the plugin list, with to optional options:

```js
plugins: [
    new CustomFileConcatPlugin({
        filesDirectory: './src/custom/components/', // default value
        targetFile: './src/custom/index.js' // default value
    })
];
```

## Compatibility with Webpack Dev server

This plugin is compatible with the Webpack dev server and hot reloading: it will detect changes (removals, additions, saves) in the `filesDirectory` and update the `targetFile` accordingly.

## Usage in GO generated apps / custom code

In GO generated apps, a specific mixin is added to all generated components in order to let developpers add custom code to components if they want.
This mixin does a

```js
import * as Custom from './src/custom/index.js';
```

In that way, one can add any Custom module in the `filesDirectory` which will be concatenated into the `targetFile` and injected by the CustomCodeMixing, provided that the module has the same name as the component it is meant to extend.
