const Config = require('configucius').default;

const main = exports.main = new Config({
  configFile: '~/.socket-file-sync',
  options: {
    secret: {
      type: 'string',
      save: true,
      prompt: true,
    },
    port: {
      type: 'number',
      default: 50581,
      save: true,
    },
    server: {
      alias: 'mainServer',
      type: 'string',
      save: true,
      prompt: 'Main server',
    },
    cwd: {
      type: 'string',
      default: process.cwd(),
    },
    mode: {
      type: 'string',
    },
    twoWay: {
      alias: 'twoway',
      type: 'boolean',
      save: true,
      prompt: true,
    },
    deleteOnRemote: {
      type: 'boolean',
      save: true,
      prompt: true,
    },
    deleteByRemote: {
      type: 'boolean',
      save: true,
      prompt: true,
    },
    editConfig: {
      alias: 'e',
      type: 'boolean',
    },
    help: {
      alias: ['h', '?'],
      type: 'boolean',
    },
  },
});

const project = exports.project = main.project = new Config({
  configFile: main.cwd + '/.socket-file-sync',
  options: {
    server: {
      alias: 'projectServer',
      type: 'string',
      save: true,
      prompt: 'Server for this project',
    },
    secret: {
      alias: 'projectServerSecret',
      type: 'string',
      save: true,
      prompt: config => config.server && "Secret for this project's server",
    },
    serverDir: {
      type: 'string',
      save: true,
      prompt: 'Server project dir',
    },
    saveProject: {
      type: 'boolean',
      default: true,
    },
    twoWay: {
      alias: 'twoway',
      type: 'boolean',
      save: true,
      prompt: true,
    },
    deleteOnRemote: {
      type: 'boolean',
      save: true,
      prompt: true,
    },
    deleteByRemote: {
      type: 'boolean',
      save: true,
      prompt: true,
    },
  },
});

module.exports = new Proxy(main, {
  get: (main, key) => main[key] || project[key],
});

module.exports.project = new Proxy(project, {
  get: (project, key) => project[key] || main[key],
});
