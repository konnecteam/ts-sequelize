'use strict';

import * as Promise from 'bluebird';
import * as chai from 'chai';
import DataTypes from '../../../../lib/data-types';
import { Model } from '../../../../lib/model';
import { ItestAttribute, ItestInstance } from '../../../dummy/dummy-data-set';
import Support from '../../support';
const expect = chai.expect;
const current = Support.sequelize;

describe(Support.getTestDialectTeaser('Model'), () => {
  describe('scope', () => {
    describe('aggregate', () => {
      let ScopeMe : Model<ItestInstance, ItestAttribute>;
      let Child : Model<ItestInstance, ItestAttribute>;
      beforeEach(function() {
        Child = current.define<ItestInstance, ItestAttribute>('Child', {
          priority: new DataTypes.INTEGER()
        });
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
            }
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
            },
            withInclude: {
              include: [{
                model: Child,
                where: {
                  priority: 1
                }
              }]
            }
          }
        });
        Child.belongsTo(ScopeMe);
        ScopeMe.hasMany(Child);

        return current.sync({force: true}).then(() => {
          const records = [
            {username: 'tony', email: 'tony@sequelizejs.com', access_level: 3, other_value: 7},
            {username: 'tobi', email: 'tobi@fakeemail.com', access_level: 10, other_value: 11},
            {username: 'dan', email: 'dan@sequelizejs.com', access_level: 5, other_value: 10},
            {username: 'fred', email: 'fred@foobar.com', access_level: 3, other_value: 7},
          ];
          return ScopeMe.bulkCreate(records);
        }).then(() => {
          return ScopeMe.findAll();
        }).then(records => {
          return Promise.all([
            records[0].createLinkedData<ItestInstance, ItestAttribute>('Child', {
              priority: 1
            }),
            records[1].createLinkedData<ItestInstance, ItestAttribute>('Child', {
              priority: 2
            }),
          ]);
        });
      });

      it('should apply defaultScope', function() {
        return expect(ScopeMe.aggregate( '*', 'count' )).to.eventually.equal(2);
      });

      it('should be able to override default scope', function() {
        return expect(ScopeMe.aggregate( '*', 'count', { where: { access_level: { gt: 5 }}})).to.eventually.equal(1);
      });

      it('should be able to unscope', function() {
        return expect(ScopeMe.unscoped().aggregate( '*', 'count' )).to.eventually.equal(4);
      });

      it('should be able to apply other scopes', function() {
        return expect(ScopeMe.scope('lowAccess').aggregate( '*', 'count' )).to.eventually.equal(3);
      });

      it('should be able to merge scopes with where', function() {
        return expect(ScopeMe.scope('lowAccess').aggregate( '*', 'count', { where: { username: 'dan'}})).to.eventually.equal(1);
      });

      it('should be able to use where on include', function() {
        return expect(ScopeMe.scope('withInclude').aggregate( 'ScopeMe.id', 'count', {
          plain: true,
          dataType: new DataTypes.INTEGER(),
          includeIgnoreAttributes: false,
          limit: null,
          offset: null,
          order: null,
          attributes: []
        })).to.eventually.equal(1);
      });
    });
  });
});
