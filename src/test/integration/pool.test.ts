'use strict';

import * as chai from 'chai';
const expect = chai.expect;
import Support from './support';
const dialect = Support.getTestDialect();
import * as sinon from 'sinon';
const Sequelize = Support.Sequelize;

describe(Support.getTestDialectTeaser('Pooling'), function() {
  if (dialect === 'sqlite') return;

  beforeEach(() => {
    (this as any).sinon = sinon.sandbox.create();
  });

  afterEach(() => {
    (this as any).sinon.restore();
  });

  it('should reject when unable to acquire connection in given time', () => {
    (this as any).testInstance = new Sequelize('localhost', 'ffd', 'dfdf', {
      dialect,
      databaseVersion: '1.2.3',
      pool: {
        acquire: 1000 //milliseconds
      }
    });

    (this as any).sinon.stub((this as any).testInstance.connectionManager, '_connect')
      .returns(new Sequelize.Promise(() => {}));

    return expect((this as any).testInstance.authenticate())
      .to.eventually.be.rejectedWith('ResourceRequest timed out');
  });
});
