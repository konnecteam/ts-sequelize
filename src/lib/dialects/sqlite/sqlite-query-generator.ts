'use strict';

import * as _ from 'lodash';
import * as util from 'util';
import { Sequelize } from '../../..';
import { Model } from '../../model';
import { ISequelizeOption } from '../../model/isequelize-option';
import { Transaction } from '../../transaction';
import * as AllUtils from '../../utils';
import { AbstractQueryGenerator } from '../abstract/abstract-query-generator';
import { SqliteDialect } from './sqlite-dialect';

const Utils = AllUtils.Utils;

export class SqliteQueryGenerator extends AbstractQueryGenerator {

  constructor(options : { sequelize? : Sequelize, options : ISequelizeOption, _dialect? : SqliteDialect }) {
    super(options);
    this.dialect = 'sqlite';
  }

  /**
   * return a query to create a schema
   */
  public createSchema() : string {
    return "SELECT name FROM `sqlite_master` WHERE type='table' and name!='sqlite_sequence';";
  }

  /**
   * return a query to show the schema
   */
  public showSchemasQuery() : string {
    return "SELECT name FROM `sqlite_master` WHERE type='table' and name!='sqlite_sequence';";
  }

  public versionQuery() : string {
    return 'SELECT sqlite_version() as `version`';
  }

  /**
   * return a query to create a table
   */
  public createTableQuery(tableName : string, attributes, options? : {
    /** = false, Pass query execution time in milliseconds as second argument to logging function (options.logging). */
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
    operatorsAlisases? : boolean,
    /** = false, Calling `destroy` will not delete the model, but instead set a `deletedAt` timestamp if this is true. Needs `timestamps=true` to work */
    paranoid? : boolean,
    /** sequelize connection pool configuration */
    pool? : {},
    /** The port of the relational database. */
    port? : number,
    /** = 'tcp', The protocol of the relational database. */
    protocol? : string,
    query? : {},
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
    validate? : boolean,
    whereCollection? : {}
  }) : string {
    options = options || {};

    const primaryKeys = [];
    const needsMultiplePrimaryKeys = _.values(attributes).filter(definition => _.includes(definition, 'PRIMARY KEY')).length > 1;
    const attrArray = [];

    Object.keys(attributes).forEach(attr => {
      let dataType = attributes[attr];
      const containsAutoIncrement = _.includes(dataType, 'AUTOINCREMENT');

      if (containsAutoIncrement) {
        dataType = dataType.replace(/BIGINT/, 'INTEGER');
      }

      let dataTypeString = dataType;
      if (_.includes(dataType, 'PRIMARY KEY')) {
        if (_.includes(dataType, 'INTEGER')) { // Only INTEGER is allowed for primary key, see https://github.com/sequelize/sequelize/issues/969 (no lenght, unsigned etc)
          dataTypeString = containsAutoIncrement ? 'INTEGER PRIMARY KEY AUTOINCREMENT' : 'INTEGER PRIMARY KEY';
        }

        if (needsMultiplePrimaryKeys) {
          primaryKeys.push(attr);
          dataTypeString = dataType.replace(/PRIMARY KEY/, 'NOT NULL');
        }
      }
      attrArray.push(this.quoteIdentifier(attr) + ' ' + dataTypeString);
    });

    const table = this.quoteTable(tableName);
    let attrStr = attrArray.join(', ');
    const pkString = primaryKeys.map(pk => this.quoteIdentifier(pk)).join(', ');

    if (options.uniqueKeys) {
      Object.keys(options.uniqueKeys).forEach(indexName => {
        const columns = options.uniqueKeys[indexName];
        if (columns.customIndex) {
          attrStr += `, UNIQUE (${columns.fields.map(field => this.quoteIdentifier(field)).join(', ')})`;
        }
      });
    }

    if (pkString.length > 0) {
      attrStr += `, PRIMARY KEY (${pkString})`;
    }

    const sql = `CREATE TABLE IF NOT EXISTS ${table} (${attrStr});`;
    return this.replaceBooleanDefaults(sql);
  }

  /**
   * return the boolean value of a value
   */
  public booleanValue(value : any) : number {
    return value ? 1 : 0;
  }

  /**
   * Check whether the statmement is json function or simple path
   *
   * @param stmt The statement to validate
   * @returns true if the given statement is json function
   * @throws {Error} throw if the statement looks like json function but has invalid token
   * @hidden
   */
  private _checkValidJsonStatement(stmt : string) : boolean {
    if (!_.isString(stmt)) {
      return false;
    }

    // https://sqlite.org/json1.html
    const jsonFunctionRegex = /^\s*(json(?:_[a-z]+){0,2})\([^)]*\)/i;
    const tokenCaptureRegex = /^\s*((?:([`"'])(?:(?!\2).|\2{2})*\2)|[\w\d\s]+|[().,;+-])/i;

    let currentIndex = 0;
    let openingBrackets = 0;
    let closingBrackets = 0;
    let hasJsonFunction = false;
    let hasInvalidToken = false;

    while (currentIndex < stmt.length) {
      const string = stmt.substr(currentIndex);
      const functionMatches = jsonFunctionRegex.exec(string);
      if (functionMatches) {
        currentIndex += functionMatches[0].indexOf('(');
        hasJsonFunction = true;
        continue;
      }

      const tokenMatches = tokenCaptureRegex.exec(string);
      if (tokenMatches) {
        const capturedToken = tokenMatches[1];
        if (capturedToken === '(') {
          openingBrackets++;
        } else if (capturedToken === ')') {
          closingBrackets++;
        } else if (capturedToken === ';') {
          hasInvalidToken = true;
          break;
        }
        currentIndex += tokenMatches[0].length;
        continue;
      }

      break;
    }

    // Check invalid json statement
    hasInvalidToken = hasInvalidToken || openingBrackets !== closingBrackets;
    if (hasJsonFunction && hasInvalidToken) {
      throw new Error('Invalid json statement: ' + stmt);
    }

    // return true if the statement has valid json function
    return hasJsonFunction;
  }

  /**
   * Generates an SQL query that extract JSON property of given path.
   *
   * @param column The JSON column
   * @param path The path to extract (optional)
   * @returns The generated sql query
   */
  protected jsonPathExtractionQuery(column : string, path : string | string[]) : string {
    const paths = _.toPath(path);
    const pathStr = this.escape(['$']
    .concat(paths)
    .join('.')
    .replace(/\.(\d+)(?:(?=\.)|$)/g, (__, digit) => `[${digit}]`));

    const quotedColumn = this.isIdentifierQuoted(column) ? column : this.quoteIdentifier(column);
    return `json_extract(${quotedColumn}, ${pathStr})`;
  }

  //sqlite can't cast to datetime so we need to convert date values to their ISO strings
  public _toJSONValue(value : any) : any {
    if (value instanceof Date) {
      return value.toISOString();
    } else if (Array.isArray(value) && value[0] instanceof Date) {
      return value.map(val => val.toISOString());
    }
    return value;
  }

  /**
   * handle a sequelize method
   */
  public handleSequelizeMethod(smth : any, tableName : string, factory : any, options : {}, prepend : any) : string {
    if (smth instanceof AllUtils.Json) {
      // Parse nested object
      if (smth.conditions) {
        const conditions = this.parseConditionObject(smth.conditions).map(condition =>
          `${this.jsonPathExtractionQuery(_.first(condition.path), _.tail(condition.path))} = '${condition.value}'`
        );

        return conditions.join(' AND ');
      } else if (smth.path) {
        let str;

        // Allow specifying conditions using the sqlite json functions
        if (this._checkValidJsonStatement(smth.path)) {
          str = smth.path;
        } else {
          // Also support json property accessors
          const paths = _.toPath(smth.path);
          const column = paths.shift();
          str = this.jsonPathExtractionQuery(column, paths);
        }

        if (smth.value) {
          str += util.format(' = %s', this.escape(smth.value));
        }

        return str;
      }
    } else if (smth instanceof AllUtils.Cast) {
      if (/timestamp/i.test(smth.type)) {
        smth.type = 'datetime';
      }
    }

    return super.handleSequelizeMethod(smth, tableName, factory, options, prepend);
  }

  /**
   * return a query to add a column to a table
   */
  public addColumnQuery(table : string, key : string, dataType : string) {
    const attributes = {};
    attributes[key] = dataType;
    const fields = this.attributesToSQL(attributes, { context: 'addColumn' });
    const attribute = this.quoteIdentifier(key) + ' ' + fields[key];

    const sql = `ALTER TABLE ${this.quoteTable(table)} ADD ${attribute};`;

    return this.replaceBooleanDefaults(sql);
  }

  /**
   * return a query to show the tables
   */
  public showTablesQuery() : string {
    return "SELECT name FROM `sqlite_master` WHERE type='table' and name!='sqlite_sequence';";
  }

  /**
   * return an upsert query
   */
  public upsertQuery(tableName : string, insertValues : {}, updateValues : {}, where : {}, model : typeof Model, options : {
    fields? : string[],
    /** An object of hook function that are called before and after certain lifecycle events */
    hooks? : boolean,
    ignoreDuplicates? : boolean
    model? : typeof Model,
    /** Return raw result. */
    raw? : boolean,
    /**
     * The type of query you are executing. The query type affects how results are formatted before they are passed back.
     * The type is a string, but `Sequelize.QueryTypes` is provided as convenience shortcuts.
     */
    type? : string,
  }) : any {
    options.ignoreDuplicates = true;

    const bind = [];
    const bindParam = this.bindParam(bind);

    const upsertOptions = _.defaults({ bindParam }, options);
    const insert = this.insertQuery(tableName, insertValues, model.rawAttributes, upsertOptions);
    const update = this.updateQuery(tableName, updateValues, where, upsertOptions, model.rawAttributes);

    const query = insert.query + ' ' + update.query;

    return { query, bind };
  }

  /**
   * return an upsert query
   */
  public updateQuery(tableName : string, attrValueHash : any, where : {}, options : {
    bindParam? : boolean,
    defaultFields? : string[],
    fields? : string[],
    hasTrigger? : boolean,
    /** An object of hook function that are called before and after certain lifecycle events */
    hooks? : boolean,
    /** How many rows to update */
    limit? : number,
    mapToModel? : boolean,
    /** = false, A flag that defines if null values should be passed to SQL queries or not. */
    omitNull? : boolean,
    returning? : boolean,
    validate? : boolean
  }, attributes) {
    options = options || {};
    _.defaults(options, this.options);

    attrValueHash = Utils.removeNullValuesFromHash(attrValueHash, options.omitNull, options);

    const modelAttributeMap = {};
    const values = [];
    const bind = [];
    const bindParam = options.bindParam || this.bindParam(bind);

    if (attributes) {
      Object.keys(attributes).forEach(key => {
        const attribute = attributes[key];
        modelAttributeMap[key] = attribute;
        if (attribute.field) {
          modelAttributeMap[attribute.field] = attribute;
        }
      });
    }

    Object.keys(attrValueHash).forEach(key => {
      const value = attrValueHash[key];

      if (value instanceof AllUtils.SequelizeMethod || options.bindParam === false) {
        values.push(this.quoteIdentifier(key) + '=' + this.escape(value, modelAttributeMap && modelAttributeMap[key] || undefined, { context: 'UPDATE' }));
      } else {
        values.push(this.quoteIdentifier(key) + '=' + this.format(value, modelAttributeMap && modelAttributeMap[key] || undefined, { context: 'UPDATE' }, bindParam));
      }
    });

    let query;
    const whereOptions = _.defaults({ bindParam }, options);

    if (options.limit) {
      query = `UPDATE ${this.quoteTable(tableName)} SET ${values.join(',')} WHERE rowid IN (SELECT rowid FROM ${this.quoteTable(tableName)} ${this.whereQuery(where, whereOptions)} LIMIT ${this.escape(options.limit)})`;
    } else {
      query = `UPDATE ${this.quoteTable(tableName)} SET ${values.join(',')} ${this.whereQuery(where, whereOptions)}`;
    }

    return { query, bind };
  }

  public truncateTableQuery(tableName : string) : string {
    return `DELETE FROM ${this.quoteTable(tableName)}`;
  }

  /**
   * return a delete query
   */
  public deleteQuery(tableName : string, where : {}, options : {
    /** = false, Pass query execution time in milliseconds as second argument to logging function (options.logging). */
    benchmark? : boolean,
    cascade? : boolean,
    databaseVersion? : number,
    /** = {}, Default options for model definitions. See sequelize.define for options */
    define? : {},
    /** The dialect of the database you are connecting to. One of mysql, postgres, sqlite, oracle and mssql. */
    dialect? : string,
    /** = null, If specified, load the dialect library from this path. For example, if you want to use pg.js instead of pg when connecting to a pg database, you should specify 'pg.js' here */
    dialectModulePath? : string,
    /** An object of additional options, which are passed directly to the connection library */
    dialectOptions? : {},
    force? : boolean,
    /** An object of hook function that are called before and after certain lifecycle events */
    hooks? : boolean,
    /** = 'localhost', The host of the relational database. */
    host? : string,
    individualHooks? : boolean,
    /** Set the default transaction isolation level */
    isolationLevel? : string,
    /** How many rows to delete */
    limit? : number,
    /** A function that logs sql queries, or false for no logging */
    logging? : boolean | any,
    model? : typeof Model,
    /** = false, A flag that defines if native library shall be used or not. Currently only has an effect for postgres */
    native? : boolean,
    /** = false, A flag that defines if null values should be passed to SQL queries or not. */
    omitNull? : boolean,
    /** = true, String based operator alias, default value is true which will enable all operators alias. Pass object to limit set of aliased operators or false to disable completely. */
    operatorsAliases? : boolean,
    pool? : {},
    /** sequelize connection pool configuration */
    port? : number,
    /** = 'tcp', The protocol of the relational database. */
    protocol? : string,
    query? : {}
    quoteIdentifiers? : boolean,
    replication? : boolean,
    restartIdentity? : boolean,
    /** Set of flags that control when a query is automatically retried. */
    retry? : { max? : number, match? : any[] },
    ssl? : boolean,
    storage? : string,
    /** = {}, Default options for sequelize.sync */
    sync? : {},
    timezone? : string,
    transactionType? : string,
    /** = false, If set to true, dialects that support it will use TRUNCATE instead of DELETE FROM. If a table is truncated the where and limit options are ignored */
    truncate? : boolean,
    /**
     * The type of query you are executing. The query type affects how results are formatted before they are passed back.
     * The type is a string, but `Sequelize.QueryTypes` is provided as convenience shortcuts.
     */
    type? : string,
    typeValidation? : boolean
  }, model : typeof Model) : string {
    options = options || {};
    _.defaults(options, this.options);

    if (options.truncate === true) {
      // Truncate does not allow LIMIT and WHERE
      return `DELETE FROM ${this.quoteTable(tableName)}`;
    }

    if (_.isUndefined(options.limit)) {
      options.limit = 1;
    }

    let whereClause = this.getWhereConditions(where, null, model, options);
    if (whereClause) {
      whereClause = `WHERE ${whereClause}`;
    }

    if (options.limit) {
      whereClause = `WHERE rowid IN (SELECT rowid FROM ${this.quoteTable(tableName)} ${whereClause} LIMIT ${this.escape(options.limit)})`;
    }

    return `DELETE FROM ${this.quoteTable(tableName)} ${whereClause}`;
  }

  /**
   * change all attributes to sql
   */
  public attributesToSQL(attributes : {}, options? : {}) : { context? : string } {
    const result = {};

    Object.keys(attributes).forEach(name => {
      const dataType = attributes[name];
      const fieldName = dataType.field || name;

      if (_.isObject(dataType)) {
        let sql = dataType.type.toString();

        if (dataType.hasOwnProperty('allowNull') && !dataType.allowNull) {
          sql += ' NOT NULL';
        }

        if ('defaultValue' in dataType && Utils.defaultValueSchemable(dataType.defaultValue)) {
          // TODO thoroughly check that DataTypes.NOW will properly
          // get populated on all databases as DEFAULT value
          // i.e. mysql requires: DEFAULT CURRENT_TIMESTAMP
          sql += ' DEFAULT ' + this.escape(dataType.defaultValue, dataType);
        }

        if (dataType.unique === true) {
          sql += ' UNIQUE';
        }

        if (dataType.primaryKey) {
          sql += ' PRIMARY KEY';

          if (dataType.autoIncrement) {
            sql += ' AUTOINCREMENT';
          }
        }

        if (dataType.references) {
          const referencesTable = this.quoteTable(dataType.references.model);

          let referencesKey;
          if (dataType.references.key) {
            referencesKey = this.quoteIdentifier(dataType.references.key);
          } else {
            referencesKey = this.quoteIdentifier('id');
          }

          sql += ` REFERENCES ${referencesTable} (${referencesKey})`;

          if (dataType.onDelete) {
            sql += ' ON DELETE ' + dataType.onDelete.toUpperCase();
          }

          if (dataType.onUpdate) {
            sql += ' ON UPDATE ' + dataType.onUpdate.toUpperCase();
          }

        }

        result[fieldName] = sql;
      } else {
        result[fieldName] = dataType;
      }
    });

    return result;
  }

  /**
   * return a query to show indexes
   */
  public showIndexesQuery(tableName : string) : string {
    return `PRAGMA INDEX_LIST(${this.quoteTable(tableName)})`;
  }

  /**
   * return a query to show constraints
   */
  public showConstraintsQuery(tableName : string, constraintName : string) : string {
    let sql =  `SELECT sql FROM sqlite_master WHERE tbl_name='${tableName}'`;

    if (constraintName) {
      sql += ` AND sql LIKE '%${constraintName}%'`;
    }

    return sql + ';';
  }

  /**
   * return a query to remove index
   */
  public removeIndexQuery(tableName : string, indexNameOrAttributes : string | any) : string {
    let indexName = indexNameOrAttributes;

    if (typeof indexName !== 'string') {
      indexName = Utils.underscore(tableName + '_' + indexNameOrAttributes.join('_'));
    }

    return `DROP INDEX IF EXISTS ${this.quoteIdentifier(indexName)}`;
  }

  /**
   * return a select query to describe the table
   */
  public describeTableQuery(tableName : string, schema : string, schemaDelimiter : string) : string {
    const table = {
      _schema: schema,
      _schemaDelimiter: schemaDelimiter,
      tableName
    };
    return `PRAGMA TABLE_INFO(${this.quoteTable(this.addSchema(table))});`;
  }

  /**
   * return a select query to get the query to create a table
   */
  public describeCreateTableQuery(tableName : string) : string {
    return `SELECT sql FROM sqlite_master WHERE tbl_name='${tableName}';`;
  }

  /**
   * return a query to remove a column of a table
   * @param tableName : { tableName : string, schema : string } | string
   */
  public removeColumnQuery(tableName : any, attributes : {}) : string {

    attributes = this.attributesToSQL(attributes);

    let backupTableName;
    if (typeof tableName === 'object') {
      backupTableName = {
        tableName: tableName.tableName + '_backup',
        schema: tableName.schema
      };
    } else {
      backupTableName = tableName + '_backup';
    }

    const quotedTableName = this.quoteTable(tableName);
    const quotedBackupTableName = this.quoteTable(backupTableName);
    const attributeNames = Object.keys(attributes).map(attr => this.quoteIdentifier(attr)).join(', ');

    // Temporary table cannot work for foreign keys.
    return this.createTableQuery(backupTableName, attributes)
      + `INSERT INTO ${quotedBackupTableName} SELECT ${attributeNames} FROM ${quotedTableName};`
      + `DROP TABLE ${quotedTableName};`
      + this.createTableQuery(tableName, attributes)
      + `INSERT INTO ${quotedTableName} SELECT ${attributeNames} FROM ${quotedBackupTableName};`
      + `DROP TABLE ${quotedBackupTableName};`;
  }

  /**
   * @param tableName : { tableName : string, schema : string } | string
   */
  public _alterConstraintQuery(tableName : any, attributes : {}, createTableSql : string) : string {
    let backupTableName;

    attributes = this.attributesToSQL(attributes);

    if (typeof tableName === 'object') {
      backupTableName = {
        tableName: tableName.tableName + '_backup',
        schema: tableName.schema
      };
    } else {
      backupTableName = tableName + '_backup';
    }
    const quotedTableName = this.quoteTable(tableName);
    const quotedBackupTableName = this.quoteTable(backupTableName);
    const attributeNames = Object.keys(attributes).map(attr => this.quoteIdentifier(attr)).join(', ');

    return createTableSql.replace(`CREATE TABLE ${quotedTableName}`, `CREATE TABLE ${quotedBackupTableName}`)
      + `INSERT INTO ${quotedBackupTableName} SELECT ${attributeNames} FROM ${quotedTableName};`
      + `DROP TABLE ${quotedTableName};`
      + `ALTER TABLE ${quotedBackupTableName} RENAME TO ${quotedTableName};`;
  }

  /**
   * return a query to rename a column of a table
   * @param tableName : { tableName : string, schema : string } | string
   */
  public renameColumnQuery(tableName, attrNameBefore : string, attrNameAfter : string, attributes? : {}) : string {

    let backupTableName;

    attributes = this.attributesToSQL(attributes);

    if (typeof tableName === 'object') {
      backupTableName = {
        tableName: tableName.tableName + '_backup',
        schema: tableName.schema
      };
    } else {
      backupTableName = tableName + '_backup';
    }

    const quotedTableName = this.quoteTable(tableName);
    const quotedBackupTableName = this.quoteTable(backupTableName);
    const attributeNamesImport = Object.keys(attributes).map(attr =>
      attrNameAfter === attr ? this.quoteIdentifier(attrNameBefore) + ' AS ' + this.quoteIdentifier(attr) : this.quoteIdentifier(attr)
    ).join(', ');
    const attributeNamesExport = Object.keys(attributes).map(attr => this.quoteIdentifier(attr)).join(', ');

    return this.createTableQuery(backupTableName, attributes).replace('CREATE TABLE', 'CREATE TEMPORARY TABLE')
      + `INSERT INTO ${quotedBackupTableName} SELECT ${attributeNamesImport} FROM ${quotedTableName};`
      + `DROP TABLE ${quotedTableName};`
      + this.createTableQuery(tableName, attributes)
      + `INSERT INTO ${quotedTableName} SELECT ${attributeNamesExport} FROM ${quotedBackupTableName};`
      + `DROP TABLE ${quotedBackupTableName};`;
  }

  /**
   * return a query to start transaction
   */
  public startTransactionQuery(transaction : Transaction) : string {
    if (transaction.parent) {
      return 'SAVEPOINT ' + this.quoteIdentifier(transaction.name) + ';';
    }

    return 'BEGIN ' + transaction.options.type + ' TRANSACTION;';
  }

  public setAutocommitQuery() {
    // SQLite does not support SET autocommit
    return null;
  }

  public setIsolationLevelQuery(value : any) : string {
    switch (value) {
      case Transaction.ISOLATION_LEVELS.REPEATABLE_READ:
        return '-- SQLite is not able to choose the isolation level REPEATABLE READ.';
      case Transaction.ISOLATION_LEVELS.READ_UNCOMMITTED:
        return 'PRAGMA read_uncommitted = ON;';
      case Transaction.ISOLATION_LEVELS.READ_COMMITTED:
        return 'PRAGMA read_uncommitted = OFF;';
      case Transaction.ISOLATION_LEVELS.SERIALIZABLE:
        return "-- SQLite's default isolation level is SERIALIZABLE. Nothing to do.";
      default:
        throw new Error('Unknown isolation level: ' + value);
    }
  }

  public replaceBooleanDefaults(sql : string) : string {
    return sql.replace(/DEFAULT '?false'?/g, 'DEFAULT 0').replace(/DEFAULT '?true'?/g, 'DEFAULT 1');
  }

  /**
   * if identifier != *
   * Delete ` from identifier and put it under ``
   */
  public quoteIdentifier(identifier : string) : string {
    if (identifier === '*') {
      return identifier;
    }
    return Utils.addTicks(identifier, '`');
  }

  /**
   * Generates an SQL query that returns all foreign keys of a table.
   *
   * @param tableName The name of the table.
   * @returns The generated sql query.
   */
  public getForeignKeysQuery(tableName : string) : string {
    return `PRAGMA foreign_key_list(${tableName})`;
  }

  /**
   * Declaration void as main class is abstract
   */
  public dropForeignKeyQuery() {}
  public changeColumnQuery() {}
}

