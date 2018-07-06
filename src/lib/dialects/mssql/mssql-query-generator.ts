'use strict';

import * as crypto from 'crypto';
import * as _ from 'lodash';
import * as semver from 'semver';
import { Sequelize } from '../../..';
import DataTypes from '../../data-types';
import { Model } from '../../model';
import { IInclude } from '../../model/iinclude';
import { ISequelizeOption } from '../../model/isequelize-option';
import Op from '../../operators';
import { Transaction } from '../../transaction';
import * as AllUtils from '../../utils';
import { AbstractQueryGenerator } from '../abstract/abstract-query-generator';
import { MssqlDialect } from './mssql-dialect';
import TableHints from './table-hints';

const randomBytes = crypto.randomBytes;
const Utils = AllUtils.Utils;

export class MssqlQueryGenerator extends AbstractQueryGenerator {
  constructor(options : { sequelize? : Sequelize, options : ISequelizeOption, _dialect? : MssqlDialect }) {
    super(options);
    this.dialect = 'mssql';
  }

  private throwMethodUndefined(methodName) {
    throw new Error('The method "' + methodName + '" is not defined! Please add it to your sql dialect.');
  }

  /**
   * generate a query to create a schema
   */
  public createSchema(schema : string) : string {
    return [
      'IF NOT EXISTS (SELECT schema_name',
      'FROM information_schema.schemata',
      'WHERE schema_name =', this.wrapSingleQuote(schema), ')',
      'BEGIN',
      "EXEC sp_executesql N'CREATE SCHEMA",
      this.quoteIdentifier(schema),
      ";'",
      'END;',
    ].join(' ');
  }

  /**
   * generate a query to show the schema
   */
  public showSchemasQuery() : string {
    return [
      'SELECT "name" as "schema_name" FROM sys.schemas as s',
      'WHERE "s"."name" NOT IN (',
      "'INFORMATION_SCHEMA', 'dbo', 'guest', 'sys', 'archive'",
      ')', 'AND', '"s"."name" NOT LIKE', "'db_%'",
    ].join(' ');
  }

  public dropSchema(schema : string) {
    // Mimics Postgres CASCADE, will drop objects belonging to the schema
    const quotedSchema = this.wrapSingleQuote(schema);
    return [
      'IF EXISTS (SELECT schema_name',
      'FROM information_schema.schemata',
      'WHERE schema_name =', quotedSchema, ')',
      'BEGIN',
      'DECLARE @id INT, @ms_sql NVARCHAR(2000);',
      'DECLARE @cascade TABLE (',
      'id INT NOT NULL IDENTITY PRIMARY KEY,',
      'ms_sql NVARCHAR(2000) NOT NULL );',
      'INSERT INTO @cascade ( ms_sql )',
      "SELECT CASE WHEN o.type IN ('F','PK')",
      "THEN N'ALTER TABLE ['+ s.name + N'].[' + p.name + N'] DROP CONSTRAINT [' + o.name + N']'",
      "ELSE N'DROP TABLE ['+ s.name + N'].[' + o.name + N']' END",
      'FROM sys.objects o',
      'JOIN sys.schemas s on o.schema_id = s.schema_id',
      'LEFT OUTER JOIN sys.objects p on o.parent_object_id = p.object_id',
      "WHERE o.type IN ('F', 'PK', 'U') AND s.name = ", quotedSchema,
      'ORDER BY o.type ASC;',
      'SELECT TOP 1 @id = id, @ms_sql = ms_sql FROM @cascade ORDER BY id;',
      'WHILE @id IS NOT NULL',
      'BEGIN',
      'BEGIN TRY EXEC sp_executesql @ms_sql; END TRY',
      'BEGIN CATCH BREAK; THROW; END CATCH;',
      'DELETE FROM @cascade WHERE id = @id;',
      'SELECT @id = NULL, @ms_sql = NULL;',
      'SELECT TOP 1 @id = id, @ms_sql = ms_sql FROM @cascade ORDER BY id;',
      'END',
      "EXEC sp_executesql N'DROP SCHEMA", this.quoteIdentifier(schema), ";'",
      'END;'].join(' ');
  }

  public versionQuery() : string {
    // Uses string manipulation to convert the MS Maj.Min.Patch.Build to semver Maj.Min.Patch
    return [
      'DECLARE @ms_ver NVARCHAR(20);',
      "SET @ms_ver = REVERSE(CONVERT(NVARCHAR(20), SERVERPROPERTY('ProductVersion')));",
      "SELECT REVERSE(SUBSTRING(@ms_ver, CHARINDEX('.', @ms_ver)+1, 20)) AS 'version'",
    ].join(' ');
  }

  /**
   * generate a query to create a table
   */
  public createTableQuery(tableName : string, attributes : {}, options : {
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
    const query = "IF OBJECT_ID('<%= table %>', 'U') IS NULL CREATE TABLE <%= table %> (<%= attributes %>)";
    const primaryKeys = [];
    const foreignKeys = {};
    const attrStr = [];

    Object.keys(attributes).forEach(attr => {
      const dataType = attributes[attr];
      let match;

      if (_.includes(dataType, 'PRIMARY KEY')) {
        primaryKeys.push(attr);

        if (_.includes(dataType, 'REFERENCES')) {
          // MSSQL doesn't support inline REFERENCES declarations: move to the end
          match = dataType.match(/^(.+) (REFERENCES.*)$/);
          attrStr.push(this.quoteIdentifier(attr) + ' ' + match[1].replace(/PRIMARY KEY/, ''));
          foreignKeys[attr] = match[2];
        } else {
          attrStr.push(this.quoteIdentifier(attr) + ' ' + dataType.replace(/PRIMARY KEY/, ''));
        }
      } else if (_.includes(dataType, 'REFERENCES')) {
        // MSSQL doesn't support inline REFERENCES declarations: move to the end
        match = dataType.match(/^(.+) (REFERENCES.*)$/);
        attrStr.push(this.quoteIdentifier(attr) + ' ' + match[1]);
        foreignKeys[attr] = match[2];
      } else {
        attrStr.push(this.quoteIdentifier(attr) + ' ' + dataType);
      }
    });

    const values = {
      table: this.quoteTable(tableName),
      attributes: attrStr.join(', ')
    };
    const pkString = primaryKeys.map(pk => this.quoteIdentifier(pk)).join(', ');

    if (options.uniqueKeys) {
      Object.keys(options.uniqueKeys).forEach(indexName => {
        const columns = options.uniqueKeys[indexName];
        if (columns.customIndex) {
          if (!_.isString(indexName)) {
            indexName = 'uniq_' + tableName + '_' + columns.fields.join('_');
          }
          values.attributes += `, CONSTRAINT ${this.quoteIdentifier(indexName)} UNIQUE (${columns.fields.map(field => this.quoteIdentifier(field)).join(', ')})`;
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
   * generate a select query to describe the table
   */
  public describeTableQuery(tableName : string, schema : string) : string {
    let sql = [
      'SELECT',
      "c.COLUMN_NAME AS 'Name',",
      "c.DATA_TYPE AS 'Type',",
      "c.CHARACTER_MAXIMUM_LENGTH AS 'Length',",
      "c.IS_NULLABLE as 'IsNull',",
      "COLUMN_DEFAULT AS 'Default',",
      "pk.CONSTRAINT_TYPE AS 'Constraint',",
      "COLUMNPROPERTY(OBJECT_ID(c.TABLE_SCHEMA+'.'+c.TABLE_NAME), c.COLUMN_NAME, 'IsIdentity') as 'IsIdentity'",
      'FROM',
      'INFORMATION_SCHEMA.TABLES t',
      'INNER JOIN',
      'INFORMATION_SCHEMA.COLUMNS c ON t.TABLE_NAME = c.TABLE_NAME AND t.TABLE_SCHEMA = c.TABLE_SCHEMA',
      'LEFT JOIN (SELECT tc.table_schema, tc.table_name, ',
      'cu.column_name, tc.constraint_type ',
      'FROM information_schema.TABLE_CONSTRAINTS tc ',
      'JOIN information_schema.KEY_COLUMN_USAGE  cu ',
      'ON tc.table_schema=cu.table_schema and tc.table_name=cu.table_name ',
      'and tc.constraint_name=cu.constraint_name ',
      'and tc.constraint_type=\'PRIMARY KEY\') pk ',
      'ON pk.table_schema=c.table_schema ',
      'AND pk.table_name=c.table_name ',
      'AND pk.column_name=c.column_name ',
      'WHERE t.TABLE_NAME =', this.wrapSingleQuote(tableName),
    ].join(' ');

    if (schema) {
      sql += 'AND t.TABLE_SCHEMA =' + this.wrapSingleQuote(schema);
    }

    return sql;
  }

  /**
   * generate a query to rename a table
   */
  public renameTableQuery(before : string, after : string) : string {
    const query = 'EXEC sp_rename <%= before %>, <%= after %>;';
    return _.template(query, this._templateSettings)({
      before: this.quoteTable(before),
      after: this.quoteTable(after)
    });
  }

  /**
   * generate a query to show the tables
   */
  public showTablesQuery() : string {
    return 'SELECT TABLE_NAME, TABLE_SCHEMA FROM INFORMATION_SCHEMA.TABLES;';
  }

  /**
   * generate a query to drop a table
   */
  public dropTableQuery(tableName : string) : string {
    const query = "IF OBJECT_ID('<%= table %>', 'U') IS NOT NULL DROP TABLE <%= table %>";
    const values = {
      table: this.quoteTable(tableName)
    };

    return _.template(query, this._templateSettings)(values).trim() + ';';
  }

  /**
   * generate a query to add a column to a table
   */
  public addColumnQuery(table : string, key : string, dataType : { field? : string }) : string {
    // FIXME: attributeToSQL SHOULD be using attributes in addColumnQuery
    //        but instead we need to pass the key along as the field here
    dataType.field = key;

    const query = 'ALTER TABLE <%= table %> ADD <%= attribute %>';
    const attribute = _.template('<%= key %> <%= definition %>', this._templateSettings)({
      key: this.quoteIdentifier(key),
      definition: this.attributeToSQL(dataType, {
        context: 'addColumn'
      })
    });

    return _.template(query, this._templateSettings)({
      table: this.quoteTable(table),
      attribute
    });
  }

  /**
   * generate a query to remove a column of a table
   */
  public removeColumnQuery(tableName : string, attributeName : string) : string {
    const query = 'ALTER TABLE <%= tableName %> DROP COLUMN <%= attributeName %>;';
    return _.template(query, this._templateSettings)({
      tableName: this.quoteTable(tableName),
      attributeName: this.quoteIdentifier(attributeName)
    });
  }

  /**
   * generate a query to change a column of a table
   */
  public changeColumnQuery(tableName : string, attributes : {}) : string {
    const query = 'ALTER TABLE <%= tableName %> <%= query %>;';
    const attrString = [];
    const constraintString = [];

    Object.keys(attributes).forEach(attributeName => {
      if (attributes[attributeName].match(/REFERENCES/)) {
        const definition = attributes[attributeName];
        constraintString.push(_.template('<%= fkName %> FOREIGN KEY (<%= attrName %>) <%= definition %>', this._templateSettings)({
          fkName: this.quoteIdentifier(attributeName + '_foreign_idx'),
          attrName: this.quoteIdentifier(attributeName),
          definition: definition.replace(/.+?(?=REFERENCES)/, '')
        }));
      } else {
        const definition = attributes[attributeName];
        attrString.push(_.template('<%= attrName %> <%= definition %>', this._templateSettings)({
          attrName: this.quoteIdentifier(attributeName),
          definition
        }));
      }
    });

    let finalQuery = '';
    if (attrString.length) {
      finalQuery += 'ALTER COLUMN ' + attrString.join(', ');
      finalQuery += constraintString.length ? ' ' : '';
    }
    if (constraintString.length) {
      finalQuery += 'ADD CONSTRAINT ' + constraintString.join(', ');
    }

    return _.template(query, this._templateSettings)({
      tableName: this.quoteTable(tableName),
      query: finalQuery
    });
  }

  /**
   * generate a query to rename a column of a table
   */
  public renameColumnQuery(tableName : string, attrBefore : {}, attributes : {}) {
    const query = "EXEC sp_rename '<%= tableName %>.<%= before %>', '<%= after %>', 'COLUMN';";
    const newName = Object.keys(attributes)[0];

    return _.template(query, this._templateSettings)({
      tableName: this.quoteTable(tableName),
      before: attrBefore,
      after: newName
    });
  }

  /**
   * generate a bulkInsert query
   */
  public bulkInsertQuery(tableName : string, attrValueHashes : {}, options : {
    fields? : string[],
    /** An object of hook function that are called before and after certain lifecycle events */
    hooks? : boolean,
    ignoreDuplicates? : boolean,
    individualHooks? : boolean,
    /** A function that logs sql queries, or false for no logging */
    logging? : boolean | any,
    model? : typeof Model,
    returning? : boolean,
    /** Additional attributes for the join table */
    through? : {},
    /** Transaction to run query under */
    transaction? : Transaction,
    /**
     * The type of query you are executing. The query type affects how results are formatted before they are passed back.
     * The type is a string, but `Sequelize.QueryTypes` is provided as convenience shortcuts.
     */
    type? : string,
    validate? : boolean,
    updateOnDuplicate? : string[],
  }, attributes : {}) {
    options = options || {};
    attributes = attributes || {};
    const query = 'INSERT INTO <%= table %> (<%= attributes %>)<%= output %> VALUES <%= tuples %>;';
    const emptyQuery = 'INSERT INTO <%= table %><%= output %> DEFAULT VALUES';
    const tuples = [];
    const allAttributes = [];
    const allQueries = [];

    let needIdentityInsertWrapper = false;
    let outputFragment;

    if (options.returning) {
      outputFragment = ' OUTPUT INSERTED.*';
    }

    _.forEach(attrValueHashes, attrValueHash => {
      // special case for empty objects with primary keys
      const fields = Object.keys(attrValueHash);
      const firstAttr = attributes[fields[0]];
      if (fields.length === 1 && firstAttr && firstAttr.autoIncrement && attrValueHash[fields[0]] === null) {
        allQueries.push(emptyQuery);
        return;
      }

      // normal case
      _.forOwn(attrValueHash, (value, key) => {
        if (value !== null && attributes[key] && attributes[key].autoIncrement) {
          needIdentityInsertWrapper = true;
        }

        if (allAttributes.indexOf(key) === -1) {
          if (value === null && attributes[key] && attributes[key].autoIncrement) {
            return;
          }

          allAttributes.push(key);
        }
      });
    });

    if (allAttributes.length > 0) {
      _.forEach(attrValueHashes, attrValueHash => {
        tuples.push('(' +
          allAttributes.map(key =>
            this.escape(attrValueHash[key])).join(',') +
        ')');
      });

      allQueries.push(query);
    }
    const commands = [];
    let offset = 0;
    const batch = Math.floor(250 / (allAttributes.length + 1)) + 1;
    while (offset < Math.max(tuples.length, 1)) {
      const replacements = {
        table: this.quoteTable(tableName),
        attributes: allAttributes.map(attr =>
          this.quoteIdentifier(attr)).join(','),
        tuples: tuples.slice(offset, Math.min(tuples.length, offset + batch)),
        output: outputFragment
      };

      let generatedQuery = _.template(allQueries.join(';'), this._templateSettings)(replacements);
      if (needIdentityInsertWrapper) {
        generatedQuery = [
          'SET IDENTITY_INSERT', this.quoteTable(tableName), 'ON;',
          generatedQuery,
          'SET IDENTITY_INSERT', this.quoteTable(tableName), 'OFF;',
        ].join(' ');
      }
      commands.push(generatedQuery);
      offset += batch;
    }
    return commands.join(';');
  }

  /**
   * generate an update query
   */
  public updateQuery(tableName : string, attrValueHash : {}, where : {}, options : {
    hasTrigger? : boolean,
    /** How many rows to update */
    limit? : number,
    mapToModel? : boolean,
    /** = false, A flag that defines if null values should be passed to SQL queries or not. */
    omitNull? : boolean,
    returning? : boolean
  }, attributes : {}) : any {
    const sql = super.updateQuery(tableName, attrValueHash, where, options, attributes);
    if (options.limit) {
      const updateArgs = `UPDATE TOP(${this.escape(options.limit)})`;
      sql.query = sql.query.replace('UPDATE', updateArgs);
    }
    return sql;
  }

  /**
   * generate an upsert query
   */
  public upsertQuery(tableName : string, insertValues, updateValues, where : {}, model : typeof Model) : string {
    const targetTableAlias = this.quoteTable(`${tableName}_target`);
    const sourceTableAlias = this.quoteTable(`${tableName}_source`);
    const primaryKeysAttrs = [];
    const identityAttrs = [];
    const uniqueAttrs = [];
    const tableNameQuoted = this.quoteTable(tableName);
    let needIdentityInsertWrapper = false;


    //Obtain primaryKeys, uniquekeys and identity attrs from rawAttributes as model is not passed
    Object.keys(model.rawAttributes).forEach(key => {
      if (model.rawAttributes[key].primaryKey) {
        primaryKeysAttrs.push(model.rawAttributes[key].field || key);
      }
      if (model.rawAttributes[key].unique) {
        uniqueAttrs.push(model.rawAttributes[key].field || key);
      }
      if (model.rawAttributes[key].autoIncrement) {
        identityAttrs.push(model.rawAttributes[key].field || key);
      }
    });

    //Add unique indexes defined by indexes option to uniqueAttrs
    for (const index of model.options.indexes) {
      if (index.unique && index.fields) {
        for (const field of index.fields) {
          const fieldName = typeof field === 'string' ? field : field.name || field.attribute;
          if (uniqueAttrs.indexOf(fieldName) === -1 && model.rawAttributes[fieldName]) {
            uniqueAttrs.push(fieldName);
          }
        }
      }
    }

    const updateKeys = Object.keys(updateValues);
    const insertKeys = Object.keys(insertValues);
    const insertKeysQuoted = insertKeys.map(key => this.quoteIdentifier(key)).join(', ');
    const insertValuesEscaped = insertKeys.map(key => this.escape(insertValues[key])).join(', ');
    const sourceTableQuery = `VALUES(${insertValuesEscaped})`; //Virtual Table
    let joinCondition;

    //IDENTITY_INSERT Condition
    identityAttrs.forEach(key => {
      if (updateValues[key] && updateValues[key] !== null) {
        needIdentityInsertWrapper = true;
        /*
         * IDENTITY_INSERT Column Cannot be updated, only inserted
         * http://stackoverflow.com/a/30176254/2254360
         */
      }
    });

    //Filter NULL Clauses
    const clauses = where[Op.or].filter(clause => {
      let valid = true;
      /*
       * Exclude NULL Composite PK/UK. Partial Composite clauses should also be excluded as it doesn't guarantee a single row
       */
      Object.keys(clause).forEach(key => {
        if (!clause[key]) {
          valid = false;
          return;
        }
      });
      return valid;
    });

    /*
     * Generate ON condition using PK(s).
     * If not, generate using UK(s). Else throw error
     */
    const getJoinSnippet = array => {
      return array.map(key => {
        key = this.quoteIdentifier(key);
        return `${targetTableAlias}.${key} = ${sourceTableAlias}.${key}`;
      });
    };

    if (clauses.length === 0) {
      throw new Error('Primary Key or Unique key should be passed to upsert query');
    } else {
      // Search for primary key attribute in clauses -- Model can have two separate unique keys
      Object.keys(clauses).forEach(key => {
        const keys = Object.keys(clauses[key]);
        if (primaryKeysAttrs.indexOf(keys[0]) !== -1) {
          joinCondition = getJoinSnippet(primaryKeysAttrs).join(' AND ');
          return;
        }
      });
      if (!joinCondition) {
        joinCondition = getJoinSnippet(uniqueAttrs).join(' AND ');
      }
    }

    // Remove the IDENTITY_INSERT Column from update
    const updateSnippet = updateKeys.filter(key => {
      if (identityAttrs.indexOf(key) === -1) {
        return true;
      } else {
        return false;
      }
    })
      .map(key => {
        const value = this.escape(updateValues[key]);
        key = this.quoteIdentifier(key);
        return `${targetTableAlias}.${key} = ${value}`;
      }).join(', ');

    const insertSnippet = `(${insertKeysQuoted}) VALUES(${insertValuesEscaped})`;
    let query = `MERGE INTO ${tableNameQuoted} WITH(HOLDLOCK) AS ${targetTableAlias} USING (${sourceTableQuery}) AS ${sourceTableAlias}(${insertKeysQuoted}) ON ${joinCondition}`;
    query += ` WHEN MATCHED THEN UPDATE SET ${updateSnippet} WHEN NOT MATCHED THEN INSERT ${insertSnippet} OUTPUT $action, INSERTED.*;`;
    if (needIdentityInsertWrapper) {
      query = `SET IDENTITY_INSERT ${tableNameQuoted} ON; ${query} SET IDENTITY_INSERT ${tableNameQuoted} OFF;`;
    }
    return query;
  }

  public truncateTableQuery(tableName : string) : string {
    return `TRUNCATE TABLE ${this.quoteTable(tableName)}`;
  }

  /**
   * generate a delete query
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
    /** = {}, Default options for sequelize.sync */
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
  } = {}) {
    const table = this.quoteTable(tableName);
    const query = 'DELETE<%= limit %> FROM <%= table %><%= where %>; SELECT @@ROWCOUNT AS AFFECTEDROWS;';

    where = this.getWhereConditions(where);

    let limit = '';

    if (options.limit) {
      limit = ' TOP(' + this.escape(options.limit) + ')';
    }

    const replacements = {
      limit,
      table,
      where
    };

    if (replacements.where) {
      replacements.where = ' WHERE ' + replacements.where;
    }

    return _.template(query, this._templateSettings)(replacements);
  }

  /**
   * generate a query to show indexes
   */
  public showIndexesQuery(tableName : string) : string {
    const sql = "EXEC sys.sp_helpindex @objname = N'<%= tableName %>';";
    return _.template(sql, this._templateSettings)({
      tableName: this.quoteTable(tableName)
    });
  }

  /**
   * generate a query to show constraints
   */
  public showConstraintsQuery(tableName : string) : string {
    return `EXEC sp_helpconstraint @objname = ${this.escape(this.quoteTable(tableName))};`;
  }

  /**
   * generate a query to remove index
   */
  public removeIndexQuery(tableName : string, indexNameOrAttributes) : string {
    const sql = 'DROP INDEX <%= indexName %> ON <%= tableName %>';
    let indexName = indexNameOrAttributes;

    if (typeof indexName !== 'string') {
      indexName = Utils.underscore(tableName + '_' + indexNameOrAttributes.join('_'));
    }

    const values = {
      tableName: this.quoteIdentifiers(tableName),
      indexName: this.quoteIdentifiers(indexName)
    };

    return _.template(sql, this._templateSettings)(values);
  }

  /**
   * change an attribute to sql
   */
  public attributeToSQL(attribute : {
    autoIncrement? : boolean,
    allowNull? : boolean,
    defaultValue? : any,
    field? : string,
    Model? : typeof Model,
    onDelete? : string,
    onUpdate? : string,
    primaryKey? : string,
    /** An object with reference configurations */
    references? : {
      /** If this column references another table, provide it here as a Model, or a string */
      model? : typeof Model | string,
      /** = 'id', The column of the foreign table that this column references */
      key? : string;
    };
    type? : any,
    unique? : boolean,
    values? : any
  }, options? : { context? : string }) : string {
    if (!_.isPlainObject(attribute)) {
      attribute = {
        type: attribute
      };
    }

    // handle self referential constraints
    if (attribute.references) {

      if (attribute.Model && attribute.Model.tableName === attribute.references.model) {
        this.sequelize.log('MSSQL does not support self referencial constraints, '
          + 'we will remove it but we recommend restructuring your query');
        attribute.onDelete = '';
        attribute.onUpdate = '';
      }
    }

    let template;

    if (attribute.type instanceof DataTypes.ENUM) {
      if (attribute.type.values && !attribute.values) {
        attribute.values = attribute.type.values;
      }

      // enums are a special case
      template = attribute.type.toSql();
      template += ' CHECK (' + this.quoteIdentifier(attribute.field) + ' IN(' + _.map(attribute.values, value => {
        return this.escape(value);
      }).join(', ') + '))';
      return template;
    } else {
      template = attribute.type.toString();
    }

    if (attribute.allowNull === false) {
      template += ' NOT NULL';
    } else if (!attribute.primaryKey && !Utils.defaultValueSchemable(attribute.defaultValue)) {
      template += ' NULL';
    }

    if (attribute.autoIncrement) {
      template += ' IDENTITY(1,1)';
    }

    // Blobs/texts cannot have a defaultValue
    if (attribute.type !== 'TEXT' && attribute.type._binary !== true &&
      Utils.defaultValueSchemable(attribute.defaultValue)) {
      if (attribute.defaultValue instanceof DataTypes.NOW) {
        template += ' DEFAULT ' + DataTypes[this.dialect].NOW().toSql();
      } else {
        template += ' DEFAULT ' + this.escape(attribute.defaultValue);
      }
    }

    if (attribute.unique === true) {
      template += ' UNIQUE';
    }

    if (attribute.primaryKey) {
      template += ' PRIMARY KEY';
    }

    if (attribute.references) {
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
  public attributesToSQL(attributes : {}, options : { context? : string }) : {} {
    const result = {};
    const existingConstraints = [];
    let attribute;

    Object.keys(attributes).forEach(key => {
      attribute = attributes[key];

      if (attribute.references) {

        if (existingConstraints.indexOf(attribute.references.model.toString()) !== -1) {
          // no cascading constraints to a table more than once
          attribute.onDelete = '';
          attribute.onUpdate = '';
        } else {
          existingConstraints.push(attribute.references.model.toString());

          // NOTE: this really just disables cascading updates for all
          //       definitions. Can be made more robust to support the
          //       few cases where MSSQL actually supports them
          attribute.onUpdate = '';
        }

      }

      if (key && !attribute.field) {
        attribute.field = key;
      }
      result[attribute.field || key] = this.attributeToSQL(attribute, options);
    });

    return result;
  }

  public createTrigger() {
    this.throwMethodUndefined('createTrigger');
  }

  public dropTrigger() {
    this.throwMethodUndefined('dropTrigger');
  }

  public renameTrigger() {
    this.throwMethodUndefined('renameTrigger');
  }

  public createFunction() {
    this.throwMethodUndefined('createFunction');
  }

  public dropFunction() {
    this.throwMethodUndefined('dropFunction');
  }

  public renameFunction() {
    this.throwMethodUndefined('renameFunction');
  }

  /**
   * if identifier != *
   * Delete [ , ] and ' from identifier and put it under []
   */
  public quoteIdentifier(identifier : string) : string {
    if (identifier === '*') {
      return identifier;
    }
    return '[' + identifier.replace(/[\[\]']+/g, '') + ']';
  }

  /**
   * Generate common SQL prefix for ForeignKeysQuery.
   * @returns {String}
   */
  public _getForeignKeysQueryPrefix(catalogName? : string) : string {
    return 'SELECT ' +
        'constraint_name = OBJ.NAME, ' +
        'constraintName = OBJ.NAME, ' +
        (catalogName ? `constraintCatalog = '${catalogName}', ` : '') +
        'constraintSchema = SCHEMA_NAME(OBJ.SCHEMA_ID), ' +
        'tableName = TB.NAME, ' +
        'tableSchema = SCHEMA_NAME(TB.SCHEMA_ID), ' +
        (catalogName ? `tableCatalog = '${catalogName}', ` : '') +
        'columnName = COL.NAME, ' +
        'referencedTableSchema = SCHEMA_NAME(RTB.SCHEMA_ID), ' +
        (catalogName ? `referencedCatalog = '${catalogName}', ` : '') +
        'referencedTableName = RTB.NAME, ' +
        'referencedColumnName = RCOL.NAME ' +
        'FROM SYS.FOREIGN_KEY_COLUMNS FKC ' +
        'INNER JOIN SYS.OBJECTS OBJ ON OBJ.OBJECT_ID = FKC.CONSTRAINT_OBJECT_ID ' +
        'INNER JOIN SYS.TABLES TB ON TB.OBJECT_ID = FKC.PARENT_OBJECT_ID ' +
        'INNER JOIN SYS.COLUMNS COL ON COL.COLUMN_ID = PARENT_COLUMN_ID AND COL.OBJECT_ID = TB.OBJECT_ID ' +
        'INNER JOIN SYS.TABLES RTB ON RTB.OBJECT_ID = FKC.REFERENCED_OBJECT_ID ' +
        'INNER JOIN SYS.COLUMNS RCOL ON RCOL.COLUMN_ID = REFERENCED_COLUMN_ID AND RCOL.OBJECT_ID = RTB.OBJECT_ID';
  }

  /**
   * Generates an SQL query that returns all foreign keys details of a table.
   * @param table : string | { tableName? : string, schema? : string}
   * @param catalogName database name
   * @returns {String}
   */
  public getForeignKeysQuery(table : any, catalogName? : string) : string {
    const tableName = table.tableName || table;
    let sql = this._getForeignKeysQueryPrefix(catalogName) +
      ' WHERE TB.NAME =' + this.wrapSingleQuote(tableName);

    if (table.schema) {
      sql += ' AND SCHEMA_NAME(TB.SCHEMA_ID) =' + this.wrapSingleQuote(table.schema);
    }
    return sql;
  }

  /**
   * @param table : string | { tableName? : string, schema? : string}
   */
  public getForeignKeyQuery(table : any, attributeName : string) : string {
    const tableName = table.tableName || table;
    let sql = this._getForeignKeysQueryPrefix() +
      ' WHERE TB.NAME =' + this.wrapSingleQuote(tableName) +
      ' AND COL.NAME =' + this.wrapSingleQuote(attributeName);

    if (table.schema) {
      sql += ' AND SCHEMA_NAME(TB.SCHEMA_ID) =' + this.wrapSingleQuote(table.schema);
    }

    return sql;
  }

  /**
   * generate a query to get primary key constraint
   * @param table : string | { tableName? : string, schema? : string}
   */
  public getPrimaryKeyConstraintQuery(table : any, attributeName : string) : string {
    const tableName = this.wrapSingleQuote(table.tableName || table);
    return [
      'SELECT K.TABLE_NAME AS tableName,',
      'K.COLUMN_NAME AS columnName,',
      'K.CONSTRAINT_NAME AS constraintName',
      'FROM INFORMATION_SCHEMA.TABLE_CONSTRAINTS AS C',
      'JOIN INFORMATION_SCHEMA.KEY_COLUMN_USAGE AS K',
      'ON C.TABLE_NAME = K.TABLE_NAME',
      'AND C.CONSTRAINT_CATALOG = K.CONSTRAINT_CATALOG',
      'AND C.CONSTRAINT_SCHEMA = K.CONSTRAINT_SCHEMA',
      'AND C.CONSTRAINT_NAME = K.CONSTRAINT_NAME',
      'WHERE C.CONSTRAINT_TYPE = \'PRIMARY KEY\'',
      `AND K.COLUMN_NAME = ${this.wrapSingleQuote(attributeName)}`,
      `AND K.TABLE_NAME = ${tableName};`,
    ].join(' ');
  }

  /**
   * generate a query to drop a foreign key
   */
  public dropForeignKeyQuery(tableName : string, foreignKey : string) : string {
    return _.template('ALTER TABLE <%= table %> DROP <%= key %>', this._templateSettings)({
      table: this.quoteTable(tableName),
      key: this.quoteIdentifier(foreignKey)
    });
  }

  /**
   * generate a query to get the default constraint
   */
  public getDefaultConstraintQuery(tableName : string, attributeName : string) : string {
    const sql = 'SELECT name FROM SYS.DEFAULT_CONSTRAINTS ' +
      "WHERE PARENT_OBJECT_ID = OBJECT_ID('<%= table %>', 'U') " +
      "AND PARENT_COLUMN_ID = (SELECT column_id FROM sys.columns WHERE NAME = ('<%= column %>') " +
      "AND object_id = OBJECT_ID('<%= table %>', 'U'));";
    return _.template(sql, this._templateSettings)({
      table: this.quoteTable(tableName),
      column: attributeName
    });
  }

  /**
   * generate a query to drop constraint
   */
  public dropConstraintQuery(tableName : string, constraintName : string) : string {
    const sql = 'ALTER TABLE <%= table %> DROP CONSTRAINT <%= constraint %>;';
    return _.template(sql, this._templateSettings)({
      table: this.quoteTable(tableName),
      constraint: this.quoteIdentifier(constraintName)
    });
  }

  public setAutocommitQuery() : string {
    return '';
  }

  public setIsolationLevelQuery() : void {

  }

  /**
   * generate a transaction id
   */
  public generateTransactionId() : string {
    return randomBytes(10).toString('hex');
  }

  /**
   * generate a query to start transaction
   */
  public startTransactionQuery(transaction : Transaction) : string {
    if (transaction.parent) {
      return 'SAVE TRANSACTION ' + this.quoteIdentifier(transaction.name) + ';';
    }

    return 'BEGIN TRANSACTION;';
  }

  /**
   * generate a query to commit transaction
   */
  public commitTransactionQuery(transaction : Transaction) : string {
    if (transaction.parent) {
      return;
    }

    return 'COMMIT TRANSACTION;';
  }

  /**
   * generate a query to rollback transaction
   */
  public rollbackTransactionQuery(transaction : Transaction) : string {
    if (transaction.parent) {
      return 'ROLLBACK TRANSACTION ' + this.quoteIdentifier(transaction.name) + ';';
    }

    return 'ROLLBACK TRANSACTION;';
  }

  /**
   * generate a query to select from table fragment
   */
  public selectFromTableFragment(options : {
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
    keysEscaped? : boolean,
    /** The maximum count you want to get. */
    limit? : number,
    model? : typeof Model,
    /** An offset value to start from. Only useable with limit! */
    offset? : number,
    /** OrderBy clause */
    order? : any,
    /** Error if no result found */
    rejectOnEmpty? : boolean,
    /** Passes by sub-query ? */
    subQuery? : boolean,
    tableHint? : any,
    tableNames? : string[],
    topLimit? : any,
    topModel? : typeof Model,
    type ? : string,
    /** A hash of search attributes. */
    where? : {}
  }, model, attributes, tables, mainTableAs, where?) {
    let topFragment = '';
    let mainFragment = 'SELECT ' + attributes.join(', ') + ' FROM ' + tables;

    // Handle SQL Server 2008 with TOP instead of LIMIT
    if (semver.valid(this.sequelize.options.databaseVersion) && semver.lt(this.sequelize.options.databaseVersion, '11.0.0')) {
      if (options.limit) {
        topFragment = 'TOP ' + options.limit + ' ';
      }
      if (options.offset) {
        const offset = options.offset || 0;
        const isSubQuery = options.hasIncludeWhere || options.hasIncludeRequired || options.hasMultiAssociation;
        let orders = { mainQueryOrder: [] };
        if (options.order) {
          orders = this.getQueryOrders(options, model, isSubQuery);
        }

        if (!orders.mainQueryOrder.length) {
          orders.mainQueryOrder.push(this.quoteIdentifier(model.primaryKeyField));
        }

        const tmpTable = mainTableAs ? mainTableAs : 'OffsetTable';
        const whereFragment = where ? ' WHERE ' + where : '';

        /*
         * For earlier versions of SQL server, we need to nest several queries
         * in order to emulate the OFFSET behavior.
         *
         * 1. The outermost query selects all items from the inner query block.
         *    This is due to a limitation in SQL server with the use of computed
         *    columns (e.g. SELECT ROW_NUMBER()...AS x) in WHERE clauses.
         * 2. The next query handles the LIMIT and OFFSET behavior by getting
         *    the TOP N rows of the query where the row number is > OFFSET
         * 3. The innermost query is the actual set we want information from
         */
        const fragment = 'SELECT TOP 100 PERCENT ' + attributes.join(', ') + ' FROM ' +
                        '(SELECT ' + topFragment + '*' +
                          ' FROM (SELECT ROW_NUMBER() OVER (ORDER BY ' + orders.mainQueryOrder.join(', ') + ') as row_num, * ' +
                            ' FROM ' + tables + ' AS ' + tmpTable + whereFragment + ')' +
                          ' AS ' + tmpTable + ' WHERE row_num > ' + offset + ')' +
                        ' AS ' + tmpTable;
        return fragment;
      } else {
        mainFragment = 'SELECT ' + topFragment + attributes.join(', ') + ' FROM ' + tables;
      }
    }

    if (mainTableAs) {
      mainFragment += ' AS ' + mainTableAs;
    }

    if (options.tableHint && TableHints[options.tableHint]) {
      mainFragment += ` WITH (${TableHints[options.tableHint]})`;
    }

    return mainFragment;
  }

  /**
   * generate a part of a query to add limit and offset
   */
  public addLimitAndOffset(options : {
    /** Array<String>|Object, A list of the attributes that you want to select, or an object with `include` and `exclude` keys. */
    attributes? : any,
    /** = false, Pass query execution time in milliseconds as second argument to logging function (options.logging). */
    benchmark? : boolean,
    force? : boolean,
    /** Group by clause */
    group? : {},
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
    model? : typeof Model,
    /** An offset value to start from. Only useable with limit! */
    offset? : number,
    /** OrderBy clause */
    order? : any,
    /** Return raw result. */
    raw? : boolean,
    /** Error if no result found */
    rejectOnEmpty? : boolean,
    /** Passes by sub-query ? */
    subQuery? : boolean,
    tableAs? : string,
    tableNames? : string[],
    topLimit? : any,
    topModel? : typeof Model,
    /** Transaction to run query under */
    transaction? : Transaction,
    type ? : string,
    /** A hash of search attributes. */
    where? : {}
  }, model?) : string {
    // Skip handling of limit and offset as postfixes for older SQL Server versions
    if (semver.valid(this.sequelize.options.databaseVersion) && semver.lt(this.sequelize.options.databaseVersion, '11.0.0')) {
      return '';
    }

    const offset = options.offset || 0;
    const isSubQuery = options.hasIncludeWhere || options.hasIncludeRequired || options.hasMultiAssociation;

    let fragment = '';
    let orders : { subQueryOrder? } = {};
    if (options.order) {
      orders = this.getQueryOrders(options, model, isSubQuery);
    }

    if (options.limit || options.offset) {
      if (!(options.order && options.group) && (!options.order || options.include && !orders.subQueryOrder.length)) {
        fragment += options.order && !isSubQuery ? ', ' : ' ORDER BY ';
        fragment += this.quoteTable(options.tableAs || model.name) + '.' + this.quoteIdentifier(model.primaryKeyField);
      }

      if (options.offset || options.limit) {
        fragment += ' OFFSET ' + this.escape(offset) + ' ROWS';
      }

      if (options.limit) {
        fragment += ' FETCH NEXT ' + this.escape(options.limit) + ' ROWS ONLY';
      }
    }

    return fragment;
  }

  /**
   * generate the boolean value of a value
   */
  public booleanValue(value : any) : number {
    return value ? 1 : 0;
  }

  /**
   * Declaration void as main class is abstract
   */
  protected jsonPathExtractionQuery() {}

  /**
   * @hidden
   */
  public wrapSingleQuote(identifier : string) : string {
    return Utils.addTicks(identifier, "'");
  }
}

