'use strict';

import * as chai from 'chai';
import * as _ from 'lodash';
import * as sinon from 'sinon';
import { Model, Sequelize } from '../../../index';
import DataTypes from '../../../lib/data-types';
import { Transaction } from '../../../lib/transaction';
import { ItestAttribute, ItestInstance } from '../../dummy/dummy-data-set';
import Support from '../support';
const expect = chai.expect;
const Promise = Sequelize.Promise;
const current = Support.sequelize;
const dialect = Support.getTestDialect();

describe(Support.getTestDialectTeaser('BelongsToMany'), () => {
  let _User : Model<ItestInstance, ItestAttribute>;
  let _Task : Model<ItestInstance, ItestAttribute>;
  let _UserTask : Model<ItestInstance, ItestAttribute>;
  let _Project : Model<ItestInstance, ItestAttribute>;
  let _Group : Model<ItestInstance, ItestAttribute>;
  let _UserTasks : Model<ItestInstance, ItestAttribute>;
  let _UserTasks2 : Model<ItestInstance, ItestAttribute>;
  let _UsersTasks : Model<ItestInstance, ItestAttribute>;
  let _UserProjects : Model<ItestInstance, ItestAttribute>;
  let _A : Model<ItestInstance, ItestAttribute>;
  let _B : Model<ItestInstance, ItestAttribute>;
  let _u : ItestInstance;
  let _p : ItestInstance;
  let _p1 : ItestInstance;
  let _p2 : ItestInstance;
  let _tasks : ItestInstance[];
  let _task : ItestInstance;
  let _task2 : ItestInstance;
  let _users : ItestInstance[];
  let _user : ItestInstance;
  let _user1 : ItestInstance;
  let _user2 : ItestInstance;
  let _post : ItestInstance;
  let _comment : ItestInstance;
  let _secondTag : ItestInstance;
  let _tag : ItestInstance;
  let _project : ItestInstance;
  let _employee : ItestInstance;
  let _worker : ItestInstance;
  let _sequelize : Sequelize;
  let _t : Transaction;
  describe('getAssociations', () => {
    beforeEach(function() {
      _User = current.define<ItestInstance, ItestAttribute>('User', { username: new DataTypes.STRING() });
      _Task = current.define<ItestInstance, ItestAttribute>('Task', { title: new DataTypes.STRING(), active: new DataTypes.BOOLEAN() });

      _User.belongsToMany(_Task, { through: 'UserTasks' });
      _Task.belongsToMany(_User, { through: 'UserTasks' });

      return current.sync({ force: true }).then(() => {
        return Promise.all([
          _User.create({ username: 'John'}),
          _Task.create({ title: 'Get rich', active: true}),
          _Task.create({ title: 'Die trying', active: false}),
        ]);
      }).spread((john, task1, task2) => {
        _tasks = [task1, task2];
        _user = john;
        return john.setLinkedData('Task', [task1, task2]);
      });
    });

    if (current.dialect.supports.transactions) {
      it('supports transactions', function() {
        let Article : Model<ItestInstance, ItestAttribute>;
        let Label : Model<ItestInstance, ItestAttribute>;
        return Support.prepareTransactionTest(current).bind({}).then(function(sequelize) {
          _sequelize = sequelize;
          Article = _sequelize.define<ItestInstance, ItestAttribute>('Article', { title: new DataTypes.STRING() });
          Label = _sequelize.define<ItestInstance, ItestAttribute>('Label', { text: new DataTypes.STRING() });

          Article.belongsToMany(Label, { through: 'ArticleLabels' });
          Label.belongsToMany(Article, { through: 'ArticleLabels' });

          return _sequelize.sync({ force: true });
        }).then(function() {
          return Promise.all([
            Article.create({ title: 'foo' }),
            Label.create({ text: 'bar' }),
            _sequelize.transaction(),
          ]);
        }).spread(function(article, label, t) {
          _t = t;
          return article.setLinkedData('Label', [label], { transaction: t });
        }).then(function() {
          return Article.all({ transaction: _t });
        }).then(articles => {
          return articles[0].getLinkedData<ItestInstance, ItestAttribute>('Label');
        }).then(function(labels) {
          expect(labels).to.have.length(0);
          return Article.all({ transaction: _t });
        }).then(function(articles) {
          return articles[0].getLinkedData<ItestInstance, ItestAttribute>('Label', { transaction: _t });
        }).then(function(labels) {
          expect(labels).to.have.length(1);
          return _t.rollback();
        });
      });
    }

    it('gets all associated objects with all fields', function() {
      return _User.find({where: {username: 'John'}}).then(john => {
        return john.getLinkedData<ItestInstance, ItestAttribute>('Task');
      }).then(tasks => {
        Object.keys(tasks[0].rawAttributes).forEach(attr => {
          expect(tasks[0]).to.have.property(attr);
        });
      });
    });

    it('gets all associated objects when no options are passed', function() {
      return _User.find({where: {username: 'John'}}).then(john => {
        return john.getLinkedData<ItestInstance, ItestAttribute>('Task');
      }).then(tasks => {
        expect(tasks).to.have.length(2);
      });
    });

    it('only get objects that fulfill the options', function() {
      return _User.find({where: {username: 'John'}}).then(john => {
        return john.getLinkedData<ItestInstance, ItestAttribute>('Task', {
          where: {
            active: true
          }
        });
      }).then(tasks => {
        expect(tasks).to.have.length(1);
      });
    });

    it('supports a where not in', function() {
      return _User.find({
        where: {
          username: 'John'
        }
      }).then(john => {
        return john.getLinkedData<ItestInstance, ItestAttribute>('Task', {
          where: {
            title: {
              not: ['Get rich']
            }
          }
        });
      }).then(tasks => {
        expect(tasks).to.have.length(1);
      });
    });

    it('supports a where not in on the primary key', function() {
      return _User.find({
        where: {
          username: 'John'
        }
      }).then(john => {
        return john.getLinkedData<ItestInstance, ItestAttribute>('Task', {
          where: {
            id: {
              not: [_tasks[0].get('id')]
            }
          }
        });
      }).then(tasks => {
        expect(tasks).to.have.length(1);
      });
    });


    it('only gets objects that fulfill options with a formatted value', function() {
      return _User.find({where: {username: 'John'}}).then(john => {
        return john.getLinkedData<ItestInstance, ItestAttribute>('Task', {where: {active: true}});
      }).then(tasks => {
        expect(tasks).to.have.length(1);
      });
    });

    it('get associated objects with an eager load', function() {
      return _User.find({where: {username: 'John'}, include: [_Task]}).then(john => {
        expect(john.Tasks).to.have.length(2);
      });
    });

    it('get associated objects with an eager load with conditions but not required', function() {
      const Label = current.define<ItestInstance, ItestAttribute>('Label', { title: new DataTypes.STRING(), isActive: new DataTypes.BOOLEAN() });
      const Task = _Task;
      const User = _User;

      Task.hasMany(Label);
      Label.belongsTo(Task);

      return Label.sync({force: true}).then(() => {
        return User.find({
          where: { username: 'John'},
          include: [
            { model: Task, required: false, include: [
              { model: Label, required: false, where: { isActive: true } },
            ]},
          ]
        });
      }).then(john => {
        expect(john.Tasks).to.have.length(2);
      });
    });

    it('should support schemas', function() {
      const AcmeUser = current.define<ItestInstance, ItestAttribute>('User', {
        username: new DataTypes.STRING()
      }).schema('acme', '_');
      const AcmeProject = current.define<ItestInstance, ItestAttribute>('Project', {
        title: new DataTypes.STRING(),
        active: new DataTypes.BOOLEAN()
      }).schema('acme', '_');
      const AcmeProjectUsers = current.define<ItestInstance, ItestAttribute>('ProjectUsers', {
        status: new DataTypes.STRING(),
        data: new DataTypes.INTEGER()
      }).schema('acme', '_');

      AcmeUser.belongsToMany(AcmeProject, {through: AcmeProjectUsers});
      AcmeProject.belongsToMany(AcmeUser, {through: AcmeProjectUsers});

      return current.dropAllSchemas().then(() => {
        return current.createSchema('acme');
      }).then(() => {
        return Promise.all([
          AcmeUser.sync({force: true}),
          AcmeProject.sync({force: true}),
        ]);
      }).then(() => {
        return AcmeProjectUsers.sync({force: true});
      }).bind({}).then(() => {
        return AcmeUser.create();
      }).then(function(u) {
        _u = u;
        return AcmeProject.create();
      }).then(function(p) {
        return _u.addLinkedData('Project', p, { through: { status: 'active', data: 42 }});
      }).then(function() {
        return _u.getLinkedData<ItestInstance, ItestAttribute>('Project');
      }).then(projects => {
        expect(projects).to.have.length(1);
        const project = projects[0];
        expect(project.ProjectUsers).to.be.ok;
        expect(project.status).not.to.exist;
        expect(project.ProjectUsers.status).to.equal('active');
        return current.dropSchema('acme').then(() => {
          return current.showAllSchemas().then(schemas => {
            if (dialect === 'postgres' || dialect === 'mssql') {
              expect(schemas).to.be.empty;
            }
          });
        });
      });
    });

    it('supports custom primary keys and foreign keys', function() {
      const User = current.define<ItestInstance, ItestAttribute>('User', {
        id_user: {
          type: new DataTypes.UUID(),
          primaryKey: true,
          defaultValue: new DataTypes.UUIDV4(),
          allowNull: false
        }
      }, {
        tableName: 'tbl_user'
      });

      const Group = current.define<ItestInstance, ItestAttribute>('Group', {
        id_group: {
          type: new DataTypes.UUID(),
          allowNull: false,
          primaryKey: true,
          defaultValue: new DataTypes.UUIDV4()
        }
      }, {
        tableName: 'tbl_group'
      });

      const User_has_Group = current.define<ItestInstance, ItestAttribute>('User_has_Group', {

      }, {
        tableName: 'tbl_user_has_group'
      });

      User.belongsToMany(Group, {as: 'groups', through: User_has_Group, foreignKey: 'id_user'});
      Group.belongsToMany(User, {as: 'users', through: User_has_Group, foreignKey: 'id_group'});

      return current.sync({force: true}).then(() => {
        return Promise.join(
          User.create(),
          Group.create()
        ).spread((user, group) => {
          return user.addLinkedData('Group', group);
        }).then(() => {
          return User.findOne({
            where: {}
          }).then(user => {
            return user.getLinkedData<ItestInstance, ItestAttribute>('Group');
          });
        });
      });
    });

    it('supports primary key attributes with different field names', function() {
      const User = current.define<ItestInstance, ItestAttribute>('User', {
        id: {
          type: new DataTypes.UUID(),
          allowNull: false,
          primaryKey: true,
          defaultValue: new DataTypes.UUIDV4(),
          field: 'user_id'
        }
      }, {
        tableName: 'tbl_user'
      });

      const Group = current.define<ItestInstance, ItestAttribute>('Group', {
        id: {
          type: new DataTypes.UUID(),
          allowNull: false,
          primaryKey: true,
          defaultValue: new DataTypes.UUIDV4(),
          field: 'group_id'
        }
      }, {
        tableName: 'tbl_group'
      });

      const User_has_Group = current.define<ItestInstance, ItestAttribute>('User_has_Group', {

      }, {
        tableName: 'tbl_user_has_group'
      });

      User.belongsToMany(Group, {through: User_has_Group});
      Group.belongsToMany(User, {through: User_has_Group});

      return current.sync({force: true}).then(() => {
        return Promise.join(
          User.create(),
          Group.create()
        ).spread((user, group) => {
          return user.addLinkedData('Group', group);
        }).then(() => {
          return (Promise as any).join(
            User.findOne({
              where: {},
              include: [Group]
            }),
            User.findAll({
              include: [Group]
            })
          );
        });
      });
    });

    it('supports primary key attributes with different field names where parent include is required', function() {
      const User = current.define<ItestInstance, ItestAttribute>('User', {
        id: {
          type: new DataTypes.UUID(),
          allowNull: false,
          primaryKey: true,
          defaultValue: new DataTypes.UUIDV4(),
          field: 'user_id'
        }
      }, {
        tableName: 'tbl_user'
      });

      const Company = current.define<ItestInstance, ItestAttribute>('Company', {
        id: {
          type: new DataTypes.UUID(),
          allowNull: false,
          primaryKey: true,
          defaultValue: new DataTypes.UUIDV4(),
          field: 'company_id'
        }
      }, {
        tableName: 'tbl_company'
      });

      const Group = current.define<ItestInstance, ItestAttribute>('Group', {
        id: {
          type: new DataTypes.UUID(),
          allowNull: false,
          primaryKey: true,
          defaultValue: new DataTypes.UUIDV4(),
          field: 'group_id'
        }
      }, {
        tableName: 'tbl_group'
      });

      const Company_has_Group = current.define<ItestInstance, ItestAttribute>('Company_has_Group', {

      }, {
        tableName: 'tbl_company_has_group'
      });

      User.belongsTo(Company);
      Company.hasMany(User);
      Company.belongsToMany(Group, {through: Company_has_Group});
      Group.belongsToMany(Company, {through: Company_has_Group});

      return current.sync({force: true}).then(() => {
        return Promise.join(
          User.create(),
          Group.create(),
          Company.create()
        ).spread((user, group, company) => {
          return Promise.join(
            user.setLinkedData('Company', company),
            company.addLinkedData('Group', group)
          );
        }).then(() => {
          return (Promise as any).join(
            User.findOne({
              where: {},
              include: [
                {model: Company, include: [Group]},
              ]
            }),
            User.findAll({
              include: [
                {model: Company, include: [Group]},
              ]
            }),
            User.findOne({
              where: {},
              include: [
                {model: Company, required: true, include: [Group]},
              ]
            }),
            User.findAll({
              include: [
                {model: Company, required: true, include: [Group]},
              ]
            })
          );
        });
      });
    });
  });

  describe('countAssociations', () => {
    beforeEach(function() {
      _User = current.define<ItestInstance, ItestAttribute>('User', {
        username: new DataTypes.STRING()
      });
      _Task = current.define<ItestInstance, ItestAttribute>('Task', {
        title: new DataTypes.STRING(),
        active: new DataTypes.BOOLEAN()
      });
      _UserTask = current.define<ItestInstance, ItestAttribute>('UserTask', {
        id: {
          type: new DataTypes.INTEGER(),
          primaryKey: true,
          autoIncrement: true
        },
        started: {
          type: new DataTypes.BOOLEAN(),
          defaultValue: false
        }
      });

      _User.belongsToMany(_Task, { through: _UserTask });
      _Task.belongsToMany(_User, { through: _UserTask });

      return current.sync({ force: true }).then(() => {
        return Promise.all([
          _User.create({ username: 'John'}),
          _Task.create({ title: 'Get rich', active: true}),
          _Task.create({ title: 'Die trying', active: false}),
        ]);
      }).spread((john, task1, task2) => {
        _tasks = [task1, task2];
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
      _User.belongsToMany(_Task, {
        as: 'activeTasks',
        through: _UserTask,
        scope: {
          active: true
        }
      });

      return expect(_user.countLinkedData({ model : 'Task', associationAlias : 'activeTasks' }, {})).to.eventually.equal(1);
    });

    it('should count scoped through associations', function() {
      const user = _user;

      _User.belongsToMany(_Task, {
        as: 'startedTasks',
        through: {
          model: _UserTask,
          scope: {
            started: true
          }
        }
      });

      return Promise.join(
        _Task.create().then(task => {
          return user.addLinkedData('Task', task, {
            through: { started: true }
          });
        }),
        _Task.create().then(task => {
          return user.addLinkedData('Task', task, {
            through: { started: true }
          });
        })
      ).then(() => {
        return expect(user.countLinkedData({ model : 'Task', associationAlias : 'startedTasks' }, {})).to.eventually.equal(2);
      });
    });
  });

  describe('setAssociations', () => {
    it('clears associations when passing null to the set-method', function() {
      const User = current.define<ItestInstance, ItestAttribute>('User', { username: new DataTypes.STRING() });
      const Task = current.define<ItestInstance, ItestAttribute>('Task', { title: new DataTypes.STRING() });

      User.belongsToMany(Task, { through: 'UserTasks' });
      Task.belongsToMany(User, { through: 'UserTasks' });

      return current.sync({ force: true }).then(() => {
        return Promise.all([
          User.create({ username: 'foo' }),
          Task.create({ title: 'task' }),
        ]);
      }).bind({}).spread(function(user, task) {
        _task = task;
        return task.setLinkedData('User', [user]);
      }).then(function() {
        return _task.getLinkedData<ItestInstance, ItestAttribute>('User');
      }).then(function(users) {
        expect(users).to.have.length(1);
        return _task.setLinkedData('User', null);
      }).then(function() {
        return _task.getLinkedData<ItestInstance, ItestAttribute>('User');
      }).then(users => {
        expect(users).to.have.length(0);
      });
    });

    it('should be able to set twice with custom primary keys', function() {
      const User = current.define<ItestInstance, ItestAttribute>('User', { uid: { type: new DataTypes.INTEGER(), primaryKey: true, autoIncrement: true }, username: new DataTypes.STRING() });
      const Task = current.define<ItestInstance, ItestAttribute>('Task', { tid: { type: new DataTypes.INTEGER(), primaryKey: true, autoIncrement: true }, title: new DataTypes.STRING() });

      User.belongsToMany(Task, { through: 'UserTasks' });
      Task.belongsToMany(User, { through: 'UserTasks' });

      return current.sync({ force: true }).then(() => {
        return Promise.all([
          User.create({ username: 'foo' }),
          User.create({ username: 'bar' }),
          Task.create({ title: 'task' }),
        ]);
      }).bind({}).spread(function(user1, user2, task) {
        _task = task;
        _user1 = user1;
        _user2 = user2;
        return task.setLinkedData('User', [user1]);
      }).then(function() {
        _user2.user_has_task = {usertitle: 'Something'};
        return _task.setLinkedData('User', [_user1, _user2]);
      }).then(function() {
        return _task.getLinkedData<ItestInstance, ItestAttribute>('User');
      }).then(users => {
        expect(users).to.have.length(2);
      });
    });

    it('joins an association with custom primary keys', function() {
      const Group = current.define<ItestInstance, ItestAttribute>('group', {
        group_id: {type: new DataTypes.INTEGER(), primaryKey: true},
        name: new DataTypes.STRING(64)
      });
      const Member = current.define<ItestInstance, ItestAttribute>('member', {
        member_id: {type: new DataTypes.INTEGER(), primaryKey: true},
        email: new DataTypes.STRING(64)
      });

      Group.belongsToMany(Member, {through: 'group_members', foreignKey: 'group_id', otherKey: 'member_id'});
      Member.belongsToMany(Group, {through: 'group_members', foreignKey: 'member_id', otherKey: 'group_id'});

      return current.sync({ force: true }).then(() => {
        return Promise.all([
          Group.create({group_id: 1, name: 'Group1'}),
          Member.create({member_id: 10, email: 'team@sequelizejs.com'}),
        ]);
      }).spread((group, member) => {
        return group.addLinkedData('member', member).return(group);
      }).then(group => {
        return group.getLinkedData<ItestInstance, ItestAttribute>('member');
      }).then(members => {
        expect(members).to.be.instanceof(Array);
        expect(members).to.have.length(1);
        expect(members[0].member_id).to.equal(10);
        expect(members[0].email).to.equal('team@sequelizejs.com');
      });
    });

    it('supports passing the primary key instead of an object', function() {
      const User = current.define<ItestInstance, ItestAttribute>('User', { username: new DataTypes.STRING() });
      const Task = current.define<ItestInstance, ItestAttribute>('Task', { title: new DataTypes.STRING() });

      User.belongsToMany(Task, { through: 'UserTasks' });
      Task.belongsToMany(User, { through: 'UserTasks' });

      return current.sync({ force: true }).then(() => {
        return Promise.all([
          User.create({ id: 12 }),
          Task.create({ id: 50, title: 'get started' }),
          Task.create({ id: 5, title: 'wat' }),
        ]);
      }).bind({}).spread(function(user, task1, task2) {
        _user = user;
        _task2 = task2;
        return user.addLinkedData('Task', task1.id);
      }).then(function() {
        return _user.setLinkedData('Task', [_task2.id]);
      }).then(function() {
        return _user.getLinkedData<ItestInstance, ItestAttribute>('Task');
      }).then(tasks => {
        expect(tasks).to.have.length(1);
        expect(tasks[0].title).to.equal('wat');
      });
    });

    it('using scope to set associations', function() {
      const ItemTag = current.define<ItestInstance, ItestAttribute>('ItemTag', {
        id: { type: new DataTypes.INTEGER(), primaryKey: true, autoIncrement: true },
        tag_id: { type: new DataTypes.INTEGER(), unique: false },
        taggable: { type: new DataTypes.STRING() },
        taggable_id: { type: new DataTypes.INTEGER(), unique: false }
      });
      const Tag = current.define<ItestInstance, ItestAttribute>('Tag', {
        id: { type: new DataTypes.INTEGER(), primaryKey: true, autoIncrement: true },
        name: new DataTypes.STRING()
      });
      const Comment = current.define<ItestInstance, ItestAttribute>('Comment', {
        id: { type: new DataTypes.INTEGER(), primaryKey: true, autoIncrement: true },
        name: new DataTypes.STRING()
      });
      const Post = current.define<ItestInstance, ItestAttribute>('Post', {
        id: { type: new DataTypes.INTEGER(), primaryKey: true, autoIncrement: true },
        name: new DataTypes.STRING()
      });

      Post.belongsToMany(Tag, {
        through: { model: ItemTag, unique: false, scope: { taggable: 'post' } },
        foreignKey: 'taggable_id'
      });

      Comment.belongsToMany(Tag, {
        through: { model: ItemTag, unique: false, scope: { taggable: 'comment' } },
        foreignKey: 'taggable_id'
      });

      return current.sync({ force: true }).then(() => {
        return Promise.all([
          Post.create({ name: 'post1' }),
          Comment.create({ name: 'comment1' }),
          Tag.create({ name: 'tag1' }),
        ]);
      }).bind({}).spread( (post, comment, tag) => {
        _post = post;
        _comment = comment;
        _tag = tag;
        return _post.setLinkedData('Tag', [_tag]);
      }).then(() => {
        return _comment.setLinkedData('Tag', [_tag]);
      }).then(() => {
        return Promise.all([
          _post.getLinkedData<ItestInstance, ItestAttribute>('Tag'),
          _comment.getLinkedData<ItestInstance, ItestAttribute>('Tag'),
        ]);
      }).spread( (postTags, commentTags) => {
        expect(postTags).to.have.length(1);
        expect(commentTags).to.have.length(1);
      });
    });

    it('updating association via set associations with scope', function() {
      const ItemTag = current.define<ItestInstance, ItestAttribute>('ItemTag', {
        id: { type: new DataTypes.INTEGER(), primaryKey: true, autoIncrement: true },
        tag_id: { type: new DataTypes.INTEGER(), unique: false },
        taggable: { type: new DataTypes.STRING() },
        taggable_id: { type: new DataTypes.INTEGER(), unique: false }
      });
      const Tag = current.define<ItestInstance, ItestAttribute>('Tag', {
        id: { type: new DataTypes.INTEGER(), primaryKey: true, autoIncrement: true },
        name: new DataTypes.STRING()
      });
      const Comment = current.define<ItestInstance, ItestAttribute>('Comment', {
        id: { type: new DataTypes.INTEGER(), primaryKey: true, autoIncrement: true },
        name: new DataTypes.STRING()
      });
      const Post = current.define<ItestInstance, ItestAttribute>('Post', {
        id: { type: new DataTypes.INTEGER(), primaryKey: true, autoIncrement: true },
        name: new DataTypes.STRING()
      });

      Post.belongsToMany(Tag, {
        through: { model: ItemTag, unique: false, scope: { taggable: 'post' } },
        foreignKey: 'taggable_id'
      });

      Comment.belongsToMany(Tag, {
        through: { model: ItemTag, unique: false, scope: { taggable: 'comment' } },
        foreignKey: 'taggable_id'
      });

      return current.sync({ force: true }).then( () => {
        return Promise.all([
          Post.create({ name: 'post1' }),
          Comment.create({ name: 'comment1' }),
          Tag.create({ name: 'tag1' }),
          Tag.create({ name: 'tag2' }),
        ]);
      }).bind({}).spread( (post, comment, tag, secondTag) => {
        _post = post;
        _comment = comment;
        _tag = tag;
        _secondTag = secondTag;
        return _post.setLinkedData('Tag', [_tag, _secondTag]);
      }).then( () => {
        return _comment.setLinkedData('Tag', [_tag, _secondTag]);
      }).then( () => {
        return _post.setLinkedData('Tag', [_tag]);
      }).then( () => {
        return Promise.all([
          _post.getLinkedData<ItestInstance, ItestAttribute>('Tag'),
          _comment.getLinkedData<ItestInstance, ItestAttribute>('Tag'),
        ]);
      }).spread( (postTags, commentTags) => {
        expect(postTags).to.have.length(1);
        expect(commentTags).to.have.length(2);
      });
    });
  });

  describe('createAssociations', () => {
    it('creates a new associated object', function() {
      const User = current.define<ItestInstance, ItestAttribute>('User', { username: new DataTypes.STRING() });
      const Task = current.define<ItestInstance, ItestAttribute>('Task', { title: new DataTypes.STRING() });

      User.belongsToMany(Task, { through: 'UserTasks' });
      Task.belongsToMany(User, { through: 'UserTasks' });

      return current.sync({ force: true }).then(() => {
        return Task.create({ title: 'task' });
      }).bind({}).then(function(task) {
        _task = task;
        return task.createLinkedData<ItestInstance, ItestAttribute>('User', { username: 'foo' });
      }).then(function(createdUser) {
        expect(createdUser.model).to.equal(User);
        expect(createdUser.username).to.equal('foo');
        return _task.getLinkedData<ItestInstance, ItestAttribute>('User');
      }).then(users => {
        expect(users).to.have.length(1);
      });
    });

    if (current.dialect.supports.transactions) {
      it('supports transactions', function() {
        return Support.prepareTransactionTest(current).bind({}).then(function(sequelize) {
          _User = (sequelize as Sequelize).define<ItestInstance, ItestAttribute>('User', { username: new DataTypes.STRING() });
          _Task = (sequelize as Sequelize).define<ItestInstance, ItestAttribute>('Task', { title: new DataTypes.STRING() });

          _User.belongsToMany(_Task, { through: 'UserTasks' });
          _Task.belongsToMany(_User, { through: 'UserTasks' });

          _sequelize = sequelize;
          return sequelize.sync({ force: true });
        }).then(function() {
          return Promise.all([
            _Task.create({ title: 'task' }),
            _sequelize.transaction(),
          ]);
        }).spread(function(task : ItestInstance, t) {
          _task = task;
          _t = t;
          return task.createLinkedData<ItestInstance, ItestAttribute>('User', { username: 'foo' }, { transaction: t });
        }).then(function() {
          return _task.getLinkedData<ItestInstance, ItestAttribute>('User');
        }).then(function(users) {
          expect(users).to.have.length(0);

          return _task.getLinkedData<ItestInstance, ItestAttribute>('User', { transaction: _t });
        }).then(function(users) {
          expect(users).to.have.length(1);
          return _t.rollback();
        });
      });
    }

    it('supports setting through table attributes', function() {
      const User = current.define<ItestInstance, ItestAttribute>('User', {});
      const Group = current.define<ItestInstance, ItestAttribute>('Group', {});
      const UserGroups = current.define<ItestInstance, ItestAttribute>('user_groups', {
        isAdmin: new DataTypes.BOOLEAN()
      });

      User.belongsToMany(Group, { through: UserGroups });
      Group.belongsToMany(User, { through: UserGroups });

      return current.sync({ force: true }).then(() => {
        return Group.create({});
      }).then(group => {
        return Promise.join(
          group.createLinkedData<ItestInstance, ItestAttribute>('User', { id: 1 }, { through: {isAdmin: true }}),
          group.createLinkedData<ItestInstance, ItestAttribute>('User', { id: 2 }, { through: {isAdmin: false }}),
          () => {
            return UserGroups.findAll();
          }
        );
      }).then(userGroups => {
        userGroups.sort((a, b) => {
          return a.UserId < b.UserId ? - 1 : 1;
        });
        expect(userGroups[0].UserId).to.equal(1);
        expect(userGroups[0].isAdmin).to.be.ok;
        expect(userGroups[1].UserId).to.equal(2);
        expect(userGroups[1].isAdmin).not.to.be.ok;
      });
    });

    it('supports using the field parameter', function() {
      const User = current.define<ItestInstance, ItestAttribute>('User', { username: new DataTypes.STRING() });
      const Task = current.define<ItestInstance, ItestAttribute>('Task', { title: new DataTypes.STRING() });

      User.belongsToMany(Task, { through: 'UserTasks' });
      Task.belongsToMany(User, { through: 'UserTasks' });

      return current.sync({ force: true }).then(() => {
        return Task.create({ title: 'task' });
      }).bind({}).then(function(task) {
        _task = task;
        return task.createLinkedData<ItestInstance, ItestAttribute>('User', { username: 'foo' }, {fields: ['username']});
      }).then(function(createdUser) {
        expect(createdUser.model).to.equal(User);
        expect(createdUser.username).to.equal('foo');
        return _task.getLinkedData<ItestInstance, ItestAttribute>('User');
      }).then(users => {
        expect(users).to.have.length(1);
      });
    });
  });

  describe('addAssociations', () => {
    it('supports both single instance and array', function() {
      const User = current.define<ItestInstance, ItestAttribute>('User', { username: new DataTypes.STRING() });
      const Task = current.define<ItestInstance, ItestAttribute>('Task', { title: new DataTypes.STRING() });

      User.belongsToMany(Task, { through: 'UserTasks' });
      Task.belongsToMany(User, { through: 'UserTasks' });

      return current.sync({ force: true }).then(() => {
        return Promise.all([
          User.create({ id: 12 }),
          Task.create({ id: 50, title: 'get started' }),
          Task.create({ id: 52, title: 'get done' }),
        ]);
      }).spread((user, task1, task2) => {
        return Promise.all([
          user.addLinkedData('Task', task1),
          user.addLinkedData('Task', [task2]),
        ]).return (user);
      }).then(user => {
        return user.getManyLinkedData<ItestInstance, ItestAttribute>('Task');
      }).then(tasks => {
        expect(tasks).to.have.length(2);
        expect(_.find(tasks, item => item.title === 'get started')).to.be.ok;
        expect(_.find(tasks, item => item.title === 'get done')).to.be.ok;
      });
    });

    if (current.dialect.supports.transactions) {
      it('supports transactions', function() {
        return Support.prepareTransactionTest(current).bind({}).then(function(sequelize) {
          _User = (sequelize as Sequelize).define<ItestInstance, ItestAttribute>('User', { username: new DataTypes.STRING() });
          _Task = (sequelize as Sequelize).define<ItestInstance, ItestAttribute>('Task', { title: new DataTypes.STRING() });

          _User.belongsToMany(_Task, { through: 'UserTasks' });
          _Task.belongsToMany(_User, { through: 'UserTasks' });

          _sequelize = sequelize;
          return sequelize.sync({ force: true });
        }).then(function() {
          return Promise.all([
            _User.create({ username: 'foo' }),
            _Task.create({ title: 'task' }),
            _sequelize.transaction(),
          ]);
        }).spread(function(user, task, t) {
          _task = task;
          _user = user;
          _t = t;
          return task.addLinkedData('User', user, { transaction: t });
        }).then(function() {
          return _task.hasLinkedData('User', _user);
        }).then(function(hasUser) {
          expect(hasUser).to.be.false;
          return _task.hasLinkedData('User', _user, { transaction: _t });
        }).then(function(hasUser) {
          expect(hasUser).to.be.true;
          return _t.rollback();
        });
      });

      it('supports transactions when updating a through model', function() {
        return Support.prepareTransactionTest(current).bind({}).then(function(sequelize) {
          _User = (sequelize as Sequelize).define<ItestInstance, ItestAttribute>('User', { username: new DataTypes.STRING() });
          _Task = (sequelize as Sequelize).define<ItestInstance, ItestAttribute>('Task', { title: new DataTypes.STRING() });

          _UserTask = (sequelize as Sequelize).define<ItestInstance, ItestAttribute>('UserTask', {
            status: new DataTypes.STRING()
          });

          _User.belongsToMany(_Task, { through: _UserTask });
          _Task.belongsToMany(_User, { through: _UserTask });
          _sequelize = sequelize;
          return sequelize.sync({ force: true });
        }).then(function() {
          return Promise.all([
            _User.create({ username: 'foo' }),
            _Task.create({ title: 'task' }),
            _sequelize.transaction({ isolationLevel: Sequelize.Transaction.ISOLATION_LEVELS.READ_COMMITTED }),
          ]);
        }).spread(function(user, task, t) {
          _task = task;
          _user = user;
          _t = t;
          return task.addLinkedData('User', user, { through: {status: 'pending'} }); // Create without transaction, so the old value is accesible from outside the transaction
        }).then(function() {
          return _task.addLinkedData('User', _user, { transaction: _t, through: {status: 'completed'}}); // Add an already exisiting user in a transaction, updating a value in the join table
        }).then(function() {
          return Promise.all([
            _user.getLinkedData<ItestInstance, ItestAttribute>('Task'),
            _user.getLinkedData<ItestInstance, ItestAttribute>('Task', { transaction: _t }),
          ]);
        }).spread(function(tasks, transactionTasks) {
          expect(tasks[0].UserTask.status).to.equal('pending');
          expect(transactionTasks[0].UserTask.status).to.equal('completed');

          return _t.rollback();
        });
      });
    }

    it('supports passing the primary key instead of an object', function() {
      const User = current.define<ItestInstance, ItestAttribute>('User', { username: new DataTypes.STRING() });
      const Task = current.define<ItestInstance, ItestAttribute>('Task', { title: new DataTypes.STRING() });

      User.belongsToMany(Task, { through: 'UserTasks' });
      Task.belongsToMany(User, { through: 'UserTasks' });

      return current.sync({ force: true }).then(() => {
        return Promise.all([
          User.create({ id: 12 }),
          Task.create({ id: 50, title: 'get started' }),
        ]);
      }).spread((user, task) => {
        return user.addLinkedData('Task', task.id).return (user);
      }).then(user => {
        return user.getLinkedData<ItestInstance, ItestAttribute>('Task');
      }).then(tasks => {
        expect(tasks[0].title).to.equal('get started');
      });
    });


    it('should not pass indexes to the join table', function() {
      const User = current.define<ItestInstance, ItestAttribute>(
        'User',
        { username: new DataTypes.STRING() },
        {
          indexes: [
            {
              name: 'username_unique',
              unique: true,
              method: 'BTREE',
              fields: ['username']
            },
          ]
        });
      const Task = current.define<ItestInstance, ItestAttribute>(
        'Task',
        { title: new DataTypes.STRING() },
        {
          indexes: [
            {
              name: 'title_index',
              method: 'BTREE',
              fields: ['title']
            },
          ]
        });
      //create associations
      User.belongsToMany(Task, { through: 'UserTasks' });
      Task.belongsToMany(User, { through: 'UserTasks' });
      return current.sync({ force: true });
    });
  });

  describe('addMultipleAssociations', () => {
    it('supports both single instance and array', function() {
      const User = current.define<ItestInstance, ItestAttribute>('User', { username: new DataTypes.STRING() });
      const Task = current.define<ItestInstance, ItestAttribute>('Task', { title: new DataTypes.STRING() });

      User.belongsToMany(Task, { through: 'UserTasks' });
      Task.belongsToMany(User, { through: 'UserTasks' });

      return current.sync({ force: true }).then(() => {
        return Promise.all([
          User.create({ id: 12 }),
          Task.create({ id: 50, title: 'get started' }),
          Task.create({ id: 52, title: 'get done' }),
        ]);
      }).spread((user, task1, task2) => {
        return Promise.all([
          user.addLinkedData('Task', task1),
          user.addLinkedData('Task', [task2]),
        ]).return (user);
      }).then(user => {
        return user.getManyLinkedData<ItestInstance, ItestAttribute>('Task');
      }).then(tasks => {
        expect(tasks).to.have.length(2);
        expect(_.find(tasks, item => item.title === 'get started')).to.be.ok;
        expect(_.find(tasks, item => item.title === 'get done')).to.be.ok;
      });
    });

    it('adds associations without removing the current ones', function() {
      const User = current.define<ItestInstance, ItestAttribute>('User', { username: new DataTypes.STRING() });
      const Task = current.define<ItestInstance, ItestAttribute>('Task', { title: new DataTypes.STRING() });

      User.belongsToMany(Task, { through: 'UserTasks' });
      Task.belongsToMany(User, { through: 'UserTasks' });

      return current.sync({ force: true }).then(() => {
        return User.bulkCreate([
          { username: 'foo '},
          { username: 'bar '},
          { username: 'baz '},
        ]).bind({}).then(() => {
          return Promise.all([
            Task.create({ title: 'task' }),
            User.findAll(),
          ]);
        }).spread(function(task, users) {
          _task = task as ItestInstance;
          _users = users as ItestInstance[];
          return _task.setLinkedData('User', [users[0]]);
        }).then(function() {
          return _task.addLinkedData('User', [_users[1], _users[2]]);
        }).then(function() {
          return _task.getLinkedData<ItestInstance, ItestAttribute>('User');
        }).then(function(users) {
          expect(users).to.have.length(3);

          // Re-add user 0's object, this should be harmless
          // Re-add user 0's id, this should be harmless
          return Promise.all([
            expect(_task.addLinkedData('User', [_users[0]])).not.to.be.rejected,
            expect(_task.addLinkedData('User', [_users[0].id])).not.to.be.rejected,
          ]);
        }).then(function() {
          return _task.getLinkedData<ItestInstance, ItestAttribute>('User');
        }).then(users => {
          expect(users).to.have.length(3);
        });
      });
    });
  });

  describe('through model validations', () => {
    beforeEach(function() {
      const Project = current.define<ItestInstance, ItestAttribute>('Project', {
        name: new DataTypes.STRING()
      });

      const Employee = current.define<ItestInstance, ItestAttribute>('Employee', {
        name: new DataTypes.STRING()
      });

      const Participation = current.define<ItestInstance, ItestAttribute>('Participation', {
        role: {
          type: new DataTypes.STRING(),
          allowNull: false,
          validate: {
            len: {
              args: [2, 50],
              msg: 'too bad'
            }
          }
        }
      });

      Project.belongsToMany(Employee, { as: 'Participants', through: Participation });
      Employee.belongsToMany(Project, { as: 'Participations', through: Participation });

      return current.sync({ force: true }).bind(this).then(function() {
        return Promise.all([
          Project.create({ name: 'project 1' }),
          Employee.create({ name: 'employee 1' }),
        ]).bind(this).spread(function(project, employee) {
          _project = project;
          _employee = employee;
        });
      });
    });

    it('runs on add', function() {
      return expect(_project.addLinkedData('Employee', _employee, { through: {role: ''}})).to.be.rejected;
    });

    it('runs on set', function() {
      return expect(_project.setLinkedData('Employee', [_employee], { through: {role: ''}})).to.be.rejected;
    });

    it('runs on create', function() {
      return expect(_project.createLinkedData<ItestInstance, ItestAttribute>('Employee', { name: 'employee 2'}, { through: {role: ''}})).to.be.rejected;
    });
  });

  describe('optimizations using bulk create, destroy and update', () => {
    beforeEach(function() {
      _User = current.define<ItestInstance, ItestAttribute>('User', { username: new DataTypes.STRING() }, {timestamps: false});
      _Task = current.define<ItestInstance, ItestAttribute>('Task', { title: new DataTypes.STRING() }, {timestamps: false});

      _User.belongsToMany(_Task, { through: 'UserTasks' });
      _Task.belongsToMany(_User, { through: 'UserTasks' });

      return current.sync({force: true});
    });

    it('uses one insert into statement', function() {
      const spy = sinon.spy();

      return Promise.all([
        _User.create({ username: 'foo' }),
        _Task.create({ id: 12, title: 'task1' }),
        _Task.create({ id: 15, title: 'task2' }),
      ]).spread((user, task1, task2) => {
        return user.setLinkedData('Task', [task1, task2], {
          logging: spy
        });
      }).then(() => {
        expect(spy.calledTwice).to.be.ok;
      });
    });

    it('uses one delete from statement', function() {
      const spy = sinon.spy();

      return Promise.all([
        _User.create({ username: 'foo' }),
        _Task.create({ title: 'task1' }),
        _Task.create({ title: 'task2' }),
      ]).spread((user, task1, task2) => {
        return user.setLinkedData('Task', [task1, task2]).return (user);
      }).then(user => {
        return user.setLinkedData('Task', null, {
          logging: spy
        });
      }).then(() => {
        expect(spy.calledTwice).to.be.ok;
      });
    });
  }); // end optimization using bulk create, destroy and update

  describe('join table creation', () => {
    beforeEach(function() {
      _User = current.define<ItestInstance, ItestAttribute>('User',
        { username: new DataTypes.STRING() },
        { tableName: 'users'}
      );
      _Task = current.define<ItestInstance, ItestAttribute>('Task',
        { title: new DataTypes.STRING() },
        { tableName: 'tasks' }
      );

      _User.belongsToMany(_Task, { through: 'user_has_tasks' });
      _Task.belongsToMany(_User, { through: 'user_has_tasks' });

      return current.sync({ force: true });
    });

    it('should work with non integer primary keys', function() {
      const Beacons = current.define<ItestInstance, ItestAttribute>('Beacon', {
        id: {
          primaryKey: true,
          type: new DataTypes.UUID(),
          defaultValue: new DataTypes.UUIDV4()
        },
        name: {
          type: new DataTypes.STRING()
        }
      });

      // Usar not to clash with the beforEach definition
      const Users = current.define<ItestInstance, ItestAttribute>('Usar', {
        name: {
          type: new DataTypes.STRING()
        }
      });

      Beacons.belongsToMany(Users, { through: 'UserBeacons' });
      Users.belongsToMany(Beacons, { through: 'UserBeacons' });

      return current.sync({force: true});
    });

    it('makes join table non-paranoid by default', () => {
      const paranoidSequelize = Support.createSequelizeInstance({
        define: {
          paranoid: true
        }
      });
      const ParanoidUser = paranoidSequelize.define<ItestInstance, ItestAttribute>('ParanoidUser', {});
      const ParanoidTask = paranoidSequelize.define<ItestInstance, ItestAttribute>('ParanoidTask', {});

      ParanoidUser.belongsToMany(ParanoidTask, { through: 'UserTasks' });
      ParanoidTask.belongsToMany(ParanoidUser, { through: 'UserTasks' });

      expect(ParanoidUser.options.paranoid).to.be.ok;
      expect(ParanoidTask.options.paranoid).to.be.ok;

      _.forEach(ParanoidUser.associations, association => {
        expect(association.through.model.options.paranoid).not.to.be.ok;
      });
    });
  });

  describe('foreign keys', () => {
    it('should correctly generate underscored keys', function() {
      const User = current.define<ItestInstance, ItestAttribute>('User', {

      }, {
        tableName: 'users',
        underscored: true,
        timestamps: false
      });

      const Place = current.define<ItestInstance, ItestAttribute>('Place', {
        //fields
      }, {
        tableName: 'places',
        underscored: true,
        timestamps: false
      });

      User.belongsToMany(Place, { through: 'user_places' });
      Place.belongsToMany(User, { through: 'user_places' });

      const attributes = current.model('user_places').rawAttributes;

      expect(attributes.PlaceId.field).to.equal('place_id');
      expect(attributes.UserId.field).to.equal('user_id');
    });

    it('should infer otherKey from paired BTM relationship with a through string defined', function() {
      const User = current.define<ItestInstance, ItestAttribute>('User', {});
      const Place = current.define<ItestInstance, ItestAttribute>('Place', {});

      const Places = User.belongsToMany(Place, { through: 'user_places', foreignKey: 'user_id' });
      const Users = Place.belongsToMany(User, { through: 'user_places', foreignKey: 'place_id' });

      expect(Places.foreignKey).to.equal('user_id');
      expect(Users.foreignKey).to.equal('place_id');

      expect(Places.otherKey).to.equal('place_id');
      expect(Users.otherKey).to.equal('user_id');
    });

    it('should infer otherKey from paired BTM relationship with a through model defined', function() {
      const User = current.define<ItestInstance, ItestAttribute>('User', {});
      const Place = current.define<ItestInstance, ItestAttribute>('User', {});
      const UserPlace = current.define<ItestInstance, ItestAttribute>('UserPlace', {id: {primaryKey: true, type: new DataTypes.INTEGER(), autoIncrement: true}}, {timestamps: false});

      const Places = User.belongsToMany(Place, { through: UserPlace, foreignKey: 'user_id' });
      const Users = Place.belongsToMany(User, { through: UserPlace, foreignKey: 'place_id' });

      expect(Places.foreignKey).to.equal('user_id');
      expect(Users.foreignKey).to.equal('place_id');

      expect(Places.otherKey).to.equal('place_id');
      expect(Users.otherKey).to.equal('user_id');

      expect(Object.keys(UserPlace.rawAttributes).length).to.equal(3); // Defined primary key and two foreign keys
    });
  });

  describe('foreign key with fields specified', () => {
    beforeEach(function() {
      _User = current.define<ItestInstance, ItestAttribute>('User', { name: new DataTypes.STRING() });
      _Project = current.define<ItestInstance, ItestAttribute>('Project', { name: new DataTypes.STRING() });

      // doubly linked has many
      _User.belongsToMany(_Project, {
        through: 'user_projects',
        as: 'Projects',
        foreignKey: {
          field: 'user_id',
          name: 'userId'
        },
        otherKey: {
          field: 'project_id',
          name: 'projectId'
        }
      });
      _Project.belongsToMany(_User, {
        through: 'user_projects',
        as: 'Users',
        foreignKey: {
          field: 'project_id',
          name: 'projectId'
        },
        otherKey: {
          field: 'user_id',
          name: 'userId'
        }
      });
    });

    it('should correctly get associations even after a child instance is deleted', function() {
      const spy = sinon.spy();

      return current.sync({force: true}).then(() => {
        return Promise.join(
          _User.create({name: 'Matt'}),
          _Project.create({name: 'Good Will Hunting'}),
          _Project.create({name: 'The Departed'})
        );
      }).spread((user, project1, project2) => {
        return user.addLinkedData('Project', [project1, project2], {
          logging: spy
        }).return (user);
      }).then(user => {
        expect(spy).to.have.been.calledTwice;
        spy.resetHistory();
        return Promise.join(
          user,
          user.getLinkedData<ItestInstance, ItestAttribute>('Project', {
            logging: spy
          })
        );
      }).spread((user, projects) => {
        expect(spy.calledOnce).to.be.ok;
        const project = projects[0];
        expect(project).to.be.ok;
        return project.destroy().return (user);
      }).then(user => {
        return _User.findOne({
          where: { id: user.id},
          include: [{model: _Project, as: 'Projects'}]
        });
      }).then(user => {
        const projects = user.Projects;
        const project = projects[0];

        expect(project).to.be.ok;
      });
    });

    it('should correctly get associations when doubly linked', function() {
      const spy = sinon.spy();
      return current.sync({force: true}).then(() => {
        return Promise.all([
          _User.create({name: 'Matt'}),
          _Project.create({name: 'Good Will Hunting'}),
        ]);
      }).spread((user, project) => {
        _user = user;
        _project = project;
        return user.addLinkedData('Project', project, { logging: spy }).return (user);
      }).then(user => {
        expect(spy.calledTwice).to.be.ok; // Once for SELECT, once for INSERT
        spy.resetHistory();
        return user.getLinkedData<ItestInstance, ItestAttribute>('Project', {
          logging: spy
        });
      }).then(projects => {
        const project = projects[0];
        expect(spy.calledOnce).to.be.ok;
        spy.resetHistory();

        expect(project).to.be.ok;
        return _user.removeLinkedData('Project', project, {
          logging: spy
        }).return (project);
      }).then(() => {
        expect(spy).to.have.been.calledOnce;
      });
    });

    it('should be able to handle nested includes properly', function() {
      _Group = current.define<ItestInstance, ItestAttribute>('Group', { groupName: new DataTypes.STRING()});

      _Group.belongsToMany(_User, {
        through: 'group_users',
        as: 'Users',
        foreignKey: {
          field: 'group_id',
          name: 'groupId'
        },
        otherKey: {
          field: 'user_id',
          name: 'userId'
        }
      });
      _User.belongsToMany(_Group, {
        through: 'group_users',
        as: 'Groups',
        foreignKey: {
          field: 'user_id',
          name: 'userId'
        },
        otherKey: {
          field: 'group_id',
          name: 'groupId'
        }
      });

      return current.sync({force: true}).then(() => {
        return Promise.join(
          _Group.create({groupName: 'The Illuminati'}),
          _User.create({name: 'Matt'}),
          _Project.create({name: 'Good Will Hunting'})
        );
      }).spread((group, user, project) => {
        return user.addLinkedData('Project', project).then(() => {
          return group.addLinkedData('User', user).return (group);
        });
      }).then(group => {
        // get the group and include both the users in the group and their project's
        return _Group.findAll({
          where: {id: group.id},
          include: [
            {
              model: _User,
              as: 'Users',
              include: [
                { model: _Project, as: 'Projects' },
              ]
            },
          ]
        });
      }).then(groups => {
        const group = groups[0];
        expect(group).to.be.ok;

        const user = group.Users[0];
        expect(user).to.be.ok;

        const project = user.Projects[0];
        expect(project).to.be.ok;
        expect(project.name).to.equal('Good Will Hunting');
      });
    });
  });


  describe('primary key handling for join table', () => {
    beforeEach(function() {
      _User = current.define<ItestInstance, ItestAttribute>('User',
        { username: new DataTypes.STRING() },
        { tableName: 'users'}
      );
      _Task = current.define<ItestInstance, ItestAttribute>('Task',
        { title: new DataTypes.STRING() },
        { tableName: 'tasks' }
      );
    });

    it('removes the primary key if it was added by sequelize', function() {
      _UserTasks = current.define<ItestInstance, ItestAttribute>('usertasks', {});

      _User.belongsToMany(_Task, { through: _UserTasks });
      _Task.belongsToMany(_User, { through: _UserTasks });

      expect(Object.keys(_UserTasks.primaryKeys).sort()).to.deep.equal(['TaskId', 'UserId']);
    });

    it('keeps the primary key if it was added by the user', function() {
      let fk;

      _UserTasks = current.define<ItestInstance, ItestAttribute>('usertasks', {
        id: {
          type: new DataTypes.INTEGER(),
          autoincrement: true,
          primaryKey: true
        }
      });
      _UserTasks2 = current.define<ItestInstance, ItestAttribute>('usertasks2', {
        userTasksId: {
          type: new DataTypes.INTEGER(),
          autoincrement: true,
          primaryKey: true
        }
      });

      _User.belongsToMany(_Task, { through: _UserTasks });
      _Task.belongsToMany(_User, { through: _UserTasks });

      _User.belongsToMany(_Task, { through: _UserTasks2 });
      _Task.belongsToMany(_User, { through: _UserTasks2 });

      expect(Object.keys(_UserTasks.primaryKeys)).to.deep.equal(['id']);
      expect(Object.keys(_UserTasks2.primaryKeys)).to.deep.equal(['userTasksId']);

      for (const model of [_UserTasks, _UserTasks2]) {
        fk = Object.keys(model.options.uniqueKeys)[0];
        expect(model.options.uniqueKeys[fk].fields.sort()).to.deep.equal(['TaskId', 'UserId']);
      }
    });

    describe('without sync', () => {
      beforeEach(function() {

        return current.queryInterface.createTable('users', { id: { type: new DataTypes.INTEGER(), primaryKey: true, autoIncrement: true }, username: new DataTypes.STRING(), createdAt: new DataTypes.DATE(), updatedAt: new DataTypes.DATE()
        }).then(() => {
          return current.queryInterface.createTable('tasks', { id: { type: new DataTypes.INTEGER(), primaryKey: true, autoIncrement: true }, title: new DataTypes.STRING(), createdAt: new DataTypes.DATE(), updatedAt: new DataTypes.DATE() });
        }).then(() => {
          return current.queryInterface.createTable('users_tasks', { TaskId: new DataTypes.INTEGER(), UserId: new DataTypes.INTEGER(), createdAt: new DataTypes.DATE(), updatedAt: new DataTypes.DATE() });
        });
      });

      it('removes all associations', function() {
        _UsersTasks = current.define<ItestInstance, ItestAttribute>('UsersTasks', {}, { tableName: 'users_tasks' });

        _User.belongsToMany(_Task, { through: _UsersTasks });
        _Task.belongsToMany(_User, { through: _UsersTasks });

        expect(Object.keys(_UsersTasks.primaryKeys).sort()).to.deep.equal(['TaskId', 'UserId']);

        return Promise.all([
          _User.create({username: 'foo'}),
          _Task.create({title: 'foo'}),
        ]).spread((user, task) => {
          return user.addLinkedData('Task', task).return (user);
        }).then(user => {
          return user.setLinkedData('Task', null);
        }).then(result => {
          expect(result).to.be.ok;
        });
      });
    });
  });

  describe('through', () => {
    beforeEach(function() {
      _User = current.define<ItestInstance, ItestAttribute>('User', {});
      _Project = current.define<ItestInstance, ItestAttribute>('Project', {});
      _UserProjects = current.define<ItestInstance, ItestAttribute>('UserProjects', {
        status: new DataTypes.STRING(),
        data: new DataTypes.INTEGER()
      });

      _User.belongsToMany(_Project, { through: _UserProjects });
      _Project.belongsToMany(_User, { through: _UserProjects });

      return current.sync();
    });

    describe('fetching from join table', () => {
      it('should contain the data from the join table on .UserProjects a DAO', function() {
        return Promise.all([
          _User.create(),
          _Project.create(),
        ]).spread((user, project) => {
          return user.addLinkedData('Project', project, { through: { status: 'active', data: 42 }}).return (user);
        }).then(user => {
          return user.getLinkedData<ItestInstance, ItestAttribute>('Project');
        }).then(projects => {
          const project = projects[0];

          expect(project.UserProjects).to.be.ok;
          expect(project.status).not.to.exist;
          expect(project.UserProjects.status).to.equal('active');
          expect(project.UserProjects.data).to.equal(42);
        });
      });

      it('should be able to limit the join table attributes returned', function() {
        return Promise.all([
          _User.create(),
          _Project.create(),
        ]).spread((user, project) => {
          return user.addLinkedData('Project', project, { through: { status: 'active', data: 42 }}).return (user);
        }).then(user => {
          return user.getLinkedData<ItestInstance, ItestAttribute>('Project', { joinTableAttributes: ['status']});
        }).then(projects => {
          const project = projects[0];

          expect(project.UserProjects).to.be.ok;
          expect(project.status).not.to.exist;
          expect(project.UserProjects.status).to.equal('active');
          expect(project.UserProjects.data).not.to.exist;
        });
      });
    });

    describe('inserting in join table', () => {
      describe('add', () => {
        it('should insert data provided on the object into the join table', function() {
          return Promise.all([
            _User.create(),
            _Project.create(),
          ]).bind({ UserProjects: _UserProjects }).spread(function(u, p) {
            _u = u;
            _p = p;
            p.UserProjects = { status: 'active' };

            return u.addLinkedData('Project', p);
          }).then(function() {
            return _UserProjects.find({ where: { UserId: _u.id, ProjectId: _p.id }});
          }).then(up => {
            expect(up.status).to.equal('active');
          });
        });

        it('should insert data provided as a second argument into the join table', function() {
          return Promise.all([
            _User.create(),
            _Project.create(),
          ]).bind({ UserProjects: _UserProjects }).spread(function(u, p) {
            _u = u;
            _p = p;

            return u.addLinkedData('Project', p, { through: { status: 'active' }});
          }).then(function() {
            return _UserProjects.findOne({ where: { UserId: _u.id, ProjectId: _p.id }});
          }).then(up => {
            expect(up.status).to.equal('active');
          });
        });

        it('should be able to add twice (second call result in UPDATE call) without any attributes (and timestamps off) on the through model', function() {
          const Worker = current.define<ItestInstance, ItestAttribute>('Worker', {}, {timestamps: false});
          const Task = current.define<ItestInstance, ItestAttribute>('Task', {}, {timestamps: false});
          const WorkerTasks = current.define<ItestInstance, ItestAttribute>('WorkerTasks', {}, {timestamps: false});

          Worker.belongsToMany(Task, { through: WorkerTasks });
          Task.belongsToMany(Worker, { through: WorkerTasks });

          return current.sync({force: true}).bind({}).then(() => {
            return Worker.create({id: 1337});
          }).then(function(worker) {
            _worker = worker;
            return Task.create({id: 7331});
          }).then(function() {
            return _worker.addLinkedData('Task', undefined);
          }).then(function() {
            return _worker.addLinkedData('Task', undefined);
          });
        });

        it('should be able to add twice (second call result in UPDATE call) with custom primary keys and without any attributes (and timestamps off) on the through model', function() {
          const Worker = current.define<ItestInstance, ItestAttribute>('Worker', {
            id: {
              type: new DataTypes.INTEGER(),
              allowNull: false,
              primaryKey: true,
              autoIncrement: true
            }
          }, {timestamps: false});
          const Task = current.define<ItestInstance, ItestAttribute>('Task', {
            id: {
              type: new DataTypes.INTEGER(),
              allowNull: false,
              primaryKey: true,
              autoIncrement: true
            }
          }, {timestamps: false});
          const WorkerTasks = current.define<ItestInstance, ItestAttribute>('WorkerTasks', {
            id: {
              type: new DataTypes.INTEGER(),
              allowNull: false,
              primaryKey: true,
              autoIncrement: true
            }
          }, {timestamps: false});

          Worker.belongsToMany(Task, { through: WorkerTasks });
          Task.belongsToMany(Worker, { through: WorkerTasks });

          return current.sync({force: true}).bind({}).then(() => {
            return Worker.create({id: 1337});
          }).then(function(worker) {
            _worker = worker;
            return Task.create({id: 7331});
          }).then(function(task) {
            _task = task;
            return _worker.addLinkedData('Task', _task);
          }).then(function() {
            return _worker.addLinkedData('Task', _task);
          });
        });
      });

      describe('set', () => {
        it('should be able to combine properties on the associated objects, and default values', function() {

          return Promise.all([
            _User.create(),
            _Project.bulkCreate([{}, {}]).then(() => {
              return _Project.findAll();
            }),
          ]).bind({}).spread(function(user, projects) {
            _user = user as ItestInstance;
            _p1 = projects[0];
            _p2 = projects[1];

            _p1.UserProjects = { status: 'inactive' };

            return _user.setLinkedData('Project', [_p1, _p2], { through: { status: 'active' }});
          }).then(function() {
            return Promise.all([
              _UserProjects.findOne({ where: { UserId: _user.id, ProjectId: _p1.id }}),
              _UserProjects.findOne({ where: { UserId: _user.id, ProjectId: _p2.id }}),
            ]);
          }).spread((up1, up2) => {
            expect(up1.status).to.equal('inactive');
            expect(up2.status).to.equal('active');
          });
        });

        it('should be able to set twice (second call result in UPDATE calls) without any attributes (and timestamps off) on the through model', function() {
          const Worker = current.define<ItestInstance, ItestAttribute>('Worker', {}, {timestamps: false});
          const Task = current.define<ItestInstance, ItestAttribute>('Task', {}, {timestamps: false});
          const WorkerTasks = current.define<ItestInstance, ItestAttribute>('WorkerTasks', {}, {timestamps: false});

          Worker.belongsToMany(Task, { through: WorkerTasks });
          Task.belongsToMany(Worker, { through: WorkerTasks });

          return current.sync({force: true}).then(() => {
            return Promise.all([
              Worker.create(),
              Task.bulkCreate([{}, {}]).then(() => {
                return Task.findAll();
              }),
            ]);
          }).spread((worker : ItestInstance, tasks) => {
            return worker.setLinkedData('Task', tasks).return ([worker, tasks]);
          }).spread((worker : ItestInstance, tasks) => {
            return worker.setLinkedData('Task', tasks);
          });
        });
      });

      describe('query with through.where', () => {
        it('should support query the through model', function() {
          return _User.create().then(user => {
            return Promise.all([
              user.createLinkedData<ItestInstance, ItestAttribute>('Project', {}, { through: { status: 'active', data: 1 }}),
              user.createLinkedData<ItestInstance, ItestAttribute>('Project', {}, { through: { status: 'inactive', data: 2 }}),
              user.createLinkedData<ItestInstance, ItestAttribute>('Project', {}, { through: { status: 'inactive', data: 3 }}),
            ]).then(() => {
              return Promise.all([
                user.getLinkedData<ItestInstance, ItestAttribute>('Project', { through: { where: { status: 'active' } } }),
                user.countLinkedData('Project', { through: { where: { status: 'inactive' } } }),
              ]);
            });
          }).spread((activeProjects, inactiveProjectCount) => {
            expect(activeProjects).to.have.lengthOf(1);
            expect(inactiveProjectCount).to.eql(2);
          });
        });
      });
    });

    describe('removing from the join table', () => {
      it('should remove a single entry without any attributes (and timestamps off) on the through model', function() {
        const Worker = current.define<ItestInstance, ItestAttribute>('Worker', {}, {timestamps: false});
        const Task = current.define<ItestInstance, ItestAttribute>('Task', {}, {timestamps: false});
        const WorkerTasks = current.define<ItestInstance, ItestAttribute>('WorkerTasks', {}, {timestamps: false});

        Worker.belongsToMany(Task, { through: WorkerTasks });
        Task.belongsToMany(Worker, { through: WorkerTasks });

        // Test setup
        return current.sync({force: true}).then(() => {
          return Sequelize.Promise.all([
            Worker.create({}),
            Task.bulkCreate([{}, {}, {}]).then(() => {
              return Task.findAll();
            }),
          ]);
        }).spread((worker : ItestInstance, tasks) => {
          // Set all tasks, then remove one task by instance, then remove one task by id, then return all tasks
          return worker.setLinkedData('Task', tasks).then(() => {
            return worker.removeLinkedData('Task', tasks[0]);
          }).then(() => {
            return worker.removeLinkedData('Task', tasks[1].id);
          }).then(() => {
            return worker.getManyLinkedData<ItestInstance, ItestAttribute>('Task');
          });
        }).then(tasks => {
          expect(tasks.length).to.equal(1);
        });
      });

      it('should remove multiple entries without any attributes (and timestamps off) on the through model', function() {
        const Worker = current.define<ItestInstance, ItestAttribute>('Worker', {}, {timestamps: false});
        const Task = current.define<ItestInstance, ItestAttribute>('Task', {}, {timestamps: false});
        const WorkerTasks = current.define<ItestInstance, ItestAttribute>('WorkerTasks', {}, {timestamps: false});

        Worker.belongsToMany(Task, { through: WorkerTasks });
        Task.belongsToMany(Worker, { through: WorkerTasks });

        // Test setup
        return current.sync({force: true}).then(() => {
          return Sequelize.Promise.all([
            Worker.create({}),
            Task.bulkCreate([{}, {}, {}, {}, {}]).then(() => {
              return Task.findAll();
            }),
          ]);
        }).spread((worker : ItestInstance, tasks) => {
          // Set all tasks, then remove two tasks by instance, then remove two tasks by id, then return all tasks
          return worker.setLinkedData('Task', tasks).then(() => {
            return worker.removeLinkedData('Task', [tasks[0], tasks[1]]);
          }).then(() => {
            return worker.removeLinkedData('Task', [tasks[2].id, tasks[3].id]);
          }).then(() => {
            return worker.getManyLinkedData<ItestInstance, ItestAttribute>('Task');
          });
        }).then(tasks => {
          expect(tasks.length).to.equal(1);
        });
      });
    });
  });

  describe('belongsTo and hasMany at once', () => {
    beforeEach(function() {
      _A = current.define<ItestInstance, ItestAttribute>('a', { name: new DataTypes.STRING() });
      _B = current.define<ItestInstance, ItestAttribute>('b', { name: new DataTypes.STRING() });
    });

    describe('source belongs to target', () => {
      beforeEach(function() {
        _A.belongsTo(_B, { as: 'relation1' });
        _A.belongsToMany(_B, { as: 'relation2', through: 'AB' });
        _B.belongsToMany(_A, { as: 'relation2', through: 'AB' });

        return current.sync({ force: true });
      });

      it('correctly uses bId in A', function() {

        const a1 = _A.build({ name: 'a1' });
        const b1 = _B.build({ name: 'b1' });

        return a1
          .save()
          .then(() => b1.save())
          .then(() => a1.setLinkedData({ model : 'b', associationAlias : 'relation1' }, b1))
          .then(() => _A.findOne({ where: { name: 'a1' } }))
          .then(a => {
            expect(a.relation1Id).to.be.eq(b1.id);
          });
      });
    });

    describe('target belongs to source', () => {
      beforeEach(function() {
        _B.belongsTo(_A, { as: 'relation1' });
        _A.belongsToMany(_B, { as: 'relation2', through: 'AB' });
        _B.belongsToMany(_A, { as: 'relation2', through: 'AB' });

        return current.sync({ force: true });
      });

      it('correctly uses bId in A', function() {

        const a1 = _A.build({ name: 'a1' });
        const b1 = _B.build({ name: 'b1' });

        return a1
          .save()
          .then(() => b1.save())
          .then(() => b1.setLinkedData({ model : 'a', associationAlias : 'relation1' }, a1))
          .then(() => _B.findOne({ where: { name: 'b1' } }))
          .then(b => {
            expect(b.relation1Id).to.be.eq(a1.id);
          });
      });
    });
  });

  describe('alias', () => {
    it('creates the join table when through is a string', function() {
      const User = current.define<ItestInstance, ItestAttribute>('User', {});
      const Group = current.define<ItestInstance, ItestAttribute>('Group', {});

      User.belongsToMany(Group, { as: 'MyGroups', through: 'group_user'});
      Group.belongsToMany(User, { as: 'MyUsers', through: 'group_user'});

      return current.sync({force: true}).then(() => {
        return current.getQueryInterface().showAllTables();
      }).then(result => {
        if (dialect === 'mssql' /* current.dialect.supports.schemas */) {
          result = _.map(result, 'tableName');
        } else if (dialect === 'oracle') {
          //oracle returns the table names in UpperCase
          result = _.map(result, table => {
            return table.tableName.toLowerCase();
          });
        }

        expect(result.indexOf('group_user')).not.to.equal(-1);
      });
    });

    it('creates the join table when through is a model', function() {
      const User = current.define<ItestInstance, ItestAttribute>('User', {});
      const Group = current.define<ItestInstance, ItestAttribute>('Group', {});
      const UserGroup = current.define<ItestInstance, ItestAttribute>('GroupUser', {}, {tableName: 'user_groups'});

      User.belongsToMany(Group, { as: 'MyGroups', through: UserGroup});
      Group.belongsToMany(User, { as: 'MyUsers', through: UserGroup});

      return current.sync({force: true}).then(() => {
        return current.getQueryInterface().showAllTables();
      }).then(result => {
        if (dialect === 'mssql' /* current.dialect.supports.schemas */) {
          result = _.map(result, 'tableName');
        } else if (dialect === 'oracle') {
          //oracle returns the table names in UpperCase
          result = _.map(result, table => {
            return table.tableName.toLowerCase();
          });
        }

        expect(result.indexOf('user_groups')).not.to.equal(-1);
      });
    });

    it('correctly identifies its counterpart when through is a string', function() {
      const User = current.define<ItestInstance, ItestAttribute>('User', {});
      const Group = current.define<ItestInstance, ItestAttribute>('Group', {});

      User.belongsToMany(Group, { as: 'MyGroups', through: 'group_user'});
      Group.belongsToMany(User, { as: 'MyUsers', through: 'group_user'});

      expect(Group.associations.MyUsers.through.model === User.associations.MyGroups.through.model);
      expect(Group.associations.MyUsers.through.model.rawAttributes.UserId).to.exist;
      expect(Group.associations.MyUsers.through.model.rawAttributes.GroupId).to.exist;
    });

    it('correctly identifies its counterpart when through is a model', function() {
      const User = current.define<ItestInstance, ItestAttribute>('User', {});
      const Group = current.define<ItestInstance, ItestAttribute>('Group', {});
      const UserGroup = current.define<ItestInstance, ItestAttribute>('GroupUser', {}, {tableName: 'user_groups'});

      User.belongsToMany(Group, { as: 'MyGroups', through: UserGroup});
      Group.belongsToMany(User, { as: 'MyUsers', through: UserGroup});

      expect(Group.associations.MyUsers.through.model === User.associations.MyGroups.through.model);

      expect(Group.associations.MyUsers.through.model.rawAttributes.UserId).to.exist;
      expect(Group.associations.MyUsers.through.model.rawAttributes.GroupId).to.exist;
    });
  });

  describe('multiple hasMany', () => {
    beforeEach(function() {
      _User = current.define<ItestInstance, ItestAttribute>('user', { name: new DataTypes.STRING() });
      _Project = current.define<ItestInstance, ItestAttribute>('project', { projectName: new DataTypes.STRING() });
    });

    describe('project has owners and users and owners and users have projects', () => {
      beforeEach(function() {
        _Project.belongsToMany(_User, { as: 'owners', through: 'projectOwners'});
        _Project.belongsToMany(_User, { as: 'users', through: 'projectUsers'});

        _User.belongsToMany(_Project, { as: 'ownedProjects', through: 'projectOwners'});
        _User.belongsToMany(_Project, { as: 'memberProjects', through: 'projectUsers'});

        return current.sync({ force: true });
      });

      it('correctly sets user and owner', function() {
        const p1 = _Project.build({ projectName: 'p1' });
        const u1 = _User.build({ name: 'u1' });
        const u2 = _User.build({ name: 'u2' });

        return p1
          .save()
          .then(() => u1.save())
          .then(() => u2.save())
          .then(() => p1.setLinkedData({ model : 'user', associationAlias : 'users' }, [u1]))
          .then(() => p1.setLinkedData({ model : 'user', associationAlias : 'owners' }, [u2]));
      });
    });
  });

  describe('Foreign key constraints', () => {
    beforeEach(function() {
      _Task = current.define<ItestInstance, ItestAttribute>('task', { title: new DataTypes.STRING() });
      _User = current.define<ItestInstance, ItestAttribute>('user', { username: new DataTypes.STRING() });
      _UserTasks = current.define<ItestInstance, ItestAttribute>('tasksusers', { userId: new DataTypes.INTEGER(), taskId: new DataTypes.INTEGER() });
    });

    it('can cascade deletes both ways by default', function() {

      _User.belongsToMany(_Task, { through: 'tasksusers' });
      _Task.belongsToMany(_User, { through: 'tasksusers' });

      return current.sync({ force: true }).bind({}).then(() => {
        return Promise.all([
          _User.create({ id: 67, username: 'foo' }),
          _Task.create({ id: 52, title: 'task' }),
          _User.create({ id: 89, username: 'bar' }),
          _Task.create({ id: 42, title: 'kast' }),
        ]);
      }).spread(function(user1, task1, user2, task2) {
        _user1 = user1;
        _user2 = user2;
        _task2 = task2;
        return Promise.all([
          user1.setLinkedData('task', [task1]),
          task2.setLinkedData('user', [user2]),
        ]);
      }).then(function() {
        return Promise.all([
          _user1.destroy(),
          _task2.destroy(),
        ]);
      }).then(function() {
        return Promise.all([
          current.model('tasksusers').findAll({ where: { userId: _user1.id }}),
          current.model('tasksusers').findAll({ where: { taskId: _task2.id }}),
          _User.findOne({
            where: current.or({ username: 'Franz Joseph' }),
            include: [{
              model: _Task,
              where: {
                title: {
                  $ne: 'task'
                }
              }
            }]
          }),
        ]);
      }).spread((tu1, tu2) => {
        expect(tu1).to.have.length(0);
        expect(tu2).to.have.length(0);
      });
    });

    if (current.dialect.supports.constraints.restrict) {

      it('can restrict deletes both ways', function() {

        _User.belongsToMany(_Task, { onDelete: 'RESTRICT', through: 'tasksusers' });
        _Task.belongsToMany(_User, { onDelete: 'RESTRICT', through: 'tasksusers' });

        return current.sync({ force: true }).bind({}).then(() => {
          return Promise.all([
            _User.create({ id: 67, username: 'foo' }),
            _Task.create({ id: 52, title: 'task' }),
            _User.create({ id: 89, username: 'bar' }),
            _Task.create({ id: 42, title: 'kast' }),
          ]);
        }).spread(function(user1, task1, user2, task2) {
          _user1 = user1;
          _user2 = user2;
          _task2 = task2;
          return Promise.all([
            user1.setLinkedData('task', [task1]),
            task2.setLinkedData('user', [user2]),
          ]);
        }).then(function() {
          return Promise.all([
            expect(_user1.destroy()).to.have.been.rejectedWith(current.ForeignKeyConstraintError), // Fails because of RESTRICT constraint
            expect(_task2.destroy()).to.have.been.rejectedWith(current.ForeignKeyConstraintError),
          ]);
        });
      });

      it('can cascade and restrict deletes', function() {

        _User.belongsToMany(_Task, { onDelete: 'RESTRICT', through: 'tasksusers' });
        _Task.belongsToMany(_User, { onDelete: 'CASCADE', through: 'tasksusers' });

        return current.sync({ force: true }).bind({}).then(() => {
          return Sequelize.Promise.join(
            _User.create({ id: 67, username: 'foo' }),
            _Task.create({ id: 52, title: 'task' }),
            _User.create({ id: 89, username: 'bar' }),
            _Task.create({ id: 42, title: 'kast' })
          );
        }).spread(function(user1, task1, user2, task2) {
          _user1 = user1;
          _user2 = user2;
          _task2 = task2;
          return Sequelize.Promise.join(
            user1.setLinkedData('task', [task1]),
            task2.setLinkedData('user', [user2])
          );
        }).then(function() {
          return Sequelize.Promise.join(
            expect(_user1.destroy()).to.have.been.rejectedWith(current.ForeignKeyConstraintError), // Fails because of RESTRICT constraint
            _task2.destroy()
          );
        }).then(function() {
          return current.model('tasksusers').findAll({ where: { taskId: _task2.id }});
        }).then(usertasks => {
          // This should not exist because deletes cascade
          expect(usertasks).to.have.length(0);
        });
      });

    }

    it('should be possible to remove all constraints', function() {
      _User.belongsToMany(_Task, { constraints: false, through: 'tasksusers' });
      _Task.belongsToMany(_User, { constraints: false, through: 'tasksusers' });

      return current.sync({ force: true }).bind({}).then(() => {
        return Promise.all([
          _User.create({ id: 67, username: 'foo' }),
          _Task.create({ id: 52, title: 'task' }),
          _User.create({ id: 89, username: 'bar' }),
          _Task.create({ id: 42, title: 'kast' }),
        ]);
      }).spread(function(user1, task1, user2, task2) {
        _user1 = user1;
        _user2 = user2;
        _task2 = task2;
        return Promise.all([
          user1.setLinkedData('task', [task1]),
          task2.setLinkedData('user', [user2]),
        ]);
      }).then(function() {
        return Promise.all([
          _user1.destroy(),
          _task2.destroy(),
        ]);
      }).then(function() {
        return Promise.all([
          current.model('tasksusers').findAll({ where: { userId: _user1.id }}),
          current.model('tasksusers').findAll({ where: { taskId: _task2.id }}),
        ]);
      }).spread((ut1, ut2) => {
        expect(ut1).to.have.length(1);
        expect(ut2).to.have.length(1);
      });
    });
  });

  describe('Association options', () => {
    describe('allows the user to provide an attribute definition object as foreignKey', () => {
      it('works when taking a column directly from the object', function() {
        const Project = current.define<ItestInstance, ItestAttribute>('project', {});
        const User = current.define<ItestInstance, ItestAttribute>('user', {
          uid: {
            type: new DataTypes.INTEGER(),
            primaryKey: true
          }
        });

        const UserProjects = User.belongsToMany(Project, { foreignKey: { name: 'user_id', defaultValue: 42 }, through: 'UserProjects' });
        expect(UserProjects.through.model.rawAttributes.user_id).to.be.ok;
        expect(UserProjects.through.model.rawAttributes.user_id.references.model).to.equal(User.getTableName());
        expect(UserProjects.through.model.rawAttributes.user_id.references.key).to.equal('uid');
        expect(UserProjects.through.model.rawAttributes.user_id.defaultValue).to.equal(42);
      });
    });

    it('should throw an error if foreignKey and as result in a name clash', function() {
      const User = current.define<ItestInstance, ItestAttribute>('user', {
        user: new DataTypes.INTEGER()
      });

      expect(User.belongsToMany.bind(User, User, { as: 'user', through: 'UserUser' })).to
        .throw ('Naming collision between attribute \'user\' and association \'user\' on model user. To remedy this, change either foreignKey or as in your association definition');
    });
  });

  describe('selfAssociations', () => {
    it('should work with self reference', function() {
      const User = current.define<ItestInstance, ItestAttribute>('User', {
        name: new DataTypes.STRING(100)
      });
      const Follow = current.define<ItestInstance, ItestAttribute>('Follow');

      User.belongsToMany(User, { through: Follow, as: 'User' });
      User.belongsToMany(User, { through: Follow, as: 'Fan' });

      return current.sync({ force: true })
        .then(() => {
          return current.Promise.all([
            User.create({ name: 'Khsama' }),
            User.create({ name: 'Vivek' }),
            User.create({ name: 'Satya' }),
          ]);
        })
        .then(users => {
          return current.Promise.all([
            users[0].addLinkedData({ model : 'User', associationAlias : 'Fan' }, users[1]),
            users[1].addLinkedData({ model : 'User', associationAlias : 'User' }, users[2]),
            users[2].addLinkedData({ model : 'User', associationAlias : 'Fan' }, users[0]),
          ]);
        });
    });

    it('should work with custom self reference', function() {
      const User = current.define<ItestInstance, ItestAttribute>('User', {
        name: new DataTypes.STRING(100)
      });
      const UserFollowers = current.define<ItestInstance, ItestAttribute>('UserFollower');

      User.belongsToMany(User, {
        as: {
          singular: 'Follower',
          plural: 'Followers'
        },
        through: UserFollowers
      });

      User.belongsToMany(User, {
        as: {
          singular: 'Invitee',
          plural: 'Invitees'
        },
        foreignKey: 'InviteeId',
        through: 'Invites'
      });

      return current.sync({ force: true })
        .then(() => {
          return current.Promise.all([
            User.create({ name: 'Jalrangi' }),
            User.create({ name: 'Sargrahi' }),
          ]);
        })
        .then(users => {
          return current.Promise.all([
            users[0].addLinkedData({ model : 'User', associationAlias : 'Followers' }, users[1]),
            users[1].addLinkedData({ model : 'User', associationAlias : 'Followers' }, users[0]),
            users[0].addLinkedData({ model : 'User', associationAlias : 'Invitees' }, users[1]),
            users[1].addLinkedData({ model : 'User', associationAlias : 'Invitees' }, users[0]),
          ]);
        });
    });

    it('should setup correct foreign keys', function() {
      /* camcelCase */
      let Person = current.define<ItestInstance, ItestAttribute>('Person');
      let PersonChildren = current.define<ItestInstance, ItestAttribute>('PersonChildren');
      let Children;

      Children = Person.belongsToMany(Person, { as: 'Children', through: PersonChildren});

      expect(Children.foreignKey).to.equal('PersonId');
      expect(Children.otherKey).to.equal('ChildId');
      expect(PersonChildren.rawAttributes[Children.foreignKey]).to.be.ok;
      expect(PersonChildren.rawAttributes[Children.otherKey]).to.be.ok;

      /* underscored */
      Person = current.define<ItestInstance, ItestAttribute>('Person', {}, {underscored: true});
      PersonChildren = current.define<ItestInstance, ItestAttribute>('PersonChildren', {}, {underscored: true});
      Children = Person.belongsToMany(Person, { as: 'Children', through: PersonChildren});

      expect(Children.foreignKey).to.equal('PersonId');
      expect(Children.otherKey).to.equal('ChildId');
      expect(PersonChildren.rawAttributes[Children.foreignKey]).to.be.ok;
      expect(PersonChildren.rawAttributes[Children.otherKey]).to.be.ok;
      expect(PersonChildren.rawAttributes[Children.foreignKey].field).to.equal('person_id');
      expect(PersonChildren.rawAttributes[Children.otherKey].field).to.equal('child_id');
    });
  });
});
