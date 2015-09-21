'use strict';

var baseConfig,
    crypto = require('crypto'),
    _ = require('lodash');

try {
  baseConfig = require(process.env.PWD + '/config.json');
} catch(e) {
  if (e.code !== 'MODULE_NOT_FOUND') {
    throw e;
  }
  baseConfig = {};
}

var config = _.defaults({}, baseConfig, {
  host: 'localhost',
  port: 3002,

  mongoHost: 'localhost',
  mongoPort: 27017,
  mongoDB: 'artikulera',
  mongoUsername: null,
  mongoPassword: null,

  locales: ['en'],
  logPath: null,

  cookieSecret: crypto.randomBytes(64).toString(),
  cookieName: 'artikulera.id',
  cookieMaxAge: 900000,

  siteConfig: {
    theme: 'brendan'
  },

  get mongoURL() {
    return 'mongodb://' + this.mongoHost + ':' + this.mongoPort + '/' + this.mongoDB;
  }
});

module.exports = Object.freeze(config);
