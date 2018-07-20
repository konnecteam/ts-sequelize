'use strict';

import * as _ from 'lodash';
import { Sequelize } from '../../..';
import AllDataTypes from '../../data-types';
import { GlobalOptions } from '../../global-options';
import { AbstractDialect } from '../abstract/abstract-dialect';
import { OracleConnectionManager } from './oracle-connection-manager';
import { OracleQuery } from './oracle-query';
import { OracleQueryGenerator } from './oracle-query-generator';
import { OracleQueryInterface } from './oracle-query-interface';

const DataTypes = AllDataTypes.oracle;

export class OracleDialect extends AbstractDialect {

  constructor(sequelize : Sequelize) {
    super();
    this.sequelize = sequelize;
    this.connectionManager = new OracleConnectionManager(this, sequelize);
    this.connectionManager.initPools();
    this.QueryGenerator = new OracleQueryGenerator({
      options: sequelize.options,
      _dialect: this,
      sequelize
    });
    this.connectionManager.defaultVersion = '12.1.0.2.0';
    this.Query = OracleQuery;
    if ( !('oracle' in GlobalOptions.Instance.dialectOptions) && sequelize.options.dialectOptions) {
      const noTimezone = sequelize.options.dialectOptions.noTimezone || false;
      GlobalOptions.Instance.dialectOptions['oracle'] = {
        noTimezone
      };
      delete sequelize.options.dialectOptions.noTimezone;
    }
    this.DataTypes = DataTypes;
    this.name = 'oracle';
    this.TICK_CHAR = '';
    this.TICK_CHAR_LEFT = this.TICK_CHAR;
    this.TICK_CHAR_RIGHT = this.TICK_CHAR;
    this.supports = _.merge(_.cloneDeep(AbstractDialect.prototype.supports), {
      'VALUES ()': true,
      'LIMIT ON UPDATE': true,
      'IGNORE': ' IGNORE',
      'lock': false,
      'forShare': ' IN SHARE MODE',
      'index': {
        collate: false,
        length: false,
        parser: false,
        type: false,
        using: false
      },
      'constraints': {
        restrict: false
      },
      'returnValues': false,
      'ORDER NULLS': true,
      'ignoreDuplicates': false,
      'schemas': true,
      'updateOnDuplicate': false,
      'indexViaAlter': false,
      'NUMERIC': true,
      'upserts' : true,
      'GEOMETRY': false
    });
  }

  public createQueryInterface() : OracleQueryInterface {
    return new OracleQueryInterface(this.sequelize);
  }
}
