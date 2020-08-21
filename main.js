const util = require('util')
const spawn = util.promisify(require('child_process').spawn)
const { readdir, lstat } = require('fs').promises
const path = require('path')
const chokidar = require('chokidar')
const elmPath = path.resolve(process.cwd(), 'resources/elm')
const publicPath = path.resolve(process.cwd(), 'public')
const cwd = path.resolve(process.cwd(), elmPath)

/**
 |--------------------------------------------------------------------------
 | Retrieves directories with a Main.elm in `resources/assets/elm`
 |--------------------------------------------------------------------------
 */
const getPrograms = async () => {
  return (await readdir(elmPath))
    .reduce(async (programs, file) => {
      let modulePath = path.resolve(elmPath, file)

      if (((await lstat(modulePath)).isDirectory())
        && (await readdir(modulePath)).filter(files => files.includes('Main.elm')).length > 0) {
        (await programs).push(`${file}/Main.elm`)
      }

      return programs;
    }, [])
}

/**
 |--------------------------------------------------------------------------
 | elm-make
 |--------------------------------------------------------------------------
 */
const make = async () => {
  const programs = await getPrograms()
  const debug = process.env.NODE_ENV === 'production' ? '' : '--debug'
  const command = `elm make ${programs.join(' ')} --output=${publicPath}/js/elm.js ${debug ? '' : '--optimize'}`

  return spawn(
    command,
    {
      shell: true,
      stdio: 'inherit',
      cwd: cwd,
    }
  )
}

/**
 |--------------------------------------------------------------------------
 | Elm callback to pass to mix.then() `mix.then(elm)`
 |--------------------------------------------------------------------------
 */
const elm = () => {
  /**
   * Check for --watch
   */
  if (process.argv.includes('--watch')) {
    chokidar.watch(
      elmPath, { ignored: '**/elm-stuff/**/*', }
    ).on('change', make)
  }

  return make()
}

module.exports = elm
