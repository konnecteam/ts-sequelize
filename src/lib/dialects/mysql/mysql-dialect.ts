'use strict';

import * as _ from 'lodash';
import { Sequelize } from '../../..';
import AllDataTypes from '../../data-types';
import { AbstractDialect } from '../abstract/abstract-dialect';
import { MysqlConnectionManager } from './mysql-connection-manager';
import { MysqlQuery } from './mysql-query';
import { MysqlQueryGenerator } from './mysql-query-generator';
import { MysqlQueryInterface } from './mysql-query-interface';

const DataTypes = AllDataTypes.mysql;

export class MysqlDialect extends AbstractDialect {
  constructor(sequelize : Sequelize) {
    super();
    this.sequelize = sequelize;
    this.connectionManager = new MysqlConnectionManager(this, sequelize);
    this.QueryGenerator = new MysqlQueryGenerator({
      options: sequelize.options,
      _dialect: this,
      sequelize
    });
    this.connectionManager.defaultVersion = '5.6.0';
    this.Query = MysqlQuery;
    this.DataTypes = DataTypes;
    this.name = 'mysql';
    this.TICK_CHAR = '`';
    this.TICK_CHAR_LEFT = this.TICK_CHAR;
    this.TICK_CHAR_RIGHT = this.TICK_CHAR;
    this.supports = _.merge(_.cloneDeep(AbstractDialect.prototype.supports), {
      'VALUES ()': true,
      'LIMIT ON UPDATE': true,
      'IGNORE': ' IGNORE',
      'lock': true,
      'forShare': 'LOCK IN SHARE MODE',
      'index': {
        collate: false,
        length: true,
        parser: true,
        type: true,
        using: 1
      },
      'constraints': {
        dropConstraint: false,
        check: false
      },
      'ignoreDuplicates': ' IGNORE',
      'updateOnDuplicate': true,
      'indexViaAlter': true,
      'NUMERIC': true,
      'GEOMETRY': true,
      'JSON': true,
      'REGEXP': true
    });
  }

  public createQueryInterface() : MysqlQueryInterface {
    return new MysqlQueryInterface(this.sequelize);
  }
}

