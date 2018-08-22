'use strict';

import * as chai from 'chai';
import * as _ from 'lodash';
import { BelongsToMany } from '../../../../lib/associations/belongs-to-many';
import { HasMany } from '../../../../lib/associations/has-many';
import DataTypes from '../../../../lib/data-types';
import { Model } from '../../../../lib/model';
import { ItestAttribute, ItestInstance } from '../../../dummy/dummy-data-set';
import Support from '../../support';
const expect = chai.expect;
const Sequelize = Support.Sequelize;
const current = Support.sequelize;
const Promise = current.Promise;

if (current.dialect.supports['UNION ALL']) {
  describe(Support.getTestDialectTeaser('Model'), () => {
    let User : Model<ItestInstance, ItestAttribute>;
    let Project : Model<ItestInstance, ItestAttribute>;
    let Task : Model<ItestInstance, ItestAttribute>;
    let ProjectUserParanoid : Model<ItestInstance, ItestAttribute>;
    let User_Projects : BelongsToMany<ItestInstance, ItestAttribute, any, any>;
    let User_ParanoidProjects : BelongsToMany<ItestInstance, ItestAttribute, any, any>;
    let User_Tasks : HasMany<ItestInstance, ItestAttribute, any, any>;
    let projects : ItestInstance[];
    describe('findAll', () => {
      describe('groupedLimit', () => {

        beforeEach(function() {
          User = current.define<ItestInstance, ItestAttribute>('user', {
            age: new DataTypes.INTEGER()
          });
          Project = current.define<ItestInstance, ItestAttribute>('project', {
            title: new DataTypes.STRING()
          });
          Task = current.define<ItestInstance, ItestAttribute>('task');

          ProjectUserParanoid = current.define<ItestInstance, ItestAttribute>('project_user_paranoid', {}, {
            timestamps: true,
            paranoid: true,
            createdAt: false,
            updatedAt: false
          });

          User_Projects = User.belongsToMany(Project, {through: 'project_user' });
          Project.belongsToMany(User, {as: 'members', through: 'project_user' });

          User_ParanoidProjects = User.belongsToMany(Project, {through: ProjectUserParanoid});
          Project.belongsToMany(User, {as: 'paranoidMembers', through: ProjectUserParanoid});

          User_Tasks = User.hasMany(Task);

          return current.sync({force: true}).then(() => {
            return Promise.join(
              User.bulkCreate([{age: -5}, {age: 45}, {age: 7}, {age: -9}, {age: 8}, {age: 15}, {age: -9}]),
              Project.bulkCreate([{}, {}]),
              Task.bulkCreate([{}, {}])
            );
          })
            .then(() => [User.findAll(), Project.findAll(), Task.findAll()])
            .spread((users : any, _projects : any, tasks) => {
              projects = _projects;
              return Promise.join(
                projects[0].setLinkedData({ model : 'user', associationAlias : 'members' }, users.slice(0, 4)),
                projects[1].setLinkedData({ model : 'user', associationAlias : 'members' }, users.slice(2)),
                projects[0].setLinkedData({ model : 'user', associationAlias : 'paranoidMembers' }, users.slice(0, 4)),
                projects[1].setLinkedData({ model : 'user', associationAlias : 'paranoidMembers' }, users.slice(2)),
                users[2].setLinkedData('task', tasks)
              );
            });
        });

        describe('on: belongsToMany', () => {
          it('maps attributes from a grouped limit to models', function() {
            return User.findAll({
              groupedLimit: {
                limit: 3,
                on: User_Projects,
                values: projects.map(item => item.get('id'))
              }
            }).then(users => {
              expect(users).to.have.length(5);
              users.filter(u => u.get('id') !== 3).forEach(u => {
                expect(u.get('projects')).to.have.length(1);
              });
              users.filter(u => u.get('id') === 3).forEach(u => {
                expect(u.get('projects')).to.have.length(2);
              });
            });
          });

          it('maps attributes from a grouped limit to models with include', function() {
            return User.findAll({
              groupedLimit: {
                limit: 3,
                on: User_Projects,
                values: projects.map(item => item.get('id'))
              },
              order: ['id'],
              include: [User_Tasks]
            }).then(users => {
              /*
               project1 - 1, 2, 3
               project2 - 3, 4, 5
               */
              expect(users).to.have.length(5);
              expect(users.map(u => u.get('id'))).to.deep.equal([1, 2, 3, 4, 5]);

              expect(users[2].get('tasks')).to.have.length(2);
              users.filter(u => u.get('id') !== 3).forEach(u => {
                expect(u.get('projects')).to.have.length(1);
              });
              users.filter(u => u.get('id') === 3).forEach(u => {
                expect(u.get('projects')).to.have.length(2);
              });
            });
          });

          it('works with computed order', function() {
            return User.findAll({
              attributes: ['id'],
              groupedLimit: {
                limit: 3,
                on: User_Projects,
                values: projects.map(item => item.get('id'))
              },
              order: [
                Sequelize.fn('ABS', Sequelize.col('age')),
              ],
              include: [User_Tasks]
            }).then(users => {
              /*
               project1 - 1, 3, 4
               project2 - 3, 5, 4
             */
              expect(users).to.have.length(4);
              expect(users.map(u => u.get('id'))).to.deep.equal([1, 3, 5, 4]);
            });
          });

          it('works with multiple orders', function() {
            return User.findAll({
              attributes: ['id'],
              groupedLimit: {
                limit: 3,
                on: User_Projects,
                values: projects.map(item => item.get('id'))
              },
              order: [
                Sequelize.fn('ABS', Sequelize.col('age')),
                ['id', 'DESC'],
              ],
              include: [User_Tasks]
            }).then(users => {
              /*
                project1 - 1, 3, 4
                project2 - 3, 5, 7
               */
              expect(users).to.have.length(5);
              expect(users.map(u => u.get('id'))).to.deep.equal([1, 3, 5, 7, 4]);
            });
          });

          it('works with paranoid junction models', function() {
            return User.findAll({
              attributes: ['id'],
              groupedLimit: {
                limit: 3,
                on: User_ParanoidProjects,
                values: projects.map(item => item.get('id'))
              },
              order: [
                Sequelize.fn('ABS', Sequelize.col('age')),
                ['id', 'DESC'],
              ],
              include: [User_Tasks]
            }).then(users => {
              /*
                project1 - 1, 3, 4
                project2 - 3, 5, 7
               */
              expect(users).to.have.length(5);
              expect(users.map(u => u.get('id'))).to.deep.equal([1, 3, 5, 7, 4]);

              return Sequelize.Promise.join(
                projects[0].setLinkedData({ model : 'user', associationAlias : 'paranoidMembers' }, users.slice(0, 2)),
                projects[1].setLinkedData({ model : 'user', associationAlias : 'paranoidMembers' }, users.slice(4))
              );
            }).then(() => {
              return User.findAll({
                attributes: ['id'],
                groupedLimit: {
                  limit: 3,
                  on: User_ParanoidProjects,
                  values: projects.map(item => item.get('id'))
                },
                order: [
                  Sequelize.fn('ABS', Sequelize.col('age')),
                  ['id', 'DESC'],
                ],
                include: [User_Tasks]
              });
            }).then(users => {
              /*
                project1 - 1, 3
                project2 - 4
               */
              expect(users).to.have.length(3);
              expect(users.map(u => u.get('id'))).to.deep.equal([1, 3, 4]);
            });
          });
        });

        describe('on: hasMany', () => {
          let users : ItestInstance[];
          beforeEach(function() {
            User = current.define<ItestInstance, ItestAttribute>('user');
            Task = current.define<ItestInstance, ItestAttribute>('task');
            User_Tasks = User.hasMany(Task);

            return current.sync({force: true}).then(() => {
              return Promise.join(
                User.bulkCreate([{}, {}, {}]),
                Task.bulkCreate([{id: 1}, {id: 2}, {id: 3}, {id: 4}, {id: 5}, {id: 6}])
              );
            })
              .then(() => [User.findAll(), Task.findAll()])
              .spread((_users : any, tasks : any) => {
                users = (_users);
                return Promise.join(
                  users[0].setLinkedData('task', tasks[0]),
                  users[1].setLinkedData('task', tasks.slice(1, 4)),
                  users[2].setLinkedData('task', tasks.slice(4))
                );
              });
          });

          it('Applies limit and order correctly', function() {
            return Task.findAll({
              order: [
                ['id', 'DESC'],
              ],
              groupedLimit: {
                limit: 3,
                on: User_Tasks,
                values: users.map(item => item.get('id'))
              }
            }).then(tasks => {
              const byUser = _.groupBy(tasks, _.property('userId'));
              expect(Object.keys(byUser)).to.have.length(3);

              expect(byUser[1]).to.have.length(1);
              expect(byUser[2]).to.have.length(3);
              expect(_.invokeMap(byUser[2], 'get', 'id')).to.deep.equal([4, 3, 2]);
              expect(byUser[3]).to.have.length(2);
            });
          });
        });
      });
    });
  });
}
