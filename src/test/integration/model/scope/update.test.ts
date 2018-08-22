'use strict';

import * as chai from 'chai';
import * as _ from 'lodash';
import DataTypes from '../../../../lib/data-types';
import { Model } from '../../../../lib/model';
import { ItestAttribute, ItestInstance } from '../../../dummy/dummy-data-set';
import Support from '../../support';
const expect = chai.expect;
const current = Support.sequelize;

describe(Support.getTestDialectTeaser('Model'), () => {
  describe('scope', () => {
    describe('update', () => {
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
        return ScopeMe.update({ username: 'ruben' }, { where: {}}).bind(this).then(function() {
          return ScopeMe.unscoped().findAll({ where: { username: 'ruben' }});
        }).then(users => {
          expect(users).to.have.length(2);
          expect(users[0].get('email')).to.equal('tobi@fakeemail.com');
          expect(users[1].get('email')).to.equal('dan@sequelizejs.com');
        });
      });

      it('should be able to override default scope', function() {
        return ScopeMe.update({ username: 'ruben' }, { where: { access_level: { lt: 5 }}}).bind(this).then(function() {
          return ScopeMe.unscoped().findAll({ where: { username: 'ruben' }});
        }).then(users => {
          expect(users).to.have.length(2);
          expect(users[0].get('email')).to.equal('tony@sequelizejs.com');
          expect(users[1].get('email')).to.equal('fred@foobar.com');
        });
      });

      it('should be able to unscope destroy', function() {
        return ScopeMe.unscoped().update({ username: 'ruben' }, { where: {}}).bind(this).then(function() {
          return ScopeMe.unscoped().findAll();
        }).then(rubens => {
          expect(_.every(rubens, r => {
            return r.get('username') === 'ruben';
          })).to.be.true;
        });
      });

      it('should be able to apply other scopes', function() {
        return ScopeMe.scope('lowAccess').update({ username: 'ruben' }, { where: {}}).bind(this).then(function() {
          return ScopeMe.unscoped().findAll({ where: { username: { $ne: 'ruben' }}});
        }).then(users => {
          expect(users).to.have.length(1);
          expect(users[0].get('email')).to.equal('tobi@fakeemail.com');
        });
      });

      it('should be able to merge scopes with where', function() {
        return ScopeMe.scope('lowAccess').update({ username: 'ruben' }, { where: { username: 'dan'}}).bind(this).then(function() {
          return ScopeMe.unscoped().findAll({ where: { username: 'ruben' }});
        }).then(users => {
          expect(users).to.have.length(1);
          expect(users[0].get('email')).to.equal('dan@sequelizejs.com');
        });
      });

      it('should work with empty where', function() {
        return ScopeMe.scope('lowAccess').update({
          username: 'ruby'
        }).then(() => {
          return ScopeMe.unscoped().findAll({ where: { username: 'ruby' }});
        }).then(users => {
          expect(users).to.have.length(3);
          users.forEach(user => {
            expect(user.get('username')).to.equal('ruby');
          });
        });
      });
    });
  });
});
