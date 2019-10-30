const spawn = require('child_process').spawn;
const {readdir, readdirSync, lstatSync} = require('fs');
const path = require('path');
const chokidar = require('chokidar');
const elmPath = path.resolve(process.cwd(), 'resources/elm');
const publicPath = path.resolve(process.cwd(), 'public');
const cwd = path.resolve(process.cwd(), elmPath);

/**
 |--------------------------------------------------------------------------
 | Retrieves directories with a Main.elm in `resources/assets/elm`
 |--------------------------------------------------------------------------
 */
const getPrograms = function (done) {
    let programs = [];

    readdir(elmPath, (err, files) => {
        files
            .forEach(file => {
                let modulePath = path.resolve(elmPath, file);

                if (lstatSync(modulePath).isDirectory() && readdirSync(modulePath)
                    .filter((files) => {
                        return files.includes('Main.elm');
                    }).length > 0) {
                    programs.push(`${file}/Main.elm`);
                }
            });

        done(programs);
    });
};

/**
 |--------------------------------------------------------------------------
 | elm-make
 |--------------------------------------------------------------------------
 */
const make = getPrograms.bind(null, (programs) => {
    const debug = process.env.NODE_ENV === 'production' ? '' : '--debug';
    const command = `elm make ${programs.join(' ')} --output=${publicPath}/js/elm.js ${debug ? '' : '--optimize'}`;

    return spawn(
        command,
        {
            shell: true,
            stdio: 'inherit',
            cwd: cwd,
        }
    );
});

/**
 |--------------------------------------------------------------------------
 | Elm callback to pass to mix.then() `mix.then(elm)`
 |--------------------------------------------------------------------------
 */
const elm = () => {
    make();

    /**
     * Check for --watch
     */
    if (process.argv.includes('--watch')) {
        chokidar.watch(
            elmPath, {ignored: '**/elm-stuff/**/*',}
        ).on('change', make);
    }
};

module.exports = elm;
