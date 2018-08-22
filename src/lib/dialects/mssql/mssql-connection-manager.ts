'use strict';

import * as Promise from 'bluebird';
import * as mssql from 'mssql';
import AllDataTypes from '../../data-types';
import * as sequelizeErrors from '../../errors/index';
import { IConfig } from '../../interfaces/iconfig';
import { AbstractConnectionManager } from '../abstract/abstract-connection-manager';
import { ParserStore } from '../parserStore';
import { ResourceLock } from './resource-lock';

const DataTypes = AllDataTypes.mssql;
export const store = new ParserStore('mssql');

export class MssqlConnectionManager extends AbstractConnectionManager {

  constructor(dialect, sequelize) {
    super(dialect, sequelize);

    this.sequelize = sequelize;
    this.sequelize.config.port = this.sequelize.config.port || 1433;
    try {
      if (sequelize.config.dialectModulePath) {
        this.lib = require(sequelize.config.dialectModulePath);
      } else {
        this.lib = require('tedious');
      }
    } catch (err) {
      if (err.code === 'MODULE_NOT_FOUND') {
        throw new Error('Please install tedious package manually');
      }
      throw err;
    }

    this.refreshTypeParser(DataTypes);
  }

  /**
   * Expose this as a method so that the parsing may be updated when the user has added additional, custom types
   */
  public _refreshTypeParser(dataType) {
    store.refresh(dataType);
  }

  /**
   * clear all type parser
   */
  public _clearTypeParser() {
    store.clear();
  }

  /**
   * Handler which executes on process exit or connection manager shutdown
   * @hidden
   */
  protected _onProcessExit() : Promise<any> {
    if (!this.pool) {
      return Promise.resolve();
    }

    return this.pool.close();
  }

  public initPools() {
    // Nous ne faisons rien à l'init hormis bien mettre à null le pool
    this.pool = null;
  }

  private _initPoolsAsync(options : {
    /**
     * if there is uuid, we need to return a transaction
     */
    uuid? : string
  }) {
    if (!this.pool) {
      const config = this.config;

      config['server'] = config['host'];
      config['user'] = config['username'];
      config.pool['idleTimeoutMillis'] = config['idle'];


      return new Promise((resolve, reject) => {
        this.pool = new mssql.ConnectionPool(config, err => {
          if (err != null) {
            if (!err.code) {
              reject(new sequelizeErrors.ConnectionError(err));
            } else {
              switch (err.code) {
                case 'ESOCKET':
                  if (err.message.includes('connect EHOSTUNREACH')) {
                    reject(new sequelizeErrors.HostNotReachableError(err));
                  } else if (err.message.includes('connect ENETUNREACH')) {
                    reject(new sequelizeErrors.HostNotReachableError(err));
                  } else if (err.message.includes('connect EADDRNOTAVAIL')) {
                    reject(new sequelizeErrors.HostNotReachableError(err));
                  } else if (err.message.includes('getaddrinfo ENOTFOUND')) {
                    reject(new sequelizeErrors.HostNotFoundError(err));
                  } else if (err.message.includes('connect ECONNREFUSED')) {
                    reject(new sequelizeErrors.ConnectionRefusedError(err));
                  } else {
                    reject(new sequelizeErrors.ConnectionError(err));
                  }
                  break;
                case 'ER_ACCESS_DENIED_ERROR':
                case 'ELOGIN':
                  reject(new sequelizeErrors.AccessDeniedError(err));
                  break;
                case 'EINVAL':
                  reject(new sequelizeErrors.InvalidConnectionError(err));
                  break;
                default:
                  reject(new sequelizeErrors.ConnectionError(err));
                  break;
              }
            }
          } else {
            if (options && options.uuid) {
              resolve(new ResourceLock(new mssql.Transaction(this.pool)));
            } else {
              resolve(this.pool);
            }
          }
        });
      });
    } else {
      if (options && options.uuid) {
        return Promise.resolve(new ResourceLock(new mssql.Transaction(this.pool)));
      } else {
        return Promise.resolve(this.pool);
      }
    }
  }

  public getConnection(options : {
    /**
     * if there is uuid, we need to return a transaction
     */
    uuid? : string
  }) : Promise<any> {
    return this._initPoolsAsync(options);
  }

  public connect(config : IConfig) : Promise<any> {
    return Promise.resolve(this.pool);
  }

  public disconnect(connectionLock : { unwrap? }) : Promise<any> {
    return new Promise(resolve => {
      resolve(this.pool);
    });
  }

  public releaseConnection(connection, force? : boolean) : Promise<any> {
    return new Promise(resolve => {
      resolve(this.pool);
    });
  }

  /**
   * validate the connection
   */
  public validate(connectionLock : { unwrap? }) : boolean {
    /**
     * Abstract connection may try to validate raw connection used for fetching version
     */
    const connection = connectionLock.unwrap
      ? connectionLock.unwrap()
      : connectionLock;

    return connection && connection.loggedIn;
  }
}
