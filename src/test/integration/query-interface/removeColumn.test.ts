'use strict';

import * as chai from 'chai';
import DataTypes from '../../../lib/data-types';
import { AbstractQueryInterface } from '../../../lib/query-interface';
import Support from '../../support';
const expect = chai.expect;
const dialect = Support.getTestDialect();
const current = Support.sequelize;

describe(Support.getTestDialectTeaser('QueryInterface'), () => {
  let queryInterface : AbstractQueryInterface;
  beforeEach(function() {
    current.options.quoteIdentifiers = true;
    queryInterface = current.getQueryInterface();
  });

  afterEach(function() {
    return current.dropAllSchemas();
  });

  describe('removeColumn', () => {
    describe('(without a schema)', () => {
      beforeEach(function() {
        return queryInterface.createTable('users', {
          id: {
            type: DataTypes.INTEGER,
            primaryKey: true,
            autoIncrement: true
          },
          firstName: {
            type: DataTypes.STRING,
            defaultValue: 'Someone'
          },
          lastName: {
            type: DataTypes.STRING
          },
          manager: {
            type: DataTypes.INTEGER,
            references: {
              model: 'users',
              key: 'id'
            }
          },
          email: {
            type: DataTypes.STRING,
            unique: true
          }
        });
      });

      it('should be able to remove a column with a default value', function() {
        return queryInterface.removeColumn('users', 'firstName').bind(this).then(function() {
          return queryInterface.describeTable('users');
        }).then(table => {
          expect(table).to.not.have.property('firstName');
        });
      });

      it('should be able to remove a column without default value', function() {
        return queryInterface.removeColumn('users', 'lastName').bind(this).then(function() {
          return queryInterface.describeTable('users');
        }).then(table => {
          expect(table).to.not.have.property('lastName');
        });
      });

      it('should be able to remove a column with a foreign key constraint', function() {
        return queryInterface.removeColumn('users', 'manager').bind(this).then(function() {
          return queryInterface.describeTable('users');
        }).then(table => {
          expect(table).to.not.have.property('manager');
        });
      });

      it('should be able to remove a column with primaryKey', function() {
        return queryInterface.removeColumn('users', 'manager').bind(this).then(function() {
          return queryInterface.describeTable('users');
        }).then(function(table) {
          expect(table).to.not.have.property('manager');
          return queryInterface.removeColumn('users', 'id');
        }).then(function() {
          return queryInterface.describeTable('users');
        }).then(table => {
          expect(table).to.not.have.property('id');
        });
      });

      // From MSSQL documentation on ALTER COLUMN:
      //    The modified column cannot be any one of the following:
      //      - Used in a CHECK or UNIQUE constraint.
      // https://docs.microsoft.com/en-us/sql/t-sql/statements/alter-table-transact-sql#arguments
      if (dialect !== 'mssql') {
        it('should be able to remove a column with unique contraint', function() {
          return queryInterface.removeColumn('users', 'email').bind(this).then(function() {
            return queryInterface.describeTable('users');
          }).then(table => {
            expect(table).to.not.have.property('email');
          });
        });
      }
    });

    describe('(with a schema)', () => {
      beforeEach(function() {
        return current.createSchema('archive').then(() => {
          return queryInterface.createTable({
            tableName: 'users',
            schema: 'archive'
          }, {
            id: {
              type: DataTypes.INTEGER,
              primaryKey: true,
              autoIncrement: true
            },
            firstName: {
              type: DataTypes.STRING,
              defaultValue: 'Someone'
            },
            lastName: {
              type: DataTypes.STRING
            },
            email: {
              type: DataTypes.STRING,
              unique: true
            }
          });
        });
      });

      it('should be able to remove a column with a default value', function() {
        return queryInterface.removeColumn({
          tableName: 'users',
          schema: 'archive'
        }, 'firstName'
        ).bind(this).then(function() {
          return queryInterface.describeTable({
            tableName: 'users',
            schema: 'archive'
          });
        }).then(table => {
          expect(table).to.not.have.property('firstName');
        });
      });

      it('should be able to remove a column without default value', function() {
        return queryInterface.removeColumn({
          tableName: 'users',
          schema: 'archive'
        }, 'lastName'
        ).bind(this).then(function() {
          return queryInterface.describeTable({
            tableName: 'users',
            schema: 'archive'
          });
        }).then(table => {
          expect(table).to.not.have.property('lastName');
        });
      });

      it('should be able to remove a column with primaryKey', function() {
        return queryInterface.removeColumn({
          tableName: 'users',
          schema: 'archive'
        }, 'id').bind(this).then(function() {
          return queryInterface.describeTable({
            tableName: 'users',
            schema: 'archive'
          });
        }).then(table => {
          expect(table).to.not.have.property('id');
        });
      });

      // From MSSQL documentation on ALTER COLUMN:
      //    The modified column cannot be any one of the following:
      //      - Used in a CHECK or UNIQUE constraint.
      // https://docs.microsoft.com/en-us/sql/t-sql/statements/alter-table-transact-sql#arguments
      if (dialect !== 'mssql') {
        it('should be able to remove a column with unique contraint', function() {
          return queryInterface.removeColumn({
            tableName: 'users',
            schema: 'archive'
          }, 'email').bind(this).then(function() {
            return queryInterface.describeTable({
              tableName: 'users',
              schema: 'archive'
            });
          }).then(table => {
            expect(table).to.not.have.property('email');
          });
        });
      }
    });
  });
});
