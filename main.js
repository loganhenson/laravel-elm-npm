const util = require('util')
const exec = util.promisify(require('child_process').exec)
const { readdirSync, statSync } = require('fs')
const path = require('path')
const chokidar = require('chokidar')
const elmPath = path.resolve(process.cwd(), 'resources/elm')
const publicPath = path.resolve(process.cwd(), 'public')
const cwd = path.resolve(process.cwd(), elmPath)
const mix = require('laravel-mix');

/**
 |--------------------------------------------------------------------------
 | Retrieves directories with a Main.elm in `resources/elm`
 |--------------------------------------------------------------------------
 */
const getPrograms = async (dir, allPrograms = []) => {
  const files = readdirSync(dir)

  for (let filename of files) {
    const filepath = path.resolve(dir, filename)

    if (statSync(filepath).isDirectory()) {
      getPrograms(filepath, allPrograms)
    } else if (path.basename(filename) === 'Main.elm') {
      allPrograms.push(filepath)
    }
  }

  return allPrograms
}

/**
 |--------------------------------------------------------------------------
 | elm make
 |--------------------------------------------------------------------------
 */
const make = async () => {
  const programs = await getPrograms(elmPath)
  const debug = process.env.NODE_ENV === 'production' ? '' : '--debug'
  const command = `elm make ${programs.join(' ')} --output=${publicPath}/js/elm.js ${debug ? '' : '--optimize'}`

  try {
    const { stdout } = await exec(
      command,
      {
        cwd: cwd,
      }
    )
    console.log(stdout)
  } catch (e) {
    if (e.message.includes('DEBUG REMNANTS')) {
      let msg = e.message.split('\n')
      msg.shift()
      msg = msg.join('\n')
      console.error(msg)
    }

    process.exit(e.code)
  }

  return Promise.resolve()
}

const elm = () => {
  /**
   * Check for --watch
   */
  if (process.argv.includes('--watch')) {
    chokidar.watch(
      elmPath, { ignored: '**/elm-stuff/**/*', ignoreInitial: true }
    ).on('all', make)
  }

  return make()
}

mix.extend("elm", elm);

module.exports = elm
