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

.get('/posts', function*() {
  // TODO pagination
  let posts = yield models.Post.find({
    published_on: { $exists: true }
  }).sort({
    published_on: -1
  }).exec();

  return yield this.renderTheme('posts', { posts: posts });
})

.get('/:year(\\d{4})/:month(\\d{1,2})/:day(\\d{1,2})/:postSlug', function*(next) {
  Log.i(TAG, 'blague');

  let y = parseInt(this.params.year, 10),
      m = parseInt(this.params.month, 10)-1,
      d = parseInt(this.params.day, 10);

  let date = moment({y: y, M: m, d: d});
  if (!date.isValid()) {
    return yield next;
  }

  let post = yield models.Post.findPostByDateSlug(date, this.params.postSlug);
  if (!post) {
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
