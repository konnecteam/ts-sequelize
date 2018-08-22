'use strict';

import * as chai from 'chai';
import DataTypes from '../../../../lib/data-types';
import { Model } from '../../../../lib/model';
import { ItestAttribute, ItestInstance } from '../../../dummy/dummy-data-set';
import Support from '../../support';
const expect = chai.expect;
const dialect = Support.getTestDialect();
const current = Support.sequelize;

if (dialect === 'mysql') {
  describe('[MYSQL Specific] Associations', () => {
    let User : Model<ItestInstance, ItestAttribute>;
    let Task : Model<ItestInstance, ItestAttribute>;
    let users;
    let tasks;
    let user : ItestInstance;
    let task : ItestInstance;
    describe('many-to-many', () => {
      describe('where tables have the same prefix', () => {
        it('should create a table wp_table1wp_table2s', function() {
          const Table2 = current.define<ItestInstance, ItestAttribute>('wp_table2', {foo: new DataTypes.STRING()});
          const Table1 = current.define<ItestInstance, ItestAttribute>('wp_table1', {foo: new DataTypes.STRING()});

          Table1.belongsToMany(Table2, { through: 'wp_table1swp_table2s' });
          Table2.belongsToMany(Table1, { through: 'wp_table1swp_table2s' });
          return Table1.sync({ force: true }).then(() => {
            return Table2.sync({ force: true }).then(() => {
              expect(current.modelManager.getModel('wp_table1swp_table2s')).to.exist;
            });
          });
        });
      });

      describe('when join table name is specified', () => {
        beforeEach(function() {
          const Table2 = current.define<ItestInstance, ItestAttribute>('ms_table1', {foo: new DataTypes.STRING()});
          const Table1 = current.define<ItestInstance, ItestAttribute>('ms_table2', {foo: new DataTypes.STRING()});

          Table1.belongsToMany(Table2, {through: 'table1_to_table2'});
          Table2.belongsToMany(Table1, {through: 'table1_to_table2'});
          return Table1.sync({ force: true }).then(() => {
            return Table2.sync({ force: true });
          });
        });

        it('should not use only a specified name', function() {
          expect(current.modelManager.getModel('ms_table1sms_table2s')).not.to.exist;
          expect(current.modelManager.getModel('table1_to_table2')).to.exist;
        });
      });
    });

    describe('HasMany', () => {
      let userTableName;
      let taskTableName;

      beforeEach(function() {
        userTableName = 'User' + Math.ceil(Math.random() * 10000000);
        taskTableName = 'Task' + Math.ceil(Math.random() * 10000000);

        //prevent periods from occurring in the table name since they are used to delimit (table.column)
        User = current.define<ItestInstance, ItestAttribute>(userTableName, { name: new DataTypes.STRING() });
        Task = current.define<ItestInstance, ItestAttribute>(taskTableName, { name: new DataTypes.STRING() });

        User.belongsToMany(Task, {as: 'Tasks', through: 'UserTasks'});
        Task.belongsToMany(User, {as: 'Users', through: 'UserTasks'});

        users = [];
        tasks = [];

        for (let i = 0; i < 5; ++i) {
          users[users.length] = {name: 'User' + Math.random()};
        }

        for (let x = 0; x < 5; ++x) {
          tasks[tasks.length] = {name: 'Task' + Math.random()};
        }

        return current.sync({ force: true }).then(() => {
          return User.bulkCreate(users).then(() => {
            return Task.bulkCreate(tasks);
          });
        });
      });

      describe('addDAO / getModel', () => {
        beforeEach(function() {

          return User.findAll().then(_users => {
            return Task.findAll().then(_tasks => {
              user = _users[0];
              task = _tasks[0];
            });
          });
        });

        it('should correctly add an association to the dao', function() {

          return user.getManyLinkedData<ItestInstance, ItestAttribute>(taskTableName).then(_tasks => {
            expect(_tasks.length).to.equal(0);
            return user.addLinkedData(taskTableName, task).then(() => {
              return user.getManyLinkedData<ItestInstance, ItestAttribute>(taskTableName).then(tasks_ => {
                expect(tasks_.length).to.equal(1);
              });
            });
          });
        });
      });

      describe('removeDAO', () => {
        beforeEach(function() {
          return User.findAll().then(_users => {
            return Task.findAll().then(_tasks => {
              user = _users[0];
              tasks = _tasks;
            });
          });
        });

        it('should correctly remove associated objects', function() {
          return user.getManyLinkedData<ItestInstance, ItestAttribute>(taskTableName).then(__tasks => {
            expect(__tasks.length).to.equal(0);
            return user.setLinkedData(taskTableName, tasks).then(() => {
              return user.getManyLinkedData<ItestInstance, ItestAttribute>(taskTableName).then(_tasks => {
                expect(_tasks.length).to.equal(tasks.length);
                return user.removeLinkedData(taskTableName, tasks[0]).then(() => {
                  return user.getManyLinkedData<ItestInstance, ItestAttribute>(taskTableName).then(tasks_ => {
                    expect(tasks_.length).to.equal(tasks.length - 1);
                    return user.removeLinkedData(taskTableName, [tasks[1], tasks[2]]).then(() => {
                      return user.getManyLinkedData<ItestInstance, ItestAttribute>(taskTableName).then(_tasks_ => {
                        expect(_tasks_).to.have.length(tasks.length - 3);
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
