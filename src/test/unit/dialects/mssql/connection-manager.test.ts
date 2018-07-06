'use strict';

import * as chai from 'chai';
import * as sinon from 'sinon';
import * as tedious from 'tedious';
import {Sequelize} from '../../../../index';
import Support from '../../../support';
const expect = chai.expect;
const dialect = Support.getTestDialect();

if (dialect === 'mssql') {
  describe('[MSSQL Specific] Connection Manager', () => {
    let connectionStub;
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

      connectionStub = sinon.stub(tedious, 'Connection');
    });

    afterEach(function() {
      connectionStub.restore();
    });

    it('connectionManager._connect() does not delete `domain` from config.dialectOptions', function() {
      connectionStub.returns({on(event, cb) {
        if (event === 'connect') {
          setTimeout(() => {
            cb();
          }, 500);
        }
      }});

      expect(config.dialectOptions.domain).to.equal('TEST.COM');
      instance.dialect.connectionManager._connect(config);
      expect(config.dialectOptions.domain).to.equal('TEST.COM');
    });

    it('connectionManager._connect() should reject if end was called and connect was not', function() {
      connectionStub.returns({ on(event, cb) {
        if (event === 'end') {
          setTimeout(() => {
            cb();
          }, 500);
        }
      } });

      return instance.dialect.connectionManager._connect(config)
        .catch(err => {
          expect(err.name).to.equal('SequelizeConnectionError');
          expect(err.parent).to.equal('Connection was closed by remote server');
        });
    });
  });
}
