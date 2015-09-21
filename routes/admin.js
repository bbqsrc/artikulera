'use strict';

const TAG = 'artikulera/routes/main';

var Router = require('koa-rutt'),
    bodyParser = require('koa-bodyparser'),
    moment = require('moment'),
    Log = require('huggare'),
    mongoose = require('mongoose'),
    models = require('../models')(mongoose);

let router = new Router('/admin');

router
.pre(function*(next) {
  // TODO do admin check
  yield next;
})

.pre('post', bodyParser())

.route('/new-post', {
  get: function*() {
    return yield this.render('new-post');
  },

  post: function*() {
    let post = new models.Post(this.request.body);
    let date = new Date;
    post.created_on = date;
    post.published_on = date;
    yield post.save();

    this.redirect(post.url);
  }
});

module.exports = router;
