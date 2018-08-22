'use strict';

import * as chai from 'chai';
import DataTypes from '../../../../lib/data-types';
import { Model } from '../../../../lib/model';
import config from '../../../config/config';
import { ItestAttribute, ItestInstance } from '../../../dummy/dummy-data-set';
import Support from '../../support';
const expect = chai.expect;
const dialect = Support.getTestDialect();
const current = Support.sequelize;

if (dialect.match(/^postgres/)) {
  describe('[POSTGRES Specific] associations', () => {
    describe('many-to-many', () => {
      describe('where tables have the same prefix', () => {
        it('should create a table wp_table1wp_table2s', function() {
          const Table2 = current.define<ItestInstance, ItestAttribute>('wp_table2', {foo: new DataTypes.STRING()});
          const Table1 = current.define<ItestInstance, ItestAttribute>('wp_table1', {foo: new DataTypes.STRING()});

          Table1.belongsToMany(Table2, { through: 'wp_table1swp_table2s' });
          Table2.belongsToMany(Table1, { through: 'wp_table1swp_table2s' });

          expect(current.modelManager.getModel('wp_table1swp_table2s')).to.exist;
        });
      });

      describe('when join table name is specified', () => {
        beforeEach(function() {
          const Table2 = current.define<ItestInstance, ItestAttribute>('ms_table1', {foo: new DataTypes.STRING()});
          const Table1 = current.define<ItestInstance, ItestAttribute>('ms_table2', {foo: new DataTypes.STRING()});

          Table1.belongsToMany(Table2, {through: 'table1_to_table2'});
          Table2.belongsToMany(Table1, {through: 'table1_to_table2'});
        });

        it('should not use a combined name', function() {
          expect(current.modelManager.getModel('ms_table1sms_table2s')).not.to.exist;
        });

        it('should use the specified name', function() {
          expect(current.modelManager.getModel('table1_to_table2')).to.exist;
        });
      });
    });

    describe('HasMany', () => {
      let User : Model<ItestInstance, ItestAttribute>;
      let Task : Model<ItestInstance, ItestAttribute>;
      let user : ItestInstance;
      let task : ItestInstance;
      let tasks : ItestInstance[];
      let userTableName;
      let taskTableName;
      describe('addDAO / getModel', () => {
        beforeEach(function() {
          userTableName = 'User' + Math.ceil(Math.random() * 10000000);
          taskTableName = 'Task' + Math.ceil(Math.random() * 10000000);

          //prevent periods from occurring in the table name since they are used to delimit (table.column)
          User = current.define<ItestInstance, ItestAttribute>(userTableName, { name: new DataTypes.STRING() });
          Task = current.define<ItestInstance, ItestAttribute>(taskTableName, { name: new DataTypes.STRING() });

          User.belongsToMany(Task, {as: 'Tasks', through: 'usertasks'});
          Task.belongsToMany(User, {as: 'Users', through: 'usertasks'});

          const _users = [];
          const _tasks = [];

          for (let i = 0; i < 5; ++i) {
            _users[_users.length] = {name: 'User' + Math.random()};
          }

          for (let x = 0; x < 5; ++x) {
            _tasks[_tasks.length] = {name: 'Task' + Math.random()};
          }

          return current.sync({ force: true }).then(() => {
            return User.bulkCreate(_users).then(() => {
              return Task.bulkCreate(_tasks).then(() => {
                return User.findAll().then(users1 => {
                  return Task.findAll().then(tasks1 => {
                    user = users1[0];
                    task = tasks1[0];
                  });
                });
              });
            });
          });
        });

        it('should correctly add an association to the dao', function() {
          return user.getLinkedData<ItestInstance, ItestAttribute>(taskTableName).then(tasks1 => {
            expect(tasks1).to.have.length(0);
            return user.addLinkedData(taskTableName, task).then(() => {
              return user.getLinkedData<ItestInstance, ItestAttribute>(taskTableName).then(tasks2 => {
                expect(tasks2).to.have.length(1);
              });
            });
          });
        });
      });

      describe('removeDAO', () => {
        it('should correctly remove associated objects', function() {
          const _users = [];
          const _tasks = [];
          userTableName = 'User' + config.rand();
          taskTableName = 'Task' + config.rand();

          //prevent periods from occurring in the table name since they are used to delimit (table.column)
          User = current.define<ItestInstance, ItestAttribute>(userTableName, { name: new DataTypes.STRING() });
          Task = current.define<ItestInstance, ItestAttribute>(taskTableName, { name: new DataTypes.STRING() });

          User.belongsToMany(Task, {as: 'Tasks', through: 'usertasks'});
          Task.belongsToMany(User, {as: 'Users', through: 'usertasks'});

          for (let i = 0; i < 5; ++i) {
            _users[_users.length] = {id: i + 1, name: 'User' + Math.random()};
          }

          for (let x = 0; x < 5; ++x) {
            _tasks[_tasks.length] = {id: x + 1, name: 'Task' + Math.random()};
          }

          return current.sync({ force: true }).then(() => {
            return User.bulkCreate(_users).then(() => {
              return Task.bulkCreate(_tasks).then(() => {
                return User.findAll().then(users1 => {
                  return Task.findAll().then(tasks1 => {
                    user = users1[0];
                    task = tasks1[0];
                    tasks = tasks1;

                    return user.getLinkedData<ItestInstance, ItestAttribute>(taskTableName).then(tasks2 => {
                      expect(tasks2).to.have.length(0);
                      return user.setLinkedData(taskTableName, tasks).then(() => {
                        return user.getLinkedData<ItestInstance, ItestAttribute>(taskTableName).then(tasks3 => {
                          expect(tasks3).to.have.length(tasks.length);
                          return user.removeLinkedData(taskTableName, tasks[0]).then(() => {
                            return user.getLinkedData<ItestInstance, ItestAttribute>(taskTableName).then(tasks4 => {
                              expect(tasks4).to.have.length(tasks.length - 1);
                              return user.removeLinkedData(taskTableName, [tasks[1], tasks[2]]).then(() => {
                                return user.getLinkedData<ItestInstance, ItestAttribute>(taskTableName).then(tasks5 => {
                                  expect(tasks5).to.have.length(tasks.length - 3);
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
        });
      });
    });
  });
}
