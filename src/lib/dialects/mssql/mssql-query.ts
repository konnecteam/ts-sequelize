'use strict';

import * as _ from 'lodash';
import * as Tedious from 'tedious';
import { Sequelize } from '../../..';
import * as sequelizeErrors from '../../errors/index';
import Promise from '../../promise';
import { Utils } from '../../utils';
import { AbstractQuery } from '../abstract/abstract-query';
import * as connectionManager from './mssql-connection-manager';


const debug = Utils.getLogger().debugContext('sql:mssql');
const store = connectionManager.store;
const TYPES = Tedious.TYPES;

export class MssqlQuery extends AbstractQuery {

  constructor(connection : {}, sequelize : Sequelize, options : { transaction?, isolationLevel? : string, logging? : boolean, instance?, model? }) {
    super();
    this.connection = connection;
    this.instance = options.instance;
    this.model = options.model;
    this.sequelize = sequelize;
    this.options = _.extend({
      logging: console.log,
      plain: false,
      raw: false
    }, options || {});

    this.checkLoggingOption();
  }

  /**
   * Get the attributes of an insert query, which contains the just inserted id.
   */
  public getInsertIdField() : string {
    return 'id';
  }

  /**
   * @hidden
   */
  private getSQLTypeFromJsType(value : any) : { type?, typeOptions? } {
    const paramType = {type: TYPES.VarChar, typeOptions: {} };
    paramType.type = TYPES.NVarChar;
    if (typeof value === 'number') {
      if (Number.isInteger(value)) {
        paramType.type = TYPES.Int;
      } else {
        paramType.type = TYPES.Numeric;
        //Default to a reasonable numeric precision/scale pending more sophisticated logic
        paramType.typeOptions = {precision: 30, scale: 15};
      }
    }
    return paramType;
  }

  public _run(connection : any, sql : string, parameters : {}) : Promise<any> {
    this.sql = sql;
    const maxRows = this.sequelize.options && this.sequelize.options.dialectOptions ? this.sequelize.options.dialectOptions.maxRows : 0;
    let reachMaxRowsDone = false;

    //do we need benchmark for this query execution
    const benchmark = this.sequelize.options.benchmark || this.options.benchmark;
    let queryBegin;
    if (benchmark) {
      queryBegin = Date.now();
    } else {
      this.sequelize.log('Executing (' + (this.connection.uuid || 'default') + '): ' + this.sql, this.options);
    }

    debug(`executing(${this.connection.uuid || 'default'}) : ${this.sql}`);

    return new Promise((resolve, reject) => {
      // TRANSACTION SUPPORT
      if (_.startsWith(this.sql, 'BEGIN TRANSACTION')) {
        connection.beginTransaction(err => {
          if (err) {
            reject(this.formatError(err));
          } else {
            try {
              resolve(this.formatResults());
            } catch (formatErr) {
              reject(formatErr);
            }
          }
        }, this.options.transaction.name, MssqlQuery.mapIsolationLevelStringToTedious(this.options.isolationLevel, connection.lib));
      } else if (_.startsWith(this.sql, 'COMMIT TRANSACTION')) {
        connection.commitTransaction(err => {
          if (err) {
            reject(this.formatError(err));
          } else {
            try {
              resolve(this.formatResults());
            } catch (formatErr) {
              reject(formatErr);
            }
          }
        });
      } else if (_.startsWith(this.sql, 'ROLLBACK TRANSACTION')) {
        connection.rollbackTransaction(err => {
          if (err) {
            reject(this.formatError(err));
          } else {
            try {
              resolve(this.formatResults());
            } catch (formatErr) {
              reject(formatErr);
            }
          }
        }, this.options.transaction.name);
      } else if (_.startsWith(this.sql, 'SAVE TRANSACTION')) {
        connection.saveTransaction(err => {
          if (err) {
            reject(this.formatError(err));
          } else {
            try {
              resolve(this.formatResults());
            } catch (formatErr) {
              reject(formatErr);
            }
          }
        }, this.options.transaction.name);
      } else {
        const results = [];
        const request = new connection.lib.Request(this.sql, (err, rowCount) => {

          debug(`executed(${this.connection.uuid || 'default'}) : ${this.sql}`);
          console.log('executed ' + sql);

          if (benchmark) {
            this.sequelize.log('Executed (' + (this.connection.uuid || 'default') + '): ' + this.sql, Date.now() - queryBegin, this.options);
          }

          if (err) {
            err.sql = sql;
            reject(this.formatError(err));
          } else {
            try {
              resolve(this.formatResults(results, rowCount));
            } catch (formatErr) {
              reject(formatErr);
            }
          }
        });

        if (parameters) {
          _.forOwn(parameters, (value, key) => {
            const paramType = this.getSQLTypeFromJsType(value);
            request.addParameter(key, paramType.type, value, paramType.typeOptions);
          });
        }

        request.on('row', columns => {
          if (maxRows && results.length + 1 > maxRows) {
            // No more please
            if (!reachMaxRowsDone) {
              // We need this flag for Tedious 1.X, we can't stop 'row' event, thus we ignore it.
              reachMaxRowsDone = true;
              if (request.pause) {
                // Tedious 2.X
                // no more row event
                request.pause();
                // free connection
                connection.cancel();
              }

              // call as if finish
              request.callback();
              /**
               * HACK : as we call the callback manually, we go through 2 times; so after the manual call, we set it to empty function
               */
              request.userCallback = () => {};
            }
          } else {

            const row = {};
            for (const column of columns) {
              const typeid = column.metadata.type.id;
              const parse = store.get(typeid);
              let value = column.value;

              if (value !== null && !!parse) {
                value = parse(value);
              }
              row[column.metadata.colName] = value;
            }

            results.push(row);
          }
        });

        connection.execSql(request);
      }
    });
  }

  public run(sql : string, parameters : {}) : Promise<any> {
    return Promise.using(this.connection.lock(), connection => this._run(connection, sql, parameters));
  }

  /**
   * rewrite query with parameters
   */
  public static formatBindParameters(sql : string, values : any, dialect : string) : any[] {
    const bindParam = {};
    const replacementFunc = (match, key, replacementValues) => {
      if (replacementValues[key] !== undefined) {
        bindParam[key] = replacementValues[key];
        return '@' + key;
      }
      return undefined;
    };
    sql = AbstractQuery.formatBindParameters(sql, values, dialect, replacementFunc)[0];

    return [sql, bindParam];
  }

  /**
   * High level function that handles the results of a query execution.
   *
   *
   * Example:
   *  query.formatResults([
   *    {
   *      id: 1,              // this is from the main table
   *      attr2: 'snafu',     // this is from the main table
   *      Tasks.id: 1,        // this is from the associated table
   *      Tasks.title: 'task' // this is from the associated table
   *    }
   *  ])
   *
   * @param data - The result of the query execution.
   * @hidden
   */
  private formatResults(data? : any[], rowCount? : number) : any {
    let result : any = this.instance;
    if (this.isInsertQuery(data)) {
      this.handleInsertQuery(data);

      if (!this.instance) {
        if (this.options.plain) {
          // NOTE: super contrived. This just passes the newly added query-interface
          //       test returning only the PK. There isn't a way in MSSQL to identify
          //       that a given return value is the PK, and we have no schema information
          //       because there was no calling Model.
          const record = data[0];
          result = record[Object.keys(record)[0]];
        } else {
          result = data;
        }
      }
    }

    if (this.isShowTablesQuery()) {
      result = this.handleShowTablesQuery(data);
    } else if (this.isDescribeQuery()) {
      result = {};
      for (const _result of data) {
        if (_result.Default) {
          _result.Default = _result.Default.replace("('", '').replace("')", '').replace(/'/g, '');
        }

        result[_result.Name] = {
          type: _result.Type.toUpperCase(),
          allowNull: _result.IsNull === 'YES' ? true : false,
          defaultValue: _result.Default,
          primaryKey: _result.Constraint === 'PRIMARY KEY'
        };
      }
    } else if (this.isShowIndexesQuery()) {
      result = this.handleShowIndexesQuery(data);
    } else if (this.isSelectQuery()) {
      result = this.handleSelectQuery(data);
    } else if (this.isUpsertQuery()) {
      //Use the same return value as that of MySQL & Postgres
      if (data[0].$action === 'INSERT') {
        result = 1;
      } else {
        result = 2;
      }
    } else if (this.isCallQuery()) {
      result = data[0];
    } else if (this.isBulkUpdateQuery()) {
      result = data.length;
    } else if (this.isBulkDeleteQuery()) {
      result = data[0] && data[0].AFFECTEDROWS;
    } else if (this.isVersionQuery()) {
      result = data[0].version;
    } else if (this.isForeignKeysQuery()) {
      result = data;
    } else if (this.isInsertQuery() || this.isUpdateQuery()) {
      result = [result, rowCount];
    } else if (this.isShowConstraintsQuery()) {
      result = this.handleShowConstraintsQuery(data);
    } else if (this.isRawQuery()) {
      // MSSQL returns row data and metadata (affected rows etc) in a single object - let's standarize it, sorta
      result = [data, data];
    }

    return result;
  }

  /**
   * handle show tables query
   */
  public handleShowTablesQuery(results : any[]) : any {
    return results.map(resultSet => {
      return {
        tableName: resultSet.TABLE_NAME,
        schema: resultSet.TABLE_SCHEMA
      };
    });
  }

  /**
   * handle show constraints query
   * @hidden
   */
  private handleShowConstraintsQuery(data : any) : any {
    //Convert snake_case keys to camelCase as it's generated by stored procedure
    return data.slice(1).map(result => {
      const constraint = {};
      Object.keys(result).forEach(key => {
        constraint[_.camelCase(key)] = result[key];
      });
      return constraint;
    });
  }

  public formatError(err : { message? : string }) : Error {
    let match;
    match = err.message.match(/Violation of UNIQUE KEY constraint '((.|\s)*)'. Cannot insert duplicate key in object '.*'.(:? The duplicate key value is \((.*)\).)?/);
    match = match || err.message.match(/Cannot insert duplicate key row in object .* with unique index '(.*)'/);
    if (match && match.length > 1) {
      let fields = {};
      const uniqueKey = this.model && this.model.uniqueKeys[match[1]];
      let message = 'Validation error';

      if (uniqueKey && !!uniqueKey.msg) {
        message = uniqueKey.msg;
      }
      if (match[4]) {
        const values = match[4].split(',').map(part => part.trim());
        if (uniqueKey) {
          fields = _.zipObject(uniqueKey.fields, values);
        } else {
          fields[match[1]] = match[4];
        }
      }

      const errors = [];
      _.forOwn(fields, (value, field) => {
        errors.push(new sequelizeErrors.ValidationErrorItem(
          this.getUniqueConstraintErrorMessage(field),
          'unique violation', // sequelizeErrors.ValidationErrorItem.Origins.DB,
          field,
          value,
          this.instance,
          'not_unique'
        ));
      });

      return new sequelizeErrors.UniqueConstraintError({ message, errors, parent: err, fields });
    }

    match = err.message.match(/Failed on step '(.*)'.Could not create constraint. See previous errors./) ||
      err.message.match(/The DELETE statement conflicted with the REFERENCE constraint "(.*)". The conflict occurred in database "(.*)", table "(.*)", column '(.*)'./) ||
      err.message.match(/The INSERT statement conflicted with the FOREIGN KEY constraint "(.*)". The conflict occurred in database "(.*)", table "(.*)", column '(.*)'./) ||
      err.message.match(/The MERGE statement conflicted with the FOREIGN KEY constraint "(.*)". The conflict occurred in database "(.*)", table "(.*)", column '(.*)'./) ||
      err.message.match(/The UPDATE statement conflicted with the FOREIGN KEY constraint "(.*)". The conflict occurred in database "(.*)", table "(.*)", column '(.*)'./);
    if (match && match.length > 0) {
      return new sequelizeErrors.ForeignKeyConstraintError({
        fields: null,
        index: match[1],
        parent: err
      });
    }

    match = err.message.match(/Could not drop constraint. See previous errors./);

    if (match && match.length > 0) {
      return new sequelizeErrors.UnknownConstraintError(match[1]);
    }

    return new sequelizeErrors.DatabaseError(err);
  }

  // @unused
  public isShowOrDescribeQuery() : boolean {
    let result = false;

    result = result || this.sql.toLowerCase().indexOf("select c.column_name as 'name', c.data_type as 'type', c.is_nullable as 'isnull'") === 0;
    result = result || this.sql.toLowerCase().indexOf('select tablename = t.name, name = ind.name,') === 0;
    result = result || this.sql.toLowerCase().indexOf('exec sys.sp_helpindex @objname') === 0;

    return result;
  }

  public isShowIndexesQuery() : boolean {
    return this.sql.toLowerCase().indexOf('exec sys.sp_helpindex @objname') === 0;
  }

  /**
   * handle show indexes query
   * @hidden
   */
  private handleShowIndexesQuery(data : any) : {} {
    // Group by index name, and collect all fields
    data = _.reduce(data, (acc, item) => {
      if (!(item.index_name in acc)) {
        acc[item.index_name] = item;
        item.fields = [];
      }

      _.forEach(item.index_keys.split(','), column => {
        let columnName = column.trim();
        if (columnName.indexOf('(-)') !== -1) {
          columnName = columnName.replace('(-)', '');
        }

        acc[item.index_name].fields.push({
          attribute: columnName,
          length: undefined,
          order: column.indexOf('(-)') !== -1 ? 'DESC' : 'ASC',
          collate: undefined
        });
      });
      delete item.index_keys;
      return acc;
    }, {});

    return _.map(data, item => ({
      primary: item.index_name.toLowerCase().indexOf('pk') === 0,
      fields: item.fields,
      name: item.index_name,
      tableName: undefined,
      unique: item.index_description.toLowerCase().indexOf('unique') !== -1,
      type: undefined
    }));
  }

  /**
   * handle insert query
   */
  public handleInsertQuery(results : any[], metaData? : {}) {
    if (this.instance) {
      // add the inserted row id to the instance
      const autoIncrementAttribute = this.model.autoIncrementAttribute;
      let id = null;
      let autoIncrementAttributeAlias = null;

      if (this.model.rawAttributes.hasOwnProperty(autoIncrementAttribute) && this.model.rawAttributes[autoIncrementAttribute].field !== undefined) {
        autoIncrementAttributeAlias = this.model.rawAttributes[autoIncrementAttribute].field;
      }
      id = id || results && results[0][this.getInsertIdField()];
      id = id || metaData && metaData[this.getInsertIdField()];
      id = id || results && results[0][autoIncrementAttribute];
      id = id || autoIncrementAttributeAlias && results && results[0][autoIncrementAttributeAlias];

      this.instance[autoIncrementAttribute] = id;
    }
  }

  public static mapIsolationLevelStringToTedious(isolationLevel : string, tedious : any) : number {
    if (!tedious) {
      throw new Error('An instance of tedious lib should be passed to this function');
    }
    const tediousIsolationLevel = tedious.ISOLATION_LEVEL;
    switch (isolationLevel) {
      case 'READ_UNCOMMITTED':
        return tediousIsolationLevel.READ_UNCOMMITTED;
      case 'READ_COMMITTED':
        return tediousIsolationLevel.READ_COMMITTED;
      case 'REPEATABLE_READ':
        return tediousIsolationLevel.REPEATABLE_READ;
      case 'SERIALIZABLE':
        return tediousIsolationLevel.SERIALIZABLE;
      case 'SNAPSHOT':
        return tediousIsolationLevel.SNAPSHOT;
    }
  }
}

