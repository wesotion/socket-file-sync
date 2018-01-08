const io = require('socket.io-client');
const socketWrap = require('../utils/socket');
const streamSocket = require('../utils/socket-stream');
const fs = require('fs-extra');
const Path = require('path');
const debounce = require('debounce-queue');
const watch = require('../utils/watch');

module.exports = client;

function compileCwd(cwd) {
  if (cwd.startsWith('.')) {
    return Path.resolve(process.cwd(), cwd);
  }
  return cwd;
}

async function client(inConfig) {
  let config = inConfig.cwdConfig;
  let cwd = compileCwd(config.cwd);
  let server = config.server;
  if (!server.match(/^http|^\/\//)) {
    server = 'http://' + config.server;
  }
  const serverDir = config.serverDir;
  server = server + ':' + config.port;
  console.log('Connecting to', server + '...');

  const socket = socketWrap(io.connect(server));

  const initialize = () => {
    socket.emit('auth', config.secret);
    socket.emit('server-dir', serverDir);
  };

  socket.on('connect', () => {
    console.log('Connected. Initializing...');
    initialize();
  });
  socket.on('disconnect', () => console.warn('Disconnected. Waiting to reconnect...'));
  socket.on('error', error => console.error('Error:', error));
  socket.on('reconnect', () => {
    console.log('Reconnected. Re-initializing');
    initialize();
  });

  socket.on('auth:response', error => error
    ? console.error('Failed to authenticate.', error)
    : console.log('Authenticated'));

  socket.on('server-dir:response', (error, { serverDir }) => error
    ? console.error('Cannot sync to:', serverDir, error)
    : console.log('Syncing to:', serverDir));

  const send = streamSocket(socket, () => cwd, mode => {
    if (mode === 'receive' && !config.twoWay) {
      throw new Error('Rejected file sent from server. Set --two-way option to enable')
    }
  });

  const watcher = await watch(cwd, { cwd: cwd });
  watcher.on('change', debounce(files => files.map(relative => send({ relative })), 1000));
  watcher.on('add', debounce(files => files.map(relative => send({ relative })), 1000));
  if (config.deleteOnRemote) {
    console.log('delete-on-remote enabled');
    watcher.on('unlink', debounce(files => files.map(relative => {
      console.log('Deleting file', relative);
      socket.emit('delete-file', { relative });
    }), 1000));
  }
  socket.on('delete-file', async ({ relative } = {}) => {
    if (!config.deleteByRemote) {
      throw new Error('delete-by-remote not enabled')
    }
    await fs.remove(Path.join(cwd, relative));
    socket.emit('delete-file:response', null, { relative });
  });
  socket.on('delete-file:response', (error, { relative } = {}) => error
    ? console.error('Failed to delete file on remote:', relative, error)
    : console.log('Deleted file', relative));

  socket.once('server-dir:response', error => {
    if (!error && config.twoWay) {
      console.log('Enabling two-way sync from server...');
      socket.emit('enable-two-way');
    }
  });
  socket.on('enable-two-way:response', error => error
    ? console.error('Failed to enable two-way sync by server.', error)
    : (console.log('Two-way enabled by server'),
      config.deleteByRemote
        ? console.log('delete-by-remote enabled')
        : console.log('delete-by-remote not enabled'))
  );

}
