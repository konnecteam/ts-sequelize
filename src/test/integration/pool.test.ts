'use strict';

import * as chai from 'chai';
import * as sinon from 'sinon';
import Support from './support';
const expect = chai.expect;
const dialect = Support.getTestDialect();
const Sequelize = Support.Sequelize;

describe(Support.getTestDialectTeaser('Pooling'), function() {
  if (dialect === 'sqlite') {
    return;
  }

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

  it('should not result in unhandled promise rejection when unable to acquire connection', () => {
    (this as any).testInstance = new Sequelize('localhost', 'ffd', 'dfdf', {
      dialect,
      databaseVersion: '1.2.3',
      pool: {
        acquire: 1000,
        max: 1
      }
    });

    (this as any).sinon.stub((this as any).testInstance.connectionManager, '_connect')
      .returns(new Sequelize.Promise(() => {}));

    return expect((this as any).testInstance.transaction()
      .then(() => (this as any).testInstance.transaction()))
      .to.eventually.be.rejectedWith('ResourceRequest timed out');
  });
});
