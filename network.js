var colors = require('colors')
  , util = require('util')
  , irc = require('irc')
  , fs = require('fs')
  , _ = require('underscore')
  , Channel = require('./channel');


function Network() {
  // An object for storing current channels
  this.channels = {};
  this.config = {};
  
  console.log('Starting up network', process.argv[2].green);
  this.loadConfig();
  this.loadChannels();
  this.startClient();
}
util.inherits(Network, irc.Client);

Network.prototype.loadConfig = function () {
  this.config = JSON.parse(fs.readFileSync(process.cwd() + '/config.json'));
};

Network.prototype.loadChannels = function () {
  var channels = fs.readdirSync(process.cwd());
  // Filter to only contain items starting with a valid channel prefix.
  channels = channels.filter(function (c) { if ('!#+&'.indexOf(c[0]) != -1) { return c; } });
  this.channels = channels;
};

Network.prototype.startClient = function () {
  var c = this.config;
  // Create an irc client
  irc.Client.call(this, c.address, c.nick, {
    userName: c.userName,
    realName: c.realName,
    floodProtection: c.floodProtection,
    autoRejoin: c.autoRejoin,
    channels: this.channels
  });
  this.nick = c.nick;
};

var network = new Network();


network.on('registered', function onConnect(msg) {
  console.log('Connected to server. :O)');
});

network.on('join', function onJoin(ch, nick, msg) {
  if (nick == this.nick) {
    console.log('I joined channel %s.', ch.green);
    var channel = this.channels[ch] = new Channel(this, ch);
    this.on('message' + ch, function (from, message) {
      channel.handleMessage.call(channel, from, message);
    });
  } else {
    console.log('User %s joined channel %s.', nick.green, ch.green);
  }
});

network.on('kill', function (nick, reason, chs, msg) {
  if (nick === network.nick) {
    log.error('I was killed! :O');
  }
});

network.on('names', function onNames(channel, nicks) {
  console.log('Names (%s) [%s]', channel.green, Object.keys(nicks).join(', '.magenta));
  //network.channels[channel] = new Channel(network, channel, nicks);
});

network.on('message', function (from, to, message) {
  console.log(from + ' => ' + to + ': ' + message);
  process.send({type: 'message', message: message});
});

network.on('raw', function (msg) {
  //console.log(msg.command);
});
