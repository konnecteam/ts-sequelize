'use strict';

import { Sequelize } from '../../..';
import AllDataTypes, { IDataTypes } from '../../data-types';
import * as sequelizeErrors from '../../errors/index';
import Promise from '../../promise';
import { Utils } from '../../utils';
import { AbstractConnectionManager } from '../abstract/abstract-connection-manager';
import { ParserStore } from '../parserStore';
import { SqliteDialect } from './sqlite-dialect';

const dataTypes : IDataTypes = AllDataTypes.sqlite;
const debug = Utils.getLogger().debugContext('connection:sqlite');
const fs = require('fs');
export const store = new ParserStore('sqlite');

export class SqliteConnectionManager extends AbstractConnectionManager {
  public connections;

  constructor(dialect : SqliteDialect, sequelize : Sequelize) {
    super(dialect, sequelize);
    this.sequelize = sequelize;
    this.config = sequelize.config;
    this.dialect = dialect;
    this.dialectName = this.sequelize.options.dialect;
    this.connections = {};

    // We attempt to parse file location from a connection uri but we shouldn't match sequelize default host.
    if (this.sequelize.options.host === 'localhost') {
      delete this.sequelize.options.host;
    }

    try {
      if (sequelize.config.dialectModulePath) {
        this.lib = require(sequelize.config.dialectModulePath).verbose();
      } else {
      }
      this.lib = require('sqlite3').verbose();
    } catch (err) {
      if (err.code === 'MODULE_NOT_FOUND') {
        throw new Error('Please install sqlite3 package manually');
      }
      throw err;
    }

    this.refreshTypeParser(dataTypes);
  }

  /**
   * Expose this as a method so that the parsing may be updated when the user has added additional, custom types
   */
  public _refreshTypeParser(dataType : any) {
    store.refresh(dataType);
  }

  /**
   * clear all type parser
   */
  public _clearTypeParser() {
    store.clear();
  }

  /**
   * return the connection
   */
  public getConnection(options : { uuid? : string, inMemory? : number, readWriteMode?, priority? }) : Promise<any> {
    options = options || {};
    options.uuid = options.uuid || 'default';
    options.inMemory = (this.sequelize.options.storage || this.sequelize.options.host || ':memory:') === ':memory:' ? 1 : 0;

    const dialectOptions = this.sequelize.options.dialectOptions;
    options.readWriteMode = dialectOptions && dialectOptions.mode;

    if (this.connections[options.inMemory || options.uuid]) {
      return Promise.resolve(this.connections[options.inMemory || options.uuid]);
    }

    return new Promise((resolve, reject) => {
      if (this.sequelize.options.storage && this.sequelize.options.storage.indexOf('/') !== -1 && this.sequelize.options.storage.indexOf('.sqlite') !== -1) {
        const fullPath = this.sequelize.options.storage.split('/').filter((item, idx, tab) => { if (idx !== tab.length - 1) { return true; }}).join('/');
        try {
          fs.mkdirSync(fullPath);
        } catch (err) {
          if (err.code !== 'EEXIST') {
            throw err;
          }
        }
      }


      this.connections[options.inMemory || options.uuid] = new this.lib.Database(
        this.sequelize.options.storage || this.sequelize.options.host || ':memory:',
        // tslint:disable-next-line:no-bitwise
        options.readWriteMode || this.lib.OPEN_READWRITE | this.lib.OPEN_CREATE, // default mode
        err => {
          if (err) {
            if (err.code === 'SQLITE_CANTOPEN') {
              return reject(new sequelizeErrors.ConnectionError(err));
            }
            return reject(new sequelizeErrors.ConnectionError(err));
          }
          debug(`connection acquired ${options.uuid}`);
          resolve(this.connections[options.inMemory || options.uuid]);
        }
      );
    }).tap(connection => {
      if (this.sequelize.config.password) {
        // Make it possible to define and use password for sqlite encryption plugin like sqlcipher
        connection.run('PRAGMA KEY=' + this.sequelize.escape(this.sequelize.config.password));
      }
      if (this.sequelize.options.foreignKeys !== false) {
        // Make it possible to define and use foreign key constraints unless
        // explicitly disallowed. It's still opt-in per relation
        connection.run('PRAGMA FOREIGN_KEYS=ON');
      }
    });
  }

  /**
   * release the connection
   */
  public releaseConnection(connection, force : boolean) : any {
    if (connection.filename === ':memory:' && force !== true) {
      return;
    }
    if (connection.uuid) {
      connection.close();
      debug(`connection released ${connection.uuid}`);
      delete this.connections[connection.uuid];
    }
  }

  /**
   * Declaration void as main class is abstract
   */
  public connect(connection?) {}
  public disconnect(connection?) {}
  public validate(connection?) {}
}
