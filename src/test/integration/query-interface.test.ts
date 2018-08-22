'use strict';

import * as chai from 'chai';
import * as _ from 'lodash';
import DataTypes from '../../lib/data-types';
import { MysqlQueryGenerator } from '../../lib/dialects/mysql/mysql-query-generator';
import { AbstractQueryInterface } from '../../lib/query-interface';
import { Utils } from '../../lib/utils';
import { ItestAttribute, ItestInstance } from '../dummy/dummy-data-set';
import Support from './support';
const expect = chai.expect;
const dialect = Support.getTestDialect();
const Sequelize = Support.sequelize;
const current = Support.sequelize;
let count = 0;
const log = function() {
  // sqlite fires a lot more querys than the other dbs. this is just a simple hack, since i'm lazy
  if (dialect !== 'sqlite' || count === 0) {
    count++;
  }
};

describe(Support.getTestDialectTeaser('QueryInterface'), () => {
  let queryInterface : AbstractQueryInterface;
  beforeEach(function() {
    current.options.quoteIdentifiers = true;
    queryInterface = current.getQueryInterface();
  });

  afterEach(function() {
    return current.dropAllSchemas();
  });

  describe('renameTable', () => {
    it('should rename table', function() {
      return queryInterface
        .createTable('myTestTable', {
          name: new DataTypes.STRING()
        })
        .then(() => queryInterface.renameTable('myTestTable', 'myTestTableNew'))
        .then(() => queryInterface.showAllTables())
        .then(tableNames => {
          if (dialect === 'mssql' || dialect === 'oracle') {
            tableNames = _.map(tableNames, 'tableName');
          }

          expect(tableNames).to.contain(dialect === 'oracle' ? 'MYTESTTABLENEW' : 'myTestTableNew');
          expect(tableNames).to.not.contain('myTestTable');
        });
    });
  });

  describe('dropAllTables', () => {
    it('should drop all tables', function() {
      const filterMSSQLDefault = tableNames => tableNames.filter(t => t.tableName !== 'spt_values');
      return queryInterface.dropAllTables().then(() => {
        return queryInterface.showAllTables().then(tableNames => {
          // MSSQL include spt_values table which is system defined, hence cant be dropped
          tableNames = filterMSSQLDefault(tableNames);
          expect(tableNames).to.be.empty;
          return queryInterface.createTable('table', { name: new DataTypes.STRING() }).then(() => {
            return queryInterface.showAllTables().then(_tableNames => {
              _tableNames = filterMSSQLDefault(_tableNames);
              expect(_tableNames).to.have.length(1);
              return queryInterface.dropAllTables().then(() => {
                return queryInterface.showAllTables().then(tableNames_ => {
                  // MSSQL include spt_values table which is system defined, hence cant be dropped
                  tableNames_ = filterMSSQLDefault(tableNames_);
                  expect(tableNames_).to.be.empty;
                });
              });
            });
          });
        });
      });
    });

    it('should be able to skip given tables', function() {
      return queryInterface.createTable('skipme', {
        name: new DataTypes.STRING()
      }).then(() => {
        return queryInterface.dropAllTables({skip: ['skipme']}).then(() => {
          return queryInterface.showAllTables().then(tableNames => {
            if (dialect === 'mssql' /* current.dialect.supports.schemas */) {
              tableNames = _.map(tableNames, 'tableName');
            }

            if (dialect === 'oracle') {
              //AS always, everything is upper case with Oracle
              tableNames = _.map(tableNames, 'tableName');
              expect(tableNames).to.contain('SKIPME');
            } else {
              expect(tableNames).to.contain('skipme');
            }

          });
        });
      });
    });
  });

  describe('indexes', () => {
    beforeEach(function() {
      return queryInterface.dropTable('Group').then(() => {
        return queryInterface.createTable('Group', {
          username: new DataTypes.STRING(),
          isAdmin: new DataTypes.BOOLEAN(),
          from: new DataTypes.STRING()
        });
      });
    });

    it('adds, reads and removes an index to the table', function() {
      return queryInterface.addIndex('Group', ['username', 'isAdmin']).then(() => {
        return queryInterface.showIndex('Group').then(indexes => {
          let indexColumns = _.uniq(indexes.map(index => index.name));
          expect(indexColumns).to.include('group_username_is_admin');
          return queryInterface.removeIndex('Group', ['username', 'isAdmin']).then(() => {
            return queryInterface.showIndex('Group').then(_indexes => {
              indexColumns = _.uniq(_indexes.map(index => index.name));
              expect(indexColumns).to.be.empty;
            });
          });
        });
      });
    });

    it('works with schemas', function() {
      return current.createSchema('schema').then(() => {
        return queryInterface.createTable('table', {
          name: {
            type: new DataTypes.STRING()
          },
          isAdmin: {
            type: new DataTypes.STRING()
          }
        }, {
          schema: 'schema'
        });
      }).then(() => {
        return queryInterface.addIndex({
          schema: 'schema',
          tableName: 'table'
        }, ['name', 'isAdmin'], null, 'schema_table').then(() => {
          return queryInterface.showIndex({
            schema: 'schema',
            tableName: 'table'
          }).then(indexes => {
            expect(indexes.length).to.eq(1);
            const index = indexes[0];
            expect(index.name).to.eq('table_name_is_admin');
          });
        });
      });
    });

    it('does not fail on reserved keywords', function() {
      return queryInterface.addIndex('Group', ['from']);
    });
  });

  describe('describeTable', () => {
    it('reads the metadata of the table', function() {
      const Users = current.define<ItestInstance, ItestAttribute>('_Users', {
        username: new DataTypes.STRING(),
        city: {
          type: new DataTypes.STRING(),
          defaultValue: null
        },
        isAdmin: new DataTypes.BOOLEAN(),
        enumVals: new DataTypes.ENUM('hello', 'world')
      }, { freezeTableName: true });

      return Users.sync({ force: true }).then(() => {
        return queryInterface.describeTable('_Users').then(metadata => {
          const id = metadata.id;
          const username = metadata.username;
          const city = metadata.city;
          const isAdmin = metadata.isAdmin;
          const enumVals = metadata.enumVals;

          expect(id.primaryKey).to.be.ok;

          let assertVal = 'VARCHAR(255)';
          switch (dialect) {
            case 'postgres':
              assertVal = 'CHARACTER VARYING(255)';
              break;
            case 'mssql':
              assertVal = 'NVARCHAR';
              break;
            case 'oracle':
              assertVal = 'NVARCHAR2';
              break;
          }
          expect(username.type).to.equal(assertVal);
          expect(username.allowNull).to.be.true;

          switch (dialect) {
            case 'oracle':
            case 'sqlite':
              expect(username.defaultValue).to.be.undefined;
              break;
            default:
              expect(username.defaultValue).to.be.null;
          }

          switch (dialect) {
            case 'sqlite':
              expect(city.defaultValue).to.be.null;
              break;
          }

          assertVal = 'TINYINT(1)';
          switch (dialect) {
            case 'postgres':
              assertVal = 'BOOLEAN';
              break;
            case 'mssql':
              assertVal = 'BIT';
              break;
            case 'oracle':
              assertVal = 'NUMBER';
              break;
          }
          expect(isAdmin.type).to.equal(assertVal);
          expect(isAdmin.allowNull).to.be.true;
          switch (dialect) {
            case 'oracle':
            case 'sqlite':
              expect(isAdmin.defaultValue).to.be.undefined;
              break;
            default:
              expect(isAdmin.defaultValue).to.be.null;
          }

          if (dialect === 'postgres' || dialect === 'postgres-native') {
            expect(enumVals.special).to.be.instanceof(Array);
            expect(enumVals.special).to.have.length(2);
          } else if (dialect === 'mysql') {
            expect(enumVals.type).to.eql('ENUM(\'hello\',\'world\')');
          }
        });
      });
    });

    it('should correctly determine the primary key columns', function() {
      const Country = current.define<ItestInstance, ItestAttribute>('_Country', {
        code: {type: new DataTypes.STRING(), primaryKey: true },
        name: {type: new DataTypes.STRING(), allowNull: false}
      }, { freezeTableName: true });
      const Alumni = current.define<ItestInstance, ItestAttribute>('_Alumni', {
        year: {type: new DataTypes.INTEGER(), primaryKey: true },
        num: {type: new DataTypes.INTEGER(), primaryKey: true },
        username: {type: new DataTypes.STRING(), allowNull: false, unique: true },
        dob: {type: new DataTypes.DATEONLY(), allowNull: false },
        dod: {type: new DataTypes.DATEONLY(), allowNull: true },
        city: {type: new DataTypes.STRING(), allowNull: false},
        ctrycod: {type: new DataTypes.STRING(), allowNull: false,
          references: { model: Country, key: 'code'}}
      }, { freezeTableName: true });

      return Country.sync({ force: true }).then(() => {
        return queryInterface.describeTable('_Country').then(metacountry => {
          expect(metacountry.code.primaryKey).to.eql(true);
          expect(metacountry.name.primaryKey).to.eql(false);

          return Alumni.sync({ force: true }).then(() => {
            return queryInterface.describeTable('_Alumni').then(metalumni => {
              expect(metalumni.year.primaryKey).to.eql(true);
              expect(metalumni.num.primaryKey).to.eql(true);
              expect(metalumni.username.primaryKey).to.eql(false);
              expect(metalumni.dob.primaryKey).to.eql(false);
              expect(metalumni.dod.primaryKey).to.eql(false);
              expect(metalumni.ctrycod.primaryKey).to.eql(false);
              expect(metalumni.city.primaryKey).to.eql(false);
            });
          });
        });
      });
    });
  });

  // FIXME: These tests should make assertions against the created table using describeTable
  describe('createTable', () => {
    it('should create a auto increment primary key', function() {
      return queryInterface.createTable('TableWithPK', {
        table_id: {
          type: new DataTypes.INTEGER(),
          primaryKey: true,
          autoIncrement: true
        }
      }).bind(this).then(function() {
        return queryInterface.insert(null, 'TableWithPK', {}, {raw: true, returning: true, plain: true}).then(results => {
          if (dialect !== 'oracle') {
            const response : any = _.head(results);
            expect(response.table_id || (typeof response !== 'object' && response)).to.be.ok;
          } else {
            //On empty query, we can't return anything, we need to know at least the id column name to return its value
            expect(results).to.be.null;
          }
        });
      });
    });

    it('should work with enums (1)', function() {
      return queryInterface.createTable('SomeTable', {
        someEnum: new DataTypes.ENUM('value1', 'value2', 'value3')
      });
    });

    it('should work with enums (2)', function() {
      return queryInterface.createTable('SomeTable', {
        someEnum: {
          type: new DataTypes.ENUM(),
          values: ['value1', 'value2', 'value3']
        }
      });
    });

    it('should work with enums (3)', function() {
      return queryInterface.createTable('SomeTable', {
        someEnum: {
          type: new DataTypes.ENUM(),
          values: ['value1', 'value2', 'value3'],
          field: 'otherName'
        }
      });
    });

    it('should work with enums (4)', function() {
      return queryInterface.createSchema('archive').bind(this).then(function() {
        return queryInterface.createTable('SomeTable', {
          someEnum: {
            type: new DataTypes.ENUM(),
            values: ['value1', 'value2', 'value3'],
            field: 'otherName'
          }
        }, { schema: 'archive' });
      });
    });

    it('should work with schemas', function() {
      return current.createSchema('hero').then(() => {
        return queryInterface.createTable('User', {
          name: {
            type: new DataTypes.STRING()
          }
        }, {
          schema: 'hero'
        });
      });
    });
  });

  describe('renameColumn', () => {
    it('rename a simple column', function() {
      const Users = current.define<ItestInstance, ItestAttribute>('_Users', {
        username: new DataTypes.STRING()
      }, { freezeTableName: true });

      return Users.sync({ force: true }).then(() => {
        return queryInterface.renameColumn('_Users', 'username', 'pseudo');
      }).bind(this).then(function() {
        return queryInterface.describeTable('_Users');
      }).then(table => {
        expect(table).to.have.property('pseudo');
        expect(table).to.not.have.property('username');
      });
    });

    it('works with schemas', function() {
      return current.createSchema('archive').then(() => {
        const Users = current.define<ItestInstance, ItestAttribute>('User', {
          username: new DataTypes.STRING()
        }, {
          tableName: 'Users',
          schema: 'archive'
        });
        return Users.sync({ force: true }).then(() => {
          return queryInterface.renameColumn({
            schema: 'archive',
            tableName: 'Users'
          }, 'username', 'pseudo');
        });
      }).bind(this).then(function() {
        return queryInterface.describeTable({
          schema: 'archive',
          tableName: 'Users'
        });
      }).then(table => {
        expect(table).to.have.property('pseudo');
        expect(table).to.not.have.property('username');
      });
    });

    it('rename a column non-null without default value', function() {
      const Users = current.define<ItestInstance, ItestAttribute>('_Users', {
        username: {
          type: new DataTypes.STRING(),
          allowNull: false
        }
      }, { freezeTableName: true });

      return Users.sync({ force: true }).then(() => {
        return queryInterface.renameColumn('_Users', 'username', 'pseudo');
      }).bind(this).then(function() {
        return queryInterface.describeTable('_Users');
      }).then(table => {
        expect(table).to.have.property('pseudo');
        expect(table).to.not.have.property('username');
      });
    });

    it('rename a boolean column non-null without default value', function() {
      const Users = current.define<ItestInstance, ItestAttribute>('_Users', {
        active: {
          type: new DataTypes.BOOLEAN(),
          allowNull: false,
          defaultValue: false
        }
      }, { freezeTableName: true });

      return Users.sync({ force: true }).then(() => {
        return queryInterface.renameColumn('_Users', 'active', 'enabled');
      }).bind(this).then(function() {
        return queryInterface.describeTable('_Users');
      }).then(table => {
        expect(table).to.have.property('enabled');
        expect(table).to.not.have.property('active');
      });
    });

    it('renames a column primary key autoIncrement column', function() {
      const Fruits = current.define<ItestInstance, ItestAttribute>('Fruit', {
        fruitId: {
          type: new DataTypes.INTEGER(),
          allowNull: false,
          primaryKey: true,
          autoIncrement: true
        }
      }, { freezeTableName: true });

      return Fruits.sync({ force: true }).then(() => {
        return queryInterface.renameColumn('Fruit', 'fruitId', 'fruit_id');
      }).bind(this).then(function() {
        return queryInterface.describeTable('Fruit');
      }).then(table => {
        expect(table).to.have.property('fruit_id');
        expect(table).to.not.have.property('fruitId');
      });
    });

    it('shows a reasonable error message when column is missing', function() {
      const Users = current.define<ItestInstance, ItestAttribute>('_Users', {
        username: new DataTypes.STRING()
      }, { freezeTableName: true });

      const outcome = Users.sync({ force: true }).then(() => {
        return queryInterface.renameColumn('_Users', 'email', 'pseudo');
      });

      return expect(outcome).to.be.rejectedWith('Table _Users doesn\'t have the column email');
    });
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
  });

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

  describe('addColumn', () => {
    beforeEach(function() {
      return current.createSchema('archive').bind(this).then(function() {
        return queryInterface.createTable('users', {
          id: {
            type: new DataTypes.INTEGER(),
            primaryKey: true,
            autoIncrement: true
          }
        });
      });
    });

    it('should be able to add a foreign key reference', function() {
      return queryInterface.createTable('level', {
        id: {
          type: new DataTypes.INTEGER(),
          primaryKey: true,
          autoIncrement: true
        }
      }).bind(this).then(function() {
        return queryInterface.addColumn('users', 'level_id', {
          type: new DataTypes.INTEGER(),
          references: {
            model: 'level',
            key: 'id'
          },
          onUpdate: 'cascade',
          onDelete: 'set null'
        });
      }).then(function() {
        return queryInterface.describeTable('users');
      }).then(table => {
        expect(table).to.have.property('level_id');
      });
    });

    it('should work with schemas', function() {
      return queryInterface.createTable({
        tableName: 'users',
        schema: 'archive'
      }, {
        id: {
          type: new DataTypes.INTEGER(),
          primaryKey: true,
          autoIncrement: true
        }
      }).bind(this).then(function() {
        return queryInterface.addColumn({
          tableName: 'users',
          schema: 'archive'
        }, 'level_id', {
          type: new DataTypes.INTEGER()
        }).bind(this).then(function() {
          return queryInterface.describeTable({
            tableName: 'users',
            schema: 'archive'
          });
        }).then(table => {
          expect(table).to.have.property('level_id');
        });
      });
    });

    it('should work with enums (1)', function() {
      return queryInterface.addColumn('users', 'someEnum', new DataTypes.ENUM('value1', 'value2', 'value3'));
    });

    it('should work with enums (2)', function() {
      return queryInterface.addColumn('users', 'someOtherEnum', {
        type: new DataTypes.ENUM(),
        values: ['value1', 'value2', 'value3']
      });
    });
  });

  describe('removeColumn', () => {
    describe('(without a schema)', () => {
      beforeEach(function() {
        return queryInterface.createTable('users', {
          id: {
            type: new DataTypes.INTEGER(),
            primaryKey: true,
            autoIncrement: true
          },
          firstName: {
            type: new DataTypes.STRING(),
            defaultValue: 'Someone'
          },
          lastName: {
            type: new DataTypes.STRING()
          },
          manager: {
            type: new DataTypes.INTEGER(),
            references: {
              model: 'users',
              key: 'id'
            }
          },
          email: {
            type: new DataTypes.STRING(),
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
            firstName: {
              type: new DataTypes.STRING(),
              defaultValue: 'Someone'
            },
            lastName: {
              type: new DataTypes.STRING()
            },
            email: {
              type: new DataTypes.STRING(),
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

  describe('describeForeignKeys', () => {
    beforeEach(function() {
      return queryInterface.createTable('users', {
        id: {
          type: new DataTypes.INTEGER(),
          primaryKey: true,
          autoIncrement: true
        }
      }).bind(this).then(function() {
        return queryInterface.createTable('hosts', {
          id: {
            type: new DataTypes.INTEGER(),
            primaryKey: true,
            autoIncrement: true
          },
          admin: {
            type: new DataTypes.INTEGER(),
            references: {
              model: 'users',
              key: 'id'
            }
          },
          operator: {
            type: new DataTypes.INTEGER(),
            references: {
              model: 'users',
              key: 'id'
            },
            onUpdate: 'cascade'
          },
          owner: {
            type: new DataTypes.INTEGER(),
            references: {
              model: 'users',
              key: 'id'
            },
            onUpdate: 'cascade',
            onDelete: 'set null'
          }
        });
      });
    });

    it('should get a list of foreign keys for the table', function() {
      const sql = queryInterface.QueryGenerator.getForeignKeysQuery('hosts', current.config.database);
      return current.query(sql, {type: current.QueryTypes.FOREIGNKEYS}).then(fks => {
        expect(fks).to.have.length(3);
        const keys = Object.keys(fks[0]);
        const keys2 = Object.keys(fks[1]);
        const keys3 = Object.keys(fks[2]);

        if (dialect === 'postgres' || dialect === 'postgres-native') {
          expect(keys).to.have.length(6);
          expect(keys2).to.have.length(7);
          expect(keys3).to.have.length(7);
        } else if (dialect === 'sqlite') {
          expect(keys).to.have.length(8);
        } else if (dialect === 'mysql' || dialect === 'mssql') {
          expect(keys).to.have.length(12);
        } else {
          Utils.warn('This test doesn\'t support ' + dialect);
        }
        return fks;
      }).then(fks => {
        if (dialect === 'mysql') {
          return current.query(
            (queryInterface.QueryGenerator as MysqlQueryGenerator).getForeignKeyQuery('hosts', 'admin'),
            {}
          )
            .spread(fk => {
              expect(fks[0]).to.deep.equal(fk[0]);
            });
        }
        return;
      });
    });

    it('should get a list of foreign key references details for the table', function() {
      return queryInterface.getForeignKeyReferencesForTable('hosts', current.options)
        .then(references => {
          expect(references).to.have.length(3);
          const keys = [];
          if (Support.getTestDialect() !== 'oracle') {
            _.each(references, reference => {
              expect(reference.tableName).to.eql('hosts');
              expect(reference.referencedColumnName).to.eql('id');
              expect(reference.referencedTableName).to.eql('users');
              keys.push(reference.columnName);
            });
            expect(keys).to.have.same.members(['owner', 'operator', 'admin']);
          }
        });
    });
  });

  describe('constraints', () => {
    beforeEach(function() {
      current.define<ItestInstance, ItestAttribute>('users', {
        username: new DataTypes.STRING(),
        email: new DataTypes.STRING(),
        roles: new DataTypes.STRING()
      });

      current.define<ItestInstance, ItestAttribute>('posts', {
        username: new DataTypes.STRING()
      });
      return current.sync({ force: true });
    });


    describe('unique', () => {
      it('should add, read & remove unique constraint', function() {
        return queryInterface.addConstraint('users', ['email'], {
          type: 'unique'
        })
          .then(() => queryInterface.showConstraint('users'))
          .then(constraints => {
            constraints = constraints.map(constraint => constraint.constraintName);
            expect(constraints).to.include('users_email_uk');
            return queryInterface.removeConstraint('users', 'users_email_uk');
          })
          .then(() => queryInterface.showConstraint('users'))
          .then(constraints => {
            constraints = constraints.map(constraint => constraint.constraintName);
            expect(constraints).to.not.include('users_email_uk');
          });
      });
    });

    if (current.dialect.supports.constraints.check) {
      describe('check', () => {
        it('should add, read & remove check constraint', function() {
          return queryInterface.addConstraint('users', ['roles'], {
            type: 'check',
            where: {
              roles: ['user', 'admin', 'guest', 'moderator']
            },
            name: 'check_user_roles'
          })
            .then(() => queryInterface.showConstraint('users'))
            .then(constraints => {
              constraints = constraints.map(constraint => constraint.constraintName);
              expect(constraints).to.include('check_user_roles');
              return queryInterface.removeConstraint('users', 'check_user_roles');
            })
            .then(() => queryInterface.showConstraint('users'))
            .then(constraints => {
              constraints = constraints.map(constraint => constraint.constraintName);
              expect(constraints).to.not.include('check_user_roles');
            });
        });
      });
    }

    if (current.dialect.supports.constraints.default) {
      describe('default', () => {
        it('should add, read & remove default constraint', function() {
          return queryInterface.addConstraint('users', ['roles'], {
            type: 'default',
            defaultValue: 'guest'
          })
            .then(() => queryInterface.showConstraint('users'))
            .then(constraints => {
              constraints = constraints.map(constraint => constraint.constraintName);
              expect(constraints).to.include('users_roles_df');
              return queryInterface.removeConstraint('users', 'users_roles_df');
            })
            .then(() => queryInterface.showConstraint('users'))
            .then(constraints => {
              constraints = constraints.map(constraint => constraint.constraintName);
              expect(constraints).to.not.include('users_roles_df');
            });
        });
      });
    }


    describe('primary key', () => {
      it('should add, read & remove primary key constraint', function() {
        return queryInterface.removeColumn('users', 'id')
          .then(() => {
            return queryInterface.changeColumn('users', 'username', {
              type: new DataTypes.STRING(),
              allowNull: false
            });
          })
          .then(() => {
            return queryInterface.addConstraint('users', ['username'], {
              type: 'PRIMARY KEY'
            });
          })
          .then(() => queryInterface.showConstraint('users'))
          .then(constraints => {
            constraints = constraints.map(constraint => constraint.constraintName);
            //The name of primaryKey constraint is always PRIMARY in case of mysql
            if (dialect === 'mysql') {
              expect(constraints).to.include('PRIMARY');
              return queryInterface.removeConstraint('users', 'PRIMARY');
            } else {
              expect(constraints).to.include('users_username_pk');
              return queryInterface.removeConstraint('users', 'users_username_pk');
            }
          })
          .then(() => queryInterface.showConstraint('users'))
          .then(constraints => {
            constraints = constraints.map(constraint => constraint.constraintName);
            expect(constraints).to.not.include('users_username_pk');
          });
      });
    });

    describe('foreign key', () => {
      it('should add, read & remove foreign key constraint', function() {
        return queryInterface.removeColumn('users', 'id')
          .then(() => {
            return queryInterface.changeColumn('users', 'username', {
              type: new DataTypes.STRING(),
              allowNull: false
            });
          })
          .then(() => {
            return queryInterface.addConstraint('users', {
              type: 'PRIMARY KEY',
              fields: ['username']
            });
          })
          .then(() => {
            return queryInterface.addConstraint('posts', ['username'], {
              references: {
                table: 'users',
                field: 'username'
              },
              onDelete: 'cascade',
              onUpdate: 'cascade',
              type: 'foreign key'
            });
          })
          .then(() => queryInterface.showConstraint('posts'))
          .then(constraints => {
            constraints = constraints.map(constraint => constraint.constraintName);
            expect(constraints).to.include('posts_username_users_fk');
            return queryInterface.removeConstraint('posts', 'posts_username_users_fk');
          })
          .then(() => queryInterface.showConstraint('posts'))
          .then(constraints => {
            constraints = constraints.map(constraint => constraint.constraintName);
            expect(constraints).to.not.include('posts_username_users_fk');
          });
      });
    });

    describe('error handling', () => {
      it('should throw non existent constraints as UnknownConstraintError', function() {
        return expect(queryInterface.removeConstraint('users', 'unknown__contraint__name', {
          type: 'unique'
        })).to.eventually.be.rejectedWith(Sequelize.UnknownConstraintError);
      });
    });
  });
});
