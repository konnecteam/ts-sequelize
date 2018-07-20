'use strict';

import * as chai from 'chai';
import DataTypes from '../../../lib/data-types';
import Support from '../../support';
const expect = chai.expect;
const dialect = Support.getTestDialect();
const expectsql = Support.expectsql;
const current = Support.sequelize;
const sql  = current.dialect.QueryGenerator;

// Notice: [] will be replaced by dialect specific tick/quote character when there is not dialect specific expectation but only a default expectation

describe(Support.getTestDialectTeaser('SQL'), () => {
  describe('insert', () => {
    it('with temp table for trigger', () => {
      const User = Support.sequelize.define('user', {
        username: {
          type: new DataTypes.STRING(),
          field: 'user_name'
        }
      }, {
        timestamps: false,
        hasTrigger: true
      });

      const options = {
        returning: true,
        hasTrigger: true
      };
      if (dialect === 'mssql') {
        const insert = sql.insertQuery(User.tableName, {user_name: 'triggertest'}, User.rawAttributes, options);
        expect(insert.query).to.be.equal('declare @tmp table ([id] INTEGER,[user_name] NVARCHAR(255));INSERT INTO [users] ([user_name]) OUTPUT INSERTED.[id],INSERTED.[user_name] into @tmp VALUES ($1);select * from @tmp;');
        expect(insert.bind).to.have.length(1);
        expect(insert.bind[0]).to.have.property('val', 'triggertest');
      } else {
        expectsql(sql.insertQuery(User.tableName, {user_name: 'triggertest'}, User.rawAttributes, options),
          {
            query: {
              postgres: 'INSERT INTO "users" ("user_name") VALUES ($1) RETURNING *;',
              oracle: 'INSERT INTO users (user_name) VALUES (:inputuser_name1) RETURNING id INTO $:id;INTEGER$',
              default: 'INSERT INTO `users` (`user_name`) VALUES ($1);'
            },
            bind: {
              oracle: {
                inputuser_name1: {
                  dir: 3001,
                  val: 'triggertest'
                }
              },
              default: ['triggertest']
            }
          });
      }

    });
  });

  describe('dates', () => {
    it('formats the date correctly when inserting', () => {
      const timezoneSequelize = Support.createSequelizeInstance({
        timezone: Support.getTestDialect() === 'sqlite' ? '+00:00' : 'CET'
      });

      const User = timezoneSequelize.define('user', {
        date: {
          type: new DataTypes.DATE()
        }
      }, {
        timestamps: false
      });

      expectsql(timezoneSequelize.dialect.QueryGenerator.insertQuery(User.tableName, {date: new Date(Date.UTC(2015, 0, 20))}, User.rawAttributes, {}),
        {
          query: {
            postgres: 'INSERT INTO "users" ("date") VALUES ($1);',
            mssql: 'INSERT INTO [users] ([date]) VALUES ($1);',
            oracle: `INSERT INTO users ("date") VALUES (TO_TIMESTAMP_TZ('2015-01-20 01:00:00.000 +01:00','YYYY-MM-DD HH24:MI:SS.FFTZH:TZM'))`,
            default: 'INSERT INTO `users` (`date`) VALUES ($1);'
          },
          bind: {
            oracle: {},
            sqlite: ['2015-01-20 00:00:00.000 +00:00'],
            mysql: ['2015-01-20 01:00:00'],
            default: ['2015-01-20 01:00:00.000 +01:00']
          },
        });
    });

    it('formats date correctly when sub-second precision is explicitly specified', () => {
      const timezoneSequelize = Support.createSequelizeInstance({
        timezone: Support.getTestDialect() === 'sqlite' ? '+00:00' : 'CET'
      });

      const User = timezoneSequelize.define('user', {
        date: {
          type: new DataTypes.DATE(3)
        }
      }, {
        timestamps: false
      });
      expectsql(timezoneSequelize.dialect.QueryGenerator.insertQuery(User.tableName, {date: new Date(Date.UTC(2015, 0, 20, 1, 2, 3, 89))}, User.rawAttributes, {}),
        {
          query: {
            postgres: 'INSERT INTO "users" ("date") VALUES ($1);',
            mssql: 'INSERT INTO [users] ([date]) VALUES ($1);',
            oracle: `INSERT INTO users ("date") VALUES (TO_TIMESTAMP_TZ('2015-01-20 02:02:03.089 +01:00','YYYY-MM-DD HH24:MI:SS.FFTZH:TZM'))`,
            default: 'INSERT INTO `users` (`date`) VALUES ($1);'
          },
          bind: {
            oracle: {},
            sqlite: ['2015-01-20 01:02:03.089 +00:00'],
            mysql: ['2015-01-20 02:02:03.089'],
            default: ['2015-01-20 02:02:03.089 +01:00']
          }
        });
    });
  });

  describe('bulkCreate', () => {
    it('bulk create with onDuplicateKeyUpdate', () => {
      // Skip mssql for now, it seems broken
      if (Support.getTestDialect() === 'mssql' || Support.getTestDialect() === 'oracle') {
        return;
      }

      const User = Support.sequelize.define('user', {
        username: {
          type: new DataTypes.STRING(),
          field: 'user_name'
        },
        password: {
          type: new DataTypes.STRING(),
          field: 'pass_word'
        },
        createdAt: {
          type: new DataTypes.DATE(),
          field: 'created_at'
        },
        updatedAt: {
          type: new DataTypes.DATE(),
          field: 'updated_at'
        }
      }, {
        timestamps: true
      });

      expectsql(sql.bulkInsertQuery(User.tableName, [{ user_name: 'testuser', pass_word: '12345' }], { updateOnDuplicate: ['user_name', 'pass_word', 'updated_at'] }, User.fieldRawAttributesMap),
        {
          default: 'INSERT INTO `users` (`user_name`,`pass_word`) VALUES (\'testuser\',\'12345\');',
          postgres: 'INSERT INTO "users" ("user_name","pass_word") VALUES (\'testuser\',\'12345\');',
          mssql: 'INSERT INTO [users] ([user_name],[pass_word]) VALUES (N\'testuser\',N\'12345\');',
          mysql: 'INSERT INTO `users` (`user_name`,`pass_word`) VALUES (\'testuser\',\'12345\') ON DUPLICATE KEY UPDATE `user_name`=VALUES(`user_name`),`pass_word`=VALUES(`pass_word`),`updated_at`=VALUES(`updated_at`);'
        });
    });
  });
});
