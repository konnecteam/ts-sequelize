'use strict';

import * as _ from 'lodash';
import { Sequelize } from '../index';
import { Utils } from './utils';

/**
 * The transaction object is used to identify a running transaction. It is created by calling `Sequelize.transaction()`.
 *
 * To run a query under a transaction, you should pass the transaction in the options object.
 *
 * @see {@link Sequelize.transaction}
 */
export class Transaction {
  public sequelize : Sequelize;
  public savepoints : any[];
  public options : {
    autocommit? : boolean,
    deferrable? : any,
    /** Set the default transaction isolation level */
    isolationLevel? : string,
    readOnly? : boolean,
    /** Transaction to run query under */
    transaction? : Transaction,
    type? : any
  };
  public parent : Transaction;
  public id;
  public name : string;
  public finished : string;
  public connection;
  /**
   * @param sequelize A configured sequelize Instance
   * @param options An object with options
   */
  constructor(sequelize : Sequelize, options? : {
    /** Sets the autocommit property of the transaction. */
    autocommit? : boolean,
    /** Sets the constraints to be deferred or immediately checked. */
    deferrable? : any,
    /** = true Sets the isolation level of the transaction. */
    isolationLevel? : string,
    /** = true Sets the type of the transaction. */
    type? : any,
  }) {
    this.sequelize = sequelize;
    this.savepoints = [];

    // get dialect specific transaction options
    const transactionOptions = sequelize.dialect.supports.transactionOptions || {};
    const generateTransactionId = this.sequelize.dialect.QueryGenerator.generateTransactionId;

    this.options = _.extend({
      autocommit: transactionOptions.autocommit || null,
      type: sequelize.options.transactionType,
      isolationLevel: sequelize.options.isolationLevel,
      readOnly: false
    }, options || {});

    this.parent = this.options.transaction;
    this.id = this.parent ? this.parent.id : generateTransactionId();

    if (this.parent) {
      this.id = this.parent.id;
      this.parent.savepoints.push(this);
      this.name = this.id + '-sp-' + this.parent.savepoints.length;
    } else {
      this.id = this.name = generateTransactionId();
    }

    delete this.options.transaction;
  }

  /**
   * Commit the transaction
   */
  public commit() : Promise<any> {

    if (this.finished) {
      return Utils.Promise.reject(new Error('Transaction cannot be committed because it has been finished with state: ' + this.finished));
    }

    this._clearCls();

    return this
      .sequelize
      .getQueryInterface()
      .commitTransaction(this, this.options)
      .finally(() => {
        this.finished = 'commit';
        if (!this.parent) {
          return this._cleanup();
        }
        return null;
      });
  }

  /**
   * Rollback (abort) the transaction
   *
   * @returns Promise,
   */
  public rollback() : any {

    if (this.finished) {
      return Utils.Promise.reject(new Error('Transaction cannot be rolled back because it has been finished with state: ' + this.finished));
    }

    this._clearCls();

    return this
      .sequelize
      .getQueryInterface()
      .rollbackTransaction(this, this.options)
      .finally(() => {
        if (!this.parent) {
          return this._cleanup();
        }
        return this;
      });
  }

  /**
   * prepare environment
   */
  public prepareEnvironment(useCLS : boolean) : any {
    let connectionPromise;

    if (useCLS == null) {
      useCLS = true;
    }

    if (this.parent) {
      connectionPromise = Utils.Promise.resolve(this.parent.connection);
    } else {
      const acquireOptions : { uuid?, type? : string } = {
        uuid: this.id
      };
      if (this.options.readOnly) {
        acquireOptions['type'] = 'SELECT';
      }
      connectionPromise = this.sequelize.connectionManager.getConnection(acquireOptions);
    }

    return connectionPromise
      .then(connection => {
        this.connection = connection;
        this.connection.uuid = this.id;
      })
      .then(() => this._begin())
      .then(() => this._setDeferrable())
      .then(() => this._setIsolationLevel())
      .then(() => this._setAutocommit())
      .catch(setupErr => this.rollback().finally(() => {
        throw setupErr;
      }))
      .tap(() => {
        if (useCLS && (this.sequelize.constructor as any)._cls) {
          (this.sequelize.constructor as any)._cls.set('transaction', this);
        }
        return null;
      });
  }

  /**
   * @hidden
   */
  private _begin() {
    return this
      .sequelize
      .getQueryInterface()
      .startTransaction(this, this.options);
  }

  /**
   * @hidden
   */
  private _setDeferrable() {
    if (this.options.deferrable) {
      return this
        .sequelize
        .getQueryInterface()
        .deferConstraints(this, this.options);
    }
  }

  /**
   * @hidden
   */
  private _setAutocommit() {
    return this
      .sequelize
      .getQueryInterface()
      .setAutocommit(this, this.options.autocommit, this.options);
  }

  /**
   * @hidden
   */
  private _setIsolationLevel() {
    return this
      .sequelize
      .getQueryInterface()
      .setIsolationLevel(this, this.options.isolationLevel, this.options);
  }

  /**
   * @hidden
   */
  private _cleanup() {
    const res = this.sequelize.connectionManager.releaseConnection(this.connection);
    this.connection.uuid = undefined;
    return res;
  }

  /**
   * @hidden
   */
  private _clearCls() {
    const cls = (this.sequelize.constructor as any)._cls;

    if (cls) {
      if (cls.get('transaction') === this) {
        cls.set('transaction');
      }
    }
  }

  /**
   * Types can be set per-transaction by passing `options.type` to `sequelize.transaction`.
   * Default to `DEFERRED` but you can override the default type by passing `options.transactionType` in `new Sequelize`.
   * Sqlite only.
   *
   * Pass in the desired level as the first argument:
   *
   * ```js
   * return sequelize.transaction({type: Sequelize.Transaction.TYPES.EXCLUSIVE}, transaction => {
   *
   *  // your transactions
   *
   * }).then(result => {
   *   // transaction has been committed. Do something after the commit if required.
   * }).catch(err => {
   *   // do something with the err.
   * });
   * ```
   * @property DEFERRED
   * @property IMMEDIATE
   * @property EXCLUSIVE
   */
  static get TYPES() : { DEFERRED : string, IMMEDIATE : string, EXCLUSIVE : string } {
    return {
      DEFERRED: 'DEFERRED',
      IMMEDIATE: 'IMMEDIATE',
      EXCLUSIVE: 'EXCLUSIVE'
    };
  }

  /**
   * Isolations levels can be set per-transaction by passing `options.isolationLevel` to `sequelize.transaction`.
   * Default to `REPEATABLE_READ` but you can override the default isolation level by passing `options.isolationLevel` in `new Sequelize`.
   *
   * Pass in the desired level as the first argument:
   *
   * ```js
   * return sequelize.transaction({isolationLevel: Sequelize.Transaction.ISOLATION_LEVELS.SERIALIZABLE}, transaction => {
   *
   *  // your transactions
   *
   * }).then(result => {
   *   // transaction has been committed. Do something after the commit if required.
   * }).catch(err => {
   *   // do something with the err.
   * });
   * ```
   * @property READ_UNCOMMITTED
   * @property READ_COMMITTED
   * @property REPEATABLE_READ
   * @property SERIALIZABLE
   */
  static get ISOLATION_LEVELS() : {READ_UNCOMMITTED : string, READ_COMMITTED : string, REPEATABLE_READ : string, SERIALIZABLE : string } {
    return {
      READ_UNCOMMITTED: 'READ UNCOMMITTED',
      READ_COMMITTED: 'READ COMMITTED',
      REPEATABLE_READ: 'REPEATABLE READ',
      SERIALIZABLE: 'SERIALIZABLE'
    };
  }


  /**
   * Possible options for row locking. Used in conjunction with `find` calls:
   *
   * ```js
   * t1 // is a transaction
   * Model.findAll({
   *   where: ...,
   *   transaction: t1,
   *   lock: t1.LOCK...
   * });
   * ```
   *
   * Postgres also supports specific locks while eager loading by using OF:
   * ```js
   * UserModel.findAll({
   *   where: ...,
   *   include: [TaskModel, ...],
   *   transaction: t1,
   *   lock: {
   *     level: t1.LOCK...,
   *     of: UserModel
   *   }
   * });
   * ```
   * UserModel will be locked but TaskModel won't!
   * @property UPDATE
   * @property SHARE
   * @property KEY_SHARE Postgres 9.3+ only
   * @property NO_KEY_UPDATE Postgres 9.3+ only
   */
  static get LOCK() : {} {
    return {
      UPDATE: 'UPDATE',
      SHARE: 'SHARE',
      KEY_SHARE: 'KEY SHARE',
      NO_KEY_UPDATE: 'NO KEY UPDATE'
    };
  }

  /**
   * @see {@link Transaction.LOCK}
   */
  get LOCK() : {} {
    return Transaction.LOCK;
  }
}

module.exports = Transaction;
module.exports.Transaction = Transaction;
module.exports.default = Transaction;
