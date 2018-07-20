'use strict';

import * as chai from 'chai';
import * as sinon from 'sinon';
import Support from '../support';
const expect = chai.expect;
const Sequelize = Support.sequelize;
const dialect = Support.getTestDialect();
const current = Support.sequelize;

describe('Transaction', function() {
  before(() => {
    (this as any).stub = sinon.stub(current, 'query').returns(Sequelize.Promise.resolve({}));

    (this as any).stubConnection = sinon.stub(current.connectionManager, 'getConnection')
      .returns(Sequelize.Promise.resolve({
        uuid: 'ssfdjd-434fd-43dfg23-2d',
        close() {}
      }));

    (this as any).stubRelease = sinon.stub(current.connectionManager, 'releaseConnection')
      .returns(Sequelize.Promise.resolve());
  });

  beforeEach(() => {
    (this as any).stub.resetHistory();
    (this as any).stubConnection.resetHistory();
    (this as any).stubRelease.resetHistory();
  });

  after(() => {
    (this as any).stub.restore();
    (this as any).stubConnection.restore();
  });

  it('should run auto commit query only when needed', () => {
    const expectations = {
      all: [
        'START TRANSACTION;',
      ],
      sqlite: [
        'BEGIN DEFERRED TRANSACTION;',
      ],
      mssql: [
        'BEGIN TRANSACTION;',
      ],
      oracle: [
        'BEGIN TRANSACTION',
      ]
    };
    return current.transaction(() => {
      expect((this as any).stub.args.map(arg => arg[0])).to.deep.equal(expectations[dialect] || expectations.all);
      return Sequelize.Promise.resolve();
    });
  });
});
