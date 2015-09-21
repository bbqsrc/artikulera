'use strict';

var models = require('./models/index')(require('mongoose')),
    resolvePath = require('resolve-path'),
    Router = require('koa-rutt'),
    compose = require('koa-compose'),
    send = require('koa-send'),
    extend = require('extend'),
    Log = require('huggare');

const TAG = 'artikulera/theme-manager';

class Theme {
  constructor(themesDir, themeName, globals) {
    this.name = themeName;
    this.path = resolvePath(themesDir, themeName);

    this.globals = globals || {};

    this.templates = {};

    this.meta = require(resolvePath(this.path, 'theme.json'));

    let tplPath = resolvePath(this.path, 'templates');

    // Cache views
    for (let tplName of this.meta.templates) {
      this.templates[tplName] = new models.Theme(tplPath, tplName);
    }

    this.staticUrl = '/theme/' + this.name;

    // Helpers!
    let theme = this;
    this.helpers = {
      asset: function(assetPath) {
        return resolvePath(this.staticUrl, assetPath);
      }.bind(theme)
    };
  }

  render(viewName, locals) {
    return this.templates[viewName].render(locals);
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
