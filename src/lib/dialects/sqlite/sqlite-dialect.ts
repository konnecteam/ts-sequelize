'use strict';

import * as _ from 'lodash';
import { Sequelize } from '../../..';
import AllDataTypes from '../../data-types';
import { AbstractDialect } from '../abstract/abstract-dialect';
import { SqliteConnectionManager } from './sqlite-connection-manager';
import { SqliteQuery } from './sqlite-query';
import { SqliteQueryGenerator } from './sqlite-query-generator';
import { SqliteQueryInterface } from './sqlite-query-interface';

const DataTypes = AllDataTypes.sqlite;

export class SqliteDialect extends AbstractDialect {
  constructor(sequelize : Sequelize) {
    super();
    this.sequelize = sequelize;
    this.connectionManager = new SqliteConnectionManager(this, sequelize);
    this.QueryGenerator = new SqliteQueryGenerator({
      options: sequelize.options,
      _dialect: this,
      sequelize
    });
    this.connectionManager.defaultVersion = '3.8.0';
    this.Query = SqliteQuery;
    this.DataTypes = DataTypes;
    this.name = 'sqlite';
    this.TICK_CHAR = '`';
    this.TICK_CHAR_LEFT = this.TICK_CHAR;
    this.TICK_CHAR_RIGHT = this.TICK_CHAR;
    this.supports = _.merge(_.cloneDeep(AbstractDialect.prototype.supports), {
      'DEFAULT': false,
      'DEFAULT VALUES': true,
      'UNION ALL': false,
      'IGNORE': ' OR IGNORE',
      'index': {
        using: false,
        where: true
      },
      'transactionOptions': {
        type: true,
        autocommit: false
      },
      'constraints': {
        addConstraint: false,
        dropConstraint: false
      },
      'joinTableDependent': false,
      'groupedLimit': false,
      'ignoreDuplicates': ' OR IGNORE',
      'JSON': true
    });
  }

  public createQueryInterface() : SqliteQueryInterface {
    return new SqliteQueryInterface(this.sequelize);
  }
}
