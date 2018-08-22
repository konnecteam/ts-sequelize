'use strict';

import * as chai from 'chai';
import * as _ from 'lodash';
import * as moment from 'moment';
import * as sinon from 'sinon';
import { Model, Sequelize } from '../../../index';
import DataTypes from '../../../lib/data-types';
import { ItestAttribute, ItestInstance } from '../../dummy/dummy-data-set';
import Support from '../support';
const expect = chai.expect;
const Promise = Sequelize.Promise;
const current = Support.sequelize;
const dialect = Support.getTestDialect();

describe(Support.getTestDialectTeaser('HasMany'), () => {
  let _Article : Model<ItestInstance, ItestAttribute>;
  let _Label : Model<ItestInstance, ItestAttribute>;
  let _User : Model<ItestInstance, ItestAttribute>;
  let _Task : Model<ItestInstance, ItestAttribute>;
  let _sequelize : Sequelize;
  let _article : ItestInstance;
  let _label : ItestInstance;
  let _task : ItestInstance;
  let _label2 : ItestInstance;
  let _users : ItestInstance[];
  let _user : ItestInstance;
  let _t;
  describe('Model.associations', () => {
    it('should store all assocations when associting to the same table multiple times', function() {
      const User = current.define<ItestInstance, ItestAttribute>('User', {});
      const Group = current.define<ItestInstance, ItestAttribute>('Group', {});

      Group.hasMany(User);
      Group.hasMany(User, { foreignKey: 'primaryGroupId', as: 'primaryUsers' });
      Group.hasMany(User, { foreignKey: 'secondaryGroupId', as: 'secondaryUsers' });

      expect(Object.keys(Group.associations)).to.deep.equal(['Users', 'primaryUsers', 'secondaryUsers']);
    });
  });

  describe('count', () => {
    it('should not fail due to ambiguous field', function() {
      const User = current.define<ItestInstance, ItestAttribute>('User', { username: new DataTypes.STRING() });
      const Task = current.define<ItestInstance, ItestAttribute>('Task', { title: new DataTypes.STRING(), active: new DataTypes.BOOLEAN() });

      User.hasMany(Task);
      const subtasks = Task.hasMany(Task, { as: 'subtasks' });

      return current.sync({ force: true }).then(() => {
        return User.create({
          username: 'John',
          Tasks: [{
            title: 'Get rich', active: true
          }]
        }, {
          include: [Task]
        });
      }).then(user => {
        return Promise.join(
          (user.get('Tasks')[0] as ItestInstance).createLinkedData<ItestInstance, ItestAttribute>({ model : 'Task', associationAlias : 'subtasks' }, { title: 'Make a startup', active: false }),
          (user.get('Tasks')[0] as ItestInstance).createLinkedData<ItestInstance, ItestAttribute>({ model : 'Task', associationAlias : 'subtasks' }, { title: 'Engage rock stars', active: true })
        ).return(user);
      }).then(user => {
        return expect(user.countLinkedData('Task', {
          attributes: [Task.primaryKeyField, 'title'],
          include: [{
            attributes: [],
            association: subtasks,
            where: {
              active: true
            }
          }],
          group: current.col(Task.name.concat('.', Task.primaryKeyField))
        })).to.eventually.equal(1);
      });
    });
  });

  describe('get', () => {
    if (current.dialect.supports.groupedLimit) {
      describe('multiple', () => {
        it('should fetch associations for multiple instances', function() {
          const User = current.define<ItestInstance, ItestAttribute>('User', {});
          const Task = current.define<ItestInstance, ItestAttribute>('Task', {});

          const User_Tasks = User.hasMany<ItestInstance, ItestAttribute>(Task, {as: 'tasks'});

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
              }),
              User.create({
                id: 3
              })
            );
          }).then(users => {
            return User_Tasks.get(users).then(result => {
              expect(result[users[0].id].length).to.equal(3);
              expect(result[users[1].id].length).to.equal(1);
              expect(result[users[2].id].length).to.equal(0);
            });
          });
        });

        it('should fetch associations for multiple instances with limit and order', function() {
          const User = current.define<ItestInstance, ItestAttribute>('User', {});
          const Task = current.define<ItestInstance, ItestAttribute>('Task', {
            title: new DataTypes.STRING()
          });

          const User_Tasks = User.hasMany<ItestInstance, ItestAttribute>(Task, {as: 'tasks'});

          return current.sync({force: true}).then(() => {
            return Promise.join(
              User.create({
                tasks: [
                  {title: 'b'},
                  {title: 'd'},
                  {title: 'c'},
                  {title: 'a'},
                ]
              }, {
                include: [User_Tasks]
              }),
              User.create({
                tasks: [
                  {title: 'a'},
                  {title: 'c'},
                  {title: 'b'},
                ]
              }, {
                include: [User_Tasks]
              })
            );
          }).then(users => {
            return User_Tasks.get(users, {
              limit: 2,
              order: [
                ['title', 'ASC'],
              ]
            }).then(result => {
              expect(result[users[0].id].length).to.equal(2);
              expect(result[users[0].id][0].title).to.equal('a');
              expect(result[users[0].id][1].title).to.equal('b');

              expect(result[users[1].id].length).to.equal(2);
              expect(result[users[1].id][0].title).to.equal('a');
              expect(result[users[1].id][1].title).to.equal('b');
            });
          });
        });

        it('should fetch multiple layers of associations with limit and order with separate=true', function() {
          const User = current.define<ItestInstance, ItestAttribute>('User', {});
          const Task = current.define<ItestInstance, ItestAttribute>('Task', {
            title: new DataTypes.STRING()
          });
          const SubTask = current.define<ItestInstance, ItestAttribute>('SubTask', {
            title: new DataTypes.STRING()
          });

          const User_Tasks = User.hasMany(Task, {as: 'tasks'});
          const Task_SubTasks = Task.hasMany(SubTask, {as: 'subtasks'});

          return current.sync({force: true}).then(() => {
            return Promise.join(
              User.create({
                id: 1,
                tasks: [
                  {title: 'b', subtasks: [
                    {title: 'c'},
                    {title: 'a'},
                  ]},
                  {title: 'd'},
                  {title: 'c', subtasks: [
                    {title: 'b'},
                    {title: 'a'},
                    {title: 'c'},
                  ]},
                  {title: 'a', subtasks: [
                    {title: 'c'},
                    {title: 'a'},
                    {title: 'b'},
                  ]},
                ]
              }, {
                include: [{association: User_Tasks, include: [Task_SubTasks]}]
              }),
              User.create({
                id: 2,
                tasks: [
                  {title: 'a', subtasks: [
                    {title: 'b'},
                    {title: 'a'},
                    {title: 'c'},
                  ]},
                  {title: 'c', subtasks: [
                    {title: 'a'},
                  ]},
                  {title: 'b', subtasks: [
                    {title: 'a'},
                    {title: 'b'},
                  ]},
                ]
              }, {
                include: [{association: User_Tasks, include: [Task_SubTasks]}]
              })
            );
          }).then(() => {
            return User.findAll({
              include: [{
                association: User_Tasks,
                limit: 2,
                order: [['title', 'ASC']],
                separate: true,
                as: 'tasks',
                include: [
                  {
                    association: Task_SubTasks,
                    order: [['title', 'DESC']],
                    separate: true,
                    as: 'subtasks'
                  },
                ]
              }],
              order: [
                ['id', 'ASC'],
              ]
            }).then(users => {
              expect(users[0].tasks.length).to.equal(2);

              expect(users[0].tasks[0].title).to.equal('a');
              expect(users[0].tasks[0].subtasks.length).to.equal(3);
              expect(users[0].tasks[0].subtasks[0].title).to.equal('c');
              expect(users[0].tasks[0].subtasks[1].title).to.equal('b');
              expect(users[0].tasks[0].subtasks[2].title).to.equal('a');

              expect(users[0].tasks[1].title).to.equal('b');
              expect(users[0].tasks[1].subtasks.length).to.equal(2);
              expect(users[0].tasks[1].subtasks[0].title).to.equal('c');
              expect(users[0].tasks[1].subtasks[1].title).to.equal('a');

              expect(users[1].tasks.length).to.equal(2);
              expect(users[1].tasks[0].title).to.equal('a');
              expect(users[1].tasks[0].subtasks.length).to.equal(3);
              expect(users[1].tasks[0].subtasks[0].title).to.equal('c');
              expect(users[1].tasks[0].subtasks[1].title).to.equal('b');
              expect(users[1].tasks[0].subtasks[2].title).to.equal('a');

              expect(users[1].tasks[1].title).to.equal('b');
              expect(users[1].tasks[1].subtasks.length).to.equal(2);
              expect(users[1].tasks[1].subtasks[0].title).to.equal('b');
              expect(users[1].tasks[1].subtasks[1].title).to.equal('a');
            });
          });
        });

        it('should fetch associations for multiple instances with limit and order and a belongsTo relation', function() {
          const User = current.define<ItestInstance, ItestAttribute>('User', {});
          const Task = current.define<ItestInstance, ItestAttribute>('Task', {
            title: new DataTypes.STRING(),
            categoryId: {
              type: new DataTypes.INTEGER(),
              field: 'category_id'
            }
          });
          const Category = current.define<ItestInstance, ItestAttribute>('Category', {});

          const User_Tasks = User.hasMany<ItestInstance, ItestAttribute>(Task, {as: 'tasks'});
          const Task_Category = Task.belongsTo<ItestInstance, ItestAttribute>(Category, {as: 'category', foreignKey: 'categoryId'});

          return current.sync({force: true}).then(() => {
            return Promise.join(
              User.create({
                tasks: [
                  {title: 'b', category: {}},
                  {title: 'd', category: {}},
                  {title: 'c', category: {}},
                  {title: 'a', category: {}},
                ]
              }, {
                include: [{association: User_Tasks, include: [Task_Category]}]
              }),
              User.create({
                tasks: [
                  {title: 'a', category: {}},
                  {title: 'c', category: {}},
                  {title: 'b', category: {}},
                ]
              }, {
                include: [{association: User_Tasks, include: [Task_Category]}]
              })
            );
          }).then(users => {
            return User_Tasks.get(users, {
              limit: 2,
              order: [
                ['title', 'ASC'],
              ],
              include: [Task_Category]
            }).then(result => {
              expect(result[users[0].id].length).to.equal(2);
              expect(result[users[0].id][0].category).to.be.ok;
              expect(result[users[0].id][1].category).to.be.ok;

              expect(result[users[1].id].length).to.equal(2);
              expect(result[users[1].id][0].category).to.be.ok;
              expect(result[users[1].id][1].category).to.be.ok;

              if (dialect !== 'oracle') {
                //As Oracle doesn't have an order by inner mechanism, the results are never ordered in the same way, so we don't pass here
                expect(result[users[0].id][0].title).to.equal('a');
                expect(result[users[0].id][1].title).to.equal('b');
                expect(result[users[1].id][0].title).to.equal('a');
                expect(result[users[1].id][1].title).to.equal('b');
              }
            });
          });
        });

        it('supports schemas', function() {
          const User = current.define<ItestInstance, ItestAttribute>('User', {}).schema('work');
          const Task = current.define<ItestInstance, ItestAttribute>('Task', {
              title: DataTypes.STRING
            }).schema('work');
          const SubTask = current.define<ItestInstance, ItestAttribute>('SubTask', {
              title: DataTypes.STRING
            }).schema('work');

          const User_Tasks = User.hasMany(Task, {as: 'tasks'});
          const Task_SubTasks = Task.hasMany(SubTask, {as: 'subtasks'});

          return current.dropAllSchemas().then(() => {
            return current.createSchema('work');
          }).then(() => {
            return User.sync({force: true});
          }).then(() => {
            return Task.sync({force: true});
          }).then(() => {
            return SubTask.sync({force: true});
          }).then(() => {
            return Promise.join(
              User.create({
                id: 1,
                tasks: [
                  {title: 'b', subtasks: [
                    {title: 'c'},
                    {title: 'a'}]},
                  {title: 'd'},
                  {title: 'c', subtasks: [
                    {title: 'b'},
                    {title: 'a'},
                    {title: 'c'}]},
                  {title: 'a', subtasks: [
                    {title: 'c'},
                    {title: 'a'},
                    {title: 'b'}]
                  }]
              }, {
                include: [{association: User_Tasks, include: [Task_SubTasks]}]
              }),
              User.create({
                id: 2,
                tasks: [
                  {title: 'a', subtasks: [
                    {title: 'b'},
                    {title: 'a'},
                    {title: 'c'}]},
                  {title: 'c', subtasks: [
                    {title: 'a'}]},
                  {title: 'b', subtasks: [
                    {title: 'a'},
                    {title: 'b'}]
                  }]
              }, {
                include: [{association: User_Tasks, include: [Task_SubTasks]}]
              })
            );
          }).then(() => {
            return User.findAll({
              include: [{
                association: User_Tasks,
                limit: 2,
                order: [['title', 'ASC']],
                separate: true,
                as: 'tasks',
                include: [
                  {
                    association: Task_SubTasks,
                    order: [['title', 'DESC']],
                    separate: true,
                    as: 'subtasks'
                  }]
              }],
              order: [
                ['id', 'ASC']]
            }).then(users => {
              expect(users[0].tasks.length).to.equal(2);

              expect(users[0].tasks[0].title).to.equal('a');
              expect(users[0].tasks[0].subtasks.length).to.equal(3);
              expect(users[0].tasks[0].subtasks[0].title).to.equal('c');
              expect(users[0].tasks[0].subtasks[1].title).to.equal('b');
              expect(users[0].tasks[0].subtasks[2].title).to.equal('a');

              expect(users[0].tasks[1].title).to.equal('b');
              expect(users[0].tasks[1].subtasks.length).to.equal(2);
              expect(users[0].tasks[1].subtasks[0].title).to.equal('c');
              expect(users[0].tasks[1].subtasks[1].title).to.equal('a');

              expect(users[1].tasks.length).to.equal(2);
              expect(users[1].tasks[0].title).to.equal('a');
              expect(users[1].tasks[0].subtasks.length).to.equal(3);
              expect(users[1].tasks[0].subtasks[0].title).to.equal('c');
              expect(users[1].tasks[0].subtasks[1].title).to.equal('b');
              expect(users[1].tasks[0].subtasks[2].title).to.equal('a');

              expect(users[1].tasks[1].title).to.equal('b');
              expect(users[1].tasks[1].subtasks.length).to.equal(2);
              expect(users[1].tasks[1].subtasks[0].title).to.equal('b');
              expect(users[1].tasks[1].subtasks[1].title).to.equal('a');
              return current.dropSchema('work').then(() => {
                return current.showAllSchemas().then(schemas => {
                  if (dialect === 'postgres' || dialect === 'mssql') {
                    expect(schemas).to.be.empty;
                  }
                });
              });
            });
          });
        });
      });
    }
  });

  describe('(1:N)', () => {
    describe('hasSingle', () => {
      beforeEach(function() {
        _Article = current.define<ItestInstance, ItestAttribute>('Article', { title: new DataTypes.STRING() });
        _Label = current.define<ItestInstance, ItestAttribute>('Label', { text: new DataTypes.STRING() });

        _Article.hasMany(_Label);

        return current.sync({ force: true });
      });

      it('should only generate one set of foreignKeys', function() {
        _Article = current.define<ItestInstance, ItestAttribute>('Article', { title: new DataTypes.STRING() }, {timestamps: false});
        _Label = current.define<ItestInstance, ItestAttribute>('Label', { text: new DataTypes.STRING() }, {timestamps: false});

        _Label.belongsTo(_Article);
        _Article.hasMany(_Label);

        expect(Object.keys(_Label.rawAttributes)).to.deep.equal(['id', 'text', 'ArticleId']);
        expect(Object.keys(_Label.rawAttributes).length).to.equal(3);
      });

      if (current.dialect.supports.transactions) {
        it('supports transactions', function() {
          return Support.prepareTransactionTest(current).then(sequelize => {
            _sequelize = sequelize;
            _Article = _sequelize.define<ItestInstance, ItestAttribute>('Article', { title: new DataTypes.STRING() });
            _Label = _sequelize.define<ItestInstance, ItestAttribute>('Label', { text: new DataTypes.STRING() });

            _Article.hasMany(_Label);

            return _sequelize.sync({ force: true });
          }).then(() => {
            return Promise.all([
              _Article.create({ title: 'foo' }),
              _Label.create({ text: 'bar' }),
            ]);
          }).spread((article, label) => {
            _article = article;
            _label = label;
            return _sequelize.transaction();
          }).then(t => {
            _t = t;
            return _article.setLinkedData('Label', [_label], { transaction: t });
          }).then(() => {
            return _Article.all({ transaction: _t });
          }).then(articles => {
            return articles[0].hasLinkedData('Label', _label).then(hasLabel => {
              expect(hasLabel).to.be.false;
            });
          }).then(() => {
            return _Article.all({ transaction: _t });
          }).then(articles => {
            return articles[0].hasLinkedData('Label', _label, { transaction: _t }).then(hasLabel => {
              expect(hasLabel).to.be.true;
              return _t.rollback();
            });
          });
        });
      }

      it('does not have any labels assigned to it initially', function() {
        return Promise.all([
          _Article.create({ title: 'Article' }),
          _Label.create({ text: 'Awesomeness' }),
          _Label.create({ text: 'Epicness' }),
        ]).spread((article, label1, label2) => {
          return Promise.all([
            article.hasLinkedData('Label', label1),
            article.hasLinkedData('Label', label2),
          ]);
        }).spread((hasLabel1, hasLabel2) => {
          expect(hasLabel1).to.be.false;
          expect(hasLabel2).to.be.false;
        });
      });

      it('answers true if the label has been assigned', function() {
        return Promise.all([
          _Article.create({ title: 'Article' }),
          _Label.create({ text: 'Awesomeness' }),
          _Label.create({ text: 'Epicness' }),
        ]).spread((article, label1, label2) => {
          return article.addLinkedData('Label', label1).then(() => {
            return Promise.all([
              article.hasLinkedData('Label', label1),
              article.hasLinkedData('Label', label2),
            ]);
          });
        }).spread((hasLabel1, hasLabel2) => {
          expect(hasLabel1).to.be.true;
          expect(hasLabel2).to.be.false;
        });
      });

      it('answers correctly if the label has been assigned when passing a primary key instead of an object', function() {
        return Promise.all([
          _Article.create({ title: 'Article' }),
          _Label.create({ text: 'Awesomeness' }),
          _Label.create({ text: 'Epicness' }),
        ]).spread((article, label1, label2) => {
          return article.addLinkedData('Label', label1).then(() => {
            return Promise.all([
              article.hasLinkedData('Label', label1.id),
              article.hasLinkedData('Label', label2.id),
            ]);
          });
        }).spread((hasLabel1, hasLabel2) => {
          expect(hasLabel1).to.be.true;
          expect(hasLabel2).to.be.false;
        });
      });
    });

    describe('hasAll', () => {
      beforeEach(function() {
        _Article = current.define<ItestInstance, ItestAttribute>('Article', {
          title: new DataTypes.STRING()
        });
        _Label = current.define<ItestInstance, ItestAttribute>('Label', {
          text: new DataTypes.STRING()
        });

        _Article.hasMany(_Label);

        return current.sync({ force: true });
      });

      if (current.dialect.supports.transactions) {
        it('supports transactions', function() {
          return Support.prepareTransactionTest(current).bind({}).then(function(sequelize) {
            _sequelize = sequelize;
            _Article = _sequelize.define<ItestInstance, ItestAttribute>('Article', { title: new DataTypes.STRING() });
            _Label = _sequelize.define<ItestInstance, ItestAttribute>('Label', { text: new DataTypes.STRING() });

            _Article.hasMany(_Label);

            return _sequelize.sync({ force: true });
          }).then(function() {
            return Promise.all([
              _Article.create({ title: 'foo' }),
              _Label.create({ text: 'bar' }),
            ]);
          }).spread(function(article, label) {
            _article = article;
            _label = label;
            return _sequelize.transaction();
          }).then(function(t) {
            _t = t;
            return _article.setLinkedData('Label', [_label], { transaction: t });
          }).then(function() {
            return _Article.all({ transaction: _t });
          }).then(function(articles) {
            return Promise.all([
              articles[0].hasLinkedData('Label', [_label]),
              articles[0].hasLinkedData('Label', [_label], { transaction: _t }),
            ]);
          }).spread(function(hasLabel1, hasLabel2) {
            expect(hasLabel1).to.be.false;
            expect(hasLabel2).to.be.true;

            return _t.rollback();
          });
        });
      }

      it('answers false if only some labels have been assigned', function() {
        return Promise.all([
          _Article.create({ title: 'Article' }),
          _Label.create({ text: 'Awesomeness' }),
          _Label.create({ text: 'Epicness' }),
        ]).spread((article, label1, label2) => {
          return article.addLinkedData('Label', label1).then(() => {
            return article.hasLinkedData('Label', [label1, label2]);
          });
        }).then(result => {
          expect(result).to.be.false;
        });
      });

      it('answers false if only some labels have been assigned when passing a primary key instead of an object', function() {
        return Promise.all([
          _Article.create({ title: 'Article' }),
          _Label.create({ text: 'Awesomeness' }),
          _Label.create({ text: 'Epicness' }),
        ]).spread((article, label1, label2) => {
          return article.addLinkedData('Label', label1).then(() => {
            return article.hasLinkedData('Label', [label1.id, label2.id]).then(result => {
              expect(result).to.be.false;
            });
          });
        });
      });

      it('answers true if all label have been assigned', function() {
        return Promise.all([
          _Article.create({ title: 'Article' }),
          _Label.create({ text: 'Awesomeness' }),
          _Label.create({ text: 'Epicness' }),
        ]).spread((article, label1, label2) => {
          return article.setLinkedData('Label', [label1, label2]).then(() => {
            return article.hasLinkedData('Label', [label1, label2]).then(result => {
              expect(result).to.be.true;
            });
          });
        });
      });

      it('answers true if all label have been assigned when passing a primary key instead of an object', function() {
        return Promise.all([
          _Article.create({ title: 'Article' }),
          _Label.create({ text: 'Awesomeness' }),
          _Label.create({ text: 'Epicness' }),
        ]).spread((article, label1, label2) => {
          return article.setLinkedData('Label', [label1, label2]).then(() => {
            return article.hasLinkedData('Label', [label1.id, label2.id]).then(result => {
              expect(result).to.be.true;
            });
          });
        });
      });
    });

    describe('setAssociations', () => {

      if (current.dialect.supports.transactions) {
        it('supports transactions', function() {
          return Support.prepareTransactionTest(current).bind({}).then(function(sequelize) {
            _Article = (sequelize as Sequelize).define<ItestInstance, ItestAttribute>('Article', { title: new DataTypes.STRING() });
            _Label = (sequelize as Sequelize).define<ItestInstance, ItestAttribute>('Label', { text: new DataTypes.STRING() });

            _Article.hasMany(_Label);

            _sequelize = sequelize;
            return _sequelize.sync({ force: true });
          }).then(function() {
            return Promise.all([
              _Article.create({ title: 'foo' }),
              _Label.create({ text: 'bar' }),
              _sequelize.transaction(),
            ]);
          }).spread(function(article, label, t) {
            _article = article;
            _t = t;
            return article.setLinkedData('Label', [label], { transaction: t });
          }).then(function() {
            return _Label.findAll({ where: { ArticleId: _article.id }, transaction: undefined });
          }).then(function(labels) {
            expect(labels.length).to.equal(0);

            return _Label.findAll({ where: { ArticleId: _article.id }, transaction: _t });
          }).then(function(labels) {
            expect(labels.length).to.equal(1);
            return _t.rollback();
          });
        });
      }

      it('clears associations when passing null to the set-method', function() {
        const User = current.define<ItestInstance, ItestAttribute>('User', { username: new DataTypes.STRING() });
        const Task = current.define<ItestInstance, ItestAttribute>('Task', { title: new DataTypes.STRING() });

        Task.hasMany(User);

        return current.sync({ force: true }).then(() => {
          return Promise.all([
            User.create({ username: 'foo' }),
            Task.create({ title: 'task' }),
          ]);
        }).bind({}).spread(function(user, task) {
          _task = task;
          return task.setLinkedData('User', [user]);
        }).then(function() {
          return _task.getManyLinkedData<ItestInstance, ItestAttribute>('User');
        }).then(function(users) {
          expect(users).to.have.length(1);

          return _task.setLinkedData('User', null);
        }).then(function() {
          return _task.getManyLinkedData<ItestInstance, ItestAttribute>('User');
        }).then(users => {
          expect(users).to.have.length(0);
        });
      });

      it('supports passing the primary key instead of an object', function() {
        const Article = current.define<ItestInstance, ItestAttribute>('Article', { title: new DataTypes.STRING() });
        const Label = current.define<ItestInstance, ItestAttribute>('Label', { text: new DataTypes.STRING() });

        Article.hasMany(Label);

        return current.sync({ force: true }).then(() => {
          return Promise.all([
            Article.create({}),
            Label.create({ text: 'label one' }),
            Label.create({ text: 'label two' }),
          ]);
        }).bind({}).spread(function(article, label1, label2) {
          _article = article;
          _label2 = label2;
          return article.addLinkedData('Label', label1.id);
        }).then(function() {
          return _article.setLinkedData('Label', [_label2.id]);
        }).then(function() {
          return _article.getManyLinkedData<ItestInstance, ItestAttribute>('Label');
        }).then(labels => {
          expect(labels).to.have.length(1);
          expect(labels[0].text).to.equal('label two');
        });
      });
    });

    describe('addAssociations', () => {
      if (current.dialect.supports.transactions) {
        it('supports transactions', function() {
          return Support.prepareTransactionTest(current).bind({}).then(function(sequelize) {
            _Article = (sequelize as Sequelize).define<ItestInstance, ItestAttribute>('Article', { title: new DataTypes.STRING() });
            _Label = (sequelize as Sequelize).define<ItestInstance, ItestAttribute>('Label', { text: new DataTypes.STRING() });
            _Article.hasMany(_Label);

            _sequelize = sequelize;
            return _sequelize.sync({ force: true });
          }).then(function() {
            return Promise.all([
              _Article.create({ title: 'foo' }),
              _Label.create({ text: 'bar' }),
            ]);
          }).spread(function(article, label) {
            _article = article;
            _label = label;
            return _sequelize.transaction();
          }).then(function(t) {
            _t = t;
            return _article.addLinkedData('Label', _label, { transaction: _t });
          }).then(function() {
            return _Label.findAll({ where: { ArticleId: _article.id }, transaction: undefined });
          }).then(function(labels) {
            expect(labels.length).to.equal(0);

            return _Label.findAll({ where: { ArticleId: _article.id }, transaction: _t });
          }).then(function(labels) {
            expect(labels.length).to.equal(1);
            return _t.rollback();
          });
        });
      }

      it('supports passing the primary key instead of an object', function() {
        const Article = current.define<ItestInstance, ItestAttribute>('Article', { title: new DataTypes.STRING() });
        const Label = current.define<ItestInstance, ItestAttribute>('Label', { text: new DataTypes.STRING() });

        Article.hasMany(Label);

        return current.sync({ force: true }).then(() => {
          return Promise.all([
            Article.create({}),
            Label.create({ text: 'label one' }),
          ]);
        }).bind({}).spread(function(article, label) {
          _article = article;
          return article.addLinkedData('Label', label.id);
        }).then(function() {
          return _article.getManyLinkedData<ItestInstance, ItestAttribute>('Label');
        }).then(labels => {
          expect(labels[0].text).to.equal('label one'); // Make sure that we didn't modify one of the other attributes while building / saving a new instance
        });
      });
    });

    describe('addMultipleAssociations', () => {
      it('adds associations without removing the current ones', function() {
        const User = current.define<ItestInstance, ItestAttribute>('User', { username: new DataTypes.STRING() });
        const Task = current.define<ItestInstance, ItestAttribute>('Task', { title: new DataTypes.STRING() });

        Task.hasMany(User);

        return current.sync({ force: true }).then(() => {
          return User.bulkCreate([
            { username: 'foo '},
            { username: 'bar '},
            { username: 'baz '},
          ]);
        }).bind({}).then(() => {
          return Task.create({ title: 'task' });
        }).then(function(task) {
          _task = task;
          return User.findAll();
        }).then(function(users) {
          _users = users;
          return _task.setLinkedData('User', [users[0]]);
        }).then(function() {
          return _task.addLinkedData('User', [_users[1], _users[2]]);
        }).then(function() {
          return _task.getManyLinkedData<ItestInstance, ItestAttribute>('User');
        }).then(users => {
          expect(users).to.have.length(3);
        });
      });

      it('handles decent sized bulk creates', function() {
        const User = current.define<ItestInstance, ItestAttribute>('User', { username: new DataTypes.STRING(), num: new DataTypes.INTEGER(), status: new DataTypes.STRING() });
        const Task = current.define<ItestInstance, ItestAttribute>('Task', { title: new DataTypes.STRING() });

        Task.hasMany(User);

        return current.sync({ force: true }).then(() => {
          const users = _.range(1000).map(i => ({username: 'user' + i, num: i, status: 'live'}));
          return User.bulkCreate(users);
        }).bind({}).then(() => {
          return Task.create({ title: 'task' });
        }).then(function(task) {
          _task = task;
          return User.findAll();
        }).then(users => {
          expect(users).to.have.length(1000);
        });
      });
    });
    it('clears associations when passing null to the set-method with omitNull set to true', function() {
      current.options.omitNull = true;

      const User = current.define<ItestInstance, ItestAttribute>('User', { username: new DataTypes.STRING() });
      const Task = current.define<ItestInstance, ItestAttribute>('Task', { title: new DataTypes.STRING() });

      Task.hasMany(User);

      return current.sync({ force: true }).then(() => {
        return User.create({ username: 'foo' });
      }).bind({}).then(function(user) {
        _user = user;
        return Task.create({ title: 'task' });
      }).then(function(task) {
        _task = task;
        return task.setLinkedData('User', [_user]);
      }).then(function() {
        return _task.getManyLinkedData<ItestInstance, ItestAttribute>('User');
      }).then(function(users) {
        expect(users).to.have.length(1);

        return _task.setLinkedData('User', null);
      }).then(function() {
        return _task.getManyLinkedData<ItestInstance, ItestAttribute>('User');
      }).then(users => {
        expect(users).to.have.length(0);
      }).finally(() => {
        current.options.omitNull = false;
      });
    });

    describe('createAssociations', () => {
      it('creates a new associated object', function() {
        const Article = current.define<ItestInstance, ItestAttribute>('Article', { title: new DataTypes.STRING() });
        const Label = current.define<ItestInstance, ItestAttribute>('Label', { text: new DataTypes.STRING() });

        Article.hasMany(Label);

        return current.sync({ force: true }).then(() => {
          return Article.create({ title: 'foo' });
        }).then(article => {
          return article.createLinkedData<ItestInstance, ItestAttribute>('Label', { text: 'bar' }).return (article);
        }).then(article => {
          return Label.findAll({ where: { ArticleId: article.id }});
        }).then(labels => {
          expect(labels.length).to.equal(1);
        });
      });

      it('creates the object with the association directly', function() {
        const spy = sinon.spy();

        const Article = current.define<ItestInstance, ItestAttribute>('Article', {
          title: new DataTypes.STRING()

        });
        const Label = current.define<ItestInstance, ItestAttribute>('Label', {
          text: new DataTypes.STRING()
        });

        Article.hasMany(Label);

        return current.sync({ force: true }).then(() => {
          return Article.create({ title: 'foo' });
        }).bind({}).then(function(article) {
          _article = article;
          return article.createLinkedData<ItestInstance, ItestAttribute>('Label', { text: 'bar' }, {logging: spy});
        }).then(function(label) {
          expect(spy.calledOnce).to.be.true;
          expect(label.ArticleId).to.equal(_article.id);
        });
      });

      if (current.dialect.supports.transactions) {
        it('supports transactions', function() {
          return Support.prepareTransactionTest(current).bind({}).then(function(sequelize) {
            _sequelize = sequelize;
            _Article = _sequelize.define<ItestInstance, ItestAttribute>('Article', { title: new DataTypes.STRING() });
            _Label = _sequelize.define<ItestInstance, ItestAttribute>('Label', { text: new DataTypes.STRING() });

            _Article.hasMany(_Label);

            return _sequelize.sync({ force: true});
          }).then(function() {
            return _Article.create({ title: 'foo' });
          }).then(function(article) {
            _article = article;
            return _sequelize.transaction();
          }).then(function(t) {
            _t = t;
            return _article.createLinkedData<ItestInstance, ItestAttribute>('Label', { text: 'bar' }, { transaction: _t });
          }).then(function() {
            return _Label.findAll();
          }).then(function(labels) {
            expect(labels.length).to.equal(0);
            return _Label.findAll({ where: { ArticleId: _article.id }});
          }).then(function(labels) {
            expect(labels.length).to.equal(0);
            return _Label.findAll({ where: { ArticleId: _article.id }, transaction: _t });
          }).then(function(labels) {
            expect(labels.length).to.equal(1);
            return _t.rollback();
          });
        });
      }

      it('supports passing the field option', function() {
        const Article = current.define<ItestInstance, ItestAttribute>('Article', {
          title: new DataTypes.STRING()
        });
        const Label = current.define<ItestInstance, ItestAttribute>('Label', {
          text: new DataTypes.STRING()
        });

        Article.hasMany(Label);

        return current.sync({force: true}).then(() => {
          return Article.create();
        }).then(article => {
          return article.createLinkedData<ItestInstance, ItestAttribute>('Label', {
            text: 'yolo'
          }, {
            fields: ['text']
          }).return (article);
        }).then(article => {
          return article.getManyLinkedData<ItestInstance, ItestAttribute>('Label');
        }).then(labels => {
          expect(labels.length).to.be.ok;
        });
      });
    });

    describe('getting assocations with options', () => {
      beforeEach(function() {

        _User = current.define<ItestInstance, ItestAttribute>('User', { username: new DataTypes.STRING() });
        _Task = current.define<ItestInstance, ItestAttribute>('Task', { title: new DataTypes.STRING(), active: new DataTypes.BOOLEAN() });

        _User.hasMany(_Task);

        return current.sync({ force: true }).then(() => {
          return Promise.all([
            _User.create({ username: 'John'}),
            _Task.create({ title: 'Get rich', active: true}),
            _Task.create({ title: 'Die trying', active: false}),
          ]);
        }).spread((john, task1, task2) => {
          return john.setLinkedData('Task', [task1, task2]);
        });
      });

      if (dialect !== 'oracle') {
        it('should treat the where object of associations as a first class citizen', function() {
          _Article = current.define<ItestInstance, ItestAttribute>('Article', {
            title: new DataTypes.STRING()
          });
          _Label = current.define<ItestInstance, ItestAttribute>('Label', {
            text: new DataTypes.STRING(),
            until: new DataTypes.DATE()
          });

          _Article.hasMany(_Label);

          return current.sync({ force: true }).then(() => {
            return Promise.all([
              _Article.create({ title: 'Article' }),
              _Label.create({ text: 'Awesomeness', until: '2014-01-01 01:00:00' }),
              _Label.create({ text: 'Epicness', until: '2014-01-03 01:00:00' }),
            ]);
          }).bind({}).spread(function(article, label1, label2) {
            _article = article;
            return article.setLinkedData('Label', [label1, label2]);
          }).then(function() {
            return _article.getManyLinkedData<ItestInstance, ItestAttribute>('Label', {where: {until: {$gt: moment('2014-01-02').toDate()}}});
          }).then(labels => {
            expect(labels).to.be.instanceof(Array);
            expect(labels).to.have.length(1);
            expect(labels[0].text).to.equal('Epicness');
          });
        });
      }

      it('gets all associated objects when no options are passed', function() {
        return _User.find({where: {username: 'John'}}).then(john => {
          return john.getManyLinkedData<ItestInstance, ItestAttribute>('Task');
        }).then(tasks => {
          expect(tasks).to.have.length(2);
        });
      });

      it('only get objects that fulfill the options', function() {
        return _User.find({ where: { username: 'John' } }).then(john => {
          return john.getManyLinkedData<ItestInstance, ItestAttribute>('Task', { where: { active: true }, limit: 10, order: [['id', 'DESC']]});
        }).then(tasks => {
          expect(tasks).to.have.length(1);
        });
      });
    });

    describe('countAssociations', () => {
      beforeEach(function() {

        _User = current.define<ItestInstance, ItestAttribute>('User', { username: new DataTypes.STRING() });
        _Task = current.define<ItestInstance, ItestAttribute>('Task', { title: new DataTypes.STRING(), active: new DataTypes.BOOLEAN() });

        _User.hasMany(_Task, {
          foreignKey: 'userId'
        });

        return current.sync({ force: true }).then(() => {
          return Promise.all([
            _User.create({ username: 'John'}),
            _Task.create({ title: 'Get rich', active: true}),
            _Task.create({ title: 'Die trying', active: false}),
          ]);
        }).spread((john, task1, task2) => {
          _user = john;
          return john.setLinkedData('Task', [task1, task2]);
        });
      });

      it('should count all associations', function() {
        return expect(_user.countLinkedData('Task', {})).to.eventually.equal(2);
      });

      it('should count filtered associations', function() {
        return expect(_user.countLinkedData('Task', {
          where: {
            active: true
          }
        })).to.eventually.equal(1);
      });

      it('should count scoped associations', function() {
        _User.hasMany(_Task, {
          foreignKey: 'userId',
          as: 'activeTasks',
          scope: {
            active: true
          }
        });

        return expect(_user.countLinkedData({ model : 'Task', associationAlias : 'activeTasks' }, {})).to.eventually.equal(1);
      });
    });

    describe('selfAssociations', () => {
      it('should work with alias', function() {
        const Person = current.define<ItestInstance, ItestAttribute>('Group', {});

        Person.hasMany(Person, { as: 'Children'});

        return current.sync();
      });
    });
  });

  describe('foreign key constraints', () => {
    describe('1:m', () => {
      it('sets null by default', function() {
        const Task = current.define<ItestInstance, ItestAttribute>('Task', { title: new DataTypes.STRING() });
        const User = current.define<ItestInstance, ItestAttribute>('User', { username: new DataTypes.STRING() });

        User.hasMany(Task);

        return current.sync({ force: true }).then(() => {
          return Promise.all([
            User.create({ username: 'foo' }),
            Task.create({ title: 'task' }),
          ]);
        }).spread((user, task) => {
          return user.setLinkedData('Task', [task]).then(() => {
            return user.destroy().then(() => {
              return task.reload();
            });
          });
        }).then(task => {
          expect(task.UserId).to.equal(null);
        });
      });

      it('sets to CASCADE if allowNull: false', function() {
        const Task = current.define<ItestInstance, ItestAttribute>('Task', { title: new DataTypes.STRING() });
        const User = current.define<ItestInstance, ItestAttribute>('User', { username: new DataTypes.STRING() });

        User.hasMany(Task, { foreignKey: { allowNull: false }}); // defaults to CASCADE

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

      it('should be possible to remove all constraints', function() {
        const Task = current.define<ItestInstance, ItestAttribute>('Task', { title: new DataTypes.STRING() });
        const User = current.define<ItestInstance, ItestAttribute>('User', { username: new DataTypes.STRING() });

        User.hasMany(Task, { constraints: false });

        return current.sync({ force: true }).bind({}).then(() => {
          return Promise.all([
            User.create({ username: 'foo' }),
            Task.create({ title: 'task' }),
          ]);
        }).spread(function(user, task) {
          _user = user;
          _task = task;
          return user.setLinkedData('Task', [task]);
        }).then(function() {
          return _user.destroy();
        }).then(function() {
          return _task.reload();
        }).then(function(task) {
          expect(task.UserId).to.equal(_user.id);
        });
      });

      it('can cascade deletes', function() {
        const Task = current.define<ItestInstance, ItestAttribute>('Task', { title: new DataTypes.STRING() });
        const User = current.define<ItestInstance, ItestAttribute>('User', { username: new DataTypes.STRING() });

        User.hasMany(Task, {onDelete: 'cascade'});

        return current.sync({ force: true }).bind({}).then(() => {
          return Promise.all([
            User.create({ username: 'foo' }),
            Task.create({ title: 'task' }),
          ]);
        }).spread(function(user, task) {
          _user = user;
          _task = task;
          return user.setLinkedData('Task', [task]);
        }).then(function() {
          return _user.destroy();
        }).then(() => {
          return Task.findAll();
        }).then(tasks => {
          expect(tasks).to.have.length(0);
        });
      });

      // NOTE: mssql does not support changing an autoincrement primary key
      // NOTE: oracle does not support cascade constrait -> ORA-02292: integrity constraint - child record found
      if (dialect !== 'mssql' && dialect !== 'oracle') {
        it('can cascade updates', function() {
          const Task = current.define<ItestInstance, ItestAttribute>('Task', { title: new DataTypes.STRING() });
          const User = current.define<ItestInstance, ItestAttribute>('User', { username: new DataTypes.STRING() });

          User.hasMany(Task, {onUpdate: 'cascade'});

          return current.sync({ force: true }).then(() => {
            return Promise.all([
              User.create({ username: 'foo' }),
              Task.create({ title: 'task' }),
            ]);
          }).spread((user, task) => {
            return user.setLinkedData('Task', [task]).return (user);
          }).then(user => {
            // Changing the id of a DAO requires a little dance since
            // the `UPDATE` query generated by `save()` uses `id` in the
            // `WHERE` clause

            const tableName = user.sequelize.getQueryInterface().QueryGenerator.addSchema(user.model);
            return user.sequelize.getQueryInterface().update(user, tableName, {id: 999}, {id: user.id});
          }).then(() => {
            return Task.findAll();
          }).then(tasks => {
            expect(tasks).to.have.length(1);
            expect(tasks[0].UserId).to.equal(999);
          });
        });
      }

      if (current.dialect.supports.constraints.restrict) {
        it('can restrict deletes', function() {
          const Task = current.define<ItestInstance, ItestAttribute>('Task', { title: new DataTypes.STRING() });
          const User = current.define<ItestInstance, ItestAttribute>('User', { username: new DataTypes.STRING() });

          User.hasMany(Task, {onDelete: 'restrict'});

          return current.sync({ force: true }).bind({}).then(() => {
            return Promise.all([
              User.create({ username: 'foo' }),
              Task.create({ title: 'task' }),
            ]);
          }).spread(function(user, task) {
            _user = user;
            _task = task;
            return user.setLinkedData('Task', [task]);
          }).then(function() {
            return _user.destroy().catch (_sequelize.ForeignKeyConstraintError, () => {
              // Should fail due to FK violation
              return Task.findAll();
            });
          }).then(tasks => {
            expect(tasks).to.have.length(1);
          });
        });

        it('can restrict updates', function() {
          const Task = current.define<ItestInstance, ItestAttribute>('Task', { title: new DataTypes.STRING() });
          const User = current.define<ItestInstance, ItestAttribute>('User', { username: new DataTypes.STRING() });

          User.hasMany(Task, {onUpdate: 'restrict'});

          return current.sync({ force: true }).then(() => {
            return Promise.all([
              User.create({ username: 'foo' }),
              Task.create({ title: 'task' }),
            ]);
          }).spread((user, task) => {
            return user.setLinkedData('Task', [task]).return (user);
          }).then(user => {
            // Changing the id of a DAO requires a little dance since
            // the `UPDATE` query generated by `save()` uses `id` in the
            // `WHERE` clause

            const tableName = user.sequelize.getQueryInterface().QueryGenerator.addSchema(user.model);
            return user.sequelize.getQueryInterface().update(user, tableName, {id: 999}, {id: user.id})
              .catch (_sequelize.ForeignKeyConstraintError, () => {
              // Should fail due to FK violation
                return Task.findAll();
              });
          }).then(tasks => {
            expect(tasks).to.have.length(1);
          });
        });
      }
    });
  });

  describe('Association options', () => {
    it('should setup underscored field with foreign keys when using underscored', function() {
      const User = current.define<ItestInstance, ItestAttribute>('User', { username: new DataTypes.STRING() }, { underscored: true });
      const Account = current.define<ItestInstance, ItestAttribute>('Account', { name: new DataTypes.STRING() }, { underscored: true });

      User.hasMany(Account);

      expect(Account.rawAttributes.UserId).to.exist;
      expect(Account.rawAttributes.UserId.field).to.equal('user_id');
    });

    it('should use model name when using camelcase', function() {
      const User = current.define<ItestInstance, ItestAttribute>('User', { username: new DataTypes.STRING() }, { underscored: false });
      const Account = current.define<ItestInstance, ItestAttribute>('Account', { name: new DataTypes.STRING() }, { underscored: false });

      User.hasMany(Account);

      expect(Account.rawAttributes.UserId).to.exist;
      expect(Account.rawAttributes.UserId.field).to.equal('UserId');
    });

    it('can specify data type for autogenerated relational keys', function() {
      const User = current.define<ItestInstance, ItestAttribute>('UserXYZ', { username: new DataTypes.STRING() });
      const dataTypes = [DataTypes.INTEGER, DataTypes.BIGINT, DataTypes.STRING];
      const Tasks = {};

      return Promise.each(dataTypes, dataType => {
        const tableName = 'TaskXYZ_' + dataType.key;
        Tasks[dataType] = current.define<ItestInstance, ItestAttribute>(tableName, { title: new DataTypes.STRING() });

        User.hasMany(Tasks[dataType], { foreignKey: 'userId', keyType: dataType, constraints: false });

        return Tasks[dataType].sync({ force: true }).then(() => {
          expect(Tasks[dataType].rawAttributes.userId.type).to.be.an.instanceof(dataType);
        });
      });
    });

    it('infers the keyType if none provided', function() {
      const User = current.define<ItestInstance, ItestAttribute>('User', {
        id: { type: new DataTypes.STRING(), primaryKey: true },
        username: new DataTypes.STRING()
      });
      const Task = current.define<ItestInstance, ItestAttribute>('Task', {
        title: new DataTypes.STRING()
      });

      User.hasMany(Task);

      return current.sync({ force: true }).then(() => {
        expect(Task.rawAttributes.UserId.type instanceof DataTypes.STRING).to.be.ok;
      });
    });

    describe('allows the user to provide an attribute definition object as foreignKey', () => {
      it('works with a column that hasnt been defined before', function() {
        const Task = current.define<ItestInstance, ItestAttribute>('task', {});
        const User = current.define<ItestInstance, ItestAttribute>('user', {});

        User.hasMany(Task, {
          foreignKey: {
            name: 'uid',
            allowNull: false
          }
        });

        expect(Task.rawAttributes.uid).to.be.ok;
        expect(Task.rawAttributes.uid.allowNull).to.be.false;
        expect(Task.rawAttributes.uid.references.model).to.equal(User.getTableName());
        expect(Task.rawAttributes.uid.references.key).to.equal('id');
      });

      it('works when taking a column directly from the object', function() {
        const Project = current.define<ItestInstance, ItestAttribute>('project', {
          user_id: {
            type: new DataTypes.INTEGER(),
            defaultValue: 42
          }
        });
        const User = current.define<ItestInstance, ItestAttribute>('user', {
          uid: {
            type: new DataTypes.INTEGER(),
            primaryKey: true
          }
        });

        User.hasMany(Project, { foreignKey: Project.rawAttributes.user_id });

        expect(Project.rawAttributes.user_id).to.be.ok;
        expect(Project.rawAttributes.user_id.references.model).to.equal(User.getTableName());
        expect(Project.rawAttributes.user_id.references.key).to.equal('uid');
        expect(Project.rawAttributes.user_id.defaultValue).to.equal(42);
      });

      it('works when merging with an existing definition', function() {
        const Task = current.define<ItestInstance, ItestAttribute>('task', {
          userId: {
            defaultValue: 42,
            type: new DataTypes.INTEGER()
          }
        });
        const User = current.define<ItestInstance, ItestAttribute>('user', {});

        User.hasMany(Task, { foreignKey: { allowNull: true }});

        expect(Task.rawAttributes.userId).to.be.ok;
        expect(Task.rawAttributes.userId.defaultValue).to.equal(42);
        expect(Task.rawAttributes.userId.allowNull).to.be.ok;
      });
    });

    it('should throw an error if foreignKey and as result in a name clash', function() {
      const User = current.define<ItestInstance, ItestAttribute>('user', {
        user: new DataTypes.INTEGER()
      });

      expect(User.hasMany.bind(User, User, { as: 'user' })).to
        .throw ('Naming collision between attribute \'user\' and association \'user\' on model user. To remedy this, change either foreignKey or as in your association definition');
    });
  });

  describe('sourceKey', () => {
    beforeEach(function() {
      const User = current.define<ItestInstance, ItestAttribute>('UserXYZ',
        { username: new DataTypes.STRING(), email: new DataTypes.STRING() },
        { indexes: [{fields: ['email'], unique: true}] }
      );
      const Task = current.define<ItestInstance, ItestAttribute>('TaskXYZ',
        { title: new DataTypes.STRING(), userEmail: { type: new DataTypes.STRING(), field: 'user_email_xyz'} });

      User.hasMany(Task, {foreignKey: 'userEmail', sourceKey: 'email', as: 'tasks'});

      _User = User;
      _Task = Task;

      return current.sync({ force: true });
    });

    it('should use sourceKey', function() {
      const User = _User;
      const Task = _Task;

      return User.create({ username: 'John', email: 'john@example.com' }).then(user => {
        return Task.create({title: 'Fix PR', userEmail: 'john@example.com'}).then(() => {
          return user.getManyLinkedData<ItestInstance, ItestAttribute>('TaskXYZ').then(tasks => {
            expect(tasks.length).to.equal(1);
            expect(tasks[0].title).to.equal('Fix PR');
          });
        });
      });
    });

    it('should count related records', function() {
      const User = _User;
      const Task = _Task;

      return User.create({ username: 'John', email: 'john@example.com' }).then(user => {
        return Task.create({title: 'Fix PR', userEmail: 'john@example.com'}).then(() => {
          return user.countLinkedData('TaskXYZ').then(tasksCount => {
            expect(tasksCount).to.equal(1);
          });
        });
      });
    });

    it('should set right field when add relative', function() {
      const User = _User;
      const Task = _Task;

      return User.create({ username: 'John', email: 'john@example.com' }).then(user => {
        return Task.create({title: 'Fix PR'}).then(task => {
          return user.addLinkedData('TaskXYZ', task).then(() => {
            return user.hasLinkedData('TaskXYZ', task.id).then(hasTask => {
              expect(hasTask).to.be.true;
            });
          });
        });
      });
    });

    it('should create with nested associated models', function() {
      const User = _User;
      const values = {
        username: 'John',
        email: 'john@example.com',
        tasks: [{ title: 'Fix new PR' }]
      };

      return User.create(values, { include: ['tasks'] })
        .then(user => {
          // Make sure tasks are defined for created user
          expect(user).to.have.property('tasks');
          expect(user.tasks).to.be.an('array');
          expect(user.tasks).to.lengthOf(1);
          expect(user.tasks[0].title).to.be.equal(values.tasks[0].title, 'task title is correct');

          return User.findOne({ where: { email: values.email } });
        })
        .then(user =>
          user.getManyLinkedData<ItestInstance, ItestAttribute>('TaskXYZ')
            .then(tasks => {
              // Make sure tasks relationship is successful
              expect(tasks).to.be.an('array');
              expect(tasks).to.lengthOf(1);
              expect(tasks[0].title).to.be.equal(values.tasks[0].title, 'task title is correct');
            }));
    });
  });

  describe('sourceKey with where clause in include', () => {
    beforeEach(function() {
      _User = current.define<ItestInstance, ItestAttribute>('User',
        { username: new DataTypes.STRING(), email: { type: new DataTypes.STRING(), field: 'mail'} },
        { indexes: [{fields: ['mail'], unique: true}] }
      );
      _Task = current.define<ItestInstance, ItestAttribute>('Task',
        { title: new DataTypes.STRING(), userEmail: new DataTypes.STRING(), taskStatus: new DataTypes.STRING() });

      _User.hasMany(_Task, {
        foreignKey: 'userEmail',
        sourceKey: 'email'
      });

      return current.sync({ force: true });
    });

    it('should use the specified sourceKey instead of the primary key', function() {
      return _User.create({ username: 'John', email: 'john@example.com'}).then(() =>
        _Task.bulkCreate([
          {title: 'Active Task', userEmail: 'john@example.com', taskStatus: 'Active'},
          {title: 'Inactive Task', userEmail: 'john@example.com', taskStatus: 'Inactive'},
        ])
      ).then(() =>
        _User.find({
          include: [
            {
              model: _Task,
              where: {taskStatus: 'Active'}
            },
          ],
          where: {username: 'John'}
        })
      ).then(user => {
        expect(user).to.be.ok;
        expect(user.Tasks.length).to.equal(1);
        expect(user.Tasks[0].title).to.equal('Active Task');
      });
    });
  });
});
