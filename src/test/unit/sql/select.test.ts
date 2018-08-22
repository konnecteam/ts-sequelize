'use strict';

import * as chai from 'chai';
import DataTypes from '../../../lib/data-types';
import { Model } from '../../../lib/model';
import { ItestAttribute, ItestInstance } from '../../dummy/dummy-data-set';
import Support from '../../support';
const expect         = chai.expect;
const expectsql      = Support.expectsql;
const current        = Support.sequelize;
const queryGenerator = current.dialect.QueryGenerator;

// Notice: [] will be replaced by dialect specific tick/quote character when there is not dialect specific expectation but only a default expectation

describe(Support.getTestDialectTeaser('SQL'), () => {
  before( () => {
    current.options.quoteIdentifiers = true;
  });

  describe('select', () => {

    it('attr,alias + where + order + limit', () => {
      const options = {
        table: 'User',
        attributes: [
          'email',
          ['first_name', 'firstName'],
        ],
        where: {
          email: 'jon.snow@gmail.com'
        },
        order: [
          ['email', 'DESC'],
        ],
        limit: 10,
        model: undefined
      };
      const expectation = {
        default: "SELECT [email], [first_name] AS [firstName] FROM [User] WHERE [User].[email] = 'jon.snow@gmail.com' ORDER BY [email] DESC LIMIT 10;",
        oracle: "SELECT email, first_name AS firstName FROM \"User\" WHERE \"User\".email = 'jon.snow@gmail.com' ORDER BY email DESC OFFSET 0 ROWS FETCH NEXT 10 ROWS ONLY;",
        mssql: "SELECT [email], [first_name] AS [firstName] FROM [User] WHERE [User].[email] = N'jon.snow@gmail.com' ORDER BY [email] DESC OFFSET 0 ROWS FETCH NEXT 10 ROWS ONLY;"
      };
      const model = options.model;

      expectsql(
        queryGenerator.selectQuery(
          options.table || model && model.getTableName(),
          options,
          options.model
        ),
        expectation
      );
    });

    it('att + order + groupedLimit', () => {
      const options = {
        table: 'User',
        attributes: [
          'email',
          ['first_name', 'firstName'],
          ['last_name', 'lastName'],
        ],
        order: [
          ['last_name', 'ASC'],
        ],
        groupedLimit: {
          limit: 3,
          on: 'companyId',
          values: [
            1,
            5,
          ]
        },
        model: undefined
      };
      const expectation = {
        default: 'SELECT [User].* FROM (' +
          [
            '(SELECT [email], [first_name] AS [firstName], [last_name] AS [lastName] FROM [User] WHERE [User].[companyId] = 1 ORDER BY [last_name] ASC' + queryGenerator.addLimitAndOffset({ limit: 3, order: ['last_name', 'ASC'] }) + ')',
            '(SELECT [email], [first_name] AS [firstName], [last_name] AS [lastName] FROM [User] WHERE [User].[companyId] = 5 ORDER BY [last_name] ASC' + queryGenerator.addLimitAndOffset({ limit: 3, order: ['last_name', 'ASC'] }) + ')',
          ].join(current.dialect.supports['UNION ALL']  ? ' UNION ALL ' : ' UNION ')
         + ') AS [User];',
        oracle: 'SELECT \"User\".* FROM (' +
          [
            '(SELECT email, first_name AS firstName, last_name AS lastName FROM \"User\" WHERE \"User\".companyId = 1 ORDER BY last_name ASC' + queryGenerator.addLimitAndOffset({ limit: 3, order: ['last_name', 'ASC'] }) + ')',
            '(SELECT email, first_name AS firstName, last_name AS lastName FROM \"User\" WHERE \"User\".companyId = 5 ORDER BY last_name ASC' + queryGenerator.addLimitAndOffset({ limit: 3, order: ['last_name', 'ASC'] }) + ')',
          ].join(current.dialect.supports['UNION ALL']  ? ' UNION ALL ' : ' UNION ')
         + ') \"User\";'
      };
      const model = options.model;

      expectsql(
        queryGenerator.selectQuery(
          options.table || model && model.getTableName(),
          options,
          options.model
        ),
        expectation
      );
    });

    (function() {
      const User = Support.sequelize.define<ItestInstance, ItestAttribute>('user', {
        id: {
          type: new DataTypes.INTEGER(),
          primaryKey: true,
          autoIncrement: true,
          field: 'id_user'
        }
      });
      const Project = Support.sequelize.define<ItestInstance, ItestAttribute>('project', {
        title: new DataTypes.STRING()
      });

      const ProjectUser = Support.sequelize.define<ItestInstance, ItestAttribute>('project_user', {
        userId: {
          type: new DataTypes.INTEGER(),
          field: 'user_id'
        },
        projectId: {
          type: new DataTypes.INTEGER(),
          field: 'project_id'
        }
      }, { timestamps: false });

      const User_Projects = User.belongsToMany(Project, { through: ProjectUser });
      Project.belongsToMany(User, { through: ProjectUser });

      it('attr + order + groupedLimit', () => {
        const options = {
          table: User.getTableName(),
          model: User,
          attributes: [
            ['id_user', 'id'],
          ],
          order: [
            ['last_name', 'ASC'],
          ],
          groupedLimit: {
            limit: 3,
            on: User_Projects,
            values: [
              1,
              5,
            ]
          }
        };
        const model = options.model;
        const expectation = {
          default: 'SELECT [user].* FROM (' +
          [
            '(SELECT [user].[id_user] AS [id], [user].[last_name] AS [subquery_order_0], [project_users].[user_id] AS [project_users.userId], [project_users].[project_id] AS [project_users.projectId]' +
            ' FROM [users] AS [user] INNER JOIN [project_users] AS [project_users] ON [user].[id_user] = [project_users].[user_id] AND [project_users].[project_id] = 1 ORDER BY [subquery_order_0] ASC'
            + (current.dialect.name === 'mssql' ? ', [user].[id_user]' : '') + queryGenerator.addLimitAndOffset({ limit: 3, order: ['last_name', 'ASC'] }) + ')',
            '(SELECT [user].[id_user] AS [id], [user].[last_name] AS [subquery_order_0], [project_users].[user_id] AS [project_users.userId], [project_users].[project_id] AS [project_users.projectId]' +
            ' FROM [users] AS [user] INNER JOIN [project_users] AS [project_users] ON [user].[id_user] = [project_users].[user_id] AND [project_users].[project_id] = 5 ORDER BY [subquery_order_0] ASC'
            + (current.dialect.name === 'mssql' ? ', [user].[id_user]' : '') + queryGenerator.addLimitAndOffset({ limit: 3, order: ['last_name', 'ASC'] }) + ')'].join(current.dialect.supports['UNION ALL'] ? ' UNION ALL ' : ' UNION ')
          + ') AS [user] ORDER BY [subquery_order_0] ASC;',
          oracle: 'SELECT \"user\".* FROM (' +
          [
            '(SELECT "user".id_user AS id, "user".last_name AS subquery_order_0, project_users.user_id AS "project_users.userId", project_users.project_id AS "project_users.projectId" FROM users "user" INNER JOIN project_users project_users' +
            ' ON "user".id_user = project_users.user_id AND project_users.project_id = 1 ORDER BY subquery_order_0 ASC, "user".id_user' + queryGenerator.addLimitAndOffset({ limit: 3, order: ['last_name', 'ASC'] }, model) + ')',
            '(SELECT "user".id_user AS id, "user".last_name AS subquery_order_0, project_users.user_id AS "project_users.userId", project_users.project_id AS "project_users.projectId" FROM users "user" INNER JOIN project_users project_users' +
            ' ON "user".id_user = project_users.user_id AND project_users.project_id = 5 ORDER BY subquery_order_0 ASC, "user".id_user' + queryGenerator.addLimitAndOffset({ limit: 3, order: ['last_name', 'ASC'] }, model) + ')',
          ].join(current.dialect.supports['UNION ALL'] ? ' UNION ALL ' : ' UNION ')
          + ') \"user\" ORDER BY subquery_order_0 ASC;'
        };

        expectsql(
          queryGenerator.selectQuery(
            options.table || model && model.getTableName(),
            options,
            options.model
          ),
          expectation
        );
      });

      it('attr + order + groupedLimit( + through)', () => {
        const options = {
          table: User.getTableName(),
          model: User,
          attributes: [
            ['id_user', 'id'],
          ],
          order: [
            ['last_name', 'ASC'],
          ],
          groupedLimit: {
            limit: 3,
            through: {
              where: {
                status: 1
              }
            },
            on: User_Projects,
            values: [
              1,
              5,
            ]
          }
        };
        const model = options.model;
        const expectation = {
          default: 'SELECT [user].* FROM (' +
          [
            '(SELECT [user].[id_user] AS [id], [user].[last_name] AS [subquery_order_0], [project_users].[user_id] AS [project_users.userId], [project_users].[project_id] AS [project_users.projectId]'
            + ' FROM [users] AS [user] INNER JOIN [project_users] AS [project_users] ON [user].[id_user] = [project_users].[user_id] AND [project_users].[project_id] = 1 AND [project_users].[status] = 1 ORDER BY [subquery_order_0] ASC'
            + (current.dialect.name === 'mssql' ? ', [user].[id_user]' : '')  + queryGenerator.addLimitAndOffset({ limit: 3, order: ['last_name', 'ASC'] }) + ')',
            '(SELECT [user].[id_user] AS [id], [user].[last_name] AS [subquery_order_0], [project_users].[user_id] AS [project_users.userId], [project_users].[project_id] AS [project_users.projectId]'
            + ' FROM [users] AS [user] INNER JOIN [project_users] AS [project_users] ON [user].[id_user] = [project_users].[user_id] AND [project_users].[project_id] = 5 AND [project_users].[status] = 1 ORDER BY [subquery_order_0] ASC'
            + (current.dialect.name === 'mssql' ? ', [user].[id_user]' : '')  + queryGenerator.addLimitAndOffset({ limit: 3, order: ['last_name', 'ASC'] }) + ')',
          ].join(current.dialect.supports['UNION ALL']  ? ' UNION ALL ' : ' UNION ')
          + ') AS [user] ORDER BY [subquery_order_0] ASC;',
          oracle: 'SELECT \"user\".* FROM (' +
          [
            '(SELECT "user".id_user AS id, "user".last_name AS subquery_order_0, project_users.user_id AS "project_users.userId", project_users.project_id AS "project_users.projectId" FROM users "user" INNER JOIN project_users project_users' +
            ' ON "user".id_user = project_users.user_id AND project_users.project_id = 1 AND project_users.status = 1 ORDER BY subquery_order_0 ASC, "user".id_user' + queryGenerator.addLimitAndOffset({ limit: 3, order: ['last_name', 'ASC'] }) + ')',
            '(SELECT "user".id_user AS id, "user".last_name AS subquery_order_0, project_users.user_id AS "project_users.userId", project_users.project_id AS "project_users.projectId" FROM users "user" INNER JOIN project_users project_users' +
            ' ON "user".id_user = project_users.user_id AND project_users.project_id = 5 AND project_users.status = 1 ORDER BY subquery_order_0 ASC, "user".id_user' + queryGenerator.addLimitAndOffset({ limit: 3, order: ['last_name', 'ASC'] }) + ')',
          ].join(current.dialect.supports['UNION ALL']  ? ' UNION ALL ' : ' UNION ')
           + ') \"user\" ORDER BY subquery_order_0 ASC;'
        };

        expectsql(
          queryGenerator.selectQuery(
            options.table || model && model.getTableName(),
            options,
            options.model
          ),
          expectation
        );
      });


      it('attr + order + where + groupedLimit', () => {
        const options = {
          table: User.getTableName(),
          model: User,
          attributes: [
            ['id_user', 'id'],
          ],
          order: [
            ['id_user', 'ASC'],
          ],
          where: {
            age: {
              $gte: 21
            }
          },
          groupedLimit: {
            limit: 3,
            on: User_Projects,
            values: [
              1,
              5,
            ]
          }
        };
        const model = options.model;
        const expectation = {
          default: 'SELECT [user].* FROM (' +
          [
            '(SELECT [user].[id_user] AS [id], [user].[id_user] AS [subquery_order_0], [project_users].[user_id] AS [project_users.userId], [project_users].[project_id] AS [project_users.projectId]'
            + ' FROM [users] AS [user] INNER JOIN [project_users] AS [project_users] ON [user].[id_user] = [project_users].[user_id] AND [project_users].[project_id] = 1 WHERE [user].[age] >= 21 ORDER BY [subquery_order_0] ASC'
            + (current.dialect.name === 'mssql' ? ', [user].[id_user]' : '') + queryGenerator.addLimitAndOffset({ limit: 3, order: ['last_name', 'ASC'] }) + ')',
            '(SELECT [user].[id_user] AS [id], [user].[id_user] AS [subquery_order_0], [project_users].[user_id] AS [project_users.userId], [project_users].[project_id] AS [project_users.projectId]'
            + ' FROM [users] AS [user] INNER JOIN [project_users] AS [project_users] ON [user].[id_user] = [project_users].[user_id] AND [project_users].[project_id] = 5 WHERE [user].[age] >= 21 ORDER BY [subquery_order_0] ASC'
            + (current.dialect.name === 'mssql' ? ', [user].[id_user]' : '')  + queryGenerator.addLimitAndOffset({ limit: 3, order: ['last_name', 'ASC'] }) + ')',
          ].join(current.dialect.supports['UNION ALL']  ? ' UNION ALL ' : ' UNION ')
           + ') AS [user] ORDER BY [subquery_order_0] ASC;',
          oracle: 'SELECT \"user\".* FROM (' +
          [
            '(SELECT "user".id_user AS id, "user".id_user AS subquery_order_0, project_users.user_id AS "project_users.userId", project_users.project_id AS "project_users.projectId" FROM users "user" INNER JOIN project_users project_users'
            + ' ON "user".id_user = project_users.user_id AND project_users.project_id = 1 WHERE "user".age >= 21 ORDER BY subquery_order_0 ASC, "user".id_user' + queryGenerator.addLimitAndOffset({ limit: 3, order: ['last_name', 'ASC'] })   + ')',
            '(SELECT "user".id_user AS id, "user".id_user AS subquery_order_0, project_users.user_id AS "project_users.userId", project_users.project_id AS "project_users.projectId" FROM users "user" INNER JOIN project_users project_users'
            + ' ON "user".id_user = project_users.user_id AND project_users.project_id = 5 WHERE "user".age >= 21 ORDER BY subquery_order_0 ASC, "user".id_user' + queryGenerator.addLimitAndOffset({ limit: 3, order: ['last_name', 'ASC'] })   + ')',
          ].join(current.dialect.supports['UNION ALL']  ? ' UNION ALL ' : ' UNION ')
          +  ') \"user\" ORDER BY subquery_order_0 ASC;'
        };

        expectsql(
          queryGenerator.selectQuery(
            options.table || model && model.getTableName(),
            options,
            options.model
          ),
          expectation
        );
      });
    }());

    (function() {
      const User = Support.sequelize.define<ItestInstance, ItestAttribute>('user', {
        id: {
          type: new DataTypes.INTEGER(),
          primaryKey: true,
          autoIncrement: true,
          field: 'id_user'
        },
        email: new DataTypes.STRING(),
        firstName: {
          type: new DataTypes.STRING(),
          field: 'first_name'
        },
        lastName: {
          type: new DataTypes.STRING(),
          field: 'last_name'
        }
      },
        {
          tableName: 'users'
        });
      const Post = Support.sequelize.define<ItestInstance, ItestAttribute>('Post', {
        title: new DataTypes.STRING(),
        userId: {
          type: new DataTypes.INTEGER(),
          field: 'user_id'
        }
      },
        {
          tableName: 'post'
        });

      const User_Posts = User.hasMany(Post, {foreignKey: 'userId', as: 'POSTS'});

      const Comment = Support.sequelize.define<ItestInstance, ItestAttribute>('Comment', {
        title: new DataTypes.STRING(),
        postId: {
          type: new DataTypes.INTEGER(),
          field: 'post_id'
        }
      },
        {
          tableName: 'comment'
        });

      const Post_Comments = Post.hasMany(Comment, {foreignKey: 'postId', as: 'COMMENTS'});

      const include = Model.prototype._validateIncludedElements({
        include: [{
          attributes: ['title'],
          association: User_Posts
        }],
        model: User
      }).include;

      it('include + attr + order + groupedLimit', () => {
        const options = {
          table: User.getTableName(),
          model: User,
          include,
          attributes: [
            ['id_user', 'id'],
            'email',
            ['first_name', 'firstName'],
            ['last_name', 'lastName'],
          ],
          order: [
            ['last_name', 'ASC'],
          ],
          groupedLimit: {
            limit: 3,
            on: 'companyId',
            values: [
              1,
              5,
            ]
          }
        };
        const expectation = {
          default: 'SELECT [user].*, [POSTS].[id] AS [POSTS.id], [POSTS].[title] AS [POSTS.title] FROM (' +
            [
              '(SELECT [id_user] AS [id], [email], [first_name] AS [firstName], [last_name] AS [lastName] FROM [users] AS [user] WHERE [user].[companyId] = 1 ORDER BY [user].[last_name] ASC'
              + queryGenerator.addLimitAndOffset({ limit: 3, order: [['last_name', 'ASC']] }) + ')',
              '(SELECT [id_user] AS [id], [email], [first_name] AS [firstName], [last_name] AS [lastName] FROM [users] AS [user] WHERE [user].[companyId] = 5 ORDER BY [user].[last_name] ASC'
              + queryGenerator.addLimitAndOffset({ limit: 3, order: [['last_name', 'ASC']] }) + ')',
            ].join(current.dialect.supports['UNION ALL']  ? ' UNION ALL ' : ' UNION ')
          +  ') AS [user] LEFT OUTER JOIN [post] AS [POSTS] ON [user].[id] = [POSTS].[user_id];',
          oracle: 'SELECT \"user\".*, POSTS.id AS "POSTS.id", POSTS.title AS "POSTS.title" FROM (' +
            [
              '(SELECT id_user AS id, email, first_name AS firstName, last_name AS lastName FROM users \"user\" WHERE \"user\".companyId = 1 ORDER BY \"user\".last_name ASC'
              + queryGenerator.addLimitAndOffset({ limit: 3, order: ['last_name', 'ASC'] }) + ')',
              '(SELECT id_user AS id, email, first_name AS firstName, last_name AS lastName FROM users \"user\" WHERE \"user\".companyId = 5 ORDER BY \"user\".last_name ASC'
              + queryGenerator.addLimitAndOffset({ limit: 3, order: ['last_name', 'ASC'] }) + ')',
            ].join(current.dialect.supports['UNION ALL']  ? ' UNION ALL ' : ' UNION ')
          +  ') \"user\" LEFT OUTER JOIN post POSTS ON \"user\".id = POSTS.user_id;'
        };
        const model = options.model;

        expectsql(
          queryGenerator.selectQuery(
            options.table || model && model.getTableName(),
            options,
            options.model
          ),
          expectation
        );
      });

      it('include + attr + order + limit + offset + subQuery', () => {
        const options = {
          table: User.getTableName(),
          model: User,
          include,
          attributes: [
            ['id_user', 'id'],
            'email',
            ['first_name', 'firstName'],
            ['last_name', 'lastName'],
          ],
          order: [['[last_name]'.replace(/\[/g, Support.sequelize.dialect.TICK_CHAR_LEFT).replace(/\]/g, Support.sequelize.dialect.TICK_CHAR_RIGHT), 'ASC']],
          limit: 30,
          offset: 10,
          hasMultiAssociation: true, //must be set only for mssql dialect here
          subQuery: true
        };
        const expectation = {
          default: 'SELECT [user].*, [POSTS].[id] AS [POSTS.id], [POSTS].[title] AS [POSTS.title] FROM (' +
            'SELECT [user].[id_user] AS [id], [user].[email], [user].[first_name] AS [firstName], [user].[last_name] AS [lastName] FROM [users] AS [user] ORDER BY [user].[last_name] ASC' +
              queryGenerator.addLimitAndOffset({ limit: 30, offset: 10, order: [['`user`.`last_name`', 'ASC']] }) +
          ') AS [user] LEFT OUTER JOIN [post] AS [POSTS] ON [user].[id_user] = [POSTS].[user_id] ORDER BY [user].[last_name] ASC;',
          oracle: 'SELECT \"user\".*, POSTS.id AS "POSTS.id", POSTS.title AS "POSTS.title" FROM (' +
            'SELECT \"user\".id_user AS id, \"user\".email, \"user\".first_name AS firstName, \"user\".last_name AS lastName FROM users \"user\" ORDER BY "user".last_name ASC' +
              queryGenerator.addLimitAndOffset({ limit: 30, offset: 10, order: [['user.last_name', 'ASC']] }) +
          ') \"user\" LEFT OUTER JOIN post POSTS ON \"user\".id_user = POSTS.user_id ORDER BY lastName ASC;'
        };
        const model = options.model;

        expectsql(
          queryGenerator.selectQuery(
            options.table || model && model.getTableName(),
            options,
            options.model
          ),
          expectation
        );
      });

      const nestedInclude = Model.prototype._validateIncludedElements({
        include: [{
          attributes: ['title'],
          association: User_Posts,
          include: [{
            attributes: ['title'],
            association: Post_Comments
          }]
        }],
        model: User
      }).include;

      it('include: nestedInclude + attr + order + groupedLimit', () => {
        const options = {
          table: User.getTableName(),
          model: User,
          include: nestedInclude,
          attributes: [
            ['id_user', 'id'],
            'email',
            ['first_name', 'firstName'],
            ['last_name', 'lastName'],
          ],
          order: [
            ['last_name', 'ASC'],
          ],
          groupedLimit: {
            limit: 3,
            on: 'companyId',
            values: [
              1,
              5,
            ]
          }
        };
        const expectation = {
          default: 'SELECT [user].*, [POSTS].[id] AS [POSTS.id], [POSTS].[title] AS [POSTS.title], [POSTS->COMMENTS].[id] AS [POSTS.COMMENTS.id], [POSTS->COMMENTS].[title] AS [POSTS.COMMENTS.title] FROM (' +
            [
              '(SELECT [id_user] AS [id], [email], [first_name] AS [firstName], [last_name] AS [lastName] FROM [users] AS [user] WHERE [user].[companyId] = 1 ORDER BY [user].[last_name] ASC'
              + queryGenerator.addLimitAndOffset({ limit: 3, order: ['last_name', 'ASC'] }) + ')',
              '(SELECT [id_user] AS [id], [email], [first_name] AS [firstName], [last_name] AS [lastName] FROM [users] AS [user] WHERE [user].[companyId] = 5 ORDER BY [user].[last_name] ASC'
              + queryGenerator.addLimitAndOffset({ limit: 3, order: ['last_name', 'ASC'] }) + ')',
            ].join(current.dialect.supports['UNION ALL']  ? ' UNION ALL ' : ' UNION ')
          +  ') AS [user] LEFT OUTER JOIN [post] AS [POSTS] ON [user].[id] = [POSTS].[user_id] LEFT OUTER JOIN [comment] AS [POSTS->COMMENTS] ON [POSTS].[id] = [POSTS->COMMENTS].[post_id];',
          oracle: 'SELECT \"user\".*, POSTS.id AS "POSTS.id", POSTS.title AS "POSTS.title", "POSTS->COMMENTS".id AS "POSTS.COMMENTS.id", "POSTS->COMMENTS".title AS "POSTS.COMMENTS.title" FROM (' +
            [
              '(SELECT id_user AS id, email, first_name AS firstName, last_name AS lastName FROM users \"user\" WHERE \"user\".companyId = 1 ORDER BY \"user\".last_name ASC'
              + queryGenerator.addLimitAndOffset({ limit: 3, order: ['last_name', 'ASC'] }) + ')',
              '(SELECT id_user AS id, email, first_name AS firstName, last_name AS lastName FROM users \"user\" WHERE \"user\".companyId = 5 ORDER BY \"user\".last_name ASC'
              + queryGenerator.addLimitAndOffset({ limit: 3, order: ['last_name', 'ASC'] }) + ')',
            ].join(current.dialect.supports['UNION ALL']  ? ' UNION ALL ' : ' UNION ')
          +  ') \"user\" LEFT OUTER JOIN post POSTS ON \"user\".id = POSTS.user_id LEFT OUTER JOIN \"comment\" "POSTS->COMMENTS" ON POSTS.id = "POSTS->COMMENTS".post_id;'
        };
        const model = options.model;

        expectsql(
          queryGenerator.selectQuery(
            options.table || model && model.getTableName(),
            options,
            options.model
          ),
          expectation
        );
      });
    })();

    it('include (left outer join)', () => {
      const User = Support.sequelize.define<ItestInstance, ItestAttribute>('User', {
        name: new DataTypes.STRING(),
        age: new DataTypes.INTEGER()
      },
        {
          freezeTableName: true
        });
      const Post = Support.sequelize.define<ItestInstance, ItestAttribute>('Post', {
        title: new DataTypes.STRING()
      },
        {
          freezeTableName: true
        });

      const User_Posts = User.hasMany(Post, {foreignKey: 'user_id'});

      expectsql(queryGenerator.selectQuery('User', {
        attributes: ['name', 'age'],
        include: Model.prototype._validateIncludedElements({
          include: [{
            attributes: ['title'],
            association: User_Posts
          }],
          model: User
        }).include,
        model: User
      }, User), {
        default: 'SELECT [User].[name], [User].[age], [Posts].[id] AS [Posts.id], [Posts].[title] AS [Posts.title] FROM [User] AS [User] LEFT OUTER JOIN [Post] AS [Posts] ON [User].[id] = [Posts].[user_id];',
        oracle: 'SELECT "User".name, "User".age, Posts.id AS "Posts.id", Posts.title AS "Posts.title" FROM "User" "User" LEFT OUTER JOIN Post Posts ON "User".id = Posts.user_id;'
      });
    });

    it('include (subQuery alias)', () => {
      const User = Support.sequelize.define<ItestInstance, ItestAttribute>('User', {
        name: new DataTypes.STRING(),
        age: new DataTypes.INTEGER()
      },
        {
          freezeTableName: true
        });
      const Post = Support.sequelize.define<ItestInstance, ItestAttribute>('Post', {
        title: new DataTypes.STRING()
      },
        {
          freezeTableName: true
        });

      const User_Posts = User.hasMany(Post, {foreignKey: 'user_id', as: 'postaliasname'});

      expectsql(queryGenerator.selectQuery('User', {
        table: User.getTableName(),
        model: User,
        attributes: ['name', 'age'],
        include: Model.prototype._validateIncludedElements({
          include: [{
            attributes: ['title'],
            association: User_Posts,
            subQuery: true,
            required: true
          }],
          as: 'User'
        }).include,
        subQuery: true
      }, User), {
        default: 'SELECT [User].*, [postaliasname].[id] AS [postaliasname.id], [postaliasname].[title] AS [postaliasname.title] FROM ' +
          '(SELECT [User].[name], [User].[age], [User].[id] AS [id] FROM [User] AS [User] ' +
          'WHERE ( SELECT [user_id] FROM [Post] AS [postaliasname] WHERE ([postaliasname].[user_id] = [User].[id]) LIMIT 1 ) IS NOT NULL) AS [User] ' +
          'INNER JOIN [Post] AS [postaliasname] ON [User].[id] = [postaliasname].[user_id];',
        mssql: 'SELECT [User].*, [postaliasname].[id] AS [postaliasname.id], [postaliasname].[title] AS [postaliasname.title] FROM ' +
          '(SELECT [User].[name], [User].[age], [User].[id] AS [id] FROM [User] AS [User] ' +
          'WHERE ( SELECT [user_id] FROM [Post] AS [postaliasname] WHERE ([postaliasname].[user_id] = [User].[id]) ORDER BY [postaliasname].[id] OFFSET 0 ROWS FETCH NEXT 1 ROWS ONLY ) IS NOT NULL) AS [User] ' +
          'INNER JOIN [Post] AS [postaliasname] ON [User].[id] = [postaliasname].[user_id];',
        oracle: 'SELECT "User".*, postaliasname.id AS "postaliasname.id", postaliasname.title AS "postaliasname.title" FROM (SELECT "User".name, "User".age, "User".id AS id FROM "User" "User" ' +
          'WHERE ( SELECT user_id FROM Post postaliasname WHERE (postaliasname.user_id = "User".id) ORDER BY postaliasname.id OFFSET 0 ROWS FETCH NEXT 1 ROWS ONLY ) IS NOT NULL) "User" ' +
          'INNER JOIN Post postaliasname ON "User".id = postaliasname.user_id;'
      });
    });

    it('properly stringify IN values as per field definition', () => {
      const User = Support.sequelize.define<ItestInstance, ItestAttribute>('User', {
        name: new DataTypes.STRING(),
        age: new DataTypes.INTEGER(),
        data: new DataTypes.BLOB()
      }, {
        freezeTableName: true
      });

      expectsql(queryGenerator.selectQuery('User', {
        attributes: ['name', 'age', 'data'],
        where: {
          data: ['123']
        }
      }, User), {
        postgres: 'SELECT "name", "age", "data" FROM "User" AS "User" WHERE "User"."data" IN (E\'\\\\x313233\');',
        mysql: 'SELECT `name`, `age`, `data` FROM `User` AS `User` WHERE `User`.`data` IN (X\'313233\');',
        oracle: 'SELECT name, age, data FROM "User" "User" WHERE "User".data IN (hextoraw(\'313233\'));',
        sqlite: 'SELECT `name`, `age`, `data` FROM `User` AS `User` WHERE `User`.`data` IN (X\'313233\');',
        mssql: 'SELECT [name], [age], [data] FROM [User] AS [User] WHERE [User].[data] IN (0x313233);'
      });
    });
  });

  describe('queryIdentifiersFalse', () => {
    before(() => {
      queryGenerator.options.quoteIdentifiers = false;
    });
    after(() => {
      queryGenerator.options.quoteIdentifiers = true;
    });

    it('*', () => {
      expectsql(queryGenerator.selectQuery('User'), {
        default: 'SELECT * FROM [User];',
        oracle: 'SELECT * FROM "User";',
        postgres: 'SELECT * FROM User;'
      });
    });

    it('with attributes', () => {
      expectsql(queryGenerator.selectQuery('User', {
        attributes: ['name', 'age']
      }), {
        default: 'SELECT [name], [age] FROM [User];',
        oracle: 'SELECT name, age FROM "User";',
        postgres: 'SELECT name, age FROM User;'
      });
    });

    it('include (left outer join)', () => {
      const User = Support.sequelize.define<ItestInstance, ItestAttribute>('User', {
        name: new DataTypes.STRING(),
        age: new DataTypes.INTEGER()
      },
        {
          freezeTableName: true
        });
      const Post = Support.sequelize.define<ItestInstance, ItestAttribute>('Post', {
        title: new DataTypes.STRING()
      },
        {
          freezeTableName: true
        });

      const User_Posts = User.hasMany(Post, {foreignKey: 'user_id'});

      expectsql(queryGenerator.selectQuery('User', {
        attributes: ['name', 'age'],
        include: Model.prototype._validateIncludedElements({
          include: [{
            attributes: ['title'],
            association: User_Posts
          }],
          model: User
        }).include,
        model: User
      }, User), {
        default: 'SELECT [User].[name], [User].[age], [Posts].[id] AS [Posts.id], [Posts].[title] AS [Posts.title] FROM [User] AS [User] LEFT OUTER JOIN [Post] AS [Posts] ON [User].[id] = [Posts].[user_id];',
        postgres: 'SELECT User.name, User.age, Posts.id AS "Posts.id", Posts.title AS "Posts.title" FROM User AS User LEFT OUTER JOIN Post AS Posts ON User.id = Posts.user_id;',
        oracle: 'SELECT "User".name, "User".age, Posts.id AS "Posts.id", Posts.title AS "Posts.title" FROM "User" "User" LEFT OUTER JOIN Post Posts ON "User".id = Posts.user_id;'
      });
    });


    it('nested include (left outer join)', () => {
      const User = Support.sequelize.define<ItestInstance, ItestAttribute>('User', {
        name: new DataTypes.STRING(),
        age: new DataTypes.INTEGER()
      },
        {
          freezeTableName: true
        });
      const Post = Support.sequelize.define<ItestInstance, ItestAttribute>('Post', {
        title: new DataTypes.STRING()
      },
        {
          freezeTableName: true
        });
      const Comment = Support.sequelize.define<ItestInstance, ItestAttribute>('Comment', {
        title: new DataTypes.STRING()
      },
        {
          freezeTableName: true
        });

      const User_Posts = User.hasMany(Post, {foreignKey: 'user_id'});
      Post.hasMany(Comment, {foreignKey: 'post_id'});

      expectsql(queryGenerator.selectQuery('User', {
        attributes: ['name', 'age'],
        include: Model.prototype._validateIncludedElements({
          include: [{
            attributes: ['title'],
            association: User_Posts,
            include: [
              {
                model: Comment
              },
            ]
          }],
          model: User
        }).include,
        model: User
      }, User), {
        default: 'SELECT [User].[name], [User].[age], [Posts].[id] AS [Posts.id], [Posts].[title] AS [Posts.title], [Posts->Comments].[id] AS [Posts.Comments.id], [Posts->Comments].[title] AS [Posts.Comments.title],' +
        ' [Posts->Comments].[createdAt] AS [Posts.Comments.createdAt], [Posts->Comments].[updatedAt] AS [Posts.Comments.updatedAt], [Posts->Comments].[post_id] AS [Posts.Comments.post_id]' +
        ' FROM [User] AS [User] LEFT OUTER JOIN [Post] AS [Posts] ON [User].[id] = [Posts].[user_id] LEFT OUTER JOIN [Comment] AS [Posts->Comments] ON [Posts].[id] = [Posts->Comments].[post_id];',
        postgres: 'SELECT User.name, User.age, Posts.id AS "Posts.id", Posts.title AS "Posts.title", "Posts->Comments".id AS "Posts.Comments.id", "Posts->Comments".title AS "Posts.Comments.title",' +
        ' "Posts->Comments".createdAt AS "Posts.Comments.createdAt", "Posts->Comments".updatedAt AS "Posts.Comments.updatedAt", "Posts->Comments".post_id AS "Posts.Comments.post_id"' +
        ' FROM User AS User LEFT OUTER JOIN Post AS Posts ON User.id = Posts.user_id LEFT OUTER JOIN Comment AS "Posts->Comments" ON Posts.id = "Posts->Comments".post_id;',
        oracle: 'SELECT "User".name, "User".age, Posts.id AS "Posts.id", Posts.title AS "Posts.title", "Posts->Comments".id AS "Posts.Comments.id", "Posts->Comments".title AS "Posts.Comments.title",' +
        ' "Posts->Comments".createdAt AS "Posts.Comments.createdAt", "Posts->Comments".updatedAt AS "Posts.Comments.updatedAt", "Posts->Comments".post_id AS "Posts.Comments.post_id"' +
        ' FROM "User" "User" LEFT OUTER JOIN Post Posts ON "User".id = Posts.user_id LEFT OUTER JOIN "Comment" "Posts->Comments" ON Posts.id = "Posts->Comments".post_id;'
      });
    });

  });

  describe('raw query', () => {
    it('raw replacements for where', () => {
      expect(() => {
        queryGenerator.selectQuery('User', {
          attributes: ['*'],
          where: ['name IN (?)', [1, 'test', 3, 'derp']]
        });
      }).to.throw(Error, 'Support for literal replacements in the `where` object has been removed.');
    });

    it('raw replacements for nested where', () => {
      expect(() => {
        queryGenerator.selectQuery('User', {
          attributes: ['*'],
          where: [['name IN (?)', [1, 'test', 3, 'derp']]]
        });
      }).to.throw(Error, 'Support for literal replacements in the `where` object has been removed.');
    });

    it('raw replacements for having', () => {
      expect(() => {
        queryGenerator.selectQuery('User', {
          attributes: ['*'],
          having: ['name IN (?)', [1, 'test', 3, 'derp']]
        });
      }).to.throw(Error, 'Support for literal replacements in the `where` object has been removed.');
    });

    it('raw replacements for nested having', () => {
      expect(() => {
        queryGenerator.selectQuery('User', {
          attributes: ['*'],
          having: [['name IN (?)', [1, 'test', 3, 'derp']]]
        });
      }).to.throw(Error, 'Support for literal replacements in the `where` object has been removed.');
    });

    it('raw string from where', () => {
      expect(() => {
        queryGenerator.selectQuery('User', {
          attributes: ['*'],
          where: 'name = \'something\''
        });
      }).to.throw(Error, 'Support for `{where: \'raw query\'}` has been removed.');
    });

    it('raw string from having', () => {
      expect(() => {
        queryGenerator.selectQuery('User', {
          attributes: ['*'],
          having: 'name = \'something\''
        });
      }).to.throw(Error, 'Support for `{where: \'raw query\'}` has been removed.');
    });
  });
});
