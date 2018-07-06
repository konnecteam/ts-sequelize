'use strict';

import * as _ from 'lodash';
import { Sequelize } from '..';
import DataTypes from './data-types';
import { AbstractQueryGenerator } from './dialects/abstract/abstract-query-generator';
import { OracleQuery } from './dialects/oracle/oracle-query';
import { PostgresConnectionManager } from './dialects/postgres/postgres-connection-manager';
import { PostgresQueryGenerator } from './dialects/postgres/postgres-query-generator';
import { Model } from './model';
import { IInclude } from './model/iinclude';
import Op from './operators';
import Promise from './promise';
import { QueryTypes } from './query-types';
import { Transaction } from './transaction';
import { Utils } from './utils';

/**
 * The interface that Sequelize uses to talk to all databases
 *
 * @class QueryInterface
 */
export abstract class AbstractQueryInterface {
  public sequelize : Sequelize;
  public QueryGenerator : AbstractQueryGenerator;

  constructor(sequelize : Sequelize) {
    this.sequelize = sequelize;
    this.QueryGenerator = this.sequelize.dialect.QueryGenerator;
  }

  /**
   * Create a schema
   *
   * @param schema Schema name to create
   * @param options Query options
   */
  public createSchema(schema : string, options : {}) : Promise<any> {
    options = options || {};
    const sql = this.QueryGenerator.createSchema(schema);
    return this.sequelize.query(sql, options);
  }

  /**
   * Drop a schema
   *
   * @param schema Schema name to create
   * @param options Query options
   */
  public dropSchema(schema : string, options? : {}) : Promise<any> {
    options = options || {};
    const sql = this.QueryGenerator.dropSchema(schema);
    return this.sequelize.query(sql, options);
  }

  /**
   * Drop all schemas
   *
   * @param options Query options
   */
  public dropAllSchemas(options : {}) : Promise<any> {
    options = options || {};

    if (!this.QueryGenerator._dialect.supports.schemas) {
      return this.sequelize.drop(options);
    } else {
      return this.showAllSchemas(options).map(schemaName => this.dropSchema(schemaName, options));
    }
  }

  /**
   * Show all schemas
   *
   * @param options Query options
   *
   * @returns Promise<Array>,
   */
  public showAllSchemas(options : {}) {
    options = _.assign({}, options, {
      raw: true,
      type: this.sequelize.QueryTypes.SELECT
    });

    const showSchemasSql = this.QueryGenerator.showSchemasQuery();

    return this.sequelize.query(showSchemasSql, options).then(schemaNames => _.flatten(
      _.map(schemaNames, value => value.schema_name ? value.schema_name : value)
    ));
  }

  /**
   * Returns database version
   *
   * @param options Query options
   */
  public databaseVersion(options : {
    /** Query type */
    type? : any }) : Promise<any> {
    return this.sequelize.query(
      this.QueryGenerator.versionQuery(),
      _.assign({}, options, { type: QueryTypes.VERSION })
    );
  }

  /**
   * Create a table with given set of attributes
   *
   * ```js
   * queryInterface.createTable(
   *   'nameOfTheNewTable',
   *   {
   *     id: {
   *       type: Sequelize.INTEGER,
   *       primaryKey: true,
   *       autoIncrement: true
   *     },
   *     createdAt: {
   *       type: Sequelize.DATE
   *     },
   *     updatedAt: {
   *       type: Sequelize.DATE
   *     },
   *     attr1: new DataTypes.STRING(),
   *     attr2: Sequelize.INTEGER,
   *     attr3: {
   *       type: Sequelize.BOOLEAN,
   *       defaultValue: false,
   *       allowNull: false
   *     },
   *     //foreign key usage
   *     attr4: {
   *       type: Sequelize.INTEGER,
   *       references: {
   *         model: 'another_table_name',
   *         key: 'id'
   *       },
   *       onUpdate: 'cascade',
   *       onDelete: 'cascade'
   *     }
   *   },
   *   {
   *     engine: 'MYISAM',    // default: 'InnoDB'
   *     charset: 'latin1',   // default: null
   *     schema: 'public'     // default: public, PostgreSQL only.
   *   }
   * )
   * ```
   *
   * @param tableName  Name of table to create
   * @param attributes List of table attributes to create
   */
  public createTable(tableName : string, attributes : any, options : {
    after? : string,
    before? : string,
    benchmark? : boolean,
    databaseVersion? : number,
    /** = {}, Define the default search scope to use for this model. Scopes have the same form as the options passed to find / findAll */
    defaultScope? : {},
    /** = {}, Default options for model definitions. See sequelize.define for options */
    define? : {},
    /** The dialect of the database you are connecting to. One of mysql, postgres, sqlite, oracle and mssql. */
    dialect? : string,
    /** = null, If specified, load the dialect library from this path. For example, if you want to use pg.js instead of pg when connecting to a pg database, you should specify 'pg.js' here */
    dialectModulePath? : string,
    /** An object of additional options, which are passed directly to the connection library */
    dialectOptions? : {},
    force? : boolean,
    /** = false If freezeTableName is true, sequelize will not try to alter the model name to get the table name. Otherwise, the model name will be pluralized */
    freezeTableName? : boolean,
    /** An object of hook function that are called before and after certain lifecycle events */
    hooks? : boolean,
    /** = 'localhost', The host of the relational database. */
    host? : string,
    indexes? : any[],
    /** Set the default transaction isolation level */
    isolationLevel? : string,
    /** A function that logs sql queries, or false for no logging */
    logging? : boolean | any,
    /** An object with two attributes, `singular` and `plural`, which are used when this model is associated to others. */
    name? : {
      /** = Utils.pluralize(modelName) */
      plural? : string,
      /** = Utils.singularize(modelName) */
      singular? : string
    },
    /** = false, A flag that defines if native library shall be used or not. Currently only has an effect for postgres */
    native? : boolean,
    /** = false, A flag that defines if null values should be passed to SQL queries or not. */
    omitNull? : boolean,
    /** = true, String based operator alias, default value is true which will enable all operators alias. Pass object to limit set of aliased operators or false to disable completely. */
    operatorsAliases? : boolean,
    /** = false, Calling `destroy` will not delete the model, but instead set a `deletedAt` timestamp if this is true. Needs `timestamps=true` to work */
    paranoid? : boolean,
    /** sequelize connection pool configuration */
    pool? : {},
    /** The port of the relational database. */
    port? : number,
    /** = 'tcp', The protocol of the relational database. */
    protocol? : string,
    query? : {},
    /** = true, Set to `false` to make table names and attributes case-insensitive on Postgres and skip double quoting of them.  WARNING: Setting this to false may expose vulnerabilities and is not recommended! */
    quoteIdentifiers? : boolean,
    /** Error if no result found */
    rejectOnEmpty? : boolean,
    /** = false, Use read / write replication. To enable replication, pass an object, with two properties, read and write. */
    replication? : boolean,
    /** Set of flags that control when a query is automatically retried. */
    retry? : { max? : number, match? : any[] },
    /** The schema that the tables should be created in. This can be overriden for each table in sequelize.define */
    schema? : string,
    schemaDelimiter? : string,
    scopes? : any[],
    sequelize? : Sequelize,
    ssl? : boolean,
    storage? : string,
    /** If false do not prepend the query with the search_path (Postgres only) */
    supportsSearchPath? : boolean,
    /** = {}, Default options for sequelize.sync */
    sync? : {},
    /** = true Adds createdAt and updatedAt timestamps to the model. */
    timestamps? : boolean,
    /** The timezone used when converting a date from the database into a JavaScript date. */
    timezone? : string,
    transactionType? : string,
    typeValidation? : boolean,
    /** = false Converts all camelCased columns to underscored if true. Will not affect timestamp fields named explicitly by model options and will not affect fields with explicitly set `field` option */
    underscored? : boolean,
    /** = false Converts camelCased model names to underscored table names if true. Will not change model name if freezeTableName is set to true */
    underscoredAll? : boolean,
    uniqueKeys? : {},
    validate? : {},
    whereCollection? : {}
  }, model : typeof Model) : Promise<any> {
    const keys = Object.keys(attributes);
    const keyLen = keys.length;
    let sql = '';
    let i = 0;

    options = _.clone(options) || {};

    attributes = _.mapValues(attributes, attribute => {
      if (!_.isPlainObject(attribute)) {
        attribute = { type: attribute, allowNull: true };
      }

      attribute = this.sequelize.normalizeAttribute(attribute);

      return attribute;
    });

    // Postgres requires a special SQL command for enums
    if (this.sequelize.options.dialect === 'postgres') {
      const mainPromises = [];

      for (i = 0; i < keyLen; i++) {
        const attribute = attributes[keys[i]];
        const type = attribute.type;

        if (
          type instanceof DataTypes.ENUM ||
          (type instanceof DataTypes.ARRAY && type.type instanceof DataTypes.ENUM) //ARRAY sub type is ENUM
        ) {
          sql = (this.QueryGenerator as PostgresQueryGenerator).pgListEnums(tableName, attribute.field || keys[i], options);
          mainPromises.push(this.sequelize.query(
            sql,
            _.assign({}, options, { plain: true, raw: true, type: QueryTypes.SELECT })
          ));
        }
      }

      return Promise.all(mainPromises).then(results => {
        const promises = [];
        let enumIdx = 0;

        for (i = 0; i < keyLen; i++) {
          const attribute = attributes[keys[i]];
          const type = attribute.type;
          const enumType = type.type || type;

          if (
            type instanceof DataTypes.ENUM ||
            (type instanceof DataTypes.ARRAY && enumType instanceof DataTypes.ENUM) //ARRAY sub type is ENUM
          ) {
            // If the enum type doesn't exist then create it
            if (!results[enumIdx]) {
              sql = (this.QueryGenerator as PostgresQueryGenerator).pgEnum(tableName, attribute.field || keys[i], enumType, options);
              promises.push(this.sequelize.query(
                sql,
                _.assign({}, options, { raw: true })
              ));
            } else if (!!results[enumIdx] && !!model) {
              const enumVals = (this.QueryGenerator as PostgresQueryGenerator).fromArray(results[enumIdx].enum_value);
              const vals = enumType.values;

              vals.forEach((value, idx) => {
                // reset out after/before options since it's for every enum value
                const valueOptions = _.clone(options);
                valueOptions.before = null;
                valueOptions.after = null;

                if (enumVals.indexOf(value) === -1) {
                  if (vals[idx + 1]) {
                    valueOptions.before = vals[idx + 1];
                  } else if (vals[idx - 1]) {
                    valueOptions.after = vals[idx - 1];
                  }
                  valueOptions.supportsSearchPath = false;
                  promises.push(this.sequelize.query((this.QueryGenerator as PostgresQueryGenerator).pgEnumAdd(tableName, attribute.field || keys[i], value, valueOptions), valueOptions));
                }
              });
              enumIdx++;
            }
          }
        }

        if (!(tableName as any).schema &&
          (options.schema || !!model && model._schema)) {
          tableName = this.QueryGenerator.addSchema({
            tableName,
            _schema: !!model && model._schema || options.schema
          });
        }

        attributes = this.QueryGenerator.attributesToSQL(attributes, {
          context: 'createTable'
        });
        sql = this.QueryGenerator.createTableQuery(tableName, attributes, options);

        return Promise.all(promises)
          .tap(() => {
            // If ENUM processed, then refresh OIDs
            if (promises.length) {
              return (this.sequelize.dialect.connectionManager as PostgresConnectionManager)._refreshDynamicOIDs();
            }
          })
          .then(() => {
            return this.sequelize.query(sql, options);
          });
      });
    } else {
      if (!(tableName as any).schema &&
        (options.schema || !!model && model._schema)) {
        tableName = this.QueryGenerator.addSchema({
          tableName,
          _schema: !!model && model._schema || options.schema
        });
      }

      attributes = this.QueryGenerator.attributesToSQL(attributes, {
        context: 'createTable'
      });
      sql = this.QueryGenerator.createTableQuery(tableName, attributes, options);

      return this.sequelize.query(sql, options);
    }
  }

  /**
   * Drops a table from database
   *
   * @param tableName Table name to drop
   * @param options   Query options
   */
  public dropTable(tableName : string, options : {
    benchmarmark? : boolean,
    /** = false, Also drop all objects depending on this table, such as views. Only works in postgres */
    cascade? : boolean,
    databaseVersion? : number,
    /** = {}, Define the default search scope to use for this model. Scopes have the same form as the options passed to find / findAll */
    defaultScope? : {},
    /** = {}, Default options for model definitions. See sequelize.define for options */
    define? : {},
    /** The dialect of the database you are connecting to. One of mysql, postgres, sqlite, oracle and mssql. */
    dialect? : string,
    /** = null, If specified, load the dialect library from this path. For example, if you want to use pg.js instead of pg when connecting to a pg database, you should specify 'pg.js' here */
    dialectModulePath? : string,
    /** An object of additional options, which are passed directly to the connection library */
    dialectOptions? : {},
    force? : boolean,
    /** = false If freezeTableName is true, sequelize will not try to alter the model name to get the table name. Otherwise, the model name will be pluralized */
    freezeTableName? : boolean,
    /** An object of hook function that are called before and after certain lifecycle events */
    hooks? : boolean,
    /** = 'localhost', The host of the relational database. */
    host? : string,
    indexes? : any[],
    /** Set the default transaction isolation level */
    isolationLevel? : string,
    /** A function that logs sql queries, or false for no logging */
    logging? : boolean | any,
    /** An object with two attributes, `singular` and `plural`, which are used when this model is associated to others. */
    name? : {
      /** = Utils.pluralize(modelName) */
      plural? : string,
      /** = Utils.singularize(modelName) */
      singular? : string
    },
    /** = false, A flag that defines if native library shall be used or not. Currently only has an effect for postgres */
    native? : boolean,
    /** = false, A flag that defines if null values should be passed to SQL queries or not. */
    omitNull? : boolean,
    /** = true, String based operator alias, default value is true which will enable all operators alias. Pass object to limit set of aliased operators or false to disable completely. */
    operatorsAliases? : boolean,
    /** = false, Calling `destroy` will not delete the model, but instead set a `deletedAt` timestamp if this is true. Needs `timestamps=true` to work */
    paranoid? : boolean,
    /** sequelize connection pool configuration */
    pool? : {},
    /** The port of the relational database. */
    port? : number,
    /** = 'tcp', The protocol of the relational database. */
    protocol? : string,
    query? : {},
    /** = true, Set to `false` to make table names and attributes case-insensitive on Postgres and skip double quoting of them.  WARNING: Setting this to false may expose vulnerabilities and is not recommended! */
    quoteIdentifiers? : boolean,
    /** Error if no result found */
    rejectOnEmpty? : boolean,
    /** = false, Use read / write replication. To enable replication, pass an object, with two properties, read and write. */
    replication? : boolean,
    /** Set of flags that control when a query is automatically retried. */
    retry? : { max? : number, match? : any[] },
    /** The schema that the tables should be created in. This can be overriden for each table in sequelize.define */
    schema? : string,
    schemaDelimiter? : string,
    scopes? : any[],
    sequelize? : Sequelize,
    ssl? : boolean,
    storage? : string,
    /** If false do not prepend the query with the search_path (Postgres only) */
    supportsSearchPath? : boolean,
    /** = {}, Default options for sequelize.sync */
    sync? : {},
    /** = true Adds createdAt and updatedAt timestamps to the model. */
    timestamps? : boolean,
    /** The timezone used when converting a date from the database into a JavaScript date. */
    timezone? : string,
    transactionType? : string,
    typeValidation? : boolean,
    /** = false Converts all camelCased columns to underscored if true. Will not affect timestamp fields named explicitly by model options and will not affect fields with explicitly set `field` option */
    underscored? : boolean,
    /** = false Converts camelCased model names to underscored table names if true. Will not change model name if freezeTableName is set to true */
    underscoredAll? : boolean,
    uniqueKeys? : {},
    validate? : {},
    whereCollection? : {}
  }) : Promise<any> {
    // if we're forcing we should be cascading unless explicitly stated otherwise
    options = _.clone(options) || {};
    options.cascade = options.cascade || options.force || false;

    let sql = this.QueryGenerator.dropTableQuery(tableName, options);

    return this.sequelize.query(sql, options).then(() => {
      const promises = [];

      // Since postgres has a special case for enums, we should drop the related
      // enum type within the table and attribute
      if (this.sequelize.options.dialect === 'postgres') {
        const instanceTable = this.sequelize.modelManager.getModel(tableName, { attribute: 'tableName' });

        if (instanceTable) {
          const getTableName = (!options || !options.schema || options.schema === 'public' ? '' : options.schema + '_') + tableName;

          const keys = Object.keys(instanceTable.rawAttributes);
          const keyLen = keys.length;

          for (let i = 0; i < keyLen; i++) {
            if (instanceTable.rawAttributes[keys[i]].type instanceof DataTypes.ENUM) {
              sql = (this.QueryGenerator as PostgresQueryGenerator).pgEnumDrop(getTableName, keys[i]);
              options.supportsSearchPath = false;
              promises.push(this.sequelize.query(sql, _.assign({}, options, { raw: true })));
            }
          }
        }
      }

      return Promise.all(promises).get(0);
    });
  }

  /**
   * Drop all tables from database
   */
  public dropAllTables(options : {
    /** Return raw result. */
    raw? : boolean,
    /** List of table to skip */
    skip? : any[]
  }) : Promise<any> {
    options = options || {};
    const skip = options.skip || [];

    const dropAllTables = tableNames => Promise.each(tableNames, tableName => {
      // if tableName is not in the Array of tables names then dont drop it
      if (skip.indexOf(tableName.tableName || tableName) === -1) {
        return this.dropTable(tableName, _.assign({}, options, { cascade: true }) );
      }
    });

    return this.showAllTables(options).then(tableNames => {
      if (this.sequelize.options.dialect === 'sqlite') {
        return this.sequelize.query('PRAGMA foreign_keys;', options).then(result => {
          const foreignKeysAreEnabled = result.foreign_keys === 1;

          if (foreignKeysAreEnabled) {
            return this.sequelize.query('PRAGMA foreign_keys = OFF', options)
              .then(() => dropAllTables(tableNames))
              .then(() => this.sequelize.query('PRAGMA foreign_keys = ON', options));
          } else {
            return dropAllTables(tableNames);
          }
        });
      } else {
        return this.getForeignKeysForTables(tableNames, options).then(foreignKeys => {
          const promises = [];

          tableNames.forEach(tableName => {
            let normalizedTableName = tableName;
            if (_.isObject(tableName)) {
              normalizedTableName = tableName.schema + '.' + tableName.tableName;
            }

            foreignKeys[normalizedTableName].forEach(foreignKey => {
              const sql = this.QueryGenerator.dropForeignKeyQuery(tableName, foreignKey);
              promises.push(this.sequelize.query(sql, options));
            });
          });

          return Promise.all(promises).then(() => dropAllTables(tableNames));
        });
      }
    });
  }

  /**
   * Drop all enums from database, Postgres Only
   * @param options Query options
   */
  public dropAllEnums(options : {}) : Promise<any> {
    if (this.sequelize.getDialect() !== 'postgres') {
      return Promise.resolve();
    }

    options = options || {};

    return this.pgListEnums(null, options).map(result => this.sequelize.query(
      (this.QueryGenerator as PostgresQueryGenerator).pgEnumDrop(null, null, (this.QueryGenerator as PostgresQueryGenerator).pgEscapeAndQuote(result.enum_name)),
      _.assign({}, options, { raw: true })
    ));
  }


  /**
   * List all enums, Postgres Only
   *
   * @param tableName  Table whose enum to list
   * @param options    Query options
   *
   * @returns Promise,
   */
  public pgListEnums(tableName : string, options : {}) {
    options = options || {};
    const sql = (this.QueryGenerator as PostgresQueryGenerator).pgListEnums(tableName);
    return this.sequelize.query(sql, _.assign({}, options, { plain: false, raw: true, type: QueryTypes.SELECT }));
  }


  /**
   * Rename a table
   *
   * @param before Current name of table
   * @param after New name from table
   * @param options Query options
   */
  public renameTable(before : string, after : string, options : {}) : Promise<any> {
    options = options || {};
    const sql = this.QueryGenerator.renameTableQuery(before, after);
    return this.sequelize.query(sql, options);
  }

  /**
   * Get all tables in current database
   *
   * @param options Query options
   * @returns Promise<Array>,
   */
  public showAllTables(options : {
    /** = true, Run query in raw mode */
    raw? : boolean,
    /** = QueryType.SHOWTABLE :QueryType */
    type? : string
  }) {
    options = _.assign({}, options, {
      raw: true,
      type: QueryTypes.SHOWTABLES
    });

    const showTablesSql = this.QueryGenerator.showTablesQuery();
    return this.sequelize.query(showTablesSql, options).then(tableNames => _.flatten(tableNames));
  }

  /**
   * Describe a table structure
   *
   * This method returns an array of hashes containing information about all attributes in the table.
   *
   * ```js
   * {
   *    name: {
   *      type:         'VARCHAR(255)', // this will be 'CHARACTER VARYING' for pg!
   *      allowNull:    true,
   *      defaultValue: null
   *    },
   *    isBetaMember: {
   *      type:         'TINYINT(1)', // this will be 'BOOLEAN' for pg!
   *      allowNull:    false,
   *      defaultValue: false
   *    }
   * }
   * ```
   * @param options Query options
   */
  public describeTable(tableName : any, options? : string | { schema? : string, schemaDelimiter? : string}) : Promise<any> {
    let schema = null;
    let schemaDelimiter = null;

    if (typeof options === 'string') {
      schema = options;
    } else if (typeof options === 'object' && options !== null) {
      schema = options.schema || null;
      schemaDelimiter = options.schemaDelimiter || null;
    }

    if (typeof tableName === 'object' && tableName !== null) {
      schema = tableName.schema;
      tableName = tableName.tableName;
    }

    const sql = this.QueryGenerator.describeTableQuery(tableName, schema, schemaDelimiter);

    if (this.sequelize.options.dialect === 'oracle') {
      options =  (this as any).addOptionsForDescribe(tableName, options);
    }

    return this.sequelize.query(
      sql,
      _.assign({}, options, { type: QueryTypes.DESCRIBE })
    ).then(data => {
      // If no data is returned from the query, then the table name may be wrong.
      // Query generators that use information_schema for retrieving table info will just return an empty result set,
      // it will not throw an error like built-ins do (e.g. DESCRIBE on MySql).
      if (_.isEmpty(data)) {
        return Promise.reject('No description found for "' + tableName + '" table. Check the table name and schema; remember, they _are_ case sensitive.');
      } else {
        return Promise.resolve(data);
      }
    });
  }

  /**
   * Add a new column into a table
   *
   * ```js
   * queryInterface.addColumn('tableA', 'columnC', new DataTypes.STRING(), {
   *    after: 'columnB' // after option is only supported by MySQL
   * });
   * ```
   *
   * @param table Table to add column to
   * @param key Column name
   * @param attribute Attribute definition
   * @param options Query options
   */
  public addColumn(table : string, key : string, attribute : {}, options? : {}) : Promise<any> {
    if (!table || !key || !attribute) {
      throw new Error('addColumn takes atleast 3 arguments (table, attribute name, attribute definition)');
    }

    options = options || {};
    attribute = this.sequelize.normalizeAttribute(attribute);
    return this.sequelize.query(this.QueryGenerator.addColumnQuery(table, key, attribute), options);
  }

  /**
   * Remove a column from table
   *
   * @param tableName Table to remove column from
   * @param attributeName Columns name to remove
   * @param options Query options
   */
  public removeColumn(tableName : string, attributeName : string, options : {}) : Promise<any> {
    options = options || {};
    return this.sequelize.query(this.QueryGenerator.removeColumnQuery(tableName, attributeName), options);
  }

  /**
   * Change a column definition
   *
   * @param tableName Table name to change from
   * @param attributeName Column name
   * @param dataTypeOrOptions Attribute definition for new column
   * @param options Query options
   */
  public changeColumn(tableName : string, attributeName : string, dataTypeOrOptions : any, options? : {}) : Promise<any> {
    const attributes = {};
    options = options || {};

    if (_.values(DataTypes).indexOf(dataTypeOrOptions) > -1) {
      attributes[attributeName] = { type: dataTypeOrOptions, allowNull: true };
    } else {
      attributes[attributeName] = dataTypeOrOptions;
    }

    attributes[attributeName].type = this.sequelize.normalizeDataType(attributes[attributeName].type);

    const query = this.QueryGenerator.attributesToSQL(attributes);
    const sql = this.QueryGenerator.changeColumnQuery(tableName, query);

    return this.sequelize.query(sql, options);
  }

  /**
   * Rename a column
   *
   * @param tableName Table name whose column to rename
   * @param attrNameBefore Current column name
   * @param attrNameAfter New column name
   * @param options Query option
   */
  public renameColumn(tableName : string, attrNameBefore : string, attrNameAfter : string, options : {}) : Promise<any> {
    options = options || {};
    return this.describeTable(tableName, options).then(data => {
      if (!data[attrNameBefore]) {
        throw new Error('Table ' + tableName + ' doesn\'t have the column ' + attrNameBefore);
      }

      data = data[attrNameBefore] || {};

      const _options = {};

      _options[attrNameAfter] = {
        attribute: attrNameAfter,
        type: data.type,
        allowNull: data.allowNull,
        defaultValue: data.defaultValue
      };

      // fix: a not-null column cannot have null as default value
      if (data.defaultValue === null && !data.allowNull) {
        delete _options[attrNameAfter].defaultValue;
      }
      const sql = this.QueryGenerator.renameColumnQuery(
        tableName,
        attrNameBefore,
        this.QueryGenerator.attributesToSQL(_options)
      );
      return this.sequelize.query(sql, options);
    });
  }

  /**
   * Add index to a column
   *
   * @param tableName Table name to add index on
   */
  public addIndex(tableName : string, attributes : any, options : {
    /** List of attributes to add index on */
    fields? : string[],
    /** Name of the index. Default is <table>_<attr1>_<attr2> */
    name? : string,
    /** Type of index, available options are UNIQUE|FULLTEXT|SPATIAL */
    type? : string,
    /** Create a unique index */
    unique? : boolean,
    /** Useful for GIN indexes */
    using? : string,
    /** Where condition on index, for partial indexes */
    where? : {}
  }, rawTablename? : any) : Promise<any> {
    // Support for passing tableName, attributes, options or tableName, options (with a fields param which is the attributes)
    if (!Array.isArray(attributes)) {
      rawTablename = options;
      options = attributes;
      attributes = options.fields;
    }
    // testhint argsConform.end

    if (!rawTablename) {
      // Map for backwards compat
      rawTablename = tableName;
    }

    options = Utils.cloneDeep(options);
    options.fields = attributes;
    const sql = this.QueryGenerator.addIndexQuery(tableName, options, rawTablename);
    return this.sequelize.query(sql, _.assign({}, options, { supportsSearchPath: false }));
  }

  /**
   * Show indexes on a table
   *
   * @param options Query options
   *
   * @returns Promise<Array>,
   */
  public showIndex(tableName : string, options : {}) {
    const sql = this.QueryGenerator.showIndexesQuery(tableName, options);
    return this.sequelize.query(sql, _.assign({}, options, { type: QueryTypes.SHOWINDEXES }));
  }

  /**
   * return the indexes's name
   */
  public nameIndexes(indexes : any[], rawTablename : string) {
    return this.QueryGenerator.nameIndexes(indexes, rawTablename);
  }

  /**
   * get foreign keys for the tables
   */
  public getForeignKeysForTables(tableNames : any[], options : {}) {
    if (tableNames.length === 0) {
      return Promise.resolve({});
    }

    options = _.assign({}, options || {}, { type: QueryTypes.FOREIGNKEYS });

    return Promise.map(tableNames, tableName =>
      this.sequelize.query(this.QueryGenerator.getForeignKeysQuery(tableName, this.sequelize.config.database), options)
    ).then(results => {
      const result = {};

      tableNames.forEach((tableName, i) => {
        if (_.isObject(tableName)) {
          tableName = tableName.schema + '.' + tableName.tableName;
        }

        result[tableName] = _.isArray(results[i])
          ? results[i].map(r => r.constraint_name)
          : [results[i] && results[i].constraint_name];

        result[tableName] = result[tableName].filter(_.identity);
      });

      return result;
    });
  }

  /**
   * Get foreign key references details for the table.
   *
   * Those details contains constraintSchema, constraintName, constraintCatalog
   * tableCatalog, tableSchema, tableName, columnName,
   * referencedTableCatalog, referencedTableCatalog, referencedTableSchema, referencedTableName, referencedColumnName.
   * Remind: constraint informations won't return if it's sqlite.
   *
   * @param options  Query options
   * @returns {Promise}
   */
  public getForeignKeyReferencesForTable(tableName : string, options? : {}) {
    const queryOptions = Object.assign({}, options, {
      type: QueryTypes.FOREIGNKEYS
    });
    const catalogName = this.sequelize.config.database;
    switch (this.sequelize.options.dialect) {
      case 'postgres': {
        // postgres needs some special treatment as those field names returned are all lowercase
        // in order to keep same result with other dialects.
        const query = (this.QueryGenerator as PostgresQueryGenerator).getForeignKeyReferencesQuery(tableName, catalogName);
        return this.sequelize.query(query, queryOptions)
          .then(result => result.map(Utils.camelizeObjectKeys));
      }
      case 'mssql':
      case 'mysql':
      default: {
        const query = this.QueryGenerator.getForeignKeysQuery(tableName, catalogName);
        return this.sequelize.query(query, queryOptions);
      }
    }
  }

  /**
   * Remove an already existing index from a table
   *
   * @param tableName Table name to drop index from
   * @param indexNameOrAttributes Index name
   * @param options Query options
   *
   * @returns Promise,
   */
  public removeIndex(tableName : string, indexNameOrAttributes : string, options : {}) {
    options = options || {};
    const sql = this.QueryGenerator.removeIndexQuery(tableName, indexNameOrAttributes);
    return this.sequelize.query(sql, options);
  }

  /**
   * Add constraints to table
   *
   * Available constraints:
   * - UNIQUE
   * - DEFAULT (MSSQL only)
   * - CHECK (MySQL - Ignored by the database engine )
   * - FOREIGN KEY
   * - PRIMARY KEY
   *
   * UNIQUE
   * ```js
   * queryInterface.addConstraint('Users', ['email'], {
   *   type: 'unique',
   *   name: 'custom_unique_constraint_name'
   * });
   * ```
   *
   * CHECK
   * ```js
   * queryInterface.addConstraint('Users', ['roles'], {
   *   type: 'check',
   *   where: {
   *      roles: ['user', 'admin', 'moderator', 'guest']
   *   }
   * });
   * ```
   * Default - MSSQL only
   * ```js
   * queryInterface.addConstraint('Users', ['roles'], {
   *    type: 'default',
   *    defaultValue: 'guest'
   * });
   * ```
   *
   * Primary Key
   * ```js
   * queryInterface.addConstraint('Users', ['username'], {
   *    type: 'primary key',
   *    name: 'custom_primary_constraint_name'
   * });
   * ```
   *
   * Foreign Key
   * ```js
   * queryInterface.addConstraint('Posts', ['username'], {
   *   type: 'FOREIGN KEY',
   *   name: 'custom_fkey_constraint_name',
   *   references: { //Required field
   *     table: 'target_table_name',
   *     field: 'target_column_name'
   *   },
   *   onDelete: 'cascade',
   *   onUpdate: 'cascade'
   * });
   * ```
   *
   * @param tableName Table name where you want to add a constraint
   * @param attributes Array of column names to apply the constraint over
   * @param options An object to define the constraint name, type etc
   */
  public addConstraint(tableName : string, attributes : any[], options : {
    /** The value for the default constraint */
    defaultValue? : string,
    fields? : string[],
    /** Name of the constraint. If not specified, sequelize automatically creates a named constraint based on constraint type, table & column names */
    name? : string,
    /** Object specifying target table, column name to create foreign key constraint */
    references? : {
      /** Target table name */
      table? : string,
      /** Target column name */
      field? : string
    }
    /** Type of constraint. One of the values in available constraints(case insensitive) */
    type? : string,
    /** Where clause/expression for the CHECK constraint */
    where? : {}
  }, rawTablename) : Promise<any> {
    if (!Array.isArray(attributes)) {
      rawTablename = options;
      options = attributes;
      attributes = options.fields;
    }

    if (!options.type) {
      throw new Error('Constraint type must be specified through options.type');
    }

    if (!rawTablename) {
      // Map for backwards compat
      rawTablename = tableName;
    }

    options = Utils.cloneDeep(options);
    options.fields = attributes;

    const sql = this.QueryGenerator.addConstraintQuery(tableName, options, rawTablename);
    return this.sequelize.query(sql, options);
  }

  /**
   * show a constraint
   */
  public showConstraint(tableName : string, constraintName : string, options? : {}) {
    const sql = this.QueryGenerator.showConstraintsQuery(tableName, constraintName);
    return this.sequelize.query(sql, Object.assign({}, options, { type: QueryTypes.SHOWCONSTRAINTS }));
  }

  /**
   * remove a constraint
   * @param tableName       Table name to drop constraint from
   * @param constraintName  Constraint name
   * @param options         Query options
   *
   * @returns Promise,
   */
  public removeConstraint(tableName : string, constraintName : string, options? : {}) {
    options = options || {};
    const sql = this.QueryGenerator.removeConstraintQuery(tableName, constraintName);
    return this.sequelize.query(sql, options);
  }

  /**
   * insert
   */
  public insert(instance : Model, tableName : string, values : any, options : {
    fields? : string[],
    hasTrigger? : boolean,
    /** An object of hook function that are called before and after certain lifecycle events */
    hooks? : boolean,
    instance? : Model,
    returning? : boolean,
    type? : string,
    validate? : boolean
  }) {
    options = Utils.cloneDeep(options);
    options.hasTrigger = instance && instance.constructor.options.hasTrigger;
    const sql = this.QueryGenerator.insertQuery(tableName, values, instance && instance.constructor.rawAttributes, options);

    options.type = QueryTypes.INSERT;
    options.instance = instance;

    return this.sequelize.query(sql, options).then(results => {
      if (instance) {
        results[0].isNewRecord = false;
      }
      return results;
    });
  }

  /**
   * upsert
   */
  public upsert(tableName : string, insertValues : any, updateValues : any, where : {}, model : typeof Model, options : {
    /** = false, Pass query execution time in milliseconds as second argument to logging function (options.logging). */
    benchmark? : boolean,
    fields? : any[],
    /** An object of hook function that are called before and after certain lifecycle events */
    hooks? : boolean,
    /** A function that logs sql queries, or false for no logging */
    logging? : boolean | any,
    model? : typeof Model,
    /** Return raw result. */
    raw? : boolean,
    /** = DEFAULT An optional parameter to specify the schema search_path (Postgres only) */
    searchPath? : string,
    /** Transaction to run query under */
    transaction? : Transaction,
    type? : string,
    validate? : boolean
  }) {
    const wheres = [];
    const attributes = Object.keys(insertValues);
    let indexes = [];
    let indexFields;

    options = _.clone(options);

    if (!Utils.isWhereEmpty(where)) {
      wheres.push(where);
    }

    // Lets combine uniquekeys and indexes into one
    indexes = _.map(model.options.uniqueKeys, value => {
      return value.fields;
    });

    Object.keys(model.options.indexes).forEach(key => {
      const value = model.options.indexes[key];
      if (value.unique) {
        // fields in the index may both the strings or objects with an attribute property - lets sanitize that
        indexFields = _.map(value.fields, field => {
          if (_.isPlainObject(field)) {
            return field.attribute;
          }
          return field;
        });
        indexes.push(indexFields);
      }
    });

    for (const index of indexes) {
      if (_.intersection(attributes, index).length === index.length) {
        where = {};
        for (const field of index) {
          where[field] = insertValues[field];
        }
        wheres.push(where);
      }
    }

    where = { [Op.or]: wheres };

    options.type = QueryTypes.UPSERT;
    options.raw = true;

    const sql = this.QueryGenerator.upsertQuery(tableName, insertValues, updateValues, where, model, options);
    return this.sequelize.query(sql, options).then(result => {
      switch (this.sequelize.options.dialect) {
        case 'postgres':
          return [result.created, result.primary_key];

        case 'mssql':
          return [
            result.$action === 'INSERT',
            result[model.primaryKeyField]];

        // MySQL returns 1 for inserted, 2 for updated
        // http://dev.mysql.com/doc/refman/5.0/en/insert-on-duplicate.html.
        case 'mysql':
          return [result === 1, undefined];
        case 'oracle':
          return [result === 1, undefined];

        default:
          return [result, undefined];
      }
    });
  }

  /**
   * Insert records into a table
   *
   * ```js
   * queryInterface.bulkInsert('roles', [{
   *    label: 'user',
   *    createdAt: new Date(),
   *    updatedAt: new Date()
   *  }, {
   *    label: 'admin',
   *    createdAt: new Date(),
   *    updatedAt: new Date()
   *  }]);
   * ```
   *
   * @param tableName Table name to insert record to
   * @param records   List of records to insert
   *
   * @returns Promise,
   */
  public bulkInsert(tableName : string, records : any[], options : {
    /** = false, Pass query execution time in milliseconds as second argument to logging function (options.logging). */
    benchmark? : boolean,
    fields? : string[],
    /** An object of hook function that are called before and after certain lifecycle events */
    hooks? : boolean,
    ignoreDuplicates? : boolean,
    individualHooks? : boolean,
    /** A function that logs sql queries, or false for no logging */
    logging? : boolean | any,
    model? : typeof Model,
    returning? : boolean,
    /** = DEFAULT An optional parameter to specify the schema search_path (Postgres only) */
    searchPath? : string,
    skip? : any,
    /** Transaction to run query under */
    transaction? : Transaction,
    type? : string,
    updateOnDuplicate? : any[],
    validate? : boolean
  }, attributes : any) {
    options = _.clone(options) || {};
    options.type = QueryTypes.INSERT;
    return this.sequelize.query(
      this.QueryGenerator.bulkInsertQuery(tableName, records, options, attributes),
      options
    ).then(results => results[0]);
  }

  /**
   * update
   */
  public update(instance : Model, tableName : string, values : any, identifier : {}, options : {
    allwNull? : string[],
    association? : boolean,
    fields? : string[],
    hasTrigger? : boolean,
    /** An object of hook function that are called before and after certain lifecycle events */
    hooks? : boolean,
    instance? : Model,
    returning? : boolean,
    type? : string,
    validate? : boolean
  }) {
    options = _.clone(options || {});
    options.hasTrigger = !!(instance && instance._modelOptions && instance._modelOptions.hasTrigger);

    const sql = this.QueryGenerator.updateQuery(tableName, values, identifier, options, instance.constructor.rawAttributes);

    options.type = QueryTypes.UPDATE;

    options.instance = instance;
    return this.sequelize.query(sql, options);
  }

  /**
   * update record of a table
   */
  public bulkUpdate(tableName : any, values : any, identifier : {}, options : {
    fields? : string[],
    force? : boolean,
    hasTrigger? : boolean,
    /** An object of hook function that are called before and after certain lifecycle events */
    hooks? : boolean,
    individualHooks? : boolean,
    model? : typeof Model,
    returning? : boolean,
    sideEffects? : boolean,
    skip? : string[],
    type? : string,
    validate? : boolean,
    /** A hash of search attributes. */
    where? : {}
  }, attributes : any) {
    options = Utils.cloneDeep(options);
    if (typeof identifier === 'object') {
      identifier = Utils.cloneDeep(identifier);
    }

    const sql = this.QueryGenerator.updateQuery(tableName, values, identifier, options, attributes);
    const table = _.isObject(tableName) ? tableName : { tableName };
    const model = _.find(this.sequelize.modelManager.models, { tableName: table.tableName });

    options.model = model;
    return this.sequelize.query(sql, options);
  }

  /**
   * delete
   */
  public delete(instance : Model, tableName : string, identifier : {}, options : {
    force? : boolean,
    /** An object of hook function that are called before and after certain lifecycle events */
    hooks? : boolean,
    instance? : Model,
    /** The maximum count you want to get. */
    limit? : number,
    type? : string
  }) {
    const cascades = [];
    const sql = this.QueryGenerator.deleteQuery(tableName, identifier, {}, instance.constructor);

    options = _.clone(options) || {};

    // Check for a restrict field
    if (!!instance.constructor && !!instance.constructor.associations) {
      const keys = Object.keys(instance.constructor.associations);
      const length = keys.length;
      let association;

      for (let i = 0; i < length; i++) {
        association = instance.constructor.associations[keys[i]];
        if (association.options && association.options.onDelete &&
          association.options.onDelete.toLowerCase() === 'cascade' &&
          association.options.useHooks === true) {
          cascades.push(association.accessors.get);
        }
      }
    }

    return Promise.each(cascades, cascade => {
      return instance[cascade](options).then(instances => {
        // Check for hasOne relationship with non-existing associate ("has zero")
        if (!instances) {
          return Promise.resolve();
        }

        if (!Array.isArray(instances)) {
          instances = [instances];
        }

        return Promise.each(instances, cascadeInstance => cascadeInstance.destroy(options));
      });
    }).then(() => {
      options.instance = instance;
      return this.sequelize.query(sql, options);
    });
  }

  /**
   * Delete records from a table
   *
   * @param tableName  Table name from where to delete records
   * @param identifier Where conditions to find records to delete
   *
   * @returns Promise,
   */
  public bulkDelete(tableName : string, identifier : {}, options : {
    /** Array<String>|Object, A list of the attributes that you want to select, or an object with `include` and `exclude` keys. */
    attributes? : any,
    hasDuplicating? : boolean,
    hasIncludeRequired? : boolean,
    hasIncludeWhere? : boolean,
    hasJoin? : boolean,
    hasMultiAssociation? : boolean,
    hasRequired? : boolean,
    hasSingleAssociation? : boolean,
    hasWhere? : boolean,
    /** An object of hook function that are called before and after certain lifecycle events */
    hooks? : boolean,
    include? : IInclude[],
    /** Internal map of includes - auto-completed */
    includeMap? : {},
    /** Internal array of attributes - auto-completed */
    includeNames? : string[],
    model? : typeof Model,
    /** Specify if we want only one row without using an array */
    plain? : boolean,
    /** Error if no result found */
    rejectOnEmpty? : boolean,
    /** Passes by sub-query ? */
    subQuery? : boolean,
    tableNames? : string[],
    topLimit? : any,
    topModel? : typeof Model,
    truncate? : boolean,
    /** A hash of search attributes. */
    where? : {}
  }, model : typeof Model) {
    options = Utils.cloneDeep(options);
    options = _.defaults(options, { limit: null });

    if (options.truncate === true) {
      return this.sequelize.query(
        this.QueryGenerator.truncateTableQuery(tableName, options),
        options
      );
    }

    if (typeof identifier === 'object') {
      identifier = Utils.cloneDeep(identifier);
    }

    return this.sequelize.query(
      this.QueryGenerator.deleteQuery(tableName, identifier, options, model),
      options
    );
  }

  /**
   * select query
   */
  public select(model : typeof Model, tableName : string, options : {
    /** Array<String>|Object, A list of the attributes that you want to select, or an object with `include` and `exclude` keys. */
    attributes? : any,
    hasDuplicating? : boolean,
    hasIncludeRequired? : boolean,
    hasIncludeWhere? : boolean,
    hasJoin? : boolean,
    hasMultiAssociation? : boolean,
    hasRequired? : boolean,
    hasSingleAssociation? : boolean,
    hasWhere? : boolean,
    /** An object of hook function that are called before and after certain lifecycle events */
    hooks? : boolean,
    include? : IInclude[],
    /** Internal map of includes - auto-completed */
    includeMap? : {},
    /** Internal array of attributes - auto-completed */
    includeNames? : string[],
    model? : typeof Model,
    /** Specify if we want only one row without using an array */
    plain? : boolean,
    rawQuery? : any,
    /** Error if no result found */
    rejectOnEmpty? : boolean,
    /** Passes by sub-query ? */
    subQuery? : boolean,
    tableNames? : string[],
    topLimit? : any,
    topModel? : typeof Model,
    type? : string,
    /** A hash of search attributes. */
    where? : {}
  }) {
    options = options || {};
    options.type = QueryTypes.SELECT;
    options.model = model;
    // New option to get the raw query instead of execute it

    if ('rawQuery' in options && options.rawQuery) {
      const rawQuery = this.QueryGenerator.selectQuery(tableName, options, model);

      if (this.QueryGenerator.dialect === 'oracle' && !options.rawQuery.original) {
        const opts = OracleQuery.prototype._dealWithLongAliasesBeforeSelect(rawQuery);
        return opts.sql;
      } else {
        return rawQuery;
      }
    } else {
      return this.sequelize.query(
        this.QueryGenerator.selectQuery(tableName, options, model),
        options
      );
    }
  }

  public increment(model : typeof Model, tableName : string, values : any, identifier : {}, options : {
    /** Array<String>|Object, A list of the attributes that you want to select, or an object with `include` and `exclude` keys. */
    attributes? : any,
    by? : number,
    increment? : boolean,
    instance? : Model,
    model? : typeof Model,
    returning? : boolean,
    /** Transaction to run query under */
    transaction? : Transaction,
    type? : string,
    /** A hash of search attributes. */
    where? : {}
  }) {
    options = Utils.cloneDeep(options);

    const sql = this.QueryGenerator.arithmeticQuery('+', tableName, values, identifier, options, options.attributes);

    options.type = QueryTypes.UPDATE;
    options.model = model;

    return this.sequelize.query(sql, options);
  }

  public decrement(model : typeof Model, tableName : string, values : any, identifier : {}, options : {
    /** Array<String>|Object, A list of the attributes that you want to select, or an object with `include` and `exclude` keys. */
    attributes? : any,
    by? : number,
    increment? : boolean,
    instance? : Model,
    model? : typeof Model,
    returning? : boolean,
    /** Transaction to run query under */
    transaction? : Transaction,
    type? : string,
    /** A hash of search attributes. */
    where? : {}
  }) {
    options = Utils.cloneDeep(options);

    const sql = this.QueryGenerator.arithmeticQuery('-', tableName, values, identifier, options, options.attributes);

    options.type = QueryTypes.UPDATE;
    options.model = model;

    return this.sequelize.query(sql, options);
  }

  /**
   * raw select
   */
  public rawSelect(tableName : string, options : {
    /** Array<String>|Object, A list of the attributes that you want to select, or an object with `include` and `exclude` keys. */
    attributes? : any,
    dataType? : any,
    hasDuplicating? : boolean,
    hasIncludeRequired? : boolean,
    hasIncludeWhere? : boolean,
    hasJoin? : boolean,
    hasMultiAssociation? : boolean,
    hasRequired? : boolean,
    hasSingleAssociation? : boolean,
    hasWhere? : boolean,
    /** An object of hook function that are called before and after certain lifecycle events */
    hooks? : boolean,
    include? : IInclude[],
    includeIgnoreAttributes? : boolean,
    /** Internal map of includes - auto-completed */
    includeMap? : {},
    /** Internal array of attributes - auto-completed */
    includeNames? : string[],
    keyEscaped? : boolean,
    /** The maximum count you want to get. */
    limit? : number,
    model? : typeof Model,
    /** An offset value to start from. Only useable with limit! */
    offset? : number,
    /** OrderBy clause */
    order? : any,
    /** Specify if we want only one row without using an array */
    plain? : boolean,
    /** Return raw result. */
    raw? : boolean,
    /** The schema that the tables should be created in. This can be overriden for each table in sequelize.define */
    schema? : string,
    /** Passes by sub-query ? */
    subQuery? : boolean,
    topLimit? : any,
    topModel? : typeof Model,
    type? : string
  }, attributeSelector : string, model : typeof Model) {
    if (options.schema) {
      tableName = this.QueryGenerator.addSchema({
        tableName,
        _schema: options.schema
      });
    }

    options = Utils.cloneDeep(options);
    options = _.defaults(options, {
      raw: true,
      plain: true,
      type: QueryTypes.SELECT
    });

    const sql = this.QueryGenerator.selectQuery(tableName, options, model);

    if (attributeSelector === undefined) {
      throw new Error('Please pass an attribute selector!');
    }

    return this.sequelize.query(sql, options).then(data => {
      if (!options.plain) {
        return data;
      }

      let result = data ? data[attributeSelector] : null;

      if (options && options.dataType) {
        const dataType = options.dataType;

        if (dataType instanceof DataTypes.DECIMAL || dataType instanceof DataTypes.FLOAT) {
          result = parseFloat(result);
        } else if (dataType instanceof DataTypes.INTEGER || dataType instanceof DataTypes.BIGINT) {
          result = parseInt(result, 10);
        } else if (dataType instanceof DataTypes.DATE) {
          if (!_.isNull(result) && !_.isDate(result)) {
            result = new Date(result);
          }
        } else if (dataType instanceof DataTypes.STRING) {
          // Nothing to do, result is already a string.
        }
      }

      return result;
    });
  }

  /**
   * create a trigger
   */
  public createTrigger(tableName : string, triggerName : string, timingType : string, fireOnArray : any, functionName : string, functionParams : {}, optionsArray : any[], options : {}) {
    const sql = (this.QueryGenerator as any).createTrigger(tableName, triggerName, timingType, fireOnArray, functionName, functionParams, optionsArray);
    options = options || {};
    if (sql) {
      return this.sequelize.query(sql, options);
    } else {
      return Promise.resolve();
    }
  }

  /**
   * drop a trigger
   */
  public dropTrigger(tableName : string, triggerName : string, options : {}) {
    const sql = (this.QueryGenerator as any).dropTrigger(tableName, triggerName);
    options = options || {};

    if (sql) {
      return this.sequelize.query(sql, options);
    } else {
      return Promise.resolve();
    }
  }

  /**
   * rename a trigger
   */
  public renameTrigger(tableName : string, oldTriggerName : string, newTriggerName : string, options : {}) {
    const sql = (this.QueryGenerator as any).renameTrigger(tableName, oldTriggerName, newTriggerName);
    options = options || {};

    if (sql) {
      return this.sequelize.query(sql, options);
    } else {
      return Promise.resolve();
    }
  }

  /**
   * Create SQL function
   *
   * ```js
   * queryInterface.createFunction(
   *   'someFunction',
   *   [
   *     {type: 'integer', name: 'param', direction: 'IN'}
   *   ],
   *   'integer',
   *   'plpgsql',
   *   'RETURN param + 1;',
   *   [
   *     'IMMUTABLE',
   *     'LEAKPROOF'
   *   ]
   * );
   * ```
   *
   * @param functionName Name of SQL function to create
   * @param params List of parameters declared for SQL function
   * @param returnType SQL type of function returned value
   * @param language The name of the language that the function is implemented in
   * @param body Source code of function
   * @param optionsArray Extra-options for creation
   *
   * @returns Promise,
   */
  public createFunction(functionName : string, params : any[], returnType : string, language : string, body : string, optionsArray : any[], options : {}) {
    const sql = (this.QueryGenerator as any).createFunction(functionName, params, returnType, language, body, optionsArray);
    options = options || {};

    if (sql) {
      return this.sequelize.query(sql, options);
    } else {
      return Promise.resolve();
    }
  }

  /**
   * Drop SQL function
   *
   * ```js
   * queryInterface.dropFunction(
   *   'someFunction',
   *   [
   *     {type: 'varchar', name: 'param1', direction: 'IN'},
   *     {type: 'integer', name: 'param2', direction: 'INOUT'}
   *   ]
   * );
   * ```
   *
   * @param functionName Name of SQL function to drop
   * @params       List of parameters declared for SQL function
   *
   * @returns Promise,
   */
  public dropFunction(functionName : string, params : any[], options : {}) {
    const sql = (this.QueryGenerator as any).dropFunction(functionName, params);
    options = options || {};

    if (sql) {
      return this.sequelize.query(sql, options);
    } else {
      return Promise.resolve();
    }
  }

  /**
   * Rename SQL function
   *
   * ```js
   * queryInterface.renameFunction(
   *   'fooFunction',
   *   [
   *     {type: 'varchar', name: 'param1', direction: 'IN'},
   *     {type: 'integer', name: 'param2', direction: 'INOUT'}
   *   ],
   *   'barFunction'
   * );
   * ```
   * @returns Promise,
   */
  public renameFunction(oldFunctionName : string, params : any[], newFunctionName : string, options : {}) {
    const sql = (this.QueryGenerator as any).renameFunction(oldFunctionName, params, newFunctionName);
    options = options || {};

    if (sql) {
      return this.sequelize.query(sql, options);
    } else {
      return Promise.resolve();
    }
  }

  // Helper methods useful for querying

  /**
   * Escape an identifier (e.g. a table or attribute name). If force is true,
   * the identifier will be quoted even if the `quoteIdentifiers` option is
   * false.
   */
  public quoteIdentifier(identifier : {}, force : boolean) {
    return this.QueryGenerator.quoteIdentifier(identifier, force);
  }

  /**
   * quote the name of the table
   */
  public quoteTable(identifier : {}) {
    return this.QueryGenerator.quoteTable(identifier);
  }

  /**
   * Split an identifier into .-separated tokens and quote each part.
   * If force is true, the identifier will be quoted even if the
   * `quoteIdentifiers` option is false.
   */
  public quoteIdentifiers(identifiers : {}, force : boolean) {
    return this.QueryGenerator.quoteIdentifiers(identifiers, force);
  }

  /**
   * Escape a value (e.g. a string, number or date)
   */
  public escape(value : any) {
    return this.QueryGenerator.escape(value);
  }

  /**
   * set autocommit
   */
  public setAutocommit(transaction : Transaction, value : any, options : {
    autocommit? : boolean,
    /** Set the default transaction isolation level */
    isolationLevel? : string,
    readOnly? : boolean,
    transaction? : Transaction,
    type? : string,
  }) {
    if (!transaction || !(transaction instanceof Transaction)) {
      throw new Error('Unable to set autocommit for a transaction without transaction object!');
    }
    if (transaction.parent) {
      // Not possible to set a separate isolation level for savepoints
      return Promise.resolve();
    }

    options = _.assign({}, options, {
      transaction: transaction.parent || transaction
    });

    const sql = this.QueryGenerator.setAutocommitQuery(value, {
      parent: transaction.parent
    });

    if (!sql) {
      return Promise.resolve();
    }

    return this.sequelize.query(sql, options);
  }

  /**
   * set the isolation level
   */
  public setIsolationLevel(transaction : Transaction, value : any, options : {
    autocommit? : boolean,
    /** Set the default transaction isolation level */
    isolationLevel? : string,
    readOnly? : boolean,
    /** Transaction to run query under */
    transaction? : Transaction,
    type? : string,
  }) {
    if (!transaction || !(transaction instanceof Transaction)) {
      throw new Error('Unable to set isolation level for a transaction without transaction object!');
    }

    if (transaction.parent || !value) {
      // Not possible to set a separate isolation level for savepoints
      return Promise.resolve();
    }

    options = _.assign({}, options, {
      transaction: transaction.parent || transaction
    });

    const sql = this.QueryGenerator.setIsolationLevelQuery(value, {
      parent: transaction.parent
    });

    if (!sql) {
      return Promise.resolve();
    }

    return this.sequelize.query(sql, options);
  }

  /**
   * start a transaction
   */
  public startTransaction(transaction : Transaction, options : {
    autocommit? : boolean,
    /** Set the default transaction isolation level */
    isolationLevel? : string,
    readOnly? : boolean,
    /** Transaction to run query under */
    transaction? : Transaction,
    type? : string,
  }) {
    if (!transaction || !(transaction instanceof Transaction)) {
      throw new Error('Unable to start a transaction without transaction object!');
    }

    options = _.assign({}, options, {
      transaction: transaction.parent || transaction
    });
    options.transaction.name = transaction.parent ? transaction.name : undefined;
    const sql = this.QueryGenerator.startTransactionQuery(transaction);

    return this.sequelize.query(sql, options);
  }

  /**
   * defer the constraints
   */
  public deferConstraints(transaction : Transaction, options : {
    autocommit? : boolean,
    deferrable? : any,
    /** Set the default transaction isolation level */
    isolationLevel? : string,
    readOnly? : boolean,
    /** Transaction to run query under */
    transaction? : Transaction,
    type? : string,
  }) {
    options = _.assign({}, options, {
      transaction: transaction.parent || transaction
    });

    const sql = (this.QueryGenerator as PostgresQueryGenerator).deferConstraintsQuery(options);

    if (sql) {
      return this.sequelize.query(sql, options);
    }

    return Promise.resolve();
  }

  /**
   * commit a transaction
   */
  public commitTransaction(transaction : Transaction, options : {
    autocommit? : boolean,
    isolationLevel? : string,
    readOnly? : boolean,
    /** Transaction to run query under */
    transaction? : Transaction,
    type? : string,
  }) {
    if (!transaction || !(transaction instanceof Transaction)) {
      throw new Error('Unable to commit a transaction without transaction object!');
    }
    if (transaction.parent) {
      // Savepoints cannot be committed
      return Promise.resolve();
    }

    options = _.assign({}, options, {
      transaction: transaction.parent || transaction,
      supportsSearchPath: false
    });

    const sql = this.QueryGenerator.commitTransactionQuery(transaction);
    const promise = this.sequelize.query(sql, options);

    transaction.finished = 'commit';

    return promise;
  }

  /**
   * rollback a transaction
   */
  public rollbackTransaction(transaction : Transaction, options : {
    autocommit? : boolean,
    /** Set the default transaction isolation level */
    isolationLevel? : string,
    readOnly? : boolean,
    transaction? : Transaction,
    type? : string,
  }) {
    if (!transaction || !(transaction instanceof Transaction)) {
      throw new Error('Unable to rollback a transaction without transaction object!');
    }

    options = _.assign({}, options, {
      transaction: transaction.parent || transaction,
      supportsSearchPath: false
    });
    options.transaction.name = transaction.parent ? transaction.name : undefined;
    const sql = this.QueryGenerator.rollbackTransactionQuery(transaction);
    const promise = this.sequelize.query(sql, options);

    transaction.finished = 'rollback';

    return promise;
  }
}
