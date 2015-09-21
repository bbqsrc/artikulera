'use strict';

var models = require('./models/index')(require('mongoose')),
    resolvePath = require('resolve-path'),
    Router = require('koa-rutt'),
    compose = require('koa-compose'),
    send = require('koa-send'),
    extend = require('extend'),
    Log = require('huggare');

const TAG = 'artikulera/theme-manager';

Log.setLevel(0);

class Theme {
  constructor(themesDir, themeName, globals) {
    this.path = themesDir;
    this.name = themeName;
    this.globals = globals || {};

    this.templates = {};

    let themePath = resolvePath(themesDir, themeName);
    this.meta = require(resolvePath(themePath, 'theme.json'));

    let tplPath = resolvePath(themePath, 'templates');

    // Cache views
    for (let tplName of this.meta.templates) {
      this.templates[tplName] = new models.Theme(tplPath, tplName);
    }

    this.staticUrl = '/theme/' + this.name;

    // Helpers!
    this.helpers = {
      asset: function(assetPath) {
        return resolvePath(this.staticUrl, assetPath);
      }
    };
  }

  render(viewName, locals) {
    Log.d(TAG, 'render view', arguments);
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
        Log.d(TAG, 'theme', theme);
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
