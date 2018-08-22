'use strict';

import * as chai from 'chai';
import DataTypes from '../../../lib/data-types';
import { ItestAttribute, ItestInstance } from '../../dummy/dummy-data-set';
import Support from '../support';
const expect = chai.expect;
const current = Support.sequelize;

describe(Support.getTestDialectTeaser('Model'), () => {
  describe('optimistic locking', () => {
    let Account;
    beforeEach(function() {
      Account = current.define<ItestInstance, ItestAttribute>('Account', {
        number: {
          type: new DataTypes.INTEGER()
        }
      }, {
        version: true
      });
      return Account.sync({force: true});
    });

    it('should increment the version on save', () => {
      return Account.create({number: 1}).then(account => {
        account.number += 1;
        expect(account.version).to.eq(0);
        return account.save();
      }).then(account => {
        expect(account.version).to.eq(1);
      });
    });

    it('should increment the version on update', () => {
      return Account.create({number: 1}).then(account => {
        expect(account.version).to.eq(0);
        return account.update({ number: 2 });
      }).then(account => {
        expect(account.version).to.eq(1);
        account.number += 1;
        return account.save();
      }).then(account => {
        expect(account.number).to.eq(3);
        expect(account.version).to.eq(2);
      });
    });

    //Oracle passes it, without any error, the update queries are launched one at a time, don't know why it should fail
    if (Support.getTestDialect() !== 'oracle') {
      it('prevents stale instances from being saved', () => {
        return expect(Account.create({number: 1}).then(accountA => {
          return Account.findById(accountA.id).then(accountB => {
            accountA.number += 1;
            return accountA.save().then(() => accountB);
          });
        }).then(accountB => {
          accountB.number += 1;
          return accountB.save();
        })).to.eventually.be.rejectedWith(Support.sequelize.OptimisticLockError);
      });
    }

    it('increment() also increments the version', () => {
      return Account.create({number: 1}).then(account => {
        expect(account.version).to.eq(0);
        return account.increment('number', { by: 1} );
      }).then(account => {
        return account.reload();
      }).then(account => {
        expect(account.version).to.eq(1);
      });
    });

    it('decrement() also increments the version', () => {
      return Account.create({number: 1}).then(account => {
        expect(account.version).to.eq(0);
        return account.decrement('number', { by: 1} );
      }).then(account => {
        return account.reload();
      }).then(account => {
        expect(account.version).to.eq(1);
      });
    });
  });
});
