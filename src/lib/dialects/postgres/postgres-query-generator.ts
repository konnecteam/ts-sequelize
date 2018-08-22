'use strict';

import * as _ from 'lodash';
import * as semver from 'semver';
import * as util from 'util';
import { Sequelize } from '../../..';
import DataTypes from '../../data-types';
import { IConfig } from '../../interfaces/iconfig';
import { IInclude } from '../../interfaces/iinclude';
import { ISequelizeOption } from '../../interfaces/isequelize-option';
import { Model } from '../../model';
import { Transaction } from '../../transaction';
import * as AllUtils from '../../utils';
import { AbstractQueryGenerator } from '../abstract/abstract-query-generator';
import { PostgresDialect } from './postgres-dialect';

const Utils = AllUtils.Utils;

export class PostgresQueryGenerator extends AbstractQueryGenerator {

  constructor(options : { sequelize? : Sequelize, options : ISequelizeOption, _dialect? : PostgresDialect }) {
    super(options);
    this.dialect = 'postgres';
  }

  public setSearchPath(searchPath : string) : string {
    return `SET search_path to ${searchPath};`;
  }

  /**
   * return a query to create a schema
   */
  public createSchema(schema : string) : string {
    const databaseVersion = _.get(this, 'sequelize.options.databaseVersion', 0);

    if (databaseVersion && semver.gte(databaseVersion, '9.2.0')) {
      return `CREATE SCHEMA IF NOT EXISTS ${schema};`;
    }

    return `CREATE SCHEMA ${schema};`;
  }

  /**
   * return a query to drop the schema
   */
  public dropSchema(schema : string) : string {
    return `DROP SCHEMA IF EXISTS ${schema} CASCADE;`;
  }

  /**
   * return a query to show the schema
   */
  public showSchemasQuery() : string {
    return "SELECT schema_name FROM information_schema.schemata WHERE schema_name <> 'information_schema' AND schema_name != 'public' AND schema_name !~ E'^pg_';";
  }

  public versionQuery() : string {
    return 'SHOW SERVER_VERSION';
  }

  /**
   * return a query to create a table
   */
  public createTableQuery(tableName : string, attributes : {}, options : {
    comment? : string,
    /** = {}, Define the default search scope to use for this model. Scopes have the same form as the options passed to find / findAll */
    defaultScope? : {},
    force? : boolean,
    /** = false If freezeTableName is true, sequelize will not try to alter the model name to get the table name. Otherwise, the model name will be pluralized */
    freezeTableName? : boolean,
    /** An object of hook function that are called before and after certain lifecycle events */
    hooks? : boolean,
    indexes? : any[],
    /** An object with two attributes, `singular` and `plural`, which are used when this model is associated to others. */
    name? : {
      /** = Utils.pluralize(modelName) */
      plural? : string,
      /** = Utils.singularize(modelName) */
      singular? : string
    },
    /** = false, A flag that defines if null values should be passed to SQL queries or not. */
    omitNull? : boolean,
    /** = false, Calling `destroy` will not delete the model, but instead set a `deletedAt` timestamp if this is true. Needs `timestamps=true` to work */
    paranoid? : boolean,
    /** Error if no result found */
    rejectOnEmpty? : boolean,
    /** The schema that the tables should be created in. This can be overriden for each table in sequelize.define */
    schema? : string,
    schemaDelimiter? : string,
    scopes? : any[],
    sequelize? : Sequelize,
    /** = true Adds createdAt and updatedAt timestamps to the model. */
    timestamps? : boolean,
    /** = false Converts all camelCased columns to underscored if true. Will not affect timestamp fields named explicitly by model options and will not affect fields with explicitly set `field` option */
    underscored? : boolean,
    /** = false Converts camelCased model names to underscored table names if true. Will not change model name if freezeTableName is set to true */
    underscoredAll? : boolean,
    uniqueKeys? : {},
    validate? : boolean,
    whereCollection? : {}
  }) {

    // options = _.extend({
    // }, options || {});

    options = Object.assign({}, options || {});

    //Postgres 9.0 does not support CREATE TABLE IF NOT EXISTS, 9.1 and above do
    const databaseVersion = _.get(this, 'sequelize.options.databaseVersion', 0);
    const attrStr = [];
    let comments = '';

    if (options.comment && _.isString(options.comment)) {
      comments += '; COMMENT ON TABLE <%= table %> IS ' + this.escape(options.comment);
    }

    Object.keys(attributes).forEach(attr => {
      const i = attributes[attr].indexOf('COMMENT');
      if (i !== -1) {
        // Move comment to a separate query
        comments += '; ' + attributes[attr].substring(i);
        attributes[attr] = attributes[attr].substring(0, i);
      }

      const dataType = this.dataTypeMapping(tableName, attr, attributes[attr]);
      attrStr.push(this.quoteIdentifier(attr) + ' ' + dataType);
    });

    const values = {
      table: this.quoteTable(tableName),
      attributes: attrStr.join(', '),
      comments: _.template(comments, this._templateSettings)({ table: this.quoteTable(tableName) })
    };

    if (options.uniqueKeys) {
      Object.keys(options.uniqueKeys).forEach(indexName => {
        const columns = options.uniqueKeys[indexName];
        if (columns.customIndex) {
          values.attributes += `, UNIQUE (${columns.fields.map(field => this.quoteIdentifier(field)).join(', ')})`;
        }
      });
    }

    const pks = _.reduce(attributes, (acc, attribute, key) => {
      if (_.includes(attribute, 'PRIMARY KEY')) {
        acc.push(this.quoteIdentifier(key));
      }
      return acc;
    }, []).join(',');

    if (pks.length > 0) {
      values.attributes += `, PRIMARY KEY (${pks})`;
    }

    return `CREATE TABLE ${databaseVersion === 0 || semver.gte(databaseVersion, '9.1.0') ? 'IF NOT EXISTS ' : ''}${values.table} (${values.attributes})${values.comments};`;
  }

  /**
   * return a query to drop a table
   */
  public dropTableQuery(tableName : string, options? : { cascade? : boolean }) : string {
    options = options || {};
    return `DROP TABLE IF EXISTS ${this.quoteTable(tableName)}${options.cascade ? ' CASCADE' : ''};`;
  }

  /**
   * return a query to show the tables
   */
  public showTablesQuery() : string {
    return "SELECT table_name FROM information_schema.tables WHERE table_schema = 'public' AND table_type LIKE '%TABLE' AND table_name != 'spatial_ref_sys';";
  }

  /**
   * return a select query to describe the table
   */
  public describeTableQuery(tableName : string, schema : string) : string {
    if (!schema) {
      schema = 'public';
    }
    return 'SELECT pk.constraint_type as "Constraint", c.column_name as "Field", ' +
              'c.column_default as "Default", c.is_nullable as "Null", ' +
              '(CASE WHEN c.udt_name = \'hstore\' THEN c.udt_name ELSE c.data_type END) || (CASE WHEN c.character_maximum_length IS NOT NULL THEN \'(\' || c.character_maximum_length || \')\' ELSE \'\' END) as "Type", ' +
              '(SELECT array_agg(e.enumlabel) ' +
              'FROM pg_catalog.pg_type t JOIN pg_catalog.pg_enum e ON t.oid=e.enumtypid ' +
              'WHERE t.typname=c.udt_name) AS "special" ' +
            'FROM information_schema.columns c ' +
            'LEFT JOIN (SELECT tc.table_schema, tc.table_name, ' +
              'cu.column_name, tc.constraint_type ' +
              'FROM information_schema.TABLE_CONSTRAINTS tc ' +
              'JOIN information_schema.KEY_COLUMN_USAGE  cu ' +
              'ON tc.table_schema=cu.table_schema and tc.table_name=cu.table_name ' +
                'and tc.constraint_name=cu.constraint_name ' +
                'and tc.constraint_type=\'PRIMARY KEY\') pk ' +
            'ON pk.table_schema=c.table_schema ' +
            'AND pk.table_name=c.table_name ' +
            'AND pk.column_name=c.column_name ' +
      `WHERE c.table_name = ${this.escape(tableName)} AND c.table_schema = ${this.escape(schema)} `;
  }

  /**
   * Check whether the statmement is json function or simple path
   *
   * @param stmt  The statement to validate
   * @returns true if the given statement is json function
   * @throws {Error} throw if the statement looks like json function but has invalid token
   * @hidden
   */
  private _checkValidJsonStatement(stmt : string) : boolean {
    if (!_.isString(stmt)) {
      return false;
    }

    // https://www.postgresql.org/docs/current/static/functions-json.html
    const jsonFunctionRegex = /^\s*((?:[a-z]+_){0,2}jsonb?(?:_[a-z]+){0,2})\([^)]*\)/i;
    const jsonOperatorRegex = /^\s*(->>?|#>>?|@>|<@|\?[|&]?|\|{2}|#-)/i;
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
   * @param column  The JSON column
   * @param path  The path to extract (optional)
   * @returns The generated sql query
   */
  protected jsonPathExtractionQuery(column : string, path : string | string[]) : string {
    const paths = _.toPath(path);
    const pathStr = this.escape(`{${paths.join(',')}}`);
    const quotedColumn = this.isIdentifierQuoted(column) ? column : this.quoteIdentifier(column);
    return `(${quotedColumn}#>>${pathStr})`;
  }

  /**
   * handle a sequelize method
   */
  public handleSequelizeMethod(smth : any, tableName : string, factory? : any, options? : {
    /** Array<String>|Object, A list of the attributes that you want to select, or an object with `include` and `exclude` keys. */
    attributes? : any,
    /** An object of hook function that are called before and after certain lifecycle events */
    hooks? : boolean,
    /** The maximum count you want to get. */
    limit? : number,
    model? : Model<any, any>,
    /** Specify if we want only one row without using an array */
    plain? : boolean,
    /** Error if no result found */
    rejectOnEmpty? : boolean,
    tableNames? : string[],
    /**
     * The type of query you are executing. The query type affects how results are formatted before they are passed back.
     * The type is a string, but `Sequelize.QueryTypes` is provided as convenience shortcuts.
     */
    type? : string,
    /** A hash of search attributes. */
    where? : {}
  }, prepend? : any) : string {
    if (smth instanceof AllUtils.Json) {
      // Parse nested object
      if (smth.conditions) {
        const conditions = _.map(this.parseConditionObject(smth.conditions), condition =>
          `${this.jsonPathExtractionQuery(_.first(condition.path), _.tail(condition.path))} = '${condition.value}'`
        );

        return conditions.join(' AND ');
      } else if (smth.path) {
        let str;

        // Allow specifying conditions using the postgres json syntax
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
    }
    return super.handleSequelizeMethod(smth, tableName, factory, options, prepend);
  }

  /**
   * return a query to add a column to a table
   */
  public addColumnQuery(table : string, key : string, dataType : { type?, values? }) : string {

    const dbDataType = this.attributeToSQL(dataType, { context: 'addColumn' });
    const definition = this.dataTypeMapping(table, key, dbDataType);
    const quotedKey = this.quoteIdentifier(key);
    const quotedTable = this.quoteTable(this.extractTableDetails(table));

    let query = `ALTER TABLE ${quotedTable} ADD COLUMN ${quotedKey} ${definition};`;

    if (dataType.type && dataType.type instanceof DataTypes.ENUM || dataType instanceof DataTypes.ENUM) {
      query = this.pgEnum(table, key, dataType) + query;
    }

    return query;
  }

  /**
   * return a query to remove a column of a table
   */
  public removeColumnQuery(tableName : string, attributeName : string) : string {
    const quotedTableName = this.quoteTable(this.extractTableDetails(tableName));
    const quotedAttributeName = this.quoteIdentifier(attributeName);
    return `ALTER TABLE ${quotedTableName} DROP COLUMN ${quotedAttributeName};`;
  }

  /**
   * return a query to change a column of a table
   */
  public changeColumnQuery(tableName : string, attributes : any[]) : string {
    const query = 'ALTER TABLE <%= tableName %> ALTER COLUMN <%= query %>;';
    const sql = [];

    Object.keys(attributes).forEach(attributeName => {
      let definition = this.dataTypeMapping(tableName, attributeName, attributes[attributeName]);
      let attrSql = '';

      if (definition.indexOf('NOT NULL') > 0) {
        attrSql += _.template(query, this._templateSettings)({
          tableName: this.quoteTable(tableName),
          query: this.quoteIdentifier(attributeName) + ' SET NOT NULL'
        });

        definition = definition.replace('NOT NULL', '').trim();
      } else if (!definition.match(/REFERENCES/)) {
        attrSql += _.template(query, this._templateSettings)({
          tableName: this.quoteTable(tableName),
          query: this.quoteIdentifier(attributeName) + ' DROP NOT NULL'
        });
      }

      if (definition.indexOf('DEFAULT') > 0) {
        attrSql += _.template(query, this._templateSettings)({
          tableName: this.quoteTable(tableName),
          query: this.quoteIdentifier(attributeName) + ' SET DEFAULT ' + definition.match(/DEFAULT ([^;]+)/)[1]
        });

        definition = definition.replace(/(DEFAULT[^;]+)/, '').trim();
      } else if (!definition.match(/REFERENCES/)) {
        attrSql += _.template(query, this._templateSettings)({
          tableName: this.quoteTable(tableName),
          query: this.quoteIdentifier(attributeName) + ' DROP DEFAULT'
        });
      }

      if (attributes[attributeName].match(/^ENUM\(/)) {
        attrSql += this.pgEnum(tableName, attributeName, attributes[attributeName]);
        definition = definition.replace(/^ENUM\(.+\)/, this.pgEnumName(tableName, attributeName, { schema: false }));
        definition += ' USING (' + this.quoteIdentifier(attributeName) + '::' + this.pgEnumName(tableName, attributeName) + ')';
      }

      if (definition.match(/UNIQUE;*$/)) {
        definition = definition.replace(/UNIQUE;*$/, '');

        attrSql += _.template(query.replace('ALTER COLUMN', ''), this._templateSettings)({
          tableName: this.quoteTable(tableName),
          query: 'ADD CONSTRAINT ' + this.quoteIdentifier(attributeName + '_unique_idx') + ' UNIQUE (' + this.quoteIdentifier(attributeName) + ')'
        });
      }

      if (definition.match(/REFERENCES/)) {
        definition = definition.replace(/.+?(?=REFERENCES)/, '');
        attrSql += _.template(query.replace('ALTER COLUMN', ''), this._templateSettings)({
          tableName: this.quoteTable(tableName),
          query: 'ADD CONSTRAINT ' + this.quoteIdentifier(attributeName + '_foreign_idx') + ' FOREIGN KEY (' + this.quoteIdentifier(attributeName) + ') ' + definition
        });
      } else {
        attrSql += _.template(query, this._templateSettings)({
          tableName: this.quoteTable(tableName),
          query: this.quoteIdentifier(attributeName) + ' TYPE ' + definition
        });
      }

      sql.push(attrSql);
    });

    return sql.join('');
  }

  /**
   * return a query to rename a column of a table
   */
  public renameColumnQuery(tableName : string, attrBefore : string, attributes : {}) : string {

    const attrString = [];

    Object.keys(attributes).forEach(attributeName => {
      attrString.push(_.template('<%= before %> TO <%= after %>', this._templateSettings)({
        before: this.quoteIdentifier(attrBefore),
        after: this.quoteIdentifier(attributeName)
      }));
    });

    return `ALTER TABLE ${this.quoteTable(tableName)} RENAME COLUMN ${attrString.join(', ')};`;
  }

  public fn(fnName : string, tableName : string, parameters : string, body : string, returns : string, language : string) : string {
    fnName = fnName || 'testfunc';
    language = language || 'plpgsql';
    returns = returns ? `RETURNS ${returns}` : '';
    parameters = parameters || '';

    return `CREATE OR REPLACE FUNCTION pg_temp.${fnName}(${parameters}) ${returns} AS $func$ BEGIN ${body} END; $func$ LANGUAGE ${language}; SELECT * FROM pg_temp.${fnName}();`;
  }

  public exceptionFn(fnName : string, tableName : string, parameters, main : string, then : string, when? : string, returns? : string, language? : string) : string {
    when = when || 'unique_violation';

    const body = `${main} EXCEPTION WHEN ${when} THEN ${then};`;

    return this.fn(fnName, tableName, parameters, body, returns, language);
  }

  /**
   * return an upsert query
   */
  public upsertQuery(tableName : string, insertValues : {}, updateValues : {}, where : {}, model : Model<any, any>, options : {
    allowNull? : any[],
    /** = false, Pass query execution time in milliseconds as second argument to logging function (options.logging). */
    benchmark? : boolean,
    databaseVersion? : number,
    /** = {}, Default options for model definitions. See sequelize.define for options */
    define? : {},
    /** The dialect of the database you are connecting to. One of mysql, postgres, sqlite, oracle and mssql. */
    dialect? : string,
    /** = null, If specified, load the dialect library from this path. For example, if you want to use pg.js instead of pg when connecting to a pg database, you should specify 'pg.js' here */
    dialectModulePath? : string,
    /** An object of additional options, which are passed directly to the connection library */
    dialectOptions? : {},
    fields? : string[],
    /** An object of hook function that are called before and after certain lifecycle events */
    hooks? : boolean,
    /** = 'localhost', The host of the relational database. */
    host? : string,
    /** Set the default transaction isolation level */
    isolationLevel? : string,
    /** A function that logs sql queries, or false for no logging */
    logging? : boolean | any,
    model? : Model<any, any>,
    /** = false, A flag that defines if native library shall be used or not. Currently only has an effect for postgres */
    native? : boolean,
    /** = false, A flag that defines if null values should be passed to SQL queries or not. */
    omitNull? : boolean,
    operatorsAlisases? : boolean,
    /** sequelize connection pool configuration */
    pool? : {},
    /** The port of the relational database. */
    port? : number,
    prefix? : string,
    /** = 'tcp', The protocol of the relational database. */
    protocol? : string,
    query? : {},
    /** = true, Set to `false` to make table names and attributes case-insensitive on Postgres and skip double quoting of them.  WARNING: Setting this to false may expose vulnerabilities and is not recommended! */
    quoteIdenifiers? : boolean,
    quoteIdentifiers? : boolean,
    quoteIndentifiers? : boolean,
    /** Return raw result. */
    raw? : boolean,
    /** = false, Use read / write replication. To enable replication, pass an object, with two properties, read and write. */
    replication? : boolean,
    /** Set of flags that control when a query is automatically retried. */
    retry? : { max? : number, match? : any[] },
    ssl? : boolean,
    storage? : string,
    /** = {}, Default options for sequelize.sync */
    sync? : {},
    /** The timezone used when converting a date from the database into a JavaScript date. */
    timezone? : string,
    transactionType? : string,
    /**
     * The type of query you are executing. The query type affects how results are formatted before they are passed back.
     * The type is a string, but `Sequelize.QueryTypes` is provided as convenience shortcuts.
     */
    type? : string,
    typeValidation? : boolean,
    validate? : boolean,
    /** A hash of search attributes. */
    where? : {}
  }) : string {
    const primaryField = this.quoteIdentifier(model.primaryKeyField);

    const upsertOptions = _.defaults({ bindParam: false }, options);
    const insert = this.insertQuery(tableName, insertValues, model.rawAttributes, upsertOptions);
    const update = this.updateQuery(tableName, updateValues, where, upsertOptions, model.rawAttributes);

    insert.query = insert.query.replace('RETURNING *', `RETURNING ${primaryField} INTO primary_key`);
    update.query = update.query.replace('RETURNING *', `RETURNING ${primaryField} INTO primary_key`);

    return this.exceptionFn(
      'sequelize_upsert',
      tableName,
      'OUT created boolean, OUT primary_key text',
      `${insert.query} created := true;`,
      `${update.query}; created := false`
    );
  }

  public truncateTableQuery(tableName : string, options : {
    restartIdentity? : boolean,
    cascade? : boolean
  } = {}) {
    return [
      `TRUNCATE ${this.quoteTable(tableName)}`,
      options.restartIdentity ? ' RESTART IDENTITY' : '',
      options.cascade ? ' CASCADE' : ''].join('');
  }

  /**
   * return a delete query
   */
  public deleteQuery(tableName : string, where : {}, options : {
    cascade? : boolean,
    force? : boolean,
    /** An object of hook function that are called before and after certain lifecycle events */
    hooks? : boolean,
    individualHooks? : boolean,
    /** How many rows to delete */
    limit? : number
    model? : Model<any, any>,
    restartIdentity? : boolean,
    /** = false, If set to true, dialects that support it will use TRUNCATE instead of DELETE FROM. If a table is truncated the where and limit options are ignored */
    truncate? : boolean,
    /**
     * The type of query you are executing. The query type affects how results are formatted before they are passed back.
     * The type is a string, but `Sequelize.QueryTypes` is provided as convenience shortcuts.
     */
    type? : string,
    /** A hash of search attributes. */
    where? : {}
  }, model : Model<any, any>) : string {
    let query;

    options = options || {};

    tableName = this.quoteTable(tableName);

    if (options.truncate === true) {
      query = 'TRUNCATE ' + tableName;

      if (options.restartIdentity) {
        query += ' RESTART IDENTITY';
      }

      if (options.cascade) {
        query += ' CASCADE';
      }

      return query;
    }

    if (_.isUndefined(options.limit)) {
      options.limit = 1;
    }

    const replacements = {
      table: tableName,
      where: this.getWhereConditions(where, null, model, options),
      limit: options.limit ? ' LIMIT ' + this.escape(options.limit) : '',
      primaryKeys: undefined,
      primaryKeysSelection: undefined
    };

    if (options.limit) {
      if (!model) {
        throw new Error('Cannot LIMIT delete without a model.');
      }

      const pks = _.map(_.values(model.primaryKeys), pk => this.quoteIdentifier(pk.field)).join(',');

      replacements.primaryKeys = model.primaryKeyAttributes.length > 1 ? '(' + pks + ')' : pks;
      replacements.primaryKeysSelection = pks;

      query = 'DELETE FROM <%= table %> WHERE <%= primaryKeys %> IN (SELECT <%= primaryKeysSelection %> FROM <%= table %><%= where %><%= limit %>)';
    } else {
      query = 'DELETE FROM <%= table %><%= where %>';
    }

    if (replacements.where) {
      replacements.where = ' WHERE ' + replacements.where;
    }

    return _.template(query, this._templateSettings)(replacements);
  }

  /**
   * return a query to show indexes
   * @param tableName : { tableName : string, schema : string } | string
   */
  public showIndexesQuery(tableName : any) : string {
    let schemaJoin = '';
    let schemaWhere = '';
    if (!_.isString(tableName)) {
      schemaJoin = ', pg_namespace s';
      schemaWhere = ` AND s.oid = t.relnamespace AND s.nspname = '${tableName.schema}'`;
      tableName = tableName.tableName;
    }

    // This is ARCANE!
    return 'SELECT i.relname AS name, ix.indisprimary AS primary, ix.indisunique AS unique, ix.indkey AS indkey, ' +
      'array_agg(a.attnum) as column_indexes, array_agg(a.attname) AS column_names, pg_get_indexdef(ix.indexrelid) ' +
      `AS definition FROM pg_class t, pg_class i, pg_index ix, pg_attribute a${schemaJoin} ` +
      'WHERE t.oid = ix.indrelid AND i.oid = ix.indexrelid AND a.attrelid = t.oid AND ' +
      `t.relkind = 'r' and t.relname = '${tableName}'${schemaWhere} ` +
      'GROUP BY i.relname, ix.indexrelid, ix.indisprimary, ix.indisunique, ix.indkey ORDER BY i.relname;';
  }

  /**
   * return a query to show constraints
   */
  public showConstraintsQuery(tableName : string) : string {
    //Postgres converts camelCased alias to lowercase unless quoted
    return [
      'SELECT constraint_catalog AS "constraintCatalog",',
      'constraint_schema AS "constraintSchema",',
      'constraint_name AS "constraintName",',
      'table_catalog AS "tableCatalog",',
      'table_schema AS "tableSchema",',
      'table_name AS "tableName",',
      'constraint_type AS "constraintType",',
      'is_deferrable AS "isDeferrable",',
      'initially_deferred AS "initiallyDeferred"',
      'from INFORMATION_SCHEMA.table_constraints',
      `WHERE table_name='${tableName}';`,
    ].join(' ');
  }

  /**
   * return a query to remove index
   */
  public removeIndexQuery(tableName : string, indexNameOrAttributes : any) : string {
    let indexName = indexNameOrAttributes;

    if (typeof indexName !== 'string') {
      indexName = Utils.underscore(tableName + '_' + indexNameOrAttributes.join('_'));
    }

    return `DROP INDEX IF EXISTS ${this.quoteIdentifiers(indexName)}`;
  }

  public addLimitAndOffset(options : {
    /** Array<String>|Object, A list of the attributes that you want to select, or an object with `include` and `exclude` keys. */
    attributes? : any,
    /** = false, Pass query execution time in milliseconds as second argument to logging function (options.logging). */
    benchmark? : boolean,
    force? : boolean,
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
    keysEscaped? : boolean,
    /** The maximum count you want to get. */
    limit? : number,
    /** A function that logs sql queries, or false for no logging */
    logging? : boolean | any,
    model? : Model<any, any>,
    /** An offset value to start from. Only useable with limit! */
    offset? : number,
    /** Return raw result. */
    raw? : boolean,
    /** Error if no result found */
    rejectOnEmpty? : boolean,
    /** Passes by sub-query ? */
    subQuery? : boolean,
    tableNames? : string[],
    topLimit? : any,
    topModel? : Model<any, any>,
    /** Transaction to run query under */
    transaction? : Transaction,
    type ? : string,
    /** A hash of search attributes. */
    where? : {}
  }) : string {
    let fragment = '';
    /* eslint-disable */
    if (options.limit != null) {
      fragment += ' LIMIT ' + this.escape(options.limit);
    }
    if (options.offset != null) {
      fragment += ' OFFSET ' + this.escape(options.offset);
    }
    /* eslint-enable */

    return fragment;
  }

  /**
   * change an attribute to sql
   */
  public attributeToSQL(attribute : any, options? : { context? : string }) : string {
    if (!_.isPlainObject(attribute)) {
      attribute = {
        type: attribute
      };
    }

    let type;
    if (
      attribute.type instanceof DataTypes.ENUM ||
      (attribute.type instanceof DataTypes.ARRAY && attribute.type.type instanceof DataTypes.ENUM)
    ) {
      const enumType = attribute.type.type || attribute.type;
      let values = attribute.values;

      if (enumType.values && !attribute.values) {
        values = enumType.values;
      }

      if (Array.isArray(values) && values.length > 0) {
        type = 'ENUM(' + _.map(values, value => this.escape(value)).join(', ') + ')';

        if (attribute.type instanceof DataTypes.ARRAY) {
          type += '[]';
        }

      } else {
        throw new Error("Values for ENUM haven't been defined.");
      }
    }

    if (!type) {
      type = attribute.type;
    }

    let sql = type + '';

    if (attribute.hasOwnProperty('allowNull') && !attribute.allowNull) {
      sql += ' NOT NULL';
    }

    if (attribute.autoIncrement) {
      sql += ' SERIAL';
    }

    if (Utils.defaultValueSchemable(attribute.defaultValue)) {
      if (attribute.defaultValue instanceof DataTypes.NOW) {
        sql += ' DEFAULT ' + DataTypes[this.dialect].NOW().toSql();
      } else {
        sql += ' DEFAULT ' + this.escape(attribute.defaultValue, attribute);
      }
    }

    if (attribute.unique === true) {
      sql += ' UNIQUE';
    }

    if (attribute.primaryKey) {
      sql += ' PRIMARY KEY';
    }

    if (attribute.references) {
      const referencesTable = this.quoteTable(attribute.references.model);
      let referencesKey;

      if (attribute.references.key) {
        referencesKey = this.quoteIdentifiers(attribute.references.key);
      } else {
        referencesKey = this.quoteIdentifier('id');
      }

      sql += ` REFERENCES ${referencesTable} (${referencesKey})`;

      if (attribute.onDelete) {
        sql += ' ON DELETE ' + attribute.onDelete.toUpperCase();
      }

      if (attribute.onUpdate) {
        sql += ' ON UPDATE ' + attribute.onUpdate.toUpperCase();
      }

      if (attribute.references.deferrable) {
        sql += ' ' + attribute.references.deferrable.toString(this);
      }
    }

    return sql;
  }

  public deferConstraintsQuery(options? : { deferrable? : any }) : string {
    return options.deferrable.toString(this);
  }

  public setConstraintQuery(columns? : any [], type? : string) : string {
    let columnFragment = 'ALL';

    if (columns) {
      columnFragment = columns.map(column => this.quoteIdentifier(column)).join(', ');
    }

    return 'SET CONSTRAINTS ' + columnFragment + ' ' + type;
  }

  public setDeferredQuery(columns? : any[]) : string {
    return this.setConstraintQuery(columns, 'DEFERRED');
  }

  public setImmediateQuery(columns? : any[]) : string {
    return this.setConstraintQuery(columns, 'IMMEDIATE');
  }

  public attributesToSQL(attributes : {}, options : { context? : string }) {
    const result = {};

    Object.keys(attributes).forEach(key => {
      const attribute = attributes[key];
      result[attribute.field || key] = this.attributeToSQL(attribute, options);
    });

    return result;
  }

  public createTrigger(tableName : string, triggerName : string, eventType, fireOnSpec, functionName : string, functionParams : any[], optionsArray : {}) : string {

    const decodedEventType = this.decodeTriggerEventType(eventType);
    const eventSpec = this.expandTriggerEventSpec(fireOnSpec);
    const expandedOptions = this.expandOptions(optionsArray);
    const paramList = this.expandFunctionParamList(functionParams);

    return `CREATE ${this.triggerEventTypeIsConstraint(eventType)}TRIGGER ${triggerName}\n`
      + `\t${decodedEventType} ${eventSpec}\n`
      + `\tON ${tableName}\n`
      + `\t${expandedOptions}\n`
      + `\tEXECUTE PROCEDURE ${functionName}(${paramList});`;
  }

  public dropTrigger(tableName : string, triggerName : string) : string {
    return `DROP TRIGGER ${triggerName} ON ${tableName} RESTRICT;`;
  }

  public renameTrigger(tableName : string, oldTriggerName : string, newTriggerName : string) : string {
    return `ALTER TRIGGER ${oldTriggerName} ON ${tableName} RENAME TO ${newTriggerName};`;
  }

  public createFunction(functionName : string, params : any[], returnType : string, language : string, body : string, options : {}) {
    if (!functionName || !returnType || !language || !body) {
      throw new Error('createFunction missing some parameters. Did you pass functionName, returnType, language and body?');
    }

    const paramList = this.expandFunctionParamList(params);
    const indentedBody = body.replace('\n', '\n\t');
    const expandedOptions = this.expandOptions(options);

    return `CREATE FUNCTION ${functionName}(${paramList})\n`
      + `RETURNS ${returnType} AS $func$\n`
      + 'BEGIN\n'
      + `\t${indentedBody}\n`
      + 'END;\n'
      + `$func$ language '${language}'${expandedOptions};`;
  }

  public dropFunction(functionName : string, params : any[]) {
    if (!functionName) {
      throw new Error('requires functionName');
    }
    // RESTRICT is (currently, as of 9.2) default but we'll be explicit
    const paramList = this.expandFunctionParamList(params);
    return `DROP FUNCTION ${functionName}(${paramList}) RESTRICT;`;
  }

  public renameFunction(oldFunctionName : string, params : any[], newFunctionName : string) {
    const paramList = this.expandFunctionParamList(params);
    return `ALTER FUNCTION ${oldFunctionName}(${paramList}) RENAME TO ${newFunctionName};`;
  }

  public databaseConnectionUri(config : IConfig) {
    let uri = config.protocol + '://' + config.user + ':' + config.password + '@' + config.host;
    if (config.port) {
      uri += ':' + config.port;
    }
    uri += '/' + config.database;
    if (config.ssl) {
      uri += '?ssl=' + config.ssl;
    }
    return uri;
  }

  public pgEscapeAndQuote(val : string) : string {
    return this.quoteIdentifier(Utils.removeTicks(this.escape(val), "'"));
  }

  public expandFunctionParamList(params : any[]) : string {
    if (_.isUndefined(params) || !_.isArray(params)) {
      throw new Error('expandFunctionParamList: function parameters array required, including an empty one for no arguments');
    }

    const paramList = [];
    Object.keys(params).forEach(paramKey => {
      const curParam = params[paramKey];
      const paramDef = [];
      if (_.has(curParam, 'type')) {
        if (_.has(curParam, 'direction')) { paramDef.push(curParam.direction); }
        if (_.has(curParam, 'name')) { paramDef.push(curParam.name); }
        paramDef.push(curParam.type);
      } else {
        throw new Error('function or trigger used with a parameter without any type');
      }

      const joined = paramDef.join(' ');
      if (joined) {
        paramList.push(joined);
      }

    });

    return paramList.join(', ');
  }

  public expandOptions(options : { join? }) : string {
    return _.isUndefined(options) || _.isEmpty(options) ?
      '' : '\n\t' + options.join('\n\t');
  }

  public decodeTriggerEventType(eventSpecifier : string) : string {
    const EVENT_DECODER = {
      after: 'AFTER',
      before: 'BEFORE',
      instead_of: 'INSTEAD OF',
      after_constraint: 'AFTER'
    };

    if (!_.has(EVENT_DECODER, eventSpecifier)) {
      throw new Error('Invalid trigger event specified: ' + eventSpecifier);
    }

    return EVENT_DECODER[eventSpecifier];
  }

  public triggerEventTypeIsConstraint(eventSpecifier : string) : string {
    return eventSpecifier === 'after_constraint' ? 'CONSTRAINT ' : '';
  }

  public expandTriggerEventSpec(fireOnSpec : {}) : string {
    if (_.isEmpty(fireOnSpec)) {
      throw new Error('no table change events specified to trigger on');
    }

    return _.map(fireOnSpec, (fireValue, fireKey) => {
      const EVENT_MAP = {
        insert: 'INSERT',
        update: 'UPDATE',
        delete: 'DELETE',
        truncate: 'TRUNCATE'
      };

      if (!_.has(EVENT_MAP, fireValue)) {
        throw new Error('parseTriggerEventSpec: undefined trigger event ' + fireKey);
      }

      let eventSpec = EVENT_MAP[fireValue];
      if (eventSpec === 'UPDATE') {
        if (_.isArray(fireValue) && fireValue.length > 0) {
          eventSpec += ' OF ' + fireValue.join(', ');
        }
      }

      return eventSpec;
    }).join(' OR ');
  }

  public pgEnumName(tableName : string | { schema? : string, tableName? : string }, attr : string, options? : {
    /** = false, Pass query execution time in milliseconds as second argument to logging function (options.logging). */
    benchmark? : boolean,
    databaseVersion? : number,
    /** = {}, Define the default search scope to use for this model. Scopes have the same form as the options passed to find / findAll */
    defaultScope? : {},
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
    schema? : string | boolean,
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
    options = options || {};

    const tableDetails = this.extractTableDetails(tableName, options);
    let enumName = Utils.addTicks(Utils.generateEnumName(tableDetails.tableName, attr), '"');

    // pgListEnums requires the enum name only, without the schema
    if (options.schema !== false && tableDetails.schema) {
      enumName = this.quoteIdentifier(tableDetails.schema) + tableDetails.delimiter + enumName;
    }

    return enumName;
  }

  public pgListEnums(tableName : string | { schema? : string, tableName? : string }, attrName? : string, options? : {}) {
    let enumName = '';
    const tableDetails = this.extractTableDetails(tableName, options);

    if (tableDetails.tableName && attrName) {
      enumName = ' AND t.typname=' + this.pgEnumName(tableDetails.tableName, attrName, { schema: false }).replace(/"/g, "'");
    }

    return 'SELECT t.typname enum_name, array_agg(e.enumlabel ORDER BY enumsortorder) enum_value FROM pg_type t ' +
      'JOIN pg_enum e ON t.oid = e.enumtypid ' +
      'JOIN pg_catalog.pg_namespace n ON n.oid = t.typnamespace ' +
      `WHERE n.nspname = '${tableDetails.schema}'${enumName} GROUP BY 1`;
  }

  public pgEnum(tableName : string | { schema? : string, tableName? : string }, attr : string, dataType : { values? }, options? : {
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
    whereCollection? : {}
  }) {
    const enumName = this.pgEnumName(tableName, attr, options);
    let values;

    if (dataType.values) {
      values = "ENUM('" + dataType.values.join("', '") + "')";
    } else {
      values = dataType.toString().match(/^ENUM\(.+\)/)[0];
    }

    let sql = 'CREATE TYPE ' + enumName + ' AS ' + values + ';';
    if (!!options && options.force === true) {
      sql = this.pgEnumDrop(tableName, attr) + sql;
    }
    return sql;
  }

  public pgEnumAdd(tableName : string | { schema? : string, tableName? : string }, attr : string, value : string, options : {
    after? : string,
    before? : string,
    /** = {}, Define the default search scope to use for this model. Scopes have the same form as the options passed to find / findAll */
    defaultScope? : {},
    /** = false If freezeTableName is true, sequelize will not try to alter the model name to get the table name. Otherwise, the model name will be pluralized */
    freezeTableName? : boolean,
    /** An object of hook function that are called before and after certain lifecycle events */
    hooks? : boolean,
    indexes? : any[],
    /** An object with two attributes, `singular` and `plural`, which are used when this model is associated to others. */
    name? : {
      /** = Utils.pluralize(modelName) */
      plural? : string,
      /** = Utils.singularize(modelName) */
      singular? : string
    },
    /** = false, A flag that defines if null values should be passed to SQL queries or not. */
    omitNull? : boolean,
    /** = false, Calling `destroy` will not delete the model, but instead set a `deletedAt` timestamp if this is true. Needs `timestamps=true` to work */
    paranoid? : boolean,
    /** Error if no result found */
    rejectOnEmpty? : boolean,
    /** The schema that the tables should be created in. This can be overriden for each table in sequelize.define */
    schema? : string,
    schemaDelimiter? : string,
    scopes? : any[],
    sequelize? : Sequelize,
    /** If false do not prepend the query with the search_path (Postgres only) */
    supportsSearchPath? : boolean,
    /** = true Adds createdAt and updatedAt timestamps to the model. */
    timestamps? : boolean,
    /** = false Converts all camelCased columns to underscored if true. Will not affect timestamp fields named explicitly by model options and will not affect fields with explicitly set `field` option */
    underscored? : boolean,
    /** = false Converts camelCased model names to underscored table names if true. Will not change model name if freezeTableName is set to true */
    underscoredAll? : boolean,
    uniqueKeys? : {},
    validate? : {},
    whereCollection? : {},
  }) : string {
    const enumName = this.pgEnumName(tableName, attr);
    let sql = 'ALTER TYPE ' + enumName + ' ADD VALUE ';

    if (semver.gte(this.sequelize.options.databaseVersion, '9.3.0')) {
      sql += 'IF NOT EXISTS ';
    }
    sql += this.escape(value);

    if (options.before) {
      sql += ' BEFORE ' + this.escape(options.before);
    } else if (options.after) {
      sql += ' AFTER ' + this.escape(options.after);
    }

    return sql;
  }

  public pgEnumDrop(tableName : string | { schema? : string, tableName? : string }, attr : string, enumName? : string) : string {
    enumName = enumName || this.pgEnumName(tableName, attr);
    return 'DROP TYPE IF EXISTS ' + enumName + '; ';
  }

  public fromArray(text : string) : any[] {
    text = text.replace(/^{/, '').replace(/}$/, '');
    let matches = text.match(/("(?:\\.|[^"\\\\])*"|[^,]*)(?:\s*,\s*|\s*$)/ig);

    if (matches.length < 1) {
      return [];
    }

    matches = matches.map(m => m.replace(/",$/, '').replace(/,$/, '').replace(/(^"|"$)/, ''));

    return matches.slice(0, -1);
  }

  public padInt(i : number) : string {
    return i < 10 ? '0' + i.toString() : i.toString();
  }

  public dataTypeMapping(tableName : string, attr : string, dataType : string) : string {
    if (_.includes(dataType, 'PRIMARY KEY')) {
      dataType = dataType.replace(/PRIMARY KEY/, '');
    }

    if (_.includes(dataType, 'SERIAL')) {
      if (_.includes(dataType, 'BIGINT')) {
        dataType = dataType.replace(/SERIAL/, 'BIGSERIAL');
        dataType = dataType.replace(/BIGINT/, '');
      } else if (_.includes(dataType, 'SMALLINT')) {
        dataType = dataType.replace(/SERIAL/, 'SMALLSERIAL');
        dataType = dataType.replace(/SMALLINT/, '');
      } else {
        dataType = dataType.replace(/INTEGER/, '');
      }
      dataType = dataType.replace(/NOT NULL/, '');
    }

    if (dataType.match(/^ENUM\(/)) {
      dataType = dataType.replace(/^ENUM\(.+\)/, this.pgEnumName(tableName, attr));
    }

    return dataType;
  }

  /**
   * if identifier != *
   * Delete " from identifier
   * if force = true or options.quoteIdentifier = false or if there is '.' or '->'
   * Put it under ""
   */
  public quoteIdentifier(identifier : string, force? : boolean) : string {
    if (identifier === '*') {
      return identifier;
    }
    if (!force && this.options && this.options.quoteIdentifiers === false && identifier.indexOf('.') === -1 && identifier.indexOf('->') === -1) { // default is `true`
      // In Postgres, if tables or attributes are created double-quoted,
      // they are also case sensitive. If they contain any uppercase
      // characters, they must always be double-quoted. This makes it
      // impossible to write queries in portable SQL if tables are created in
      // this way. Hence, we strip quotes if we don't want case sensitivity.
      return Utils.removeTicks(identifier, '"');
    } else {
      return Utils.addTicks(identifier, '"');
    }
  }

  /**
   * Generates an SQL query that returns all foreign keys of a table.
   *
   * @param tableName The name of the table.
   * @returns The generated sql query.
   */
  public getForeignKeysQuery(tableName : string) : string {
    return 'SELECT conname as constraint_name, pg_catalog.pg_get_constraintdef(r.oid, true) as condef FROM pg_catalog.pg_constraint r ' +
      `WHERE r.conrelid = (SELECT oid FROM pg_class WHERE relname = '${tableName}' LIMIT 1) AND r.contype = 'f' ORDER BY 1;`;
  }

  /**
   * Generate common SQL prefix for getForeignKeyReferencesQuery.
   * @returns {String}
   */
  public _getForeignKeyReferencesQueryPrefix() : string {
    return 'SELECT ' +
        'DISTINCT tc.constraint_name as constraint_name, ' +
        'tc.constraint_schema as constraint_schema, ' +
        'tc.constraint_catalog as constraint_catalog, ' +
        'tc.table_name as table_name,' +
        'tc.table_schema as table_schema,' +
        'tc.table_catalog as table_catalog,' +
        'kcu.column_name as column_name,' +
        'ccu.table_schema  AS referenced_table_schema,' +
        'ccu.table_catalog  AS referenced_table_catalog,' +
        'ccu.table_name  AS referenced_table_name,' +
        'ccu.column_name AS referenced_column_name ' +
      'FROM information_schema.table_constraints AS tc ' +
        'JOIN information_schema.key_column_usage AS kcu ' +
          'ON tc.constraint_name = kcu.constraint_name ' +
        'JOIN information_schema.constraint_column_usage AS ccu ' +
          'ON ccu.constraint_name = tc.constraint_name ';
  }

  /**
   * Generates an SQL query that returns all foreign keys details of a table.
   *
   * As for getForeignKeysQuery is not compatible with getForeignKeyReferencesQuery, so add a new function.
   * @param tableName
   * @param catalogName
   * @param schemaName
   */
  public getForeignKeyReferencesQuery(tableName : string, catalogName : string, schemaName? : string) : string {
    return this._getForeignKeyReferencesQueryPrefix() +
      `WHERE constraint_type = 'FOREIGN KEY' AND tc.table_name = '${tableName}'` +
      (catalogName ? ` AND tc.table_catalog = '${catalogName}'` : '') +
      (schemaName ? ` AND tc.table_schema = '${schemaName}'` : '');
  }

  /**
   * @param table : string | { tableName : string, schema : string }
   */
  public getForeignKeyReferenceQuery(table : any, columnName : string) {
    const tableName = table.tableName || table;
    const schema = table.schema;
    return this._getForeignKeyReferencesQueryPrefix() +
      `WHERE constraint_type = 'FOREIGN KEY' AND tc.table_name='${tableName}' AND  kcu.column_name = '${columnName}'` +
      (schema ? ` AND tc.table_schema = '${schema}'` : '');
  }

  /**
   * Generates an SQL query that removes a foreign key from a table.
   *
   * @param tableName The name of the table.
   * @param foreignKey The name of the foreign key constraint.
   * @returns The generated sql query.
   */
  public dropForeignKeyQuery(tableName : string, foreignKey : string) : string {
    return 'ALTER TABLE ' + this.quoteTable(tableName) + ' DROP CONSTRAINT ' + this.quoteIdentifier(foreignKey) + ';';
  }

  public setAutocommitQuery(value : any, options : { parent? }) {
    if (options.parent) {
      return;
    }

    // POSTGRES does not support setting AUTOCOMMIT = OFF as of 9.4.0
    // Additionally it does not support AUTOCOMMIT at all starting at v9.5
    // The assumption is that it won't be returning in future versions either
    // If you are on a Pg version that is not semver compliant e.g. '9.5.0beta2', which fails due to the 'beta' qualification, then you need to pass
    // the database version as "9.5.0" explicitly through the options param passed when creating the Sequelize instance under the key "databaseVersion"
    // otherwise Pg version "9.4.0" is assumed by default as per Sequelize 3.14.2.
    // For Pg versions that are semver compliant, this is auto-detected upon the first connection.
    if (!value || semver.gte(this.sequelize.options.databaseVersion, '9.4.0')) {
      return;
    }

    return super.setAutocommitQuery(value, options);
  }
}
