'use strict';

import * as chai from 'chai';
import * as sinon from 'sinon';
import Support from '../support';
const expect = chai.expect;
const Sequelize = Support.sequelize;
const dialect = Support.getTestDialect();
const current = Support.sequelize;

describe('Transaction', function() {
  let stub;
  let stubConnection;
  let stubRelease;
  before(() => {
    stub = sinon.stub(current, 'query').returns(Sequelize.Promise.resolve({}));

    stubConnection = sinon.stub(current.connectionManager, 'getConnection')
      .returns(Sequelize.Promise.resolve({
        uuid: 'ssfdjd-434fd-43dfg23-2d',
        close() {}
      }));

    stubRelease = sinon.stub(current.connectionManager, 'releaseConnection')
      .returns(Sequelize.Promise.resolve());
  });

  beforeEach(() => {
    stub.resetHistory();
    stubConnection.resetHistory();
    stubRelease.resetHistory();
  });

  after(() => {
    stub.restore();
    stubConnection.restore();
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
      expect(stub.args.map(arg => arg[0])).to.deep.equal(expectations[dialect] || expectations.all);
      return Sequelize.Promise.resolve();
    });
  });
});
