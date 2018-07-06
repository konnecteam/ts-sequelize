'use strict';

import AllDataTypes from '../../data-types';
import * as sequelizeErrors from '../../errors/index';
import { IConfig } from '../../model/iconfig';
import Promise from '../../promise';
import { Utils } from '../../utils';
import { AbstractConnectionManager } from '../abstract/abstract-connection-manager';
import { ParserStore } from '../parserStore';
import { ResourceLock } from './resource-lock';

const DataTypes = AllDataTypes.mssql;
const debug = Utils.getLogger().debugContext('connection:mssql');
const debugTedious = Utils.getLogger().debugContext('connection:mssql:tedious');
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
   * connect to the database
   */
  public connect(config : IConfig) : Promise<any> {
    const connectionConfig = {
      userName: config.username,
      password: config.password,
      server: config.host,
      options: {
        port: config.port,
        database: config.database
      },
      domain: undefined
    };

    if (config.dialectOptions) {
      // only set port if no instance name was provided
      if (config.dialectOptions.instanceName) {
        delete connectionConfig.options.port;
      }

      // The 'tedious' driver needs domain property to be in the main Connection config object
      if (config.dialectOptions.domain) {
        connectionConfig.domain = config.dialectOptions.domain;
      }

      for (const key of Object.keys(config.dialectOptions)) {
        connectionConfig.options[key] = config.dialectOptions[key];
      }
    }

    return new Promise((resolve, reject) => {
      const connection = new this.lib.Connection(connectionConfig);
      connection.lib = this.lib;
      const resourceLock = new ResourceLock(connection);

      connection.on('end', () => {
        reject(new sequelizeErrors.ConnectionError('Connection was closed by remote server'));
      });

      connection.on('connect', err => {
        if (!err) {
          debug('connection acquired');
          return resolve(resourceLock);
        }

        if (!err.code) {
          reject(new sequelizeErrors.ConnectionError(err));
          return;
        }

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
      });

      if (config.dialectOptions && config.dialectOptions.debug) {
        connection.on('debug', debugTedious);
      }

      if (config.pool.handleDisconnects) {
        connection.on('error', err => {
          switch (err.code) {
            case 'ESOCKET':
            case 'ECONNRESET':
              this.pool.destroy(resourceLock)
                .catch(/Resource not currently part of this pool/, () => {});
          }
        });
      }
    });
  }

  /**
   * disconnect of the database
   */
  public disconnect(connectionLock : { unwrap? }) : Promise<any> {
    /**
     * Abstract connection may try to disconnect raw connection used for fetching version
     */
    const connection = connectionLock.unwrap ? connectionLock.unwrap() : connectionLock;

    // Dont disconnect a connection that is already disconnected
    if (connection.closed) {
      return Promise.resolve();
    }

    return new Promise(resolve => {
      connection.on('end', resolve);
      connection.close();
      debug('connection closed');
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
