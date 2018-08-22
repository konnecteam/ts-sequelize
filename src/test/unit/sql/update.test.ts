'use strict';

import * as chai from 'chai';
import DataTypes from '../../../lib/data-types';
import { ItestAttribute, ItestInstance } from '../../dummy/dummy-data-set';
import Support from '../../support';
const expect = chai.expect;
const dialect = Support.getTestDialect();
const expectsql = Support.expectsql;
const current = Support.sequelize;
const sql  = current.dialect.QueryGenerator;

// Notice: [] will be replaced by dialect specific tick/quote character when there is not dialect specific expectation but only a default expectation

describe(Support.getTestDialectTeaser('SQL'), () => {
  describe('update', () => {
    it('with temp table for trigger', () => {
      const User = Support.sequelize.define<ItestInstance, ItestAttribute>('user', {
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
        const update = sql.updateQuery(User.tableName, {user_name: 'triggertest'}, {id: 2}, options, User.rawAttributes);
        expect(update.query).to.be.equal('declare @tmp table ([id] INTEGER,[user_name] NVARCHAR(255));UPDATE [users] SET [user_name]=$1 OUTPUT INSERTED.[id],INSERTED.[user_name] into @tmp WHERE [id] = $2;select * from @tmp');
        expect(update.bind).to.have.length(2);
        expect(update.bind[0]).to.have.property('val', 'triggertest');
        expect(update.bind[1]).to.be.equal(2);
      } else {
        expectsql(sql.updateQuery(User.tableName, {user_name: 'triggertest'}, {id: 2}, options, User.rawAttributes),
          {
            query: {
              postgres: 'UPDATE "users" SET "user_name"=$1 WHERE "id" = $2 RETURNING *',
              oracle: 'UPDATE users SET user_name=:updateuser_name1 WHERE id = :whereid1',
              default: 'UPDATE `users` SET `user_name`=$1 WHERE `id` = $2'
            },
            bind: {
              oracle: {
                updateuser_name1: {
                  dir: 3001,
                  val: 'triggertest'
                },
                whereid1: {
                  dir: 3001,
                  val: 2
                }
              },
              default: ['triggertest', 2]
            }
          });
      }
    });


    it('Works with limit', () => {
      const User = Support.sequelize.define<ItestInstance, ItestAttribute>('User', {
        username: {
          type: new DataTypes.STRING()
        },
        userId: {
          type: new DataTypes.INTEGER()
        }
      }, {
        timestamps: false
      });

      expectsql(sql.updateQuery(User.tableName, { username: 'new.username' }, { username: 'username' }, { limit: 1 }), {
        query: {
          mssql: 'UPDATE TOP(1) [Users] SET [username]=$1 OUTPUT INSERTED.* WHERE [username] = $2',
          mysql: 'UPDATE `Users` SET `username`=$1 WHERE `username` = $2 LIMIT 1',
          sqlite: 'UPDATE `Users` SET `username`=$1 WHERE rowid IN (SELECT rowid FROM `Users` WHERE `username` = $2 LIMIT 1)',
          oracle: 'UPDATE Users SET username=:updateusername1 WHERE username = :whereusername1 AND rownum <= 1 ',
          default: 'UPDATE [Users] SET [username]=$1 WHERE [username] = $2'
        },
        bind: {
          oracle: {
            updateusername1: {
              dir: 3001,
              val: 'new.username'
            },
            whereusername1: {
              dir: 3001,
              val: 'username'
            }
          },
          default: ['new.username', 'username']
        }
      });
    });
  });
});
