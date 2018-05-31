'use strict';

import * as chai from 'chai';
import {Sequelize} from '../../../../index';
import DataTypes from '../../../../lib/data-types';
import Support from '../../support';
const expect = chai.expect;
const Promise = Sequelize.Promise;
const dialect = Support.getTestDialect();

describe(Support.getTestDialectTeaser('Model'), () => {
  describe('attributes', () => {
    describe('operators', () => {
      describe('REGEXP', () => {
        beforeEach(function() {
          const queryInterface = this.sequelize.getQueryInterface();

          this.User = this.sequelize.define('user', {
            id: {
              type: new DataTypes.INTEGER(),
              allowNull: false,
              primaryKey: true,
              autoIncrement: true,
              field: 'userId'
            },
            name: {
              type: new DataTypes.STRING(),
              field: 'full_name'
            }
          }, {
            tableName: 'users',
            timestamps: false
          });

          return Promise.all([
            queryInterface.createTable('users', {
              userId: {
                type: new DataTypes.INTEGER(),
                allowNull: false,
                primaryKey: true,
                autoIncrement: true
              },
              full_name: {
                type: new DataTypes.STRING()
              }
            }),
          ]);
        });

        if (dialect === 'mysql' || dialect === 'postgres') {
          it('should work with a regexp where', function() {
            const self = this;

            return this.User.create({
              name: 'Foobar'
            }).then(() => {
              return self.User.find({
                where: {
                  name: {
                    $regexp: '^Foo'
                  }
                }
              });
            }).then(user => {
              expect(user).to.be.ok;
            });
          });

          it('should work with a not regexp where', function() {
            const self = this;

            return this.User.create({
              name: 'Foobar'
            }).then(() => {
              return self.User.find({
                where: {
                  name: {
                    $notRegexp: '^Foo'
                  }
                }
              });
            }).then(user => {
              expect(user).to.not.be.ok;
            });
          });

          if (dialect === 'postgres') {
            it('should work with a case-insensitive regexp where', function() {
              const self = this;

              return this.User.create({
                name: 'Foobar'
              }).then(() => {
                return self.User.find({
                  where: {
                    name: {
                      $iRegexp: '^foo'
                    }
                  }
                });
              }).then(user => {
                expect(user).to.be.ok;
              });
            });

            it('should work with a case-insensitive not regexp where', function() {
              const self = this;

              return this.User.create({
                name: 'Foobar'
              }).then(() => {
                return self.User.find({
                  where: {
                    name: {
                      $notIRegexp: '^foo'
                    }
                  }
                });
              }).then(user => {
                expect(user).to.not.be.ok;
              });
            });
          }
        }
      });
    });
  });
});
