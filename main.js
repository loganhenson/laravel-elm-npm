const spawn = require('child_process').spawn;
const fs = require('fs');
const chokidar = require('chokidar');
const elmPath = 'resources/assets/elm/';

/**
 |--------------------------------------------------------------------------
 | Retrieves directories with a Main.elm in `resources/assets/elm`
 |--------------------------------------------------------------------------
 */
const getPrograms = function (done) {
    let programs = [];

    fs.readdir(elmPath, (err, files) => {
        files.forEach(file => {
            if (fs.readdirSync(`${elmPath}${file}`)
                    .filter((files) => {
                        return files.includes('Main.elm');
                    }).length > 0) {
                programs.push(`${elmPath}${file}/Main.elm`);
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
    const command = `elm make ${programs.join(' ')} --output ./public/js/elm.js --warn --yes ${debug}`;

    return spawn(
        command,
        {
            shell: true,
            stdio: 'inherit'
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
            elmPath, {persistent: true}
        ).on('change', make);
    }
};

module.exports = elm;
