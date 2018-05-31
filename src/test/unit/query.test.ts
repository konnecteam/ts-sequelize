'use strict';

import * as chai from 'chai';
import * as sinon from 'sinon';
import Support from '../support';
const expect = chai.expect;
const Sequelize = Support.sequelize;
const Promise = Sequelize.Promise;
const current = Support.sequelize;

describe('sequelize.query', () => {
  it('connection should be released only once when retry fails', () => {
    const getConnectionStub = sinon.stub(current.connectionManager, 'getConnection').callsFake(() => {
      return Promise.resolve({});
    });
    const releaseConnectionStub = sinon.stub(current.connectionManager, 'releaseConnection').callsFake(() => {
      return Promise.resolve();
    });
    const queryStub = sinon.stub(current.dialect.Query.prototype, 'run').callsFake(() => {
      return Promise.reject(new Error('wrong sql'));
    });
    return current.query('THIS IS A WRONG SQL', {
      retry: {
        max: 2,
        // retry for all errors
        match: null
      }
    })
      .catch(() => {})
      .finally(() => {
        expect(releaseConnectionStub).have.been.calledOnce;
        queryStub.restore();
        getConnectionStub.restore();
        releaseConnectionStub.restore();
      });
  });
});
