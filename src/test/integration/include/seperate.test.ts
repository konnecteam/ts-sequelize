'use strict';

import * as chai from 'chai';
import * as _ from 'lodash';
import * as sinon from 'sinon';
import {Sequelize} from '../../../index';
import DataTypes from '../../../lib/data-types';
import { ItestAttribute, ItestInstance } from '../../dummy/dummy-data-set';
import Support from '../support';
const expect = chai.expect;
const current = Support.sequelize;
const Promise = Sequelize.Promise;

if (current.dialect.supports.groupedLimit) {
  describe(Support.getTestDialectTeaser('Include'), () => {
    describe('separate', () => {
      it('should run a hasMany association in a separate query', function() {
        const User = current.define<ItestInstance, ItestAttribute>('User', {});
        const Task = current.define<ItestInstance, ItestAttribute>('Task', {});
        const sqlSpy = sinon.spy();

        const User_Tasks = User.hasMany(Task, {as: 'tasks'});

        return current.sync({force: true}).then(() => {
          return Promise.join(
            User.create({
              id: 1,
              tasks: [
                {},
                {},
                {},
              ]
            }, {
              include: [User_Tasks]
            }),
            User.create({
              id: 2,
              tasks: [
                {},
              ]
            }, {
              include: [User_Tasks]
            })
          ).then(() => {
            return User.findAll({
              include: [
                {association: User_Tasks, separate: true},
              ],
              order: [
                ['id', 'ASC'],
              ],
              logging: sqlSpy
            });
          }).then(users => {
            expect(users[0].get('tasks')).to.be.ok;
            expect(users[0].get('tasks').length).to.equal(3);
            expect(users[1].get('tasks')).to.be.ok;
            expect(users[1].get('tasks').length).to.equal(1);

            expect(users[0].get('tasks')[0].createdAt).to.be.ok;
            expect(users[0].get('tasks')[0].updatedAt).to.be.ok;

            expect(sqlSpy).to.have.been.calledTwice;
          });
        });
      });

      it('should work even if the id was not included', function() {
        const User = current.define<ItestInstance, ItestAttribute>('User', {
          name: new DataTypes.STRING()
        });
        const Task = current.define<ItestInstance, ItestAttribute>('Task', {});
        const sqlSpy = sinon.spy();

        const User_Tasks = User.hasMany(Task, {as: 'tasks'});

        return current.sync({force: true}).then(() => {
          return User.create({
            id: 1,
            tasks: [
              {},
              {},
              {},
            ]
          }, {
            include: [User_Tasks]
          }).then(() => {
            return User.findAll({
              attributes: ['name'],
              include: [
                {association: User_Tasks, separate: true},
              ],
              order: [
                ['id', 'ASC'],
              ],
              logging: sqlSpy
            });
          }).then(users => {
            expect(users[0].get('tasks')).to.be.ok;
            expect(users[0].get('tasks').length).to.equal(3);
            expect(sqlSpy).to.have.been.calledTwice;
          });
        });
      });

      it('should work even if include does not specify foreign key attribute with custom sourceKey', function() {
        const User = current.define<ItestInstance, ItestAttribute>('User', {
          name: new DataTypes.STRING(),
          userExtraId: {
            type: new DataTypes.INTEGER(),
            unique: true
          }
        });
        const Task = current.define<ItestInstance, ItestAttribute>('Task', {
          title: new DataTypes.STRING()
        });
        const sqlSpy = sinon.spy();

        const User_Tasks = User.hasMany(Task, {
          as: 'tasks',
          foreignKey: 'userId',
          sourceKey: 'userExtraId'
        });

        return current
          .sync({force: true})
          .then(() => {
            return User.create({
              id: 1,
              userExtraId: 222,
              tasks: [
                {},
                {},
                {}]
            }, {
              include: [User_Tasks]
            });
          })
          .then(() => {
            return User.findAll({
              attributes: ['name'],
              include: [
                {
                  attributes: [
                    'title'],
                  association: User_Tasks,
                  separate: true
                }],
              order: [
                ['id', 'ASC']],
              logging: sqlSpy
            });
          })
          .then(users => {
            expect(users[0].get('tasks')).to.be.ok;
            expect(users[0].get('tasks').length).to.equal(3);
            expect(sqlSpy).to.have.been.calledTwice;
          });
      });

      it('should not break a nested include with null values', function() {
        const User = current.define<ItestInstance, ItestAttribute>('User', {});
        const Team = current.define<ItestInstance, ItestAttribute>('Team', {});
        const Company = current.define<ItestInstance, ItestAttribute>('Company', {});

        const User_Team = User.belongsTo(Team);
        const Team_Company = Team.belongsTo(Company);

        return current.sync({force: true}).then(() => {
          return User.create({});
        }).then(() => {
          return User.findAll({
            include: [
              {association: User_Team, include: [Team_Company]},
            ]
          });
        });
      });

      it('should run a hasMany association with limit in a separate query', function() {
        const User = current.define<ItestInstance, ItestAttribute>('User', {});
        const Task = current.define<ItestInstance, ItestAttribute>('Task', {
          userId: {
            type: new DataTypes.INTEGER(),
            field: 'user_id'
          }
        });
        const sqlSpy = sinon.spy();

        const User_Tasks = User.hasMany(Task, {as: 'tasks', foreignKey: 'userId'});

        return current.sync({force: true}).then(() => {
          return Promise.join(
            User.create({
              id: 1,
              tasks: [
                {},
                {},
                {},
              ]
            }, {
              include: [User_Tasks]
            }),
            User.create({
              id: 2,
              tasks: [
                {},
                {},
                {},
                {},
              ]
            }, {
              include: [User_Tasks]
            })
          ).then(() => {
            return User.findAll({
              include: [
                {association: User_Tasks, limit: 2},
              ],
              order: [
                ['id', 'ASC'],
              ],
              logging: sqlSpy
            });
          }).then(users => {
            expect(users[0].get('tasks')).to.be.ok;
            expect(users[0].get('tasks').length).to.equal(2);
            expect(users[1].get('tasks')).to.be.ok;
            expect(users[1].get('tasks').length).to.equal(2);
            expect(sqlSpy).to.have.been.calledTwice;
          });
        });
      });

      it('should run a nested (from a non-separate include) hasMany association in a separate query', function() {
        const User = current.define<ItestInstance, ItestAttribute>('User', {});
        const Company = current.define<ItestInstance, ItestAttribute>('Company');
        const Task = current.define<ItestInstance, ItestAttribute>('Task', {});
        const sqlSpy = sinon.spy();

        const User_Company = User.belongsTo(Company, {as: 'company'});
        const Company_Tasks = Company.hasMany(Task, {as: 'tasks'});

        return current.sync({force: true}).then(() => {
          return Promise.join(
            User.create({
              id: 1,
              company: {
                tasks: [
                  {},
                  {},
                  {},
                ]
              }
            }, {
              include: [
                {association: User_Company, include: [Company_Tasks]},
              ]
            }),
            User.create({
              id: 2,
              company: {
                tasks: [
                  {},
                ]
              }
            }, {
              include: [
                {association: User_Company, include: [Company_Tasks]},
              ]
            })
          ).then(() => {
            return User.findAll({
              include: [
                {association: User_Company, include: [
                  {association: Company_Tasks, separate: true},
                ]},
              ],
              order: [
                ['id', 'ASC'],
              ],
              logging: sqlSpy
            });
          }).then(users => {
            expect(users[0].get('company').get('tasks')).to.be.ok;
            expect(users[0].get('company').get('tasks').length).to.equal(3);
            expect(users[1].get('company').get('tasks')).to.be.ok;
            expect(users[1].get('company').get('tasks').length).to.equal(1);
            expect(sqlSpy).to.have.been.calledTwice;
          });
        });
      });

      it('should work having a separate include between a parent and child include', function() {
        const User = current.define<ItestInstance, ItestAttribute>('User', {});
        const  Project = current.define<ItestInstance, ItestAttribute>('Project');
        const Company = current.define<ItestInstance, ItestAttribute>('Company');
        const Task = current.define<ItestInstance, ItestAttribute>('Task', {});
        const sqlSpy = sinon.spy();

        const Company_Users = Company.hasMany(User, {as: 'users'});
        const User_Tasks = User.hasMany(Task, {as: 'tasks'});
        const Task_Project = Task.belongsTo(Project, {as: 'project'});

        return current.sync({force: true}).then(() => {
          return Promise.join(
            Company.create({
              id: 1,
              users: [
                {
                  tasks: [
                    {project: {}},
                    {project: {}},
                    {project: {}},
                  ]
                },
              ]
            }, {
              include: [
                {association: Company_Users, include: [
                  {association: User_Tasks, include: [
                    Task_Project,
                  ]},
                ]},
              ]
            })
          ).then(() => {
            return Company.findAll({
              include: [
                {association: Company_Users, include: [
                  {association: User_Tasks, separate: true, include: [
                    Task_Project,
                  ]},
                ]},
              ],
              order: [
                ['id', 'ASC'],
              ],
              logging: sqlSpy
            });
          }).then(companies => {
            expect(sqlSpy).to.have.been.calledTwice;

            expect(companies[0].users[0].tasks[0].project).to.be.ok;
          });
        });
      });

      it('should run two nested hasMany association in a separate queries', function() {
        const User = current.define<ItestInstance, ItestAttribute>('User', {});
        const Project = current.define<ItestInstance, ItestAttribute>('Project', {});
        const Task = current.define<ItestInstance, ItestAttribute>('Task', {});
        const sqlSpy = sinon.spy();

        const User_Projects = User.hasMany(Project, {as: 'projects'});
        const Project_Tasks = Project.hasMany(Task, {as: 'tasks'});

        return current.sync({force: true}).then(() => {
          return Promise.join(
            User.create({
              id: 1,
              projects: [
                {
                  id: 1,
                  tasks: [
                    {},
                    {},
                    {},
                  ]
                },
                {
                  id: 2,
                  tasks: [
                    {},
                  ]
                },
              ]
            }, {
              include: [
                {association: User_Projects, include: [Project_Tasks]},
              ]
            }),
            User.create({
              id: 2,
              projects: [
                {
                  id: 3,
                  tasks: [
                    {},
                    {},
                  ]
                },
              ]
            }, {
              include: [
                {association: User_Projects, include: [Project_Tasks]},
              ]
            })
          ).then(() => {
            return User.findAll({
              include: [
                {association: User_Projects, separate: true, include: [
                  {association: Project_Tasks, separate: true},
                ]},
              ],
              order: [
                ['id', 'ASC'],
              ],
              logging: sqlSpy
            });
          }).then(users => {
            const u1projects = users[0].get('projects');

            expect(u1projects).to.be.ok;
            expect(u1projects[0].get('tasks')).to.be.ok;
            expect(u1projects[1].get('tasks')).to.be.ok;
            expect(u1projects.length).to.equal(2);

            // WTB ES2015 syntax ...
            expect(_.find(u1projects, p => p.id === 1).get('tasks').length).to.equal(3);
            expect(_.find(u1projects, p => p.id === 2).get('tasks').length).to.equal(1);

            expect(users[1].get('projects')).to.be.ok;
            expect(users[1].get('projects')[0].get('tasks')).to.be.ok;
            expect(users[1].get('projects').length).to.equal(1);
            expect(users[1].get('projects')[0].get('tasks').length).to.equal(2);

            expect(sqlSpy).to.have.been.calledThrice;
          });
        });
      });

      it('should work with two schema models in a hasMany association', function() {
        const User = current.define<ItestInstance, ItestAttribute>('User', {}, {schema: 'archive'});
        const Task = current.define<ItestInstance, ItestAttribute>('Task', {
          id: { type: new DataTypes.INTEGER(), primaryKey: true },
          title: new DataTypes.STRING()
        }, {schema: 'archive'});

        const User_Tasks = User.hasMany(Task, {as: 'tasks'});

        return current.dropAllSchemas().then(() => {
          return current.createSchema('archive').then(() => {
            return current.sync({force: true}).then(() => {
              return Promise.join(
                User.create({
                  id: 1,
                  tasks: [
                    {id: 1, title: 'b'},
                    {id: 2, title: 'd'},
                    {id: 3, title: 'c'},
                    {id: 4, title: 'a'},
                  ]
                }, {
                  include: [User_Tasks]
                }),
                User.create({
                  id: 2,
                  tasks: [
                    {id: 5, title: 'a'},
                    {id: 6, title: 'c'},
                    {id: 7, title: 'b'},
                  ]
                }, {
                  include: [User_Tasks]
                })
              );
            }).then(() => {
              return User.findAll({
                include: [{ model: Task, limit: 2, as: 'tasks', order: [['id', 'ASC']] }],
                order: [
                  ['id', 'ASC'],
                ]
              }).then(result => {
                expect(result[0].tasks.length).to.equal(2);
                expect(result[0].tasks[0].title).to.equal('b');
                expect(result[0].tasks[1].title).to.equal('d');

                expect(result[1].tasks.length).to.equal(2);
                expect(result[1].tasks[0].title).to.equal('a');
                expect(result[1].tasks[1].title).to.equal('c');
              });
            });
          });
        });
      });
    });
  });
}
