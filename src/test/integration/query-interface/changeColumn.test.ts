'use strict';

import * as chai from 'chai';
import DataTypes from '../../../lib/data-types';
import { AbstractQueryInterface } from '../../../lib/query-interface';
import Support from '../../support';
const expect = chai.expect;
const dialect = Support.getTestDialect();
const current = Support.sequelize;

let count = 0;
function log() {
  // sqlite fires a lot more querys than the other dbs. this is just a simple hack, since i'm lazy
  if (dialect !== 'sqlite' || count === 0) {
    count++;
  }
}

describe(Support.getTestDialectTeaser('QueryInterface'), () => {
  let queryInterface : AbstractQueryInterface;
  beforeEach(function() {
    current.options.quoteIdentifiers = true;
    queryInterface = current.getQueryInterface();
  });

  afterEach(function() {
    return current.dropAllSchemas();
  });

  describe('changeColumn', () => {
    it('should support schemas', function() {
      return current.createSchema('archive').bind(this).then(function() {
        return queryInterface.createTable({
          tableName: 'users',
          schema: 'archive'
        }, {
          id: {
            type: new DataTypes.INTEGER(),
            primaryKey: true,
            autoIncrement: true
          },
          currency: new DataTypes.INTEGER()
        }).bind(this).then(function() {
          return queryInterface.changeColumn({
            tableName: 'users',
            schema: 'archive'
          }, 'currency', {
            type: new DataTypes.FLOAT()
          });
        }).then(function() {
          return queryInterface.describeTable({
            tableName: 'users',
            schema: 'archive'
          });
        }).then(table => {
          if (dialect === 'postgres' || dialect === 'postgres-native') {
            expect(table.currency.type).to.equal('DOUBLE PRECISION');
          } else {
            expect(table.currency.type).to.equal('FLOAT');
          }
        });
      });
    });

    it('should change columns', function() {
      return queryInterface.createTable({
        tableName: 'users'
      }, {
        id: {
          type: new DataTypes.INTEGER(),
          primaryKey: true,
          autoIncrement: true
        },
        currency: new DataTypes.INTEGER()
      }).bind(this).then(function() {
        return queryInterface.changeColumn('users', 'currency', {
          type: new DataTypes.FLOAT(),
          allowNull: true
        });
      }).then(function() {
        return queryInterface.describeTable({
          tableName: 'users'
        });
      }).then(table => {
        if (dialect === 'postgres' || dialect === 'postgres-native') {
          expect(table.currency.type).to.equal('DOUBLE PRECISION');
        } else {
          expect(table.currency.type).to.equal('FLOAT');
        }
      });
    });

    // MSSQL doesn't support using a modified column in a check constraint.
    // https://docs.microsoft.com/en-us/sql/t-sql/statements/alter-table-transact-sql
    if (dialect !== 'mssql') {
      it('should work with enums', function() {
        return queryInterface.createTable({
          tableName: 'users'
        }, {
          firstName: new DataTypes.STRING()
        }).bind(this).then(function() {
          return queryInterface.changeColumn('users', 'firstName', {
            type: new DataTypes.ENUM(['value1', 'value2', 'value3'])
          });
        });
      });

      it('should work with enums with schemas', function() {
        return current.createSchema('archive').bind(this).then(function() {
          return queryInterface.createTable({
            tableName: 'users',
            schema: 'archive'
          }, {
            firstName: new DataTypes.STRING()
          });
        }).bind(this).then(function() {
          return queryInterface.changeColumn({
            tableName: 'users',
            schema: 'archive'
          }, 'firstName', {
            type: new DataTypes.ENUM(['value1', 'value2', 'value3'])
          });
        });
      });
    }

    //SQlite navitely doesnt support ALTER Foreign key
    if (dialect !== 'sqlite') {
      describe('should support foreign keys', () => {
        beforeEach(function() {
          return queryInterface.createTable('users', {
            id: {
              type: new DataTypes.INTEGER(),
              primaryKey: true,
              autoIncrement: true
            },
            level_id: {
              type: new DataTypes.INTEGER(),
              allowNull: false
            }
          })
            .bind(this).then(function() {
              return queryInterface.createTable('level', {
                id: {
                  type: new DataTypes.INTEGER(),
                  primaryKey: true,
                  autoIncrement: true
                }
              });
            });
        });

        it('able to change column to foreign key', function() {
          return queryInterface.changeColumn('users', 'level_id', {
            type: new DataTypes.INTEGER(),
            references: {
              model: 'level',
              key: 'id'
            },
            onUpdate: 'cascade',
            onDelete: 'cascade'
          }, {logging: log}).then(() => {
            expect(count).to.be.equal(1);
            count = 0;
          });
        });

      });
    }
  });
});
