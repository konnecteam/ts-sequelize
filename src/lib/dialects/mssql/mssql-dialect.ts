'use strict';

import * as _ from 'lodash';
import { Sequelize } from '../../..';
import AllDataTypes from '../../data-types';
import { GlobalOptions } from '../../global-options';
import { AbstractDialect } from '../abstract/abstract-dialect';
import { MssqlConnectionManager } from './mssql-connection-manager';
import { MssqlQuery } from './mssql-query';
import { MssqlQueryGenerator } from './mssql-query-generator';
import { MssqlQueryInterface } from './mssql-query-interface';
const DataTypes = AllDataTypes.mssql;

export class MssqlDialect extends AbstractDialect {

  constructor(sequelize : Sequelize) {
    super();
    this.sequelize = sequelize;
    this.connectionManager = new MssqlConnectionManager(this, sequelize);
    this.QueryGenerator = new MssqlQueryGenerator({
      options: sequelize.options,
      _dialect: this,
      sequelize
    });
    this.Query = MssqlQuery;
    this.connectionManager.defaultVersion = '12.0.2000'; // SQL Server 2014 Express
    this.name = 'mssql';
    this.TICK_CHAR = '"';
    this.TICK_CHAR_LEFT = '[';
    this.TICK_CHAR_RIGHT = ']';
    if ( !('mssql' in GlobalOptions.Instance.dialectOptions)) {
      const noTimezone = sequelize.options.dialectOptions.noTimezone || false;
      GlobalOptions.Instance.dialectOptions['mssql'] = {
        noTimezone
      };
      delete sequelize.options.dialectOptions.noTimezone;
    }
    this.DataTypes = DataTypes;
    this.supports = _.merge(_.cloneDeep(AbstractDialect.prototype.supports), {
      'DEFAULT': true,
      'DEFAULT VALUES': true,
      'LIMIT ON UPDATE': true,
      'ORDER NULLS': false,
      'lock': false,
      'transactions': true,
      'migrations': false,
      'upserts': true,
      'returnValues': {
        output: true
      },
      'schemas': true,
      'autoIncrement': {
        identityInsert: true,
        defaultValue: false,
        update: false
      },
      'constraints': {
        restrict: false,
        default: true
      },
      'index': {
        collate: false,
        length: false,
        parser: false,
        type: true,
        using: false,
        where: true
      },
      'NUMERIC': true,
      'tmpTableTrigger': true,
    });
  }

  public createQueryInterface() : MssqlQueryInterface {
    return new MssqlQueryInterface(this.sequelize);
  }
}
