'use strict';

import {AbstractConnectionManager} from '../abstract/connection-manager';
import Promise from '../../promise';
import * as Utils from '../../utils';
const debug = Utils.getLogger().debugContext('connection:sqlite');
import AllDataTypes from '../../data-types';
const dataTypes = AllDataTypes.sqlite;
import * as sequelizeErrors from '../../errors/index';
import {parserStore} from '../parserStore';
const store = parserStore('sqlite');
const fs = require('fs');

export class ConnectionManager extends AbstractConnectionManager {
  connections;

  constructor(dialect, sequelize) {
    super(dialect, sequelize);
    this.sequelize = sequelize;
    this.config = sequelize.config;
    this.dialect = dialect;
    this.dialectName = this.sequelize.options.dialect;
    this.connections = {};

    // We attempt to parse file location from a connection uri but we shouldn't match sequelize default host.
    if (this.sequelize.options.host === 'localhost') delete this.sequelize.options.host;

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

  // Expose this as a method so that the parsing may be updated when the user has added additional, custom types
  _refreshTypeParser(dataType) {
    store.refresh(dataType);
  }

  _clearTypeParser() {
    store.clear();
  }

  getConnection(options) {
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
        const fullPath = this.sequelize.options.storage.split('/').filter((item, idx, tab) => { if (idx !== tab.length -1) { return true}}).join('/');
        try {
          fs.mkdirSync(fullPath)
        } catch (err) {
          if (err.code !== 'EEXIST') throw err
        }
      }


      this.connections[options.inMemory || options.uuid] = new this.lib.Database(
        this.sequelize.options.storage || this.sequelize.options.host || ':memory:',
        options.readWriteMode || this.lib.OPEN_READWRITE | this.lib.OPEN_CREATE, // default mode
        err => {
          if (err) {
            if (err.code === 'SQLITE_CANTOPEN') return reject(new sequelizeErrors.ConnectionError(err));
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

  releaseConnection(connection, force) {
    if (connection.filename === ':memory:' && force !== true) return;

    if (connection.uuid) {
      connection.close();
      debug(`connection released ${connection.uuid}`);
      delete this.connections[connection.uuid];
    }
  }
}