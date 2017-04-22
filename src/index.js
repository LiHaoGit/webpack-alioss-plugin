/* @flow */

const co = require('co')
const oss = require('ali-oss')
const chalk = require('chalk')
const _ = require('lodash')
const red = chalk.red
const green = chalk.bold.green

const config: {
  auth: {
    accessKeyId: string,
    accessKeySecret: string,
    bucket: string,
    region: string
  },
  prefix: string,
  exclude: any,
  enableLog: boolean,
  ignoreError: boolean,
  removeMode: boolean
} = {
  auth: {
    accessKeyId: '',
    accessKeySecret: '',
    bucket: '',
    region: ''
  },
  prefix: '',
  exclude: /.*/,
  enableLog: true,
  ignoreError: false,
  removeMode: true
}
let store = null

const logInfo = (str: string) => {
  !config.enableLog || console.log(str)
}

module.exports = class WebpackAliOSSPlugin {
  constructor (cfg: {
    accessKeyId: string,
    accessKeySecret: string,
    bucket: string,
    region: string,
    prefix: ?string,
    exclude: ?string,
    ignoreError: ?boolean,
    enableLog: ?boolean,
    deleteMode: ?boolean
  }) {
    config.auth.accessKeyId = cfg.accessKeyId
    config.auth.accessKeySecret = cfg.accessKeySecret
    config.auth.bucket = cfg.bucket
    config.auth.region = cfg.region
    config.prefix = cfg.prefix && cfg.prefix.endsWith('/') ? cfg.prefix : `${cfg.prefix}/`
    config.exclude = cfg.exclude && cfg.exclude !== '' ? cfg.exclude : config.exclude
    config.ignoreError = cfg.ignoreError ? cfg.ignoreError : false
    config.enableLog = cfg.enableLog === false ? cfg.enableLog : true
    config.removeMode = cfg.deleteMode === false ? cfg.deleteMode : true
  }

  apply (compiler: {
    plugin: Function
  }) {
    store = oss(config.auth)
    compiler.plugin('emit', (compilation, cb) => {
      uploadFiles(compilation)
        .then(() => {
          cb()
        })
        .catch((err) => {
          console.log('\n')
          console.log(`${red('OSS 上传出错')}:::: ${red(err.name)}-${red(err.code)}: ${red(err.message)}`)
          if (config.ignoreError) {
            cb()
          } else {
            cb(err)
          }
        })
    })
  }
}

let uploadIndex = 0
const uploadFiles = (compilation) => {
  const files = getAssetsFiles(compilation)
  return Promise.all(files.map((file, index, arr) => {
    return uploadFile(file.name, file)
      .then((result) => {
        if (uploadIndex++ === 0) {
          logInfo(green('\n\n OSS 上传中......'))
        }
        logInfo(`上传成功: ${file.name}`)
        if (files.length === uploadIndex) {
          logInfo(green('OSS 上传完成\n'))
        }
        !config.removeMode || delete compilation.assets[file.name]
        // Promise.resolve('上传成功')
      }, (e) => {
        return Promise.reject(e)
      })
  }))
}

declare var Buffer: {
  from: Function
}

const uploadFile = (name, assetObj) => {
  return co(function *() {
    const uploadName = `${config.prefix}${name}`
    if (store !== null) {
      return yield store.put(uploadName, Buffer.from(assetObj.content))
    }
  })
}

const getAssetsFiles = ({assets}) => {
  var items = _.map(assets, (value, name) => {
    if (!config.exclude.test(name)) {
      return {name, path: value.existsAt, content: value.source()}
    }
  })
  const newItems = []
  for (const item of items) {
    if (item && item.name) {
      newItems.push(item)
    }
  }
  return newItems
}
