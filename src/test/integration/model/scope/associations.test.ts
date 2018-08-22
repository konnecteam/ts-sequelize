'use strict';

import * as chai from 'chai';
import { Model, Sequelize } from '../../../../index';
import { HasMany } from '../../../../lib/associations/has-many';
import DataTypes from '../../../../lib/data-types';
import { ItestAttribute, ItestInstance } from '../../../dummy/dummy-data-set';
import Support from '../../support';
const expect = chai.expect;
const Promise = Sequelize.Promise;
const current = Support.sequelize;

describe(Support.getTestDialectTeaser('Model'), () => {
  let Company : Model<ItestInstance, ItestAttribute>;
  let Project : Model<ItestInstance, ItestAttribute>;
  let ScopeMe : Model<ItestInstance, ItestAttribute>;
  let Profile : Model<ItestInstance, ItestAttribute>;
  let UserAssociation : HasMany<ItestInstance, ItestAttribute, any, any>;
  describe('scope', () => {
    describe('associations', () => {
      beforeEach(function() {
        const sequelize = current;

        ScopeMe = current.define<ItestInstance, ItestAttribute>('ScopeMe', {
          username: new DataTypes.STRING(),
          email: new DataTypes.STRING(),
          access_level: new DataTypes.INTEGER(),
          other_value: new DataTypes.INTEGER(),
          parent_id: new DataTypes.INTEGER()
        }, {
          defaultScope: {
            where: {
              access_level: {
                gte: 5
              }
            }
          },
          scopes: {
            isTony: {
              where: {
                username: {
                  $eq : 'tony'
                }
              }
            },
            includeActiveProjects() {
              return {
                include: [{
                  model: sequelize.models.company,
                  include: [sequelize.models.project.scope('active')]
                }]
              };
            }
          }
        });

        Project = current.define<ItestInstance, ItestAttribute>('project', {
          active: new DataTypes.BOOLEAN()
        }, {
          scopes: {
            active: {
              where: {
                active: true
              }
            }
          }
        });

        Company = current.define<ItestInstance, ItestAttribute>('company', {
          active: new DataTypes.BOOLEAN()
        }, {
          defaultScope: {
            where: { active: true }
          },
          scopes: {
            notActive: {
              where: {
                active: false
              }
            },
            reversed: {
              order: [['id', 'DESC']]
            }
          }
        });

        Profile = current.define<ItestInstance, ItestAttribute>('profile', {
          active: new DataTypes.BOOLEAN()
        }, {
          defaultScope: {
            where: { active: true }
          },
          scopes: {
            notActive: {
              where: {
                active: false
              }
            }
          }
        });

        Project.belongsToMany(Company, { through: 'CompanyProjects' });
        Company.belongsToMany(Project, { through: 'CompanyProjects' });

        ScopeMe.hasOne(Profile, { foreignKey: 'userId' });

        ScopeMe.belongsTo(Company);
        UserAssociation = Company.hasMany(ScopeMe, { as: 'users' });

        return current.sync({force: true}).bind(this).then(function() {
          return Promise.all([
            ScopeMe.create({ id: 1, username: 'dan', email: 'dan@sequelizejs.com', access_level: 5, other_value: 10, parent_id: 1}),
            ScopeMe.create({ id: 2, username: 'tobi', email: 'tobi@fakeemail.com', access_level: 10, other_value: 11, parent_id: 2}),
            ScopeMe.create({ id: 3, username: 'tony', email: 'tony@sequelizejs.com', access_level: 3, other_value: 7, parent_id: 1}),
            ScopeMe.create({ id: 4, username: 'fred', email: 'fred@foobar.com', access_level: 3, other_value: 7, parent_id: 1}),
            ScopeMe.create({ id: 5, username: 'bob', email: 'bob@foobar.com', access_level: 1, other_value: 9, parent_id: 5}),
            Company.create({ id: 1, active: true}),
            Company.create({ id: 2, active: false}),
          ]);
        }).spread((u1, u2, u3, u4, u5, c1, c2) => {
          return Promise.all([
            c1.setLinkedData({ model : 'ScopeMe', associationAlias : 'users' }, [u1, u2, u3, u4]),
            c2.setLinkedData({ model : 'ScopeMe', associationAlias : 'users' }, [u5]),
          ]);
        });
      });

      describe('include', () => {
        it('should scope columns properly', function() {
          // Will error with ambigous column if id is not scoped properly to `Company`.`id`
          return expect(Company.findAll({
            where: { id: 1 },
            include: [UserAssociation]
          })).not.to.be.rejected;
        });

        it('should apply default scope when including an associations', function() {
          return Company.findAll({
            include: [UserAssociation]
          }).get(0 as any).then(company => {
            expect(company.users).to.have.length(2);
          });
        });

        it('should apply default scope when including a model', function() {
          return Company.findAll({
            include: [{ model: ScopeMe, as: 'users'}]
          }).get(0 as any).then(company => {
            expect(company.users).to.have.length(2);
          });
        });

        it('should be able to include a scoped model', function() {
          return Company.findAll({
            include: [{ model: ScopeMe.scope('isTony'), as: 'users'}]
          }).get(0 as any).then(company => {
            expect(company.users).to.have.length(1);
            expect(company.users[0].get('username')).to.equal('tony');
          });
        });
      });

      describe('get', () => {
        beforeEach(function() {
          return Promise.all([
            Project.create(),
            Company.unscoped().findAll(),
          ]).spread((p : ItestInstance, companies) => {
            return p.setLinkedData('company', companies);
          });
        });

        describe('it should be able to unscope', () => {
          it('hasMany', function() {
            return Company.findById(1).then(company => {
              return company.getManyLinkedData<ItestInstance, ItestAttribute>({ model : 'ScopeMe', associationAlias : 'users' }, { scope: false});
            }).then(users => {
              expect(users).to.have.length(4);
            });
          });

          it('hasOne', function() {
            return Profile.create({
              active: false,
              userId: 1
            }).bind(this).then(function() {
              return ScopeMe.findById(1);
            }).then(user => {
              return user.getLinkedData<ItestInstance, ItestAttribute>('profile', { scope: false });
            }).then(profile => {
              expect(profile).to.be.ok;
            });
          });

          it('belongsTo', function() {
            return ScopeMe.unscoped().find({ where: { username: 'bob' }}).then(user => {
              return user.getLinkedData<ItestInstance, ItestAttribute>('company', { scope: false });
            }).then(company => {
              expect(company).to.be.ok;
            });
          });

          it('belongsToMany', function() {
            return Project.findAll().get(0 as any).then(p => {
              return p.getManyLinkedData<ItestInstance, ItestAttribute>('company', { scope: false});
            }).then(companies => {
              expect(companies).to.have.length(2);
            });
          });
        });

        describe('it should apply default scope', () => {
          it('hasMany', function() {
            return Company.findById(1).then(company => {
              return company.getManyLinkedData<ItestInstance, ItestAttribute>({ model : 'ScopeMe', associationAlias : 'users' });
            }).then(users => {
              expect(users).to.have.length(2);
            });
          });

          it('hasOne', function() {
            return Profile.create({
              active: false,
              userId: 1
            }).bind(this).then(function() {
              return ScopeMe.findById(1);
            }).then(user => {
              return user.getLinkedData<ItestInstance, ItestAttribute>('profile');
            }).then(profile => {
              expect(profile).not.to.be.ok;
            });
          });

          it('belongsTo', function() {
            return ScopeMe.unscoped().find({ where: { username: 'bob' }}).then(user => {
              return user.getLinkedData<ItestInstance, ItestAttribute>('company');
            }).then(company => {
              expect(company).not.to.be.ok;
            });
          });

          it('belongsToMany', function() {
            return Project.findAll().get(0 as any).then(p => {
              return p.getManyLinkedData<ItestInstance, ItestAttribute>('company');
            }).then(companies => {
              expect(companies).to.have.length(1);
              expect(companies[0].get('active')).to.be.ok;
            });
          });
        });

        describe('it should be able to apply another scope', () => {
          it('hasMany', function() {
            return Company.findById(1).then(company => {
              return company.getManyLinkedData<ItestInstance, ItestAttribute>({ model : 'ScopeMe', associationAlias : 'users' }, { scope: 'isTony'});
            }).then(users => {
              expect(users).to.have.length(1);
              expect(users[0].get('username')).to.equal('tony');
            });
          });

          it('hasOne', function() {
            return Profile.create({
              active: true,
              userId: 1
            }).bind(this).then(function() {
              return ScopeMe.findById(1);
            }).then(user => {
              return user.getLinkedData<ItestInstance, ItestAttribute>('profile', { scope: 'notActive' });
            }).then(profile => {
              expect(profile).not.to.be.ok;
            });
          });

          it('belongsTo', function() {
            return ScopeMe.unscoped().find({ where: { username: 'bob' }}).then(user => {
              return user.getLinkedData<ItestInstance, ItestAttribute>('company', { scope: 'notActive' });
            }).then(company => {
              expect(company).to.be.ok;
            });
          });

          it('belongsToMany', function() {
            return Project.findAll().get(0 as any).then(p => {
              return p.getManyLinkedData<ItestInstance, ItestAttribute>('company', { scope: 'reversed' });
            }).then(companies => {
              expect(companies).to.have.length(2);
              expect(companies[0].id).to.equal(2);
              expect(companies[1].id).to.equal(1);
            });
          });
        });
      });

      describe('scope with includes', () => {
        beforeEach(function() {
          return Promise.all([
            Company.findById(1),
            Project.create({ id: 1, active: true}),
            Project.create({ id: 2, active: false}),
          ]).spread((c, p1, p2) => {
            return c.setLinkedData('project', [p1, p2]);
          });
        });

        it('should scope columns properly', function() {
          return expect(ScopeMe.scope('includeActiveProjects').findAll()).not.to.be.rejected;
        });

        it('should apply scope conditions', function() {
          return ScopeMe.scope('includeActiveProjects').findOne({ where: { id: 1 }}).then(user => {
            expect(user.company.projects).to.have.length(1);
          });
        });
      });
    });
  });
});
