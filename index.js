const fs = require('fs');
const async = require('async');
const path = require('path');

const defaultOptions = {
    filesDirectory: './src/custom/components/',
    targetFile: './src/custom/index.js'
};

class CustomFileConcatPlugin {
    constructor(userOptions) {
        this.options = userOptions
            ? mergeOptions(userOptions, defaultOptions)
            : defaultOptions;
        this.files = [];
    }

    apply(compiler) {
        if (process.env.NODE_ENV === 'production') {
            compiler.hooks.run.tapPromise(
                'CustomFileConcatPlugin',
                compiler => {
                    return this.handleFiles();
                }
            );
        } else {
            compiler.hooks.watchRun.tapPromise(
                'CustomFileConcatPlugin',
                compiler => {
                    if (
                        hasFileChangesInDirectory(
                            compiler,
                            this.options.filesDirectory
                        )
                    ) {
                        return this.handleFiles();
                    }
                    return Promise.resolve(false);
                }
            );

            // We need to add the custom files as watched dependencies
            // because they are not in Webpack dependency tree (only the
            // concatenated file is there) and we want to update the
            // concatenated file when one of the dependent file is updated
            compiler.hooks.afterCompile.tapAsync(
                'CustomFileConcatPlugin',
                (compilation, callback) => {
                    // Adding directory
                    addFolderToDependencies(
                        compilation,
                        this.options.filesDirectory
                    );

                    // Adding files
                    addFilesToDependencies(
                        this.files,
                        compilation.fileDependencies,
                        compilation.compiler.context
                    );
                    callback();
                }
            );
        }
    }

    handleFiles() {
        return getFilesInDirectory(this.options.filesDirectory)
            .then(files => {
                this.files = files;
            })
            .then(() =>
                concatFilesToTarget(this.files, this.options.targetFile)
            );
    }
}

function hasFileChangesInDirectory(compiler, targetDirectory) {
    const fileChanges = getChangedFiles(compiler);
    return (
        // No changes means starting
        fileChanges.length === 0 ||
        // Otherwise, checking if any file inside the targetDirectory
        fileChanges.filter(file => {
            return path.relative(targetDirectory, file).indexOf('..') === -1;
        }).length > 0
    );
}

function getChangedFiles(compiler) {
    const { watchFileSystem } = compiler;
    const watcher = watchFileSystem.watcher || watchFileSystem.wfs.watcher;

    return Object.keys(watcher.mtimes);
}

function getFilesInDirectory(directory) {
    return new Promise((resolve, reject) => {
        fs.readdir(directory, (err, files) => {
            if (err) return reject(err);

            resolve(files.map(file => path.join(directory, file)));
        });
    });
}

function concatFilesToTarget(filesToConcat, targetPath) {
    return new Promise((resolve, reject) => {
        // Read all files in parallel
        async.map(
            filesToConcat,
            (file, cb) => {
                fs.readFile(file, (err, data) => {
                    cb(err, '// Content of file ' + file + '\n' + data);
                });
            },
            (err, results) => {
                if (err) return reject(err);

                const content = headerString + results.join('\n');

                // Write the joined results to destination
                fs.writeFile(targetPath, content, err => {
                    if (err) return reject(err);

                    // When writing the file, we write it in the past to avoid infinite loops
                    // See https://github.com/webpack/watchpack/issues/25 for more details
                    const now = Date.now() / 1000;
                    const then = now - 11;
                    fs.utimesSync(targetPath, then, then);

                    resolve();
                });
            }
        );
    });
}

function addFolderToDependencies(compilation, folderPath) {
    compilation.contextDependencies.add(
        path.join(compilation.compiler.context, folderPath)
    );
}

function addFilesToDependencies(files, dependencies, contextPath) {
    files.forEach(file => {
        dependencies.add(path.join(contextPath, file));
    });
}

function mergeOptions(options, defaults) {
    for (const key in defaults) {
        if (options.hasOwnProperty(key)) {
            defaults[key] = options[key];
        }
    }
    return defaults;
}

module.exports = CustomFileConcatPlugin;

const headerString =
    '/*******************************************************************************\n\
 *******************************************************************************\n\
 ************* THIS FILE IS AUTOMATICALLY GENERATED AT BUILD TIME **************\n\
 ************* PLEASE DO NOT MODIFY OR YOU WILL LOOSE YOUR CHANGES *************\n\
 ************* -> Change files individually in the ./custom folder *************\n\
 *******************************************************************************\n\
 *******************************************************************************/\n\n';
