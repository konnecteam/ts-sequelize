'use strict';

import * as chai from 'chai';
import {Sequelize} from '../../../index';
import DataTypes from '../../../lib/data-types';
import { ItestAttribute, ItestInstance } from '../../dummy/dummy-data-set';
import Support from '../support';
const expect = chai.expect;
const Promise = Sequelize.Promise;
const current = Support.sequelize;
const dialect = Support.getTestDialect();

describe(Support.getTestDialectTeaser('HasOne'), () => {
  describe('Model.associations', () => {
    it('should store all assocations when associting to the same table multiple times', function() {
      const User = current.define<ItestInstance, ItestAttribute>('User', {});
      const Group = current.define<ItestInstance, ItestAttribute>('Group', {});

      Group.hasOne(User);
      Group.hasOne(User, { foreignKey: 'primaryGroupId', as: 'primaryUsers' });
      Group.hasOne(User, { foreignKey: 'secondaryGroupId', as: 'secondaryUsers' });

      expect(
        Object.keys(Group.associations)
      ).to.deep.equal(['User', 'primaryUsers', 'secondaryUsers']);
    });
  });

  describe('get', () => {
    describe('multiple', () => {
      it('should fetch associations for multiple instances', function() {
        const User = current.define<ItestInstance, ItestAttribute>('User', {});
        const Player = current.define<ItestInstance, ItestAttribute>('Player', {});

        const Player_User = Player.hasOne(User, {as: 'user'});

        return current.sync({force: true}).then(() => {
          return Promise.join(
            Player.create({
              id: 1,
              user: {}
            }, {
              include: [Player_User]
            }),
            Player.create({
              id: 2,
              user: {}
            }, {
              include: [Player_User]
            }),
            Player.create({
              id: 3
            })
          );
        }).then(players => {
          return Player_User.get(players).then(result => {
            expect(result[players[0].id].id).to.equal(players[0].user.id);
            expect(result[players[1].id].id).to.equal(players[1].user.id);
            expect(result[players[2].id]).to.equal(null);
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

          Group.hasOne(User);

          return sequelize.sync({ force: true }).then(() => {
            return User.create({ username: 'foo' }).then(fakeUser => {
              return User.create({ username: 'foo' }).then(user => {
                return Group.create({ name: 'bar' }).then(group => {
                  return sequelize.transaction().then(t => {
                    return group.setLinkedData('User', user, { transaction: t }).then(() => {
                      return Group.all().then(groups => {
                        return groups[0].getLinkedData<ItestInstance, ItestAttribute>('User').then(associatedUser => {
                          expect(associatedUser).to.be.null;
                          return Group.all({ transaction: t }).then(_groups => {
                            return _groups[0].getLinkedData<ItestInstance, ItestAttribute>('User', { transaction: t })
                            .then(_associatedUser => {
                              expect(_associatedUser).not.to.be.null;
                              expect(_associatedUser.id).to.equal(user.id);
                              expect(_associatedUser.id).not.to.equal(fakeUser.id);
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
      });
    }

    if (Support.getTestDialect() !== 'oracle') {
      it('should be able to handle a where object that\'s a first class citizen.', function() {
        const User = current.define<ItestInstance, ItestAttribute>('UserXYZ', { username: new DataTypes.STRING() });
        const Task = current.define<ItestInstance, ItestAttribute>('TaskXYZ', { title: new DataTypes.STRING(), status: new DataTypes.STRING() });

        User.hasOne(Task);

        return User.sync({ force: true }).then(() => {
          return Task.sync({ force: true }).then(() => {
            return User.create({ username: 'foo' }).then(user => {
              return Task.create({ title: 'task', status: 'inactive' }).then(task => {
                return user.setLinkedData('TaskXYZ', task).then(() => {
                  return user.getLinkedData('TaskXYZ', {where: {status: 'active'}}).then(_task => {
                    expect(_task).to.be.null;
                  });
                });
              });
            });
          });
        });
      });
    }

    it('supports schemas', function() {
      const User = current.define<ItestInstance, ItestAttribute>('User', { username: new DataTypes.STRING() }).schema('admin');
      const Group = current.define<ItestInstance, ItestAttribute>('Group', { name: new DataTypes.STRING() }).schema('admin');

      Group.hasOne(User);

      return current.dropAllSchemas().then(() => {
        return current.createSchema('admin');
      }).then(() => {
        return Group.sync({force: true });
      }).then(() => {
        return User.sync({force: true });
      }).then(() => {
        return Promise.all([
          User.create({ username: 'foo' }),
          User.create({ username: 'foo' }),
          Group.create({ name: 'bar' })]);
      }).spread((fakeUser, user, group) => {
        return group.setLinkedData('User', user).then(() => {
          return Group.all().then(groups => {
            return groups[0].getLinkedData<ItestInstance, ItestAttribute>('User').then(associatedUser => {
              expect(associatedUser).not.to.be.null;
              expect(associatedUser.id).to.equal(user.id);
              expect(associatedUser.id).not.to.equal(fakeUser.id);
            });
          });
        });
      }).then(() => {
        return current.dropSchema('admin').then(() => {
          return current.showAllSchemas().then(schemas => {
            if (dialect === 'postgres' || dialect === 'mssql') {
              expect(schemas).to.be.empty;
            }
          });
        });
      });
    });
  });

  describe('setAssociation', () => {
    if (current.dialect.supports.transactions) {
      it('supports transactions', function() {
        return Support.prepareTransactionTest(current).then(sequelize => {
          const User = (sequelize as Sequelize).define<ItestInstance, ItestAttribute>('User', { username: new DataTypes.STRING() });
          const Group = (sequelize as Sequelize).define<ItestInstance, ItestAttribute>('Group', { name: new DataTypes.STRING() });

          Group.hasOne(User);

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

    it('can set an association with predefined primary keys', function() {
      const User = current.define<ItestInstance, ItestAttribute>('UserXYZZ', { userCoolIdTag: { type: new DataTypes.INTEGER(), primaryKey: true }, username: new DataTypes.STRING() });
      const Task = current.define<ItestInstance, ItestAttribute>('TaskXYZZ', { taskOrSomething: { type: new DataTypes.INTEGER(), primaryKey: true }, title: new DataTypes.STRING() });

      User.hasOne(Task, {foreignKey: 'userCoolIdTag'});

      return User.sync({ force: true }).then(() => {
        return Task.sync({ force: true }).then(() => {
          return User.create({userCoolIdTag: 1, username: 'foo'}).then(user => {
            return Task.create({taskOrSomething: 1, title: 'bar'}).then(task => {
              return user.setLinkedData('TaskXYZZ', task).then(() => {
                return user.getLinkedData('TaskXYZZ').then(_task => {
                  expect(_task).not.to.be.null;

                  return user.setLinkedData('TaskXYZZ', null).then(() => {
                    return user.getLinkedData('TaskXYZZ').then(task_ => {
                      expect(task_).to.be.null;
                    });
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

      User.hasOne(Task);

      return User.sync({ force: true }).then(() => {
        return Task.sync({ force: true }).then(() => {
          return User.create({ username: 'foo' }).then(user => {
            return Task.create({ title: 'task' }).then(task => {
              return user.setLinkedData('TaskXYZ', task).then(() => {
                return user.getLinkedData('TaskXYZ').then(_task => {
                  expect(_task).not.to.equal(null);

                  return user.setLinkedData('TaskXYZ', null).then(() => {
                    return user.getLinkedData('TaskXYZ').then(task_ => {
                      expect(task_).to.equal(null);
                    });
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

      User.hasOne(Task);

      return User.sync({ force: true }).then(() => {
        return Task.sync({ force: true }).then(() => {
          return expect(Task.create({ title: 'task', UserXYZId: 5 })).to.be.rejectedWith(Sequelize.ForeignKeyConstraintError).then(() => {
            return Task.create({ title: 'task' }).then(task => {
              return expect(Task.update({ title: 'taskUpdate', UserXYZId: 5 }, { where: { id: task.id } })).to.be.rejectedWith(Sequelize.ForeignKeyConstraintError);
            });
          });
        });
      });
    });

    it('supports passing the primary key instead of an object', function() {
      const User = current.define<ItestInstance, ItestAttribute>('UserXYZ', { username: new DataTypes.STRING() });
      const Task = current.define<ItestInstance, ItestAttribute>('TaskXYZ', { title: new DataTypes.STRING() });

      User.hasOne(Task);

      return current.sync({ force: true }).then(() => {
        return User.create({}).then(user => {
          return Task.create({ id: 19, title: 'task it!' }).then(task => {
            return user.setLinkedData('TaskXYZ', task.id).then(() => {
              return user.getLinkedData<ItestInstance, ItestAttribute>('TaskXYZ').then(_task => {
                expect(_task.title).to.equal('task it!');
              });
            });
          });
        });
      });
    });

    it('supports updating with a primary key instead of an object', function() {
      const User = current.define<ItestInstance, ItestAttribute>('UserXYZ', { username: new DataTypes.STRING() });
      const Task = current.define<ItestInstance, ItestAttribute>('TaskXYZ', { title: new DataTypes.STRING() });

      User.hasOne(Task);

      return current.sync({ force: true }).then(() => {
        return Promise.all([
          User.create({id: 1, username: 'foo'}),
          Task.create({id: 20, title: 'bar'}),
        ]);
      })
        .spread((user, task) => {
          return user.setLinkedData('TaskXYZ', task.id)
            .then(() => user.getLinkedData('TaskXYZ'))
            .then(_task => {
              expect(_task).not.to.be.null;
              return Promise.all([
                user,
                Task.create({id: 2, title: 'bar2'}),
              ]);
            });
        })
        .spread((user : ItestInstance, task2 : ItestInstance) => {
          return user.setLinkedData('TaskXYZ', task2.id)
            .then(() => user.getLinkedData('TaskXYZ'))
            .then(task => {
              expect(task).not.to.be.null;
            });
        });
    });

    it('supports setting same association twice', function() {
      const Home = current.define<ItestInstance, ItestAttribute>('home', {});
      const User = current.define<ItestInstance, ItestAttribute>('user');
      let home : ItestInstance;
      let user : ItestInstance;

      User.hasOne(Home);

      return current.sync({ force: true }).bind({}).then(() => {
        return Promise.all([
          Home.create(),
          User.create(),
        ]);
      }).spread(function(_home, _user) {
        home = _home;
        user = _user;
        return user.setLinkedData('home', home);
      }).then(function() {
        return user.setLinkedData('home', home);
      }).then(function() {
        return expect(user.getLinkedData<ItestInstance, ItestAttribute>('home')).to.eventually.have.property('id', home.get('id'));
      });
    });
  });

  describe('createAssociation', () => {
    it('creates an associated model instance', function() {
      const User = current.define<ItestInstance, ItestAttribute>('User', { username: new DataTypes.STRING() });
      const Task = current.define<ItestInstance, ItestAttribute>('Task', { title: new DataTypes.STRING() });

      User.hasOne(Task);

      return current.sync({ force: true }).then(() => {
        return User.create({ username: 'bob' }).then(user => {
          return user.createLinkedData<ItestInstance, ItestAttribute>('Task', { title: 'task' }).then(() => {
            return user.getLinkedData<ItestInstance, ItestAttribute>('Task').then(task => {
              expect(task).not.to.be.null;
              expect(task.title).to.equal('task');
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

          User.hasOne(Group);

          return sequelize.sync({ force: true }).then(() => {
            return User.create({ username: 'bob' }).then(user => {
              return sequelize.transaction().then(t => {
                return user.createLinkedData<ItestInstance, ItestAttribute>('Group', { name: 'testgroup' }, { transaction: t }).then(() => {
                  return User.all().then(users => {
                    return users[0].getLinkedData<ItestInstance, ItestAttribute>('Group').then(group => {
                      expect(group).to.be.null;
                      return User.all({ transaction: t }).then(_users => {
                        return _users[0].getLinkedData<ItestInstance, ItestAttribute>('Group', { transaction: t }).then(_group => {
                          expect(_group).to.be.not.null;
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
    }

  });

  describe('foreign key', () => {
    it('should setup underscored field with foreign keys when using underscored', function() {
      const User = current.define<ItestInstance, ItestAttribute>('User', { username: new DataTypes.STRING() }, { underscored: true });
      const Account = current.define<ItestInstance, ItestAttribute>('Account', { name: new DataTypes.STRING() }, { underscored: true });

      Account.hasOne(User);

      expect(User.rawAttributes.AccountId).to.exist;
      expect(User.rawAttributes.AccountId.field).to.equal('account_id');
    });

    it('should use model name when using camelcase', function() {
      const User = current.define<ItestInstance, ItestAttribute>('User', { username: new DataTypes.STRING() }, { underscored: false });
      const Account = current.define<ItestInstance, ItestAttribute>('Account', { name: new DataTypes.STRING() }, { underscored: false });

      Account.hasOne(User);

      expect(User.rawAttributes.AccountId).to.exist;
      expect(User.rawAttributes.AccountId.field).to.equal('AccountId');
    });

    it('should support specifying the field of a foreign key', function() {
      const User = current.define<ItestInstance, ItestAttribute>('UserXYZ', { username: new DataTypes.STRING(), gender: new DataTypes.STRING() });
      const Task = current.define<ItestInstance, ItestAttribute>('TaskXYZ', { title: new DataTypes.STRING(), status: new DataTypes.STRING() });

      Task.hasOne(User, {
        foreignKey: {
          name: 'taskId',
          field: 'task_id'
        }
      });

      expect(User.rawAttributes.taskId).to.exist;
      expect(User.rawAttributes.taskId.field).to.equal('task_id');
      return Task.sync({ force: true }).then(() => {
        // Can't use Promise.all cause of foreign key references
        return User.sync({ force: true });
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
        // the sql query should correctly look at task_id instead of taskId
        expect(user).to.not.be.null;
        return Task.findOne({
          where: {title: 'task'},
          include: [User]
        });
      }).then(task => {
        expect(task.UserXYZ).to.exist;
      });
    });
  });

  describe('foreign key constraints', () => {
    it('are enabled by default', function() {
      const Task = current.define<ItestInstance, ItestAttribute>('Task', { title: new DataTypes.STRING() });
      const User = current.define<ItestInstance, ItestAttribute>('User', { username: new DataTypes.STRING() });

      User.hasOne(Task); // defaults to set NULL

      return User.sync({ force: true }).then(() => {
        return Task.sync({ force: true }).then(() => {
          return User.create({ username: 'foo' }).then(user => {
            return Task.create({ title: 'task' }).then(task => {
              return user.setLinkedData('Task', task).then(() => {
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
    });

    it('sets to CASCADE if allowNull: false', function() {
      const Task = current.define<ItestInstance, ItestAttribute>('Task', { title: new DataTypes.STRING() });
      const User = current.define<ItestInstance, ItestAttribute>('User', { username: new DataTypes.STRING() });

      User.hasOne(Task, { foreignKey: { allowNull: false }}); // defaults to CASCADE

      return current.sync({ force: true }).then(() => {
        return User.create({ username: 'foo' }).then(user => {
          return Task.create({ title: 'task', UserId: user.id }).then(() => {
            return user.destroy().then(() => {
              return Task.findAll();
            });
          });
        }).then(tasks => {
          expect(tasks).to.be.empty;
        });
      });
    });

    it('should be possible to disable them', function() {
      const Task = current.define<ItestInstance, ItestAttribute>('Task', { title: new DataTypes.STRING() });
      const User = current.define<ItestInstance, ItestAttribute>('User', { username: new DataTypes.STRING() });

      User.hasOne(Task, { constraints: false });

      return User.sync({ force: true }).then(() => {
        return Task.sync({ force: true }).then(() => {
          return User.create({ username: 'foo' }).then(user => {
            return Task.create({ title: 'task' }).then(task => {
              return user.setLinkedData('Task', task).then(() => {
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
    });

    it('can cascade deletes', function() {
      const Task = current.define<ItestInstance, ItestAttribute>('Task', { title: new DataTypes.STRING() });
      const User = current.define<ItestInstance, ItestAttribute>('User', { username: new DataTypes.STRING() });

      User.hasOne(Task, {onDelete: 'cascade'});

      return User.sync({ force: true }).then(() => {
        return Task.sync({ force: true }).then(() => {
          return User.create({ username: 'foo' }).then(user => {
            return Task.create({ title: 'task' }).then(task => {
              return user.setLinkedData('Task', task).then(() => {
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
    });

    it('works when cascading a delete with hooks but there is no associate (i.e. "has zero")', function() {
      const Task = current.define<ItestInstance, ItestAttribute>('Task', { title: new DataTypes.STRING() });
      const User = current.define<ItestInstance, ItestAttribute>('User', { username: new DataTypes.STRING() });

      User.hasOne(Task, {onDelete: 'cascade', hooks: true});

      return User.sync({ force: true }).then(() => {
        return Task.sync({ force: true }).then(() => {
          return User.create({ username: 'foo' }).then(user => {
            return user.destroy();
          });
        });
      });
    });

    // NOTE: mssql does not support changing an autoincrement primary key
    // oracle neither
    if (Support.getTestDialect() !== 'mssql' && Support.getTestDialect() !== 'oracle') {
      it('can cascade updates', function() {
        const Task = current.define<ItestInstance, ItestAttribute>('Task', { title: new DataTypes.STRING() });
        const User = current.define<ItestInstance, ItestAttribute>('User', { username: new DataTypes.STRING() });

        User.hasOne(Task, {onUpdate: 'cascade'});

        return User.sync({ force: true }).then(() => {
          return Task.sync({ force: true }).then(() => {
            return User.create({ username: 'foo' }).then(user => {
              return Task.create({ title: 'task' }).then(task => {
                return user.setLinkedData('Task', task).then(() => {

                  // Changing the id of a DAO requires a little dance since
                  // the `UPDATE` query generated by `save()` uses `id` in the
                  // `WHERE` clause

                  const tableName = user.sequelize.getQueryInterface().QueryGenerator.addSchema(user.model);
                  return user.sequelize.getQueryInterface().update(user, tableName, {id: 999}, {id: user.id}).then(() => {
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
      });
    }

    if (current.dialect.supports.constraints.restrict) {

      it('can restrict deletes', function() {
        const Task = current.define<ItestInstance, ItestAttribute>('Task', { title: new DataTypes.STRING() });
        const User = current.define<ItestInstance, ItestAttribute>('User', { username: new DataTypes.STRING() });

        User.hasOne(Task, {onDelete: 'restrict'});

        return User.sync({ force: true }).then(() => {
          return Task.sync({ force: true }).then(() => {
            return User.create({ username: 'foo' }).then(user => {
              return Task.create({ title: 'task' }).then(task => {
                return user.setLinkedData('Task', task).then(() => {
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
      });

      it('can restrict updates', function() {
        const Task = current.define<ItestInstance, ItestAttribute>('Task', { title: new DataTypes.STRING() });
        const User = current.define<ItestInstance, ItestAttribute>('User', { username: new DataTypes.STRING() });

        User.hasOne(Task, {onUpdate: 'restrict'});

        return User.sync({ force: true }).then(() => {
          return Task.sync({ force: true }).then(() => {
            return User.create({ username: 'foo' }).then(user => {
              return Task.create({ title: 'task' }).then(task => {
                return user.setLinkedData('Task', task).then(() => {

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
      });

    }

  });

  describe('association column', () => {
    it('has correct type for non-id primary keys with non-integer type', function() {
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

      Group.hasOne(User);

      return current.sync({ force: true }).then(() => {
        expect(User.rawAttributes.GroupPKBTName.type).to.an.instanceof(DataTypes.STRING);
      });
    });

    it('should support a non-primary key as the association column on a target with custom primary key', function() {
      const User = current.define<ItestInstance, ItestAttribute>('User', {
        user_name: {
          type: new DataTypes.STRING(),
          primaryKey: true
        }
      });

      const Task = current.define<ItestInstance, ItestAttribute>('Task', {
        title: new DataTypes.STRING(),
        username: new DataTypes.STRING()
      });

      User.hasOne(Task, { foreignKey: 'username', sourceKey: 'user_name' });

      return current.sync({ force: true }).then(() => {
        return User.create({ user_name: 'bob' }).then(newUser => {
          return Task.create({ title: 'some task' }).then(newTask => {
            return newUser.setLinkedData('Task', newTask).then(() => {
              return User.findOne({ where: { user_name: 'bob' } }).then(foundUser => {
                return foundUser.getLinkedData<ItestInstance, ItestAttribute>('Task').then(foundTask => {
                  expect(foundTask.title).to.equal('some task');
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
          unique: true
        }
      });

      const Task = current.define<ItestInstance, ItestAttribute>('Task', {
        title: new DataTypes.STRING(),
        username: new DataTypes.STRING()
      });

      User.hasOne(Task, { foreignKey: 'username', sourceKey: 'username' });

      return current.sync({ force: true }).then(() => {
        return User.create({ username: 'bob' }).then(newUser => {
          return Task.create({ title: 'some task' }).then(newTask => {
            return newUser.setLinkedData('Task', newTask).then(() => {
              return User.findOne({ where: { username: 'bob' } }).then(foundUser => {
                return foundUser.getLinkedData<ItestInstance, ItestAttribute>('Task').then(foundTask => {
                  expect(foundTask.title).to.equal('some task');
                });
              });
            });
          });
        });
      });
    });

    it('should support a non-primary unique key as the association column with a field option', function() {
      const User = current.define<ItestInstance, ItestAttribute>('User', {
        username: {
          type: new DataTypes.STRING(),
          unique: true,
          field: 'the_user_name_field'
        }
      });

      const Task = current.define<ItestInstance, ItestAttribute>('Task', {
        title: new DataTypes.STRING(),
        username: new DataTypes.STRING()
      });

      User.hasOne(Task, { foreignKey: 'username', sourceKey: 'username' });

      return current.sync({ force: true }).then(() => {
        return User.create({ username: 'bob' }).then(newUser => {
          return Task.create({ title: 'some task' }).then(newTask => {
            return newUser.setLinkedData('Task', newTask).then(() => {
              return User.findOne({ where: { username: 'bob' } }).then(foundUser => {
                return foundUser.getLinkedData<ItestInstance, ItestAttribute>('Task').then(foundTask => {
                  expect(foundTask.title).to.equal('some task');
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

      return Promise.map(dataTypes, dataType => {
        const tableName = 'TaskXYZ_' + dataType.key;
        Tasks[dataType] = current.define<ItestInstance, ItestAttribute>(tableName, { title: new DataTypes.STRING() });

        User.hasOne(Tasks[dataType], { foreignKey: 'userId', keyType: dataType, constraints: false });

        return Tasks[dataType].sync({ force: true }).then(() => {
          expect(Tasks[dataType].rawAttributes.userId.type).to.be.an.instanceof(dataType);
        });
      });
    });

    describe('allows the user to provide an attribute definition object as foreignKey', () => {
      it('works with a column that hasnt been defined before', function() {
        const User = current.define<ItestInstance, ItestAttribute>('user', {});
        let Profile = current.define<ItestInstance, ItestAttribute>('project', {});

        User.hasOne(Profile, {
          foreignKey: {
            allowNull: false,
            name: 'uid'
          }
        });

        expect(Profile.rawAttributes.uid).to.be.ok;
        expect(Profile.rawAttributes.uid.references.model).to.equal(User.getTableName());
        expect(Profile.rawAttributes.uid.references.key).to.equal('id');
        expect(Profile.rawAttributes.uid.allowNull).to.be.false;

        // Let's clear it
        Profile = current.define<ItestInstance, ItestAttribute>('project', {});
        User.hasOne(Profile, {
          foreignKey: {
            allowNull: false,
            name: 'uid'
          }
        });

        expect(Profile.rawAttributes.uid).to.be.ok;
        expect(Profile.rawAttributes.uid.references.model).to.equal(User.getTableName());
        expect(Profile.rawAttributes.uid.references.key).to.equal('id');
        expect(Profile.rawAttributes.uid.allowNull).to.be.false;
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

        User.hasOne(Profile, { foreignKey: Profile.rawAttributes.user_id});

        expect(Profile.rawAttributes.user_id).to.be.ok;
        expect(Profile.rawAttributes.user_id.references.model).to.equal(User.getTableName());
        expect(Profile.rawAttributes.user_id.references.key).to.equal('uid');
        expect(Profile.rawAttributes.user_id.allowNull).to.be.false;
      });

      it('works when merging with an existing definition', function() {
        const User = current.define<ItestInstance, ItestAttribute>('user', {
          uid: {
            type: new DataTypes.INTEGER(),
            primaryKey: true
          }
        });
        const Project = current.define<ItestInstance, ItestAttribute>('project', {
          userUid: {
            type: new DataTypes.INTEGER(),
            defaultValue: 42
          }
        });

        User.hasOne(Project, { foreignKey: { allowNull: false }});

        expect(Project.rawAttributes.userUid).to.be.ok;
        expect(Project.rawAttributes.userUid.allowNull).to.be.false;
        expect(Project.rawAttributes.userUid.references.model).to.equal(User.getTableName());
        expect(Project.rawAttributes.userUid.references.key).to.equal('uid');
        expect(Project.rawAttributes.userUid.defaultValue).to.equal(42);
      });
    });

    it('should throw an error if an association clashes with the name of an already define attribute', function() {
      const User = current.define<ItestInstance, ItestAttribute>('user', {
        attribute: new DataTypes.STRING()
      });
      const Attribute = current.define<ItestInstance, ItestAttribute>('attribute', {});

      expect(User.hasOne.bind(User, Attribute)).to
        .throw ('Naming collision between attribute \'attribute\' and association \'attribute\' on model user. To remedy this, change either foreignKey or as in your association definition');
    });
  });

  describe('Counter part', () => {
    describe('BelongsTo', () => {
      it('should only generate one foreign key', function() {
        const Orders = current.define<ItestInstance, ItestAttribute>('Orders', {}, {timestamps: false});
        const InternetOrders = current.define<ItestInstance, ItestAttribute>('InternetOrders', {}, {timestamps: false});

        InternetOrders.belongsTo(Orders, {
          foreignKeyConstraint: true
        });
        Orders.hasOne(InternetOrders, {
          foreignKeyConstraint: true
        });

        expect(Object.keys(InternetOrders.rawAttributes).length).to.equal(2);
        expect(InternetOrders.rawAttributes.OrderId).to.be.ok;
        expect(InternetOrders.rawAttributes.OrdersId).not.to.be.ok;
      });
    });
  });
});
