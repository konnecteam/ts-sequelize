'use strict';

import * as chai from 'chai';
import * as sinon from 'sinon';
import * as tedious from 'tedious';
import {Sequelize} from '../../../../index';
import Support from '../../../support';
const expect = chai.expect;
const dialect = Support.getTestDialect();
const connectionStub = sinon.stub(tedious, 'Connection');

connectionStub.returns({on() {}});

if (dialect === 'mssql') {
  describe('[MSSQL Specific] Connection Manager', () => {
    let instance;
    let config;
    beforeEach(() => {
      config = {
        dialect: 'mssql',
        database: 'none',
        username: 'none',
        password: 'none',
        host: 'localhost',
        port: 2433,
        pool: {},
        dialectOptions: {
          domain: 'TEST.COM'
        }
      };
      instance = new Sequelize(config.database
        , config.username
        , config.password
        , config);
    });

    it('connectionManager._connect() Does not delete `domain` from config.dialectOptions',
      () => {
        expect(config.dialectOptions.domain).to.equal('TEST.COM');
        instance.dialect.connectionManager._connect(config);
        expect(config.dialectOptions.domain).to.equal('TEST.COM');
      });
  });
}
