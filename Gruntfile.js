/************************************************************************************************************

grunt
  - Build the complete set of VexFlow libraries (with source-maps) for production and debug use.
    This is the 'default' grunt task.

grunt test
  - Build the VexFlow debug libraries and run the QUnit command line tests with 'tests/flow-headless-browser.html'.

grunt reference
  - Build VexFlow and copy the current build/ to the reference/ folder (the copy:reference task),
    so that we can compare future builds to the reference/ via `grunt test:reference`.

*************************************************************************************************************

DEVELOPMENT

grunt watch
  - The fastest way to iterate while working on VexFlow. 
    Watch for changes and produces the debug CJS libraries in build/cjs/.

grunt watch:prod
  - Watch for changes and builds the production libraries. This can be slow!

grunt watch:esm
  - Watch for changes and build the ESM libraries in build/esm/.
  - Also see `grunt test:browser:esm` below.

*************************************************************************************************************

RELEASE A NEW VERSION

To automatically release to GitHub, you need to have a personal access token with "repo" rights.
Generate one here: https://github.com/settings/tokens/new?scopes=repo&description=release-it

Also, make sure your authenticator app is ready to generate a 2FA one time password for npm.

grunt && npm pack
  - Create a *.tgz that can be emailed to a friend or uploaded to a test server.
    npm install from the *.tgz file or test server URL to verify your project works with this build of VexFlow.

grunt release
  - Run the release script to build, commit, and publish to npm and GitHub.
    This assumes you have fully tested the build.

*************************************************************************************************************

TESTING

grunt test:cmd
  - Run the QUnit command line tests with 'tests/flow-headless-browser.html'.

grunt test:browser:cjs
  - Opens flow.html in the default browser. Loads the CJS build.

grunt test:browser:esm
  - Runs `npx http-server` from the vexflow/ directory to serve tests/flow.html and build/esm/.
  - Watches for changes and builds the ESM libraries.
  - Opens http://localhost:8080/tests/flow.html?esm=true to run the tests with the ESM build

grunt get:releases:versionX:versionY:...
  - Retrieve previous releases for regression testing purposes.
  - For example: grunt get:releases:3.0.9:4.0.0

grunt clean
  - Remove all files generated by the build process.

Search this file for `// grunt` to see other supported grunt tasks.

*************************************************************************************************************

ENVIRONMENT VARIABLES (optional):

VEX_DEBUG_CIRCULAR_DEPENDENCIES
    if true, we display a list of circular dependencies in the code.
VEX_DEVTOOL
    Specify an alternative webpack devtool config (the default is 'source-map').
    Pass in 'false' to disable source maps.
    https://webpack.js.org/configuration/devtool/
VEX_GENERATE_OPTIONS
    options for controlling the ./tools/generate_images.js script.
    see the 'generate:current' and 'generate:reference' tasks.

To pass in environment variables, you can use your ~/.bash_profile or do something like:
  export VEX_DEBUG_CIRCULAR_DEPENDENCIES=true
  export VEX_DEVTOOL=eval
  grunt
You can also do it all on one line:
  VEX_DEBUG_CIRCULAR_DEPENDENCIES=true VEX_DEVTOOL=eval grunt

*************************************************************************************************************/

const path = require('path');
const fs = require('fs');
const os = require('os');
const { spawnSync } = require('child_process');

const webpack = require('webpack');
const TerserPlugin = require('terser-webpack-plugin');
const ForkTsCheckerWebpackPlugin = require('fork-ts-checker-webpack-plugin');
const release = require('release-it');
const open = require('opener');
const concurrently = require('concurrently');

// A module entry file `entry/xxxx.ts` will be mapped to a build output file in build/cjs/ or /build/esm/entry/.
// Also see the package.json `exports` field, which is one way for projects to specify which entry file to import.
const VEX = 'vexflow';
const VEX_BRAVURA = 'vexflow-bravura';
const VEX_GONVILLE = 'vexflow-gonville';
const VEX_PETALUMA = 'vexflow-petaluma';
const VEX_CORE = 'vexflow-core'; // Supports dynamic import of the font modules below.
const VEX_DEBUG = 'vexflow-debug';
const VEX_DEBUG_TESTS = 'vexflow-debug-with-tests';

const versionInfo = require('./tools/version_info');
// Add a banner to the top of some CJS output files.
const banner =
  `VexFlow ${versionInfo.VERSION}   ${versionInfo.DATE}   ${versionInfo.ID}\n` +
  `Copyright (c) 2010 Mohit Muthanna Cheppudira <mohit@muthanna.com>\n` +
  `https://www.vexflow.com   https://github.com/0xfe/vexflow`;

// Output directories & files.
const BASE_DIR = __dirname;
const BUILD_DIR = path.join(BASE_DIR, 'build');
const BUILD_CJS_DIR = path.join(BUILD_DIR, 'cjs');
const BUILD_ESM_DIR = path.join(BUILD_DIR, 'esm');
const BUILD_IMAGES_CURRENT_DIR = path.join(BUILD_DIR, 'images', 'current');
const BUILD_IMAGES_REFERENCE_DIR = path.join(BUILD_DIR, 'images', 'reference');
const REFERENCE_DIR = path.join(BASE_DIR, 'reference');
const REFERENCE_IMAGES_DIR = path.join(REFERENCE_DIR, 'images');
const WEBPACK_CACHE_DIR = path.join(BASE_DIR, 'node_modules', '.cache', 'webpack');
const ESLINT_CACHE_FILE = path.join(BASE_DIR, 'node_modules', '.cache', 'eslint.json');
const BUILD_ESM_PACKAGE_JSON_FILE = path.join(BUILD_ESM_DIR, 'package.json');

const LOCALHOST = 'http://127.0.0.1:8080';

// Flags for setting the webpack mode.
// See: https://webpack.js.org/configuration/mode/
// PRODUCTION_MODE enables minification and DEVELOPMENT_MODE disables code minification.
const PRODUCTION_MODE = 'production';
const DEVELOPMENT_MODE = 'development';

// Read environment variables to configure our scripts.
let DEBUG_CIRCULAR_DEPENDENCIES, DEVTOOL, GENERATE_IMAGES_ARGS;
function readEnvironmentVariables() {
  const env = process.env;
  let val = env.VEX_DEBUG_CIRCULAR_DEPENDENCIES;
  DEBUG_CIRCULAR_DEPENDENCIES = val === 'true' || val === '1';

  // Control the type of source maps that will be produced.
  // See: https://webpack.js.org/configuration/devtool/
  // In version 3.0.9 this environment variable was called VEX_GENMAP.
  DEVTOOL = env.VEX_DEVTOOL || 'source-map'; // for production builds with high quality source maps.
  if (DEVTOOL === 'false') {
    DEVTOOL = false;
  }

  val = env.VEX_GENERATE_OPTIONS;
  GENERATE_IMAGES_ARGS = val ? val.split(' ') : [];
}
readEnvironmentVariables();

function runCommand(command, ...args) {
  // The stdio option passes the output from the spawned process back to this process's console.
  spawnSync(command, args, { stdio: 'inherit' });
}

function webpackConfigs() {
  let pluginBanner;
  let pluginCircular;
  let pluginFork;
  let pluginTerser;

  // entryFiles is one of the following:
  //   an array of file names
  //   an object that maps entry names to file names
  //   a file name string
  // returns a webpack config object.
  function getConfig(entryFiles, mode, addBanner, libraryName, watch = false) {
    let entry, filename;
    if (Array.isArray(entryFiles)) {
      entry = {};
      for (const entryFileName of entryFiles) {
        // The entry point is a full path to a typescript file in vexflow/entry/.
        entry[entryFileName] = path.join(BASE_DIR, 'entry/', entryFileName + '.ts');
      }
      filename = '[name].js'; // output file names are based on the keys of the entry object above.
    } else if (typeof entryFiles === 'object') {
      entry = {};
      for (const k in entryFiles) {
        const entryFileName = entryFiles[k];
        entry[k] = path.join(BASE_DIR, 'entry/', entryFileName + '.ts');
      }
      filename = '[name].js'; // output file names are based on the keys of the entry object above.
    } else {
      // entryFiles is a string representing a single file name.
      const entryFileName = entryFiles;
      entry = path.join(BASE_DIR, 'entry/', entryFileName + '.ts');
      filename = entryFileName + '.js'; // output file name is the same as the entry file name, but with the js extension.
    }

    // Support different ways of loading VexFlow.
    // The `globalObject` string is assigned to `root` in line 15 of vexflow-debug.js.
    // VexFlow is exported as root["Vex"], and can be accessed via:
    //   - `window.Vex` in browsers
    //   - `globalThis.Vex` in node JS >= 12
    //   - `this.Vex` in all other environments
    // See: https://webpack.js.org/configuration/output/#outputglobalobject
    //
    // IMPORTANT: The outer parentheses are required! Webpack inserts this string into the final output, and
    // without the parentheses, code splitting will be broken. Search for `webpackChunkVex` inside the output files.
    let globalObject = `(typeof window !== 'undefined' ? window : typeof globalThis !== 'undefined' ? globalThis : this)`;

    function getPlugins() {
      const plugins = [];

      if (addBanner && typeof banner !== 'undefined') {
        if (!pluginBanner) {
          pluginBanner = new webpack.BannerPlugin(banner);
        }
        plugins.push(pluginBanner);
      }

      if (DEBUG_CIRCULAR_DEPENDENCIES) {
        if (!pluginCircular) {
          const CircularDependencyPlugin = require('circular-dependency-plugin');
          pluginCircular = new CircularDependencyPlugin({ cwd: process.cwd() });
        }
        plugins.push(pluginCircular);
      }

      if (!pluginFork) {
        pluginFork = new ForkTsCheckerWebpackPlugin({
          typescript: {
            diagnosticOptions: {
              semantic: true,
              syntactic: true,
              declaration: true,
              global: true,
            },
          },
          eslint: {
            files: ['./src/**/*.ts', './entry/**/*.ts', './tests/**/*.ts'],
            options: { fix: true, cache: true, cacheLocation: ESLINT_CACHE_FILE },
          },
        });
        plugins.push(pluginFork);
      }

      return plugins;
    }

    let optimization;
    if (mode === PRODUCTION_MODE) {
      if (!pluginTerser) {
        pluginTerser = new TerserPlugin({
          extractComments: false, // DO NOT extract the banner into a separate file.
          parallel: os.cpus().length - 1,
          terserOptions: { compress: true },
        });
      }
      optimization = {
        minimize: true,
        minimizer: [pluginTerser],
      };
    }

    // Turn on webpack's cache in DEVELOPMENT_MODE.
    const cache = mode === DEVELOPMENT_MODE ? { type: 'filesystem' } : false;

    return {
      mode,
      entry,
      cache,
      watch,
      output: {
        path: BUILD_CJS_DIR,
        filename: filename,
        library: {
          name: libraryName,
          type: 'umd',
          export: 'default',
        },
        globalObject,
      },
      resolve: { extensions: ['.ts', '.tsx', '.js', '...'] },
      devtool: DEVTOOL,
      module: {
        rules: [
          {
            test: /version\.ts$/,
            loader: 'string-replace-loader',
            options: {
              multiple: [
                { search: '__VF_VERSION__', replace: versionInfo.VERSION },
                { search: '__VF_GIT_COMMIT_ID__', replace: versionInfo.ID },
                { search: '__VF_BUILD_DATE__', replace: versionInfo.DATE },
              ],
            },
          },
          {
            test: /(\.ts$|\.js$)/,
            exclude: /node_modules/,
            resolve: { fullySpecified: false },
            use: [
              {
                // https://webpack.js.org/guides/build-performance/#typescript-loader
                // https://www.npmjs.com/package/fork-ts-checker-webpack-plugin
                loader: 'ts-loader',
                options: {
                  configFile: 'tsconfig.json',
                  transpileOnly: true,
                },
              },
            ],
          },
        ],
      },
      plugins: getPlugins(),
      optimization,
    };
  }

  // Friendly names for boolean flags that we use below.
  const BANNER = true;
  const WATCH = true;

  function prodConfig(watch = false) {
    return getConfig([VEX, VEX_BRAVURA, VEX_GONVILLE, VEX_PETALUMA, VEX_CORE], PRODUCTION_MODE, BANNER, 'Vex', watch);
  }

  // The font modules need to have different webpack configs because they have a different
  // exported library name (e.g., VexFlowFont.Bravura instead of Vex).
  function fontConfigs(watch = false) {
    return [
      getConfig('vexflow-font-bravura', PRODUCTION_MODE, !BANNER, ['VexFlowFont', 'Bravura'], watch),
      getConfig('vexflow-font-petaluma', PRODUCTION_MODE, !BANNER, ['VexFlowFont', 'Petaluma'], watch),
      getConfig('vexflow-font-gonville', PRODUCTION_MODE, !BANNER, ['VexFlowFont', 'Gonville'], watch),
      getConfig('vexflow-font-custom', PRODUCTION_MODE, !BANNER, ['VexFlowFont', 'Custom'], watch),
      // ADD_MUSIC_FONT
      // Add a webpack config for exporting your font module.
      // Provide the base name of your font entry file.
      // For an entry file at `entry/vexflow-font-xxx.ts`, use the string 'vexflow-font-xxx'.
      // Webpack will use this config to generate a CJS font module at `build/cjs/vexflow-font-xxx.js`.
      // getConfig('vexflow-font-xxx', PRODUCTION_MODE, !BANNER, ['VexFlowFont', 'XXX'], watch),
    ];
  }

  function debugConfig(watch = false) {
    return getConfig([VEX_DEBUG, VEX_DEBUG_TESTS], DEVELOPMENT_MODE, BANNER, 'Vex', watch);
  }

  return {
    // grunt webpack:prodAndDebug
    prodAndDebug: () => [prodConfig(), ...fontConfigs(), debugConfig()],
    // grunt webpack:prod
    prod: () => [prodConfig(), ...fontConfigs()],
    // grunt webpack:debug
    debug: () => debugConfig(),
    // grunt webpack:watchProd
    watchProd: () => [prodConfig(WATCH), ...fontConfigs(WATCH)],
    // grunt webpack:watchDebug
    watchDebug: () => debugConfig(WATCH),
  };
}

module.exports = (grunt) => {
  const log = grunt.log.writeln;

  grunt.initConfig({
    pkg: grunt.file.readJSON('package.json'),
    webpack: webpackConfigs(),

    // grunt qunit
    // Run unit tests on the command line by loading tests/flow-headless-browser.html.
    // Requires the CJS build to be present in the `build/cjs/` directory (See: grunt build:cjs).
    // The grunt-contrib-qunit package uses puppeteer to load the test page.
    qunit: { files: ['tests/flow-headless-browser.html'] },
    copy: {
      // grunt copy:reference
      // After `grunt test` call this to save the current build/ to reference/.
      reference: {
        files: [
          {
            expand: true,
            cwd: BUILD_DIR,
            src: ['**'],
            dest: REFERENCE_DIR,
          },
        ],
      },
      // grunt copy:save_reference_images
      // build/images/reference/ => reference/images/
      save_reference_images: {
        files: [
          {
            expand: true,
            cwd: BUILD_IMAGES_REFERENCE_DIR,
            src: ['**'],
            dest: REFERENCE_IMAGES_DIR,
          },
        ],
      },
      // grunt copy:restore_reference_images
      // reference/images/ => build/images/reference/
      restore_reference_images: {
        files: [
          {
            expand: true,
            cwd: REFERENCE_IMAGES_DIR,
            src: ['**'],
            dest: BUILD_IMAGES_REFERENCE_DIR,
          },
        ],
      },
    },
    // grunt clean
    // Calls all clean tasks below.
    clean: {
      // grunt clean:build
      build: { src: [BUILD_DIR] },
      // grunt clean:build_esm
      build_esm: { src: [BUILD_ESM_DIR] },
      // grunt clean:reference
      reference: { src: [REFERENCE_DIR] },
      // grunt clean:reference_images
      // Delete the image cache at reference/images/.
      reference_images: { src: [REFERENCE_IMAGES_DIR] },
      // grunt clean:webpack_cache
      // For debug builds, we use a webpack cache to speed up rebuilds.
      // https://webpack.js.org/guides/build-performance/#persistent-cache
      webpack_cache: { src: [WEBPACK_CACHE_DIR] },
      // grunt clean:eslint_cache
      eslint_cache: { src: [ESLINT_CACHE_FILE] },
    },
  });

  grunt.loadNpmTasks('grunt-contrib-clean');
  grunt.loadNpmTasks('grunt-contrib-copy');
  grunt.loadNpmTasks('grunt-contrib-qunit');
  grunt.loadNpmTasks('grunt-webpack');

  // grunt
  // Build all targets for production and debugging.
  grunt.registerTask('default', 'Build all VexFlow targets.', [
    'clean:build',
    'webpack:prodAndDebug',
    'build:esm',
    'build:types',
    'build:docs',
  ]);

  // grunt test
  // Run command line qunit tests.
  grunt.registerTask('test', 'Run command line unit tests.', ['clean:build', 'webpack:debug', 'qunit']);

  // grunt build:cjs
  grunt.registerTask('build:cjs', 'Use webpack to create CJS files in build/cjs/', 'webpack:prodAndDebug');

  // grunt build:esm
  // grunt build:esm:watch
  // Output individual ES module files to build/esm/.
  // Also fixes the imports and exports so that they all end in .js.
  grunt.registerTask('build:esm', 'Use tsc to create ES module files in build/esm/', function (arg) {
    function fixESM() {
      // Add .js file extensions to ESM imports and re-exports.
      runCommand('node', './tools/fix-esm-imports.mjs', './build/esm/');
      // Update the version.js file.
      versionInfo.saveESMVersionFile();
    }

    log('ESM: Building to ./build/esm/');
    fs.mkdirSync(BUILD_ESM_DIR, { recursive: true });
    // The build/esm/ folder needs a package.json that specifies { "type": "module" }.
    // This indicates that all *.js files in `vexflow/build/esm/` are ES modules.
    fs.writeFileSync(BUILD_ESM_PACKAGE_JSON_FILE, '{\n  "type": "module"\n}\n');
    if (arg === 'watch') {
      this.async(); // Set grunt's async mode to keep the task running forever.
      const TscWatchClient = require('tsc-watch/client');
      const watch = new TscWatchClient();
      watch.on('started', () => {
        console.log('Press CTRL + C to quit.');
      });
      watch.on('success', fixESM);
      watch.start('-p', 'tsconfig.esm.json', '--noClear');
    } else {
      runCommand('tsc', '-p', 'tsconfig.esm.json');
      fixESM();
    }
  });

  // grunt build:types
  // Output *.d.ts files to build/types/.
  grunt.registerTask('build:types', 'Use tsc to create *.d.ts files in build/types/', () => {
    log('Types: Building *.d.ts files in build/types/');
    runCommand('tsc', '-p', 'tsconfig.types.json');
  });

  // grunt build:docs
  // Use TypeDoc to automatically build API documentation to docs/api/.
  grunt.registerTask('build:docs', 'Build API documentation to docs/api/.', () => {
    runCommand('npx', 'typedoc');
  });

  // grunt watch
  // Watch for changes and build debug CJS files.
  grunt.registerTask('watch', 'The fastest way to iterate while working on VexFlow', [
    'clean:build',
    'webpack:watchDebug',
  ]);

  // grunt watch:prod
  // Watch for changes and build production CJS files. This might be slow!
  grunt.registerTask('watch:prod', 'Watch for changes and build production CJS files.', [
    'clean:build',
    'webpack:watchProd',
  ]);

  // grunt watch:esm
  // Watch for changes and build esm/*.
  // Run a web server with `npx http-server` to serve flow.html and the ESM files.
  grunt.registerTask('watch:esm', 'Watch for changes and build ESM files to build/esm/*', [
    'clean:build',
    'build:esm:watch',
  ]);

  // If you have already compiled the libraries, you can use the three `grunt test:xxx` tasks
  // below to test the existing build:

  // grunt test:cmd
  grunt.registerTask('test:cmd', 'Run command line unit tests.', 'qunit');

  // grunt test:browser:cjs
  // Open the default browser to the flow.html test page.
  grunt.registerTask(
    'test:browser:cjs',
    'Test the CJS build by loading the flow.html file in the default browser.',
    () => {
      // If the CJS build doesn't exist, build it.
      if (!fs.existsSync(BUILD_CJS_DIR)) {
        log('Building the CJS files.');
        grunt.task.run('webpack:debug');
      } else {
        log('CJS files already exist. Skipping the build step. To rebuild, run:');
        log('grunt clean:build && grunt test:browser:cjs');
      }
      open('./tests/flow.html');
    }
  );

  // grunt test:browser:esm
  // Open the default browser to http://localhost:8080/tests/flow.html?esm=true
  // Requires a web server (e.g., `npx http-server`).
  grunt.registerTask(
    'test:browser:esm',
    'Test the ESM build in a web server by navigating to http://localhost:8080/tests/flow.html?esm=true',
    function () {
      log('Launching http-server...');
      log('Building the ESM files in watch mode...');
      grunt.task.run('clean:build_esm');
      this.async(); // keep this grunt task alive.
      concurrently([
        { command: 'npx http-server -o /tests/flow.html?esm=true', name: 'server' },
        { command: 'grunt build:esm:watch', name: 'watch:esm' },
      ]);
    }
  );

  // grunt reference
  // Build the current HEAD revision and copy it to reference/
  // After developing new features or fixing a bug, you can compare the current
  // working tree against the reference with: grunt test:reference
  grunt.registerTask('reference', 'Build to reference/.', [
    'clean:build',
    'clean:reference',
    'webpack:prodAndDebug',
    'build:esm',
    'copy:reference',
  ]);

  // grunt generate:current
  // Create images from the VexFlow in build/.
  // node ./tools/generate_images.js build ./build/images/current ${VEX_GENERATE_OPTIONS}
  grunt.registerTask('generate:current', 'Create images from the VexFlow version in build/.', () => {
    runCommand('node', './tools/generate_images.js', 'build', './build/images/current', ...GENERATE_IMAGES_ARGS);
  });

  // grunt generate:reference
  // Create images from VexFlow library in reference/
  // node ./tools/generate_images.js reference ./build/images/reference ${VEX_GENERATE_OPTIONS}
  grunt.registerTask('generate:reference', 'Create images from the VexFlow version in reference/.', () => {
    runCommand('node', './tools/generate_images.js', 'reference', './build/images/reference', ...GENERATE_IMAGES_ARGS);
  });

  // grunt generate:release:X.Y.Z
  // Create images from the VexFlow library in releases/X.Y.Z/
  // node ./tools/generate_images.js releases/X.Y.Z ./build/images/X.Y.Z ${VEX_GENERATE_OPTIONS}
  grunt.registerTask('generate:release', 'Create images from the VexFlow version in releases/X.Y.Z/', (ver) => {
    console.log(`Creating images with VexFlow version ${ver}.`);
    console.log('Saving images to build/images/X.Y.Z/');
    runCommand(
      'node',
      './tools/generate_images.js',
      'releases/' + ver,
      './build/images/' + ver,
      ...GENERATE_IMAGES_ARGS
    );
  });

  // grunt diff:reference
  // Visual regression test compares images from the current build vs images from the reference build.
  grunt.registerTask(
    'diff:reference',
    'Compare images created by the build/ and reference/ versions of VexFlow.',
    () => {
      runCommand('./tools/visual_regression.sh', 'reference');
    }
  );

  // grunt diff:ver:X.Y.Z
  // grunt diff:ver:3.0.9 compares images created by the VexFlow library in build/ and releases/3.0.9/.
  // Run this after you have created images with `grunt generate:release:X.Y.Z`.
  grunt.registerTask(
    'diff:ver',
    'Compare images created by the build/ and releases/X.Y.Z/ versions of VexFlow',
    (version) => {
      // Make sure the folder exists.
      const dirA = path.join(BUILD_DIR, 'images', version);
      const dirB = BUILD_IMAGES_CURRENT_DIR;
      if (!fs.existsSync(dirA)) {
        grunt.fail.fatal('Missing images directory.\n' + dirA);
      }
      if (!fs.existsSync(dirB)) {
        grunt.fail.fatal('Missing images directory\n' + dirB);
      }

      runCommand('./tools/visual_regression.sh', version);
    }
  );

  // grunt test:reference
  // Visual regression test to compare the current build/ and reference/ versions of VexFlow.
  grunt.registerTask('test:reference', 'Generate images from build/ and reference/ and compare them.', [
    'test',
    'generate:current',
    'generate:reference',
    'diff:reference',
  ]);

  // grunt test:reference:cache
  // Faster than `grunt test:reference` because it reuses the existing reference images if available.
  grunt.registerTask('test:reference:cache', 'Save and Reuse existing reference images.', [
    'cache:save:reference',
    'test',
    'generate:current',
    'cache:restore:reference',
    'diff:reference',
  ]);

  // grunt cache:save:reference
  // Helper task to save the references images.
  grunt.registerTask('cache:save:reference', 'Helper task for test:reference:cache.', () => {
    if (fs.existsSync(BUILD_IMAGES_REFERENCE_DIR)) {
      grunt.task.run('clean:reference_images');
      grunt.task.run('copy:save_reference_images');
    }
  });

  // grunt cache:restore:reference
  // Helper task to make sure the reference images are available for our visual regression tests.
  // If the reference images are not available, run the 'generate:reference' task.
  grunt.registerTask('cache:restore:reference', 'Helper task for test:reference:cache.', () => {
    if (fs.existsSync(REFERENCE_IMAGES_DIR)) {
      grunt.task.run('copy:restore_reference_images');
    } else {
      grunt.task.run('generate:reference');
    }
  });

  // grunt get:releases:X.Y.Z:A.B.C:...
  // grunt get:releases:3.0.9:4.0.0   =>   node ./tools/get_releases.mjs 3.0.9 4.0.0
  // Retrieve previous releases from the git repository or from npm.
  // Note: the arguments are separated by colons!
  grunt.registerTask('get:releases', 'Retrieve previous releases.', (...args) => {
    runCommand('node', './tools/get_releases.mjs', ...args);
  });

  // Release to npm and GitHub.
  // Specify "dry-run" to walk through the release process without actually doing anything.
  // Optionally provide a preRelease tag ( alpha | beta | rc ).
  // Remember to use your GitHub personal access token:
  //   GITHUB_TOKEN=XYZ grunt release
  //   GITHUB_TOKEN=XYZ grunt release:alpha
  //   GITHUB_TOKEN=XYZ grunt release:beta
  //   GITHUB_TOKEN=XYZ grunt release:rc
  //   GITHUB_TOKEN=XYZ grunt release:dry-run
  //   GITHUB_TOKEN=XYZ grunt release:dry-run:alpha
  //   GITHUB_TOKEN=XYZ grunt release:dry-run:beta
  //   GITHUB_TOKEN=XYZ grunt release:dry-run:rc
  // See the wiki for information on manual releases:
  //   https://github.com/0xfe/vexflow/wiki/Build,-Test,-Release#publish-manually-to-npm-and-github
  grunt.registerTask('release', 'Produce the complete build. Release to npm and GitHub.', function (...args) {
    if (!process.env.GITHUB_TOKEN) {
      console.warn(
        'GITHUB_TOKEN environment variable is missing.\n' +
          'You can manually release to GitHub at https://github.com/0xfe/vexflow/releases/new\n' +
          'Or use the GitHub CLI:\n' +
          'gh release create 4.0.0 --title "Release 4.0.0"'
      );
    }

    const done = this.async();

    // See the full list of options at:
    // https://github.com/release-it/release-it
    // https://github.com/release-it/release-it/blob/master/config/release-it.json
    const options = {
      // verbose: 1, // See the output of each hook.
      // verbose: 2, // Only for debugging.
      hooks: {
        'before:init': ['grunt clean'],
        'after:bump': [
          'grunt',
          'echo Adding build/ folder...',
          'git add -f build/',
          "git commit -m 'Add build/ for release version ${version}.'",
        ],
        'after:npm:release': ['echo COMPLETE: Published to npm.'],
        'after:git:release': ['echo COMPLETE: Committed to git repository.'],
        'after:github:release': ['echo COMPLETE: Released to GitHub.'],
        'after:release': [
          'echo Removing build/ folder...',
          'git rm -r build/',
          "git commit -m 'Remove build/ after releasing version ${version}.'",
          'git push',
          'echo Successfully released ${name} ${version} to https://github.com/${repo.repository}',
        ],
      },
      git: {
        changelog: false, // After 4.0: set to true to start publishing recent git commit history as a mini changelog.
        commitMessage: 'Release VexFlow ${version}',
        requireCleanWorkingDir: true,
        commit: true,
        tag: true,
        push: true,
      },
      github: { release: true },
      npm: { publish: true },
    };

    if (args.includes('dry-run')) {
      options['dry-run'] = true;
      console.log('====== DRY RUN MODE ======');
    }
    // Handle preRelease tags: alpha | beta | rc.
    if (args.includes('alpha')) {
      options['preRelease'] = 'alpha';
    }
    if (args.includes('beta')) {
      options['preRelease'] = 'beta';
    }
    if (args.includes('rc')) {
      options['preRelease'] = 'rc';
    }

    release(options).then((output) => {
      done();
    });
  });
};
