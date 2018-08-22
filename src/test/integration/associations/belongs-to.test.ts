'use strict';

import * as chai from 'chai';
import * as sinon from 'sinon';
import {Sequelize} from '../../../index';
import DataTypes from '../../../lib/data-types';
import { ItestAttribute, ItestInstance } from '../../dummy/dummy-data-set';
import Support from '../support';
const expect = chai.expect;
const Promise = Sequelize.Promise;
const current = Support.sequelize;
const dialect = Support.getTestDialect();

describe(Support.getTestDialectTeaser('BelongsTo'), () => {
  describe('Model.associations', () => {
    it('should store all assocations when associting to the same table multiple times', function() {
      const User = current.define<ItestInstance, ItestAttribute>('User', {});
      const Group = current.define<ItestInstance, ItestAttribute>('Group', {});

      Group.belongsTo(User);
      Group.belongsTo(User, { foreignKey: 'primaryGroupId', as: 'primaryUsers' });
      Group.belongsTo(User, { foreignKey: 'secondaryGroupId', as: 'secondaryUsers' });

      expect(
        Object.keys(Group.associations)
      ).to.deep.equal(['User', 'primaryUsers', 'secondaryUsers']);
    });
  });

  describe('get', () => {
    describe('multiple', () => {
      it('should fetch associations for multiple instances', function() {
        const User = current.define<ItestInstance, ItestAttribute>('User', {});
        const Task = current.define<ItestInstance, ItestAttribute>('Task', {});

        const Task_User = Task.belongsTo<ItestInstance, ItestAttribute>(User, {as: 'user'});

        return current.sync({force: true}).then(() => {
          return Promise.join(
            Task.create({
              id: 1,
              user: {id: 1}
            }, {
              include: [Task_User]
            }),
            Task.create({
              id: 2,
              user: {id: 2}
            }, {
              include: [Task_User]
            }),
            Task.create({
              id: 3
            })
          );
        }).then(tasks => {
          return Task_User.get(tasks).then(result => {
            expect(result[tasks[0].id].id).to.equal(tasks[0].user.id);
            expect(result[tasks[1].id].id).to.equal(tasks[1].user.id);
            expect(result[tasks[2].id]).to.be.undefined;
          });
        });
      });
    });
  });

  describe('getAssociation', () => {
    if (current.dialect.supports.transactions) {
      it('supports transactions', function() {
        return Support.prepareTransactionTest(current).then(sequelize => {
          const User = (sequelize as Sequelize).define<ItestInstance, ItestAttribute>('User', { username: new DataTypes.STRING() });
          const Group = (sequelize as Sequelize).define<ItestInstance, ItestAttribute>('Group', { name: new DataTypes.STRING() });

          Group.belongsTo(User);

          return sequelize.sync({ force: true }).then(() => {
            return User.create({ username: 'foo' }).then(user => {
              return Group.create({ name: 'bar' }).then(group => {
                return sequelize.transaction().then(t => {
                  return group.setLinkedData('User', user, { transaction: t }).then(() => {
                    return Group.all().then(groups => {
                      return groups[0].getLinkedData<ItestInstance, ItestAttribute>('User').then(associatedUser => {
                        expect(associatedUser).to.be.null;
                        return Group.all({ transaction: t }).then(_groups => {
                          return _groups[0].getLinkedData<ItestInstance, ItestAttribute>('User', { transaction: t }).then(_associatedUser => {
                            expect(_associatedUser).to.be.not.null;
                            return t.rollback();
                          });
                        });
                      });
                    });
                  });
                });
              });
            });
          });
        });
      });
    }

    if (current.dialect.name !== 'oracle') {
    //Oracle doesn't support column names non quoted by "
      it('should be able to handle a where object that\'s a first class citizen.', function() {
        const User = current.define<ItestInstance, ItestAttribute>('UserXYZ', { username: new DataTypes.STRING(), gender: new DataTypes.STRING() });
        const Task = current.define<ItestInstance, ItestAttribute>('TaskXYZ', { title: new DataTypes.STRING(), status: new DataTypes.STRING() });

        Task.belongsTo(User);

        return User.sync({ force: true }).then(() => {
          // Can't use Promise.all cause of foreign key references
          return Task.sync({ force: true });
        }).then(() => {
          return Promise.all([
            User.create({ username: 'foo', gender: 'male' }),
            User.create({ username: 'bar', gender: 'female' }),
            Task.create({ title: 'task', status: 'inactive' }),
          ]);
        }).spread((userA, userB, task) => {
          return task.setLinkedData('UserXYZ', userA).then(() => {
            return task.getLinkedData('UserXYZ', {where: {gender: 'female'}});
          });
        }).then(user => {
          expect(user).to.be.null;
        });
      });
    }

    it('supports schemas', function() {
      const User = current.define<ItestInstance, ItestAttribute>('UserXYZ', { username: new DataTypes.STRING(), gender: new DataTypes.STRING() }).schema('archive');
      const Task = current.define<ItestInstance, ItestAttribute>('TaskXYZ', { title: new DataTypes.STRING(), status: new DataTypes.STRING() }).schema('archive');

      Task.belongsTo(User);

      return current.dropAllSchemas().then(() => {
        return current.createSchema('archive');
      }).then(() => {
        return User.sync({force: true });
      }).then(() => {
        return Task.sync({force: true });
      }).then(() => {
        return Promise.all([
          User.create({ username: 'foo', gender: 'male' }),
          Task.create({ title: 'task', status: 'inactive' }),
        ]);
      }).spread((user, task) => {
        return task.setLinkedData('UserXYZ', user).then(() => {
          return task.getLinkedData('UserXYZ');
        });
      }).then(user => {
        expect(user).to.be.ok;
        return current.dropSchema('archive').then(() => {
          return current.showAllSchemas().then(schemas => {
            if (dialect === 'postgres' || dialect === 'mssql') {
              expect(schemas).to.be.empty;
            }
          });
        });
      });
    });

    it('supports schemas when defining custom foreign key attribute #9029', function() {
      const User = current.define<ItestInstance, ItestAttribute>('UserXYZ', {
          uid: {
            type: new DataTypes.INTEGER(),
            primaryKey: true,
            autoIncrement: true,
            allowNull: false
          }
        }).schema('archive');
      const Task = current.define<ItestInstance, ItestAttribute>('TaskXYZ', {
          user_id: {
            type: new DataTypes.INTEGER(),
            references: { model: User, key: 'uid' }
          }
        }).schema('archive');

      Task.belongsTo(User, { foreignKey: 'user_id'});

      return current.dropAllSchemas().then(() => {
        return current.createSchema('archive');
      }).then(() => {
        return User.sync({force: true });
      }).then(() => {
        return Task.sync({force: true });
      }).then(() => {
        return User.create({});
      }).then(user => {
        return Task.create({}).then(task => {
          return task.setLinkedData('UserXYZ', user).then(() => {
            return task.getLinkedData('UserXYZ');
          });
        });
      }).then(user => {
        expect(user).to.be.ok;
      });
    });
  });

  describe('setAssociation', () => {

    if (current.dialect.supports.transactions) {
      it('supports transactions', function() {
        return Support.prepareTransactionTest(current).then(sequelize => {
          const User = (sequelize as Sequelize).define<ItestInstance, ItestAttribute>('User', { username: new DataTypes.STRING() });
          const Group = (sequelize as Sequelize).define<ItestInstance, ItestAttribute>('Group', { name: new DataTypes.STRING() });

          Group.belongsTo(User);

          return sequelize.sync({ force: true }).then(() => {
            return User.create({ username: 'foo' }).then(user => {
              return Group.create({ name: 'bar' }).then(group => {
                return sequelize.transaction().then(t => {
                  return group.setLinkedData('User', user, { transaction: t }).then(() => {
                    return Group.all().then(groups => {
                      return groups[0].getLinkedData<ItestInstance, ItestAttribute>('User').then(associatedUser => {
                        expect(associatedUser).to.be.null;
                        return t.rollback();
                      });
                    });
                  });
                });
              });
            });
          });
        });
      });
    }

    it('can set the association with declared primary keys...', function() {
      const User = current.define<ItestInstance, ItestAttribute>('UserXYZ', { user_id: {type: new DataTypes.INTEGER(), primaryKey: true }, username: new DataTypes.STRING() });
      const Task = current.define<ItestInstance, ItestAttribute>('TaskXYZ', { task_id: {type: new DataTypes.INTEGER(), primaryKey: true }, title: new DataTypes.STRING() });

      Task.belongsTo(User, { foreignKey: 'user_id' });

      return current.sync({ force: true }).then(() => {
        return User.create({ user_id: 1, username: 'foo' }).then(user => {
          return Task.create({ task_id: 1, title: 'task' }).then(task => {
            return task.setLinkedData('UserXYZ', user).then(() => {
              return task.getLinkedData('UserXYZ').then(_user => {
                expect(_user).not.to.be.null;

                return task.setLinkedData('UserXYZ', null).then(() => {
                  return task.getLinkedData('UserXYZ').then(user_ => {
                    expect(user_).to.be.null;
                  });
                });
              });
            });
          });
        });
      });
    });

    it('clears the association if null is passed', function() {
      const User = current.define<ItestInstance, ItestAttribute>('UserXYZ', { username: new DataTypes.STRING() });
      const Task = current.define<ItestInstance, ItestAttribute>('TaskXYZ', { title: new DataTypes.STRING() });

      Task.belongsTo(User);

      return current.sync({ force: true }).then(() => {
        return User.create({ username: 'foo' }).then(user => {
          return Task.create({ title: 'task' }).then(task => {
            return task.setLinkedData('UserXYZ', user).then(() => {
              return task.getLinkedData('UserXYZ').then(_user => {
                expect(_user).not.to.be.null;

                return task.setLinkedData('UserXYZ', null).then(() => {
                  return task.getLinkedData('UserXYZ').then(user_ => {
                    expect(user_).to.be.null;
                  });
                });
              });
            });
          });
        });
      });
    });

    it('should throw a ForeignKeyConstraintError if the associated record does not exist', function() {
      const User = current.define<ItestInstance, ItestAttribute>('UserXYZ', { username: new DataTypes.STRING() });
      const Task = current.define<ItestInstance, ItestAttribute>('TaskXYZ', { title: new DataTypes.STRING() });

      Task.belongsTo(User);

      return current.sync({ force: true }).then(() => {
        return expect(Task.create({ title: 'task', UserXYZId: 5 })).to.be.rejectedWith(Sequelize.ForeignKeyConstraintError).then(() => {
          return Task.create({ title: 'task' }).then(task => {
            return expect(Task.update({ title: 'taskUpdate', UserXYZId: 5 }, { where: { id: task.id } })).to.be.rejectedWith(Sequelize.ForeignKeyConstraintError);
          });
        });
      });
    });

    it('supports passing the primary key instead of an object', function() {
      const User = current.define<ItestInstance, ItestAttribute>('UserXYZ', { username: new DataTypes.STRING() });
      const Task = current.define<ItestInstance, ItestAttribute>('TaskXYZ', { title: new DataTypes.STRING() });

      Task.belongsTo(User);

      return current.sync({ force: true }).then(() => {
        return User.create({ id: 15, username: 'jansemand' }).then(user => {
          return Task.create({}).then(task => {
            return task.setLinkedData('UserXYZ', user.id).then(() => {
              return task.getLinkedData<ItestInstance, ItestAttribute>('UserXYZ').then(_user => {
                expect(_user.username).to.equal('jansemand');
              });
            });
          });
        });
      });
    });

    it('should support logging', function() {
      const User = current.define<ItestInstance, ItestAttribute>('UserXYZ', { username: new DataTypes.STRING() });
      const Task = current.define<ItestInstance, ItestAttribute>('TaskXYZ', { title: new DataTypes.STRING() });
      const spy = sinon.spy();

      Task.belongsTo(User);

      return current.sync({ force: true }).then(() => {
        return User.create().then(user => {
          return Task.create({}).then(task => {
            return task.setLinkedData('UserXYZ', user, {logging: spy}).then(() => {
              expect(spy.called).to.be.ok;
            });
          });
        });
      });
    });

    it('should not clobber atributes', function() {
      const Comment = current.define<ItestInstance, ItestAttribute>('comment', {
        text: new DataTypes.STRING()
      });

      const Post = current.define<ItestInstance, ItestAttribute>('post', {
        title: new DataTypes.STRING()
      });

      Post.hasOne(Comment);
      Comment.belongsTo(Post);

      return current.sync().then(() => {
        return Post.create({
          title: 'Post title'
        }).then(post => {
          return Comment.create({
            text: 'OLD VALUE'
          }).then(comment => {
            comment.text = 'UPDATED VALUE';
            return comment.setLinkedData('post', post).then(() => {
              expect(comment.text).to.equal('UPDATED VALUE');
            });
          });
        });
      });
    });

    it('should set the foreign key value without saving when using save: false', function() {
      const Comment = current.define<ItestInstance, ItestAttribute>('comment', {
        text: new DataTypes.STRING()
      });

      const Post = current.define<ItestInstance, ItestAttribute>('post', {
        title: new DataTypes.STRING()
      });

      Post.hasMany(Comment, {foreignKey: 'post_id'});
      Comment.belongsTo(Post, {foreignKey: 'post_id'});

      return current.sync({force: true}).then(() => {
        return Promise.join(
          Post.create(),
          Comment.create()
        ).spread((post, comment) => {
          expect(comment.get('post_id')).not.to.be.ok;

          const setter = comment.setLinkedData('post', post, {save: false});

          expect(setter).to.be.undefined;
          expect(comment.get('post_id')).to.equal(post.get('id'));
          expect(comment.changed('post_id')).to.be.true;
        });
      });
    });

    it('supports setting same association twice', function() {
      const Home = current.define<ItestInstance, ItestAttribute>('home', {});
      const User = current.define<ItestInstance, ItestAttribute>('user');
      let home : ItestInstance;
      let user : ItestInstance;

      Home.belongsTo(User);

      return current.sync({ force: true }).bind({}).then(() => {
        return Promise.all([
          Home.create(),
          User.create(),
        ]);
      }).spread(function(_home, _user) {
        home = _home;
        user = _user;
        return home.setLinkedData('user', user);
      }).then(() => {
        return home.setLinkedData('user', user);
      }).then(function() {
        return expect(home.getLinkedData<ItestInstance, ItestAttribute>('user')).to.eventually.have.property('id', user.get('id'));
      });
    });
  });

  describe('createAssociation', () => {
    it('creates an associated model instance', function() {
      const User = current.define<ItestInstance, ItestAttribute>('User', { username: new DataTypes.STRING() });
      const Task = current.define<ItestInstance, ItestAttribute>('Task', { title: new DataTypes.STRING() });

      Task.belongsTo(User);

      return current.sync({ force: true }).then(() => {
        return Task.create({ title: 'task' }).then(task => {
          return task.createLinkedData<ItestInstance, ItestAttribute>('User', { username: 'bob' }).then(() => {
            return task.getLinkedData<ItestInstance, ItestAttribute>('User').then(user => {
              expect(user).not.to.be.null;
              expect(user.username).to.equal('bob');
            });
          });
        });
      });
    });

    if (current.dialect.supports.transactions) {
      it('supports transactions', function() {
        return Support.prepareTransactionTest(current).then(sequelize => {
          const User = (sequelize as Sequelize).define<ItestInstance, ItestAttribute>('User', { username: new DataTypes.STRING() });
          const Group = (sequelize as Sequelize).define<ItestInstance, ItestAttribute>('Group', { name: new DataTypes.STRING() });

          Group.belongsTo(User);

          return sequelize.sync({ force: true }).then(() => {
            return Group.create({ name: 'bar' }).then(group => {
              return sequelize.transaction().then(t => {
                return group.createLinkedData<ItestInstance, ItestAttribute>('User', { username: 'foo' }, { transaction: t }).then(() => {
                  return group.getLinkedData<ItestInstance, ItestAttribute>('User').then(user => {
                    expect(user).to.be.null;

                    return group.getLinkedData<ItestInstance, ItestAttribute>('User', { transaction: t }).then(_user => {
                      expect(_user).not.to.be.null;

                      return t.rollback();
                    });
                  });
                });
              });
            });
          });
        });
      });
    }
  });

  describe('foreign key', () => {
    it('should lowercase foreign keys when using underscored', function() {
      const User = current.define<ItestInstance, ItestAttribute>('User', { username: new DataTypes.STRING() }, { underscored: true });
      const Account = current.define<ItestInstance, ItestAttribute>('Account', { name: new DataTypes.STRING() }, { underscored: true });

      User.belongsTo(Account);

      expect(User.rawAttributes.AccountId).to.exist;
      expect(User.rawAttributes.AccountId.field).to.equal('account_id');
    });

    it('should use model name when using camelcase', function() {
      const User = current.define<ItestInstance, ItestAttribute>('User', { username: new DataTypes.STRING() }, { underscored: false });
      const Account = current.define<ItestInstance, ItestAttribute>('Account', { name: new DataTypes.STRING() }, { underscored: false });

      User.belongsTo(Account);

      expect(User.rawAttributes.AccountId).to.exist;
      expect(User.rawAttributes.AccountId.field).to.equal('AccountId');
    });

    it('should support specifying the field of a foreign key', function() {
      const User = current.define<ItestInstance, ItestAttribute>('User', { username: new DataTypes.STRING() }, { underscored: false });
      const Account = current.define<ItestInstance, ItestAttribute>('Account', { title: new DataTypes.STRING() }, { underscored: false });

      User.belongsTo(Account, {
        foreignKey: {
          name: 'AccountId',
          field: 'account_id'
        }
      });

      expect(User.rawAttributes.AccountId).to.exist;
      expect(User.rawAttributes.AccountId.field).to.equal('account_id');

      return Account.sync({ force: true }).then(() => {
        // Can't use Promise.all cause of foreign key references
        return User.sync({ force: true });
      }).then(() => {
        return Promise.all([
          User.create({ username: 'foo' }),
          Account.create({ title: 'pepsico' }),
        ]);
      }).spread((user, account) => {
        return user.setLinkedData('Account', account).then(() => {
          return user.getLinkedData<ItestInstance, ItestAttribute>('Account');
        });
      }).then(user => {
        expect(user).to.not.be.null;
        return User.findOne({
          where: {username: 'foo'},
          include: [Account]
        });
      }).then(user => {
        // the sql query should correctly look at account_id instead of AccountId
        expect(user.Account).to.exist;
      });
    });

    it('should set foreignKey on foreign table', function() {
      const Mail = current.define<ItestInstance, ItestAttribute>('mail', {}, { timestamps: false });
      const Entry = current.define<ItestInstance, ItestAttribute>('entry', {}, { timestamps: false });
      const User = current.define<ItestInstance, ItestAttribute>('user', {}, { timestamps: false });

      Entry.belongsTo(User, {
        as: 'owner',
        foreignKey: {
          name: 'ownerId',
          allowNull: false
        }
      });
      Entry.belongsTo(Mail, {
        as: 'mail',
        foreignKey: {
          name: 'mailId',
          allowNull: false
        }
      });
      Mail.belongsToMany(User, {
        as: 'recipients',
        through: 'MailRecipients',
        otherKey: {
          name: 'recipientId',
          allowNull: false
        },
        foreignKey: {
          name: 'mailId',
          allowNull: false
        },
        timestamps: false
      });
      Mail.hasMany(Entry, {
        as: 'entries',
        foreignKey: {
          name: 'mailId',
          allowNull: false
        }
      });
      User.hasMany(Entry, {
        as: 'entries',
        foreignKey: {
          name: 'ownerId',
          allowNull: false
        }
      });

      return current.sync({ force: true })
        .then(() => User.create({}))
        .then(() => Mail.create({}))
        .then(mail =>
          Entry.create({ mailId: mail.id, ownerId: 1 })
            .then(() => Entry.create({ mailId: mail.id, ownerId: 1 }))
            // set recipients
            .then(() => mail.setLinkedData({ model : 'user', associationAlias : 'recipients' }, [1]))
        )
        .then(() => Entry.findAndCount({
          offset: 0,
          limit: 10,
          order: [['id', 'DESC']],
          include: [
            {
              association: Entry.associations.mail,
              include: [
                {
                  association: Mail.associations.recipients,
                  through: {
                    where: {
                      recipientId: 1
                    }
                  },
                  required: true
                }],
              required: true
            }]
        })).then(result => {
          expect(result.count).to.equal(2);
          expect(result.rows[0].get({ plain: true })).to.deep.equal(
            {
              id: 2,
              ownerId: 1,
              mailId: 1,
              mail: {
                id: 1,
                recipients: [{
                  id: 1,
                  MailRecipients: {
                    mailId: 1,
                    recipientId: 1
                  }
                }]
              }
            }
          );
        });
    });
  });

  describe('foreign key constraints', () => {
    it('are enabled by default', function() {
      const Task = current.define<ItestInstance, ItestAttribute>('Task', { title: new DataTypes.STRING() });
      const User = current.define<ItestInstance, ItestAttribute>('User', { username: new DataTypes.STRING() });

      Task.belongsTo(User); // defaults to SET NULL

      return current.sync({ force: true }).then(() => {
        return User.create({ username: 'foo' }).then(user => {
          return Task.create({ title: 'task' }).then(task => {
            return task.setLinkedData('User', user).then(() => {
              return user.destroy().then(() => {
                return task.reload().then(() => {
                  expect(task.UserId).to.equal(null);
                });
              });
            });
          });
        });
      });
    });

    it('sets to NO ACTION if allowNull: false', function() {
      const Task = current.define<ItestInstance, ItestAttribute>('Task', { title: new DataTypes.STRING() });
      const User = current.define<ItestInstance, ItestAttribute>('User', { username: new DataTypes.STRING() });

      Task.belongsTo(User, { foreignKey: { allowNull: false }}); // defaults to NO ACTION

      return current.sync({ force: true }).then(() => {
        return User.create({ username: 'foo' }).then(user => {
          return Task.create({ title: 'task', UserId: user.id }).then(() => {
            return expect(user.destroy()).to.eventually.be.rejectedWith(Sequelize.ForeignKeyConstraintError).then(() => {
              return Task.findAll().then(tasks => {
                expect(tasks).to.have.length(1);
              });
            });
          });
        });
      });
    });

    it('should be possible to disable them', function() {
      const Task = current.define<ItestInstance, ItestAttribute>('Task', { title: new DataTypes.STRING() });
      const User = current.define<ItestInstance, ItestAttribute>('User', { username: new DataTypes.STRING() });

      Task.belongsTo(User, { constraints: false });

      return current.sync({ force: true }).then(() => {
        return User.create({ username: 'foo' }).then(user => {
          return Task.create({ title: 'task' }).then(task => {
            return task.setLinkedData('User', user).then(() => {
              return user.destroy().then(() => {
                return task.reload().then(() => {
                  expect(task.UserId).to.equal(user.id);
                });
              });
            });
          });
        });
      });
    });

    it('can cascade deletes', function() {
      const Task = current.define<ItestInstance, ItestAttribute>('Task', { title: new DataTypes.STRING() });
      const User = current.define<ItestInstance, ItestAttribute>('User', { username: new DataTypes.STRING() });

      Task.belongsTo(User, {onDelete: 'cascade'});

      return current.sync({ force: true }).then(() => {
        return User.create({ username: 'foo' }).then(user => {
          return Task.create({ title: 'task' }).then(task => {
            return task.setLinkedData('User', user).then(() => {
              return user.destroy().then(() => {
                return Task.findAll().then(tasks => {
                  expect(tasks).to.have.length(0);
                });
              });
            });
          });
        });
      });
    });

    if (current.dialect.supports.constraints.restrict) {
      it('can restrict deletes', function() {
        const Task = current.define<ItestInstance, ItestAttribute>('Task', { title: new DataTypes.STRING() });
        const User = current.define<ItestInstance, ItestAttribute>('User', { username: new DataTypes.STRING() });

        Task.belongsTo(User, {onDelete: 'restrict'});

        return current.sync({ force: true }).then(() => {
          return User.create({ username: 'foo' }).then(user => {
            return Task.create({ title: 'task' }).then(task => {
              return task.setLinkedData('User', user).then(() => {
                return expect(user.destroy()).to.eventually.be.rejectedWith(Sequelize.ForeignKeyConstraintError).then(() => {
                  return Task.findAll().then(tasks => {
                    expect(tasks).to.have.length(1);
                  });
                });
              });
            });
          });
        });
      });

      it('can restrict updates', function() {
        const Task = current.define<ItestInstance, ItestAttribute>('Task', { title: new DataTypes.STRING() });
        const User = current.define<ItestInstance, ItestAttribute>('User', { username: new DataTypes.STRING() });

        Task.belongsTo(User, {onUpdate: 'restrict'});

        return current.sync({ force: true }).then(() => {
          return User.create({ username: 'foo' }).then(user => {
            return Task.create({ title: 'task' }).then(task => {
              return task.setLinkedData('User', user).then(() => {

                // Changing the id of a DAO requires a little dance since
                // the `UPDATE` query generated by `save()` uses `id` in the
                // `WHERE` clause

                const tableName = user.sequelize.getQueryInterface().QueryGenerator.addSchema(user.model);
                return expect(
                  user.sequelize.getQueryInterface().update(user, tableName, {id: 999}, {id: user.id})
                ).to.eventually.be.rejectedWith(Sequelize.ForeignKeyConstraintError).then(() => {
                  // Should fail due to FK restriction
                  return Task.findAll().then(tasks => {
                    expect(tasks).to.have.length(1);
                  });
                });
              });
            });
          });
        });
      });
    }

    // NOTE: mssql does not support changing an autoincrement primary key / oracle does not support cascade update
    if (Support.getTestDialect() !== 'mssql' && Support.getTestDialect() !== 'oracle') {
      it('can cascade updates', function() {
        const Task = current.define<ItestInstance, ItestAttribute>('Task', { title: new DataTypes.STRING() });
        const User = current.define<ItestInstance, ItestAttribute>('User', { username: new DataTypes.STRING() });

        Task.belongsTo(User, {onUpdate: 'cascade'});

        return current.sync({ force: true }).then(() => {
          return User.create({ username: 'foo' }).then(user => {
            return Task.create({ title: 'task' }).then(task => {
              return task.setLinkedData('User', user).then(() => {

                // Changing the id of a DAO requires a little dance since
                // the `UPDATE` query generated by `save()` uses `id` in the
                // `WHERE` clause

                const tableName = user.sequelize.getQueryInterface().QueryGenerator.addSchema(user.model);
                return user.sequelize.getQueryInterface().update(user, tableName, {id: 999}, {id: user.id})
                  .then(() => {
                    return Task.findAll().then(tasks => {
                      expect(tasks).to.have.length(1);
                      expect(tasks[0].UserId).to.equal(999);
                    });
                  });
              });
            });
          });
        });
      });
    }
  });

  describe('association column', () => {
    it('has correct type and name for non-id primary keys with non-integer type', function() {
      const User = current.define<ItestInstance, ItestAttribute>('UserPKBT', {
        username: {
          type: new DataTypes.STRING()
        }
      });

      const Group = current.define<ItestInstance, ItestAttribute>('GroupPKBT', {
        name: {
          type: new DataTypes.STRING(),
          primaryKey: true
        }
      });

      User.belongsTo(Group);

      return current.sync({ force: true }).then(() => {
        expect(User.rawAttributes.GroupPKBTName.type).to.an.instanceof(DataTypes.STRING);
      });
    });

    it('should support a non-primary key as the association column on a target without a primary key', function() {
      const User = current.define<ItestInstance, ItestAttribute>('User', { username: new DataTypes.STRING() });
      const Task = current.define<ItestInstance, ItestAttribute>('Task', { title: new DataTypes.STRING() });

      User.removeAttribute('id');
      Task.belongsTo(User, { foreignKey: 'user_name', targetKey: 'username'});

      return current.sync({ force: true }).then(() => {
        return User.create({ username: 'bob' }).then(newUser => {
          return Task.create({ title: 'some task' }).then(newTask => {
            return newTask.setLinkedData('User', newUser).then(() => {
              return Task.findOne({ where: { title: 'some task' } }).then(foundTask => {
                return foundTask.getLinkedData<ItestInstance, ItestAttribute>('User').then(foundUser => {
                  expect(foundUser.username).to.equal('bob');
                });
              });
            });
          });
        });
      });
    });

    it('should support a non-primary unique key as the association column', function() {
      const User = current.define<ItestInstance, ItestAttribute>('User', {
        username: {
          type: new DataTypes.STRING(),
          field: 'user_name',
          unique: true
        }
      });
      const Task = current.define<ItestInstance, ItestAttribute>('Task', {
        title: new DataTypes.STRING()
      });

      Task.belongsTo(User, { foreignKey: 'user_name', targetKey: 'username'});

      return current.sync({ force: true }).then(() => {
        return User.create({ username: 'bob' }).then(newUser => {
          return Task.create({ title: 'some task' }).then(newTask => {
            return newTask.setLinkedData('User', newUser).then(() => {
              return Task.findOne({ where: { title: 'some task' } }).then(foundTask => {
                return foundTask.getLinkedData<ItestInstance, ItestAttribute>('User').then(foundUser => {
                  expect(foundUser.username).to.equal('bob');
                });
              });
            });
          });
        });
      });
    });

    it('should support a non-primary key as the association column with a field option', function() {
      const User = current.define<ItestInstance, ItestAttribute>('User', {
        username: {
          type: new DataTypes.STRING(),
          field: 'the_user_name_field'
        }
      });
      const Task = current.define<ItestInstance, ItestAttribute>('Task', { title: new DataTypes.STRING() });

      User.removeAttribute('id');
      Task.belongsTo(User, { foreignKey: 'user_name', targetKey: 'username'});

      return current.sync({ force: true }).then(() => {
        return User.create({ username: 'bob' }).then(newUser => {
          return Task.create({ title: 'some task' }).then(newTask => {
            return newTask.setLinkedData('User', newUser).then(() => {
              return Task.findOne({ where: { title: 'some task'} }).then(foundTask => {
                return foundTask.getLinkedData<ItestInstance, ItestAttribute>('User').then(foundUser => {
                  expect(foundUser.username).to.equal('bob');
                });
              });
            });
          });
        });
      });
    });
  });

  describe('Association options', () => {
    it('can specify data type for autogenerated relational keys', function() {
      const User = current.define<ItestInstance, ItestAttribute>('UserXYZ', { username: new DataTypes.STRING() });
      const dataTypes = [DataTypes.INTEGER, DataTypes.BIGINT, DataTypes.STRING];
      const Tasks = {};

      dataTypes.forEach(dataType => {
        const tableName = 'TaskXYZ_' + dataType.key;
        Tasks[dataType] = current.define<ItestInstance, ItestAttribute>(tableName, { title: new DataTypes.STRING() });

        Tasks[dataType].belongsTo(User, { foreignKey: 'userId', keyType: dataType, constraints: false });
      });

      return current.sync({ force: true }).then(() => {
        dataTypes.forEach(dataType => {
          expect(Tasks[dataType].rawAttributes.userId.type).to.be.an.instanceof(dataType);
        });
      });
    });

    describe('allows the user to provide an attribute definition object as foreignKey', () => {
      it('works with a column that hasnt been defined before', function() {
        const Task = current.define<ItestInstance, ItestAttribute>('task', {});
        const User = current.define<ItestInstance, ItestAttribute>('user', {});

        Task.belongsTo(User, {
          foreignKey: {
            allowNull: false,
            name: 'uid'
          }
        });

        expect(Task.rawAttributes.uid).to.be.ok;
        expect(Task.rawAttributes.uid.allowNull).to.be.false;
        expect(Task.rawAttributes.uid.references.model).to.equal(User.getTableName());
        expect(Task.rawAttributes.uid.references.key).to.equal('id');
      });

      it('works when taking a column directly from the object', function() {
        const User = current.define<ItestInstance, ItestAttribute>('user', {
          uid: {
            type: new DataTypes.INTEGER(),
            primaryKey: true
          }
        });
        const Profile = current.define<ItestInstance, ItestAttribute>('project', {
          user_id: {
            type: new DataTypes.INTEGER(),
            allowNull: false
          }
        });

        Profile.belongsTo(User, { foreignKey: Profile.rawAttributes.user_id});

        expect(Profile.rawAttributes.user_id).to.be.ok;
        expect(Profile.rawAttributes.user_id.references.model).to.equal(User.getTableName());
        expect(Profile.rawAttributes.user_id.references.key).to.equal('uid');
        expect(Profile.rawAttributes.user_id.allowNull).to.be.false;
      });

      it('works when merging with an existing definition', function() {
        const Task = current.define<ItestInstance, ItestAttribute>('task', {
          projectId: {
            defaultValue: 42,
            type: new DataTypes.INTEGER()
          }
        });
        const Project = current.define<ItestInstance, ItestAttribute>('project', {});

        Task.belongsTo(Project, { foreignKey: { allowNull: true }});

        expect(Task.rawAttributes.projectId).to.be.ok;
        expect(Task.rawAttributes.projectId.defaultValue).to.equal(42);
        expect(Task.rawAttributes.projectId.allowNull).to.be.ok;
      });
    });

    it('should throw an error if foreignKey and as result in a name clash', function() {
      const Person = current.define<ItestInstance, ItestAttribute>('person', {});
      const Car = current.define<ItestInstance, ItestAttribute>('car', {});

      expect(Car.belongsTo.bind(Car, Person, {foreignKey: 'person'})).to
        .throw ('Naming collision between attribute \'person\' and association \'person\' on model car. To remedy this, change either foreignKey or as in your association definition');
    });

    it('should throw an error if an association clashes with the name of an already define attribute', function() {
      const Person = current.define<ItestInstance, ItestAttribute>('person', {});
      const Car = current.define<ItestInstance, ItestAttribute>('car', {
        person: new DataTypes.INTEGER()
      });

      expect(Car.belongsTo.bind(Car, Person, {as: 'person'})).to
        .throw ('Naming collision between attribute \'person\' and association \'person\' on model car. To remedy this, change either foreignKey or as in your association definition');
    });
  });
});

describe('Association', () => {
  it('should set foreignKey on foreign table', function() {
    const Mail = current.define<ItestInstance, ItestAttribute>('mail', {}, { timestamps: false });
    const Entry = current.define<ItestInstance, ItestAttribute>('entry', {}, { timestamps: false });
    const User = current.define<ItestInstance, ItestAttribute>('user', {}, { timestamps: false });
    Entry.belongsTo(User, { as: 'owner', foreignKey: { name: 'ownerId', allowNull: false } });
    Entry.belongsTo(Mail, {
      as: 'mail',
      foreignKey: {
        name: 'mailId',
        allowNull: false
      }
    });
    Mail.belongsToMany(User, {
      as: 'recipients',
      through: 'MailRecipients',
      otherKey: {
        name: 'recipientId',
        allowNull: false
      },
      foreignKey: {
        name: 'mailId',
        allowNull: false
      },
      timestamps: false
    });
    Mail.hasMany(Entry, {
      as: 'entries',
      foreignKey: {
        name: 'mailId',
        allowNull: false
      }
    });
    User.hasMany(Entry, {
      as: 'entries',
      foreignKey: {
        name: 'ownerId',
        allowNull: false
      }
    });
    return current.sync({ force: true }).then(() => User.create({})).then(() => Mail.create({}))
      .then(mail =>
        Entry.create({ mailId: mail.id, ownerId: 1 })
          .then(() => Entry.create({ mailId: mail.id, ownerId: 1 }))
          // set recipients
          .then(() => mail.setLinkedData({ model : 'user', associationAlias : 'recipients' }, [1]))
      )
      .then(() => Entry.findAndCount({
        offset: 0,
        limit: 10,
        order: [['id', 'DESC']],
        include: [
          {
            association: Entry.associations.mail,
            include: [
              {
                association: Mail.associations.recipients,
                through: {
                  where: {
                    recipientId: 1
                  }
                }
              }]
          }]
      })
      );
  });
});
