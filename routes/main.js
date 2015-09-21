'use strict';

const TAG = 'artikulera/routes/main';

var Router = require('koa-rutt'),
    send = require('koa-send'),
    passport = require('koa-passport'),
    bodyParser = require('koa-bodyparser'),
    moment = require('moment'),
    Log = require('huggare'),
    mongoose = require('mongoose'),
    models = require('../models')(mongoose);

let router = new Router;

router
.pre('post', bodyParser())

.get('/static/*', function* () {
  yield send(this, this.params[0], {
    root: __dirname + '/static'
  });
})

.get('/', function*() {
  return yield this.renderTheme('home');
})

.route('/admin/login', {
  get: function*() {
    return yield this.render('login');
  },

  post: passport.authenticate('mongodb', {
    successRedirect: '/admin/new-post'
  })
})

.get('/:year(\\d{4})/:month(\\d{1,2})/:day(\\d{1,2})/:postSlug', function*(next) {
  Log.i(TAG, 'blague');

  let y = parseInt(this.params.year, 10),
      m = parseInt(this.params.month, 10)-1,
      d = parseInt(this.params.day, 10);

  let date = moment({y: y, M: m, d: d});

  if (!date.isValid()) {
    Log.w(TAG, 'invalid date', date);
    return yield next;
  }

  let q = {
    published_on: {
      $gte: date.toDate(),
      $lt: date.clone().add(1, 'days').toDate()
    },
    slug: this.params.postSlug
  };

  let post = yield models.Post.findOne(q).exec();

  if (!post) {
    Log.w(TAG, 'no post!');
    return yield next;
  }

  return yield this.renderTheme('post', { post: post });
})

.get('/:pageSlug(.+)', function*(next) {
  Log.i(TAG, 'page');

  let page = yield models.Page.findOne({ slug: this.params.pageSlug }).exec();

  if (!page) {
    return yield next;
  } else {
    return yield this.renderTheme('page', { page: page });
  }
});


module.exports = router;
