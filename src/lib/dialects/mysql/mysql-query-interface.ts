'use strict';

import * as _ from 'lodash';
import * as errors from '../../errors/index';
import { AbstractQueryInterface } from '../../query-interface';
import { MysqlQueryGenerator } from './mysql-query-generator';
const UnknownConstraintError = errors.UnknownConstraintError;

/**
 * Returns an object that treats MySQL's inabilities to do certain queries.
 */

export class MysqlQueryInterface extends AbstractQueryInterface {

  /**
   * A wrapper that fixes MySQL's inability to cleanly remove columns from existing tables if they have a foreign key constraint.
   *
   * @param tableName The name of the table.
   * @param columnName The name of the attribute that we want to remove.
   */
  public removeColumn(tableName : any, columnName : string, options : {}) : Promise<any> {
    options = options || {};

    return this.sequelize.query(
      (this.QueryGenerator as MysqlQueryGenerator).getForeignKeyQuery(tableName.tableName ? tableName : {
        tableName,
        schema: this.sequelize.config.database
      }, columnName),
      _.assign({ raw: true }, options)
    )
      .spread(results => {
        //Exclude primary key constraint
        if (!results.length || results[0].constraint_name === 'PRIMARY') {
          // No foreign key constraints found, so we can remove the column
          return;
        }
        return this.sequelize.Promise.map(results, constraint => this.sequelize.query(
          this.QueryGenerator.dropForeignKeyQuery(tableName, constraint.constraint_name),
          _.assign({ raw: true }, options)
        ));
      })
      .then(() => this.sequelize.query(
        this.QueryGenerator.removeColumnQuery(tableName, columnName),
        _.assign({ raw: true }, options)
      ));
  }


  /**
   * remove a constraint
   */
  public removeConstraint(tableName : any, constraintName : string, options : {}) : Promise<any> {
    const sql = this.QueryGenerator.showConstraintsQuery(tableName.tableName ? tableName : {
      tableName,
      schema: this.sequelize.config.database
    }, constraintName);

    return this.sequelize.query(sql, Object.assign({}, options, { type: this.sequelize.QueryTypes.SHOWCONSTRAINTS }))
      .then(constraints => {
        const constraint = constraints[0];
        let query;
        if (constraint && constraint.constraintType) {
          if (constraint.constraintType === 'FOREIGN KEY') {
            query = this.QueryGenerator.dropForeignKeyQuery(tableName, constraintName);
          } else {
            query = this.QueryGenerator.removeIndexQuery(constraint.tableName, constraint.constraintName);
          }
        } else {
          throw new UnknownConstraintError(`Constraint ${constraintName} on table ${tableName} does not exist`);
        }

        return this.sequelize.query(query, options);
      });
  }
}
