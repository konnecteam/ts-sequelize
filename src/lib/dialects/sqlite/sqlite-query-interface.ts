'use strict';

import * as Promise from 'bluebird';
import * as _ from 'lodash';
import DataTypes from '../../data-types';
import * as errors from '../../errors/index';
import { AbstractQueryInterface } from '../../query-interface';
import { QueryTypes } from '../../query-types';
import { Utils } from '../../utils';
import { SqliteQueryGenerator } from './sqlite-query-generator';
const UnknownConstraintError = errors.UnknownConstraintError;

/**
 * Returns an object that treats SQLite's inabilities to do certain queries.
 */
export class SqliteQueryInterface extends AbstractQueryInterface {
  /**
   * A wrapper that fixes SQLite's inability to remove columns from existing tables.
   * It will create a backup of the table, drop the table afterwards and create a
   * new table with the same name but without the obsolete column.
   *
   * @param tableName The name of the table.
   * @param attributeName The name of the attribute that we want to remove.
   * @param options.logging : Boolean|Function. A function that logs the sql queries, or false for explicitly not logging these queries
   *
   * @since 1.6.0
   */
  public removeColumn(tableName : string, attributeName : string, options : {}) : any {
    options = options || {};

    return this.describeTable(tableName, options).then(fields => {
      delete fields[attributeName];

      const sql = this.QueryGenerator.removeColumnQuery(tableName, fields);
      const subQueries = sql.split(';').filter(q => q !== '');

      return Promise.each(subQueries, subQuery => this.sequelize.query(subQuery + ';', _.assign({raw: true}, options)));
    });
  }


  /**
   * A wrapper that fixes SQLite's inability to change columns from existing tables.
   * It will create a backup of the table, drop the table afterwards and create a
   * new table with the same name but with a modified version of the respective column.
   *
   * @param tableName The name of the table.
   * @param attributes An object with the attribute's name as key and its options as value object.
   * @param  options.logging : Boolean|Function. A function that logs the sql queries, or false for explicitly not logging these queries
   *
   * @since 1.6.0
   */
  public changeColumn(tableName : string, attributeName : string, dataTypeOrOptions : {}, options : {}) {
    const attributes = {};
    options = options || {};

    if (_.values(DataTypes).indexOf(dataTypeOrOptions) > -1) {
      attributes[attributeName] = { type: dataTypeOrOptions, allowNull: true };
    } else {
      attributes[attributeName] = dataTypeOrOptions;
    }

    attributes[attributeName].type = this.sequelize.normalizeDataType(attributes[attributeName].type);

    return this.describeTable(tableName, options).then(fields => {
      fields[attributeName] = attributes[attributeName];

      const sql = this.QueryGenerator.removeColumnQuery(tableName, fields);
      const subQueries = sql.split(';').filter(q => q !== '');

      return Promise.each(subQueries, subQuery => this.sequelize.query(subQuery + ';', _.assign({raw: true}, options)));
    });
  }

  /**
   * A wrapper that fixes SQLite's inability to rename columns from existing tables.
   * It will create a backup of the table, drop the table afterwards and create a
   * new table with the same name but with a renamed version of the respective column.
   *
   * @param tableName The name of the table.
   * @param attrNameBefore The name of the attribute before it was renamed.
   * @param attrNameAfter The name of the attribute after it was renamed.
   * @param  options.logging : Boolean|Function. A function that logs the sql queries, or false for explicitly not logging these queries
   *
   * @since 1.6.0
   */
  public renameColumn(tableName : string, attrNameBefore : string, attrNameAfter : string, options : {}) {
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

      return this.describeTable(tableName, options).then(fields => {
        fields[attrNameAfter] = _.clone(fields[attrNameBefore]);
        delete fields[attrNameBefore];

        const sql = (this.QueryGenerator as SqliteQueryGenerator).renameColumnQuery(tableName, attrNameBefore, attrNameAfter, fields);
        const subQueries = sql.split(';').filter(q => q !== '');

        return Promise.each(subQueries, subQuery => this.sequelize.query(subQuery + ';', _.assign({raw: true}, options)));
      });
    });
  }

  /**
   * remove a constraint
   */
  public removeConstraint(tableName : string, constraintName : string, options : {}) {
    let createTableSql;

    return this.showConstraint(tableName, constraintName)
      .then(constraints => {
        const constraint = constraints[0];

        if (constraint) {
          createTableSql = constraint.sql;
          constraint.constraintName = this.QueryGenerator.quoteIdentifier(constraint.constraintName);
          let constraintSnippet = `, CONSTRAINT ${constraint.constraintName} ${constraint.constraintType} ${constraint.constraintCondition}`;

          if (constraint.constraintType === 'FOREIGN KEY') {
            const referenceTableName = this.QueryGenerator.quoteTable(constraint.referenceTableName);
            constraint.referenceTableKeys = constraint.referenceTableKeys.map(columnName => this.QueryGenerator.quoteIdentifier(columnName));
            const referenceTableKeys = constraint.referenceTableKeys.join(', ');
            constraintSnippet += ` REFERENCES ${referenceTableName} (${referenceTableKeys})`;
            constraintSnippet += ` ON UPDATE ${constraint.updateAction}`;
            constraintSnippet += ` ON DELETE ${constraint.deleteAction}`;
          }

          createTableSql = createTableSql.replace(constraintSnippet, '');
          createTableSql += ';';

          return this.describeTable(tableName, options);
        } else {
          throw new UnknownConstraintError(`Constraint ${constraintName} on table ${tableName} does not exist`);
        }
      })
      .then(fields => {
        const sql = (this.QueryGenerator as SqliteQueryGenerator)._alterConstraintQuery(tableName, fields, createTableSql);
        const subQueries = sql.split(';').filter(q => q !== '');

        return Promise.each(subQueries, subQuery => this.sequelize.query(subQuery + ';', _.assign({raw: true}, options)));
      });
  }

  /**
   * add a constraint
   */
  public addConstraint(tableName : string, attributes : any[], options : { fields?, type?, schema? : string }, rawTablename : string | {}) : Promise<any> {
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

    const constraintSnippet = this.QueryGenerator.getConstraintSnippet(tableName, options);
    const describeCreateTableSql = (this.QueryGenerator as SqliteQueryGenerator).describeCreateTableQuery(tableName);
    let createTableSql;

    return this.sequelize.query(describeCreateTableSql, options)
      .then(constraints => {
        const sql = constraints[0].sql;
        const index = sql.length - 1;
        //Replace ending ')' with constraint snippet - Simulates String.replaceAt
        //http://stackoverflow.com/questions/1431094
        createTableSql = sql.substr(0, index) +  `, ${constraintSnippet})` + sql.substr(index + 1) + ';';

        return this.describeTable(tableName, options);
      })
      .then(fields => {
        const sql = (this.QueryGenerator as SqliteQueryGenerator)._alterConstraintQuery(tableName, fields, createTableSql);
        const subQueries = sql.split(';').filter(q => q !== '');

        return Promise.each(subQueries, subQuery => this.sequelize.query(subQuery + ';', _.assign({raw: true}, options)));
      });
  }

  /**
   * Get foreign key references details for the table.
   * @param options  Query Options
   */
  public getForeignKeyReferencesForTable(tableName : string, options : {}) : Promise<any> {
    const queryOptions = Object.assign({}, options, {
      type: QueryTypes.FOREIGNKEYS
    });
    const database = this.sequelize.config.database;
    const query = this.QueryGenerator.getForeignKeysQuery(tableName, database);
    return this.sequelize.query(query, queryOptions)
      .then(result => {
        return result.map(row => ({
          tableName,
          columnName: row.from,
          referencedTableName: row.table,
          referencedColumnName: row.to,
          tableCatalog: database,
          referencedTableCatalog: database
        }));
      });
  }
}
