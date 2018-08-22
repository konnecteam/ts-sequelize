'use strict';

import * as chai from 'chai';
import { Model, Sequelize } from '../../../../index';
import DataTypes from '../../../../lib/data-types';
import { ItestAttribute, ItestInstance } from '../../../dummy/dummy-data-set';
import Support from '../../support';
const expect = chai.expect;
const dialect = Support.getTestDialect();
const Promise = Sequelize.Promise;
const current = Support.sequelize;

describe(Support.getTestDialectTeaser('Model'), () => {
  let User : Model<ItestInstance, ItestAttribute>;
  let Task : Model<ItestInstance, ItestAttribute>;
  let ModelUnderTest : Model<ItestInstance, ItestAttribute>;
  let Comment : Model<ItestInstance, ItestAttribute>;
  describe('attributes', () => {
    describe('field', () => {
      beforeEach(function() {
        const queryInterface = current.getQueryInterface();

        User = current.define<ItestInstance, ItestAttribute>('user', {
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
          },
          taskCount: {
            type: new DataTypes.INTEGER(),
            field: 'task_count',
            defaultValue: 0,
            allowNull: false
          }
        }, {
          tableName: 'users',
          timestamps: false
        });

        Task = current.define<ItestInstance, ItestAttribute>('task', {
          id: {
            type: new DataTypes.INTEGER(),
            allowNull: false,
            primaryKey: true,
            autoIncrement: true,
            field: 'taskId'
          },
          title: {
            type: new DataTypes.STRING(),
            field: 'name'
          }
        }, {
          tableName: 'tasks',
          timestamps: false
        });

        Comment = current.define<ItestInstance, ItestAttribute>('comment', {
          id: {
            type: new DataTypes.INTEGER(),
            allowNull: false,
            primaryKey: true,
            autoIncrement: true,
            field: 'commentId'
          },
          text: { type: new DataTypes.STRING(), field: 'comment_text' },
          notes: { type: new DataTypes.STRING(), field: 'notes' },
          likes: { type: new DataTypes.INTEGER(), field: 'like_count' },
          createdAt: { type: new DataTypes.DATE(), field: 'created_at', allowNull: false },
          updatedAt: { type: new DataTypes.DATE(), field: 'updated_at', allowNull: false }
        }, {
          tableName: 'comments',
          timestamps: true
        });

        User.hasMany(Task, {
          foreignKey: 'user_id'
        });
        Task.belongsTo(User, {
          foreignKey: 'user_id'
        });
        Task.hasMany(Comment, {
          foreignKey: 'task_id'
        });
        Comment.belongsTo(Task, {
          foreignKey: 'task_id'
        });

        User.belongsToMany(Comment, {
          foreignKey: 'userId',
          otherKey: 'commentId',
          through: 'userComments'
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
            },
            task_count: {
              type: new DataTypes.INTEGER(),
              allowNull: false,
              defaultValue: 0
            }
          }),
          queryInterface.createTable('tasks', {
            taskId: {
              type: new DataTypes.INTEGER(),
              allowNull: false,
              primaryKey: true,
              autoIncrement: true
            },
            user_id: {
              type: new DataTypes.INTEGER()
            },
            name: {
              type: new DataTypes.STRING()
            }
          }),
          queryInterface.createTable('comments', {
            commentId: {
              type: new DataTypes.INTEGER(),
              allowNull: false,
              primaryKey: true,
              autoIncrement: true
            },
            task_id: {
              type: new DataTypes.INTEGER()
            },
            comment_text: {
              type: new DataTypes.STRING()
            },
            notes: {
              type: new DataTypes.STRING()
            },
            like_count: {
              type: new DataTypes.INTEGER()
            },
            created_at: {
              type: new DataTypes.DATE(),
              allowNull: false
            },
            updated_at: {
              type: new DataTypes.DATE()
            }
          }),
          queryInterface.createTable('userComments', {
            commentId: {
              type: new DataTypes.INTEGER()
            },
            userId: {
              type: new DataTypes.INTEGER()
            }
          }),
        ]);
      });

      describe('primaryKey', () => {
        describe('in combination with allowNull', () => {
          beforeEach(function() {
            ModelUnderTest = current.define<ItestInstance, ItestAttribute>('ModelUnderTest', {
              identifier: {
                primaryKey: true,
                type: new DataTypes.STRING(),
                allowNull: false
              }
            });

            return ModelUnderTest.sync({ force: true });
          });

          it('sets the column to not allow null', function() {
            return ModelUnderTest
              .describe()
              .then(fields => {
                expect(fields.identifier).to.include({ allowNull: false });
              });
          });
        });

        it('should support instance.destroy()', function() {
          return User.create().then(user => {
            return user.destroy();
          });
        });

        it('should support Model.destroy()', function() {
          return User.create().bind(this).then(function(user) {
            return User.destroy({
              where: {
                id: user.get('id')
              }
            });
          });
        });
      });

      describe('field and attribute name is the same', () => {
        beforeEach(function() {
          return Comment.bulkCreate([
            { notes: 'Number one'},
            { notes: 'Number two'},
          ]);
        });

        it('bulkCreate should work', function() {
          return Comment.findAll().then(comments => {
            expect(comments[0].notes).to.equal('Number one');
            expect(comments[1].notes).to.equal('Number two');
          });
        });

        it('find with where should work', function() {
          return Comment.findAll({ where: { notes: 'Number one' }}).then(comments => {
            expect(comments).to.have.length(1);
            expect(comments[0].notes).to.equal('Number one');
          });
        });

        it('reload should work', function() {
          return Comment.findById(1).then(comment => {
            return comment.reload();
          });
        });

        it('save should work', function() {
          return Comment.create({ notes: 'my note' }).then(comment => {
            comment.notes = 'new note';
            return comment.save();
          }).then(comment => {
            return comment.reload();
          }).then(comment => {
            expect(comment.notes).to.equal('new note');
          });
        });
      });

      it('increment should work', function() {
        return Comment.destroy({ truncate: true })
          .then(() => Comment.create({ note: 'oh boy, here I go again', likes: 23 }))
          .then(comment => comment.increment('likes'))
          .then(comment => comment.reload())
          .then(comment => {
            expect(comment.likes).to.be.equal(24);
          });
      });

      it('decrement should work', function() {
        return Comment.destroy({ truncate: true })
          .then(() => Comment.create({ note: 'oh boy, here I go again', likes: 23 }))
          .then(comment => comment.decrement('likes'))
          .then(comment => comment.reload())
          .then(comment => {
            expect(comment.likes).to.be.equal(22);
          });
      });

      it('sum should work', function() {
        return Comment.destroy({ truncate: true })
          .then(() => Comment.create({ note: 'oh boy, here I go again', likes: 23 }))
          .then(() => Comment.sum('likes'))
          .then(likes => {
            expect(likes).to.be.equal(23);
          });
      });

      it('should create, fetch and update with alternative field names from a simple model', function() {
        return User.create({
          name: 'Foobar'
        }).then(() => {
          return User.find({
            limit: 1
          });
        }).then(user => {
          expect(user.get('name')).to.equal('Foobar');
          return user.updateAttributes({
            name: 'Barfoo'
          });
        }).then(() => {
          return User.find({
            limit: 1
          });
        }).then(user => {
          expect(user.get('name')).to.equal('Barfoo');
        });
      });

      it('should bulk update', function() {
        const Entity = current.define<ItestInstance, ItestAttribute>('Entity', {
          strField: {type: new DataTypes.STRING(), field: 'str_field'}
        });

        return current.sync({force: true}).then(() => {
          return Entity.create({strField: 'foo'});
        }).then(() => {
          return Entity.update(
            {strField: 'bar'},
            {where: {strField: 'foo'}}
          );
        }).then(() => {
          return Entity.findOne({
            where: {
              strField: 'bar'
            }
          }).then(entity => {
            expect(entity).to.be.ok;
            expect(entity.get('strField')).to.equal('bar');
          });
        });
      });

      it('should not contain the field properties after create', function() {
        const _Model = current.define<ItestInstance, ItestAttribute>('test', {
          id: {
            type: new DataTypes.INTEGER(),
            field: 'test_id',
            autoIncrement: true,
            primaryKey: true,
            validate: {
              min: 1
            }
          },
          title: {
            allowNull: false,
            type: new DataTypes.STRING(255),
            field: 'test_title'
          }
        }, {
          timestamps: true,
          underscored: true,
          freezeTableName: true
        });

        return _Model.sync({force: true}).then(() => {
          return _Model.create({title: 'test'}).then(data => {
            expect(data.get('test_title')).to.be.an('undefined');
            expect(data.get('test_id')).to.be.an('undefined');
          });
        });
      });

      it('should make the aliased auto incremented primary key available after create', function() {
        return User.create({
          name: 'Barfoo'
        }).then(user => {
          expect(user.get('id')).to.be.ok;
        });
      });

      it('should work with where on includes for find', function() {
        return User.create({
          name: 'Barfoo'
        }).then(user => {
          return user.createLinkedData<ItestInstance, ItestAttribute>('task', {
            title: 'DatDo'
          });
        }).then(task => {
          return task.createLinkedData<ItestInstance, ItestAttribute>('comment', {
            text: 'Comment'
          });
        }).then(() => {
          return Task.find({
            include: [
              {model: Comment},
              {model: User},
            ],
            where: {title: 'DatDo'}
          });
        }).then(task => {
          expect(task.get('title')).to.equal('DatDo');
          expect(task.get('comments')[0].get('text')).to.equal('Comment');
          expect(task.get('user')).to.be.ok;
        });
      });

      it('should work with where on includes for findAll', function() {
        return User.create({
          name: 'Foobar'
        }).then(user => {
          return user.createLinkedData<ItestInstance, ItestAttribute>('task', {
            title: 'DoDat'
          });
        }).then(task => {
          return task.createLinkedData<ItestInstance, ItestAttribute>('comment', {
            text: 'Comment'
          });
        }).then(() => {
          return User.findAll({
            include: [
              {model: Task, where: {title: 'DoDat'}, include: [
                {model: Comment}]},
            ]
          });
        }).then(users => {
          users.forEach(user => {
            expect(user.get('name')).to.be.ok;
            expect(user.get('tasks')[0].get('title')).to.equal('DoDat');
            expect(user.get('tasks')[0].get('comments')).to.be.ok;
          });
        });
      });

      it('should work with increment', function() {
        return User.create().then(user => {
          return user.increment('taskCount');
        });
      });

      it('should work with a simple where', function() {
        return User.create({
          name: 'Foobar'
        }).then(() => {
          return User.find({
            where: {
              name: 'Foobar'
            }
          });
        }).then(user => {
          expect(user).to.be.ok;
        });
      });

      it('should work with a where or', function() {
        return User.create({
          name: 'Foobar'
        }).then(() => {
          return User.find({
            where: current.or({
              name: 'Foobar'
            }, {
              name: 'Lollerskates'
            })
          });
        }).then(user => {
          expect(user).to.be.ok;
        });
      });

      it('should work with bulkCreate and findAll', function() {
        return User.bulkCreate([{
          name: 'Abc'
        }, {
          name: 'Bcd'
        }, {
          name: 'Cde'
        }]).then(() => {
          return User.findAll();
        }).then(users => {
          users.forEach(user => {
            expect(['Abc', 'Bcd', 'Cde'].indexOf(user.get('name')) !== -1).to.be.true;
          });
        });
      });

      it('should support renaming of sequelize method fields', function() {
        const Test = current.define<ItestInstance, ItestAttribute>('test', {
          someProperty: new DataTypes.VIRTUAL() // Since we specify the AS part as a part of the literal string, not with sequelize syntax, we have to tell sequelize about the field
        });

        return current.sync({ force: true }).then(() => {
          return Test.create({});
        }).then(() => {
          let findAttributes;
          if (dialect === 'mssql') {
            findAttributes = [
              Sequelize.literal('CAST(CASE WHEN EXISTS(SELECT 1) THEN 1 ELSE 0 END AS BIT) AS "someProperty"'),
              [Sequelize.literal('CAST(CASE WHEN EXISTS(SELECT 1) THEN 1 ELSE 0 END AS BIT)'), 'someProperty2'],
            ];
          } else if (dialect === 'oracle') {
            findAttributes = [
              Sequelize.literal('CAST(CASE WHEN EXISTS(SELECT 1 FROM DUAL) THEN 1 ELSE 0 END AS NUMBER) AS "someProperty"'),
              [Sequelize.literal('CAST(CASE WHEN EXISTS(SELECT 1 FROM DUAL) THEN 1 ELSE 0 END AS NUMBER)'), 'someProperty2'],
            ];
          } else {
            findAttributes = [
              Sequelize.literal('EXISTS(SELECT 1) AS "someProperty"'),
              [Sequelize.literal('EXISTS(SELECT 1)'), 'someProperty2'],
            ];
          }

          return Test.findAll({
            attributes: findAttributes
          });

        }).then(tests => {
          expect(tests[0].get('someProperty')).to.be.ok;
          expect(tests[0].get('someProperty2')).to.be.ok;
        });
      });

      it('should sync foreign keys with custom field names', function() {
        return current.sync({ force: true })
          .then(() => {
            const attrs = Task.tableAttributes;
            expect(attrs.user_id.references.model).to.equal('users');
            expect(attrs.user_id.references.key).to.equal('userId');
          });
      });

      it('should find the value of an attribute with a custom field name', function() {
        return User.create({ name: 'test user' })
          .then(() => {
            return User.find({ where: { name: 'test user' } });
          })
          .then(user => {
            expect(user.name).to.equal('test user');
          });
      });

      it('field names that are the same as property names should create, update, and read correctly', function() {
        return Comment.create({
          notes: 'Foobar'
        }).then(() => {
          return Comment.find({
            limit: 1
          });
        }).then(comment => {
          expect(comment.get('notes')).to.equal('Foobar');
          return comment.updateAttributes({
            notes: 'Barfoo'
          });
        }).then(() => {
          return Comment.find({
            limit: 1
          });
        }).then(comment => {
          expect(comment.get('notes')).to.equal('Barfoo');
        });
      });

      it('should work with a belongsTo association getter', function() {
        let userA : ItestInstance;
        const userId = Math.floor(Math.random() * 100000);
        return Promise.join(
          User.create({
            id: userId
          }),
          Task.create({
            user_id: userId
          })
        ).spread((user, task) => {
          userA = user;
          return task.getLinkedData<ItestInstance, ItestAttribute>('user');
        }).then(userB => {
          expect(userA.get('id')).to.equal(userB.get('id'));
          expect(userA.get('id')).to.equal(userId);
          expect(userB.get('id')).to.equal(userId);
        });
      });

      it('should work with paranoid instance.destroy()', function() {
        User = current.define<ItestInstance, ItestAttribute>('User', {
          deletedAt: {
            type: new DataTypes.DATE(),
            field: 'deleted_at'
          }
        }, {
          timestamps: true,
          paranoid: true
        });

        return User.sync({force: true})
          .bind(this)
          .then(() => {
            return User.create();
          })
          .then(user => {
            return user.destroy();
          })
          .then(function() {
            return User.findAll();
          })
          .then(users => {
            expect(users.length).to.equal(0);
          });
      });

      it('should work with paranoid Model.destroy()', function() {
        User = current.define<ItestInstance, ItestAttribute>('User', {
          deletedAt: {
            type: new DataTypes.DATE(),
            field: 'deleted_at'
          }
        }, {
          timestamps: true,
          paranoid: true
        });

        return User.sync({force: true}).then(() => {
          return User.create().then(user => {
            return User.destroy({where: {id: user.get('id')}});
          }).then(() => {
            return User.findAll().then(users => {
              expect(users.length).to.equal(0);
            });
          });
        });
      });

      it('should work with `belongsToMany` association `count`', function() {
        return User.create({
          name: 'John'
        })
          .then(user => user.countLinkedData('comment'))
          .then(commentCount => expect(commentCount).to.equal(0));
      });

      it('should work with `hasMany` association `count`', function() {
        return User.create({
          name: 'John'
        })
          .then(user => user.countLinkedData('task'))
          .then(taskCount => expect(taskCount).to.equal(0));
      });
    });
  });
});
