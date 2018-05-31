'use strict';

import * as chai from 'chai';
import * as sinon from 'sinon';
import DataTypes from '../../lib/data-types';
import Support from './support';
const expect = chai.expect;
const dialect = Support.getTestDialect();

describe(Support.getTestDialectTeaser('Replication'), function() {
  if (dialect === 'sqlite') {
    return;
  }

  let sandbox;
  let readSpy;
  let writeSpy;

  beforeEach(() => {
    sandbox = sinon.sandbox.create();

    (this as any).sequelize = Support.getSequelizeInstance(null, null, null, {
      replication: {
        write: Support.getConnectionOptions(),
        read: [Support.getConnectionOptions()]
      }
    });

    expect((this as any).sequelize.connectionManager.pool.write).to.be.ok;
    expect((this as any).sequelize.connectionManager.pool.read).to.be.ok;

    (this as any).User = (this as any).sequelize.define('User', {
      firstName: {
        type: new DataTypes.STRING(),
        field: 'first_name'
      }
    });

    return (this as any).User.sync({force: true})
      .then(() => {
        readSpy = sandbox.spy((this as any).sequelize.connectionManager.pool.read, 'acquire');
        writeSpy = sandbox.spy((this as any).sequelize.connectionManager.pool.write, 'acquire');
      });
  });

  afterEach(() => {
    sandbox.restore();
  });

  function expectReadCalls() {
    chai.expect(readSpy.callCount).least(1);
    chai.expect(writeSpy.notCalled).eql(true);
  }

  function expectWriteCalls() {
    chai.expect(writeSpy.callCount).least(1);
    chai.expect(readSpy.notCalled).eql(true);
  }

  it('should be able to make a write', () => {
    return (this as any).User.create({
      firstName: Math.random().toString()
    }).then(expectWriteCalls);
  });

  it('should be able to make a read', () => {
    return (this as any).User.findAll().then(expectReadCalls);
  });

  it('should run read-only transactions on the replica', () => {
    return (this as any).sequelize.transaction({readOnly: true}, transaction => {
      return (this as any).User.findAll({transaction});
    }).then(expectReadCalls);
  });

  it('should run non-read-only transactions on the primary', () => {
    return (this as any).sequelize.transaction(transaction => {
      return (this as any).User.findAll({transaction});
    }).then(expectWriteCalls);
  });
});
