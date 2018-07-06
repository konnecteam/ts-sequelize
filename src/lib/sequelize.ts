'use strict';

import * as clsBluebird from 'cls-bluebird';
import * as _ from 'lodash';
import * as Path from 'path';
import * as retry from 'retry-as-promised';
import * as url from 'url';
import { Association } from './associations/base';
import DataTypes, { IDataTypes } from './data-types';
import * as Deferrable from './deferrable';
import { AbstractConnectionManager } from './dialects/abstract/abstract-connection-manager';
import { AbstractDialect } from './dialects/abstract/abstract-dialect';
import * as sequelizeErrors from './errors/index';
import * as Hooks from './hooks';
import { Model } from './model';
import { ModelManager } from './model-manager';
import { IConfig } from './model/iconfig';
import { ISequelizeOption } from './model/isequelize-option';
import Op from './operators';
import Promise from './promise';
import { AbstractQueryInterface } from './query-interface';
import { QueryTypes } from './query-types';
import { Transaction } from './transaction';
import * as AllUtils from './utils';
import * as validatorExtras from './utils/validator-extras';

const Utils = AllUtils.Utils;
const Validator = validatorExtras.validator;

/**
 * This is the main class, the entry point to sequelize. To use it, you just need to import sequelize:
 *
 * ```js
 * import {Sequelize} from 'sequelize';
 * ```
 *
 * In addition to sequelize, the connection library for the dialect you want to use should also be installed in your project. You don't need to import it however, as sequelize will take care of that.
 */
export class Sequelize {
  public AllUtils;
  public and;
  public asIs;
  public Association : typeof Association;
  public cast;
  public col;
  public condition;
  public config : IConfig;
  public connectionManager : AbstractConnectionManager;
  public DataTypes : IDataTypes;
  public dialect : AbstractDialect;
  public Deferrable;
  public Error;
  public fn;
  public importCache : {};
  public json;
  public literal;
  public Model;
  public modelManager : ModelManager;
  public models : {};
  public Op;
  public options : ISequelizeOption;
  public or;
  public Promise;
  public queryInterface : AbstractQueryInterface;
  public QueryTypes;
  public test;
  public Transaction : typeof Transaction;
  public Sequelize : typeof Sequelize;
  public UniqueConstraintError;
  public Utils : typeof AllUtils.Utils;
  public validate;
  public Validator;
  public version;
  public where;

  public static _cls;
  public static AllUtils;
  public static asIs;
  public static Association : typeof Association;
  public static condition;
  public static ConnectionError : typeof sequelizeErrors.ConnectionError;
  public static DataTypes : IDataTypes;
  public static Deferrable;
  public static EmptyResultError : typeof sequelizeErrors.EmptyResultError;
  public static Error : typeof sequelizeErrors.BaseError;
  public static ForeignKeyConstraintError : typeof sequelizeErrors.ForeignKeyConstraintError;
  public static InstanceError : typeof sequelizeErrors.InstanceError;
  public static Model : typeof Model;
  public static Op;
  public static options;
  public static Promise;
  public static QueryTypes;
  public static Sequelize : typeof Sequelize;
  public static Transaction : typeof Transaction;
  public static Utils : typeof AllUtils.Utils;
  public static version : string;
  public static Validator;
  public static ValidationError : typeof sequelizeErrors.ValidationError;


  /**
   * Instantiate sequelize with name of database, username and password
   *
   * #### Example usage
   *
   * ```javascript
   * // without password and options
   * const sequelize = new Sequelize('database', 'username')
   *
   * // without options
   * const sequelize = new Sequelize('database', 'username', 'password')
   *
   * // without password / with blank password
   * const sequelize = new Sequelize('database', 'username', null, {})
   *
   * // with password and options
   * const sequelize = new Sequelize('my_database', 'john', 'doe', {})
   *
   * // with database, username, and password in the options object
   * const sequelize = new Sequelize({ database, username, password });
   *
   * // with uri
   * const sequelize = new Sequelize('mysql://localhost:3306/database', {})
   * ```
   *
   * @param database The name of the database
   * @param username = null, The username which is used to authenticate against the database.
   * @param password = null, The password which is used to authenticate against the database. Supports SQLCipher encryption for SQLite.
   * @param options = {}, An object with options.
   */
  constructor(database : string, username? : string | {}, password? : string, options? : {
    /** = false, Pass query execution time in milliseconds as second argument to logging function (options.logging). */
    benchmark? : boolean,
    /** = null, The name of the database */
    database? : string,
    /** = {}, Default options for model definitions. See sequelize.define for options */
    define? : {},
    /** The dialect of the database you are connecting to. One of mysql, postgres, sqlite, oracle and mssql. */
    dialect? : string,
    /** = null, If specified, load the dialect library from this path. For example, if you want to use pg.js instead of pg when connecting to a pg database, you should specify 'pg.js' here */
    dialectModulePath? : string,
    /** An object of additional options, which are passed directly to the connection library */
    dialectOptions? : {},
    /** An object of hook function that are called before and after certain lifecycle events */
    hooks? : boolean,
    /** = 'localhost', The host of the relational database. */
    host? : string,
    /** Set the default transaction isolation level. See `Sequelize.Transaction.ISOLATION_LEVELS` for possible options. */
    isolationLevel? : string,
    /** = console.log A function that gets executed every time Sequelize would log something. */
    logging? : boolean | any,
    /** = false, A flag that defines if native library shall be used or not. Currently only has an effect for postgres */
    native? : boolean,
    /** = false, A flag that defines if null values should be passed to SQL queries or not. */
    omitNull? : boolean,
    /** = true, String based operator alias, default value is true which will enable all operators alias. Pass object to limit set of aliased operators or false to disable completely. */
    operatorsAliases? : boolean,
    /** = null, The password which is used to authenticate against the database. */
    password? : string,
    /** sequelize connection pool configuration */
    pool? : {
      /** = 10000, The maximum time, in milliseconds, that pool will try to get connection before throwing error */
      acquire? : number,
      /** = 10000, The time interval, in milliseconds, for evicting stale connections. Set it to 0 to disable this feature. */
      evict? : number,
      /** = true, Controls if pool should handle connection disconnect automatically without throwing errors */
      handleDisconnects? : boolean,
      /**
       * = 10000, The maximum time, in milliseconds, that a connection can be idle before being released.
       * Use with combination of evict for proper working, for more details read https://github.com/coopernurse/node-pool/issues/178#issuecomment-327110870
       */
      idle? : number,
      /** = 5, Maximum number of connection in pool */
      max? : number,
      /** = 0, Minimum number of connection in pool */
      min? : number,
      /** A function that validates a connection. Called with client. The default function checks that client is an object, and that its state is not disconnected */
      validate? : any
    },
    /** The port of the relational database. */
    port? : number | string,
    /** = 'tcp', The protocol of the relational database. */
    protocol? : string,
    /** = {}, Default options for sequelize.query */
    query? : {},
    /** = true, Set to `false` to make table names and attributes case-insensitive on Postgres and skip double quoting of them.  WARNING: Setting this to false may expose vulnerabilities and is not recommended! */
    quoteIdentifiers? : boolean,
    /**
     * = false, Use read / write replication. To enable replication, pass an object, with two properties, read and write.
     * Write should be an object (a single server for handling writes), and read an array of object (several servers to handle reads).Each read/write server can have the following properties: `host`, `port`, `username`, `password`, `database`
     */
    replication? : {},
    /** Set of flags that control when a query is automatically retried. */
    retry? : {
      /** Only retry a query if the error matches one of these strings. */
      match? : any,
      /** How many times a failing query is automatically retried.  Set to 0 to disable retrying on SQL_BUSY error. */
      max? : number
    }
    /** = {}, Default options for sequelize.set */
    set? : {},
    /** Only used by sqlite. Defaults to ':memory:' */
    storage? : any,
    /** = {}, Default options for sequelize.sync */
    sync? : {},
    /**
     * = '+00:00'] The timezone used when converting a date from the database into a JavaScript date.
     * The timezone is also used to SET TIMEZONE when connecting to the server,to ensure that the result of NOW, CURRENT_TIMESTAMP and other time related functions have in the right timezone.
     * For best cross platform performance use the format +/-HH:MM. Will also accept string versions of timezones used by moment.js (e.g. 'America/Los_Angeles'); this is useful to capture daylight savings time changes.
     */
    timezone? : string,
    /** = 'DEFERRED', Set the default transaction type. See `Sequelize.Transaction.TYPES` for possible options. Sqlite only. */
    transactionType? : string,
    /** = false, Run built in type validators on insert and update, e.g. validate that arguments passed to integer fields are integer-like. */
    typeValidation? : boolean,
    /** = null, The username which is used to authenticate against the database. */
    username? : string
  }) {
    let config;

    if (arguments.length === 1 && typeof database === 'object') {
      // new Sequelize({ ... options })
      options = database;
      config = _.pick(options, 'host', 'port', 'database', 'username', 'password');
    } else if (arguments.length === 1 && typeof database === 'string' || arguments.length === 2 && typeof username === 'object') {
      // new Sequelize(URI, { ... options })

      config = {};
      options = username || {};

      const urlParts = url.parse(arguments[0]);

      options.dialect = urlParts.protocol.replace(/:$/, '');
      options.host = urlParts.hostname;

      if (options.dialect === 'sqlite' && urlParts.pathname && urlParts.pathname.indexOf('/:memory') !== 0) {
        const path = Path.join(options.host, urlParts.pathname);
        options.storage = options.storage || path;
      }

      if (urlParts.pathname) {
        config.database = urlParts.pathname.replace(/^\//, '');
      }

      if (urlParts.port) {
        options.port = urlParts.port;
      }

      if (urlParts.auth) {
        const authParts = urlParts.auth.split(':');

        config.username = authParts[0];

        if (authParts.length > 1) {
          config.password = authParts.slice(1).join(':');
        }
      }
    } else {
      // new Sequelize(database, username, password, { ... options })
      options = options || {};
      config = {database, username, password};
    }

    Sequelize.runHooks('beforeInit', config, options);

    this.options = Object.assign({
      dialect: null,
      dialectModulePath: null,
      host: 'localhost',
      protocol: 'tcp',
      define: {},
      query: {},
      sync: {},
      timezone: '+00:00',
      logging: console.log,
      omitNull: false,
      native: false,
      replication: false,
      ssl: undefined,
      pool: {},
      quoteIdentifiers: true,
      hooks: {},
      retry: {
        max: 5,
        match: [
          'SQLITE_BUSY: database is locked']
      },
      transactionType: Transaction.TYPES.DEFERRED,
      isolationLevel: null,
      databaseVersion: 0,
      typeValidation: false,
      benchmark: false,
      operatorsAliases: true
    }, options || {});

    if (!this.options.dialect) {
      throw new Error('Dialect needs to be explicitly supplied as of v4.0.0');
    }

    if (this.options.dialect === 'postgresql') {
      this.options.dialect = 'postgres';
    }

    if (this.options.dialect === 'sqlite' && this.options.timezone !== '+00:00') {
      throw new Error('Setting a custom timezone is not supported by SQLite, dates are always returned as UTC. Please remove the custom timezone parameter.');
    }

    if (this.options.logging === true) {
      Utils.deprecate('The logging-option should be either a function or false. Default: console.log');
      this.options.logging = console.log;
    }

    (this as any)._setupHooks(options.hooks);

    this.config = {
      database: config.database || this.options.database,
      username: config.username || this.options.username,
      password: config.password || this.options.password || null,
      host: config.host || this.options.host,
      port: config.port || this.options.port,
      pool: this.options.pool,
      protocol: this.options.protocol,
      native: this.options.native,
      ssl: this.options.ssl,
      replication: this.options.replication,
      dialectModulePath: this.options.dialectModulePath,
      keepDefaultTimezone: this.options.keepDefaultTimezone,
      dialectOptions: this.options.dialectOptions
    };

    let Dialect;
    // Requiring the dialect in a switch-case to keep the
    // require calls static. (Browserify fix)
    switch (this.getDialect()) {
      case 'mssql':
        Dialect = require('./dialects/mssql/mssql-dialect').MssqlDialect;
        break;
      case 'mysql':
        Dialect = require('./dialects/mysql/mysql-dialect').MysqlDialect;
        break;
      case 'postgres':
        Dialect = require('./dialects/postgres/postgres-dialect').PostgresDialect;
        break;
      case 'sqlite':
        Dialect = require('./dialects/sqlite/sqlite-dialect').SqliteDialect;
        break;
      case 'oracle':
        Dialect = require('./dialects/oracle/oracle-dialect').OracleDialect;
        break;
      default:
        throw new Error('The dialect ' + this.getDialect() + ' is not supported. Supported dialects: mssql, mysql, postgres, oracle and sqlite.');
    }

    this.dialect = new Dialect(this);
    this.dialect.QueryGenerator.typeValidation = options.typeValidation;
    if (this.options.operatorsAliases === true) {
      Utils.deprecate('String based operators are now deprecated. Please use Symbol based operators for better security, read more at http://docs.sequelizejs.com/manual/tutorial/querying.html#operators');
      this.dialect.QueryGenerator.setOperatorsAliases(Op.LegacyAliases); //Op.LegacyAliases should be removed and replaced by Op.Aliases by v5.0 use
    } else {
      this.dialect.QueryGenerator.setOperatorsAliases(this.options.operatorsAliases);
    }

    this.queryInterface = this.dialect.createQueryInterface();

    /**
     * Models are stored here under the name given to `sequelize.define`
     */
    this.models = {};
    this.modelManager = new ModelManager(this);
    this.connectionManager = this.dialect.connectionManager;

    this.importCache = {};

    this.test = {
      _trackRunningQueries: false,
      _runningQueries: 0,
      trackRunningQueries() {
        this._trackRunningQueries = true;
      },
      verifyNoRunningQueries() {
        if (this._runningQueries > 0) {
          throw new Error('Expected 0 running queries. ' + this._runningQueries + ' queries still running');
        }
      }
    };

    Sequelize.runHooks('afterInit', this);
  }

  /**
   * refresh function parser of each dataTypes
   */
  public refreshTypes() {
    this.connectionManager.refreshTypeParser(DataTypes);
  }

  /**
   * Returns the specified dialect.
   *
   * @returns The specified dialect.
   */
  public getDialect() : string {
    return this.options.dialect;
  }

  /**
   * Returns an instance of QueryInterface.
   * @method getQueryInterface
   * @memberOf Sequelize
   * @returns QueryInterface, An instance (singleton) of QueryInterface.
   */
  public getQueryInterface() : AbstractQueryInterface {
    this.queryInterface = this.queryInterface || this.dialect.createQueryInterface();
    return this.queryInterface;
  }

  /**
   * Define a new model, representing a table in the DB.
   *
   * The table columns are defined by the object that is given as the second argument. Each key of the object represents a column
   *
   * @param modelName The name of the model. The model will be stored in `sequelize.models` under this name
   * @param attributes An object, where each attribute is a column of the table. See {@link Model.init}
   * @param options These options are merged with the default define options provided to the Sequelize constructor and passed to Model.init()
   *
   * @see {@link Model.init} for a more comprehensive specification of the `options` and `attributes` objects.
   * @see <a href="../manual/tutorial/models-definition.html">The manual section about defining models</a>
   * @see {@link DataTypes} For a list of possible data types
   *
   * @example
   * sequelize.define('modelName', {
   *     columnA: {
   *         type: Sequelize.BOOLEAN,
   *         validate: {
   *           is: ["[a-z]",'i'],        // will only allow letters
   *           max: 23,                  // only allow values <= 23
   *           isIn: {
   *             args: [['en', 'zh']],
   *             msg: "Must be English or Chinese"
   *           }
   *         },
   *         field: 'column_a'
   *         // Other attributes here
   *     },
   *     columnB: Sequelize.STRING,
   *     columnC: 'MY VERY OWN COLUMN TYPE'
   * })
   *
   * sequelize.models.modelName // The model will now be available in models under the name given to define
   */
  public define(modelName : string, attributes : {}, options : {
    /** Set name of the model. By default its same as Class name. */
    modelName? : string,
    sequelize? : Sequelize
  } = {}) : typeof Model {
    options.modelName = modelName;
    options.sequelize = this;

    const model = class extends Model {};
    model.init(attributes, options);

    return model;
  }

  /**
   * Fetch a Model which is already defined
   *
   * @param modelName The name of a model defined with Sequelize.define
   * @throws Will throw an error if the model is not defined (that is, if sequelize#isDefined returns false)
   */
  public model(modelName : string) : typeof Model {
    if (!this.isDefined(modelName)) {
      throw new Error(modelName + ' has not been defined');
    }

    return this.modelManager.getModel(modelName);
  }

  /**
   * Checks whether a model with the given name is defined
   *
   * @param modelName The name of a model defined with Sequelize.define
   */
  public isDefined(modelName : string) : boolean {
    return !!this.modelManager.models.find(model => model.name === modelName);
  }

  /**
   * Imports a model defined in another file
   *
   * Imported models are cached, so multiple calls to import with the same path will not load the file multiple times
   *
   * See https://github.com/sequelize/express-example for a short example of how to define your models in separate files so that they can be imported by sequelize.import
   * @param path The path to the file that holds the model you want to import. If the part is relative, it will be resolved relatively to the calling file
   */
  public import(path : string) : Model {
    // is it a relative path?
    if (Path.normalize(path) !== Path.resolve(path)) {
      // make path relative to the caller
      const callerFilename = (Utils.stack()[1] as any).getFileName();
      const callerPath = Path.dirname(callerFilename);

      path = Path.resolve(callerPath, path);
    }

    if (!this.importCache[path]) {
      let defineCall = arguments.length > 1 ? arguments[1] : require(path);
      if (typeof defineCall === 'object') {
        // ES6 module compatibility
        defineCall = defineCall.default;
      }
      this.importCache[path] = defineCall(this, DataTypes);
    }

    return this.importCache[path];
  }

  /**
   * Execute a query on the DB, with the possibility to bypass all the sequelize goodness.
   *
   * By default, the function will return two arguments: an array of results, and a metadata object, containing number of affected rows etc. Use `.spread` to access the results.
   *
   * If you are running a type of query where you don't need the metadata, for example a `SELECT` query, you can pass in a query type to make sequelize format the results:
   *
   * ```js
   * sequelize.query('SELECT...').spread((results, metadata) => {
   *   // Raw query - use spread
   * });
   *
   * sequelize.query('SELECT...', { type: sequelize.QueryTypes.SELECT }).then(results => {
   *   // SELECT query - use then
   * })
   * ```
   *
   * @method query
   * @param sql
   * @param options = {} Query options.
   * @returns Promise,
   *
   * @see {@link Model.build} for more information about instance option.
   */

  public query(sql : { values?, bind?, query?, trim? } | string, options : {
    /** Either an object of named bind parameter in the format `_param` or an array of unnamed bind parameter to replace `$1, $2, ...` in your SQL. */
    bind? : {} | any[];
    /** Map returned fields to arbitrary names for `SELECT` query type. */
    fieldMap? : {};
    /** A sequelize instance used to build the return instance */
    instance? : Model;
    /** = false A function that gets executed while running the query to log the sql. */
    logging? : boolean | any;
    /** = false Map returned fields to model's fields if `options.model` or `options.instance` is present. Mapping will occur before building the model instance. */
    mapToModel? : boolean;
    /** A sequelize model used to build the returned model instances (used to be called callee) */
    model? : typeof Model;
    /**
     *  = false, If true, transforms objects with `.` separated property names into nested objects using [dottie.js](https://github.com/mickhansen/dottie.js).
     * For example { 'user.username': 'john' } becomes { user: { username: 'john' }}. When `nest` is true, the query type is assumed to be `'SELECT'`, unless otherwise specified
     */
    nest? : boolean;
    /** = false Sets the query type to `SELECT` and return a single row */
    plain? : boolean;
    /** If true, sequelize will not try to format the results of the query, or build an instance of a model from the result */
    raw? : boolean;
    /** Either an object of named parameter replacements in the format `:param` or an array of unnamed replacements to replace `?` in your SQL. */
    replacements? : {} | any[];
    /** Set of flags that control when a query is automatically retried. */
    retry? : {
      /** Only retry a query if the error matches one of these strings. */
      match? : any;
      /** How many times a failing query is automatically retried. */
      max? : number;
    };
    /** = DEFAULT An optional parameter to specify the schema search_path (Postgres only) */
    searchPath? : string;
    /** If false do not prepend the query with the search_path (Postgres only) */
    supportsSearchPath? : boolean;
    /** = null The transaction that the query should be executed under */
    transaction? : Transaction;
    /**
     *  = 'RAW' The type of query you are executing. The query type affects how results are formatted before they are passed back.
     * The type is a string, but `Sequelize.QueryTypes` is provided as convenience shortcuts.
     */
    type? : string;
    /** = false Force the query to use the write pool, regardless of the query type. */
    useMaster? : boolean;
  }) {
    options = _.assign({}, this.options.query, options);
    const retryOptions = _.assignIn({}, this.options.retry, options.retry || {});

    let bindParameters;

    return Promise.resolve(retry(retryParameters => Promise.try(() => {
      const isFirstTry = retryParameters.current === 1;

      if (options.instance && !options.model) {
        options.model = options.instance.constructor;
      }

      // map raw fields to model attributes
      if (options.mapToModel) {
        options.fieldMap = _.get(options, 'model.fieldAttributeMap', {});
      }

      if (typeof sql === 'object') {
        if (sql.values !== undefined) {
          if (options.replacements !== undefined) {
            throw new Error('Both `sql.values` and `options.replacements` cannot be set at the same time');
          }
          options.replacements = sql.values;
        }

        if (sql.bind !== undefined) {
          if (options.bind !== undefined) {
            throw new Error('Both `sql.bind` and `options.bind` cannot be set at the same time');
          }
          options.bind = sql.bind;
        }

        if (sql.query !== undefined) {
          sql = sql.query;
        }
      }

      sql = sql.trim();

      if (!options.instance && !options.model) {
        options.raw = true;
      }

      if (options.replacements && options.bind) {
        throw new Error('Both `replacements` and `bind` cannot be set at the same time');
      }

      if (options.replacements) {
        if (Array.isArray(options.replacements)) {
          sql = Utils.format([sql].concat(options.replacements), this.options.dialect);
        } else {
          sql = Utils.formatNamedParameters((sql as string), options.replacements, this.options.dialect);
        }
      }

      if (options.bind) {
        const bindSql = this.dialect.Query.formatBindParameters(sql, options.bind, this.options.dialect);
        sql = bindSql[0];
        bindParameters = bindSql[1];
        if (!Array.isArray(options.bind)) {
          const keys = Object.keys(options.bind);
          if ((sql as string).includes(':' + keys[0])) {
            bindParameters = options.bind;
          }
        }
      }

      options = _.defaults(options, {
        logging: this.options.hasOwnProperty('logging') ? this.options.logging : console.log,
        searchPath: this.options.hasOwnProperty('searchPath') ? this.options.searchPath : 'DEFAULT'
      });

      if (options.transaction === undefined && Sequelize._cls) {
        options.transaction = Sequelize._cls.get('transaction');
      }

      if (!options.type) {
        if (options.model || options.nest || options.plain) {
          options.type = QueryTypes.SELECT;
        } else {
          options.type = QueryTypes.RAW;
        }
      }

      if (options.transaction && options.transaction.finished) {
        const error = new Error(`${options.transaction.finished} has been called on this transaction(${options.transaction.id}), you can no longer use it. (The rejected query is attached as the \'sql\' property of this error)`);
        (error as any).sql = sql;
        return Promise.reject(error);
      }

      if (isFirstTry && this.test._trackRunningQueries) {
        this.test._runningQueries++;
      }

      //if dialect doesn't support search_path or dialect option
      //to prepend searchPath is not true delete the searchPath option
      if (
        !this.dialect.supports.searchPath ||
        !this.options.dialectOptions ||
        !this.options.dialectOptions.prependSearchPath ||
        options.supportsSearchPath === false
      ) {
        delete options.searchPath;
      } else if (!options.searchPath) {
        //if user wants to always prepend searchPath (dialectOptions.preprendSearchPath = true)
        //then set to DEFAULT if none is provided
        options.searchPath = 'DEFAULT';
      }

      return options.transaction
        ? options.transaction.connection
        : this.connectionManager.getConnection(options);
    }).then(connection => {
      const query = new this.dialect.Query(connection, this, options);

      return query.run(sql, bindParameters)
        .finally(() => {
          if (this.test._trackRunningQueries) {
            this.test._runningQueries--;
          }

          if (!options.transaction) {
            return this.connectionManager.releaseConnection(connection);
          }
        });
    }), retryOptions));
  }

  /**
   * Execute a query which would set an environment or user variable. The variables are set per connection, so this function needs a transaction.
   * Only works for MySQL.
   *
   * @param variables Object with multiple variables.
   * @param options Query options.
   */
  public set(variables : {}, options : {
    /** Specify if we want only one row without using an array */
    plain? : boolean,
    /** Return raw result. */
    raw? : boolean,
    /** The transaction that the query should be executed under */
    transaction? : Transaction,
    /**
     * The type of query you are executing. The query type affects how results are formatted before they are passed back.
     * The type is a string, but `Sequelize.QueryTypes` is provided as convenience shortcuts.
     */
    type? : string
  }) : Promise<any> {

    // Prepare options
    options = _.extend({}, this.options.set, typeof options === 'object' && options || {});

    if (this.options.dialect !== 'mysql') {
      throw new Error('sequelize.set is only supported for mysql');
    }
    if (!options.transaction || !(options.transaction instanceof Transaction) ) {
      throw new TypeError('options.transaction is required');
    }

    // Override some options, since this isn't a SELECT
    options.raw = true;
    options.plain = true;
    options.type = 'SET';

    // Generate SQL Query
    const query =
      'SET ' +
      _.map(variables, (v, k) => '@' + k + ' := ' + (typeof v === 'string' ? '"' + v + '"' : v)).join(', ');

    return this.query(query, options);
  }

  /**
   * Escape value.
   */
  public escape(value : string) : string {
    return this.getQueryInterface().escape(value);
  }

  /**
   * Create a new database schema.
   *
   * Note, that this is a schema in the [postgres sense of the word](http://www.postgresql.org/docs/9.1/static/ddl-schemas.html),
   * not a database table. In mysql and sqlite, this command will do nothing.
   *
   * @see {@link Model.schema}
   * @param schema Name of the schema
   * @param options = {}
   */
  public createSchema(schema : string, options : {
    /** A function that logs sql queries, or false for no logging */
    logging? : boolean | any
  }) : Promise<any> {
    return this.getQueryInterface().createSchema(schema, options);
  }

  /**
   * Show all defined schemas
   *
   * Note, that this is a schema in the [postgres sense of the word](http://www.postgresql.org/docs/9.1/static/ddl-schemas.html),
   * not a database table. In mysql and sqlite, this will show all tables.
   * @param options = {}
   */
  public showAllSchemas(options : { logging? : boolean | any }) : Promise<any> {
    return this.getQueryInterface().showAllSchemas(options);
  }

  /**
   * Drop a single schema
   *
   * Note, that this is a schema in the [postgres sense of the word](http://www.postgresql.org/docs/9.1/static/ddl-schemas.html),
   * not a database table. In mysql and sqlite, this drop a table matching the schema name
   * @param schema Name of the schema
   * @param options = {}
   */
  public dropSchema(schema : string, options : { logging? : boolean | any }) : Promise<any> {
    return this.getQueryInterface().dropSchema(schema, options);
  }

  /**
   * Drop all schemas
   *
   * Note,that this is a schema in the [postgres sense of the word](http://www.postgresql.org/docs/9.1/static/ddl-schemas.html),
   * not a database table. In mysql and sqlite, this is the equivalent of drop all tables.
   * @param options = {}
   */
  public dropAllSchemas(options : { logging? : boolean | any }) : Promise<any> {
    return this.getQueryInterface().dropAllSchemas(options);
  }

  /**
   * Sync all defined models to the DB.
   *
   * @param options = {}
   */
  public sync(options : {
    /** = false Alters tables to fit models. Not recommended for production use. Deletes data in columns that were removed or had their type changed in the model. */
    alter? : boolean,
    /** = false If force is true, each Model will run `DROP TABLE IF EXISTS`, before it tries to create its own table */
    force? : boolean,
    /** = true If hooks is true then beforeSync, afterSync, beforeBulkSync, afterBulkSync hooks will be called */
    hooks? : boolean,
    /** = console.log A function that logs sql queries, or false for no logging */
    logging? : boolean | any,
    /** Match a regex against the database name before syncing, a safety check for cases where force: true is used in tests but not live code */
    match? : RegExp,
    /** = 'public' The schema that the tables should be created in. This can be overriden for each table in sequelize.define */
    schema? : string,
    /** = DEFAULT An optional parameter to specify the schema search_path (Postgres only) */
    searchPath? : string
  }) : Promise<this> {
    options = _.clone(options) || {};
    options.hooks = options.hooks === undefined ? true : !!options.hooks;
    options = _.defaults(options, this.options.sync, this.options);

    if (options.match) {
      if (!options.match.test(this.config.database)) {
        return Promise.reject(new Error(`Database "${this.config.database}" does not match sync match parameter "${options.match}"`));
      }
    }

    return Promise.try(() => {
      if (options.hooks) {
        return this.runHooks('beforeBulkSync', options);
      }
    }).then(() => {
      if (options.force) {
        return this.drop(options);
      }
    }).then(() => {
      const models = [];

      // Topologically sort by foreign key constraints to give us an appropriate
      // creation order
      this.modelManager.forEachModel(model => {
        if (model) {
          models.push(model);
        } else {
          // DB should throw an SQL error if referencing non-existent table
        }
      });

      return Promise.each(models, model => model.sync(options));
    }).then(() => {
      if (options.hooks) {
        return this.runHooks('afterBulkSync', options);
      }
    }).return(this);
  }

  /**
   * Truncate all tables defined through the sequelize models. This is done
   * by calling Model.truncate() on each model.
   *
   * @see {@link Model.truncate} for more information
   */
  public truncate(options : {
    cascade? : boolean
    /** : Boolean|function, A function that logs sql queries, or false for no logging */
    logging? : boolean | any,
    /** : Boolean|function */
    transaction : boolean | any,
  }) : Promise<any> {
    const models = [];

    this.modelManager.forEachModel(model => {
      if (model) {
        models.push(model);
      }
    }, { reverse: false });

    const truncateModel = model => model.truncate(options);

    if (options && options.cascade) {
      return Promise.each(models, truncateModel);
    } else {
      return Promise.map(models, truncateModel);
    }
  }

  /**
   * Drop all tables defined through this sequelize instance. This is done by calling Model.drop on each model
   * @see {@link Model.drop} for options
   *
   * @param options  The options passed to each call to Model.drop
   */
  public drop(options : { logging? : boolean | any }) : Promise<any> {
    const models = [];

    this.modelManager.forEachModel(model => {
      if (model) {
        models.push(model);
      }
    }, { reverse: false });

    return Promise.each(models, model => model.drop(options));
  }

  /**
   * Test the connection by trying to authenticate
   *
   * @error 'Invalid credentials' if the authentication failed (even if the database did not respond at all...)
   */
  public authenticate(options? : {}) : Promise<any> {
    let sql = 'SELECT 1+1 AS result';

    if (this.dialect.name === 'oracle') {
      sql += ' FROM DUAL';
    }
    return this.query(sql, _.assign({ raw: true, plain: true }, options)).return();
  }

  /**
   * return database version
   */
  public databaseVersion(options : {}) : Promise<any> {
    return this.getQueryInterface().databaseVersion(options);
  }

  /**
   * Get the fn for random based on the dialect
   *
   * @returns Sequelize.fn,
   */
  public random() : any {
    if (['postgres', 'sqlite'].includes(this.getDialect())) {
      return this.fn('RANDOM');
    } else {
      return this.fn('RAND');
    }
  }

  /**
   * Creates an object representing a database function. This can be used in search queries, both in where and order parts, and as default values in column definitions.
   * If you want to refer to columns in your function, you should use `sequelize.col`, so that the columns are properly interpreted as columns and not a strings.
   *
   * Convert a user's username to upper case
   * ```js
   * instance.updateAttributes({
   *   username: self.sequelize.fn('upper', self.sequelize.col('username'))
   * })
   * ```
   *
   * @see {@link Model.findAll}
   * @see {@link Sequelize.define}
   * @see {@link Sequelize.col}
   * @method fn
   *
   * @param fn The function you want to call
   * @param args All further arguments will be passed as arguments to the function
   *
   * @since v2.0.0-dev3
   * @memberof Sequelize
   * @returns Sequelize.fn,
   * @example <caption>Convert a user's username to upper case</caption>
   * instance.updateAttributes({
   *   username: self.sequelize.fn('upper', self.sequelize.col('username'))
   * })
   */
  public static fn(fn) {
    return new AllUtils.Fn(fn, Utils.sliceArgs(arguments, 1));
  }

  /**
   * Creates an object which represents a column in the DB, this allows referencing another column in your query. This is often useful in conjunction with `sequelize.fn`, since raw string arguments to fn will be escaped.
   * @see {@link Sequelize#fn}
   *
   * @method col
   * @param col The name of the column
   * @since v2.0.0-dev3
   * @memberof Sequelize
   * @returns Sequelize.col,
   */
  public static col(col) {
    return new AllUtils.Col(col);
  }

  /**
   * Creates an object representing a call to the cast function.
   *
   * @method cast
   * @param val The value to cast
   * @param type The type to cast it to
   * @since v2.0.0-dev3
   * @memberof Sequelize
   * @returns Sequelize.cast,
   */
  public static cast(val, type) {
    return new AllUtils.Cast(val, type);
  }

  /**
   * Creates an object representing a literal, i.e. something that will not be escaped.
   *
   * @method literal
   * @param val
   * @alias asIs
   * @since v2.0.0-dev3
   * @memberof Sequelize
   * @returns Sequelize.literal,
   */
  public static literal(val) {
    return new AllUtils.Literal(val);
  }

  /**
   * An AND query
   * @see {@link Model.findAll}
   *
   * @method and
   * @param args Each argument will be joined by AND
   * @since v2.0.0-dev3
   * @memberof Sequelize
   * @returns Sequelize.and,
   */
  public static and() {
    return { [Op.and]: Utils.sliceArgs(arguments) };
  }

  /**
   * An OR query
   * @see {@link Model.findAll}
   *
   * @method or
   * @param args Each argument will be joined by OR
   * @since v2.0.0-dev3
   * @memberof Sequelize
   * @returns Sequelize.or,
   */
  public static or() {
    return { [Op.or]: Utils.sliceArgs(arguments) };
  }

  /**
   * Creates an object representing nested where conditions for postgres/sqlite/mysql json data-type.
   * @see {@link Model#findAll}
   *
   * @method json
   * @param conditions A hash containing strings/numbers or other nested hash, a string using dot notation or a string using postgres/sqlite/mysql json syntax.
   * @param value An optional value to compare against. Produces a string of the form "<json path> = '<value>'".
   * @memberof Sequelize
   * @returns Sequelize.json,
   */
  public static json(conditionsOrPath : string | {}, value? : string|number|boolean) {
    return new AllUtils.Json(conditionsOrPath, value);
  }

  /**
   * A way of specifying attr = condition.
   *
   * The attr can either be an object taken from `Model.rawAttributes` (for example `Model.rawAttributes.id` or `Model.rawAttributes.name`). The
   * attribute should be defined in your model definition. The attribute can also be an object from one of the sequelize utility functions (`sequelize.fn`, `sequelize.col` etc.)
   *
   * For string attributes, use the regular `{ where: { attr: something }}` syntax. If you don't want your string to be escaped, use `sequelize.literal`.
   *
   * @see {@link Model.findAll}
   *
   * @param attr The attribute, which can be either an attribute object from `Model.rawAttributes` or a sequelize object, for example an instance of `sequelize.fn`. For simple string attributes, use the POJO syntax
   * @param comparator = '='
   * @param logic The condition. Can be both a simply type, or a further condition (`or`, `and`, `.literal` etc.)
   * @alias condition
   * @since v2.0.0-dev3
   */
  public static where(attr : {}, comparator : string, logic : string) {
    return new AllUtils.Where(attr, comparator, logic);
  }

  /**
   * Start a transaction. When using transactions, you should pass the transaction in the options argument in order for the query to happen under that transaction
   *
   * ```js
   * sequelize.transaction().then(transaction => {
   *   return User.find(..., {transaction})
   *     .then(user => user.updateAttributes(..., {transaction}))
   *     .then(() => transaction.commit())
   *     .catch(() => transaction.rollback());
   * })
   * ```
   *
   * A syntax for automatically committing or rolling back based on the promise chain resolution is also supported:
   *
   * ```js
   * sequelize.transaction(transaction => { // Note that we use a callback rather than a promise.then()
   *   return User.find(..., {transaction})
   *     .then(user => user.updateAttributes(..., {transaction}))
   * }).then(() => {
   *   // Committed
   * }).catch(err => {
   *   // Rolled back
   *   console.error(err);
   * });
   * ```
   *
   * If you have [CLS](https://github.com/othiym23/node-continuation-local-storage) enabled, the transaction will automatically be passed to any query that runs within the callback.
   * To enable CLS, add it do your project, create a namespace and set it on the sequelize constructor:
   *
   * ```js
   * import * as cls from 'continuation-local-storage';
   * const ns = cls.createNamespace('....');
   * import {Sequelize} from 'sequelize';
   * Sequelize.useCLS(ns);
   * ```
   * Note, that CLS is enabled for all sequelize instances, and all instances will share the same namespace
   *
   * @see {@link Transaction}
   * @param options = {}
   * @param autoCallback : Function. The callback is called with the transaction object, and should return a promise. If the promise is resolved, the transaction commits; if the promise rejects, the transaction rolls back
   * @returns Promise,
   */
  public transaction(options : {
    autocommit? : boolean,
    /** = 'DEFERRED' See `Sequelize.Transaction.TYPES` for possible options. Sqlite only. */
    type? : string,
    /** See `Sequelize.Transaction.ISOLATION_LEVELS` for possible options */
    isolationLevel? : string,
    /** = false A function that gets executed while running the query to log the sql. */
    logging? : boolean | any,
    /** A hash of search attributes. */
    where? : {}
  }, autoCallback? : any) {
    if (typeof options === 'function') {
      autoCallback = options;
      options = undefined;
    }

    const transaction = new Transaction(this, options);

    if (!autoCallback) {
      return transaction.prepareEnvironment(false).return(transaction);
    }

    // autoCallback provided
    return Sequelize._clsRun(() => {
      return transaction.prepareEnvironment(null)
        .then(() => autoCallback(transaction))
        .tap(() => transaction.commit())
        .catch(err => {
          // Rollback transaction if not already finished (commit, rollback, etc)
          // and reject with original error (ignore any error in rollback)
          return Promise.try(() => {
            if (!transaction.finished) {
              return transaction.rollback().catch(() => {});
            }
          }).throw(err);
        });
    });
  }

  /**
   * Use CLS with Sequelize.
   * CLS namespace provided is stored as `Sequelize._cls`
   * and bluebird Promise is patched to use the namespace, using `cls-bluebird` module.
   *
   * @param ns   CLS namespace
   * @returns {Object}      Sequelize constructor
   */
  public static useCLS(ns : { bind?, run? }) : any {
    // check `ns` is valid CLS namespace
    if (!ns || typeof ns !== 'object' || typeof ns.bind !== 'function' || typeof ns.run !== 'function') {
      throw new Error('Must provide CLS namespace');
    }

    // save namespace as `Sequelize._cls`
    this._cls = ns;

    // patch bluebird to bind all promise callbacks to CLS namespace
    clsBluebird(ns, Promise);

    // return Sequelize for chaining
    return this;
  }

  /**
   * Run function in CLS context.
   * If no CLS context in use, just runs the function normally
   *
   * @param fn Function to run
   * @returns Return value of function
   * @hidden
   */
  private static _clsRun(fn : any) : any {
    const ns = Sequelize._cls;
    if (!ns) {
      return fn();
    }

    let res;
    ns.run(context => res = fn(context));
    return res;
  }


  public log(arg1?, arg2?, arg3?) {
    let options;
    let args = Utils.sliceArgs(arguments);
    const last = _.last(args);

    if (last && _.isPlainObject(last) && last.hasOwnProperty('logging')) {
      options = last;

      // remove options from set of logged arguments if options.logging is equal to console.log
      if (options.logging === console.log) {
        args.splice(args.length - 1, 1);
      }
    } else {
      options = this.options;
    }

    if (options.logging) {
      if (options.logging === true) {
        Utils.deprecate('The logging-option should be either a function or false. Default: console.log');
        options.logging = console.log;
      }

      // second argument is sql-timings, when benchmarking option enabled
      if ((this.options.benchmark || options.benchmark) && options.logging === console.log) {
        args = [args[0] + ' Elapsed time: ' + args[1] + 'ms'];
      }

      options.logging.apply(null, args);
    }
  }

  /**
   * Close all connections used by this sequelize instance, and free all references so the instance can be garbage collected.
   *
   * Normally this is done on process exit, so you only need to call this method if you are creating multiple instances, and want
   * to garbage collect some of them.
   */
  public close() : Promise<any> {
    return this.connectionManager.close();
  }

  public normalizeDataType(Type : any) : any {
    let type = typeof Type === 'function' ? new Type() : Type;
    const dialectTypes = this.dialect.DataTypes || {};

    if (dialectTypes[type.key]) {
      type = dialectTypes[type.key].extend(type);
    }

    if (type instanceof DataTypes.ARRAY && dialectTypes[type.type.key]) {
      type.type = dialectTypes[type.type.key].extend(type.type);
    }
    return type;
  }
  public normalizeAttribute(attribute : { type?, defaultValue?, values? }) {
    if (!_.isPlainObject(attribute)) {
      attribute = { type: attribute };
    }

    if (!attribute.type) {
      return attribute;
    }

    attribute.type = this.normalizeDataType(attribute.type);

    if (attribute.hasOwnProperty('defaultValue')) {
      if (typeof attribute.defaultValue === 'function' && (
        attribute.defaultValue === DataTypes.NOW ||
          attribute.defaultValue === DataTypes.UUIDV1 ||
          attribute.defaultValue === DataTypes.UUIDV4
      )) {
        attribute.defaultValue = new attribute.defaultValue();
      }
    }

    if (attribute.type instanceof DataTypes.ENUM) {
      // The ENUM is a special case where the type is an object containing the values
      if (attribute.values) {
        attribute.type.values = attribute.type.options.values = attribute.values;
      } else {
        attribute.values = attribute.type.values;
      }

      if (!attribute.values.length) {
        throw new Error('Values for ENUM have not been defined.');
      }
    }

    return attribute;
  }

  public static runHooks(hooks, instance? : Model | Model[] | {}, options? : {}) : any {
    throw new Error('runHooks not implemented');
  }
  public runHooks = Sequelize.runHooks;
}

// Aliases
Sequelize.prototype.fn = Sequelize.fn;
Sequelize.prototype.col = Sequelize.col;
Sequelize.prototype.cast = Sequelize.cast;
Sequelize.prototype.literal = Sequelize.asIs = Sequelize.prototype.asIs = Sequelize.literal;
Sequelize.prototype.and = Sequelize.and;
Sequelize.prototype.or = Sequelize.or;
Sequelize.prototype.json = Sequelize.json;
Sequelize.prototype.where = Sequelize.condition = Sequelize.prototype.condition = Sequelize.where;
Sequelize.prototype.validate = Sequelize.prototype.authenticate;

/**
 * Sequelize version number.
 */
Sequelize.version = require('../../package.json').version;

Sequelize.options = {hooks: {}};

/**
 * A reference to Sequelize constructor from sequelize. Useful for accessing DataTypes, Errors etc.
 * @see {@link Sequelize}
 */
Sequelize.prototype.Sequelize = Sequelize;

/**
 * @private
 */
Sequelize.prototype.Utils = Sequelize.Utils = Utils;

Sequelize.prototype.AllUtils = Sequelize.AllUtils = AllUtils;

/**
 * A handy reference to the bluebird Promise class
 */
Sequelize.prototype.Promise = Sequelize.Promise = Promise;

/**
 * Available query types for use with `sequelize.query`
 * @see {@link QueryTypes}
 */
Sequelize.prototype.QueryTypes = Sequelize.QueryTypes = QueryTypes;


/**
 * Operators symbols to be used for querying data
 * @see  {@link Operators}
 */
Sequelize.prototype.Op = Sequelize.Op = Op;

/**
 * Exposes the validator.js object, so you can extend it with custom validation functions. The validator is exposed both on the instance, and on the constructor.
 * @see https://github.com/chriso/validator.js
 */
Sequelize.prototype.Validator = Sequelize.Validator = Validator;

Sequelize.prototype.Model = Sequelize.Model = Model;

Sequelize.DataTypes = DataTypes;
Object.keys(DataTypes).forEach(dataType => {
  Sequelize[dataType] = DataTypes[dataType];
});

/**
 * A reference to the sequelize transaction class. Use this to access isolationLevels and types when creating a transaction
 * @see {@link Transaction}
 * @see {@link Sequelize.transaction}
 */
Sequelize.prototype.Transaction = Sequelize.Transaction = Transaction;

/**
 * A reference to the deferrable collection. Use this to access the different deferrable options.
 * @see {@link Transaction.Deferrable}
 * @see {@link Sequelize#transaction}
 */
Sequelize.prototype.Deferrable = Sequelize.Deferrable = Deferrable;

/**
 * A reference to the sequelize association class.
 * @see {@link Association}
 */
Sequelize.prototype.Association = Sequelize.Association = Association;

/**
 * Provide alternative version of `inflection` module to be used by `Utils.pluralize` etc.
 * @param _inflection - `inflection` module
 */
// Sequelize.useInflection = Utils._useInflection;

/**
 * Allow hooks to be defined on Sequelize + on sequelize instance as universal hooks to run on all models
 * and on Sequelize/sequelize methods e.g. Sequelize(), Sequelize#define()
 */
Hooks.applyTo(Sequelize);
Hooks.applyTo(Sequelize.prototype);

/**
 * Expose various errors available
 */
Sequelize.prototype.Error = Sequelize.Error = sequelizeErrors.BaseError;

for (const error of Object.keys(sequelizeErrors)) {
  if (sequelizeErrors[error] !== sequelizeErrors.BaseError) {
    Sequelize.prototype[error] = Sequelize[error] = sequelizeErrors[error];
  }
}
