'use strict';

import * as chai from 'chai';
import * as _ from 'lodash';
import { Model } from '../../..';
import DataTypes from '../../../lib/data-types';
import { ItestAttribute, ItestInstance } from '../../dummy/dummy-data-set';
import Support from '../support';
const expect = chai.expect;
const current = Support.sequelize;

describe(Support.getTestDialectTeaser('Model'), () => {
  describe('update', () => {
    let Account : Model<ItestInstance, ItestAttribute>;
    beforeEach(function() {
      Account = current.define<ItestInstance, ItestAttribute>('Account', {
        ownerId: {
          type: new DataTypes.INTEGER(),
          allowNull: false,
          field: 'owner_id'
        },
        name: {
          type: new DataTypes.STRING()
        }
      });
      return Account.sync({force: true});
    });

    it('should only update the passed fields', function() {
      return Account
        .create({ ownerId: 2 })
        .then(account => Account.update({
          name: Math.random().toString()
        }, {
          where: {
            id: account.get('id')
          }
        }));
    });


    if (_.get(current.dialect.supports, 'returnValues.returning')) {
      it('should return the updated record', function() {
        return Account.create({ ownerId: 2 }).then(account => {
          return Account.update({ name: 'FooBar' }, {
            where: {
              id: account.get('id')
            },
            returning: true
          }).spread((count, accounts) => {
            const firstAcc = accounts[0];
            expect(firstAcc.ownerId).to.be.equal(2);
            expect(firstAcc.name).to.be.equal('FooBar');
          });
        });
      });
    }

    if (current.dialect.supports['LIMIT ON UPDATE']) {
      it('should only update one row', function() {
        return Account.create({
          ownerId: 2,
          name: 'Account Name 1'
        })
          .then(() => {
            return Account.create({
              ownerId: 2,
              name: 'Account Name 2'
            });
          })
          .then(() => {
            return Account.create({
              ownerId: 2,
              name: 'Account Name 3'
            });
          })
          .then(() => {
            const options = {
              where: {
                ownerId: 2
              },
              limit: 1
            };
            return Account.update({ name: 'New Name' }, options);
          })
          .then(account => {
            expect(account[0]).to.equal(1);
          });
      });
    }
  });
});
