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
    describe('destroy', () => {
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
            }
          },
          scopes: {
            lowAccess: {
              where: {
                access_level: {
                  lte: 5
                }
              }
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
        return ScopeMe.destroy({ where: {}}).bind(this).then(function() {
          return ScopeMe.unscoped().findAll();
        }).then(users => {
          expect(users).to.have.length(2);
          expect(users[0].get('username')).to.equal('tony');
          expect(users[1].get('username')).to.equal('fred');
        });
      });

      it('should be able to override default scope', function() {
        return ScopeMe.destroy({ where: { access_level: { lt: 5 }}}).bind(this).then(function() {
          return ScopeMe.unscoped().findAll();
        }).then(users => {
          expect(users).to.have.length(2);
          expect(users[0].get('username')).to.equal('tobi');
          expect(users[1].get('username')).to.equal('dan');
        });
      });

      it('should be able to unscope destroy', function() {
        return ScopeMe.unscoped().destroy({ where: {}}).bind(this).then(function() {
          return expect(ScopeMe.unscoped().findAll()).to.eventually.have.length(0);
        });
      });

      it('should be able to apply other scopes', function() {
        return ScopeMe.scope('lowAccess').destroy({ where: {}}).bind(this).then(function() {
          return ScopeMe.unscoped().findAll();
        }).then(users => {
          expect(users).to.have.length(1);
          expect(users[0].get('username')).to.equal('tobi');
        });
      });

      it('should be able to merge scopes with where', function() {
        return ScopeMe.scope('lowAccess').destroy({ where: { username: 'dan'}}).bind(this).then(function() {
          return ScopeMe.unscoped().findAll();
        }).then(users => {
          expect(users).to.have.length(3);
          expect(users[0].get('username')).to.equal('tony');
          expect(users[1].get('username')).to.equal('tobi');
          expect(users[2].get('username')).to.equal('fred');
        });
      });

      it('should work with empty where', function() {
        return ScopeMe.scope('lowAccess').destroy().then(() => {
          return ScopeMe.unscoped().findAll();
        }).then(users => {
          expect(users).to.have.length(1);
          expect(users[0].get('username')).to.equal('tobi');
        });
      });
    });
  });
});
