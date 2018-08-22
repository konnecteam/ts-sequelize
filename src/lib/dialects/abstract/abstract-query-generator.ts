'use strict';

import * as Dottie from 'dottie';
import * as _ from 'lodash';
import * as semver from 'semver';
import * as util from 'util';
import * as uuid from 'uuid';
import { Sequelize } from '../../..';
import { Association } from '../../associations/base';
import { BelongsTo } from '../../associations/belongs-to';
import { BelongsToMany } from '../../associations/belongs-to-many';
import { HasMany } from '../../associations/has-many';
import { HasOne } from '../../associations/has-one';
import { DataSet } from '../../data-set';
import DataTypes from '../../data-types';
import { IInclude } from '../../interfaces/iinclude';
import { ISequelizeOption } from '../../interfaces/isequelize-option';
import { Model } from '../../model';
import Op from '../../operators';
import { SqlString } from '../../sql-string';
import { Transaction } from '../../transaction';
import * as AllUtils from '../../utils';
import { AbstractDialect } from './abstract-dialect';
const Utils = AllUtils.Utils;

export abstract class AbstractQueryGenerator {
  public _templateSettings =  _.runInContext().templateSettings;
  public options : ISequelizeOption;
  public _dialect : AbstractDialect;
  public sequelize : Sequelize;
  public dialect : string;
  public typeValidation : boolean;

  constructor(options : { sequelize? : Sequelize, options : ISequelizeOption, _dialect? : AbstractDialect }) {
    this.sequelize = options.sequelize;
    this.options = options.options;
    this._dialect = options._dialect;
  }

  /**
   * extract the details of the table
   * @param tableName : { schema? : string, tableName?, delimiter? :string } | string
   */
  public extractTableDetails(tableName : any, options? : {
    /** The schema that the tables should be created in. This can be overriden for each table in sequelize.define */
    schema? : boolean | string,
    delimiter? : string
  }) : { schema : string, tableName : string, delimiter : string } {
    options = options || {};
    tableName = tableName || {};
    return {
      schema: tableName.schema || options.schema || 'public',
      tableName: _.isPlainObject(tableName) ? tableName.tableName : tableName,
      delimiter: tableName.delimiter || options.delimiter || '.'
    };
  }

  /**
   * return the table name if there is no schema and an object with some attributes if there is one
   */
  public addSchema(param : Model<any, any> | any) : any  {
    const self = this;

    if (!param._schema) {
      return param.tableName || param;
    }

    return {
      tableName: param.tableName || param,
      table: param.tableName || param,
      name: param.name || param,
      schema: param._schema,
      delimiter: param._schemaDelimiter || '.',
      toString() {
        return self.quoteTable(this);
      }
    };
  }

  /**
   * return a query to drop the schema
   */
  public dropSchema(tableName : string, options? : {}) : string {
    return this.dropTableQuery(tableName, options);
  }

  /**
   * return a query to describe the table
   */
  public describeTableQuery(tableName : string, schema : string, schemaDelimiter : string) : string {
    const table = this.quoteTable(
      this.addSchema({
        tableName,
        _schema: schema,
        _schemaDelimiter: schemaDelimiter
      })
    );

    return `DESCRIBE ${table};`;
  }

  /**
   * return a query to drop the schema
   */
  public dropTableQuery(tableName : string, options? : {
    /** = false, Pass query execution time in milliseconds as second argument to logging function (options.logging). */
    benchmark? : boolean,
    /** = false, Also drop all objects depending on this table, such as views. Only works in postgres */
    cascade? : boolean,
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
    return `DROP TABLE IF EXISTS ${this.quoteTable(tableName)};`;
  }

  /**
   * return a query to rename the table
   */
  public renameTableQuery(before : string, after : string) : string {
    return `ALTER TABLE ${this.quoteTable(before)} RENAME TO ${this.quoteTable(after)};`;
  }

 /**
  * Returns an insert into command. Parameters: table name + hash of attribute-value-pairs.
  */
  public insertQuery(table : string, valueHash : { createdAt? : Date, id? : number, updatedAt? : Date, [key : string] : any }, modelAttributes : {}, options : {
    bindParam? : boolean,
    defaultFields? : string[],
    fields? : string[],
    exception? : any,
    hasTrigger? : boolean,
    /** An object of hook function that are called before and after certain lifecycle events */
    hooks? : boolean,
    ignoreDuplicates? : boolean
    onDuplicate? : string,
    returning? : boolean,
    searchPath? : boolean,
    validate? : boolean
  }) {
    options = options || {};
    _.defaults(options, this.options);

    const modelAttributeMap = {};
    const fields = [];
    const values = [];
    const bind = [];
    const bindParam = options.bindParam === undefined ? this.bindParam(bind) : options.bindParam;
    let query;
    let valueQuery = '<%= tmpTable %>INSERT<%= ignoreDuplicates %> INTO <%= table %> (<%= attributes %>)<%= output %> VALUES (<%= values %>)';
    let emptyQuery = '<%= tmpTable %>INSERT<%= ignoreDuplicates %> INTO <%= table %><%= output %>';
    let outputFragment;
    let identityWrapperRequired = false;
    let tmpTable = '';         //tmpTable declaration for trigger

    if (modelAttributes) {
      Object.keys(modelAttributes).forEach(key => {
        const attribute = modelAttributes[key];
        modelAttributeMap[key] = attribute;
        if (attribute.field) {
          modelAttributeMap[attribute.field] = attribute;
        }
      });
    }

    if (this._dialect.supports['DEFAULT VALUES']) {
      emptyQuery += ' DEFAULT VALUES';
    } else if (this._dialect.supports['VALUES ()']) {
      emptyQuery += ' VALUES ()';
    }

    if (this._dialect.supports.returnValues && options.returning) {
      if (this._dialect.supports.returnValues.returning) {
        valueQuery += ' RETURNING *';
        emptyQuery += ' RETURNING *';
      } else if (this._dialect.supports.returnValues.output) {
        outputFragment = ' OUTPUT INSERTED.*';

        //To capture output rows when there is a trigger on MSSQL DB
        if (modelAttributes && options.hasTrigger && this._dialect.supports.tmpTableTrigger) {

          let tmpColumns = '';
          let outputColumns = '';
          tmpTable = 'declare @tmp table (<%= columns %>); ';

          Object.keys(modelAttributes).forEach(modelKey => {
            if (!(modelAttributes[modelKey].type instanceof DataTypes.VIRTUAL)) {
              const attribute = modelAttributes[modelKey];
              if (tmpColumns.length > 0) {
                tmpColumns += ',';
                outputColumns += ',';
              }

              tmpColumns += this.quoteIdentifier(attribute.field) + ' ' + attribute.type.toSql();
              outputColumns += 'INSERTED.' + this.quoteIdentifier(attribute.field);
            }
          });

          const replacement = {
            columns: tmpColumns
          };

          tmpTable = _.template(tmpTable, this._templateSettings)(replacement).trim();
          outputFragment = ' OUTPUT ' + outputColumns + ' into @tmp';
          const selectFromTmp = ';select * from @tmp';

          valueQuery += selectFromTmp;
          emptyQuery += selectFromTmp;
        }
      }
    }

    if (_.get(this, ['sequelize', 'options', 'dialectOptions', 'prependSearchPath']) || options.searchPath) {
      // Not currently supported with search path (requires output of multiple queries)
      options.bindParam = false;
    }

    if (this._dialect.supports.EXCEPTION && options.exception) {
      // Not currently supported with bind parameters (requires output of multiple queries)
      options.bindParam = false;
      // Mostly for internal use, so we expect the user to know what he's doing!
      // pg_temp functions are private per connection, so we never risk this function interfering with another one.
      if (semver.gte(this.sequelize.options.databaseVersion, '9.2.0')) {
        // >= 9.2 - Use a UUID but prefix with 'func_' (numbers first not allowed)
        const delimiter = '$func_' + uuid.v4().replace(/-/g, '') + '$';

        options.exception = 'WHEN unique_violation THEN GET STACKED DIAGNOSTICS sequelize_caught_exception = PG_EXCEPTION_DETAIL;';
        valueQuery = 'CREATE OR REPLACE FUNCTION pg_temp.testfunc(OUT response <%= table %>, OUT sequelize_caught_exception text) RETURNS RECORD AS ' + delimiter +
          ' BEGIN ' + valueQuery + ' INTO response; EXCEPTION ' + options.exception + ' END ' + delimiter +
          ' LANGUAGE plpgsql; SELECT (testfunc.response).*, testfunc.sequelize_caught_exception FROM pg_temp.testfunc(); DROP FUNCTION IF EXISTS pg_temp.testfunc()';
      } else {
        options.exception = 'WHEN unique_violation THEN NULL;';
        valueQuery = 'CREATE OR REPLACE FUNCTION pg_temp.testfunc() RETURNS SETOF <%= table %> AS $body$ BEGIN RETURN QUERY '
        + valueQuery + '; EXCEPTION ' + options.exception + ' END; $body$ LANGUAGE plpgsql; SELECT * FROM pg_temp.testfunc(); DROP FUNCTION IF EXISTS pg_temp.testfunc();';
      }
    }

    if (this._dialect.supports['ON DUPLICATE KEY'] && options.onDuplicate) {
      valueQuery += ' ON DUPLICATE KEY ' + options.onDuplicate;
      emptyQuery += ' ON DUPLICATE KEY ' + options.onDuplicate;
    }

    valueHash = Utils.removeNullValuesFromHash(valueHash, this.options.omitNull);
    Object.keys(valueHash).forEach(key => {
      const value = valueHash[key];
      fields.push(this.quoteIdentifier(key));

      // SERIALS' can't be NULL in postgresql, use DEFAULT where supported
      if (modelAttributeMap && modelAttributeMap[key] && modelAttributeMap[key].autoIncrement === true && !value) {
        if (!this._dialect.supports.autoIncrement.defaultValue) {
          fields.splice(-1, 1);
        } else if (this._dialect.supports.DEFAULT) {
          values.push('DEFAULT');
        } else {
          values.push(this.escape(null));
        }
      } else {
        if (modelAttributeMap && modelAttributeMap[key] && modelAttributeMap[key].autoIncrement === true) {
          identityWrapperRequired = true;
        }

        if (value instanceof AllUtils.SequelizeMethod || options.bindParam === false) {
          values.push(this.escape(value, modelAttributeMap && modelAttributeMap[key] || undefined, { context: 'INSERT' }));
        } else {
          values.push(this.format(value, modelAttributeMap && modelAttributeMap[key] || undefined, { context: 'INSERT' }, bindParam));
        }
      }
    });

    const replacements = {
      ignoreDuplicates: options.ignoreDuplicates ? this._dialect.supports.IGNORE : '',
      table: this.quoteTable(table),
      attributes: fields.join(','),
      output: outputFragment,
      values: values.join(','),
      tmpTable
    };

    query = (replacements.attributes.length ? valueQuery : emptyQuery) + ';';
    if (identityWrapperRequired && this._dialect.supports.autoIncrement.identityInsert) {
      query = [
        'SET IDENTITY_INSERT', this.quoteTable(table), 'ON;',
        query,
        'SET IDENTITY_INSERT', this.quoteTable(table), 'OFF;'].join(' ');
    }

    query = _.template(query, this._templateSettings)(replacements);
    // Used by Postgres upsertQuery and calls to here with options.exception set to true
    const result : { query : string, bind? : any[] } = { query };
    if (options.bindParam !== false) {
      result.bind = bind;
    }
    return result;
  }

  /**
   * Returns an insert into command for multiple values.
   * Parameters: table name + list of hashes of attribute-value-pairs.
   */
  public bulkInsertQuery(tableName : string, fieldValueHashes : any[], options? : {
    fields? : string[],
    /** An object of hook function that are called before and after certain lifecycle events */
    hooks? : boolean,
    ignoreDuplicates? : boolean,
    individualHooks? : boolean,
    /** A function that logs sql queries, or false for no logging */
    logging? : boolean | any,
    model? : Model<any, any>,
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
    updateOnDuplicate? : string[] | boolean,
  }, fieldMappedAttributes? : {}) {
    options = options || {};
    fieldMappedAttributes = fieldMappedAttributes || {};

    const query = 'INSERT<%= ignoreDuplicates %> INTO <%= table %> (<%= attributes %>) VALUES <%= tuples %><%= onDuplicateKeyUpdate %><%= returning %>;';
    const tuples = [];
    const serials = {};
    const allAttributes = [];
    let onDuplicateKeyUpdate = '';

    for (const fieldValueHash of fieldValueHashes) {
      _.forOwn(fieldValueHash, (value, key) => {
        if (allAttributes.indexOf(key) === -1) {
          allAttributes.push(key);
        }
        if (
          fieldMappedAttributes[key]
          && fieldMappedAttributes[key].autoIncrement === true
        ) {
          serials[key] = true;
        }
      });
    }

    for (const fieldValueHash of fieldValueHashes) {
      const values = allAttributes.map(key => {
        if (
          this._dialect.supports.bulkDefault
          && serials[key] === true
        ) {
          return fieldValueHash[key] || 'DEFAULT';
        }

        return this.escape(fieldValueHash[key], fieldMappedAttributes[key], { context: 'INSERT' });
      });

      tuples.push(`(${values.join(',')})`);
    }

    if (this._dialect.supports.updateOnDuplicate && options.updateOnDuplicate) {
      onDuplicateKeyUpdate = ' ON DUPLICATE KEY UPDATE ' + (options.updateOnDuplicate as string[]).map(attr => {
        const key = this.quoteIdentifier(attr);
        return key + '=VALUES(' + key + ')';
      }).join(',');
    }

    const replacements = {
      ignoreDuplicates: options.ignoreDuplicates ? this._dialect.supports.ignoreDuplicates : '',
      table: this.quoteTable(tableName),
      attributes: allAttributes.map(attr => this.quoteIdentifier(attr)).join(','),
      tuples: tuples.join(','),
      onDuplicateKeyUpdate,
      returning: this._dialect.supports.returnValues && options.returning ? ' RETURNING *' : ''
    };

    return _.template(query, this._templateSettings)(replacements);
  }

 /**
  * Returns an update query.
  * @param tableName -> Name of the table
  * @param values -> A hash with attribute-value-pairs
  * @param where -> A hash with conditions (e.g. {name: 'foo'})
  *              OR an ID as integer
  *              OR a string with conditions (e.g. 'name="foo"').
  *              If you use a string, you have to escape it on your own.
  */
  public updateQuery(tableName : string, attrValueHash : {}, where : { length?, [key : string] : any }, options : {
    bindParam? : boolean,
    fields? : string[],
    hasTrigger? : boolean,
    /** An object of hook function that are called before and after certain lifecycle events */
    hooks? : boolean,
    /** How many rows to update */
    limit? : number,
    mapToModel? : boolean,
    model? : Model<any, any>,
    /** = false, A flag that defines if null values should be passed to SQL queries or not. */
    omitNull? : boolean,
    /** Return raw result. */
    raw? : boolean,
    returning? : boolean,
    /**
     * The type of query you are executing. The query type affects how results are formatted before they are passed back.
     * The type is a string, but `Sequelize.QueryTypes` is provided as convenience shortcuts.
     */
    type? : string
  }, attributes? : {}) : any {
    options = options || {};
    _.defaults(options, this.options);

    attrValueHash = Utils.removeNullValuesFromHash(attrValueHash, options.omitNull, options);

    const values = [];
    const bind = [];
    const bindParam = options.bindParam === undefined ? this.bindParam(bind) : options.bindParam;
    const modelAttributeMap = {};
    let query = '<%= tmpTable %>UPDATE <%= table %> SET <%= values %><%= output %> <%= where %>';
    let outputFragment;
    let tmpTable = '';        // tmpTable declaration for trigger
    let selectFromTmp = '';   // Select statement for trigger

    if (this._dialect.supports['LIMIT ON UPDATE'] && options.limit) {
      if (this.dialect !== 'mssql') {
        query += ' LIMIT ' + this.escape(options.limit) + ' ';
      }
    }

    if (this._dialect.supports.returnValues) {
      if (this._dialect.supports.returnValues.output) {
        // we always need this for mssql
        outputFragment = ' OUTPUT INSERTED.*';

        //To capture output rows when there is a trigger on MSSQL DB
        if (attributes && options.hasTrigger && this._dialect.supports.tmpTableTrigger) {
          tmpTable = 'declare @tmp table (<%= columns %>); ';
          let tmpColumns = '';
          let outputColumns = '';

          Object.keys(attributes).forEach(modelKey => {
            if (!(attributes[modelKey].type instanceof DataTypes.VIRTUAL)) {
              const attribute = attributes[modelKey];
              if (tmpColumns.length > 0) {
                tmpColumns += ',';
                outputColumns += ',';
              }

              tmpColumns += this.quoteIdentifier(attribute.field) + ' ' + attribute.type.toSql();
              outputColumns += 'INSERTED.' + this.quoteIdentifier(attribute.field);
            }
          });

          const replacement = {
            columns: tmpColumns
          };

          tmpTable = _.template(tmpTable, this._templateSettings)(replacement).trim();
          outputFragment = ' OUTPUT ' + outputColumns + ' into @tmp';
          selectFromTmp = ';select * from @tmp';

          query += selectFromTmp;
        }
      } else if (this._dialect.supports.returnValues && options.returning) {
        // ensure that the return output is properly mapped to model fields.
        options.mapToModel = true;
        query += ' RETURNING *';
      }
    }

    if (attributes) {
      Object.keys(attributes).forEach(key => {
        const attribute = attributes[key];
        modelAttributeMap[key] = attribute;
        if (attribute.field) {
          modelAttributeMap[attribute.field] = attribute;
        }
      });
    }

    //forin
    for (const key in attrValueHash) {
      if (modelAttributeMap && modelAttributeMap[key] &&
          modelAttributeMap[key].autoIncrement === true &&
          !this._dialect.supports.autoIncrement.update) {
        // not allowed to update identity column
        continue;
      }

      const value = attrValueHash[key];

      if (value instanceof AllUtils.SequelizeMethod || options.bindParam === false) {
        values.push(this.quoteIdentifier(key) + '=' + this.escape(value, modelAttributeMap && modelAttributeMap[key] || undefined, { context: 'UPDATE' }));
      } else {
        values.push(this.quoteIdentifier(key) + '=' + this.format(value, modelAttributeMap && modelAttributeMap[key] || undefined, { context: 'UPDATE' }, bindParam));
      }
    }

    const whereOptions = _.defaults({ bindParam }, options);
    const replacements = {
      table: this.quoteTable(tableName),
      values: values.join(','),
      output: outputFragment,
      where: this.whereQuery(where, whereOptions),
      tmpTable
    };

    if (values.length === 0) {
      return '';
    }

    query = _.template(query, this._templateSettings)(replacements).trim();
    // Used by Postgres upsertQuery and calls to here with options.exception set to true
    const result : { query : string, bind? } = { query };
    if (options.bindParam !== false) {
      result.bind = bind;
    }
    return result;
  }

 /**
  * Returns an update query.
  * @param operator -> String with the arithmetic operator (e.g. '+' or '-')
  * @param tableName -> Name of the table
  * @param values -> A hash with attribute-value-pairs
  * @param where -> A hash with conditions (e.g. {name: 'foo'})
  *              OR an ID as integer
  *              OR a string with conditions (e.g. 'name="foo"').
  *              If you use a string, you have to escape it on your own.
  */
  public arithmeticQuery(operator : string, tableName : string, attrValueHash : { number? : number}, where : { id? : number}, options : {
    /** Array<String>|Object, A list of the attributes that you want to select, or an object with `include` and `exclude` keys. */
    attributes? : {} | any[],
    by? : number,
    increment? : boolean,
    instance? : DataSet<any>,
    mapToModel? : boolean,
    returning? : boolean,
    /** Transaction to run query under */
    transaction? : Transaction,
    /** A hash of search attributes. */
    where? : {}
  }, attributes : {}) {
    options = options || {};
    _.defaults(options, { returning: true });

    attrValueHash = Utils.removeNullValuesFromHash(attrValueHash, this.options.omitNull);

    const values = [];
    let query = 'UPDATE <%= table %> SET <%= values %><%= output %> <%= where %>';
    let outputFragment;

    if (this._dialect.supports.returnValues && options.returning) {
      if (this._dialect.supports.returnValues.returning) {
        options.mapToModel = true;
        query += ' RETURNING *';
      } else if (this._dialect.supports.returnValues.output) {
        outputFragment = ' OUTPUT INSERTED.*';
      }
    }

    Object.keys(attrValueHash).forEach(key => {
      const value = attrValueHash[key];
      values.push(this.quoteIdentifier(key) + '=' + this.quoteIdentifier(key) + operator + ' ' + this.escape(value));
    });

    attributes = attributes || {};
    Object.keys(attributes).forEach(key => {
      const value = attributes[key];
      values.push(this.quoteIdentifier(key) + '=' + this.escape(value));
    });

    const replacements = {
      table: this.quoteTable(tableName),
      values: values.join(','),
      output: outputFragment,
      where: this.whereQuery(where)
    };

    return _.template(query, this._templateSettings)(replacements);
  }

  public nameIndexes(indexes : any[], rawTablename : string | { tableName : string }) {
    if (typeof rawTablename === 'object') {
      // don't include schema in the index name
      rawTablename = rawTablename.tableName;
    }

    return _.map(indexes, index => {
      if (!index.hasOwnProperty('name')) {
        const onlyAttributeNames = index.fields.map(field => typeof field === 'string' ? field : field.name || field.attribute);
        index.name = Utils.underscore(rawTablename + '_' + onlyAttributeNames.join('_'));
      }

      return index;
    });
  }

 /**
  * Returns an add index query.
  * @param tableName -> Name of an existing table, possibly with schema.
  * @param type UNIQUE|FULLTEXT|SPATIAL
  * @param rawTablename, the name of the table, without schema. Used to create the name of the index
  */
  public addIndexQuery(tableName : any, attributes : {}, options? : {
    /** = false, Pass query execution time in milliseconds as second argument to logging function (options.logging). */
    benchmark? : boolean,
    concurrently? : boolean,
    /**
     * An array of attributes as string or as hash.
     * If the attribute is a hash, it must have the following content:
     * - name: The name of the attribute/column
     * - length: An integer. Optional
     * - order: 'ASC' or 'DESC'. Optional
     */
    fields? : any,
    indexName? : string,
    indexType? : string,
    indicesType?,
    /** A function that logs sql queries, or false for no logging */
    logging? : boolean | any,
    method? : string,
    msg? : string,
    /** The name of the index. Default is <table>_<attr1>_<attr2> */
    name? : string,
    operator?,
    parser?
    prefix? : string,
    /** Transaction to run query under */
    transaction? : Transaction,
    /**
     * The type of query you are executing. The query type affects how results are formatted before they are passed back.
     * The type is a string, but `Sequelize.QueryTypes` is provided as convenience shortcuts.
     */
    type? : string,
    unique? : boolean,
    using? : string,
    /** A hash of search attributes. */
    where? : {},
  }, rawTablename? : string) : string {
    options = options || {};

    if (!Array.isArray(attributes)) {
      options = attributes;
      attributes = undefined;
    } else {
      options.fields = attributes;
    }

    // Backwards compatability
    if (options.indexName) {
      options.name = options.indexName;
    }
    if (options.indicesType) {
      options.type = options.indicesType;
    }
    if (options.indexType || options.method) {
      options.using = options.indexType || options.method;
    }

    options.prefix = options.prefix || rawTablename || tableName;
    if (options.prefix && _.isString(options.prefix)) {
      options.prefix = options.prefix.replace(/\./g, '_');
      options.prefix = options.prefix.replace(/(\"|\')/g, '');
    }

    const fieldsSql = options.fields.map(field => {
      if (typeof field === 'string') {
        return this.quoteIdentifier(field);
      } else if (field instanceof AllUtils.SequelizeMethod) {
        return this.handleSequelizeMethod(field);
      } else {
        let result = '';

        if (field.attribute) {
          field.name = field.attribute;
        }

        if (!field.name) {
          throw new Error('The following index field has no name: ' + util.inspect(field));
        }

        result += this.quoteIdentifier(field.name);

        if (this._dialect.supports.index.collate && field.collate) {
          result += ' COLLATE ' + this.quoteIdentifier(field.collate);
        }

        if (this._dialect.supports.index.length && field.length) {
          result += '(' + field.length + ')';
        }

        if (field.order) {
          result += ' ' + field.order;
        }

        return result;
      }
    });

    if (!options.name) {
      // Mostly for cases where addIndex is called directly by the user without an options object (for example in migrations)
      // All calls that go through sequelize should already have a name
      options = this.nameIndexes([options], options.prefix)[0];
    }

    options = Model.prototype._conformIndex(options);

    if (!this._dialect.supports.index.type) {
      delete options.type;
    }

    if (options.where) {
      options.where = this.whereQuery(options.where);
    }

    if (_.isString(tableName)) {
      tableName = this.quoteIdentifiers(tableName);
    } else {
      tableName = this.quoteTable(tableName);
    }

    const concurrently = this._dialect.supports.index.concurrently && options.concurrently ? 'CONCURRENTLY' : undefined;
    let ind;
    if (this._dialect.supports.indexViaAlter) {
      ind = [
        'ALTER TABLE',
        tableName,
        concurrently,
        'ADD',
      ];
    } else {
      ind = ['CREATE'];
    }

    ind = ind.concat(
      options.unique ? 'UNIQUE' : '',
      options.type, 'INDEX',
      !this._dialect.supports.indexViaAlter ? concurrently : undefined,
      this.quoteIdentifiers(options.name),
      this._dialect.supports.index.using === 1 && options.using ? 'USING ' + options.using : '',
      !this._dialect.supports.indexViaAlter ? 'ON ' + tableName : undefined,
      this._dialect.supports.index.using === 2 && options.using ? 'USING ' + options.using : '',
      '(' + fieldsSql.join(', ') + (options.operator ? ' ' + options.operator : '') + ')',
      this._dialect.supports.index.parser && options.parser ? 'WITH PARSER ' + options.parser : undefined,
      this._dialect.supports.index.where && options.where ? options.where : undefined
    );

    return _.compact(ind).join(' ');
  }

  /**
   * return a query to add a constraint on the table
   */
  public addConstraintQuery(tableName : string, options : {}, rawTablename?) : string {
    options = options || {};
    const constraintSnippet = this.getConstraintSnippet(tableName, options);

    if (typeof tableName === 'string') {
      tableName = this.quoteIdentifiers(tableName);
    } else {
      tableName = this.quoteTable(tableName);
    }

    return `ALTER TABLE ${tableName} ADD ${constraintSnippet};`;
  }

  /**
   * return a part of the constraint query
   */
  public getConstraintSnippet(tableName : string, options : {fields?, type? : string, name? : string, where?, defaultValue?, references?, onUpdate?, onDelete?}) : string {
    let constraintSnippet;
    let constraintName;

    const fieldsSql = options.fields.map(field => {
      if (typeof field === 'string') {
        return this.quoteIdentifier(field);
      } else if (field._isSequelizeMethod) {
        return this.handleSequelizeMethod(field);
      } else {
        let result = '';

        if (field.attribute) {
          field.name = field.attribute;
        }

        if (!field.name) {
          throw new Error('The following index field has no name: ' + field);
        }

        result += this.quoteIdentifier(field.name);
        return result;
      }
    });

    const fieldsSqlQuotedString = fieldsSql.join(', ');
    const fieldsSqlString = fieldsSql.join('_');

    switch (options.type.toUpperCase()) {
      case 'UNIQUE':
        constraintName = this.quoteIdentifier(options.name || `${tableName}_${fieldsSqlString}_uk`);
        constraintSnippet = `CONSTRAINT ${constraintName} UNIQUE (${fieldsSqlQuotedString})`;
        break;
      case 'CHECK':
        options.where = this.whereItemsQuery(options.where);
        constraintName = this.quoteIdentifier(options.name || `${tableName}_${fieldsSqlString}_ck`);
        constraintSnippet = `CONSTRAINT ${constraintName} CHECK (${options.where})`;
        break;
      case 'DEFAULT':
        if (options.defaultValue === undefined) {
          throw new Error('Default value must be specifed for DEFAULT CONSTRAINT');
        }

        if (this._dialect.name !== 'mssql') {
          throw new Error('Default constraints are supported only for MSSQL dialect.');
        }

        constraintName = this.quoteIdentifier(options.name || `${tableName}_${fieldsSqlString}_df`);
        constraintSnippet = `CONSTRAINT ${constraintName} DEFAULT (${this.escape(options.defaultValue)}) FOR ${fieldsSql[0]}`;
        break;
      case 'PRIMARY KEY':
        constraintName = this.quoteIdentifier(options.name || `${tableName}_${fieldsSqlString}_pk`);
        constraintSnippet = `CONSTRAINT ${constraintName} PRIMARY KEY (${fieldsSqlQuotedString})`;
        break;
      case 'FOREIGN KEY':
        const references = options.references;
        if (!references || !references.table || !references.field) {
          throw new Error('references object with table and field must be specified');
        }
        constraintName = this.quoteIdentifier(options.name || `${tableName}_${fieldsSqlString}_${references.table}_fk`);
        const referencesSnippet = `${this.quoteTable(references.table)} (${this.quoteIdentifier(references.field)})`;
        constraintSnippet = `CONSTRAINT ${constraintName} `;
        constraintSnippet += `FOREIGN KEY (${fieldsSqlQuotedString}) REFERENCES ${referencesSnippet}`;
        if (options.onUpdate) {
          constraintSnippet += ` ON UPDATE ${options.onUpdate.toUpperCase()}`;
        }
        if (options.onDelete) {
          constraintSnippet += ` ON DELETE ${options.onDelete.toUpperCase()}`;
        }
        break;
      default: throw new Error(`${options.type} is invalid.`);
    }
    return constraintSnippet;
  }

  /**
   * return a query to remove a constraint of a table
   */
  public removeConstraintQuery(tableName : string | { schema? : string, tableName? : string }, constraintName : string) {
    if (typeof tableName === 'string') {
      tableName = this.quoteIdentifiers(tableName);
    } else {
      tableName = this.quoteTable(tableName);
    }

    return `ALTER TABLE ${tableName} DROP CONSTRAINT ${this.quoteIdentifiers(constraintName)}`;
  }

  /**
   * If param is a string, this is the name of the table, so this method call quoteIdentifier (QI) on this, in this case if as = true, the alias is the name of the table to.
   * If param is an object, add the schema to the tableName if there is one.
   * - param : string || param : object && no schema  => Table = QI(param)
   * - param : object, dialect support schema => Table = QI(schema) + '.' + QI(tableName)
   * - param : object, dialect don't support schema => Table = QI(schema + delimiter | '.' + tableName)
   * - as = true => Table = Table + ' AS ' + QI(param | param.as | param.tableName)
   */
  public quoteTable(param : string | { as? : string, name? : string, schema? : string, tableName? : string, delimiter? : string }, as? : boolean | string) : string {
    let table = '';

    if (as === true) {
      if (typeof param === 'object') {
        as = param.as || param.name;
      } else {
        as = param;
      }
    }

    if (typeof param === 'object') {
      if (this._dialect.supports.schemas) {
        if (param.schema) {
          table += this.quoteIdentifier(param.schema) + '.';
        }

        table += this.quoteIdentifier(param.tableName);
      } else {
        if (param.schema) {
          table += param.schema + (param.delimiter || '.');
        }

        table += param.tableName;
        table = this.quoteIdentifier(table);
      }


    } else {
      table = this.quoteIdentifier(param);
    }

    if (as) {
      table += ' AS ' + this.quoteIdentifier(as);
    }
    return table;
  }

 /**
  * Quote an object based on its type. This is a more general version of quoteIdentifiers
  * Strings: should proxy to quoteIdentifiers
  * Arrays:
  *   * Expects array in the form: [<model> (optional), <model> (optional),... String, String (optional)]
  *     Each <model> can be a model, or an object {model: DataSet<any>, as: String}, matching include, or an
  *     association object, or the name of an association.
  *   * Zero or more models can be included in the array and are used to trace a path through the tree of
  *     included nested associations. This produces the correct table name for the ORDER BY/GROUP BY SQL
  *     and quotes it.
  *   * If a single string is appended to end of array, it is quoted.
  *     If two strings appended, the 1st string is quoted, the 2nd string unquoted.
  * Objects:
  *   * If raw is set, that value should be returned verbatim, without quoting
  *   * If fn is set, the string should start with the value of fn, starting paren, followed by
  *     the values of cols (which is assumed to be an array), quoted and joined with ', ',
  *     unless they are themselves objects
  *   * If direction is set, should be prepended
  *
  * Currently this function is only used for ordering / grouping columns and Sequelize.col(), but it could
  * potentially also be used for other places where we want to be able to call SQL functions (e.g. as default values)
  * @hidden
  */
  private quote(collection : any, parent?, connector? : string, options? : { ignoreHM? : boolean, ignoreResult? : boolean, subQuery? : boolean }) : string {
    options = options || { subQuery : false, ignoreHM : false, ignoreResult : false };

    // init
    const validOrderOptions = [
      'ASC',
      'DESC',
      'ASC NULLS LAST',
      'DESC NULLS LAST',
      'ASC NULLS FIRST',
      'DESC NULLS FIRST',
      'NULLS FIRST',
      'NULLS LAST',
    ];

    // default
    connector = connector || '.';

    // just quote as identifiers if string
    if (typeof collection === 'string') {
      if (options.subQuery) {
        return collection;
      } else {
        return this.quoteIdentifiers(collection);
      }
    } else if (Array.isArray(collection)) {
      // iterate through the collection and mutate objects into associations
      collection.forEach((item, index) => {
        const previous = collection[index - 1];
        let previousAssociation;
        let previousModel;

        // set the previous as the parent when previous is undefined or the target of the association
        if (!previous && parent !== undefined) {
          previousModel = parent;
        } else if (previous && previous instanceof Association) {
          previousAssociation = previous;
          previousModel = previous.target;
        }

        // if the previous item is a model, then attempt getting an association
        if (previousModel && previousModel instanceof Model) {
          let model;
          let as;

          if (item instanceof Model) {
            // set
            model = item;
          } else if (_.isPlainObject(item) && item.model && item.model instanceof Model) {
            // set
            model = item.model;
            as = item.as;
          }

          if (model) {
            // set the as to either the through name or the model name
            if (!as && previousAssociation && previousAssociation instanceof Association && previousAssociation.through && previousAssociation.through.model === model) {
              // get from previous association
              item = new Association(previousModel, model, {
                as: model.name
              });
            } else {
              // get association from previous model
              item = previousModel.getAssociationForAlias(model, as);

              // attempt to use the model name if the item is still null
              if (!item) {
                item = previousModel.getAssociationForAlias(model, model.name);
              }
            }

            // make sure we have an association
            if (!(item instanceof Association)) {
              throw new Error(util.format('Unable to find a valid association for model, \'%s\'', model.name));
            }

            if (options.ignoreHM && (item instanceof HasMany || item instanceof BelongsToMany)) {
              options.ignoreResult = true;
            }
          }
        }

        if (typeof item === 'string') {
          // get order index
          const orderIndex = validOrderOptions.indexOf(item.toUpperCase());

          // see if this is an order
          if (index > 0 && orderIndex !== -1) {
            item = this.sequelize.literal(' ' + validOrderOptions[orderIndex]);
          } else if (previousModel && previousModel instanceof Model) {
            // only go down this path if we have preivous model and check only once
            if (previousModel.associations !== undefined && previousModel.associations[item]) {
              // convert the item to an association
              item = previousModel.associations[item];
            } else if (previousModel.rawAttributes !== undefined && previousModel.rawAttributes[item] && item !== previousModel.rawAttributes[item].field) {
              // convert the item attribute from its alias
              item = previousModel.rawAttributes[item].field;
            } else if (
              item.indexOf('.') !== -1
              && previousModel.rawAttributes !== undefined
            ) {
              const itemSplit = item.split('.');

              if (previousModel.rawAttributes[itemSplit[0]].type instanceof DataTypes.JSON) {
                // just quote identifiers for now
                const identifier = this.quoteIdentifiers(previousModel.name  + '.' + previousModel.rawAttributes[itemSplit[0]].field);

                // get path
                const path = itemSplit.slice(1);

                // extract path
                item = this.jsonPathExtractionQuery(identifier, path);

                // literal because we don't want to append the model name when string
                item = this.sequelize.literal(item);
              }
            }
          }
        }

        collection[index] = item;
      }, this);

      // loop through array, adding table names of models to quoted
      const collectionLength = collection.length;
      const tableNames = [];
      let mainItem;
      let i = 0;

      for (i = 0; i < collectionLength - 1; i++) {
        mainItem = collection[i];
        if (typeof mainItem === 'string' || mainItem._modelAttribute || mainItem instanceof AllUtils.SequelizeMethod) {
          break;
        } else if (mainItem instanceof Association) {
          tableNames[i] = mainItem.as;
        }

        if (options.ignoreHM && (mainItem instanceof HasMany || mainItem instanceof BelongsToMany)) {
          options.ignoreResult = true;
        }
      }

      // start building sql
      let sql = '';

      if (i > 0) {
        if (options.subQuery) {
          sql += tableNames.join('.') + '.';
        } else {
          sql += this.quoteIdentifier(tableNames.join(connector)) + '.';
        }
      } else if (typeof collection[0] === 'string' && parent) {
        sql += this.quoteIdentifier(parent.name) + '.';
      }

      let ignoreQuoteSubQuery = false;
      // loop through everything past i and append to the sql
      collection.slice(i).forEach((collectionItem, idx, values) => {

        if (options.subQuery) {
          if (collectionItem.col && idx === 0) {
            // "Col" order by can be on primary model...
            const colParts = collectionItem.col.split('.');
            // PARENT.field (2) PARENT.SUB.field (3)
            if (colParts.length < 3 && colParts[0] === parent.name) {
              ignoreQuoteSubQuery = true;
            }
          }

          if (idx === (values.length - 1)) {
            if (collectionItem.val) {
              sql = `${!ignoreQuoteSubQuery ? this.quoteIdentifier(sql) : sql}${this.quote(collectionItem, parent, connector, options)}`;
            } else {
              sql += this.quote(collectionItem, parent, connector, options);
              if (!ignoreQuoteSubQuery) {
                sql = this.quoteIdentifier(sql);
              }
            }
          } else {
            sql += this.quote(collectionItem, parent, connector, options);
          }
        } else {
          sql += this.quote(collectionItem, parent, connector, options);
        }
      }, this);

      return sql;
    } else if (collection._modelAttribute) {
      return this.quoteTable(collection.Model.name) + '.' + this.quoteIdentifier(collection.fieldName);
    } else if (collection instanceof AllUtils.SequelizeMethod) {
      return this.handleSequelizeMethod(collection);
    } else if (_.isPlainObject(collection) && collection.raw) {
      // simple objects with raw is no longer supported
      throw new Error('The `{raw: "..."}` syntax is no longer supported.  Use `sequelize.literal` instead.');
    } else {
      throw new Error('Unknown structure passed to order / group: ' + util.inspect(collection));
    }
  }

 /**
  * Split an identifier into .-separated tokens and quote each part
  * @param identifiers type string | string[]
  */
  public quoteIdentifiers(identifiers : any, force? : boolean) : string {
    if (identifiers.indexOf('.') !== -1) {
      identifiers = identifiers.split('.');
      return this.quoteIdentifier(identifiers.slice(0, identifiers.length - 1).join('.')) + '.' + this.quoteIdentifier(identifiers[identifiers.length - 1]);
    } else {
      return this.quoteIdentifier(identifiers);
    }
  }

  /**
   * Escape a value (e.g. a string, number or date)
   */
  public escape(value : string | number | Date | any, field? : { type? }, options? : {
    isList? : boolean,
    operation?,
    context? : string
  }) : string {
    options = options || {};

    if (value !== null && value !== undefined) {
      if (value instanceof AllUtils.SequelizeMethod) {
        return this.handleSequelizeMethod(value);
      } else {
        if (field && field.type) {
          this.validate(value, field, options);

          if (field.type.stringify) {
            // Users shouldn't have to worry about these args - just give them a function that takes a single arg
            const simpleEscape = _.partialRight(SqlString.escape, this.options.timezone, this.dialect);

            value = field.type.stringify(value, { escape: simpleEscape, field, timezone: this.options.timezone, operation: options.operation });

            if (field.type.escape === false) {
              // The data-type already did the required escaping
              return value;
            }
          }
        }
      }
    }

    return SqlString.escape(value, this.options.timezone, this.dialect);
  }

  public bindParam(bind) {
    return value => {
      bind.push(value);
      return '$' + bind.length;
    };
  }

  /*
    Returns a bind parameter representation of a value (e.g. a string, number or date)
    @private
  */
  public format(value, field, options, bindParam) {
    options = options || {};

    if (value !== null && value !== undefined) {
      if (value instanceof AllUtils.SequelizeMethod) {
        throw new Error('Cannot pass SequelizeMethod as a bind parameter - use escape instead');
      } else {
        if (field && field.type) {
          this.validate(value, field, options);

          if (field.type.bindParam) {
            return field.type.bindParam(value, { escape: _.identity, field, timezone: this.options.timezone, operation: options.operation, bindParam });
          }
        }
      }
    }

    return bindParam(value);
  }

  /*
    Validate a value against a field specification
    @private
  */
  public validate(value, field, options) {
    if (this.typeValidation && field.type.validate && value) {
      if (options.isList && Array.isArray(value)) {
        for (const item of value) {
          field.type.validate(item, options);
        }
      } else {
        field.type.validate(value, options);
      }
    }
  }

  /**
   * Returns a query for selecting elements in the table <tableName>.
   */
  public selectQuery(tableName : string | any, options? : {
    /** Array<String>|Object, A list of the attributes that you want to select, or an object with `include` and `exclude` keys. */
    attributes? : any,
    /** Group by clause */
    group? : {},
    /** limit on group by - auto-completed */
    groupedLimit?,
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
    /** Having clause */
    having? : {},
    include? : IInclude[],
    includeIgnoreAttributes? : boolean,
    /** Internal map of includes - auto-completed */
    includeMap? : {},
    /** Internal array of attributes - auto-completed */
    includeNames? : string[],
    /** The maximum count you want to get. */
    limit? : number,
    /**
     * Lock the selected rows. Possible options are transaction.LOCK.UPDATE and transaction.LOCK.SHARE. Postgres also supports transaction.LOCK.KEY_SHARE,
     * transaction.LOCK.NO_KEY_UPDATE and specific model locks with joins. See [transaction.LOCK for an example](transaction#lock)
     */
    lock? : any,
    /** Model */
    model? : Model<any, any>,
    /** An offset value to start from. Only useable with limit! */
    offset? : number,
    /** OrderBy clause 'id DESC' */
    order? : any,
    parent? : any,
    /** Specify if we want only one row without using an array */
    plain? : boolean,
    /** Error if no result found */
    rejectOnEmpty? : boolean,
    /** Separate requests if multiple left outer */
    separate?,
    skipLocked? : boolean,
    /** Passes by sub-query ? */
    subQuery? : boolean,
    table? : string,
    tableAs? : string,
    tableNames? : string[],
    topLimit? : any,
    topModel? : Model<any, any>,
    type ? : string,
    /**
     * A hash with conditions (e.g. {name: 'foo'})
     * OR an ID as integer
     * OR a string with conditions (e.g. 'name="foo"').
     * If you use a string, you have to escape it on your own.
     */
    where? : {}
  }, model? : Model<any, any>) : string {
    options = options || {};
    const limit = options.limit;
    const mainQueryItems = [];
    const subQueryItems = [];
    const subQuery = options.subQuery === undefined || (options.separate && options.subQuery) ? limit && options.hasMultiAssociation : options.subQuery;
    const attributes = {
      main: options.attributes && options.attributes.slice(),
      subQuery: null
    };
    const mainTable = {
      name: tableName,
      quotedName: null,
      as: null,
      model
    };
    const topLevelInfo = {
      names: mainTable,
      options,
      subQuery
    };
    let mainJoinQueries = [];
    let subJoinQueries = [];
    let query;

    // resolve table name options
    if (options.tableAs) {
      mainTable.as = this.quoteIdentifier(options.tableAs);
    } else if (!Array.isArray(mainTable.name) && mainTable.model) {
      mainTable.as = this.quoteIdentifier(mainTable.model.name);
    }

    mainTable.quotedName = !Array.isArray(mainTable.name) ? this.quoteTable(mainTable.name) : tableName.map(t => {
      return Array.isArray(t) ? this.quoteTable(t[0], t[1]) : this.quoteTable(t, true);
    }).join(', ');

    if (subQuery && attributes.main) {
      for (const keyAtt of mainTable.model.primaryKeyAttributes) {
        // Check if mainAttributes contain the primary key of the model either as a field or an aliased field
        if (!_.find(attributes.main, attr => keyAtt === attr || keyAtt === attr[0] || keyAtt === attr[1])) {
          attributes.main.push(mainTable.model.rawAttributes[keyAtt].field ? [keyAtt, mainTable.model.rawAttributes[keyAtt].field] : keyAtt);
        }
      }
    }

    attributes.main = this.escapeAttributes(attributes.main, options, mainTable.as);
    attributes.main = attributes.main || (options.include ? [`${mainTable.as}.*`] : ['*']);

    // If subquery, we ad the mainAttributes to the subQuery and set the mainAttributes to select * from subquery
    if (subQuery || options.groupedLimit) {
      // We need primary keys
      attributes.subQuery = attributes.main;
      attributes.main = [(mainTable.as || mainTable.quotedName) + '.*'];
    }

    if (options.include) {
      for (const include of options.include) {
        if (include.separate) {
          continue;
        }
        const joinQueries = this.generateInclude(include, { externalAs: mainTable.as, internalAs: mainTable.as }, topLevelInfo);

        // If limit and parent is multiple associations and we are a required child include, we need to be with our father
        if (limit && (include.required === true || include.mismatch) && include.association.isMultiAssociation) {
          if (include.association instanceof BelongsToMany) {
            mainJoinQueries = mainJoinQueries.concat(joinQueries.mainQuery, joinQueries.subQuery);
          } else {
            mainJoinQueries = mainJoinQueries.concat(joinQueries.subQuery, joinQueries.mainQuery);
          }

          if (!attributes.main) {
            attributes.main = [];
          }

          if (joinQueries.attributes.main.length > 0) {
            attributes.main = attributes.main.concat(joinQueries.attributes.main);
          }

          attributes.main = attributes.main.concat(joinQueries.attributes.subQuery);
        } else {
          subJoinQueries = subJoinQueries.concat(joinQueries.subQuery);
          mainJoinQueries = mainJoinQueries.concat(joinQueries.mainQuery);

          if (joinQueries.attributes.subQuery.length > 0) {
            if (!attributes.subQuery) {
              attributes.subQuery = [];
            }
            attributes.subQuery = attributes.subQuery.concat(joinQueries.attributes.subQuery);
          }

          if (joinQueries.attributes.main.length > 0) {
            attributes.main = attributes.main.concat(joinQueries.attributes.main);
          }
        }
      }
    }

    if (subQuery) {
      subQueryItems.push(this.selectFromTableFragment(options, mainTable.model, attributes.subQuery, mainTable.quotedName, mainTable.as));
      subQueryItems.push(subJoinQueries.join(''));
    } else {
      if (options.groupedLimit) {
        if (!mainTable.as) {
          mainTable.as = mainTable.quotedName;
        }
        const where = Object.assign({}, options.where);
        let groupedLimitOrder;
        let whereKey;
        let include;
        let groupedTableName = mainTable.as;

        if (typeof options.groupedLimit.on === 'string') {
          whereKey = options.groupedLimit.on;
        } else if (options.groupedLimit.on instanceof HasMany) {
          whereKey = options.groupedLimit.on.foreignKeyField;
        }

        if (options.groupedLimit.on instanceof BelongsToMany) {
          // BTM includes needs to join the through table on to check ID
          groupedTableName = options.groupedLimit.on.manyFromSource.as;
          const groupedLimitOptions = Model.prototype._validateIncludedElements({
            include: [{
              association: options.groupedLimit.on.manyFromSource,
              duplicating: false, // The UNION'ed query may contain duplicates, but each sub-query cannot
              required: true,
              where: Object.assign({
                [Op.placeholder]: true
              }, options.groupedLimit.through && options.groupedLimit.through.where)
            }],
            model
          });

          // Make sure attributes from the join table are mapped back to models
          options.hasJoin = true;
          options.hasMultiAssociation = true;
          options.includeMap = Object.assign(groupedLimitOptions.includeMap, options.includeMap);
          options.includeNames = groupedLimitOptions.includeNames.concat(options.includeNames || []);
          include = groupedLimitOptions.include;

          if (Array.isArray(options.order)) {
            // We need to make sure the order by attributes are available to the parent query
            options.order.forEach((order, i) => {
              if (Array.isArray(order)) {
                order = order[0];
              }

              let alias = `subquery_order_${i}`;
              options.attributes.push([order, alias]);

              // We don't want to prepend model name when we alias the attributes, so quote them here
              alias = this.sequelize.literal(this.quote(alias));

              if (Array.isArray(options.order[i])) {
                options.order[i][0] = alias;
              } else {
                options.order[i] = alias;
              }
            });
            groupedLimitOrder = options.order;
          }
        } else {
          // Ordering is handled by the subqueries, so ordering the UNION'ed result is not needed
          groupedLimitOrder = options.order;
          delete options.order;
          where[Op.placeholder] = true;
        }

        // Caching the base query and splicing the where part into it is consistently > twice
        // as fast than generating from scratch each time for values.length >= 5
        const baseQuery = '(' + this.selectQuery(
          tableName,
          {
            attributes: options.attributes,
            limit: options.groupedLimit.limit,
            order: groupedLimitOrder,
            where,
            include,
            model
          },
          model
        ).replace(/;$/, '') + ')';
        const placeHolder = this.whereItemQuery(Op.placeholder, true, { model });
        const splicePos = baseQuery.indexOf(placeHolder);

        mainQueryItems.push(this.selectFromTableFragment(options, mainTable.model, attributes.main, '(' +
          options.groupedLimit.values.map(value => {
            let groupWhere;
            if (whereKey) {
              groupWhere = {
                [whereKey]: value
              };
            }
            if (include) {
              groupWhere = {
                [options.groupedLimit.on.foreignIdentifierField]: value
              };
            }

            let queryResult = baseQuery;
            let subQuerySlicePos = splicePos;

            do {
              queryResult = Utils.spliceStr(queryResult, subQuerySlicePos, placeHolder.length, this.getWhereConditions(groupWhere, groupedTableName));
              // We're looking to see if we still have any placeholders
              subQuerySlicePos = queryResult.indexOf(placeHolder);
            } while (subQuerySlicePos !== -1);

            return queryResult;
          }).join(
            this._dialect.supports['UNION ALL'] ? ' UNION ALL ' : ' UNION '
          )
          + ')', mainTable.as));
      } else {
        mainQueryItems.push(this.selectFromTableFragment(options, mainTable.model, attributes.main, mainTable.quotedName, mainTable.as));
      }

      mainQueryItems.push(mainJoinQueries.join(''));
    }

    // Add WHERE to sub or main query
    if (options.hasOwnProperty('where') && !options.groupedLimit) {
      options.where = this.getWhereConditions(options.where, mainTable.as || tableName, model, options);
      if (options.where) {
        if (subQuery) {
          subQueryItems.push(' WHERE ' + options.where);
        } else {
          mainQueryItems.push(' WHERE ' + options.where);
          // Walk the main query to update all selects
          Object.keys(mainQueryItems).forEach(key => {
            const value = mainQueryItems[key];
            if (value.match(/^SELECT/)) {
              mainQueryItems[key] = this.selectFromTableFragment(options, model, attributes.main, mainTable.quotedName, mainTable.as, options.where);
            }
          });
        }
      }
    }

    // Add GROUP BY to sub or main query
    if (options.group) {
      options.group = Array.isArray(options.group) ? options.group.map(t => this.quote(t, model)).join(', ') : this.quote(options.group, model);
      if (subQuery) {
        subQueryItems.push(' GROUP BY ' + options.group);
      } else {
        mainQueryItems.push(' GROUP BY ' + options.group);
      }
    }

    // Add HAVING to sub or main query
    if (options.hasOwnProperty('having')) {
      options.having = this.getWhereConditions(options.having, tableName, model, options, false);
      if (options.having) {
        if (subQuery) {
          subQueryItems.push(' HAVING ' + options.having);
        } else {
          mainQueryItems.push(' HAVING ' + options.having);
        }
      }
    }

    // Add ORDER to sub or main query
    if (options.order) {
      const orders = this.getQueryOrders(options, model, subQuery);
      if (orders.mainQueryOrder.length) {
        mainQueryItems.push(' ORDER BY ' + orders.mainQueryOrder.join(', '));
      }
      if (orders.subQueryOrder.length) {
        subQueryItems.push(' ORDER BY ' + orders.subQueryOrder.join(', '));
      }
    }

    // Add LIMIT, OFFSET to sub or main query
    const limitOrder = this.addLimitAndOffset(options, mainTable.model);
    if (limitOrder && !options.groupedLimit) {
      if (subQuery) {
        subQueryItems.push(limitOrder);
      } else {
        mainQueryItems.push(limitOrder);
      }
    }

    if (subQuery) {
      //Carefull, Oracle doesn't support AS for tables
      query = `SELECT ${attributes.main.join(', ')} FROM (${subQueryItems.join('')})${this._dialect.name === 'oracle' ? '' : ' AS'} ${mainTable.as}${mainJoinQueries.join('')}${mainQueryItems.join('')}`;
    } else {
      query = mainQueryItems.join('');
    }

    if (options.lock && this._dialect.supports.lock) {
      let lock = options.lock;
      if (typeof options.lock === 'object') {
        lock = options.lock.level;
      }
      if (this._dialect.supports.lockKey && (lock === 'KEY SHARE' || lock === 'NO KEY UPDATE')) {
        query += ' FOR ' + lock;
      } else if (lock === 'SHARE') {
        query += ' ' + this._dialect.supports.forShare;
      } else {
        query += ' FOR UPDATE';
      }
      if (this._dialect.supports.lockOf && options.lock.of && options.lock.of instanceof Model) {
        query += ' OF ' + this.quoteTable(options.lock.of.name);
      }
      if (this._dialect.supports.skipLocked && options.skipLocked && (this.dialect !== 'postgres' || semver.gte(this.options.databaseVersion, '9.5.0'))) {
        query += ' SKIP LOCKED';
      }
    }

    return `${query};`;
  }

  /**
   * escape the attributes
   */
  public escapeAttributes(attributes : any[], options : {
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
    model? : Model<any, any>,
    /** Specify if we want only one row without using an array */
    plain? : boolean,
    /** Error if no result found */
    rejectOnEmpty? : boolean,
    /** Passes by sub-query ? */
    subQuery? : boolean,
    tableNames? : string[],
    type ? : string,
    /** A hash of search attributes. */
    where? : {}
  }, mainTableAs : string) : any[] {
    return attributes && attributes.map(attr => {
      let addTable = true;

      if (attr instanceof AllUtils.SequelizeMethod) {
        return this.handleSequelizeMethod(attr);
      }
      if (Array.isArray(attr)) {
        if (attr.length !== 2) {
          throw new Error(JSON.stringify(attr) + ' is not a valid attribute definition. Please use the following format: [\'attribute definition\', \'alias\']');
        }
        attr = attr.slice();

        if (attr[0] instanceof AllUtils.SequelizeMethod) {
          attr[0] = this.handleSequelizeMethod(attr[0]);
          addTable = false;
        } else if (attr[0].indexOf('(') === -1 && attr[0].indexOf(')') === -1) {
          attr[0] = this.quoteIdentifier(attr[0]);
        } else {
          Utils.deprecate('Use sequelize.fn / sequelize.literal to construct attributes');
        }
        attr = [attr[0], this.quoteIdentifier(attr[1])].join(' AS ');
      } else {
        attr = attr.indexOf(Utils.TICK_CHAR) < 0 && attr.indexOf('"') < 0
          ? this.quoteIdentifiers(attr)
          : this.escape(attr);
      }
      if (!_.isEmpty(options.include) && attr.indexOf('.') === -1 && addTable) {
        attr = mainTableAs + '.' + attr;
      }

      return attr;
    });
  }

  /**
   * generate include
   */
  public generateInclude(include : IInclude, parentTableName : { externalAs?, internalAs? }, topLevelInfo : { options?, names?, subQuery? }) : { attributes, subQuery, mainQuery } {
    const association = include.association;
    const joinQueries = {
      mainQuery: [],
      subQuery: []
    };
    const mainChildIncludes = [];
    const subChildIncludes = [];
    let requiredMismatch = false;
    const includeAs = {
      internalAs: include.as,
      externalAs: include.as
    };
    const attributes = {
      main: [],
      subQuery: []
    };
    let joinQuery;

    const hasParentRequired = Model.prototype.hasReqOrParentRequired(include);
    const hasParentReqOrMM = Model.prototype.hasParentMismatchOrRequired(include);
    const parentExistInLimitQuery = Model.prototype.parentExistInLimitQuery(include);

    topLevelInfo.options.keysEscaped = true;

    if (topLevelInfo.names.name !== parentTableName.externalAs && topLevelInfo.names.as !== parentTableName.externalAs) {
      includeAs.internalAs = `${parentTableName.internalAs}->${include.as}`;
      includeAs.externalAs = `${parentTableName.externalAs}.${include.as}`;
    }

    // includeIgnoreAttributes is used by aggregate functions
    if (topLevelInfo.options.includeIgnoreAttributes !== false) {
      if (include.subQuery && topLevelInfo.subQuery) {
        // In subquery with outer join, we need to auto add the foreignKey
        const childIncludes = include.include ? include.include.filter( f => f.required !== true && (f.association instanceof BelongsTo || f.association instanceof HasOne)) : [];
        childIncludes.forEach( childInclude => {
          if (include.attributes.indexOf(childInclude.association.foreignKey) === -1) {
            include.attributes.push(childInclude.association.foreignKey);
          }
        });
      }

      const includeAttributes = include.attributes.map(attr => {
        let attrAs = attr;
        let verbatim = false;

        if (Array.isArray(attr) && attr.length === 2) {
          if (attr[0] instanceof AllUtils.SequelizeMethod && (
            attr[0] instanceof AllUtils.Literal ||
            attr[0] instanceof AllUtils.Cast ||
            attr[0] instanceof AllUtils.Fn
          )) {
            verbatim = true;
          }

          attr = attr.map(_attr => _attr instanceof AllUtils.SequelizeMethod ? this.handleSequelizeMethod(_attr) : _attr);

          attrAs = attr[1];
          attr = attr[0];
        } else if (attr instanceof AllUtils.Literal) {
          return attr.val; // We trust the user to rename the field correctly
        } else if (attr instanceof AllUtils.Cast || attr instanceof AllUtils.Fn) {
          throw new Error(
            'Tried to select attributes using Sequelize.cast or Sequelize.fn without specifying an alias for the result, during eager loading. ' +
            'This means the attribute will not be added to the returned instance'
          );
        }

        let prefix;
        if (verbatim === true) {
          prefix = attr;
        } else {
          prefix = `${this.quoteIdentifier(includeAs.internalAs)}.${this.quoteIdentifier(attr)}`;
        }
        return `${prefix} AS ${this.quoteIdentifier(`${includeAs.externalAs}.${attrAs}`, true)}`;
      });
      const isNotHMorBTM = !(include.association instanceof BelongsToMany || include.association instanceof HasMany);
      if (!parentExistInLimitQuery && include.subQuery && topLevelInfo.subQuery && !(include.mismatch) && isNotHMorBTM) {
        if (hasParentRequired || include.mismatch) {
          for (const attr of includeAttributes) {
            attributes.subQuery.push(attr);
          }
        } else {
          if (!include.required && include.parent.attributes.indexOf(include.association.foreignKey) === -1) {
            attributes.subQuery.push(`${this.quoteIdentifier(include.association.source.name)}.${this.quoteIdentifier(include.association.foreignKey)}`);
          }
          for (const attr of includeAttributes) {
            attributes.main.push(attr);
          }
        }

      } else {
        // assoc hasmany ? assoc attributes ? Father SubQuery ?
        if (!parentExistInLimitQuery && include.association instanceof HasMany && include.parent.subQuery) {
          const assocAliasKey = `${this.quoteIdentifier(parentTableName.internalAs)}.${this.quoteIdentifier(include.association.sourceKeyField)} AS ${this.quoteIdentifier(`${parentTableName.externalAs}.${include.association.sourceKeyAttribute}`)}`;

          // Not in father attributes ?
          const hasAttributeKey = include.parent.attributes.find( f => {
            if (f instanceof Array) {
              return f[1] === include.association.sourceKeyAttribute;
            } else {
              return f === include.association.sourceKeyField;
            }
          });

          if (!hasAttributeKey) {
            attributes.subQuery.push(assocAliasKey);
          }
        }

        if (!parentExistInLimitQuery && topLevelInfo.subQuery && Model.prototype.hasParentMismatchOrRequired(include) && (isNotHMorBTM || include.mismatch)) {
          for (const attr of includeAttributes) {
            attributes.subQuery.push(attr);
          }
        } else {
          for (const attr of includeAttributes) {
            attributes.main.push(attr);
          }
        }
      }
    }

    //through
    if (include.through) {
      joinQuery = this.generateThroughJoin(include, includeAs, parentTableName.internalAs, topLevelInfo);
    } else {
      // const hasLimitRequiredHasMany = topLevelInfo.options.limit && include.required &&
      //   !(include.parent.association instanceof HasMany) && include.association instanceof HasMany ? true : false;
      const hasLimitRequiredHasMany = topLevelInfo.options.limit && hasParentRequired /*include.required*/ &&
      !Model.prototype.hasParentHasMany(include) && include.association instanceof HasMany ? true : false;
      // BTM has already generated a subquery
      const notFromBTM = !(Model.prototype.hasParentBelongsToMany(include, true));

      if (!(Model.prototype.parentExistInLimitQuery(include)) && notFromBTM && include.required === true && !(include.mismatch) && (hasLimitRequiredHasMany || (topLevelInfo.subQuery && include.subQueryFilter))) {
        include.inSubQuery = true;
        const associationWhere = {};

        associationWhere[association.identifierField] = {
          [Op.eq]: this.sequelize.literal(`${this.quoteTable(parentTableName.internalAs)}.${this.quoteIdentifier(association.sourceKeyField || association.source.primaryKeyField)}`)
        };

        if (!topLevelInfo.options.where) {
          topLevelInfo.options.where = {};
        }
        const hasInclude = include.include && include.include.length ? true : false;
        // Creating the as-is where for the subQuery, checks that the required association exists
        const $query = this.selectQuery(include.model.getTableName(), {
          attributes: [association.identifierField],
          where: {
            [Op.and]: [
              associationWhere,
              include.where || {},
            ]
          },
          limit: 1,
          tableAs: Model.prototype.getFullAsPath(include),
          includeIgnoreAttributes : hasInclude ? false : undefined,
          include: hasInclude ? include.include : undefined,
          parent: hasInclude ? include.include[0].parent : undefined,
          model : hasInclude ? include.model : undefined,
        }, include.model);

        const subQueryWhere = this.sequelize.asIs([
          '(',
          $query.replace(/\;$/, ''),
          ')',
          'IS NOT NULL',
        ].join(' '));

        if (_.isPlainObject(topLevelInfo.options.where)) {
          topLevelInfo.options.where['__' + includeAs.internalAs] = subQueryWhere;
        } else {
          topLevelInfo.options.where = { [Op.and]: [topLevelInfo.options.where, subQueryWhere] };
        }
      }
      joinQuery = this.generateJoin(include, topLevelInfo);
    }

    if (joinQuery) {
      // handle possible new attributes created in join
      if (joinQuery.attributes.main.length > 0) {
        attributes.main = attributes.main.concat(joinQuery.attributes.main);
      }

      if (joinQuery.attributes.subQuery.length > 0) {
        attributes.subQuery = attributes.subQuery.concat(joinQuery.attributes.subQuery);
      }

      if (include.include) {
        for (const childInclude of include.include) {
          if (childInclude.separate || (childInclude as any)._pseudo) {
            continue;
          }

          const childJoinQueries = this.generateInclude(childInclude, includeAs, topLevelInfo);

          if (include.required === false && childInclude.required === true) {
            requiredMismatch = true;
          }
          // If one of our includes need a mismatch...
          if (!requiredMismatch && childInclude.mismatch) {
            requiredMismatch = true;
          }
          // if the child is a sub query we just give it to the
          let isInSubQuery = false;
          if (childInclude.subQuery && topLevelInfo.subQuery && childJoinQueries.subQuery.length) {
            subChildIncludes.push(childJoinQueries.subQuery);
            isInSubQuery = true;
          }
          if (childJoinQueries.mainQuery && (!isInSubQuery || (isInSubQuery && childJoinQueries.attributes.main.length))) {
            mainChildIncludes.push(childJoinQueries.mainQuery);
            if (!isInSubQuery && childJoinQueries.subQuery.length) {
              mainChildIncludes.push(childJoinQueries.subQuery);
            }
          }
          if (childJoinQueries.attributes.main.length > 0) {
            attributes.main = attributes.main.concat(childJoinQueries.attributes.main);
          }
          if (childJoinQueries.attributes.subQuery.length > 0) {
            attributes.subQuery = attributes.subQuery.concat(childJoinQueries.attributes.subQuery);
          }
        }
      }

      if (include.subQuery && topLevelInfo.subQuery && hasParentReqOrMM) {
        if (requiredMismatch) {
          if (subChildIncludes.length > 0) {
            joinQueries.subQuery.push(` ${joinQuery.join} ( ${joinQuery.body}${subChildIncludes.join('')} ) ON ${joinQuery.condition}`);
            joinQueries.mainQuery.push(mainChildIncludes.join(''));
          } else {
            joinQueries.subQuery.push(` ${joinQuery.join} ( ${joinQuery.body}${mainChildIncludes.join('')} ) ON ${joinQuery.condition}`);
          }
        } else {
          joinQueries.subQuery.push(` ${joinQuery.join} ${joinQuery.body} ON ${joinQuery.condition}`);
          if (subChildIncludes.length > 0) {
            joinQueries.subQuery.push(subChildIncludes.join(''));
          }
          joinQueries.mainQuery.push(mainChildIncludes.join(''));
        }

      } else {
        if (requiredMismatch) {
          if (mainChildIncludes.length > 0) {
            joinQueries.mainQuery.push(` ${joinQuery.join} ( ${joinQuery.body}${mainChildIncludes.join('')} ) ON ${joinQuery.condition}`);
            joinQueries.subQuery.push(subChildIncludes.join(''));
          } else if (subChildIncludes.length) {
            joinQueries.mainQuery.push(` ${joinQuery.join} ( ${joinQuery.body}${subChildIncludes.join('')} ) ON ${joinQuery.condition}`);
          }
        } else {
          joinQueries.mainQuery.push(` ${joinQuery.join} ${joinQuery.body} ON ${joinQuery.condition}`);
          if (mainChildIncludes.length > 0) {
            joinQueries.mainQuery.push(mainChildIncludes.join(''));
          }
          joinQueries.subQuery.push(subChildIncludes.join(''));
        }
      }
    }

    return {
      mainQuery: joinQueries.mainQuery.join(''),
      subQuery: joinQueries.subQuery.join(''),
      attributes
    };
  }

  public generateJoin(include : IInclude, topLevelInfo : { options?, subQuery? }) : { join?, body?, condition?, attributes? } {
    const association = include.association;
    const parent = include.parent;
    const parentIsTop = !!parent && !include.parent.association && include.parent.model.name === topLevelInfo.options.model.name;
    let $parent = include.parent;
    let joinWhere;
    /* Attributes for the left side */
    const left = association.source;
    const attrLeft = association instanceof BelongsTo ?
      association.identifier :
      association.sourceKeyAttribute || left.primaryKeyAttribute;
    const fieldLeft = association instanceof BelongsTo ?
      association.identifierField :
      left.rawAttributes[association.sourceKeyAttribute || left.primaryKeyAttribute].field;
    let asLeft;
    /* Attributes for the right side */
    const right = include.model;
    const tableRight = right.getTableName();
    const fieldRight = association instanceof BelongsTo ?
      right.rawAttributes[association.targetIdentifier || right.primaryKeyAttribute].field :
      association.identifierField;
    let asRight = include.as;

    while ($parent && $parent.association) {
      if (asLeft) {
        asLeft = `${$parent.as}->${asLeft}`;
      } else {
        asLeft = $parent.as;
      }
      $parent = $parent && $parent.parent;
    }

    if (!asLeft) {
      asLeft = parent.as || parent.model.name;
    } else {
      asRight = `${asLeft}->${asRight}`;
    }

    let joinOn = `${this.quoteTable(asLeft)}.${this.quoteIdentifier(fieldLeft)}`;

    const parentExistInLimitQuery = Model.prototype.parentExistInLimitQuery(include);
    if (!parentExistInLimitQuery && ((topLevelInfo.options.groupedLimit && parentIsTop) || (topLevelInfo.subQuery && include.parent.subQuery && !include.subQuery && Model.prototype.hasReqOrParentRequired(include, true)) )) {
      if (parentIsTop) {
        // The main model attributes is not aliased to a prefix
        joinOn = `${this.quoteTable(parent.as || parent.model.name)}.${this.quoteIdentifier(attrLeft)}`;
      } else if (!include.mismatch) {
        joinOn = this.quoteIdentifier(`${asLeft.replace(/->/g, '.')}.${attrLeft}`);
      }
    }

    joinOn += ` = ${this.quoteIdentifier(asRight)}.${this.quoteIdentifier(fieldRight)}`;

    if (include.on) {
      joinOn = this.whereItemsQuery(include.on, {
        prefix: this.sequelize.literal(this.quoteIdentifier(asRight)),
        model: include.model
      });
    }

    if (include.where) {
      joinWhere = this.whereItemsQuery(include.where, {
        prefix: this.sequelize.literal(this.quoteIdentifier(asRight)),
        model: include.model
      });
      if (joinWhere) {
        if (include.or) {
          joinOn += ` OR ${joinWhere}`;
        } else {
          joinOn += ` AND ${joinWhere}`;
        }
      }
    }

    return {
      join: include.required ? 'INNER JOIN' : 'LEFT OUTER JOIN',
      body: this.quoteTable(tableRight, asRight),
      condition: joinOn,
      attributes: {
        main: [],
        subQuery: []
      }
    };
  }

  /**
   * generate join query
   */
  public generateThroughJoin(include : IInclude, includeAs : { internalAs?, externalAs? }, parentTableName, topLevelInfo : { options?, subQuery? }) : { join?, body?, condition?, attributes? } {
    const hasAttributes = include.attributes.length;
    const through = include.through;
    const throughTable = through.model.getTableName();
    const throughAs = `${includeAs.internalAs}->${through.as}`;
    const externalThroughAs = `${includeAs.externalAs}.${through.as}`;
    const throughAttributes = hasAttributes ? through.attributes.map(attr =>
      this.quoteIdentifier(throughAs) + '.' + this.quoteIdentifier(Array.isArray(attr) ? attr[0] : attr)
      + ' AS '
      + this.quoteIdentifier(externalThroughAs + '.' + (Array.isArray(attr) ? attr[1] : attr))
    ) : [];
    const association = include.association;
    const parentIsTop = !include.parent.association && include.parent.model.name === topLevelInfo.options.model.name;
    const primaryKeysSource = association.source.primaryKeyAttributes;
    const tableSource = parentTableName;
    const identSource = association.identifierField;
    const primaryKeysTarget = association.target.primaryKeyAttributes;
    const tableTarget = includeAs.internalAs;
    const identTarget = association.foreignIdentifierField;
    const attrTarget = association.target.rawAttributes[primaryKeysTarget[0]].field || primaryKeysTarget[0];

    const joinType = include.required ? 'INNER JOIN' : 'LEFT OUTER JOIN';
    let joinBody;
    let joinCondition;
    const attributes = {
      main: [],
      subQuery: []
    };
    const hasParentInSubQuery = Model.prototype.parentExistInLimitQuery(include);
    let attrSource = hasParentInSubQuery ? association.source.primaryKeyField : primaryKeysSource[0];
    let sourceJoinOn;
    let targetJoinOn;
    let throughWhere;
    let targetWhere;

    if (topLevelInfo.options.includeIgnoreAttributes !== false) {
      // Through includes are always hasMany, so we need to add the attributes to the mainAttributes no matter what (Real join will never be executed in subquery)
      for (const attr of throughAttributes) {
        attributes.main.push(attr);
      }
    }

    // Figure out if we need to use field or attribute
    if (!topLevelInfo.subQuery) {
      attrSource = association.source.rawAttributes[primaryKeysSource[0]].field;
    }
    if (topLevelInfo.subQuery && !include.subQuery && !include.parent.subQuery && include.parent.model !== topLevelInfo.options.mainModel) {
      attrSource = association.source.rawAttributes[primaryKeysSource[0]].field;
    }

    // Filter statement for left side of through
    // Used by both join and subquery where
    // If parent include was in a subquery need to join on the aliased attribute
    if (!hasParentInSubQuery && topLevelInfo.subQuery && !include.subQuery && include.parent.subQuery && !parentIsTop) {
      sourceJoinOn = `${this.quoteIdentifier(`${tableSource}.${attrSource}`)} = `;
    } else {
      sourceJoinOn = `${this.quoteTable(tableSource)}.${this.quoteIdentifier(attrSource)} = `;
    }
    sourceJoinOn += `${this.quoteIdentifier(throughAs)}.${this.quoteIdentifier(identSource)}`;

    // Filter statement for right side of through
    // Used by both join and subquery where
    targetJoinOn = `${this.quoteIdentifier(tableTarget)}.${this.quoteIdentifier(attrTarget)} = `;
    targetJoinOn += `${this.quoteIdentifier(throughAs)}.${this.quoteIdentifier(identTarget)}`;

    if (through.where) {
      throughWhere = this.getWhereConditions(through.where, this.sequelize.literal(this.quoteIdentifier(throughAs)), through.model);
    }

    if (this._dialect.supports.joinTableDependent) {
      // Generate a wrapped join so that the through table join can be dependent on the target join
      joinBody = `( ${this.quoteTable(throughTable, throughAs)} INNER JOIN ${this.quoteTable(include.model.getTableName(), includeAs.internalAs)} ON ${targetJoinOn}`;
      if (throughWhere) {
        joinBody += ` AND ${throughWhere}`;
      }
      joinBody += ')';
      joinCondition = sourceJoinOn;
    } else {
      // Generate join SQL for left side of through
      joinBody = `${this.quoteTable(throughTable, throughAs)} ON ${sourceJoinOn} ${joinType} ${this.quoteTable(include.model.getTableName(), includeAs.internalAs)}`;
      joinCondition = targetJoinOn;
      if (throughWhere) {
        joinCondition += ` AND ${throughWhere}`;
      }
    }

    if (include.where || include.through.where) {
      if (include.where) {
        targetWhere = this.getWhereConditions(include.where, this.sequelize.literal(this.quoteIdentifier(includeAs.internalAs)), include.model, topLevelInfo.options);
        if (targetWhere) {
          joinCondition += ` AND ${targetWhere}`;
        }
      }
      if (topLevelInfo.subQuery && include.required) {
        if (!topLevelInfo.options.where) {
          topLevelInfo.options.where = {};
        }
        let parent = include.parent;
        let child = include;
        let nestedIncludes = [];
        let query;

        while (parent) {
          nestedIncludes = [_.extend({}, child, { include: nestedIncludes })];
          child = parent;
          parent = parent.parent;
        }

        const topInclude = nestedIncludes[0];
        const topParent = topInclude.parent;

        // we removed the current include (through)
        include.include.splice(include.include.indexOf(topInclude), 1);
        if (topInclude.through && Object(topInclude.through.model) === topInclude.through.model) {
          query = this.selectQuery(topInclude.through.model.getTableName(), {
            attributes: [topInclude.through.model.primaryKeyField],
            include: Model.prototype._validateIncludedElements({
              model: topInclude.through.model,
              include: [{
                include : include.include,
                association: topInclude.association.toTarget,
                where : topInclude.where,
                required: true
              }]
            }).include,
            model: topInclude.through.model,
            where: {
              [Op.and]: [
                this.sequelize.asIs([
                  this.quoteTable(topParent.model.name) + '.' + this.quoteIdentifier(topParent.model.primaryKeyField),
                  this.quoteIdentifier(topInclude.through.model.name) + '.' + this.quoteIdentifier(topInclude.association.identifierField),
                ].join(' = ')),
                topInclude.through.where,
              ]
            },
            limit: 1,
            includeIgnoreAttributes: false
          }, topInclude.through.model);
        } else {
          const isBelongsTo = topInclude.association.associationType === 'BelongsTo';
          const join = [
            this.quoteTable(topParent.model.name) + '.' + this.quoteIdentifier(isBelongsTo ? topInclude.association.identifierField : topParent.model.primaryKeyAttributes[0]),
            this.quoteIdentifier(topInclude.model.name) + '.' + this.quoteIdentifier(isBelongsTo ? topInclude.model.primaryKeyAttributes[0] : topInclude.association.identifierField),
          ].join(' = ');
          query = this.selectQuery(topInclude.model.tableName, {
            attributes: [topInclude.model.primaryKeyAttributes[0]],
            include: topInclude.include,
            where: {
              [Op.join]: this.sequelize.asIs(join)
            },
            limit: 1,
            includeIgnoreAttributes: false
          }, topInclude.model);
        }

        const queryWhere = this.sequelize.asIs([
          '(',
          query.replace(/\;$/, ''),
          ')',
          'IS NOT NULL',
        ].join(' '));

        if (_.isPlainObject(topLevelInfo.options.where)) {
          topLevelInfo.options.where['__' + throughAs] = queryWhere;
        } else {
          topLevelInfo.options.where = { $and: [topLevelInfo.options.where, queryWhere] };
        }
      }
    }
    this._generateSubQueryFilter(include, includeAs, topLevelInfo);

    if (!hasAttributes && (topLevelInfo.subQuery && include.required)) {
      // Already handled with subquery
      return null;
    } else {
      return {
        join: joinType,
        body: joinBody,
        condition: joinCondition,
        attributes
      };
    }
  }

  private _generateSubQueryFilter(include, includeAs, topLevelInfo) {
    if (!topLevelInfo.subQuery || !include.subQueryFilter) {
      return;
    }

    if (!topLevelInfo.options.where) {
      topLevelInfo.options.where = {};
    }
    let parent = include.parent;
    let child = include;
    let nestedIncludes = this._getRequiredClosure(include).include;
    let query;
    while (parent) { // eslint-disable-line
      if (parent.parent && !parent.required) {
        return; // only generate subQueryFilter if all the parents of this include are required
      }

      if (parent.subQueryFilter) {
        // the include is already handled as this parent has the include on its required closure
        // skip to prevent duplicate subQueryFilter
        return;
      }

      nestedIncludes = [_.extend({}, child, { include: nestedIncludes, attributes: [] })];
      child = parent;
      parent = parent.parent;
    }

    const topInclude = nestedIncludes[0];
    const topParent = topInclude.parent;
    const topAssociation = topInclude.association;
    topInclude.association = undefined;

    if (topInclude.through && Object(topInclude.through.model) === topInclude.through.model) {
      query = this.selectQuery(topInclude.through.model.getTableName(), {
        attributes: [topInclude.through.model.primaryKeyField],
        include: Model.prototype._validateIncludedElements({
          model: topInclude.through.model,
          include: [{
            association: topAssociation.toTarget,
            required: true,
            where: topInclude.where,
            include: topInclude.include
          }]
        }).include,
        model: topInclude.through.model,
        where: {
          [Op.and]: [
            this.sequelize.asIs([
              this.quoteTable(topParent.model.name) + '.' + this.quoteIdentifier(topParent.model.primaryKeyField),
              this.quoteIdentifier(topInclude.through.model.name) + '.' + this.quoteIdentifier(topAssociation.identifierField)].join(' = ')),
            topInclude.through.where]
        },
        limit: 1,
        includeIgnoreAttributes: false
      }, topInclude.through.model);
    } else {
      const isBelongsTo = topAssociation.associationType === 'BelongsTo';
      const sourceField = isBelongsTo ? topAssociation.identifierField : (topAssociation.sourceKeyField || topParent.model.primaryKeyField);
      const targetField = isBelongsTo ? (topAssociation.sourceKeyField || topInclude.model.primaryKeyField) : topAssociation.identifierField;

      const join = [
        this.quoteIdentifier(topInclude.as) + '.' + this.quoteIdentifier(targetField),
        this.quoteTable(topParent.as || topParent.model.name) + '.' + this.quoteIdentifier(sourceField)].join(' = ');

      query = this.selectQuery(topInclude.model.getTableName(), {
        attributes: [targetField],
        include: Model.prototype._validateIncludedElements(topInclude).include,
        model: topInclude.model,
        where: {
          [Op.and]: [
            topInclude.where,
            { [Op.join]: this.sequelize.asIs(join) }]
        },
        limit: 1,
        tableAs: topInclude.as,
        includeIgnoreAttributes: false
      }, topInclude.model);
    }

    if (!topLevelInfo.options.where[Op.and]) {
      topLevelInfo.options.where[Op.and] = [];
    }

    topLevelInfo.options.where[`__${includeAs.internalAs}`] = this.sequelize.asIs([
      '(',
      query.replace(/\;$/, ''),
      ')',
      'IS NOT NULL'].join(' '));
  }

  /*
   * For a given include hierarchy creates a copy of it where only the required includes
   * are preserved.
   */
  private _getRequiredClosure(include) {
    const copy = _.extend({}, include, {attributes: [], include: []});

    if (Array.isArray(include.include)) {
      copy.include = include.include
        .filter(i => i.required)
        .map(inc => this._getRequiredClosure(inc));
    }

    return copy;
  }


  /**
   * return query orders
   */
  public getQueryOrders(options : {
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
    model? : Model<any, any>,
    /** An offset value to start from. Only useable with limit! */
    offset? : number,
    /** OrderBy clause */
    order? : any,
    /** Error if no result found */
    rejectOnEmpty? : boolean,
    /** Passes by sub-query ? */
    subQuery? : boolean,
    tableNames? : string[],
    topLimit? : any,
    topModel? : Model<any, any>,
    type ? : string,
    /** A hash of search attributes. */
    where? : {}
  }, model : Model<any, any>, subQuery : boolean) : { mainQueryOrder, subQueryOrder } {
    const mainQueryOrder = [];
    const subQueryOrder = [];

    if (Array.isArray(options.order)) {
      for (let order of options.order) {
        // wrap if not array
        if (!Array.isArray(order)) {
          order = [order];
        }

        if (
          subQuery
          && Array.isArray(order)
          && order[0]
          && !(order[0] instanceof HasMany || order[0] instanceof BelongsToMany)
          && !(order[0] instanceof Model)
          // && !(typeof order[0].model === 'function' && order[0].model.prototype instanceof Model)
          && !(typeof order[0] === 'string' && model && model.associations !== undefined && model.associations[order[0]])
        ) {
          // HasMany/BelongsToMany order cannot work on subQuery with offset, so we need to ignore it.
          const quoteOptions = {
            ignoreHM : true,
            ignoreResult : false
          };

          const quotedOrderBy = this.quote(order, model, '->', quoteOptions);
          if (!quoteOptions.ignoreResult) {
            subQueryOrder.push(quotedOrderBy);
          }
        }

        if (subQuery) {
          // Handle case where sub-query renames attribute we want to order by,
          // see https://github.com/sequelize/sequelize/issues/8739
          const subQueryAttribute = options.attributes.find(a => Array.isArray(a) && a[0] === order[0] && a[1]);
          if (subQueryAttribute) {
            order[0] = new AllUtils.Col(subQueryAttribute[1]);
          }
        }

        if (subQuery && !(typeof order[0] === 'string') && !(order[0].val)) {
          // With subquery, the mainQueryOrder must be separate with dot.
          mainQueryOrder.push(this.quote(order, model, '->', {
            subQuery : true
          }));
        } else {
          mainQueryOrder.push(this.quote(order, model, '->'));
        }
      }
    } else if (options.order instanceof AllUtils.SequelizeMethod) {
      const sql = this.quote(options.order, model, '->');
      if (subQuery) {
        subQueryOrder.push(sql);
      }
      mainQueryOrder.push(sql);
    } else {
      throw new Error('Order must be type of array or instance of a valid sequelize method.');
    }

    return {mainQueryOrder, subQueryOrder};
  }

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
    model? : Model<any, any>,
    /** An offset value to start from. Only useable with limit! */
    offset? : number,
    /** OrderBy clause */
    order? : any,
    /** Error if no result found */
    rejectOnEmpty? : boolean,
    /** Passes by sub-query ? */
    subQuery? : boolean,
    tableNames? : string[],
    topLimit? : any,
    topModel? : Model<any, any>,
    type ? : string,
    /** A hash of search attributes. */
    where? : {}
  }, model : Model<any, any>, attributes : any[], tables : string, mainTableAs : string, where? : {}) : string {
    let fragment = 'SELECT ' + attributes.join(', ') + ' FROM ' + tables;

    if (mainTableAs) {
      fragment += ' AS ' + mainTableAs;
    }

    return fragment;
  }

  /**
   * Returns a query that starts a transaction.
   *
   * @param value A boolean that states whether autocommit shall be done or not.
   * @param options An object with options.
   * @returns The generated sql query.
   */
  public setAutocommitQuery(value : boolean, options : { parent? }) : string | void {
    if (options.parent) {
      return;
    }

    // no query when value is not explicitly set
    if (typeof value === 'undefined' || value === null) {
      return;
    }

    return 'SET autocommit = ' + (value ? 1 : 0) + ';';
  }

  /**
   * Returns a query that sets the transaction isolation level.
   *
   * @param value The isolation level.
   * @param options An object with options.
   * @returns The generated sql query.
   */
  public setIsolationLevelQuery(value? : string, options? : { parent? }) : string | void {
    if (options.parent) {
      return;
    }

    return 'SET SESSION TRANSACTION ISOLATION LEVEL ' + value + ';';
  }

  /**
   * return a transaction id
   */
  public generateTransactionId() : string {
    return uuid.v4();
  }

  /**
   * Returns a query that starts a transaction.
   *
   * @param transaction
   * @param options An object with options.
   * @returns The generated sql query.
   */
  public startTransactionQuery(transaction : Transaction) : string {
    if (transaction.parent) {
      // force quoting of savepoint identifiers for postgres
      return 'SAVEPOINT ' + this.quoteIdentifier(transaction.name, true) + ';';
    }

    return 'START TRANSACTION;';
  }

  /**
   * Returns a query that defers the constraints. Only works for postgres.
   *
   * @param transaction
   * @param options An object with options.
   * @returns The generated sql query.
   */
  public deferConstraintsQuery() {}

  public setConstraintQuery() {}
  public setDeferredQuery() {}
  public setImmediateQuery() {}

  /**
   * Returns a query that commits a transaction.
   *
   * @param options An object with options.
   * @returns The generated sql query.
   */
  public commitTransactionQuery(transaction : Transaction) : string {
    if (transaction.parent) {
      return;
    }

    return 'COMMIT;';
  }

  /**
   * Returns a query that rollbacks a transaction.
   *
   * @param options An object with options.
   * @returns The generated sql query.
   */
  public rollbackTransactionQuery(transaction : Transaction) : string {
    if (transaction.parent) {
      // force quoting of savepoint identifiers for postgres
      return 'ROLLBACK TO SAVEPOINT ' + this.quoteIdentifier(transaction.name, true) + ';';
    }

    return 'ROLLBACK;';
  }

  /**
   * Returns an SQL fragment for adding result constraints
   *
   * @param options An object with selectQuery options.
   * @param model The model passed to the selectQuery.
   * @returns The generated sql query.
   * @hidden
   */
  private _addLimitAndOffset(options : {
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
  }, model?) : string {
    let fragment = '';

    /* eslint-disable */
    if (options.offset != null && options.limit == null) {
      fragment += ' LIMIT ' + this.escape(options.offset) + ', ' + 10000000000000;
    } else if (options.limit != null) {
      if (options.offset != null) {
        fragment += ' LIMIT ' + this.escape(options.offset) + ', ' + this.escape(options.limit);
      } else {
        fragment += ' LIMIT ' + this.escape(options.limit);
      }
    }
    /* eslint-enable */

    return fragment;
  }

  /**
   * @internal
   * @hidden
   */
  public addLimitAndOffset(options, model?) {
    return this._addLimitAndOffset(options, model);
  }

  /**
   * handle a sequelize method
   */
  public handleSequelizeMethod(smth : any, tableName? : string, factory?, options?, prepend?) : string {
    let result;

    if (this.OperatorMap.hasOwnProperty(smth.comparator)) {
      smth.comparator = this.OperatorMap[smth.comparator];
    }

    if (smth instanceof AllUtils.Where) {
      let value = smth.logic;
      let key;

      if (smth.attribute instanceof AllUtils.SequelizeMethod) {
        key = this.getWhereConditions(smth.attribute, tableName, factory, options, prepend);
      } else {
        key = this.quoteTable(smth.attribute.Model.name) + '.' + this.quoteIdentifier(smth.attribute.field || smth.attribute.fieldName);
      }

      if (value && value instanceof AllUtils.SequelizeMethod) {
        value = this.getWhereConditions(value, tableName, factory, options, prepend);

        result = value === 'NULL' && smth.comparator !== 'IS NOT' ? key + ' IS NULL' : [key, value].join(' ' + smth.comparator + ' ');
      } else if (_.isPlainObject(value)) {
        result = this.whereItemQuery(smth.attribute, value, {
          model: factory
        });
      } else {
        if (typeof value === 'boolean') {
          value = this.booleanValue(value);
        } else {
          value = this.escape(value);
        }

        result = value === 'NULL' && smth.comparator !== 'IS NOT' ? key + ' IS NULL' : [key, value].join(' ' + smth.comparator + ' ');
      }
    } else if (smth instanceof AllUtils.Literal) {
      result = smth.val;
    } else if (smth instanceof AllUtils.Cast) {
      if (smth.val instanceof AllUtils.SequelizeMethod) {
        result = this.handleSequelizeMethod(smth.val, tableName, factory, options, prepend);
      } else if (_.isPlainObject(smth.val)) {
        result = this.whereItemsQuery(smth.val);
      } else {
        result = this.escape(smth.val);
      }

      result = 'CAST(' + result + ' AS ' + smth.type.toUpperCase() + ')';
    } else if (smth instanceof AllUtils.Fn) {
      result = smth.fn + '(' + smth.args.map(arg => {
        if (arg instanceof AllUtils.SequelizeMethod) {
          return this.handleSequelizeMethod(arg, tableName, factory, options, prepend);
        } else if (_.isPlainObject(arg)) {
          return this.whereItemsQuery(arg);
        } else {
          return this.escape(arg);
        }
      }).join(', ') + ')';
    } else if (smth instanceof AllUtils.Col) {
      if (Array.isArray(smth.col)) {
        if (!factory) {
          throw new Error('Cannot call Sequelize.col() with array outside of order / group clause');
        }
      } else if (smth.col.indexOf('*') === 0) {
        return '*';
      }
      return this.quote(smth.col, factory);
    } else {
      result = smth.toString(this, factory);
    }

    return result;
  }

  /**
   * return the where part of a query
   */
  public whereQuery(where : {}, options? : {
    allowNull? : any[],
    /** = false, Pass query execution time in milliseconds as second argument to logging function (options.logging). */
    benchmark? : boolean,
    bind? : {};
    databaseVersion? : number,
    define? : {},
    /** The dialect of the database you are connecting to. One of mysql, postgres, sqlite, oracle and mssql. */
    dialect? : string,
    /** = null, If specified, load the dialect library from this path. For example, if you want to use pg.js instead of pg when connecting to a pg database, you should specify 'pg.js' here */
    dialectModulePath? : string,
    /** An object of additional options, which are passed directly to the connection library */
    dialectOptions? : {},
    fields? : string[],
    force? : boolean,
    hasTrigger? : boolean,
    /** An object of hook function that are called before and after certain lifecycle events */
    hooks? : boolean,
    /** = 'localhost', The host of the relational database. */
    host? : string,
    individualHooks? : boolean,
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
    quoteIdentifiers? : boolean,
    /** = false, Use read / write replication. To enable replication, pass an object, with two properties, read and write. */
    replication? : boolean,
    /** Set of flags that control when a query is automatically retried. */
    retry? : { max? : number, match? : any[] },
    returning? : boolean,
    sideEffects? : boolean,
    skip? : any,
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
    const query = this.whereItemsQuery(where, options);
    if (query && query.length) {
      return 'WHERE ' + query;
    }
    return '';
  }

  /**
   * return the items of the where part of a query
   */
  public whereItemsQuery(where : {}, options? : { model? : Model<any, any>, prefix? : string }, binding? : string) : string {
    if (
      where === null ||
      where === undefined ||
      Utils.getComplexSize(where) === 0
    ) {
      // NO OP
      return '';
    }

    if (_.isString(where)) {
      throw new Error('Support for `{where: \'raw query\'}` has been removed.');
    }

    const items = [];

    binding = binding || 'AND';
    if (binding.substr(0, 1) !== ' ') {
      binding = ' ' + binding + ' ';
    }

    if (_.isPlainObject(where)) {
      Utils.getComplexKeys(where).forEach(prop => {
        const item = where[prop];
        items.push(this.whereItemQuery(prop, item, options));
      });
    } else {
      items.push(this.whereItemQuery(undefined, where, options));
    }

    return items.length && items.filter(item => item && item.length).join(binding) || '';
  }

  public OperatorMap = {
    [Op.eq]: '=',
    [Op.ne]: '!=',
    [Op.gte]: '>=',
    [Op.gt]: '>',
    [Op.lte]: '<=',
    [Op.lt]: '<',
    [Op.not]: 'IS NOT',
    [Op.is]: 'IS',
    [Op.in]: 'IN',
    [Op.notIn]: 'NOT IN',
    [Op.like]: 'LIKE',
    [Op.notLike]: 'NOT LIKE',
    [Op.iLike]: 'ILIKE',
    [Op.notILike]: 'NOT ILIKE',
    [Op.regexp]: '~',
    [Op.notRegexp]: '!~',
    [Op.iRegexp]: '~*',
    [Op.notIRegexp]: '!~*',
    [Op.between]: 'BETWEEN',
    [Op.notBetween]: 'NOT BETWEEN',
    [Op.overlap]: '&&',
    [Op.contains]: '@>',
    [Op.contained]: '<@',
    [Op.adjacent]: '-|-',
    [Op.strictLeft]: '<<',
    [Op.strictRight]: '>>',
    [Op.noExtendRight]: '&<',
    [Op.noExtendLeft]: '&>',
    [Op.any]: 'ANY',
    [Op.all]: 'ALL',
    [Op.and]: ' AND ',
    [Op.or]: ' OR ',
    [Op.col]: 'COL',
    [Op.placeholder]: '$$PLACEHOLDER$$',
    [Op.raw]: 'DEPRECATED' //kept here since we still throw an explicit error if operator being used remove by v5,
  };

  public OperatorsAliasMap : { [key : string] : symbol } | boolean = {};

  /**
   * Assign aliases to the operators
   */
  public setOperatorsAliases(aliases : any) {
    if (!aliases || _.isEmpty(aliases)) {
      this.OperatorsAliasMap = false;
    } else {
      this.OperatorsAliasMap = _.assign({}, aliases);
    }
  }

  /**
   * return an item of the where part of a query
   */
  public whereItemQuery(key : any, value : any, options? : {
    bind? : {},
    bindParam? : boolean,
    field?,
    model? : Model<any, any> | any,
    type? : string,
    modelAttributeMap? : {},
    prefix? : string,
    json? : {}
  }) : any {
    options = options || {};
    if (key && typeof key === 'string' && key.indexOf('.') !== -1 && options.model) {
      const keyParts = key.split('.');
      if (options.model.rawAttributes[keyParts[0]] && options.model.rawAttributes[keyParts[0]].type instanceof DataTypes.JSON) {
        const tmp = {};
        const _field = options.model.rawAttributes[keyParts[0]];
        Dottie.set(tmp, keyParts.slice(1), value);
        return this.whereItemQuery(_field.field || keyParts[0], tmp, Object.assign({field: _field}, options));
      }
    }

    let field = this._findField(key, options);
    const fieldType = field && field.type || options.type;

    const isPlainObject = _.isPlainObject(value);
    const isArray = !isPlainObject && Array.isArray(value);
    key = this.OperatorsAliasMap && this.OperatorsAliasMap[key] || key;
    if (isPlainObject) {
      value = this._replaceAliases(value);
    }
    const valueKeys = isPlainObject && Utils.getComplexKeys(value);
    let opValue;

    if (key === undefined) {
      if (typeof value === 'string') {
        return value;
      }

      if (isPlainObject && valueKeys.length === 1) {
        return this.whereItemQuery(valueKeys[0], value[valueKeys[0]], options);
      }
    }

    if (value === null) {
      opValue = options.bindParam ? 'NULL' : this.escape(value, field);
      return this._joinKeyValue(key, opValue, this.OperatorMap[Op.is], options.prefix);
    }

    if (!value) {
      opValue = options.bindParam ? this.format(value, field, options, options.bindParam) : this.escape(value, field);
      return this._joinKeyValue(key, opValue, this.OperatorMap[Op.eq], options.prefix);
    }

    if (value instanceof AllUtils.SequelizeMethod && !(key !== undefined && value instanceof AllUtils.Fn)) {
      return this.handleSequelizeMethod(value);
    }

    // Convert where: [] to Op.and if possible, else treat as literal/replacements
    if (key === undefined && isArray) {
      if (Utils.canTreatArrayAsAnd(value)) {
        key = Op.and;
      } else {
        throw new Error('Support for literal replacements in the `where` object has been removed.');
      }
    }

    if (key === Op.or || key === Op.and || key === Op.not) {
      return this._whereGroupBind(key, value, options);
    }


    if (value[Op.or]) {
      return this._whereBind(this.OperatorMap[Op.or], key, value[Op.or], options);
    }

    if (value[Op.and]) {
      return this._whereBind(this.OperatorMap[Op.and], key, value[Op.and], options);
    }

    if (isArray && fieldType instanceof DataTypes.ARRAY) {
      opValue = options.bindParam ? this.format(value, field, options, options.bindParam) : this.escape(value, field);
      return this._joinKeyValue(key, opValue, this.OperatorMap[Op.eq], options.prefix);
    }

    if (isPlainObject && fieldType instanceof DataTypes.JSON && options.json !== false) {
      return this._whereJSON(key, value, options);
    }
    // If multiple keys we combine the different logic conditions
    if (isPlainObject && valueKeys.length > 1) {
      return this._whereBind(this.OperatorMap[Op.and], key, value, options);
    }

    if (isArray) {
      return this._whereParseSingleValueObject(key, field, Op.in, value, options);
    }
    if (isPlainObject) {
      if (this.OperatorMap[valueKeys[0]]) {
        return this._whereParseSingleValueObject(key, field, valueKeys[0], value[valueKeys[0]], options);
      } else {
        return this._whereParseSingleValueObject(key, field, this.OperatorMap[Op.eq], value, options);
      }
    }
    if (this.dialect === 'oracle' && options.bindParam) {
      field = field || (options.modelAttributeMap && options.modelAttributeMap[key]) ? field : options.modelAttributeMap[key];
      if (field && field.type != null && (field.type.key === DataTypes.DATE.key || field.type.key === DataTypes.DATEONLY.key || field.type.key === DataTypes.TIME.key)) {
        opValue = this.escape(value, field);
      } else {
        const bindKey = (this as any).findBindKey(options.bind, 'where' + key);
        opValue = ':' + bindKey;
        const val = this.format(value, field, options, options.bindParam);
        // we set number value of oracleDb attributes so we don't need to import oracleDb in an abstract file
        options.bind[bindKey] = {
          dir : 3001, //oracleDb.BIND_IN
          val
        };
        if (value === null) {
          options.bind[bindKey]['type'] = 2001; //oracleDb.STRING
        }
      }
    } else {
      opValue = options.bindParam ? this.format(value, field, options, options.bindParam) : this.escape(value, field);
    }
    if (key === Op.placeholder) {
      return this._joinKeyValue(this.OperatorMap[key], opValue, this.OperatorMap[Op.eq], options.prefix);
    }
    return this._joinKeyValue(key, opValue, this.OperatorMap[Op.eq], options.prefix);
  }

  /**
   * return if exist options.field or the field of the attribute designated by the key
   * @hidden
   */
  private _findField(key : string, options : { field? : { type? : string }, model? : Model<any, any>, prefix? : string }) : { type? : any } {
    if (options.field) {
      return options.field;
    }

    if (options.model && options.model.rawAttributes && options.model.rawAttributes[key]) {
      return options.model.rawAttributes[key];
    }

    if (options.model && options.model.fieldRawAttributesMap && options.model.fieldRawAttributesMap[key]) {
      return options.model.fieldRawAttributesMap[key];
    }
  }

  /**
   * replace the operators aliases
   * @hidden
   */
  private _replaceAliases(orig : {}) {
    const obj = {};
    if (!this.OperatorsAliasMap) {
      return orig;
    }

    Utils.getOperators(orig).forEach(op => {
      const item = orig[op];
      if (_.isPlainObject(item)) {
        obj[op] = this._replaceAliases(item);
      } else {
        obj[op] = item;
      }
    });

    _.forOwn(orig, (item, prop) => {
      prop = this.OperatorsAliasMap[prop] || prop;
      if (_.isPlainObject(item)) {
        item = this._replaceAliases(item);
      }
      obj[prop] = item;
    });
    return obj;
  }

  /**
   * OR/AND/NOT grouping logic
   * @hidden
   */
  private _whereGroupBind(key : any, value : any, options : { model? : Model<any, any>, prefix? : string } ) : string {
    const binding = key === Op.or ? this.OperatorMap[Op.or] : this.OperatorMap[Op.and];
    const outerBinding = key === Op.not ? 'NOT ' : '';

    if (Array.isArray(value)) {
      value = value.map(item => {
        let itemQuery = this.whereItemsQuery(item, options, this.OperatorMap[Op.and]);
        if (itemQuery && itemQuery.length && (Array.isArray(item) || _.isPlainObject(item)) && Utils.getComplexSize(item) > 1) {
          itemQuery = '(' + itemQuery + ')';
        }
        return itemQuery;
      }).filter(item => item && item.length);

      value = value.length && value.join(binding);
    } else {
      value = this.whereItemsQuery(value, options, binding);
    }
    // Op.or: [] should return no data.
    // Op.not of no restriction should also return no data
    if ((key === Op.or || key === Op.not) && !value) {
      return '0 = 1';
    }

    return value ? outerBinding + '(' + value + ')' : undefined;
  }

  /**
   * @hidden
   */
  private _whereBind(binding : string, key : string, value : any, options : {}) {
    if (_.isPlainObject(value)) {
      value = Utils.getComplexKeys(value).map(prop => {
        const item = value[prop];
        return this.whereItemQuery(key, {[prop]: item}, options);
      });
    } else {
      value = value.map(item => this.whereItemQuery(key, item, options));
    }

    value = value.filter(item => item && item.length);

    return value.length ? '(' + value.join(binding) + ')' : undefined;
  }

  /**
   * @hidden
   */
  private _whereJSON(key : string, value : any, options : { prefix? }) {
    const items = [];
    let baseKey = this.quoteIdentifier(key);
    if (options.prefix) {
      if (options.prefix instanceof AllUtils.Literal) {
        baseKey = `${this.handleSequelizeMethod(options.prefix)}.${baseKey}`;
      } else {
        baseKey = `${this.quoteTable(options.prefix)}.${baseKey}`;
      }
    }

    Utils.getOperators(value).forEach(op => {
      const where = {};
      where[op] = value[op];
      items.push(this.whereItemQuery(key, where, _.assign({}, options, {json: false})));
    });

    _.forOwn(value, (item, prop) => {
      this._traverseJSON(items, baseKey, prop, item, [prop]);
    });

    const result = items.join(this.OperatorMap[Op.and]);
    return items.length > 1 ? '(' + result + ')' : result;
  }

  /**
   * @hidden
   */
  private _traverseJSON(items, baseKey, prop, item, path) {
    let cast;

    if (path[path.length - 1].indexOf('::') > -1) {
      const tmp = path[path.length - 1].split('::');
      cast = tmp[1];
      path[path.length - 1] = tmp[0];
    }

    const pathKey = this.jsonPathExtractionQuery(baseKey, path);

    if (_.isPlainObject(item)) {
      Utils.getOperators(item).forEach(op => {
        const value = this._toJSONValue(item[op]);
        items.push(this.whereItemQuery(this._castKey(pathKey, value, cast), {[op]: value}));
      });
      _.forOwn(item, (value, itemProp) => {
        this._traverseJSON(items, baseKey, itemProp, value, path.concat([itemProp]));
      });

      return;
    }

    item = this._toJSONValue(item);
    items.push(this.whereItemQuery(this._castKey(pathKey, item, cast), {[Op.eq]: item}));
  }

  public _toJSONValue(value : any) {
    return value;
  }

  /**
   * @hidden
   */
  private _castKey(key, value, cast, json?) {
    cast = cast || this._getJsonCast(Array.isArray(value) ? value[0] : value);
    if (cast) {
      return new AllUtils.Literal(this.handleSequelizeMethod(new AllUtils.Cast(new AllUtils.Literal(key), cast, json)));
    }

    return new AllUtils.Literal(key);
  }

  /**
   * @hidden
   */
  private _getJsonCast(value : any) {
    if (typeof value === 'number') {
      return 'double precision';
    }
    if (value instanceof Date) {
      return 'timestamptz';
    }
    if (typeof value === 'boolean') {
      return 'boolean';
    }
    return;
  }

  /**
   * @hidden
   */
  private _joinKeyValue(key : string, value : any, comparator : string, prefix : string) : any {
    if (!key) {
      return value;
    }
    if (comparator === undefined) {
      throw new Error(`${key} and ${value} has no comperator`);
    }
    key = this._getSafeKey(key, prefix);
    return [key, value].join(' ' + comparator + ' ');
  }

  /**
   * @hidden
   */
  private _getSafeKey(key : any, prefix : string) : string {
    if (key instanceof AllUtils.SequelizeMethod) {
      key = this.handleSequelizeMethod(key);
      return this._prefixKey(this.handleSequelizeMethod(key), prefix);
    }

    if (Utils.isColString(key)) {
      key = key.substr(1, key.length - 2).split('.');

      if (key.length > 2) {
        key = [
          // join the tables by -> to match out internal namings
          key.slice(0, -1).join('->'),
          key[key.length - 1],
        ];
      }

      return key.map(identifier => this.quoteIdentifier(identifier)).join('.');
    }

    return this._prefixKey(this.quoteIdentifier(key), prefix);
  }

  /**
   * @hidden
   */
  private _prefixKey(key : string, prefix : any) : string {
    if (prefix) {
      if (prefix instanceof AllUtils.Literal) {
        return [this.handleSequelizeMethod(prefix), key].join('.');
      }

      return [this.quoteTable(prefix), key].join('.');
    }

    return key;
  }

  /**
   * @hidden
   */
  private _whereParseSingleValueObject(key : string, field : { type? }, prop : any, value : any, options : {
    allowNull? : any[],
    /** = false, Pass query execution time in milliseconds as second argument to logging function (options.logging). */
    benchmark? : boolean,
    databaseVersion? : number,
    define? : {},
    /** The dialect of the database you are connecting to. One of mysql, postgres, sqlite, oracle and mssql. */
    dialect? : string,
    /** = null, If specified, load the dialect library from this path. For example, if you want to use pg.js instead of pg when connecting to a pg database, you should specify 'pg.js' here */
    dialectModulePath? : string,
    /** An object of additional options, which are passed directly to the connection library */
    dialectOptions? : {},
    fields? : string[],
    force? : boolean,
    hasTrigger? : boolean,
    hooks? : boolean,
    /** = 'localhost', The host of the relational database. */
    host? : string,
    individualHooks? : boolean,
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
    quoteIdentifiers? : boolean,
    /** = false, Use read / write replication. To enable replication, pass an object, with two properties, read and write. */
    replication? : boolean,
    /** Set of flags that control when a query is automatically retried. */
    retry? : { max? : number, match? : any[] },
    returning? : boolean,
    sideEffects? : boolean,
    skip? : any,
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
    if (prop === Op.not) {
      if (Array.isArray(value)) {
        prop = Op.notIn;
      } else if ([null, true, false].indexOf(value) < 0) {
        prop = Op.ne;
      }
    }

    let comparator = this.OperatorMap[prop] || this.OperatorMap[Op.eq];

    switch (prop) {
      case Op.in:
      case Op.notIn:
        if (value instanceof AllUtils.Literal) {
          return this._joinKeyValue(key, value.val, comparator, options.prefix);
        }

        if (value.length) {
          return this._joinKeyValue(key, `(${value.map(item => this.escape(item, field)).join(', ')})`, comparator, options.prefix);
        }

        if (comparator === this.OperatorMap[Op.in]) {
          return this._joinKeyValue(key, '(NULL)', comparator, options.prefix);
        }

        return '';
      case Op.any:
      case Op.all:
        comparator = `${this.OperatorMap[Op.eq]} ${comparator}`;
        if (value[Op.values]) {
          return this._joinKeyValue(key, `(VALUES ${value[Op.values].map(item => `(${this.escape(item)})`).join(', ')})`, comparator, options.prefix);
        }

        return this._joinKeyValue(key, `(${this.escape(value, field)})`, comparator, options.prefix);
      case Op.between:
      case Op.notBetween:
        return this._joinKeyValue(key, `${this.escape(value[0])} AND ${this.escape(value[1])}`, comparator, options.prefix);
      case Op.raw:
        throw new Error('The `$raw` where property is no longer supported.  Use `sequelize.literal` instead.');
      case Op.col:
        comparator = this.OperatorMap[Op.eq];
        value = value.split('.');

        if (value.length > 2) {
          value = [
            // join the tables by -> to match out internal namings
            value.slice(0, -1).join('->'),
            value[value.length - 1],
          ];
        }

        return this._joinKeyValue(key, value.map(identifier => this.quoteIdentifier(identifier)).join('.'), comparator, options.prefix);
    }

    const escapeOptions : {
      acceptStrings? : boolean,
      isList? : boolean
    } = {
      acceptStrings: comparator.indexOf(this.OperatorMap[Op.like]) !== -1
    };

    if (_.isPlainObject(value)) {
      if (value[Op.col]) {
        return this._joinKeyValue(key, this.whereItemQuery(null, value), comparator, options.prefix);
      }
      if (value[Op.any]) {
        escapeOptions.isList = true;
        return this._joinKeyValue(key, `(${this.escape(value[Op.any], field, escapeOptions)})`, `${comparator} ${this.OperatorMap[Op.any]}`, options.prefix);
      }
      if (value[Op.all]) {
        escapeOptions.isList = true;
        return this._joinKeyValue(key, `(${this.escape(value[Op.all], field, escapeOptions)})`, `${comparator} ${this.OperatorMap[Op.all]}`, options.prefix);
      }
    }

    if (value === null && comparator === this.OperatorMap[Op.eq]) {
      return this._joinKeyValue(key, this.escape(value, field, escapeOptions), this.OperatorMap[Op.is], options.prefix);
    } else if (value === null && comparator === this.OperatorMap[Op.ne]) {
      return this._joinKeyValue(key, this.escape(value, field, escapeOptions), this.OperatorMap[Op.not], options.prefix);
    }

    return this._joinKeyValue(key, this.escape(value, field, escapeOptions), comparator, options.prefix);
  }

 /**
  * Takes something and transforms it into values of a where condition.
  */
  public getWhereConditions(smth : {}, tableName? : string, factory? : Model<any, any>, options? : {
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
    model? : Model<any, any>,
    plain? : boolean,
    /** Error if no result found */
    rejectOnEmpty? : boolean,
    /** Separate requests if multiple left outer */
    separate?,
    /** Passes by sub-query ? */
    subQuery? : boolean,
    tableNames? : string[],
    topLimit? : any,
    topModel? : Model<any, any>,
    type ? : string,
    /** A hash of search attributes. */
    where? : {}
  }, prepend?) : string {
    let result = null;
    const where = {};

    if (Array.isArray(tableName)) {
      tableName = tableName[0];
      if (Array.isArray(tableName)) {
        tableName = tableName[1];
      }
    }

    options = options || {};

    if (typeof prepend === 'undefined') {
      prepend = true;
    }

    if (smth && smth instanceof AllUtils.SequelizeMethod) { // Checking a property is cheaper than a lot of instanceof calls
      result = this.handleSequelizeMethod(smth, tableName, factory, options, prepend);
    } else if (_.isPlainObject(smth)) {
      return this.whereItemsQuery(smth, {
        model: factory,
        prefix: prepend && tableName
      });
    } else if (typeof smth === 'number') {
      let primaryKeys : any = factory ? Object.keys(factory.primaryKeys) : [];

      if (primaryKeys.length > 0) {
        // Since we're just a number, assume only the first key
        primaryKeys = primaryKeys[0];
      } else {
        primaryKeys = 'id';
      }

      where[primaryKeys] = smth;

      return this.whereItemsQuery(where, {
        model: factory,
        prefix: prepend && tableName
      });
    } else if (typeof smth === 'string') {
      return this.whereItemsQuery(smth, {
        model: factory,
        prefix: prepend && tableName
      });
    } else if (Buffer.isBuffer(smth)) {
      result = this.escape(smth);
    } else if (Array.isArray(smth)) {
      if (smth.length === 0 || smth.length > 0 && smth[0].length === 0) {
        return '1=1';
      }
      if (Utils.canTreatArrayAsAnd(smth)) {
        const _smth = { [Op.and]: smth };
        result = this.getWhereConditions(_smth, tableName, factory, options, prepend);
      } else {
        throw new Error('Support for literal replacements in the `where` object has been removed.');
      }
    } else if (smth === null) {
      return this.whereItemsQuery(smth, {
        model: factory,
        prefix: prepend && tableName
      });
    }

    return result || result === 0  ? result : '1=1';
  }

  /**
   * A recursive parser for nested where conditions
   */
  public parseConditionObject(conditions : {}, path?) : any {
    path = path || [];
    return _.reduce(conditions, (result, value, key) => {
      if (_.isObject(value)) {
        result = result.concat(this.parseConditionObject(value, path.concat(key))); // Recursively parse objects
      } else {
        result.push({ path: path.concat(key), value });
      }
      return result;
    }, []);
  }

  /**
   * return true if the string is identifier quoted
   */
  public isIdentifierQuoted(string : string) : boolean {
    return /^\s*(?:([`"'])(?:(?!\1).|\1{2})*\1\.?)+\s*$/i.test(string);
  }

  public booleanValue(value) {
    return value;
  }

  public abstract quoteIdentifier(identifier, force?);
  protected abstract jsonPathExtractionQuery(column, path);
  /**
   * return a query to create a schema
   */
  public abstract createSchema(schema);
  /**
   * return a query to show the schema
   */
  public abstract showSchemasQuery();
  public abstract versionQuery();
  /**
   * change all attributes to sql
   */
  public abstract attributesToSQL(attributes, options?);
   /**
    * return a query to create a table
    */
  public abstract createTableQuery(tableName, attributes, options);
  /**
   * return a query to drop a foreign key
   */
  public abstract dropForeignKeyQuery(tableName, foreignKey);
  /**
   * return a query to show the tables
   */
  public abstract showTablesQuery();
  /**
   * return a query to add a column to a table
   */
  public abstract addColumnQuery(table, key, dataType);
  /**
   * return a query to remove a column of a table
   */
  public abstract removeColumnQuery(tableName, attributeName);
  /**
   * return a query to change a column of a table
   */
  public abstract changeColumnQuery(tableName, attributes);
  /**
   * return a query to rename a column of a table
   */
  public abstract renameColumnQuery(tableName, attrBefore, attributes);
  /**
   * return a query to show indexes
   */
  public abstract showIndexesQuery(tableName, options?);
  /**
   * Generates an SQL query that returns all foreign keys details of a table.
   * @param table : string | { tableName? : string, schema? : string}
   * @param catalogName database name
   */
  public abstract getForeignKeysQuery(table, catalogName?);
  /**
   * return a query to remove index
   */
  public abstract removeIndexQuery(tableName, indexNameOrAttributes, ...args);
  /**
   * return a query to show constraints
   */
  public abstract showConstraintsQuery(tableName, constraintName?);
  /**
   * return an upsert query
   */
  public abstract upsertQuery(tableName, insertValues, updateValues, where, model, options?);
  /**
   * return a delete query
   */
  public abstract deleteQuery(tableName, where, options, model?);

  public abstract truncateTableQuery(tablename, options?);
}
