'use strict';

import * as Promise from 'bluebird';
import * as chai from 'chai';
import * as sinon from 'sinon';
import { Model } from '../../..';
import DataTypes from '../../../lib/data-types';
import { ItestAttribute, ItestInstance } from '../../dummy/dummy-data-set';
import Support from '../support';
const expect = chai.expect;
const dialect = Support.getTestDialect();
const current = Support.sequelize;

describe(Support.getTestDialectTeaser('Hooks'), () => {
  let Projects : Model<ItestInstance, ItestAttribute>;
  let Tasks : Model<ItestInstance, ItestAttribute>;
  let MiniTasks : Model<ItestInstance, ItestAttribute>;
  beforeEach(function() {
    current.define<ItestInstance, ItestAttribute>('User', {
      username: {
        type: new DataTypes.STRING(),
        allowNull: false
      },
      mood: {
        type: new DataTypes.ENUM(),
        values: ['happy', 'sad', 'neutral']
      }
    });

    current.define<ItestInstance, ItestAttribute>('ParanoidUser', {
      username: new DataTypes.STRING(),
      mood: {
        type: new DataTypes.ENUM(),
        values: ['happy', 'sad', 'neutral']
      }
    }, {
      paranoid: true
    });

    return current.sync({ force: true });
  });


  describe('associations', () => {
    describe('1:1', () => {
      describe('cascade onUpdate', () => {
        beforeEach(function() {

          Projects = current.define<ItestInstance, ItestAttribute>('Project', {
            title: new DataTypes.STRING()
          });

          Tasks = current.define<ItestInstance, ItestAttribute>('Task', {
            title: new DataTypes.STRING()
          });

          Projects.hasOne(Tasks, {onUpdate: 'cascade', hooks: true});
          Tasks.belongsTo(Projects);

          return Projects.sync({ force: true }).then(() => {
            return Tasks.sync({ force: true });
          });
        });

        it('on success', function() {
          let beforeHook = false;
          let afterHook = false;

          Tasks.beforeUpdate(() => {
            beforeHook = true;
            return Promise.resolve();
          });

          Tasks.afterUpdate(() => {
            afterHook = true;
            return Promise.resolve();
          });

          return Projects.create({title: 'New Project'}).then(project => {
            return Tasks.create({title: 'New Task'}).then(task => {
              return project.setLinkedData('Task', task).then(() => {
                return project.updateAttributes({id: 2}).then(() => {
                  expect(beforeHook).to.be.true;
                  expect(afterHook).to.be.true;
                });
              });
            });
          });
        });

        it('on error', function() {

          Tasks.afterUpdate(() => {
            return Promise.reject(new Error('Whoops!'));
          });

          return Projects.create({title: 'New Project'}).then(project => {
            return Tasks.create({title: 'New Task'}).then(task => {
              return project.setLinkedData('Task', task).catch(err => {
                expect(err).to.be.instanceOf(Error);
              });
            });
          });
        });
      });

      describe('cascade onDelete', () => {
        beforeEach(function() {
          Projects = current.define<ItestInstance, ItestAttribute>('Project', {
            title: new DataTypes.STRING()
          });

          Tasks = current.define<ItestInstance, ItestAttribute>('Task', {
            title: new DataTypes.STRING()
          });

          Projects.hasOne(Tasks, {onDelete: 'CASCADE', hooks: true});
          Tasks.belongsTo(Projects);

          return current.sync({ force: true });
        });

        describe('#remove', () => {
          it('with no errors', function() {
            const beforeProject = sinon.spy();
            const afterProject = sinon.spy();
            const beforeTask = sinon.spy();
            const afterTask = sinon.spy();

            Projects.beforeCreate(beforeProject);
            Projects.afterCreate(afterProject);
            Tasks.beforeDestroy(beforeTask);
            Tasks.afterDestroy(afterTask);

            return Projects.create({title: 'New Project'}).then(project => {
              return Tasks.create({title: 'New Task'}).then(task => {
                return project.setLinkedData('Task', task).then(() => {
                  return project.destroy().then(() => {
                    expect(beforeProject).to.have.been.calledOnce;
                    expect(afterProject).to.have.been.calledOnce;
                    expect(beforeTask).to.have.been.calledOnce;
                    expect(afterTask).to.have.been.calledOnce;
                  });
                });
              });
            });
          });

          it('with errors', function() {
            const CustomErrorText = 'Whoops!';
            let beforeProject = false;
            let afterProject = false;
            let beforeTask = false;
            let afterTask = false;

            Projects.beforeCreate(() => {
              beforeProject = true;
              return Promise.resolve();
            });

            Projects.afterCreate(() => {
              afterProject = true;
              return Promise.resolve();
            });

            Tasks.beforeDestroy(() => {
              beforeTask = true;
              return Promise.reject(new Error(CustomErrorText));
            });

            Tasks.afterDestroy(() => {
              afterTask = true;
              return Promise.resolve();
            });

            return Projects.create({title: 'New Project'}).then(project => {
              return Tasks.create({title: 'New Task'}).then(task => {
                return project.setLinkedData('Task', task).then(() => {
                  return expect(project.destroy()).to.eventually.be.rejectedWith(CustomErrorText).then(() => {
                    expect(beforeProject).to.be.true;
                    expect(afterProject).to.be.true;
                    expect(beforeTask).to.be.true;
                    expect(afterTask).to.be.false;
                  });
                });
              });
            });
          });
        });
      });

      describe('no cascade update', () => {
        beforeEach(function() {

          Projects = current.define<ItestInstance, ItestAttribute>('Project', {
            title: new DataTypes.STRING()
          });

          Tasks = current.define<ItestInstance, ItestAttribute>('Task', {
            title: new DataTypes.STRING()
          });

          Projects.hasOne(Tasks);
          Tasks.belongsTo(Projects);

          return Projects.sync({ force: true }).then(() => {
            return Tasks.sync({ force: true });
          });
        });

        it('on success', function() {
          const beforeHook = sinon.spy();
          const afterHook = sinon.spy();

          Tasks.beforeUpdate(beforeHook);
          Tasks.afterUpdate(afterHook);

          return Projects.create({title: 'New Project'}).then(project => {
            return Tasks.create({title: 'New Task'}).then(task => {
              return project.setLinkedData('Task', task).then(() => {
                return project.updateAttributes({id: 2}).then(() => {
                  expect(beforeHook).to.have.been.calledOnce;
                  expect(afterHook).to.have.been.calledOnce;
                });
              });
            });
          });
        });

        it('on error', function() {

          Tasks.afterUpdate(() => {
            throw new Error('Whoops!');
          });

          return Projects.create({title: 'New Project'}).then(project => {
            return Tasks.create({title: 'New Task'}).then(task => {
              return expect(project.setLinkedData('Task', task)).to.be.rejected;
            });
          });
        });
      });

      describe('no cascade delete', () => {
        beforeEach(function() {

          Projects = current.define<ItestInstance, ItestAttribute>('Project', {
            title: new DataTypes.STRING()
          });

          Tasks = current.define<ItestInstance, ItestAttribute>('Task', {
            title: new DataTypes.STRING()
          });

          Projects.hasMany(Tasks);
          Tasks.belongsTo(Projects);

          return Projects.sync({ force: true }).then(() => {
            return Tasks.sync({ force: true });
          });
        });

        describe('#remove', () => {
          it('with no errors', function() {
            const beforeProject = sinon.spy();
            const afterProject = sinon.spy();
            const beforeTask = sinon.spy();
            const afterTask = sinon.spy();

            Projects.beforeCreate(beforeProject);
            Projects.afterCreate(afterProject);
            Tasks.beforeUpdate(beforeTask);
            Tasks.afterUpdate(afterTask);

            return Projects.create({title: 'New Project'}).then(project => {
              return Tasks.create({title: 'New Task'}).then(task => {
                return project.addLinkedData('Task', task).then(() => {
                  return project.removeLinkedData('Task', task).then(() => {
                    expect(beforeProject).to.have.been.called;
                    expect(afterProject).to.have.been.called;
                    expect(beforeTask).not.to.have.been.called;
                    expect(afterTask).not.to.have.been.called;
                  });
                });
              });
            });
          });

          it('with errors', function() {
            const beforeProject = sinon.spy();
            const afterProject = sinon.spy();
            const beforeTask = sinon.spy();
            const afterTask = sinon.spy();

            Projects.beforeCreate(beforeProject);
            Projects.afterCreate(afterProject);
            Tasks.beforeUpdate(() => {
              beforeTask();
              throw new Error('Whoops!');
            });
            Tasks.afterUpdate(afterTask);

            return Projects.create({title: 'New Project'}).then(project => {
              return Tasks.create({title: 'New Task'}).then(task => {
                return project.addLinkedData('Task', task).catch(err => {
                  expect(err).to.be.instanceOf(Error);
                  expect(beforeProject).to.have.been.calledOnce;
                  expect(afterProject).to.have.been.calledOnce;
                  expect(beforeTask).to.have.been.calledOnce;
                  expect(afterTask).not.to.have.been.called;
                });
              });
            });
          });
        });
      });
    });

    describe('1:M', () => {
      describe('cascade', () => {
        beforeEach(function() {
          Projects = current.define<ItestInstance, ItestAttribute>('Project', {
            title: new DataTypes.STRING()
          });

          Tasks = current.define<ItestInstance, ItestAttribute>('Task', {
            title: new DataTypes.STRING()
          });

          Projects.hasMany(Tasks, {onDelete: 'cascade', hooks: true});
          Tasks.belongsTo(Projects, {hooks: true});

          return Projects.sync({ force: true }).then(() => {
            return Tasks.sync({ force: true });
          });
        });

        describe('#remove', () => {
          it('with no errors', function() {
            const beforeProject = sinon.spy();
            const afterProject = sinon.spy();
            const beforeTask = sinon.spy();
            const afterTask = sinon.spy();

            Projects.beforeCreate(beforeProject);
            Projects.afterCreate(afterProject);
            Tasks.beforeDestroy(beforeTask);
            Tasks.afterDestroy(afterTask);

            return Projects.create({title: 'New Project'}).then(project => {
              return Tasks.create({title: 'New Task'}).then(task => {
                return project.addLinkedData('Task', task).then(() => {
                  return project.destroy().then(() => {
                    expect(beforeProject).to.have.been.calledOnce;
                    expect(afterProject).to.have.been.calledOnce;
                    expect(beforeTask).to.have.been.calledOnce;
                    expect(afterTask).to.have.been.calledOnce;
                  });
                });
              });
            });
          });

          it('with errors', function() {
            let beforeProject = false;
            let afterProject = false;
            let beforeTask = false;
            let afterTask = false;

            Projects.beforeCreate(() => {
              beforeProject = true;
              return Promise.resolve();
            });

            Projects.afterCreate(() => {
              afterProject = true;
              return Promise.resolve();
            });

            Tasks.beforeDestroy(() => {
              beforeTask = true;
              return Promise.reject(new Error('Whoops!'));
            });

            Tasks.afterDestroy(() => {
              afterTask = true;
              return Promise.resolve();
            });

            return Projects.create({title: 'New Project'}).then(project => {
              return Tasks.create({title: 'New Task'}).then(task => {
                return project.addLinkedData('Task', task).then(() => {
                  return project.destroy().catch(err => {
                    expect(err).to.be.instanceOf(Error);
                    expect(beforeProject).to.be.true;
                    expect(afterProject).to.be.true;
                    expect(beforeTask).to.be.true;
                    expect(afterTask).to.be.false;
                  });
                });
              });
            });
          });
        });
      });

      describe('no cascade', () => {
        beforeEach(function() {
          Projects = current.define<ItestInstance, ItestAttribute>('Project', {
            title: new DataTypes.STRING()
          });

          Tasks = current.define<ItestInstance, ItestAttribute>('Task', {
            title: new DataTypes.STRING()
          });

          Projects.hasMany(Tasks);
          Tasks.belongsTo(Projects);

          return current.sync({ force: true });
        });

        describe('#remove', () => {
          it('with no errors', function() {
            const beforeProject = sinon.spy();
            const afterProject = sinon.spy();
            const beforeTask = sinon.spy();
            const afterTask = sinon.spy();

            Projects.beforeCreate(beforeProject);
            Projects.afterCreate(afterProject);
            Tasks.beforeUpdate(beforeTask);
            Tasks.afterUpdate(afterTask);

            return Projects.create({title: 'New Project'}).then(project => {
              return Tasks.create({title: 'New Task'}).then(task => {
                return project.addLinkedData('Task', task).then(() => {
                  return project.removeLinkedData('Task', task).then(() => {
                    expect(beforeProject).to.have.been.called;
                    expect(afterProject).to.have.been.called;
                    expect(beforeTask).not.to.have.been.called;
                    expect(afterTask).not.to.have.been.called;
                  });
                });
              });
            });
          });

          it('with errors', function() {
            let beforeProject = false;
            let afterProject = false;
            let beforeTask = false;
            let afterTask = false;

            Projects.beforeCreate(() => {
              beforeProject = true;
              return Promise.resolve();
            });

            Projects.afterCreate(() => {
              afterProject = true;
              return Promise.resolve();
            });

            Tasks.beforeUpdate(() => {
              beforeTask = true;
              return Promise.reject(new Error('Whoops!'));
            });

            Tasks.afterUpdate(() => {
              afterTask = true;
              return Promise.resolve();
            });

            return Projects.create({title: 'New Project'}).then(project => {
              return Tasks.create({title: 'New Task'}).then(task => {
                return project.addLinkedData('Task', task).catch(err => {
                  expect(err).to.be.instanceOf(Error);
                  expect(beforeProject).to.be.true;
                  expect(afterProject).to.be.true;
                  expect(beforeTask).to.be.true;
                  expect(afterTask).to.be.false;
                });
              });
            });
          });
        });
      });
    });

    describe('M:M', () => {
      describe('cascade', () => {
        beforeEach(function() {
          Projects = current.define<ItestInstance, ItestAttribute>('Project', {
            title: new DataTypes.STRING()
          });

          Tasks = current.define<ItestInstance, ItestAttribute>('Task', {
            title: new DataTypes.STRING()
          });

          Projects.belongsToMany(Tasks, {cascade: 'onDelete', through: 'projects_and_tasks', hooks: true});
          Tasks.belongsToMany(Projects, {cascade: 'onDelete', through: 'projects_and_tasks', hooks: true});

          return current.sync({ force: true });
        });

        describe('#remove', () => {
          it('with no errors', function() {
            const beforeProject = sinon.spy();
            const afterProject = sinon.spy();
            const beforeTask = sinon.spy();
            const afterTask = sinon.spy();

            Projects.beforeCreate(beforeProject);
            Projects.afterCreate(afterProject);
            Tasks.beforeDestroy(beforeTask);
            Tasks.afterDestroy(afterTask);

            return Projects.create({title: 'New Project'}).then(project => {
              return Tasks.create({title: 'New Task'}).then(task => {
                return project.addLinkedData('Task', task).then(() => {
                  return project.destroy().then(() => {
                    expect(beforeProject).to.have.been.calledOnce;
                    expect(afterProject).to.have.been.calledOnce;
                    // Since Sequelize does not cascade M:M, these should be false
                    expect(beforeTask).not.to.have.been.called;
                    expect(afterTask).not.to.have.been.called;
                  });
                });
              });
            });
          });

          it('with errors', function() {
            let beforeProject = false;
            let afterProject = false;
            let beforeTask = false;
            let afterTask = false;

            Projects.beforeCreate(() => {
              beforeProject = true;
              return Promise.resolve();
            });

            Projects.afterCreate(() => {
              afterProject = true;
              return Promise.resolve();
            });

            Tasks.beforeDestroy(() => {
              beforeTask = true;
              return Promise.reject(new Error('Whoops!'));
            });

            Tasks.afterDestroy(() => {
              afterTask = true;
              return Promise.resolve();
            });

            return Projects.create({title: 'New Project'}).then(project => {
              return Tasks.create({title: 'New Task'}).then(task => {
                return project.addLinkedData('Task', task).then(() => {
                  return project.destroy().then(() => {
                    expect(beforeProject).to.be.true;
                    expect(afterProject).to.be.true;
                    expect(beforeTask).to.be.false;
                    expect(afterTask).to.be.false;
                  });
                });
              });
            });
          });
        });
      });

      describe('no cascade', () => {
        beforeEach(function() {
          Projects = current.define<ItestInstance, ItestAttribute>('Project', {
            title: new DataTypes.STRING()
          });

          Tasks = current.define<ItestInstance, ItestAttribute>('Task', {
            title: new DataTypes.STRING()
          });

          Projects.belongsToMany(Tasks, {hooks: true, through: 'project_tasks'});
          Tasks.belongsToMany(Projects, {hooks: true, through: 'project_tasks'});

          return current.sync({ force: true });
        });

        describe('#remove', () => {
          it('with no errors', function() {
            const beforeProject = sinon.spy();
            const afterProject = sinon.spy();
            const beforeTask = sinon.spy();
            const afterTask = sinon.spy();

            Projects.beforeCreate(beforeProject);
            Projects.afterCreate(afterProject);
            Tasks.beforeUpdate(beforeTask);
            Tasks.afterUpdate(afterTask);

            return Projects.create({title: 'New Project'}).then(project => {
              return Tasks.create({title: 'New Task'}).then(task => {
                return project.addLinkedData('Task', task).then(() => {
                  return project.removeLinkedData('Task', task).then(() => {
                    expect(beforeProject).to.have.been.calledOnce;
                    expect(afterProject).to.have.been.calledOnce;
                    expect(beforeTask).not.to.have.been.called;
                    expect(afterTask).not.to.have.been.called;
                  });
                });
              });
            });
          });

          it('with errors', function() {
            let beforeProject = false;
            let afterProject = false;
            let beforeTask = false;
            let afterTask = false;

            Projects.beforeCreate(() => {
              beforeProject = true;
              return Promise.resolve();
            });

            Projects.afterCreate(() => {
              afterProject = true;
              return Promise.resolve();
            });

            Tasks.beforeUpdate(() => {
              beforeTask = true;
              return Promise.reject(new Error('Whoops!'));
            });

            Tasks.afterUpdate(() => {
              afterTask = true;
              return Promise.resolve();
            });

            return Projects.create({title: 'New Project'}).then(project => {
              return Tasks.create({title: 'New Task'}).then(task => {
                return project.addLinkedData('Task', task).then(() => {
                  expect(beforeProject).to.be.true;
                  expect(afterProject).to.be.true;
                  expect(beforeTask).to.be.false;
                  expect(afterTask).to.be.false;
                });
              });
            });
          });
        });
      });
    });

    // NOTE: Reenable when FK constraints create table query is fixed when using hooks
    if (dialect !== 'mssql') {
      describe('multiple 1:M', () => {

        describe('cascade', () => {
          beforeEach(function() {
            Projects = current.define<ItestInstance, ItestAttribute>('Project', {
              title: new DataTypes.STRING()
            });

            Tasks = current.define<ItestInstance, ItestAttribute>('Task', {
              title: new DataTypes.STRING()
            });

            MiniTasks = current.define<ItestInstance, ItestAttribute>('MiniTask', {
              mini_title: new DataTypes.STRING()
            });

            Projects.hasMany(Tasks, {onDelete: 'cascade', hooks: true});
            Projects.hasMany(MiniTasks, {onDelete: 'cascade', hooks: true});

            Tasks.belongsTo(Projects, {hooks: true});
            Tasks.hasMany(MiniTasks, {onDelete: 'cascade', hooks: true});

            MiniTasks.belongsTo(Projects, {hooks: true});
            MiniTasks.belongsTo(Tasks, {hooks: true});

            return current.sync({force: true});
          });

          describe('#remove', () => {
            it('with no errors', function() {
              let beforeProject = false;
              let afterProject = false;
              let beforeTask = false;
              let afterTask = false;
              let beforeMiniTask = false;
              let afterMiniTask = false;

              Projects.beforeCreate(() => {
                beforeProject = true;
                return Promise.resolve();
              });

              Projects.afterCreate(() => {
                afterProject = true;
                return Promise.resolve();
              });

              Tasks.beforeDestroy(() => {
                beforeTask = true;
                return Promise.resolve();
              });

              Tasks.afterDestroy(() => {
                afterTask = true;
                return Promise.resolve();
              });

              MiniTasks.beforeDestroy(() => {
                beforeMiniTask = true;
                return Promise.resolve();
              });

              MiniTasks.afterDestroy(() => {
                afterMiniTask = true;
                return Promise.resolve();
              });

              return current.Promise.all([
                Projects.create({title: 'New Project'}),
                MiniTasks.create({mini_title: 'New MiniTask'}),
              ]).bind(this).spread((project, minitask) => {
                return project.addLinkedData('MiniTask', minitask);
              }).then(project => {
                return project.destroy();
              }).then(() => {
                expect(beforeProject).to.be.true;
                expect(afterProject).to.be.true;
                expect(beforeTask).to.be.false;
                expect(afterTask).to.be.false;
                expect(beforeMiniTask).to.be.true;
                expect(afterMiniTask).to.be.true;
              });

            });

            it('with errors', function() {
              let beforeProject = false;
              let afterProject = false;
              let beforeTask = false;
              let afterTask = false;
              let beforeMiniTask = false;
              let afterMiniTask = false;

              Projects.beforeCreate(() => {
                beforeProject = true;
                return Promise.resolve();
              });

              Projects.afterCreate(() => {
                afterProject = true;
                return Promise.resolve();
              });

              Tasks.beforeDestroy(() => {
                beforeTask = true;
                return Promise.resolve();
              });

              Tasks.afterDestroy(() => {
                afterTask = true;
                return Promise.resolve();
              });

              MiniTasks.beforeDestroy(() => {
                beforeMiniTask = true;
                return Promise.reject(new Error('Whoops!'));
              });

              MiniTasks.afterDestroy(() => {
                afterMiniTask = true;
                return Promise.resolve();
              });

              return current.Promise.all([
                Projects.create({title: 'New Project'}),
                MiniTasks.create({mini_title: 'New MiniTask'}),
              ]).bind(this).spread((project, minitask) => {
                return project.addLinkedData('MiniTask', minitask);
              }).then(project => {
                return project.destroy();
              }).catch(() => {
                expect(beforeProject).to.be.true;
                expect(afterProject).to.be.true;
                expect(beforeTask).to.be.false;
                expect(afterTask).to.be.false;
                expect(beforeMiniTask).to.be.true;
                expect(afterMiniTask).to.be.false;
              });
            });
          });
        });
      });

      describe('multiple 1:M sequential hooks', () => {
        describe('cascade', () => {
          beforeEach(function() {
            Projects = current.define<ItestInstance, ItestAttribute>('Project', {
              title: new DataTypes.STRING()
            });

            Tasks = current.define<ItestInstance, ItestAttribute>('Task', {
              title: new DataTypes.STRING()
            });

            MiniTasks = current.define<ItestInstance, ItestAttribute>('MiniTask', {
              mini_title: new DataTypes.STRING()
            });

            Projects.hasMany(Tasks, {onDelete: 'cascade', hooks: true});
            Projects.hasMany(MiniTasks, {onDelete: 'cascade', hooks: true});

            Tasks.belongsTo(Projects, {hooks: true});
            Tasks.hasMany(MiniTasks, {onDelete: 'cascade', hooks: true});

            MiniTasks.belongsTo(Projects, {hooks: true});
            MiniTasks.belongsTo(Tasks, {hooks: true});

            return current.sync({force: true});
          });

          describe('#remove', () => {
            it('with no errors', function() {
              let beforeProject = false;
              let afterProject = false;
              let beforeTask = false;
              let afterTask = false;
              let beforeMiniTask = false;
              let afterMiniTask = false;

              Projects.beforeCreate(() => {
                beforeProject = true;
                return Promise.resolve();
              });

              Projects.afterCreate(() => {
                afterProject = true;
                return Promise.resolve();
              });

              Tasks.beforeDestroy(() => {
                beforeTask = true;
                return Promise.resolve();
              });

              Tasks.afterDestroy(() => {
                afterTask = true;
                return Promise.resolve();
              });

              MiniTasks.beforeDestroy(() => {
                beforeMiniTask = true;
                return Promise.resolve();
              });

              MiniTasks.afterDestroy(() => {
                afterMiniTask = true;
                return Promise.resolve();
              });

              return current.Promise.all([
                Projects.create({title: 'New Project'}),
                Tasks.create({title: 'New Task'}),
                MiniTasks.create({mini_title: 'New MiniTask'}),
              ]).bind(this).spread(function(project, task, minitask) {
                return current.Promise.all([
                  task.addLinkedData('MiniTask', minitask),
                  project.addLinkedData('Task', task),
                ]).return(project);
              }).then(project => {
                return project.destroy();
              }).then(() => {
                expect(beforeProject).to.be.true;
                expect(afterProject).to.be.true;
                expect(beforeTask).to.be.true;
                expect(afterTask).to.be.true;
                expect(beforeMiniTask).to.be.true;
                expect(afterMiniTask).to.be.true;
              });
            });

            it('with errors', function() {
              let beforeProject = false;
              let afterProject = false;
              let beforeTask = false;
              let afterTask = false;
              let beforeMiniTask = false;
              let afterMiniTask = false;
              const CustomErrorText = 'Whoops!';

              Projects.beforeCreate(() => {
                beforeProject = true;
              });

              Projects.afterCreate(() => {
                afterProject = true;
              });

              Tasks.beforeDestroy(() => {
                beforeTask = true;
                throw new Error(CustomErrorText);
              });

              Tasks.afterDestroy(() => {
                afterTask = true;
              });

              MiniTasks.beforeDestroy(() => {
                beforeMiniTask = true;
              });

              MiniTasks.afterDestroy(() => {
                afterMiniTask = true;
              });

              return current.Promise.all([
                Projects.create({title: 'New Project'}),
                Tasks.create({title: 'New Task'}),
                MiniTasks.create({mini_title: 'New MiniTask'}),
              ]).bind(this).spread(function(project, task, minitask) {
                return current.Promise.all([
                  task.addLinkedData('MiniTask', minitask),
                  project.addLinkedData('Task', task),
                ]).return(project);
              }).then(project => {
                return expect(project.destroy()).to.eventually.be.rejectedWith(CustomErrorText).then(() => {
                  expect(beforeProject).to.be.true;
                  expect(afterProject).to.be.true;
                  expect(beforeTask).to.be.true;
                  expect(afterTask).to.be.false;
                  expect(beforeMiniTask).to.be.false;
                  expect(afterMiniTask).to.be.false;
                });
              });
            });
          });
        });
      });
    }

  });

});
