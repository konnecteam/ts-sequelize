'use strict';

import * as _ from 'lodash';
import {AbstractDialect} from '../abstract';
import {ConnectionManager} from './connection-manager';
import * as Query from './query';
import QueryGenerator from './query-generator';
import AllDataTypes from '../../data-types';
const DataTypes = AllDataTypes.mysql;

class MysqlDialect extends AbstractDialect {
  constructor(sequelize) {
    super();
    this.sequelize = sequelize;
    this.connectionManager = new ConnectionManager(this, sequelize);
    this.QueryGenerator = _.extend({}, QueryGenerator, {
      options: sequelize.options,
      _dialect: this,
      sequelize
    });
  }
}

MysqlDialect.prototype.supports = _.merge(_.cloneDeep(AbstractDialect.prototype.supports), {
  'VALUES ()': true,
  'LIMIT ON UPDATE': true,
  'IGNORE': ' IGNORE',
  lock: true,
  forShare: 'LOCK IN SHARE MODE',
  index: {
    collate: false,
    length: true,
    parser: true,
    type: true,
    using: 1
  },
  constraints: {
    dropConstraint: false,
    check: false
  },
  ignoreDuplicates: ' IGNORE',
  updateOnDuplicate: true,
  indexViaAlter: true,
  NUMERIC: true,
  GEOMETRY: true,
  JSON: true,
  REGEXP: true
});

ConnectionManager.prototype.defaultVersion = '5.6.0';
MysqlDialect.prototype.Query = Query;
MysqlDialect.prototype.QueryGenerator = QueryGenerator;
MysqlDialect.prototype.DataTypes = DataTypes;
MysqlDialect.prototype.name = 'mysql';
MysqlDialect.prototype.TICK_CHAR = '`';
MysqlDialect.prototype.TICK_CHAR_LEFT = MysqlDialect.prototype.TICK_CHAR;
MysqlDialect.prototype.TICK_CHAR_RIGHT = MysqlDialect.prototype.TICK_CHAR;

module.exports = MysqlDialect;
