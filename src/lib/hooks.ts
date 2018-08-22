'use strict';

import * as Promise from 'bluebird';
import * as _ from 'lodash';
import { Model } from './model';
import { Sequelize } from './sequelize';
import { Utils } from './utils';

const debug = Utils.getLogger().debugContext('hooks');


export const hookTypes = {
  beforeValidate: {params: 2},
  afterValidate: {params: 2},
  validationFailed: {params: 3},
  beforeCreate: {params: 2},
  afterCreate: {params: 2},
  beforeDestroy: {params: 2},
  afterDestroy: {params: 2},
  beforeRestore: {params: 2},
  afterRestore: {params: 2},
  beforeUpdate: {params: 2},
  afterUpdate: {params: 2},
  beforeSave: {params: 2, proxies: ['beforeUpdate', 'beforeCreate']},
  afterSave: {params: 2, proxies: ['afterUpdate', 'afterCreate']},
  beforeUpsert: {params: 2},
  afterUpsert: {params: 2},
  beforeBulkCreate: {params: 2},
  afterBulkCreate: {params: 2},
  beforeBulkDestroy: {params: 1},
  afterBulkDestroy: {params: 1},
  beforeBulkRestore: {params: 1},
  afterBulkRestore: {params: 1},
  beforeBulkUpdate: {params: 1},
  afterBulkUpdate: {params: 1},
  beforeFind: {params: 1},
  beforeFindAfterExpandIncludeAll: {params: 1},
  beforeFindAfterOptions: {params: 1},
  afterFind: {params: 2},
  beforeCount: {params: 1},
  beforeDefine: {params: 2, sync: true},
  afterDefine: {params: 1, sync: true},
  beforeInit: {params: 2, sync: true},
  afterInit: {params: 1, sync: true},
  beforeConnect: {params: 1},
  afterConnect: {params: 2},
  beforeSync: {params: 1},
  afterSync: {params: 1},
  beforeBulkSync: {params: 1},
  afterBulkSync: {params: 1}
};

export const hookAliases = {
  beforeDelete: 'beforeDestroy',
  afterDelete: 'afterDestroy',
  beforeBulkDelete: 'beforeBulkDestroy',
  afterBulkDelete: 'afterBulkDestroy',
  beforeConnection: 'beforeConnect'
};

/**
 * get array of current hook and its proxied hooks combined
 * @private
 */
const getProxiedHooks = hookType =>
  hookTypes[hookType].proxies
    ? hookTypes[hookType].proxies.concat(hookType)
    : [hookType]
;

export class Hooks {
  /**
   * Process user supplied hooks definition
   *
   * @param hooks
   *
   * @private
   * @memberOf Sequelize
   * @memberOf Sequelize.Model
   */
  public hasHooks;
  public sequelize : Sequelize;
  public options;

  public getHooks(hookType) {
    return (this.options.hooks || {})[hookType] || [];
  }
  public static getHooks = Hooks.prototype.getHooks;

  public _setupHooks(hooks : {}) {
    this.options.hooks = {};
    _.map(hooks || {}, (hooksArray, hookName) => {
      if (!_.isArray(hooksArray)) {
        hooksArray = [hooksArray];
      }
      hooksArray.forEach(hookFn => this.addHook(hookName, hookFn));
    });
  }
  public static _setupHooks = Hooks.prototype._setupHooks;

  public runHooks(hooks : any, ...args) {
    if (!hooks) {
      throw new Error('runHooks requires at least 1 argument');
    }

    const hookArgs = Utils.sliceArgs(arguments, 1);
    let hookType;

    if (typeof hooks === 'string') {
      hookType = hooks;
      hooks = this.getHooks(hookType);
      if (this.sequelize) {
        hooks = hooks.concat(this.sequelize.getHooks(hookType));
      }
    }

    if (!Array.isArray(hooks)) {
      hooks = [hooks];
    }

    // synchronous hooks
    if (hookTypes[hookType] && hookTypes[hookType].sync) {
      for (let hook of hooks) {
        if (typeof hook === 'object') {
          hook = hook.fn;
        }

        debug(`running hook(sync) ${hookType}`);
        hook.apply(this, hookArgs);
      }
      return;
    }

    // asynchronous hooks (default)
    return Promise.each(hooks, hook => {
      if (typeof hook === 'object') {
        hook = (hook as any).fn;
      }

      debug(`running hook ${hookType}`);
      return Promise.resolve((hook as any).apply(this, hookArgs));
    }).return();
  }
  public static runHooks = Hooks.prototype.runHooks;

  public hook(...args) {
    return this.addHook.apply(this, arguments);
  }
  public static hook = Hooks.prototype.hook;

  /**
   * Add a hook to the model
   *
   * @param hookType
   * @param name    Provide a name for the hook function. It can be used to remove the hook later or to order hooks based on some sort of priority system in the future.
   * @param fn : Function        The hook function
   *
   * @memberOf Sequelize
   * @memberOf Sequelize.Model
   */
  public addHook(hookType : string, name : string | any, fn? : any) {
    if (typeof name === 'function') {
      fn = name;
      name = null;
    }

    debug(`adding hook ${hookType}`);
    hookType = hookAliases[hookType] || hookType;

    // check for proxies, add them too
    hookType = getProxiedHooks(hookType);

    Object.keys(hookType).forEach(typeKey => {
      const type = hookType[typeKey];
      this.options.hooks[type] = this.getHooks(type);
      this.options.hooks[type].push(name ? {name, fn} : fn);
    });

    return this;
  }
  public static addHook = Hooks.prototype.addHook;

  /**
   * Remove hook from the model
   *
   * @param hookType
   * @param name
   *
   * @memberOf Sequelize
   * @memberOf Sequelize.Model
   */
  public removeHook(hookType : string, name : string | any | any) {
    hookType = hookAliases[hookType] || hookType;
    const isReference = typeof name === 'function' ? true : false;

    if (!this.hasHook(hookType)) {
      return this;
    }

    Utils.debug(`removing hook ${hookType}`);

    // check for proxies, add them too
    hookType = getProxiedHooks(hookType);

    for (const type of hookType) {
      this.options.hooks[type] = this.options.hooks[type].filter(hook => {
        if (isReference && typeof hook === 'function') {
          return hook !== name; // check if same method
        } else if (!isReference && typeof hook === 'object') {
          return hook.name !== name;
        }
        return true;
      });
    }

    return this;
  }
  public static removeHook = Hooks.prototype.removeHook;

  /**
   * Check whether the mode has any hooks of this type
   *
   * @param hookType
   *
   * @alias hasHooks
   * @memberOf Sequelize²
   * @memberOf Sequelize.Model
   */
  public hasHook(hookType : string) {
    return this.options.hooks[hookType] && !!this.options.hooks[hookType].length;
  }
  public static hasHook = Hooks.prototype.hasHook;

  /**
   * A hook that is run before validation
   *
   * @param name
   * @param fn A callback function that is called with instance, options
   */
  public beforeValidate(name : string | any, fn? : any) : void {}

  /**
   * A hook that is run after validation
   *
   * @param name
   * @param fn A callback function that is called with instance, options
   */
  public afterValidate(name : string | any, fn? : any) : void {}

  /**
   * A hook that is run before creating a single instance
   *
   * @param name
   * @param fn A callback function that is called with attributes, options
   */
  public beforeCreate(name : string | any, fn? : any) : void {}

  /**
   * A hook that is run after creating a single instance
   *
   * @param name
   * @param fn A callback function that is called with attributes, options
   */
  public afterCreate(name : string | any, fn? : any) : void {}

  /**
   * A hook that is run before restore
   *
   * @param name
   * @param fn A callback function
   */
  public beforeRestore(name : string | any, fn? : any) : void {}

  /**
   * A hook that is run after restore
   *
   * @param name
   * @param fn A callback function
   */
  public afterRestore(name : string | any, fn? : any) : void {}

  /**
   * A hook that is run before destroying a single instance
   *
   * @param name
   * @param fn A callback function that is called with instance, options
   * @alias beforeDelete
   */
  public beforeDestroy(name : string | any, fn? : any) : void {}
  public beforeDelete(name : string | any, fn? : any) : void {}

  /**
   * A hook that is run after destroying a single instance
   *
   * @param name
   * @param fn A callback function that is called with instance, options
   * @alias afterDelete
   */
  public afterDestroy(name : string | any, fn? : any) : void {}
  public afterDelete(name : string | any, fn? : any) : void {}

  /**
   * A hook that is run before updating a single instance
   *
   * @param name
   * @param fn A callback function that is called with instance, options
   */
  public beforeUpdate(name : string | any, fn? : any) : void {}

  /**
   * A hook that is run after updating a single instance
   *
   * @param name
   * @param fn A callback function that is called with instance, options
   */
  public afterUpdate(name : string | any, fn? : any) : void {}

  /**
   * A hook that is run before creating instances in bulk
   *
   * @param name
   * @param fn A callback function that is called with instances, options
   */
  public beforeBulkCreate(name : string | any, fn? : any) : void {}

  /**
   * A hook that is run after creating instances in bulk
   *
   * @param name
   * @param fn A callback function that is called with instances, options
   * @name afterBulkCreate
   */
  public afterBulkCreate(name : string | any, fn? : any) : void {}

  /**
   * A hook that is run before restore in bulk
   *
   * @param name
   * @param fn A callback function
   */
  public beforeBulkRestore(name : string | any, fn? : any) : void {}

  /**
   * A hook that is run after restore in bulk
   *
   * @param name
   * @param fn A callback function
   * @name afterBulkCreate
   */
  public afterBulkRestore(name : string | any, fn? : any) : void {}

  /**
   * A hook that is run before destroying instances in bulk
   *
   * @param name
   * @param fn   A callback function that is called with options
   *
   * @alias beforeBulkDelete
   */
  public beforeBulkDestroy(name : string | any, fn? : any) : void {}
  public beforeBulkDelete(name : string | any, fn? : any) : void {}

  /**
   * A hook that is run after destroying instances in bulk
   *
   * @param name
   * @param fn   A callback function that is called with options
   *
   * @alias afterBulkDelete
   */
  public afterBulkDestroy(name : string | any, fn? : any) : void {}
  public afterBulkDelete(name : string | any, fn? : any) : void {}

  /**
   * A hook that is run after updating instances in bulk
   *
   * @param name
   * @param fn   A callback function that is called with options
   */
  public beforeBulkUpdate(name : string | any, fn? : any) : void {}

  /**
   * A hook that is run after updating instances in bulk
   *
   * @param name
   * @param fn   A callback function that is called with options
   */
  public afterBulkUpdate(name : string | any, fn? : any) : void {}

  /**
   * A hook that is run before a find (select) query
   *
   * @param name
   * @param fn   A callback function that is called with options
   */
  public beforeFind(name : string | any, fn? : any) : void {}

  /**
   * A hook that is run before a find (select) query, after any { include : {all : ...} } options are expanded
   *
   * @param name
   * @param fn   A callback function that is called with options
   */
  public beforeFindAfterExpandIncludeAll(name : string | any, fn? : any) : void {}

  /**
   * A hook that is run before a find (select) query, after all option parsing is complete
   *
   * @param name
   * @param fn   A callback function that is called with options
   */
  public beforeFindAfterOptions(name : string | any, fn? : any) : void {}

  /**
   * A hook that is run after a find (select) query
   *
   * @param name
   * @param fn   A callback function that is called with instance(s), options
   */
  public afterFind(name : string | any, fn? : any) : void {}

  /**
   * A hook that is run before a define call
   *
   * @param name
   * @param fn   A callback function that is called with attributes, options
   */
  public beforeDefine(name : string | any, fn? : any) : void {}

  /**
   * A hook that is run after a define call
   *
   * @param name
   * @param fn   A callback function that is called with factory
   */
  public afterDefine(name : string | any, fn? : any) : void {}

  /**
   * A hook that is run before Sequelize() call
   *
   * @param name
   * @param fn   A callback function that is called with config, options
   */
  public beforeInit(name : string | any, fn? : any) : void {}

  /**
   * A hook that is run after Sequelize() call
   *
   * @param name
   * @param fn   A callback function that is called with sequelize
   */
  public afterInit(name : string | any, fn? : any) : void {}

  /**
   * @param name
   * @param fn
   */
  public beforeConnect(name : string | any, fn? : any) : void {}

  /**
   * @param name
   * @param fn
   */
  public afterConnect(name : string | any, fn? : any) : void {}

  /**
   * A hook that is run before Model.sync call
   *
   * @param name
   * @param fn   	A callback function that is called with options passed to Model.sync
   */
  public beforeSync(name : string | any, fn? : any) : void {}

  /**
   * A hook that is run after Model.sync call
   *
   * @param name
   * @param fn   	A callback function that is called with options passed to Model.sync
   */
  public afterSync(name : string | any, fn? : any) : void {}

  /**
   * A hook that is run before sequelize.sync call
   *
   * @param name
   * @param fn    A callback function that is called with options passed to sequelize.sync
   */
  public beforeBulkSync(name : string | any, fn? : any) : void {}

  /**
   * A hook that is run after sequelize.sync call
   *
   * @param name
   * @param fn   A callback function that is called with options passed to sequelize.sync
   */
  public afterBulkSync(name : string | any, fn? : any) : void {}

  /**
   * A hook that is run before save
   *
   * @param name
   * @param fn   A callback function
   */
  public beforeSave(name : string | any, fn? : any) : void {}

  /**
   * A hook that is run after save
   *
   * @param name
   * @param fn   A callback function
   */
  public afterSave(name : string | any, fn? : any) : void {}

  /**
   * A hook that is run before upsert
   *
   * @param name
   * @param fn   A callback function
   */
  public beforeUpsert(name : string | any, fn? : any) : void {}

  /**
   * A hook that is run after upsert
   *
   * @param name
   * @param fn   A callback function
   */
  public afterUpsert(name : string | any, fn? : any) : void {}
  /**
   * A hook that is run before count
   *
   * @param name
   * @param fn   A callback function
   */
  public beforeCount(name : string | any, fn? : any) : void {}
}

const allHooks = Object.keys(hookTypes).concat(Object.keys(hookAliases));
for (const hook of allHooks) {
  Hooks[hook] = Hooks.prototype[hook] = function(name, callback) {
    return this.addHook(hook, name, callback);
  };
}
