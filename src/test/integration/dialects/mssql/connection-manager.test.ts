'use strict';

import * as chai from 'chai';
import Support from '../../support';
const expect = chai.expect;
const dialect = Support.getTestDialect();

if (dialect.match(/^mssql/)) {
  describe('[MSSQL Specific] Query Queue', () => {

    describe('Errors', () => {
      it('ECONNREFUSED', () => {
        const sequelize = Support.createSequelizeInstance({ host: '127.0.0.1', port: 34237 });
        return expect(sequelize.connectionManager.getConnection()).to.have.been.rejectedWith(sequelize.ConnectionRefusedError);
      });

      it('ENOTFOUND', () => {
        const sequelize = Support.createSequelizeInstance({ host: 'http://wowow.example.com' });
        return expect(sequelize.connectionManager.getConnection()).to.have.been.rejectedWith(sequelize.HostNotFoundError);
      });

      it('EHOSTUNREACH', () => {
        const sequelize = Support.createSequelizeInstance({ host: '255.255.255.255' });
        return expect(sequelize.connectionManager.getConnection()).to.have.been.rejectedWith(sequelize.HostNotReachableError);
      });

      it('ER_ACCESS_DENIED_ERROR | ELOGIN', () => {
        const sequelize = new Support.Sequelize('localhost', 'was', 'ddsd', Support.sequelize.options);
        return expect(sequelize.connectionManager.getConnection()).to.have.been.rejectedWith(sequelize.AccessDeniedError);
      });
    });
  });
}
