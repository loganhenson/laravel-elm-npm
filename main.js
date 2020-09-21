const util = require('util')
const fs = require('fs').promises
const exec = util.promisify(require('child_process').exec)
const { readdirSync, statSync } = require('fs')
const path = require('path')
const chokidar = require('chokidar')
const elmPath = path.resolve(process.cwd(), 'resources/elm')
const publicPath = path.resolve(process.cwd(), 'public')
const cwd = path.resolve(process.cwd(), elmPath)
const WebSocket = require('ws')
const mix = require('laravel-mix')

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

const toggleDebug = async (production) => {
  const LaravelElmPath = path.resolve(elmPath, 'laravel-elm-stuff', 'LaravelElm.elm')
  let LaravelElmContents = await fs.readFile(LaravelElmPath, 'utf8')

  const developmentDebug = '                            , sendStateToDevtools <| Debug.toString newModel.state'
  const productionDebug = '                            , Cmd.none'
  const debugRegex = /(?<=-- DEBUG_TOGGLE\n)(.*)(?=\n\s+-- END_DEBUG_TOGGLE)/gm

  if (production) {
    LaravelElmContents = LaravelElmContents.replace(
      debugRegex,
      productionDebug
    )
  } else {
    LaravelElmContents = LaravelElmContents.replace(
      debugRegex,
      developmentDebug
    )
  }

  await fs.writeFile(LaravelElmPath, LaravelElmContents)
}

/**
 |--------------------------------------------------------------------------
 | elm make
 |--------------------------------------------------------------------------
 */
const make = async () => {
  const programs = await getPrograms(elmPath)
  const production = process.env.NODE_ENV === 'production'
  const command = `elm make ${programs.join(' ')} --output=${publicPath}/js/elm.js ${production ? '--optimize' : ''}`

  await toggleDebug(production)

  try {
    const { stdout } = await exec(
      command,
      {
        cwd: cwd,
      }
    )
    console.log(stdout)
  } catch (e) {
    let msg = e.message.split('\n')
    msg.shift()
    msg = msg.join('\n')
    console.error(msg)

    if (production) {
      if (e.message.includes('DEBUG REMNANTS')) {
        //
      }

      process.exit(e.code)
    }
  }

  return Promise.resolve()
}

let websocket = null
const startWS = () => {
  const wss = new WebSocket.Server({
    port: 3030,
  })

  wss.on('connection', (ws) => {
    websocket = ws
  })
}

const elm = async () => {
  /**
   * Check for --watch
   */
  if (process.argv.includes('--watch')) {
    startWS()

    chokidar.watch(
      elmPath, {
        ignored: [
          '**/elm-stuff/**/*',
          '**/laravel-elm-stuff/LaravelElm.elm',
        ],
        ignoreInitial: true
      }
    ).on('all', async () => {
      await make()

      if (websocket) {
        websocket.send('reload')
      }
    })
  }

  const made = await make()

  if (mix.inProduction()) {
    mix.minify('public/js/elm.js').version(['public/js/elm.min.js'])
  }

  return made
}

mix.extend('elm', elm)

module.exports = elm
