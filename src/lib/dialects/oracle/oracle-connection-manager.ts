'use strict';

import * as Promise from 'bluebird';
import { Sequelize } from '../../..';
import * as sequelizeErrors from '../../errors/index';
import { IConfig, IConfigOracle } from '../../interfaces/iconfig';
import { AbstractConnectionManager } from '../abstract/abstract-connection-manager';
import { ParserStore } from '../parserStore';
import { OracleDialect } from './oracle-dialect';

export const store = new ParserStore('oracle');

export class OracleConnectionManager extends AbstractConnectionManager  {

  constructor(dialect : OracleDialect, sequelize : Sequelize) {
    super(dialect, sequelize);

    this.sequelize = sequelize;
    this.sequelize.config.port = this.sequelize.config.port || 1521;
    try {
      if (sequelize.config.dialectModulePath) {
        this.lib = require(sequelize.config.dialectModulePath);
      } else {
        this.lib = require('oracledb');
        this.lib.maxRows = 1000;

        if (sequelize.config && 'dialectOptions' in sequelize.config) {
          const dialectOptions = sequelize.config.dialectOptions;
          if (dialectOptions && 'maxRows' in dialectOptions) {
            this.lib.maxRows = sequelize.config.dialectOptions.maxRows;
          }

          if (dialectOptions && 'fetchAsString' in dialectOptions) {
            this.lib.fetchAsString = sequelize.config.dialectOptions.fetchAsString;
          } else {
            this.lib.fetchAsString = [this.lib.CLOB];
          }
        }
        this.lib.Promise = Promise;
      }
    } catch (err) {
      if (err.code === 'MODULE_NOT_FOUND') {
        throw new Error('Please install oracledb package manually');
      }
      throw err;
    }

  }

  /**
   * Method for checking the config object passed and generate the full database if not fully passed
   * With dbName, host and port, it generates a string like this : 'host:port/dbname'
   * @hidden
   */
  private checkConfigObject(config : IConfig) {
    //A connectString should be defined
    if (config.database.length === 0) {
      let errorToThrow = 'The database cannot be blank, you must specify the database name (which correspond to the service name';
      errorToThrow += '\n from tnsnames.ora : (HOST = mymachine.example.com)(PORT = 1521)(SERVICE_NAME = orcl)';
      throw new Error(errorToThrow);
    }

    if (!config.host || config.host.length === 0) {
      throw new Error('You have to specify the host');
    }

    //The connectString has a special format, we check it
    //ConnectString format is : host:[port]/service_name
    if (config.database.indexOf('/') === - 1) {

      let connectString = config.host;

      if (config.port && config.port !== 0) {
        connectString += `:${config.port}`;
      } else {
        connectString += ':1521'; //Default port number
      }
      connectString += `/${config.database}`;
      config.database = connectString;
    }
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
   * connect to the database
   */
  public connect(config : IConfigOracle) : Promise <any> {

    const self = this;
    return new Promise((resolve, reject) => {
      const connectionConfig : IConfigOracle = {
        user: config.username,
        host:  config.host,
        port : config.port,
        database : config.database,
        password: config.password,
        externalAuth : config.externalAuth,
        stmtCacheSize : 5
      };
      //We check if there dialect options
      if ('dialectOptions' in config) {
        const dialectOptions = config.dialectOptions;
        //If stmtCacheSize is defined, we set it
        if (dialectOptions && 'stmtCacheSize' in dialectOptions) {
          connectionConfig.stmtCacheSize = dialectOptions.stmtCacheSize;
        }
      }
      //Check the config object
      self.checkConfigObject(connectionConfig);
      //We assume that the database has been correctly formed
      connectionConfig.connectString = connectionConfig.database;
      if (config.dialectOptions) {
        Object.keys(config.dialectOptions).forEach(key => {
          connectionConfig[key] = config.dialectOptions[key];
        });
      }
      return self.lib.getConnection(connectionConfig).then(connection => {
        //Not relevant, node-oracledb considers it if multiple connections are opened / closed; while testing, a few connections are created and closed.
        //We change the session NLS_COMP and NLS_SORT to allow search case insensitive (http://stackoverflow.com/questions/5391069/case-insensitive-searching-in-oracle)
        const alterSessionQry = "BEGIN EXECUTE IMMEDIATE 'ALTER SESSION SET NLS_COMP=LINGUISTIC'; EXECUTE IMMEDIATE 'ALTER SESSION SET NLS_SORT=BINARY_CI'; END;";
        return connection.execute(alterSessionQry).then(() => {
          return connection.commit().then(() => {
            resolve(connection);
          });
        });
      }).catch(err => {
        if (err) {
          //We split to get the error number; it comes as ORA-XXXXX:
          let errorCode = err.message.split(':');
          errorCode = errorCode[0];
          switch (errorCode) {
            case 'ORA-28000': //Account locked
              reject(new sequelizeErrors.ConnectionRefusedError(err));
            case 'ORA-01017': //ORA-01017: invalid username/password; logon denied
              reject(new sequelizeErrors.AccessDeniedError(err));
            case 'ORA-12154': //ORA-12154: TNS:could not resolve the connect identifier specified
              reject(new sequelizeErrors.HostNotReachableError(err));
            case 'ORA-12514' : // ORA-12514: TNS:listener does not currently know of service requested in connect descriptor
              reject(new sequelizeErrors.HostNotFoundError(err));
            case 'ORA-12541' : //ORA-12541: TNS:No listener
              reject(new sequelizeErrors.HostNotFoundError(err));
            default:
              reject(new sequelizeErrors.ConnectionError(err));
          }
        }
      }).tap(connection => {
        return Promise.resolve(connection);
      });
    });

  }

  /**
   * disconnect of the database
   */
  public disconnect(connection) : Promise<any> {
    return new Promise((resolve, reject) => {
      return connection.close().then(resolve)
        .catch(err => {
          reject(new sequelizeErrors.ConnectionError(err));
        });
    });
  }

  /**
   * validate the connection
   */
  public validate(connection) : boolean {
    return connection && ['disconnected', 'protocol_error'].indexOf(connection.state) === -1;
  }

}
