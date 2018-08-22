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
    describe('count', () => {
      let Child : Model<ItestInstance, ItestAttribute>;
      let ScopeMe : Model<ItestInstance, ItestAttribute>;
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
            },
            attributes: ['id', 'username', 'email', 'access_level']
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
            },
            withIncludeFunction: () => {
              return {
                include: [{
                  model: Child,
                  where: {
                    priority: 1
                  }
                }]
              };
            },
            withIncludeFunctionAndStringAssociation: () => {
              return {
                include: [{
                  association: 'Children',
                  where: {
                    priority: 1
                  }
                }]
              };
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
        return expect(ScopeMe.count()).to.eventually.equal(2);
      });

      it('should be able to override default scope', function() {
        return expect(ScopeMe.count({ where: { access_level: { gt: 5 }}})).to.eventually.equal(1);
      });

      it('should be able to unscope', function() {
        return expect(ScopeMe.unscoped().count()).to.eventually.equal(4);
      });

      it('should be able to apply other scopes', function() {
        return expect(ScopeMe.scope('lowAccess').count()).to.eventually.equal(3);
      });

      it('should be able to merge scopes with where', function() {
        return expect(ScopeMe.scope('lowAccess').count({ where: { username: 'dan'}})).to.eventually.equal(1);
      });

      it('should ignore the order option if it is found within the scope', function() {
        return expect(ScopeMe.scope('withOrder').count()).to.eventually.equal(4);
      });

      it('should be able to use where on include', function() {
        return expect(ScopeMe.scope('withInclude').count()).to.eventually.equal(1);
      });

      it('should be able to use include with function scope', function() {
        return expect(ScopeMe.scope('withIncludeFunction').count()).to.eventually.equal(1);
      });

      it('should be able to use include with function scope and string association', function() {
        return expect(ScopeMe.scope('withIncludeFunctionAndStringAssociation').count()).to.eventually.equal(1);
      });
    });
  });
});
