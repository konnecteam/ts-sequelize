'use strict';

import * as _ from 'lodash';
import { Sequelize } from '../../..';
import AllDataTypes from '../../data-types';
import { AbstractDialect } from '../abstract/abstract-dialect';
import { PostgresConnectionManager } from './postgres-connection-manager';
import { PostgresQuery } from './postgres-query';
import { PostgresQueryGenerator } from './postgres-query-generator';
import { PostgresQueryInterface } from './postgres-query-interface';

const DataTypes = AllDataTypes.postgres;

export class PostgresDialect extends AbstractDialect {

  constructor(sequelize : Sequelize) {
    super();
    this.sequelize = sequelize;
    this.connectionManager = new PostgresConnectionManager(this, sequelize);
    this.QueryGenerator = new PostgresQueryGenerator({
      options: sequelize.options,
      _dialect: this,
      sequelize
    });
    this.connectionManager.defaultVersion = '9.4.0';
    this.Query = PostgresQuery;
    this.DataTypes = DataTypes;
    this.name = 'postgres';
    this.TICK_CHAR = '"';
    this.TICK_CHAR_LEFT = this.TICK_CHAR;
    this.TICK_CHAR_RIGHT = this.TICK_CHAR;
    this.supports = _.merge(_.cloneDeep(AbstractDialect.prototype.supports), {
      'DEFAULT VALUES': true,
      'EXCEPTION': true,
      'ON DUPLICATE KEY': false,
      'ORDER NULLS': true,
      'returnValues': {
        returning: true
      },
      'bulkDefault': true,
      'schemas': true,
      'lock': true,
      'lockOf': true,
      'lockKey': true,
      'lockOuterJoinFailure': true,
      'skipLocked': true,
      'forShare': 'FOR SHARE',
      'index': {
        concurrently: true,
        using: 2,
        where: true
      },
      'NUMERIC': true,
      'ARRAY': true,
      'RANGE': true,
      'GEOMETRY': true,
      'REGEXP': true,
      'GEOGRAPHY': true,
      'JSON': true,
      'JSONB': true,
      'HSTORE': true,
      'deferrableConstraints': true,
      'searchPath': true
    });
  }

  public createQueryInterface() : PostgresQueryInterface {
    return new PostgresQueryInterface(this.sequelize);
  }
}
