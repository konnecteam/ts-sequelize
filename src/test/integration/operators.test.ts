'use strict';

import * as chai from 'chai';
import { Model } from '../..';
import DataTypes from '../../lib/data-types';
import { ItestAttribute, ItestInstance } from '../dummy/dummy-data-set';
import Support from './support';
const expect = chai.expect;
const dialect = Support.getTestDialect();
const Sequelize = Support.Sequelize;
const Op = Sequelize.Op;
const Promise = Sequelize.Promise;
const current = Support.sequelize;

describe(Support.getTestDialectTeaser('Operators'), () => {
  describe('REGEXP', () => {
    let User : Model<ItestInstance, ItestAttribute>;
    beforeEach(function() {
      User = current.define<ItestInstance, ItestAttribute>('user', {
        id: {
          type: DataTypes.INTEGER,
          allowNull: false,
          primaryKey: true,
          autoIncrement: true,
          field: 'userId'
        },
        name: {
          type: DataTypes.STRING,
          field: 'full_name'
        }
      }, {
        tableName: 'users',
        timestamps: false
      });

      return Promise.all([
        current.getQueryInterface().createTable('users', {
          userId: {
            type: DataTypes.INTEGER,
            allowNull: false,
            primaryKey: true,
            autoIncrement: true
          },
          full_name: {
            type: DataTypes.STRING
          }}
        )]);
    });

    if (dialect === 'mysql' || dialect === 'postgres') {
      describe('case sensitive', () => {
        it('should work with a regexp where', function() {
          return User.create({
            name: 'Foobar'
          }).then(() => {
            return User.find({
              where: {
                name: {
                  [Op.regexp]: '^Foo'
                }
              }
            });
          }).then(user => {
            expect(user).to.be.ok;
          });
        });

        it('should work with a not regexp where', function() {
          return User.create({
            name: 'Foobar'
          }).then(() => {
            return User.find({
              where: {
                name: {
                  [Op.notRegexp]: '^Foo'
                }
              }
            });
          }).then(user => {
            expect(user).to.not.be.ok;
          });
        });

        it('should properly escape regular expressions', function() {
          return User.bulkCreate([{
            name: 'John'
          }, {
            name: 'Bob'
          }]).then(() => {
            return User.findAll({
              where: {
                name: {
                  [Op.notRegexp]: "Bob'; drop table users --"
                }
              }
            });
          }).then(() => {
            return User.findAll({
              where: {
                name: {
                  [Op.regexp]: "Bob'; drop table users --"
                }
              }
            });
          }).then(() => {
            return User.findAll();
          }).then(users => {
            expect(users).length(2);
          });
        });
      });
    }

    if (dialect === 'postgres') {
      describe('case insensitive', () => {
        it('should work with a case-insensitive regexp where', function() {
          return User.create({
            name: 'Foobar'
          }).then(() => {
            return User.find({
              where: {
                name: {
                  [Op.iRegexp]: '^foo'
                }
              }
            });
          }).then(user => {
            expect(user).to.be.ok;
          });
        });

        it('should work with a case-insensitive not regexp where', function() {
          return User.create({
            name: 'Foobar'
          }).then(() => {
            return User.find({
              where: {
                name: {
                  [Op.notIRegexp]: '^foo'
                }
              }
            });
          }).then(user => {
            expect(user).to.not.be.ok;
          });
        });

        it('should properly escape regular expressions', function() {
          return User.bulkCreate([{
            name: 'John'
          }, {
            name: 'Bob'
          }]).then(() => {
            return User.findAll({
              where: {
                name: {
                  [Op.iRegexp]: "Bob'; drop table users --"
                }
              }
            });
          }).then(() => {
            return User.findAll({
              where: {
                name: {
                  [Op.notIRegexp]: "Bob'; drop table users --"
                }
              }
            });
          }).then(() => {
            return User.findAll();
          }).then(users => {
            expect(users).length(2);
          });
        });
      });
    }
  });
});
