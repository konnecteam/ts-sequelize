'use strict';

import * as chai from 'chai';
import DataTypes from '../../../../lib/data-types';
import { Model } from '../../../../lib/model';
import { ItestAttribute, ItestInstance } from '../../../dummy/dummy-data-set';
import Support from '../../support';
const expect = chai.expect;
const current = Support.sequelize;

describe(Support.getTestDialectTeaser('Model'), () => {
  describe('scope', () => {
    describe('findAndCount', () => {
      let ScopeMe : Model<ItestInstance, ItestAttribute>;
      beforeEach(function() {
        ScopeMe = current.define<ItestInstance, ItestAttribute>('ScopeMe', {
          username: new DataTypes.STRING(),
          email: new DataTypes.STRING(),
          access_level: new DataTypes.INTEGER(),
          other_value: new DataTypes.INTEGER()
        }, {
          defaultScope: {
            where: {
              access_level: {
                gte: 5
              }
            },
            attributes: ['username', 'email', 'access_level']
          },
          scopes: {
            lowAccess: {
              where: {
                access_level: {
                  lte: 5
                }
              }
            },
            withOrder: {
              order: ['username']
            }
          }
        });

        return current.sync({force: true}).then(() => {
          const records = [
            {username: 'tony', email: 'tony@sequelizejs.com', access_level: 3, other_value: 7},
            {username: 'tobi', email: 'tobi@fakeemail.com', access_level: 10, other_value: 11},
            {username: 'dan', email: 'dan@sequelizejs.com', access_level: 5, other_value: 10},
            {username: 'fred', email: 'fred@foobar.com', access_level: 3, other_value: 7},
          ];
          return ScopeMe.bulkCreate(records);
        });
      });

      it('should apply defaultScope', function() {
        return ScopeMe.findAndCount().then(result => {
          expect(result.count).to.equal(2);
          expect(result.rows.length).to.equal(2);
        });
      });

      it('should be able to override default scope', function() {
        return ScopeMe.findAndCount({ where: { access_level: { gt: 5 }}})
          .then(result => {
            expect(result.count).to.equal(1);
            expect(result.rows.length).to.equal(1);
          });
      });

      it('should be able to unscope', function() {
        return ScopeMe.unscoped().findAndCount({ limit: 1 })
          .then(result => {
            expect(result.count).to.equal(4);
            expect(result.rows.length).to.equal(1);
          });
      });

      it('should be able to apply other scopes', function() {
        return ScopeMe.scope('lowAccess').findAndCount()
          .then(result => {
            expect(result.count).to.equal(3);
          });
      });

      it('should be able to merge scopes with where', function() {
        return ScopeMe.scope('lowAccess')
          .findAndCount({ where: { username: 'dan'}}).then(result => {
            expect(result.count).to.equal(1);
          });
      });

      it('should ignore the order option if it is found within the scope', function() {
        return ScopeMe.scope('withOrder').findAndCount()
          .then(result => {
            expect(result.count).to.equal(4);
          });
      });
    });
  });
});
