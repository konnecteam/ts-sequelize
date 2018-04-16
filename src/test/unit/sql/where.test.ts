'use strict';

import Support from '../../support';
import DataTypes from '../../../lib/data-types';
import * as util from 'util';
import * as chai from 'chai';
const expect = chai.expect;
const expectsql = Support.expectsql;
const current = Support.sequelize;
const queryGenerator = current.dialect.QueryGenerator;

// Notice: [] will be replaced by dialect specific tick/quote character when there is not dialect specific expectation but only a default expectation

describe(Support.getTestDialectTeaser('SQL'), () => {
  describe('whereQuery', () => {
    
    it('empty', () => {
      const params={};
      const options=undefined;
      const expectation={
        default: ''
      };
      expectsql(queryGenerator.whereQuery(params, options), expectation);
    });

    it('empty array', () => {
      const params=[];
      const options=undefined;
      const expectation={
        default: ''
      };
      expectsql(queryGenerator.whereQuery(params, options), expectation);
    });

    it('id = 1', () => {
      const params={id: 1};
      const options=undefined;
      const expectation={
        default: 'WHERE [id] = 1',
        oracle: 'WHERE id = 1'
      };
      expectsql(queryGenerator.whereQuery(params, options), expectation);
    });

    it('User.id = 1', () => {
      const params={id: 1};
      const options={prefix: 'User'};
      const expectation={
        default: 'WHERE [User].[id] = 1',
        oracle: 'WHERE "User".id = 1'
      };
      expectsql(queryGenerator.whereQuery(params, options), expectation);
    });

    it('yolo.User.id = 1', () => {
      const params={id: 1};
      const options={prefix: current.literal(queryGenerator.quoteTable.call(current.dialect.QueryGenerator, {schema: 'yolo', tableName: 'User'}))};
      const expectation={
        default: 'WHERE [yolo.User].[id] = 1',
        oracle: 'WHERE yolo."User".id = 1',
        postgres: 'WHERE "yolo"."User"."id" = 1',
        mssql: 'WHERE [yolo].[User].[id] = 1'
      };
      expectsql(queryGenerator.whereQuery(params, options), expectation);
    });

    it("name = 'a project' and (id in (1,2,3) or id>10)", () => {
      const params={
        name: 'a project',
        $or: [
          { id: [1, 2, 3] },
          { id: { $gt: 10 } }
        ]
      };
      const options=undefined;
      const expectation={
        default: "WHERE [name] = 'a project' AND ([id] IN (1, 2, 3) OR [id] > 10)",
        oracle: "WHERE name = 'a project' AND (id IN (1, 2, 3) OR id > 10)",
        mssql: "WHERE [name] = N'a project' AND ([id] IN (1, 2, 3) OR [id] > 10)"
      };
      expectsql(queryGenerator.whereQuery(params, options), expectation);
    });
  });

  describe('whereItemQuery', () => {
    const testsql = function(key, value, options, expectation) {
      if (expectation === undefined) {
        expectation = options;
        options = undefined;
      }

      test(key+': '+util.inspect(value, {depth: 10})+(options && ', '+util.inspect(options) || ''), () => {
        return expectsql(queryGenerator.whereItemQuery(key, value, options), expectation);
      });
    };

    it('lol=1', () => {
      const key=undefined;
      const params='lol=1';
      const options=undefined;
      const expectation={
        default: 'lol=1'
      };
      expectsql(queryGenerator.whereItemQuery(key, params, options), expectation);
    });

    it('deleted is null', () => {
      const key='deleted';
      const params=null;
      const options=undefined;
      const expectation={
        default: '`deleted` IS NULL',
        oracle: 'deleted IS NULL',
        postgres: '"deleted" IS NULL',
        mssql: '[deleted] IS NULL'
      };
      expectsql(queryGenerator.whereItemQuery(key, params, options), expectation);
    });

    describe('$in', () => {
      it('equipment in (1, 3)', () => {
        const key='equipment';
        const params={
          $in: [1, 3]
        };
        const options=undefined;
        const expectation={
          default: '[equipment] IN (1, 3)',
          oracle: 'equipment IN (1, 3)'
        };
        expectsql(queryGenerator.whereItemQuery(key, params, options), expectation);
      });

      it('equipment in null', () => {
        const key='equipment';
        const params={
          $in: []
        };
        const options=undefined;
        const expectation={
          default: '[equipment] IN (NULL)',
          oracle: 'equipment IN (NULL)'
        };
        expectsql(queryGenerator.whereItemQuery(key, params, options), expectation);
      });

      it('muscles in (2, 4)', () => {
        const key='muscles';
        const params={
          $in: [2, 4]
        };
        const options=undefined;
        const expectation={
          default: '[muscles] IN (2, 4)',
          oracle: 'muscles IN (2, 4)'
        };
        expectsql(queryGenerator.whereItemQuery(key, params, options), expectation);
      });

      it('equipment IN (select order_id from product_orders where product_id = 3)', () => {
        const key='equipment';
        const params={
          $in: current.literal('(select order_id from product_orders where product_id = 3)')
        };
        const options=undefined;
        const expectation={
          default: '[equipment] IN (select order_id from product_orders where product_id = 3)',
          oracle: 'equipment IN (select order_id from product_orders where product_id = 3)'
        };
        expectsql(queryGenerator.whereItemQuery(key, params, options), expectation);
      });
    });

    describe('Buffer', () => {
      it("field = X'53657175656c697a65'", () => {
        const key='field';
        const params=new Buffer('Sequelize');
        const options=undefined;
        const expectation={
          postgres: '"field" = E\'\\\\x53657175656c697a65\'',
          oracle: 'field = hextoraw(\'53657175656c697a65\')',
          sqlite: "`field` = X'53657175656c697a65'",
          mysql: "`field` = X'53657175656c697a65'",
          mssql: '[field] = 0x53657175656c697a65'
        };
        expectsql(queryGenerator.whereItemQuery(key, params, options), expectation);
      });
    });

    describe('$not', () => {
      it('deleted is not true', () => {
        const key='deleted';
        const params={
          $not: true
        };
        const options=undefined;
        const expectation={
          default: '[deleted] IS NOT true',
          oracle: 'deleted IS NOT 1',
          mssql: '[deleted] IS NOT 1',
          sqlite: '`deleted` IS NOT 1'
        };
        expectsql(queryGenerator.whereItemQuery(key, params, options), expectation);
      });

      it('deleted is not null', () => {
        const key='deleted';
        const params={
          $not: null
        };
        const options=undefined;
        const expectation={
          default: '[deleted] IS NOT NULL',
          oracle: 'deleted IS NOT NULL'
        };
        expectsql(queryGenerator.whereItemQuery(key, params, options), expectation);
      });

      it('muscles != 3', () => {
        const key='muscles';
        const params={
          $not: 3
        };
        const options=undefined;
        const expectation={
          default: '[muscles] != 3',
          oracle: 'muscles != 3'
        };
        expectsql(queryGenerator.whereItemQuery(key, params, options), expectation);
      });
    });

    describe('$notIn', () => {
      it('equipment not in []', () => {
        const key='equipment';
        const params={
          $notIn: []
        };
        const options=undefined;
        const expectation={
          default: ''
        };
        expectsql(queryGenerator.whereItemQuery(key, params, options), expectation);
      });

      it('equipment not in (4, 19)', () => {
        const key='equipment';
        const params={
          $notIn: [4, 19]
        };
        const options=undefined;
        const expectation={
          default: '[equipment] NOT IN (4, 19)',
          oracle: 'equipment NOT IN (4, 19)'
        };
        expectsql(queryGenerator.whereItemQuery(key, params, options), expectation);
      });

      it('equipment not in (select order_id from product_orders where product_id = 3)', () => {
        const key='equipment';
        const params={
          $notIn: current.literal(
            '(select order_id from product_orders where product_id = 3)'
          )
        };
        const options=undefined;
        const expectation={
          default: '[equipment] NOT IN (select order_id from product_orders where product_id = 3)',
          oracle: 'equipment NOT IN (select order_id from product_orders where product_id = 3)'
        };
        expectsql(queryGenerator.whereItemQuery(key, params, options), expectation);
      });
    });

    describe('$ne', () => {
      it("email != 'jack.bauer@gmail.com", () => {
        const key='email';
        const params={
          $ne: 'jack.bauer@gmail.com'
        };
        const options=undefined;
        const expectation={
          default: "[email] != 'jack.bauer@gmail.com'",
          oracle: "email != 'jack.bauer@gmail.com'",
          mssql: "[email] != N'jack.bauer@gmail.com'"
        };
        expectsql(queryGenerator.whereItemQuery(key, params, options), expectation);
      });
    });

    describe('$and/$or/$not', () => {
      describe('$or', () => {
        it("email = 'maker@mhansen.io' or email = 'janzeh@gmail.com'", () => {
          const key='email';
          const params={
            $or: ['maker@mhansen.io', 'janzeh@gmail.com']
          };
          const options=undefined;
          const expectation={
            default: '([email] = \'maker@mhansen.io\' OR [email] = \'janzeh@gmail.com\')',
            oracle: '(email = \'maker@mhansen.io\' OR email = \'janzeh@gmail.com\')',
            mssql: '([email] = N\'maker@mhansen.io\' OR [email] = N\'janzeh@gmail.com\')'
          };
          expectsql(queryGenerator.whereItemQuery(key, params, options), expectation);
        });

        it('rank < 100 or rank is null', () => {
          const key='rank';
          const params={
            $or: {
              $lt: 100,
              $eq: null
            }
          };
          const options=undefined;
          const expectation={
            default: '([rank] < 100 OR [rank] IS NULL)',
            oracle: '(rank < 100 OR rank IS NULL)'
          };
          expectsql(queryGenerator.whereItemQuery(key, params, options), expectation);
        });

        it("email = 'maker@mhansen.io' or email = 'janzeh@gmail.com'  (key = $or)", () => {
          const key='$or';
          const params=[
            {email: 'maker@mhansen.io'},
            {email: 'janzeh@gmail.com'}
          ];
          const options=undefined;
          const expectation={
            default: '([email] = \'maker@mhansen.io\' OR [email] = \'janzeh@gmail.com\')',
            oracle: '(email = \'maker@mhansen.io\' OR email = \'janzeh@gmail.com\')',
            mssql: '([email] = N\'maker@mhansen.io\' OR [email] = N\'janzeh@gmail.com\')'
          };
          expectsql(queryGenerator.whereItemQuery(key, params, options), expectation);
        });

        it("email = 'maker@mhansen.io' or name = 'Mick Hansen'", () => {
          const key='$or';
          const params={
            email: 'maker@mhansen.io',
            name: 'Mick Hansen'
          };
          const options=undefined;
          const expectation={
            default: '([email] = \'maker@mhansen.io\' OR [name] = \'Mick Hansen\')',
            oracle: '(email = \'maker@mhansen.io\' OR name = \'Mick Hansen\')',
            mssql: '([email] = N\'maker@mhansen.io\' OR [name] = N\'Mick Hansen\')'
          };
          expectsql(queryGenerator.whereItemQuery(key, params, options), expectation);
        });

        it('equipment in (1, 3) or muscles in (2, 4)', () => {
          const key='$or';
          const params={
            equipment: [1, 3],
            muscles: {
              $in: [2, 4]
            }
          };
          const options=undefined;
          const expectation={
            default: '([equipment] IN (1, 3) OR [muscles] IN (2, 4))',
            oracle: '(equipment IN (1, 3) OR muscles IN (2, 4))'
          };
          expectsql(queryGenerator.whereItemQuery(key, params, options), expectation);
        });

        it("roleName = 'NEW' or (roleName = 'CLIENT' and type = 'CLIENT')", () => {
          const key='$or';
          const params=[
            {
              roleName: 'NEW'
            }, {
              roleName: 'CLIENT',
              type: 'CLIENT'
            }
          ];
          const options=undefined;
          const expectation={
            default: "([roleName] = 'NEW' OR ([roleName] = 'CLIENT' AND [type] = 'CLIENT'))",
            oracle: "(roleName = 'NEW' OR (roleName = 'CLIENT' AND \"type\" = 'CLIENT'))",
            mssql: "([roleName] = N'NEW' OR ([roleName] = N'CLIENT' AND [type] = N'CLIENT'))"
          };
          expectsql(queryGenerator.whereItemQuery(key, params, options), expectation);
        });

        it('sequelize.or({group_id: 1}, {user_id: 2})', function() {
          expectsql(queryGenerator.whereItemQuery(undefined, this.sequelize.or({group_id: 1}, {user_id: 2})), {
            default: '([group_id] = 1 OR [user_id] = 2)',
            oracle: '(group_id = 1 OR user_id = 2)'
          });
        });

        it("sequelize.or({group_id: 1}, {user_id: 2, role: 'admin'})", function() {
          expectsql(queryGenerator.whereItemQuery(undefined, this.sequelize.or({group_id: 1}, {user_id: 2, role: 'admin'})), {
            default: "([group_id] = 1 OR ([user_id] = 2 AND [role] = 'admin'))",
            oracle: "(group_id = 1 OR (user_id = 2 AND \"role\" = 'admin'))",
            mssql: "([group_id] = 1 OR ([user_id] = 2 AND [role] = N'admin'))"
          });
        });

        it('0 = 1 (array)', () => {
          const key='$or';
          const params=[];
          const options=undefined;
          const expectation={
            default: '0 = 1'
          };
          expectsql(queryGenerator.whereItemQuery(key, params, options), expectation);
        });

        it('0 = 1 (object)', () => {
          const key='$or';
          const params={};
          const options=undefined;
          const expectation={
            default: '0 = 1'
          };
          expectsql(queryGenerator.whereItemQuery(key, params, options), expectation);
        });

        it('sequelize.or()', function() {
          expectsql(queryGenerator.whereItemQuery(undefined, this.sequelize.or()), {
            default: '0 = 1'
          });
        });
      });

      describe('$and', () => {
        it('(group_id = 1 or user_id = 2) and shared = 1', () => {
          const key='$and';
          const params={
            $or: {
              group_id: 1,
              user_id: 2
            },
            shared: 1
          };
          const options=undefined;
          const expectation={
            default: '(([group_id] = 1 OR [user_id] = 2) AND [shared] = 1)',
            oracle: '((group_id = 1 OR user_id = 2) AND \"shared\" = 1)'
          };
          expectsql(queryGenerator.whereItemQuery(key, params, options), expectation);
        });

        it("name like '%hello' and name like 'hello%'", () => {
          const key='$and';
          const params=[
            {
              name: {
                $like: '%hello'
              }
            },
            {
              name: {
                $like: 'hello%'
              }
            }
          ];
          const options=undefined;
          const expectation={
            default: "([name] LIKE '%hello' AND [name] LIKE 'hello%')",
            oracle: "(name LIKE '%hello' AND name LIKE 'hello%')",
            mssql: "([name] LIKE N'%hello' AND [name] LIKE N'hello%')"
          };
          expectsql(queryGenerator.whereItemQuery(key, params, options), expectation);
        });

        it('rank != 15 and rank between 10 and 20', () => {
          const key='rank';
          const params={
            $and: {
              $ne: 15,
              $between: [10, 20]
            }
          };
          const options=undefined;
          const expectation={
            default: '([rank] != 15 AND [rank] BETWEEN 10 AND 20)',
            oracle: '(rank != 15 AND rank BETWEEN 10 AND 20)'
          };
          expectsql(queryGenerator.whereItemQuery(key, params, options), expectation);
        });

        it("name like '%someValue1% and name like '%someValue2%'", () => {
          const key='name';
          const params={
            $and: [
              {like: '%someValue1%'},
              {like: '%someValue2%'}
            ]
          };
          const options=undefined;
          const expectation={
            default: "([name] LIKE '%someValue1%' AND [name] LIKE '%someValue2%')",
            oracle: "(name LIKE '%someValue1%' AND name LIKE '%someValue2%')",
            mssql: "([name] LIKE N'%someValue1%' AND [name] LIKE N'%someValue2%')"
          };
          expectsql(queryGenerator.whereItemQuery(key, params, options), expectation);
        });

        it('sequelize.and({shared: 1, sequelize.or({group_id: 1}, {user_id: 2}))', function() {
          expectsql(queryGenerator.whereItemQuery(undefined, this.sequelize.and({shared: 1}, this.sequelize.or({group_id: 1}, {user_id: 2}))), {
            default: '([shared] = 1 AND ([group_id] = 1 OR [user_id] = 2))',
            oracle: '(\"shared\" = 1 AND (group_id = 1 OR user_id = 2))'
          });
        });
      });

      describe('$not', () => {
        it('not ((group_id = 1 or user_id = 2) and shared = 1)', () => {
          const key='$not';
          const params={
            $or: {
              group_id: 1,
              user_id: 2
            },
            shared: 1
          };
          const options=undefined;
          const expectation={
            default: 'NOT (([group_id] = 1 OR [user_id] = 2) AND [shared] = 1)',
            oracle: 'NOT ((group_id = 1 OR user_id = 2) AND "shared" = 1)'
          };
          expectsql(queryGenerator.whereItemQuery(key, params, options), expectation);
        });

        it('0 = 1 (array)', () => {
          const key='$not';
          const params=[];
          const options=undefined;
          const expectation={
            default: '0 = 1'
          };
          expectsql(queryGenerator.whereItemQuery(key, params, options), expectation);
        });

        it('0 = 1 (object)', () => {
          const key='$not';
          const params={};
          const options=undefined;
          const expectation={
            default: '0 = 1'
          };
          expectsql(queryGenerator.whereItemQuery(key, params, options), expectation);
        });
      });
    });

    describe('$col', () => {
      it('userId = user.id', () => {
        const key='userId';
        const params={
          $col: 'user.id'
        };
        const options=undefined;
        const expectation={
          default: '[userId] = [user].[id]',
          oracle: 'userId = "user".id'
        };
        expectsql(queryGenerator.whereItemQuery(key, params, options), expectation);
      });

      it('userId = user.id ($eq)', () => {
        const key='userId';
        const params={
          $eq: {
            $col: 'user.id'
          }
        };
        const options=undefined;
        const expectation={
          default: '[userId] = [user].[id]',
          oracle: 'userId = "user".id'
        };
        expectsql(queryGenerator.whereItemQuery(key, params, options), expectation);
      });

      it('userId > user.id', () => {
        const key='userId';
        const params={
          $gt: {
            $col: 'user.id'
          }
        };
        const options=undefined;
        const expectation={
          default: '[userId] > [user].[id]',
          oracle: 'userId > "user".id'
        };
        expectsql(queryGenerator.whereItemQuery(key, params, options), expectation);
      });

      it('ownerId = user.id or ownerId = organization.id', () => {
        const key='$or';
        const params=[
          {'ownerId': {$col: 'user.id'}},
          {'ownerId': {$col: 'organization.id'}}
        ];
        const options=undefined;
        const expectation={
          default: '([ownerId] = [user].[id] OR [ownerId] = [organization].[id])',
          oracle: '(ownerId = "user".id OR ownerId = "organization".id)'
        };
        expectsql(queryGenerator.whereItemQuery(key, params, options), expectation);
      });

      it('organization.id = user.organizationId', () => {
        const key='$organization.id$';
        const params={
          $col: 'user.organizationId'
        };
        const options=undefined;
        const expectation={
          default: '[organization].[id] = [user].[organizationId]',
          oracle: '"organization".id = "user".organizationId'
        };
        expectsql(queryGenerator.whereItemQuery(key, params, options), expectation);
      });

      it('organization.id = user.organizationId', () => {
        const key='$offer.organization.id$';
        const params={
          $col: 'offer.user.organizationId'
        };
        const options=undefined;
        const expectation={
          default: '[offer->organization].[id] = [offer->user].[organizationId]',
          oracle: '"offer->organization".id = "offer->user".organizationId'
        };
        expectsql(queryGenerator.whereItemQuery(key, params, options), expectation);
      });
    });

    describe('$gt', () => {
      it('rank > 2', () => {
        const key='rank';
        const params={
          $gt: 2
        };
        const options=undefined;
        const expectation={
          default: '[rank] > 2',
          oracle: 'rank > 2'
        };
        expectsql(queryGenerator.whereItemQuery(key, params, options), expectation);
      });

      it('created_at < updated_at', () => {
        const key='created_at';
        const params={
          $lt: {
            $col: 'updated_at'
          }
        };
        const options=undefined;
        const expectation={
          default: '[created_at] < [updated_at]',
          oracle: 'created_at < updated_at'
        };
        expectsql(queryGenerator.whereItemQuery(key, params, options), expectation);
      });
    });

    describe('$raw', () => {
      it('should fail on $raw', () => {
        expect(() => {
          queryGenerator.whereItemQuery('rank', {
            $raw: 'AGHJZ'
          });
        }).to.throw(Error, 'The `$raw` where property is no longer supported.  Use `sequelize.literal` instead.');
      });
    });

    describe('$like', () => {
      it("username like '%swagger'", () => {
        const key='username';
        const params={
          $like: '%swagger'
        };
        const options=undefined;
        const expectation={
          default: "[username] LIKE '%swagger'",
          oracle: "username LIKE '%swagger'",
          mssql: "[username] LIKE N'%swagger'"
        };
        expectsql(queryGenerator.whereItemQuery(key, params, options), expectation);
      });
    });

    describe('date', () => {
      it("date between '2013-01-01' and '2013-01-11'", () => {
        const key='date';
        const params={
          $between: ['2013-01-01', '2013-01-11']
        };
        const options=undefined;
        const expectation={
          default: "[date] BETWEEN '2013-01-01' AND '2013-01-11'",
          oracle: "\"date\" BETWEEN '2013-01-01' AND '2013-01-11'",
          mssql: "[date] BETWEEN N'2013-01-01' AND N'2013-01-11'"
        };
        expectsql(queryGenerator.whereItemQuery(key, params, options), expectation);
      });

      it("date between '2012-12-10' and '2013-01-02' and date not between '2013-01-04' and '2013-01-20'", () => {
        const key='date';
        const params={
          between: ['2012-12-10', '2013-01-02'],
          nbetween: ['2013-01-04', '2013-01-20']
        };
        const options=undefined;
        const expectation={
          default: "([date] BETWEEN '2012-12-10' AND '2013-01-02' AND [date] NOT BETWEEN '2013-01-04' AND '2013-01-20')",
          oracle: "(\"date\" BETWEEN '2012-12-10' AND '2013-01-02' AND \"date\" NOT BETWEEN '2013-01-04' AND '2013-01-20')",
          mssql: "([date] BETWEEN N'2012-12-10' AND N'2013-01-02' AND [date] NOT BETWEEN N'2013-01-04' AND N'2013-01-20')"
        };
        expectsql(queryGenerator.whereItemQuery(key, params, options), expectation);
      });
    });

    describe('$notBetween', () => {
      it("date not between '2013-01-01' and '2013-01-11'", () => {
        const key='date';
        const params={
          $notBetween: ['2013-01-01', '2013-01-11']
        };
        const options=undefined;
        const expectation={
          default: "[date] NOT BETWEEN '2013-01-01' AND '2013-01-11'",
          oracle: "\"date\" NOT BETWEEN '2013-01-01' AND '2013-01-11'",
          mssql: "[date] NOT BETWEEN N'2013-01-01' AND N'2013-01-11'"
        };
        expectsql(queryGenerator.whereItemQuery(key, params, options), expectation);
      });
    });

    if (current.dialect.supports.ARRAY) {
      describe('ARRAY', () => {
        describe('$contains', () => {
          it('muscles @> ARRAY[2,3]', () => {
            const key='muscles';
            const params={
              $contains: [2, 3]
            };
            const options=undefined;
            const expectation={
              postgres: '"muscles" @> ARRAY[2,3]'
            };
            expectsql(queryGenerator.whereItemQuery(key, params, options), expectation);
          });

          it('muscles @> ARRAY[6,8]', () => {
            const key='muscles';
            const params={
              $contains: [6, 8]
            };
            const options=undefined;
            const expectation={
              postgres: '"muscles" @> ARRAY[6,8]'
            };
            expectsql(queryGenerator.whereItemQuery(key, params, options), expectation);
          });

          it('muscles @> ARRAY[2,5]::Integer[]', () => {
            const key='muscles';
            const params={
              $contains: [2, 5]
            };
            const options={
              field: {
                type: DataTypes.ARRAY(DataTypes.INTEGER)
              }
            };
            const expectation={
              postgres: '"muscles" @> ARRAY[2,5]::INTEGER[]'
            };
            expectsql(queryGenerator.whereItemQuery(key, params, options), expectation);
          });
        });

        describe('$overlap', () => {
          it('muscles && ARRAY[3,11] ($overlap)', () => {
            const key='muscles';
            const params={
              $overlap: [3, 11]
            };
            const options=undefined;
            const expectation={
              postgres: '"muscles" && ARRAY[3,11]'
            };
            expectsql(queryGenerator.whereItemQuery(key, params, options), expectation);
          });

          it('muscles && ARRAY[3,1] ($overlap)', () => {
            const key='muscles';
            const params={
              $overlap: [3, 1]
            };
            const options=undefined;
            const expectation={
              postgres: '"muscles" && ARRAY[3,1]'
            };
            expectsql(queryGenerator.whereItemQuery(key, params, options), expectation);
          });

          it('muscles && ARRAY[9,182] (&&)', () => {
            const key='muscles';
            const params={
              '&&': [9, 182]
            };
            const options=undefined;
            const expectation={
              postgres: '"muscles" && ARRAY[9,182]'
            };
            expectsql(queryGenerator.whereItemQuery(key, params, options), expectation);
          });
        });

        describe('$any', () => {
          it('userId = ANY (ARRAY[4,5,6])', () => {
            const key='userId';
            const params={
              $any: [4, 5, 6]
            };
            const options=undefined;
            const expectation={
              postgres: '"userId" = ANY (ARRAY[4,5,6])'
            };
            expectsql(queryGenerator.whereItemQuery(key, params, options), expectation);
          });

          it('userId = ANY (ARRAY[2,5]::INTEGER[])', () => {
            const key='userId';
            const params={
              $any: [2, 5]
            };
            const options={
              field: {
                type: DataTypes.ARRAY(DataTypes.INTEGER)
              }
            };
            const expectation={
              postgres: '"userId" = ANY (ARRAY[2,5]::INTEGER[])'
            };
            expectsql(queryGenerator.whereItemQuery(key, params, options), expectation);
          });

          describe('$values', () => {
            it('userId = ANY (VALUES (4), (5), (6))', () => {
              const key='userId';
              const params={
                $any: {
                  $values: [4, 5, 6]
                }
              };
              const options=undefined;
              const expectation={
                postgres: '"userId" = ANY (VALUES (4), (5), (6))'
              };
              expectsql(queryGenerator.whereItemQuery(key, params, options), expectation);
            });

            it('userId = ANY (VALUES (2), (5))', () => {
              const key='userId';
              const params={
                $any: {
                  $values: [2, 5]
                }
              };
              const options={
                field: {
                  type: DataTypes.ARRAY(DataTypes.INTEGER)
                }
              };
              const expectation={
                postgres: '"userId" = ANY (VALUES (2), (5))'
              };
              expectsql(queryGenerator.whereItemQuery(key, params, options), expectation);
            });
          });
        });

        describe('$all', () => {
          it('userId = ALL (ARRAY[4,5,6])', () => {
            const key='userId';
            const params={
              $all: [4, 5, 6]
            };
            const options=undefined;
            const expectation={
              postgres: '"userId" = ALL (ARRAY[4,5,6])'
            };
            expectsql(queryGenerator.whereItemQuery(key, params, options), expectation);
          });

          it('userId = ALL (ARRAY[2,5]::INTEGER[])', () => {
            const key='userId';
            const params={
              $all: [2, 5]
            };
            const options={
              field: {
                type: DataTypes.ARRAY(DataTypes.INTEGER)
              }
            };
            const expectation={
              postgres: '"userId" = ALL (ARRAY[2,5]::INTEGER[])'
            };
            expectsql(queryGenerator.whereItemQuery(key, params, options), expectation);
          });

          describe('$values', () => {
            it('userId = ALL (VALUES (4), (5), (6))', () => {
              const key='userId';
              const params={
                $all: {
                  $values: [4, 5, 6]
                }
              };
              const options=undefined;
              const expectation={
                postgres: '"userId" = ALL (VALUES (4), (5), (6))'
              };
              expectsql(queryGenerator.whereItemQuery(key, params, options), expectation);
            });

            it('userId = ALL (VALUES (2), (5))', () => {
              const key='userId';
              const params={
                $all: {
                  $values: [2, 5]
                }
              };
              const options={
                field: {
                  type: DataTypes.ARRAY(DataTypes.INTEGER)
                }
              };
              const expectation={
                postgres: '"userId" = ALL (VALUES (2), (5))'
              };
              expectsql(queryGenerator.whereItemQuery(key, params, options), expectation);
            });
          });
        });

        describe('$like', () => {
          it("userId LIKE ANY (ARRAY['foo','bar','baz'])", () => {
            const key='userId';
            const params={
              $like: {
                $any: ['foo', 'bar', 'baz']
              }
            };
            const options=undefined;
            const expectation={
              postgres: "\"userId\" LIKE ANY (ARRAY['foo','bar','baz'])"
            };
            expectsql(queryGenerator.whereItemQuery(key, params, options), expectation);
          });

          it("userId ILIKE ANY (ARRAY['foo','bar','baz'])", () => {
            const key='userId';
            const params={
              $iLike: {
                $any: ['foo', 'bar', 'baz']
              }
            };
            const options=undefined;
            const expectation={
              postgres: "\"userId\" ILIKE ANY (ARRAY['foo','bar','baz'])"
            };
            expectsql(queryGenerator.whereItemQuery(key, params, options), expectation);
          });

          it("userId NOT LIKE ANY (ARRAY['foo','bar','baz'])", () => {
            const key='userId';
            const params={
              $notLike: {
                $any: ['foo', 'bar', 'baz']
              }
            };
            const options=undefined;
            const expectation={
              postgres: "\"userId\" NOT LIKE ANY (ARRAY['foo','bar','baz'])"
            };
            expectsql(queryGenerator.whereItemQuery(key, params, options), expectation);
          });

          it("userId NOT ILIKE ANY (ARRAY['foo','bar','baz'])", () => {
            const key='userId';
            const params={
              $notILike: {
                $any: ['foo', 'bar', 'baz']
              }
            };
            const options=undefined;
            const expectation={
              postgres: "\"userId\" NOT ILIKE ANY (ARRAY['foo','bar','baz'])"
            };
            expectsql(queryGenerator.whereItemQuery(key, params, options), expectation);
          });

          it("userId LIKE ALL (ARRAY['foo','bar','baz'])", () => {
            const key='userId';
            const params={
              $like: {
                $all: ['foo', 'bar', 'baz']
              }
            };
            const options=undefined;
            const expectation={
              postgres: "\"userId\" LIKE ALL (ARRAY['foo','bar','baz'])"
            };
            expectsql(queryGenerator.whereItemQuery(key, params, options), expectation);
          });

          it("userId ILIKE ALL (ARRAY['foo','bar','baz'])", () => {
            const key='userId';
            const params={
              $iLike: {
                $all: ['foo', 'bar', 'baz']
              }
            };
            const options=undefined;
            const expectation={
              postgres: "\"userId\" ILIKE ALL (ARRAY['foo','bar','baz'])"
            };
            expectsql(queryGenerator.whereItemQuery(key, params, options), expectation);
          });

          it("userId NOT LIKE ALL (ARRAY['foo','bar','baz'])", () => {
            const key='userId';
            const params={
              $notLike: {
                $all: ['foo', 'bar', 'baz']
              }
            };
            const options=undefined;
            const expectation={
              postgres: "\"userId\" NOT LIKE ALL (ARRAY['foo','bar','baz'])"
            };
            expectsql(queryGenerator.whereItemQuery(key, params, options), expectation);
          });

          it("userId NOT ILIKE ALL (ARRAY['foo','bar','baz'])", () => {
            const key='userId';
            const params={
              $notILike: {
                $all: ['foo', 'bar', 'baz']
              }
            };
            const options=undefined;
            const expectation={
              postgres: "\"userId\" NOT ILIKE ALL (ARRAY['foo','bar','baz'])"
            };
            expectsql(queryGenerator.whereItemQuery(key, params, options), expectation);
          });
        });
      });
    }

    if (current.dialect.supports.RANGE) {
      describe('RANGE', () => {
        it("Timeline.range @> '2000-02-01 00:00:00.000 +00:00'::timestamptz", () => {
          const key='range';
          const params={
            $contains: new Date(Date.UTC(2000, 1, 1))
          };
          const options={
            field: {
              type: new (DataTypes as any).postgres.RANGE(DataTypes.DATE)
            },
            prefix: 'Timeline'
          };
          const expectation={
            postgres: "\"Timeline\".\"range\" @> '2000-02-01 00:00:00.000 +00:00'::timestamptz"
          };
          expectsql(queryGenerator.whereItemQuery(key, params, options), expectation);
        });
        
        it('Timeline.range @> [2000-02-01 00:00:00.000 +00:00,2000-03-01 00:00:00.000 +00:00)', () => {
          const key='range';
          const params={
            $contains: [new Date(Date.UTC(2000, 1, 1)), new Date(Date.UTC(2000, 2, 1))]
          };
          const options={
            field: {
              type: new (DataTypes as any).postgres.RANGE(DataTypes.DATE)
            },
            prefix: 'Timeline'
          };
          const expectation={
            postgres: "\"Timeline\".\"range\" @> '[\"2000-02-01 00:00:00.000 +00:00\",\"2000-03-01 00:00:00.000 +00:00\")'"
          };
          expectsql(queryGenerator.whereItemQuery(key, params, options), expectation);
        });

        it('Timeline.range <@ [2000-02-01 00:00:00.000 +00:00,2000-03-01 00:00:00.000 +00:00)', () => {
          const key='range';
          const params={
            $contained: [new Date(Date.UTC(2000, 1, 1)), new Date(Date.UTC(2000, 2, 1))]
          };
          const options={
            field: {
              type: new (DataTypes as any).postgres.RANGE(DataTypes.DATE)
            },
            prefix: 'Timeline'
          };
          const expectation={
            postgres: "\"Timeline\".\"range\" <@ '[\"2000-02-01 00:00:00.000 +00:00\",\"2000-03-01 00:00:00.000 +00:00\")'"
          };
          expectsql(queryGenerator.whereItemQuery(key, params, options), expectation);
        });

        it('Timeline.unboundedRange @> [2000-02-01 00:00:00.000 +00:00,)', () => {
          const key='unboundedRange';
          const params={
            $contains: [new Date(Date.UTC(2000, 1, 1)), null]
          };
          const options={
            field: {
              type: new (DataTypes as any).postgres.RANGE(DataTypes.DATE)
            },
            prefix: 'Timeline'
          };
          const expectation={
            postgres: "\"Timeline\".\"unboundedRange\" @> '[\"2000-02-01 00:00:00.000 +00:00\",)'"
          };
          expectsql(queryGenerator.whereItemQuery(key, params, options), expectation);
        });

        it("Timeline.unboundedRange @> '[-infinity,infinity)'", () => {
          const key='unboundedRange';
          const params={
            $contains: [-Infinity, Infinity]
          };
          const options={
            field: {
              type: new (DataTypes as any).postgres.RANGE(DataTypes.DATE)
            },
            prefix: 'Timeline'
          };
          const expectation={
            postgres: "\"Timeline\".\"unboundedRange\" @> '[-infinity,infinity)'"
          };
          expectsql(queryGenerator.whereItemQuery(key, params, options), expectation);
        });

        it("Room.reservedSeats && '[1,4)'", () => {
          const key='reservedSeats';
          const params={
            $overlap: [1, 4]
          };
          const options={
            field: {
              type: new (DataTypes as any).postgres.RANGE()
            },
            prefix: 'Room'
          };
          const expectation={
            postgres: "\"Room\".\"reservedSeats\" && '[1,4)'"
          };
          expectsql(queryGenerator.whereItemQuery(key, params, options), expectation);
        });

        it("Room.reservedSeats -|- '[1,4)'", () => {
          const key='reservedSeats';
          const params={
            $adjacent: [1, 4]
          };
          const options={
            field: {
              type: new (DataTypes as any).postgres.RANGE()
            },
            prefix: 'Room'
          };
          const expectation={
            postgres: "\"Room\".\"reservedSeats\" -|- '[1,4)'"
          };
          expectsql(queryGenerator.whereItemQuery(key, params, options), expectation);
        });

        it("Room.reservedSeats << '[1,4)'", () => {
          const key='reservedSeats';
          const params={
            $strictLeft: [1, 4]
          };
          const options={
            field: {
              type: new (DataTypes as any).postgres.RANGE()
            },
            prefix: 'Room'
          };
          const expectation={
            postgres: "\"Room\".\"reservedSeats\" << '[1,4)'"
          };
          expectsql(queryGenerator.whereItemQuery(key, params, options), expectation);
        });

        it("Room.reservedSeats >> '[1,4)'", () => {
          const key='reservedSeats';
          const params={
            $strictRight: [1, 4]
          };
          const options={
            field: {
              type: new (DataTypes as any).postgres.RANGE()
            },
            prefix: 'Room'
          };
          const expectation={
            postgres: "\"Room\".\"reservedSeats\" >> '[1,4)'"
          };
          expectsql(queryGenerator.whereItemQuery(key, params, options), expectation);
        });

        it("Room.reservedSeats &< '[1,4)'", () => {
          const key='reservedSeats';
          const params={
            $noExtendRight: [1, 4]
          };
          const options={
            field: {
              type: new (DataTypes as any).postgres.RANGE()
            },
            prefix: 'Room'
          };
          const expectation={
            postgres: "\"Room\".\"reservedSeats\" &< '[1,4)'"
          };
          expectsql(queryGenerator.whereItemQuery(key, params, options), expectation);
        });

        it("Room.reservedSeats &> '[1,4)'", () => {
          const key='reservedSeats';
          const params={
            $noExtendLeft: [1, 4]
          };
          const options={
            field: {
              type: new (DataTypes as any).postgres.RANGE()
            },
            prefix: 'Room'
          };
          const expectation={
            postgres: "\"Room\".\"reservedSeats\" &> '[1,4)'"
          };
          expectsql(queryGenerator.whereItemQuery(key, params, options), expectation);
        });
      });
    }

    if (current.dialect.supports.JSON) {
      describe('JSON', () => {
        it('sequelize.json("profile.id"), sequelize.cast(2, \'text\')")', function() {
          expectsql(queryGenerator.whereItemQuery(undefined, this.sequelize.json('profile.id', this.sequelize.cast('12346-78912', 'text'))), {
            postgres: "(\"profile\"#>>'{id}') = CAST('12346-78912' AS TEXT)",
            sqlite: "json_extract(`profile`, '$.id') = CAST('12346-78912' AS TEXT)",
            mysql: "`profile`->>'$.id' = CAST('12346-78912' AS CHAR)"
          });
        });

        it('sequelize.json({profile: {id: "12346-78912", name: "test"}})', function() {
          expectsql(queryGenerator.whereItemQuery(undefined, this.sequelize.json({profile: {id: '12346-78912', name: 'test'}})), {
            postgres: "(\"profile\"#>>'{id}') = '12346-78912' AND (\"profile\"#>>'{name}') = 'test'",
            sqlite: "json_extract(`profile`, '$.id') = '12346-78912' AND json_extract(`profile`, '$.name') = 'test'",
            mysql: "`profile`->>'$.id' = '12346-78912' and `profile`->>'$.name' = 'test'"
          });
        });

        it('(User.data ->> $.nested.attribute) = value', () => {
          const key='data';
          const params={
            nested: {
              attribute: 'value'
            }
          };
          const options={
            field: {
              type: new (DataTypes as any).JSONB()
            },
            prefix: 'User'
          };
          const expectation={
            mysql: "(`User`.`data`->>'$.\"nested\".\"attribute\"') = 'value'",
            postgres: "(\"User\".\"data\"#>>'{nested,attribute}') = 'value'",
            sqlite: "json_extract(`User`.`data`, '$.nested.attribute') = 'value'"
          };
          expectsql(queryGenerator.whereItemQuery(key, params, options), expectation);
        });

        it('cast (( data ->> $.nested ) as decimal) in (1, 2)', () => {
          const key='data';
          const params={
            nested: {
              $in: [1, 2]
            }
          };
          const options={
            field: {
              type: new (DataTypes as any).JSONB()
            }
          };
          const expectation={
            mysql: "CAST((`data`->>'$.\"nested\"') AS DECIMAL) IN (1, 2)",
            postgres: "CAST((\"data\"#>>'{nested}') AS DOUBLE PRECISION) IN (1, 2)",
            sqlite: "CAST(json_extract(`data`, '$.nested') AS DOUBLE PRECISION) IN (1, 2)"
          };
          expectsql(queryGenerator.whereItemQuery(key, params, options), expectation);
        });

        it('cast (( data ->> $.nested ) as decimal) between 1 and 2', () => {
          const key='data';
          const params={
            nested: {
              $between: [1, 2]
            }
          };
          const options={
            field: {
              type: new (DataTypes as any).JSONB()
            }
          };
          const expectation={
            mysql: "CAST((`data`->>'$.\"nested\"') AS DECIMAL) BETWEEN 1 AND 2",
            postgres: "CAST((\"data\"#>>'{nested}') AS DOUBLE PRECISION) BETWEEN 1 AND 2",
            sqlite: "CAST(json_extract(`data`, '$.nested') AS DOUBLE PRECISION) BETWEEN 1 AND 2"
          };
          expectsql(queryGenerator.whereItemQuery(key, params, options), expectation);
        });

        it("(User.data ->> $.nested.attribute) = value and (User.data ->> $.nested.prop) != 'None'", () => {
          const key='data';
          const params={
            nested: {
              attribute: 'value',
              prop: {
                $ne: 'None'
              }
            }
          };
          const options={
            field: {
              type: new (DataTypes as any).JSONB()
            },
            prefix: current.literal(queryGenerator.quoteTable.call(current.dialect.QueryGenerator, {tableName: 'User'}))
          };
          const expectation={
            mysql: "((`User`.`data`->>'$.\"nested\".\"attribute\"') = 'value' AND (`User`.`data`->>'$.\"nested\".\"prop\"') != 'None')",
            postgres: "((\"User\".\"data\"#>>'{nested,attribute}') = 'value' AND (\"User\".\"data\"#>>'{nested,prop}') != 'None')",
            sqlite: "(json_extract(`User`.`data`, '$.nested.attribute') = 'value' AND json_extract(`User`.`data`, '$.nested.prop') != 'None')"
          };
          expectsql(queryGenerator.whereItemQuery(key, params, options), expectation);
        });

        it("(User.data ->> $.name.last) = 'Simpson' and (User.data ->> $.employment) != 'None'", () => {
          const key='data';
          const params={
            name: {
              last: 'Simpson'
            },
            employment: {
              $ne: 'None'
            }
          };
          const options={
            field: {
              type: new (DataTypes as any).JSONB()
            },
            prefix: 'User'
          };
          const expectation={
            mysql: "((`User`.`data`->>'$.\"name\".\"last\"') = 'Simpson' AND (`User`.`data`->>'$.\"employment\"') != 'None')",
            postgres: "((\"User\".\"data\"#>>'{name,last}') = 'Simpson' AND (\"User\".\"data\"#>>'{employment}') != 'None')",
            sqlite: "(json_extract(`User`.`data`, '$.name.last') = 'Simpson' AND json_extract(`User`.`data`, '$.employment') != 'None')"
          };
          expectsql(queryGenerator.whereItemQuery(key, params, options), expectation);
        });

        it("CAST((data->>$.price) AS DECIMAL) = 5 AND (data->>$.name) = 'Product'", () => {
          const key='data';
          const params={
            price: 5,
            name: 'Product'
          };
          const options={
            field: {
              type: new (DataTypes as any).JSONB()
            }
          };
          const expectation={
            mysql: "(CAST((`data`->>'$.\"price\"') AS DECIMAL) = 5 AND (`data`->>'$.\"name\"') = 'Product')",
            postgres: "(CAST((\"data\"#>>'{price}') AS DOUBLE PRECISION) = 5 AND (\"data\"#>>'{name}') = 'Product')",
            sqlite: "(CAST(json_extract(`data`, '$.price') AS DOUBLE PRECISION) = 5 AND json_extract(`data`, '$.name') = 'Product')"
          };
          expectsql(queryGenerator.whereItemQuery(key, params, options), expectation);
        });

        it('data ->> $.nested.attribute) = value', () => {
          const key='data.nested.attribute';
          const params='value';
          const options={
            model: {
              rawAttributes: {
                data: {
                  type: new (DataTypes as any).JSONB()
                }
              }
            }
          };
          const expectation={
            mysql: "(`data`->>'$.\"nested\".\"attribute\"') = 'value'",
            postgres: "(\"data\"#>>'{nested,attribute}') = 'value'",
            sqlite: "json_extract(`data`, '$.nested.attribute') = 'value'"
          };
          expectsql(queryGenerator.whereItemQuery(key, params, options), expectation);
        });

        it('CAST((data ->> $.nested.attribute) AS DECIMAL) = 4', () => {
          const key='data.nested.attribute';
          const params=4;
          const options={
            model: {
              rawAttributes: {
                data: {
                  type: new (DataTypes as any).JSON()
                }
              }
            }
          };
          const expectation={
            mysql: "CAST((`data`->>'$.\"nested\".\"attribute\"') AS DECIMAL) = 4",
            postgres: "CAST((\"data\"#>>'{nested,attribute}') AS DOUBLE PRECISION) = 4",
            sqlite: "CAST(json_extract(`data`, '$.nested.attribute') AS DOUBLE PRECISION) = 4"
          };
          expectsql(queryGenerator.whereItemQuery(key, params, options), expectation);
        });

        it('CAST((data ->> $.nested.attribute) AS DECIMAL) IN (3, 7)', () => {
          const key='data.nested.attribute';
          const params={
            $in: [3, 7]
          };
          const options={
            model: {
              rawAttributes: {
                data: {
                  type: new (DataTypes as any).JSONB()
                }
              }
            }
          };
          const expectation={
            mysql: "CAST((`data`->>'$.\"nested\".\"attribute\"') AS DECIMAL) IN (3, 7)",
            postgres: "CAST((\"data\"#>>'{nested,attribute}') AS DOUBLE PRECISION) IN (3, 7)",
            sqlite: "CAST(json_extract(`data`, '$.nested.attribute') AS DOUBLE PRECISION) IN (3, 7)"
          };
          expectsql(queryGenerator.whereItemQuery(key, params, options), expectation);
        });

        it('CAST((data ->> $.nested.attribute) AS DECIMAL) > 2', () => {
          const key='data';
          const params={
            nested: {
              attribute: {
                $gt: 2
              }
            }
          };
          const options={
            field: {
              type: new (DataTypes as any).JSONB()
            }
          };
          const expectation={
            mysql: "CAST((`data`->>'$.\"nested\".\"attribute\"') AS DECIMAL) > 2",
            postgres: "CAST((\"data\"#>>'{nested,attribute}') AS DOUBLE PRECISION) > 2",
            sqlite: "CAST(json_extract(`data`, '$.nested.attribute') AS DOUBLE PRECISION) > 2"
          };
          expectsql(queryGenerator.whereItemQuery(key, params, options), expectation);
        });

        const dt = new Date();
        it('CAST((data ->> $.nested.attribute) AS DECIMAL) > queryGenerator.escape(date)', () => {
          const key='data';
          const params={
            nested: {
              attribute: {
                $gt: dt
              }
            }
          };
          const options={
            field: {
              type: new (DataTypes as any).JSONB()
            }
          };
          const expectation={
            mysql: "CAST((`data`->>'$.\"nested\".\"attribute\"') AS DATETIME) > "+queryGenerator.escape(dt),
            postgres: "CAST((\"data\"#>>'{nested,attribute}') AS TIMESTAMPTZ) > "+queryGenerator.escape(dt),
            sqlite: "json_extract(`data`, '$.nested.attribute') > " + queryGenerator.escape(dt.toISOString())
          };
          expectsql(queryGenerator.whereItemQuery(key, params, options), expectation);
        });

        it('(data ->> $.nested.attribute) = true', () => {
          const key='data';
          const params={
            nested: {
              attribute: true
            }
          };
          const options={
            field: {
              type: new (DataTypes as any).JSONB()
            }
          };
          const expectation={
            mysql: "(`data`->>'$.\"nested\".\"attribute\"') = 'true'",
            postgres: "CAST((\"data\"#>>'{nested,attribute}') AS BOOLEAN) = true",
            sqlite: "CAST(json_extract(`data`, '$.nested.attribute') AS BOOLEAN) = 1"
          };
          expectsql(queryGenerator.whereItemQuery(key, params, options), expectation);
        });

        it('(meta_data ->> $.nested.attribute) = value', () => {
          const key='metaData.nested.attribute';
          const params='value';
          const options={
            model: {
              rawAttributes: {
                metaData: {
                  field: 'meta_data',
                  fieldName: 'metaData',
                  type: new (DataTypes as any).JSONB()
                }
              }
            }
          };
          const expectation={
            mysql: "(`meta_data`->>'$.\"nested\".\"attribute\"') = 'value'",
            postgres: "(\"meta_data\"#>>'{nested,attribute}') = 'value'",
            sqlite: "json_extract(`meta_data`, '$.nested.attribute') = 'value'"
          };
          expectsql(queryGenerator.whereItemQuery(key, params, options), expectation);
        });
      });
    }

    if (current.dialect.supports.JSONB) {
      describe('JSONB', () => {
        it("data @> {'company' : 'Magnafone'}", () => {
          const key='data';
          const params={
            $contains: {
              company: 'Magnafone'
            }
          };
          const options={
            field: {
              type: new (DataTypes as any).JSONB()
            }
          };
          const expectation={
            default: '[data] @> \'{"company":"Magnafone"}\''
          };
          expectsql(queryGenerator.whereItemQuery(key, params, options), expectation);
        });
      });
    }

    if (current.dialect.supports.REGEXP) {
      describe('$regexp', () => {
        it("username REGEXP '^sw.*r$'", () => {
          const key='username';
          const params={
            $regexp: '^sw.*r$'
          };
          const options=undefined;
          const expectation={
            mysql: "`username` REGEXP '^sw.*r$'",
            postgres: '"username" ~ \'^sw.*r$\''
          };
          expectsql(queryGenerator.whereItemQuery(key, params, options), expectation);
        });

        it("newline REGEXP 'new\nline$'", () => {
          const key='newline';
          const params={
            $regexp: '^new\nline$'
          };
          const options=undefined;
          const expectation={
            mysql: "`newline` REGEXP '^new\nline$'",
            postgres: '"newline" ~ \'^new\nline$\''
          };
          expectsql(queryGenerator.whereItemQuery(key, params, options), expectation);
        });
      });

      describe('$notRegexp', () => {
        it("username NOT REGEXP '^sw.*r$'", () => {
          const key='username';
          const params={
            $notRegexp: '^sw.*r$'
          };
          const options=undefined;
          const expectation={
            mysql: "`username` NOT REGEXP '^sw.*r$'",
            postgres: '"username" !~ \'^sw.*r$\''
          };
          expectsql(queryGenerator.whereItemQuery(key, params, options), expectation);
        });

        it("newline NOT REGEXP 'new\nline$'", () => {
          const key='newline';
          const params={
            $notRegexp: '^new\nline$'
          };
          const options=undefined;
          const expectation={
            mysql: "`newline` NOT REGEXP '^new\nline$'",
            postgres: '"newline" !~ \'^new\nline$\''
          };
          expectsql(queryGenerator.whereItemQuery(key, params, options), expectation);
        });
      });

      if (current.dialect.name === 'postgres') {
        describe('$iRegexp', () => {
          it("username iREGEXP '^sw.*r$'", () => {
            const key='username';
            const params={
              $iRegexp: '^sw.*r$'
            };
            const options=undefined;
            const expectation={
              postgres: '"username" ~* \'^sw.*r$\''
            };
            expectsql(queryGenerator.whereItemQuery(key, params, options), expectation);
          });

          it("newline iREGEXP 'new\nline$'", () => {
            const key='newline';
            const params={
              $iRegexp: '^new\nline$'
            };
            const options=undefined;
            const expectation={
              postgres: '"newline" ~* \'^new\nline$\''
            };
            expectsql(queryGenerator.whereItemQuery(key, params, options), expectation);
          });
        });

        describe('$notIRegexp', () => {
          it("username NOT IREGEXP '^sw.*r$'", () => {
            const key='username';
            const params={
              $notIRegexp: '^sw.*r$'
            };
            const options=undefined;
            const expectation={
              postgres: '"username" !~* \'^sw.*r$\''
            };
            expectsql(queryGenerator.whereItemQuery(key, params, options), expectation);
          });

          it("newline NOT IREGEXP 'new\nline$'", () => {
            const key='newline';
            const params={
              $notIRegexp: '^new\nline$'
            };
            const options=undefined;
            const expectation={
              postgres: '"newline" !~* \'^new\nline$\''
            };
            expectsql(queryGenerator.whereItemQuery(key, params, options), expectation);
          });
        });
      }
    }

    describe('fn', () => {
      it('{name: this.sequelize.fn(\'LOWER\', \'DERP\')}', function() {
        expectsql(queryGenerator.whereQuery({name: this.sequelize.fn('LOWER', 'DERP')}), {
          default: "WHERE [name] = LOWER('DERP')",
          oracle: "WHERE name = LOWER('DERP')",
          mssql: "WHERE [name] = LOWER(N'DERP')"
        });
      });
    });
  });

  describe('getWhereConditions', () => {
    it('lower(name) is null', () => {
      const User = current.define('user', {});
      const value=current.where(current.fn('lower', current.col('name')));
      const expectation={
        default: 'lower([name]) IS NULL',
        oracle: 'lower(name) IS NULL'
      };
      expectsql(queryGenerator.getWhereConditions(value, User.tableName, User), expectation);
    });
  });
});
