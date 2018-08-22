'use strict';

import * as _ from 'lodash';
import * as util from 'util';
import { Sequelize } from '../../..';
import { ISequelizeOption } from '../../interfaces/isequelize-option';
import { Model } from '../../model';
import Op from '../../operators';
import * as AllUtils from '../../utils';
import { AbstractQueryGenerator } from '../abstract/abstract-query-generator';
import { MysqlDialect } from './mysql-dialect';

const Utils = AllUtils.Utils;

export class MysqlQueryGenerator extends AbstractQueryGenerator {

  constructor(options : { sequelize? : Sequelize, options : ISequelizeOption, _dialect? : MysqlDialect }) {
    super(options);
    this.dialect = 'mysql';
    this.OperatorMap[Op.regexp] = 'REGEXP';
    this.OperatorMap[Op.notRegexp] = 'NOT REGEXP';
  }


  /**
   * return a query to create a schema
   */
  public createSchema() : string {
    return 'SHOW TABLES';
  }

  /**
   * return a query to show the schema
   */
  public showSchemasQuery() : string {
    return 'SHOW TABLES';
  }

  public versionQuery() : string {
    return 'SELECT VERSION() as `version`';
  }

  /**
   * return a query to create a table
   */
  public createTableQuery(tableName : string, attributes : {}, options : {
    benchmark? : boolean,
    charset? : string,
    collate? : string,
    comment? : string,
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
    engine? : string,
    force? : boolean,
    /** = false If freezeTableName is true, sequelize will not try to alter the model name to get the table name. Otherwise, the model name will be pluralized */
    freezeTableName? : boolean,
    /** An object of hook function that are called before and after certain lifecycle events */
    hooks? : boolean,
    /** = 'localhost', The host of the relational database. */
    host? : string,
    indexes? : any[],
    /** Set the initial AUTO_INCREMENT value for the table in MySQL. */
    initialAutoIncrement? : string,
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
    /** = true, Set to `false` to make table names and attributes case-insensitive on Postgres and skip double quoting of them.  WARNING: Setting this to false may expose vulnerabilities and is not recommended! */
    quoteIdentifiers? : boolean,
    /** Error if no result found */
    rejectOnEmpty? : boolean,
    /** = false, Use read / write replication. To enable replication, pass an object, with two properties, read and write. */
    replication? : boolean,
    /** Set of flags that control when a query is automatically retried. */
    retry? : { max? : number, match? : any[] },
    rowFormat? : string,
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
    options = _.extend({
      engine: 'InnoDB',
      charset: null,
      rowFormat: null
    }, options || {});

    const query = 'CREATE TABLE IF NOT EXISTS <%= table %> (<%= attributes%>) ENGINE=<%= engine %><%= comment %><%= charset %><%= collation %><%= initialAutoIncrement %><%= rowFormat %>';
    const primaryKeys = [];
    const foreignKeys = {};
    const attrStr = [];

    Object.keys(attributes).forEach(attr => {
      const dataType = attributes[attr];
      let match;

      if (_.includes(dataType, 'PRIMARY KEY')) {
        primaryKeys.push(attr);

        if (_.includes(dataType, 'REFERENCES')) {
          // MySQL doesn't support inline REFERENCES declarations: move to the end
          match = dataType.match(/^(.+) (REFERENCES.*)$/);
          attrStr.push(this.quoteIdentifier(attr) + ' ' + match[1].replace(/PRIMARY KEY/, ''));
          foreignKeys[attr] = match[2];
        } else {
          attrStr.push(this.quoteIdentifier(attr) + ' ' + dataType.replace(/PRIMARY KEY/, ''));
        }
      } else if (_.includes(dataType, 'REFERENCES')) {
        // MySQL doesn't support inline REFERENCES declarations: move to the end
        match = dataType.match(/^(.+) (REFERENCES.*)$/);
        attrStr.push(this.quoteIdentifier(attr) + ' ' + match[1]);
        foreignKeys[attr] = match[2];
      } else {
        attrStr.push(this.quoteIdentifier(attr) + ' ' + dataType);
      }
    });

    const values = {
      table: this.quoteTable(tableName),
      attributes: attrStr.join(', '),
      comment: options.comment && _.isString(options.comment) ? ' COMMENT ' + this.escape(options.comment) : '',
      engine: options.engine,
      charset: options.charset ? ' DEFAULT CHARSET=' + options.charset : '',
      collation: options.collate ? ' COLLATE ' + options.collate : '',
      rowFormat: options.rowFormat ? ' ROW_FORMAT=' + options.rowFormat : '',
      initialAutoIncrement: options.initialAutoIncrement ? ' AUTO_INCREMENT=' + options.initialAutoIncrement : ''
    };
    const pkString = primaryKeys.map(pk => this.quoteIdentifier(pk)).join(', ');

    if (options.uniqueKeys) {
      _.each(options.uniqueKeys, (columns, indexName) => {
        if (columns.customIndex) {
          if (!_.isString(indexName)) {
            indexName = 'uniq_' + tableName + '_' + columns.fields.join('_');
          }
          values.attributes += `, UNIQUE ${this.quoteIdentifier(indexName)} (${columns.fields.map(field => this.quoteIdentifier(field)).join(', ')})`;
        }
      });
    }

    if (pkString.length > 0) {
      values.attributes += `, PRIMARY KEY (${pkString})`;
    }

    Object.keys(foreignKeys).forEach(fkey => {
      values.attributes += ', FOREIGN KEY (' + this.quoteIdentifier(fkey) + ') ' + foreignKeys[fkey];
    });

    return _.template(query, this._templateSettings)(values).trim() + ';';
  }

  /**
   * return a query to show the tables
   */
  public showTablesQuery() : string {
    return 'SHOW TABLES;';
  }

  /**
   * return a query to add a column to a table
   */
  public addColumnQuery(table : string, key : string, dataType : any) : string {
    const definition = this.attributeToSQL(dataType, {
      context: 'addColumn',
      tableName: table,
      foreignKey: key
    });

    return `ALTER TABLE ${this.quoteTable(table)} ADD ${this.quoteIdentifier(key)} ${definition};`;
  }

  /**
   * return a query to remove a column of a table
   */
  public removeColumnQuery(tableName : string, attributeName : string) : string {
    return `ALTER TABLE ${this.quoteTable(tableName)} DROP ${this.quoteIdentifier(attributeName)};`;
  }

  /**
   * return a query to change a column of a table
   */
  public changeColumnQuery(tableName : string, attributes : {}) {
    const attrString = [];
    const constraintString = [];

    Object.keys(attributes).forEach(attributeName => {
      if (attributes[attributeName].match(/REFERENCES/)) {
        let definition = attributes[attributeName];
        const fkName = this.quoteIdentifier(tableName + '_' + attributeName + '_foreign_idx');
        const attrName = this.quoteIdentifier(attributeName);
        definition = definition.replace(/.+?(?=REFERENCES)/, '');
        constraintString.push(`${fkName} FOREIGN KEY (${attrName}) ${definition}`);
      } else {
        attrString.push('`' + attributeName + '` `' + attributeName + '` ' + attributes[attributeName]);
      }
    });

    let finalQuery = '';
    if (attrString.length) {
      finalQuery += 'CHANGE ' + attrString.join(', ');
      finalQuery += constraintString.length ? ' ' : '';
    }
    if (constraintString.length) {
      finalQuery += 'ADD CONSTRAINT ' + constraintString.join(', ');
    }

    return `ALTER TABLE ${this.quoteTable(tableName)} ${finalQuery};`;
  }

  /**
   * return a query to rename a column of a table
   */
  public renameColumnQuery(tableName : string, attrBefore : string, attributes : {}) {
    const attrString = [];

    Object.keys(attributes).forEach(attrName => {
      const definition = attributes[attrName];
      attrString.push('`' + attrBefore + '` `' + attrName + '` ' + definition);
    });

    return `ALTER TABLE ${this.quoteTable(tableName)} CHANGE ${attrString.join(', ')};`;
  }

  /**
   * handle a sequelize method
   */
  public handleSequelizeMethod(smth : any, tableName? : string, factory? : string, options? : {}, prepend?) : string {
    if (smth instanceof AllUtils.Json) {
      // Parse nested object
      if (smth.conditions) {
        const conditions = _.map(this.parseConditionObject(smth.conditions), condition =>
          `${this.quoteIdentifier(_.first(condition.path))}->>'\$.${_.tail(condition.path).join('.')}' = '${condition.value}'`
        );

        return conditions.join(' and ');
      } else if (smth.path) {
        let str;

        // Allow specifying conditions using the sqlite json functions
        if (this._checkValidJsonStatement(smth.path)) {
          str = smth.path;
        } else {
          // Also support json dot notation
          let path = smth.path;
          let startWithDot = true;

          // Convert .number. to [number].
          path = path.replace(/\.(\d+)\./g, '[$1].');
          // Convert .number$ to [number]
          path = path.replace(/\.(\d+)$/, '[$1]');

          path = path.split('.');

          let columnName = path.shift();
          const match = columnName.match(/\[\d+\]$/);
          // If columnName ends with [\d+]
          if (match !== null) {
            path.unshift(columnName.substr(match.index));
            columnName = columnName.substr(0, match.index);
            startWithDot = false;
          }

          str = `${this.quoteIdentifier(columnName)}->>'\$${startWithDot ? '.' : ''}${path.join('.')}'`;
        }

        if (smth.value) {
          str += util.format(' = %s', this.escape(smth.value));
        }

        return str;
      }
    } else if (smth instanceof AllUtils.Cast) {
      if (/timestamp/i.test(smth.type)) {
        smth.type = 'datetime';
      } else if (smth.json && /boolean/i.test(smth.type)) {
        // true or false cannot be casted as booleans within a JSON structure
        smth.type = 'char';
      } else if (/double precision/i.test(smth.type) || /boolean/i.test(smth.type) || /integer/i.test(smth.type)) {
        smth.type = 'decimal';
      } else if (/text/i.test(smth.type)) {
        smth.type = 'char';
      }
    }

    return super.handleSequelizeMethod(smth, tableName, factory, options, prepend);
  }

  /**
   * return the Json value of a value
   */
  public _toJSONValue(value : any) : any {
    // true/false are stored as strings in mysql
    if (typeof value === 'boolean') {
      return value.toString();
    }
    // null is stored as a string in mysql
    if (value === null) {
      return 'null';
    }
    return value;
  }

  /**
   * return an upsert query
   */
  public upsertQuery(tableName : string, insertValues : {}, updateValues : {}, where : {}, model, options : {
    fields? : string[],
    /** An object of hook function that are called before and after certain lifecycle events */
    hooks? : boolean,
    ignoreDuplicates? : boolean
    onDuplicate? : string,
    model? : Model<any, any>,
    /** Return raw result. */
    raw? : boolean,
    /**
     * The type of query you are executing. The query type affects how results are formatted before they are passed back.
     * The type is a string, but `Sequelize.QueryTypes` is provided as convenience shortcuts.
     */
    type? : string
  }) : any {
    options.onDuplicate = 'UPDATE ';

    options.onDuplicate += Object.keys(updateValues).map(key => {
      key = this.quoteIdentifier(key);
      return key + '=VALUES(' + key + ')';
    }).join(', ');

    return this.insertQuery(tableName, insertValues, model.rawAttributes, options);
  }

  public truncateTableQuery(tableName : string) : string {
    return `TRUNCATE ${this.quoteTable(tableName)}`;
  }

  /**
   * return a delete query
   */
  public deleteQuery(tableName : string, where : {}, options : {
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
    model? : Model<any, any>,
    /** = false, A flag that defines if native library shall be used or not. Currently only has an effect for postgres */
    native? : boolean,
    /** = false, A flag that defines if null values should be passed to SQL queries or not. */
    omitNull? : boolean,
    /** = true, String based operator alias, default value is true which will enable all operators alias. Pass object to limit set of aliased operators or false to disable completely. */
    operatorsAliases? : boolean,
    /** sequelize connection pool configuration */
    pool? : {},
    /** The port of the relational database. */
    port? : number,
    /** = 'tcp', The protocol of the relational database. */
    protocol? : string,
    query? : {},
    /** = true, Set to `false` to make table names and attributes case-insensitive on Postgres and skip double quoting of them.  WARNING: Setting this to false may expose vulnerabilities and is not recommended! */
    quoteIdentifiers? : boolean,
    /** = false, Use read / write replication. To enable replication, pass an object, with two properties, read and write. */
    replication? : boolean,
    restartIdentity? : boolean,
    /** Set of flags that control when a query is automatically retried. */
    retry? : { max? : number, match? : any[] },
    ssl? : boolean,
    storage? : string,
    sync? : {},
    /** The timezone used when converting a date from the database into a JavaScript date. */
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
  } = {}, model : Model<any, any>) : string {
    let limit = '';
    let query = 'DELETE FROM ' + this.quoteTable(tableName);

    if (options.limit) {
      limit = ' LIMIT ' + this.escape(options.limit);
    }

    where = this.getWhereConditions(where, null, model, options);

    if (where) {
      query += ' WHERE ' + where;
    }

    return query + limit;
  }

  /**
   * return a query to show indexes
   */
  public showIndexesQuery(tableName : string, options : {
    /** = false, Pass query execution time in milliseconds as second argument to logging function (options.logging). */
    benchmark? : boolean,
    /** The name of the database */
    database? : string,
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
    query? : {}
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
    whereCollection? : {},
  }) : string {
    return 'SHOW INDEX FROM ' + this.quoteTable(tableName) + ((options || {}).database ? ' FROM `' + options.database + '`' : '');
  }

  /**
   * return a query to show constraints
   */
  public showConstraintsQuery(table, constraintName) {
    const tableName = table.tableName || table;
    const schemaName = table.schema;

    let sql = [
      'SELECT CONSTRAINT_CATALOG AS constraintCatalog,',
      'CONSTRAINT_NAME AS constraintName,',
      'CONSTRAINT_SCHEMA AS constraintSchema,',
      'CONSTRAINT_TYPE AS constraintType,',
      'TABLE_NAME AS tableName,',
      'TABLE_SCHEMA AS tableSchema',
      'from INFORMATION_SCHEMA.TABLE_CONSTRAINTS',
      `WHERE table_name='${tableName}'`,
    ].join(' ');

    if (constraintName) {
      sql += ` AND constraint_name = '${constraintName}'`;
    }

    if (schemaName) {
      sql += ` AND TABLE_SCHEMA = '${schemaName}'`;
    }

    return sql + ';';
  }

  /**
   * return a query to remove index
   */
  public removeIndexQuery(tableName : string, indexNameOrAttributes) : string {
    let indexName = indexNameOrAttributes;

    if (typeof indexName !== 'string') {
      indexName = Utils.underscore(tableName + '_' + indexNameOrAttributes.join('_'));
    }

    return `DROP INDEX ${this.quoteIdentifier(indexName)} ON ${this.quoteTable(tableName)}`;
  }

  /**
   * change an attribute to sql
   */
  public attributeToSQL(attribute : {
    after? : string,
    allowNull? : boolean,
    autoIncrement? : boolean,
    defaultValue? : any,
    first?,
    onDelete? : string,
    onUpdate? : string,
    primaryKey? : string,
    /** An object with reference configurations */
    references? : {
      /** If this column references another table, provide it here as a Model, or a string */
      model? : Model<any, any> | string,
      /** = 'id', The column of the foreign table that this column references */
      key? : string;
    };
    type? : any,
    unique? : boolean
  }, options : { context? : string, foreignKey? : string, tableName? : string }) : string {
    if (!_.isPlainObject(attribute)) {
      attribute = {
        type: attribute
      };
    }

    const attributeString = attribute.type.toString({ escape: this.escape.bind(this) });
    let template = attributeString;

    if (attribute.allowNull === false) {
      template += ' NOT NULL';
    }

    if (attribute.autoIncrement) {
      template += ' auto_increment';
    }

    // BLOB/TEXT/GEOMETRY/JSON cannot have a default value
    if (!_.includes(['BLOB', 'TEXT', 'GEOMETRY', 'JSON'], attributeString) && attribute.type._binary !== true && Utils.defaultValueSchemable(attribute.defaultValue)) {
      template += ' DEFAULT ' + this.escape(attribute.defaultValue);
    }

    if (attribute.unique === true) {
      template += ' UNIQUE';
    }

    if (attribute.primaryKey) {
      template += ' PRIMARY KEY';
    }

    if (attribute.first) {
      template += ' FIRST';
    }
    if (attribute.after) {
      template += ' AFTER ' + this.quoteIdentifier(attribute.after);
    }

    if (attribute.references) {

      if (options && options.context === 'addColumn' && options.foreignKey) {
        const attrName = this.quoteIdentifier(options.foreignKey);
        const fkName = this.quoteIdentifier(`${options.tableName}_${attrName}_foreign_idx`);

        template += `, ADD CONSTRAINT ${fkName} FOREIGN KEY (${attrName})`;
      }

      template += ' REFERENCES ' + this.quoteTable((attribute.references.model as string));

      if (attribute.references.key) {
        template += ' (' + this.quoteIdentifier(attribute.references.key) + ')';
      } else {
        template += ' (' + this.quoteIdentifier('id') + ')';
      }

      if (attribute.onDelete) {
        template += ' ON DELETE ' + attribute.onDelete.toUpperCase();
      }

      if (attribute.onUpdate) {
        template += ' ON UPDATE ' + attribute.onUpdate.toUpperCase();
      }
    }

    return template;
  }

  /**
   * change all attributes to sql
   */
  public attributesToSQL(attributes : {}, options : { context? : string }) {
    const result = {};

    Object.keys(attributes).forEach(key => {
      const attribute = attributes[key];
      result[attribute.field || key] = this.attributeToSQL(attribute, options);
    });

    return result;
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

    const jsonFunctionRegex = /^\s*((?:[a-z]+_){0,2}jsonb?(?:_[a-z]+){0,2})\([^)]*\)/i;
    const jsonOperatorRegex = /^\s*(->>?|@>|<@|\?[|&]?|\|{2}|#-)/i;
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

      const operatorMatches = jsonOperatorRegex.exec(string);
      if (operatorMatches) {
        currentIndex += operatorMatches[0].length;
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
    /**
     * Sub paths need to be quoted as ECMAScript identifiers
     *
     * https://bugs.mysql.com/bug.php?id=81896
     */
    const paths = _.toPath(path).map(subPath => Utils.addTicks(subPath, '"'));
    const pathStr = `${['$'].concat(paths).join('.')}`;
    const quotedColumn = this.isIdentifierQuoted(column) ? column : this.quoteIdentifier(column);
    return `(${quotedColumn}->>'${pathStr}')`;
  }

  /**
   * Generates fields for getForeignKeysQuery
   * @returns fields
   * @hidden
   */
  private _getForeignKeysQueryFields() : string {
    return [
      'CONSTRAINT_NAME as constraint_name',
      'CONSTRAINT_NAME as constraintName',
      'CONSTRAINT_SCHEMA as constraintSchema',
      'CONSTRAINT_SCHEMA as constraintCatalog',
      'TABLE_NAME as tableName',
      'TABLE_SCHEMA as tableSchema',
      'TABLE_SCHEMA as tableCatalog',
      'COLUMN_NAME as columnName',
      'REFERENCED_TABLE_SCHEMA as referencedTableSchema',
      'REFERENCED_TABLE_SCHEMA as referencedTableCatalog',
      'REFERENCED_TABLE_NAME as referencedTableName',
      'REFERENCED_COLUMN_NAME as referencedColumnName',
    ].join(',');
  }

  /**
   * Generates an SQL query that returns all foreign keys of a table.
   *
   * @param tableName  The name of the table.
   * @param schemaName The name of the schema.
   * @returns The generated sql query.
   */
  public getForeignKeysQuery(tableName : string, schemaName : string) : string {
    return 'SELECT ' + this._getForeignKeysQueryFields() + ' FROM INFORMATION_SCHEMA.KEY_COLUMN_USAGE where TABLE_NAME = \'' + tableName + /* jshint ignore: line */
      '\' AND CONSTRAINT_NAME!=\'PRIMARY\' AND CONSTRAINT_SCHEMA=\'' + schemaName + '\' AND REFERENCED_TABLE_NAME IS NOT NULL;'; /* jshint ignore: line */
  }

  /**
   * Generates an SQL query that returns the foreign key constraint of a given column.
   * @param  table : { tableName? : string, schema? : string } | string
   */
  public getForeignKeyQuery(table : any, columnName : string) : string {
    const tableName = table.tableName || table;
    const schemaName = table.schema;

    return 'SELECT ' + this._getForeignKeysQueryFields()
      + ' FROM INFORMATION_SCHEMA.KEY_COLUMN_USAGE'
      + ' WHERE (REFERENCED_TABLE_NAME = ' + this.wrapSingleQuote(tableName)
      + (schemaName ? ' AND REFERENCED_TABLE_SCHEMA = ' + this.wrapSingleQuote(schemaName) : '')
      + ' AND REFERENCED_COLUMN_NAME = ' + this.wrapSingleQuote(columnName)
      + ') OR (TABLE_NAME = ' + this.wrapSingleQuote(tableName)
      + (schemaName ? ' AND TABLE_SCHEMA = ' + this.wrapSingleQuote(schemaName) : '')
      + ' AND COLUMN_NAME = ' + this.wrapSingleQuote(columnName)
      + ' AND REFERENCED_TABLE_NAME IS NOT NULL'
      + ')';
  }

  /**
   * Generates an SQL query that removes a foreign key from a table.
   *
   * @param tableName  The name of the table.
   * @param foreignKey The name of the foreign key constraint.
   * @returns The generated sql query.
   */
  public dropForeignKeyQuery(tableName : string, foreignKey : string) : string {
    return 'ALTER TABLE ' + this.quoteTable(tableName) + ' DROP FOREIGN KEY ' + this.quoteIdentifier(foreignKey) + ';';
  }

  /**
   * @hidden
   */
  public wrapSingleQuote(identifier : string) : string {
    return Utils.addTicks(identifier, '\'');
  }
}

