'use strict';

import * as Promise from 'bluebird';
import * as chai from 'chai';
import * as chaiaspromised from 'chai-as-promised';
import * as chaispies from 'chai-spies';
import * as fs from 'fs';
import * as _ from 'lodash';
import * as path from 'path';
import * as sinonchai from 'sinon-chai';
import {Sequelize} from '../index';
import DataTypes from '../lib/data-types';
import Config from './config/config';
import { DummyQueryGenerator } from './dummy/dummy-query-generator';
import * as SupportShim from './supportShim';
const chaidatetime = require('chai-datetime');
const expect = chai.expect;

chai.use(chaispies);
chai.use(chaidatetime);
chai.use(chaiaspromised);
chai.use(sinonchai);
chai.config.includeStack = true;
chai.should();

// Make sure errors get thrown when testing
process.on('uncaughtException', e => {
  console.error('An unhandled exception occured:');
  throw e;
});
Sequelize.Promise.onPossiblyUnhandledRejection(e => {
  console.error('An unhandled rejection occured:');
  throw e;
});
Sequelize.Promise.longStackTraces();

// shim all Sequelize methods for testing for correct `options.logging` passing
// and no modification of `options` objects
if (!process.env.COVERAGE && process.env.SHIM) {
  SupportShim.supportShim(Sequelize);
}

export class Support {
  public static sequelize : Sequelize;
  public static Sequelize : typeof Sequelize;

  public static initTests(options) {
    const sequelize = this.createSequelizeInstance(options);

    this.clearDatabase(sequelize, () => {
      if (options.context) {
        options.context.sequelize = sequelize;
      }

      if (options.beforeComplete) {
        options.beforeComplete(sequelize, DataTypes);
      }

      if (options.onComplete) {
        options.onComplete(sequelize, DataTypes);
      }
    });
  }

  public static prepareTransactionTest(sequelize, callback = null) : Promise<Sequelize> {
    const dialect = Support.getTestDialect();

    if (dialect === 'sqlite') {
      const p = path.join(__dirname, 'tmp', 'db.sqlite');

      return new Sequelize.Promise(resolve => {
        // We cannot promisify exists, since exists does not follow node callback convention - first argument is a boolean, not an error / null
        if (fs.existsSync(p)) {
          resolve(Sequelize.Promise.promisify(fs.unlink)(p));
        } else {
          resolve();
        }
      }).then(() => {
        const options = _.extend({}, sequelize.options, { storage: p });
        const _sequelize = new Sequelize(sequelize.config.database, null, null, options);

        if (callback) {
          _sequelize.sync({ force: true }).then(() => { callback(_sequelize); });
        } else {
          return _sequelize.sync({ force: true }).then(() => _sequelize);
        }
      });
    } else {
      if (callback) {
        callback(sequelize);
      } else {
        return Sequelize.Promise.resolve(sequelize);
      }
    }
  }

  public static createSequelizeInstance(options = null) : Sequelize {
    options = options || {};
    options.dialect = this.getTestDialect();

    const config = Config[options.dialect];

    const sequelizeOptions = _.defaults(options, {
      host: options.host || config.host,
      logging: process.env.SEQ_LOG ? console.log : false,
      dialect: options.dialect,
      port: options.port || process.env.SEQ_PORT || config.port,
      pool: config.pool,
      dialectOptions: options.dialectOptions || config.dialectOptions || {}
    });

    if (process.env.DIALECT === 'postgres-native') {
      sequelizeOptions.native = true;
    }

    if (config.storage) {
      sequelizeOptions.storage = config.storage;
    }

    return this.getSequelizeInstance(config.database, config.username, config.password, sequelizeOptions);
  }

  public static getConnectionOptions() {
    const config = Config[this.getTestDialect()];

    delete config.pool;

    return config;
  }

  public static getSequelizeInstance(db, user, pass, options) {
    options = options || {};
    options.dialect = options.dialect || this.getTestDialect();
    return new Sequelize(db, user, pass, options);
  }

  public static clearDatabase(sequelize, callback?) {
    return sequelize
      .getQueryInterface()
      .dropAllTables()
      .then(() => {
        sequelize.modelManager.models = [];
        sequelize.models = {};

        return sequelize
          .getQueryInterface()
          .dropAllEnums();
      });
  }

  public static getSupportedDialects() {
    return fs.readdirSync(__dirname + '/../lib/dialects').filter(file => {
      return file.indexOf('.js') === -1 && file.indexOf('abstract') === -1;
    });
  }

  public static checkMatchForDialects(dialect, value, expectations) {
    if (expectations[dialect]) {
      expect(value).to.match(expectations[dialect]);
    } else {
      throw new Error('Undefined expectation for "' + dialect + '"!');
    }
  }

  public static getAbstractQueryGenerator(sequelize) {
    const QG = new DummyQueryGenerator({
      options: sequelize.options,
      _dialect: sequelize.dialect,
      sequelize
    }
    );
    (QG as any).quoteIdentifier = function quoteIdentifier(identifier) { return identifier; };
    return QG;
  }

  public static getTestDialect() {
    let envDialect = process.env.DIALECT || 'mysql';

    if (envDialect === 'postgres-native') {
      envDialect = 'postgres';
    }

    if (this.getSupportedDialects().indexOf(envDialect) === -1) {
      throw new Error('The dialect you have passed is unknown. Did you really mean: ' + envDialect);
    }

    return envDialect;
  }

  public static getTestDialectTeaser(moduleName) {
    let dialect = this.getTestDialect();

    if (process.env.DIALECT === 'postgres-native') {
      dialect = 'postgres-native';
    }

    return '[' + dialect.toUpperCase() + '] ' + moduleName;
  }

  public static getTestUrl(config) {
    let url;
    const dbConfig = config[config.dialect];

    if (config.dialect === 'sqlite') {
      url = 'sqlite://' + dbConfig.storage;
    } else {

      let credentials = dbConfig.username;
      if (dbConfig.password) {
        credentials += ':' + dbConfig.password;
      }

      url = config.dialect + '://' + credentials
      + '@' + dbConfig.host + ':' + dbConfig.port + '/' + dbConfig.database;
    }
    return url;
  }

  public static expectsql(query, assertions) {
    const expectations = assertions.query || assertions;
    let expectation = expectations[Support.sequelize.dialect.name];

    if (!expectation) {
      if (expectations['default'] !== undefined) {
        expectation = expectations['default']
          .replace(/\[/g, Support.sequelize.dialect.TICK_CHAR_LEFT)
          .replace(/\]/g, Support.sequelize.dialect.TICK_CHAR_RIGHT);
      } else {
        throw new Error('Undefined expectation for "' + Support.sequelize.dialect.name + '"!');
      }
    }

    if (_.isError(query)) {
      expect(query.message).to.equal(expectation.message);
    } else {
      expect(query.query || query).to.equal(expectation);
    }

    if (assertions.bind) {
      const bind = assertions.bind[Support.sequelize.dialect.name] || assertions.bind['default'] || assertions.bind;
      expect(query.bind).to.deep.equal(bind);
    }
  }
}

if (typeof beforeEach !== 'undefined') {
  beforeEach(function() {
    this.sequelize = Support.sequelize;
  });
}
Support.sequelize = Support.createSequelizeInstance(null);
Support.Sequelize = Sequelize;

export default Support;
