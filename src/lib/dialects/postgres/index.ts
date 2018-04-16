'use strict';

import * as _ from 'lodash';
import {AbstractDialect} from '../abstract';
import {ConnectionManager} from './connection-manager';
import * as Query from './query';
import QueryGenerator from './query-generator';
import AllDataTypes from '../../data-types';
const DataTypes = AllDataTypes.postgres;

class PostgresDialect extends AbstractDialect {

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

PostgresDialect.prototype.supports = _.merge(_.cloneDeep(AbstractDialect.prototype.supports), {
  'DEFAULT VALUES': true,
  'EXCEPTION': true,
  'ON DUPLICATE KEY': false,
  'ORDER NULLS': true,
  returnValues: {
    returning: true
  },
  bulkDefault: true,
  schemas: true,
  lock: true,
  lockOf: true,
  lockKey: true,
  lockOuterJoinFailure: true,
  forShare: 'FOR SHARE',
  index: {
    concurrently: true,
    using: 2,
    where: true
  },
  NUMERIC: true,
  ARRAY: true,
  RANGE: true,
  GEOMETRY: true,
  REGEXP: true,
  GEOGRAPHY: true,
  JSON: true,
  JSONB: true,
  HSTORE: true,
  deferrableConstraints: true,
  searchPath: true
});

ConnectionManager.prototype.defaultVersion = '9.4.0';
PostgresDialect.prototype.Query = Query;
PostgresDialect.prototype.DataTypes = DataTypes;
PostgresDialect.prototype.name = 'postgres';
PostgresDialect.prototype.TICK_CHAR = '"';
PostgresDialect.prototype.TICK_CHAR_LEFT = PostgresDialect.prototype.TICK_CHAR;
PostgresDialect.prototype.TICK_CHAR_RIGHT = PostgresDialect.prototype.TICK_CHAR;

module.exports = PostgresDialect;
// module.exports.default = PostgresDialect;
// module.exports.PostgresDialect = PostgresDialect;
