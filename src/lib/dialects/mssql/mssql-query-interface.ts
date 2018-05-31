'use strict';

import { Sequelize } from '../../..';
import { AbstractQueryInterface } from '../../query-interface';
import { MssqlQueryGenerator } from './mssql-query-generator';

/**
 * Returns an object that treats MSSQL's inabilities to do certain queries.
 *
 * @class QueryInterface
 */

export class MssqlQueryInterface extends AbstractQueryInterface {

  constructor(sequelize : Sequelize) {
    super(sequelize);
  }

  /**
   * A wrapper that fixes MSSQL's inability to cleanly remove columns from existing tables if they have a default constraint.
   *
   * @param tableName     The name of the table.
   * @param attributeName The name of the attribute that we want to remove.
   * @param options
   * @param  options.logging : Boolean|Function. A function that logs the sql queries, or false for explicitly not logging these queries
   */
  public removeColumn(tableName : string, attributeName : string, options : { logging? : boolean | any, raw? : boolean }) : Promise<any> {
    options = Object.assign({ raw: true }, options || {});

    const findConstraintSql = (this.QueryGenerator as MssqlQueryGenerator).getDefaultConstraintQuery(tableName, attributeName);
    return this.sequelize.query(findConstraintSql, options)
    .spread(results => {
      if (!results.length) {
        // No default constraint found -- we can cleanly remove the column
        return;
      }
      const dropConstraintSql = (this.QueryGenerator as MssqlQueryGenerator).dropConstraintQuery(tableName, results[0].name);
      return this.sequelize.query(dropConstraintSql, options);
    })
    .then(() => {
      const findForeignKeySql = (this.QueryGenerator as MssqlQueryGenerator).getForeignKeyQuery(tableName, attributeName);
      return this.sequelize.query(findForeignKeySql, options);
    })
    .spread(results => {
      if (!results.length) {
        // No foreign key constraints found, so we can remove the column
        return;
      }
      const dropForeignKeySql = this.QueryGenerator.dropForeignKeyQuery(tableName, results[0].constraint_name);
      return this.sequelize.query(dropForeignKeySql, options);
    })
    .then(() => {
      //Check if the current column is a primaryKey
      const primaryKeyConstraintSql = (this.QueryGenerator as MssqlQueryGenerator).getPrimaryKeyConstraintQuery(tableName, attributeName);
      return this.sequelize.query(primaryKeyConstraintSql, options);
    })
    .spread(result => {
      if (!result.length) {
        return;
      }
      const dropConstraintSql = (this.QueryGenerator as MssqlQueryGenerator).dropConstraintQuery(tableName, result[0].constraintName);
      return this.sequelize.query(dropConstraintSql, options);
    })
    .then(() => {
      const removeSql = this.QueryGenerator.removeColumnQuery(tableName, attributeName);
      return this.sequelize.query(removeSql, options);
    });
  }
}
