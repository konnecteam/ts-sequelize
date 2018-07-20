'use strict';

import * as Pooling from 'generic-pool';
import * as _ from 'lodash';
import * as semver from 'semver';
import { Sequelize } from '../../../index';
import { IDataTypes } from '../../data-types';
import { IConfig } from '../../model/iconfig';
import Promise from '../../promise';
import { Utils } from '../../utils';
import { AbstractDialect } from './abstract-dialect';
const debug = Utils.getLogger().debugContext('pool');

const defaultPoolingConfig = {
  max: 5,
  min: 0,
  idle: 10000,
  acquire: 10000,
  evict: 10000,
  handleDisconnects: true
};

/**
 * Abstract Connection Manager
 *
 * Connection manager which handles pool, replication and determining database version
 * Works with generic-pool to maintain connection pool
 *
 */
export abstract class AbstractConnectionManager {

  public config : IConfig;
  public defaultVersion : string;
  public dialect : AbstractDialect;
  public dialectName : string;
  public lib : any;
  public pool : any;
  public sequelize : Sequelize;
  public versionPromise : any;

  constructor(dialect : AbstractDialect, sequelize : Sequelize) {
    const config = _.cloneDeep(sequelize.config);

    this.sequelize = sequelize;
    this.config = config;
    this.dialect = dialect;
    this.versionPromise = null;
    this.dialectName = this.sequelize.options.dialect;

    if (config.pool === false) {
      throw new Error('Support for pool:false was removed in v4.0');
    }

    config.pool = _.defaults(config.pool || {}, defaultPoolingConfig, {
      validate: () => {
        return new Promise((resolve, reject) => {

          try {
            resolve(this._validate(this));
          } catch (err) {
            reject(err);
          }
        });
      },
      Promise
    });

    this.initPools();
  }

  /**
   * refresh function parser of each dataTypes
   */
  public refreshTypeParser(dataTypes : IDataTypes) {
    Object.keys(dataTypes).forEach(dataTypeKey => {
      const dataType = dataTypes[dataTypeKey];
      if (dataType.hasOwnProperty('parse')) {
        if (dataType.types[this.dialectName]) {
          this._refreshTypeParser(dataType);
        } else {
          throw new Error('Parse function not supported for type ' + dataType.key + ' in dialect ' + this.dialectName);
        }
      }
    });
  }

  public _refreshTypeParser(dataType : any) {}

  /**
   * Handler which executes on process exit or connection manager shutdown
   * @hidden
   */
  protected _onProcessExit() : Promise<any> {
    if (!this.pool) {
      return Promise.resolve();
    }

    return (this.pool.drain().then(() => {
      debug('connection drain due to process exit');
      return this.pool.clear();
    }) as Promise<any>);
  }

  /**
   * Drain the pool and close it permanently
   */
  public close() : Promise<any> {
    // Mark close of pool
    this.getConnection = function getConnection() {
      return Promise.reject(new Error('ConnectionManager.getConnection was called after the connection manager was closed!'));
    };

    return this._onProcessExit();
  }

  /**
   * Initialize connection pool. By default pool autostart is set to false, so no connection will be
   * be created unless `pool.acquire` is called.
   */
  public initPools() {
    const config = this.config;

    if (!config.replication) {
      const poolConf = {
        testOnBorrow: true,
        // fifo: false,
        autostart: false,
        max: config.pool.max || 5,
        min: config.pool.min,
        acquireTimeoutMillis: config.pool.acquire || 15000,
        idleTimeoutMillis: config.pool.idle || 30000,
        evictionRunIntervalMillis: config.pool.evict || 1000
      };

      poolConf['Promise'] = config.pool.Promise;

      this.pool = Pooling.createPool({
        create: () => {
          return this._connect(config);
        },
        destroy: mayBeConnection => {
          if (mayBeConnection instanceof Error) {
            return Promise.resolve();
          }

          return this._disconnect(mayBeConnection)
            .tap(() => { debug('connection destroy'); });
        },
        validate: config.pool.validate
      }, poolConf);

      debug(`pool created with max/min: ${config.pool.max}/${config.pool.min}, no replication`);

      return;
    }

    let reads = 0;

    if (!Array.isArray(config.replication.read)) {
      config.replication.read = [config.replication.read];
    }

    // Map main connection config
    config.replication.write = _.defaults(config.replication.write, _.omit(config, 'replication'));

    // Apply defaults to each read config
    config.replication.read = _.map(config.replication.read, readConfig =>
      _.defaults(readConfig, _.omit(this.config, 'replication'))
    );

    // custom pooling for replication (original author @janmeier)
    this.pool = {
      release: client => {
        if (client.queryType === 'read') {
          return this.pool.read.release(client);
        } else {
          return this.pool.write.release(client);
        }
      },
      acquire: (priority, queryType, useMaster) => {
        useMaster = _.isUndefined(useMaster) ? false : useMaster;
        if (queryType === 'SELECT' && !useMaster) {
          return this.pool.read.acquire(priority)
            .then(mayBeConnection => this._determineConnection(mayBeConnection));
        } else {
          return this.pool.write.acquire(priority)
            .then(mayBeConnection => this._determineConnection(mayBeConnection));
        }
      },
      destroy: mayBeConnection => {
        if (mayBeConnection instanceof Error) {
          return Promise.resolve();
        }

        return this.pool[mayBeConnection.queryType].destroy(mayBeConnection)
          .tap(() => { debug('connection destroy'); });
      },
      clear: () => {
        return Promise.join(
          this.pool.read.clear(),
          this.pool.write.clear()
        ).tap(() => { debug('all connection clear'); });
      },
      drain: () => {
        return Promise.join(
          this.pool.write.drain(),
          this.pool.read.drain()
        );
      },
      read: Pooling.createPool({
        create: () => {
          const nextRead = reads++ % config.replication.read.length; // round robin config
          return this
            ._connect(config.replication.read[nextRead])
            .tap(connection => {
              connection.queryType = 'read';
            })
            .catch(err => err);
        },
        destroy: connection => this._disconnect(connection),
        validate: config.pool.validate
      }, {
        Promise: config.pool.Promise,
        testOnBorrow: true,
        returnToHead: true,
        autostart: false,
        max: config.pool.max,
        min: config.pool.min,
        acquireTimeoutMillis: config.pool.acquire,
        idleTimeoutMillis: config.pool.idle,
        evictionRunIntervalMillis: config.pool.evict
      } as any),
      write: Pooling.createPool({
        create: () => {
          return this
            ._connect(config.replication.write)
            .tap(connection => {
              connection.queryType = 'write';
            })
            .catch(err => err);
        },
        destroy: connection => this._disconnect(connection),
        validate: config.pool.validate
      }, {
        Promise: config.pool.Promise,
        testOnBorrow: true,
        returnToHead: true,
        autostart: false,
        max: config.pool.max,
        min: config.pool.min,
        acquireTimeoutMillis: config.pool.acquire,
        idleTimeoutMillis: config.pool.idle,
        evictionRunIntervalMillis: config.pool.evict
      } as any)
    };

    debug(`pool created with max/min: ${config.pool.max}/${config.pool.min}, with replication`);
  }

  /**
   * Get connection from pool. It sets database version if it's not already set.
   * Call pool.acquire to get a connection
   *
   * @param options                 Pool options
   * @returns : Promise<Connection>
   */
  public getConnection(options : {
    cascade? : boolean,
    /** A function that logs sql queries, or false for no logging */
    logging? : boolean | any,
    /** Set priority for this call. Read more at https://github.com/coopernurse/node-pool#priority-queueing */
    priority? : number,
    /** Return raw result. */
    raw? : boolean,
    /** Set which replica to use. Available options are `read` and `write` */
    type? : string,
    /** = false, Force master or write replica to get connection from */
    useMaster? : boolean,
    uuid? : string
  }) : Promise<any> {
    options = options || {};

    let promise;
    if (this.sequelize.options.databaseVersion === 0) {
      if (this.versionPromise) {
        promise = this.versionPromise;
      } else {
        promise = this.versionPromise = this._connect(this.config.replication.write || this.config)
          .then(connection => {
            const _options = {
              transaction : {connection},
              logging : () => {
                // __testLoggingFn: true;
              },
            };

            return this.sequelize.databaseVersion(_options).then(version => {
              this.sequelize.options.databaseVersion = semver.valid(version) ? version : this.defaultVersion;
              this.versionPromise = null;

              return this._disconnect(connection);
            });
          }).catch(err => {
            this.versionPromise = null;
            throw err;
          });
      }
    } else {
      promise = Promise.resolve();
    }

    return promise.then(() => {
      return this.pool.acquire(options.priority, options.type, options.useMaster)
        .then(mayBeConnection => this._determineConnection(mayBeConnection))
        .tap(() => { debug('connection acquired'); });
    });
  }

  /**
   * Release a pooled connection so it can be utilized by other connection requests
   *
   * @param connection : Connection
   */
  public releaseConnection(connection, force? : boolean) : Promise<any> {
    return this.pool.release(connection)
      .tap(() => { debug('connection released'); })
      .catch(/Resource not currently part of this pool/, () => {});
  }

  /**
   * Check if something acquired by pool is indeed a connection but not an Error instance
   * Why we need to do this https://github.com/sequelize/sequelize/pull/8330
   *
   * @param mayBeConnection Object which can be either connection or error
   *
   * @returns Promise<Connection>,
   * @hidden
   */
  private _determineConnection(mayBeConnection : {} | Error) {
    if (mayBeConnection instanceof Error) {
      return Promise.resolve(this.pool.destroy(mayBeConnection))
        .catch(/Resource not currently part of this pool/, () => {})
        .then(() => { throw mayBeConnection; });
    }

    return Promise.resolve(mayBeConnection);
  }

  /**
   * Call dialect library to get connection
   *
   * @private **
   * @param config Connection config
   * @returns Promise<Connection>,
   * @hidden
   */
  public _connect(config : IConfig) {
    return this.sequelize.runHooks('beforeConnect', config)
      .then(() => {
        return this.dialect.connectionManager.connect(config);
      })
      .then(connection => {
        return this.sequelize.runHooks('afterConnect', connection, config).return(connection); }
      );
  }

  /**
   * Call dialect library to disconnect a connection
   *
   * @param connection : Connection
   * @private **
   * @returns Promise,
   * @hidden
   */
  public _disconnect(connection) {
    return this.dialect.connectionManager.disconnect(connection);
  }

  /**
   * Determine if a connection is still valid or not
   *
   * @param connection : Connection
   */
  public _validate(connection) : boolean {
    if (!this.dialect.connectionManager.validate) {
      return true;
    }

    return this.dialect.connectionManager.validate(connection);
  }

  public abstract connect(connection?);
  public abstract disconnect(connection?);
  public abstract validate(connection?);
}
