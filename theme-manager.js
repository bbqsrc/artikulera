'use strict';

var models = require('./models/index')(require('mongoose')),
    resolvePath = require('resolve-path'),
    Router = require('koa-rutt'),
    compose = require('koa-compose'),
    send = require('koa-send'),
    extend = require('extend'),
    moment = require('moment'),
    Log = require('huggare');

const TAG = 'artikulera/theme-manager';

class Theme {
  constructor(themesDir, themeName, globals) {
    this.name = themeName;
    this.path = resolvePath(themesDir, themeName);

    // globals: always include moment because <3
    this.globals = extend({
      moment: moment
    }, globals);

    this.templates = {};

    this.meta = require(resolvePath(this.path, 'theme.json'));

    this.templatePath = resolvePath(this.path, 'templates');

    this.staticUrl = '/theme/' + this.name;

    // Helpers!
    let theme = this;
    this.helpers = {
      asset: function(assetPath) {
        return resolvePath(this.staticUrl, assetPath);
      }.bind(theme)
    };
  }

  getTemplate(tplName) {
    if (!process.env.NODE_ENV) { // dev mode
      return new models.Theme(this.templatePath, tplName);
    }

    // Cache views
    if (!this.templates[tplName]) {
      this.templates[tplName] = new models.Theme(this.templatePath, tplName);
    }

    return this.templates[tplName];
  }

  render(viewName, locals) {
    return this.getTemplate(viewName).render(locals);
  }

  mountStatic() {
    let rootPath = resolvePath(this.path, 'static');
    let router = new Router(this.staticUrl);

    router.get('/*', function*() {
      return yield send(this, this.params[0], {
        root: rootPath
      });
    });

    return router.middleware();
  }

  mountRender() {
    let theme = this;

    return function*(next) {
      this.renderTheme = function*(viewName, locals) {
        let l = extend({}, theme.globals, theme.helpers, locals);
        this.type = 'html';
        this.body = yield theme.render(viewName, l);
      };

      yield next;
    };
  }

  middleware() {
    let theme = this;

    return compose([theme.mountStatic(), theme.mountRender()]);
  }
}

module.exports = function(themesDir, themeName, globals) {
  return new Theme(themesDir, themeName, globals).middleware();
};
