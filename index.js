'use strict';

const TAG = 'artikulera';

var process = require('process'),
    resolvePath = require('resolve-path'),
    app = require('koa')(),
    Log = require('huggare').defaults(),
    mongoose = require('mongoose'),
    views = require('koa-views'),
    logger = require('koa-huggare'),
    helmet = require('koa-helmet'),
    session = require('koa-session'),
    passport = require('koa-passport'),
    passportMongo = require('passport-mongodb');

Log.i(TAG, 'Loading config: ' + process.env.PWD + '/config.json');

var config = require('./config'),
    models = require('./models')(mongoose),
    ThemeManager = require('./theme-manager');

// Pre-routing
/*
if (config.logPath) {
  Log.addTransport(loggers.FlatFileFormatter({
    path: config.logPath
  }));
} else {
  Log.w(TAG, 'no logPath specified; logging only to console.');
}
*/

app.name = TAG;
app.keys = [config.cookieSecret];
app.proxy = config.proxy || true;

app
.use(logger({
  exclude: /^\/static/
}))
.use(views(resolvePath(__dirname, 'views'), {
  map: { html: 'jade' },
  default: 'jade'
}))
.use(helmet());

Log.i(TAG, 'Connecting to mongodb...');

mongoose.connect(config.mongoURL);

var db = mongoose.connection;

db.on('error', function(err) {
  Log.e(TAG, 'mongodb connection error:', err);
});

db.on('disconnected', function(e) {
  Log.e(TAG, 'mongodb disconnected.', e);
});

db.on('reconnected', function() {
  Log.w(TAG, 'mongodb reconnected.');
});

// Catch all the errors.
app.on('error', function(err, ctx) {
  Log.e(TAG, 'server error', err);
  if (ctx) {
    Log.e(TAG, 'server ctx:', ctx);
  }
});

app.use(function *(next) {
  try {
    yield next;
  } catch (err) {
    this.status = err.status || 500;
    this.body = 'Internal server error. Please contact an administrator.';
    this.app.emit('error', err, this);
    Log.e(TAG, this.body, err);
  }
});

process.on('unhandledRejection', function(reason, p) {
  Log.e(TAG, 'Unhandled Rejection at: Promise ', p, ' reason: ', reason);
});

// Theme registration
var themeManager = ThemeManager(
  resolvePath(__dirname, 'themes'),
  config.siteConfig.theme, {
    site: config.siteConfig
  }
);
app.use(themeManager);

// Authentication
passportMongo.setup(passport);
app.use(session({
  key: config.cookieName,
  maxAge: config.cookieMaxAge
}, app))
.use(passport.initialize())
.use(passport.session());

// Routes
app
.use(require('./routes/main').middleware())
.use(require('./routes/admin').middleware());

// Post-routing

db.once('open', function() {
  Log.i(TAG, 'db connected.');

  app.listen(config.port);

  Log.i(TAG, 'listening on port ' + config.port);
});
