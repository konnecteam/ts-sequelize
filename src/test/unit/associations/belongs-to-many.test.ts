'use strict';

import * as chai from 'chai';
import * as _ from 'lodash';
import * as sinon from 'sinon';
import { BelongsTo } from '../../../lib/associations/belongs-to';
import { HasMany } from '../../../lib/associations/has-many';
import { HasOne } from '../../../lib/associations/has-one';
import DataTypes from '../../../lib/data-types';
import { ItestAttribute, ItestInstance } from '../../dummy/dummy-data-set';
import Support from '../../support';
const expect = chai.expect;
const stub = sinon.stub;
const current = Support.sequelize;
const Promise = current.Promise;
const AssociationError = require(__dirname + '/../../../lib/errors').AssociationError;

describe(Support.getTestDialectTeaser('belongsToMany'), () => {
  it('should not inherit scopes from parent to join table', () => {
    const A = current.define<ItestInstance, ItestAttribute>('a');
    const B = current.define<ItestInstance, ItestAttribute>('b', {}, {
      defaultScope: {
        where: {
          foo: 'bar'
        }
      },
      scopes: {
        baz: {
          where: {
            fooz: 'zab'
          }
        }
      }
    });

    B.belongsToMany(A, { through: 'AB' });

    const AB = current.model('AB');

    expect(AB.options.defaultScope).to.deep.equal({});
    expect(AB.options.scopes).to.have.length(0);
  });

  it('should not inherit validations from parent to join table', () => {
    const A = current.define<ItestInstance, ItestAttribute>('a');
    const B = current.define<ItestInstance, ItestAttribute>('b', {}, {
      validate: {
        validateModel() {
          return true;
        }
      }
    });

    B.belongsToMany(A, { through: 'AB' });

    const AB = current.model('AB');

    expect(AB.options.validate).to.deep.equal({});
  });

  it('should not override custom methods with association mixin', () => {
    const methods = {
      getTasks: 'get',
      countTasks: 'count',
      hasTask: 'has',
      hasTasks: 'has',
      setTasks: 'set',
      addTask: 'add',
      addTasks: 'add',
      removeTask: 'remove',
      removeTasks: 'remove',
      createTask: 'create'
    };
    const User = current.define<ItestInstance, ItestAttribute>('User');
    const Task = current.define<ItestInstance, ItestAttribute>('Task');

    _.each(methods, (alias, method) => {
      User.dataSetsMethods[method] = function() {
        const realMethod = this.model.associations.task[alias];
        expect(realMethod).to.be.a('function');
        return realMethod;
      };
    });

    User.belongsToMany(Task, { through: 'UserTasks', as: 'task' });

    const user = User.build();

    _.each(methods, (alias, method) => {
      expect(user[method]()).to.be.a('function');
    });
  });

  describe('proper syntax', () => {
    it('throws an AssociationError if the through option is undefined, true, or null', () => {
      const User = current.define<ItestInstance, ItestAttribute>('User', {});
      const Task = current.define<ItestInstance, ItestAttribute>('Task', {});

      const errorFunction1 = User.belongsToMany.bind(User, Task, { through: true });
      const errorFunction2 = User.belongsToMany.bind(User, Task, { through: undefined });
      const errorFunction3 = User.belongsToMany.bind(User, Task, { through: null });
      for (const errorFunction of [errorFunction1, errorFunction2, errorFunction3]) {
        expect(errorFunction).to.throw(AssociationError, 'belongsToMany must be given a through option, either a string or a model');
      }
    });
    it('throws an AssociationError for a self-association defined without an alias', () => {
      const User = current.define<ItestInstance, ItestAttribute>('User', {});

      const errorFunction = User.belongsToMany.bind(User, User, {through: 'jointable'});
      expect(errorFunction).to.throw(AssociationError, '\'as\' must be defined for many-to-many self-associations');
    });
  });

  describe('timestamps', () => {
    it('follows the global timestamps true option', () => {
      const User = current.define<ItestInstance, ItestAttribute>('User', {});
      const Task = current.define<ItestInstance, ItestAttribute>('Task', {});

      User.belongsToMany(Task, { through: 'user_task1' });

      expect(current.models.user_task1.rawAttributes).to.contain.all.keys(['createdAt', 'updatedAt']);
    });

    it('allows me to override the global timestamps option', () => {
      const User = current.define<ItestInstance, ItestAttribute>('User', {});
      const Task = current.define<ItestInstance, ItestAttribute>('Task', {});

      User.belongsToMany(Task, { through: 'user_task2', timestamps: false });

      expect(current.models.user_task2.rawAttributes).not.to.contain.all.keys(['createdAt', 'updatedAt']);
    });

    it('follows the global timestamps false option', () => {
      const _current = Support.createSequelizeInstance({
        timestamps: false
      });

      const User = _current.define<ItestInstance, ItestAttribute>('User', {});
      const Task = _current.define<ItestInstance, ItestAttribute>('Task', {});

      User.belongsToMany(Task, { through: 'user_task3' });

      expect(_current.models.user_task3.rawAttributes).not.to.have.all.keys(['createdAt', 'updatedAt']);
    });
  });

  describe('optimizations using bulk create, destroy and update', () => {

    const User = current.define<ItestInstance, ItestAttribute>('User', { username: new DataTypes.STRING() });
    const Task = current.define<ItestInstance, ItestAttribute>('Task', { title: new DataTypes.STRING() });
    const UserTasks = current.define<ItestInstance, ItestAttribute>('UserTasks', {});

    User.belongsToMany(Task, { through: UserTasks });
    Task.belongsToMany(User, { through: UserTasks });

    const user = User.build({
      id: 42
    });
    const task1 = Task.build({
      id: 15
    });
    const task2 = Task.build({
      id: 16
    });

    beforeEach(function() {
      this.findAll = stub(UserTasks, 'findAll').returns(Promise.resolve([]));
      this.bulkCreate = stub(UserTasks, 'bulkCreate').returns(Promise.resolve([]));
      this.destroy = stub(UserTasks, 'destroy').returns(Promise.resolve([]));
    });

    afterEach(function() {
      this.findAll.restore();
      this.bulkCreate.restore();
      this.destroy.restore();
    });

    it('uses one insert into statement', function() {
      return user.setLinkedData('Task', [task1, task2]).bind(this).then(function() {
        expect(this.findAll).to.have.been.calledOnce;
        expect(this.bulkCreate).to.have.been.calledOnce;
      });
    });

    it('uses one delete from statement', function() {
      this.findAll
        .onFirstCall().returns(Promise.resolve([]))
        .onSecondCall().returns(Promise.resolve([
          { userId: 42, taskId: 15 },
          { userId: 42, taskId: 16 }]));

      return user.setLinkedData('Task', [task1, task2]).bind(this).then(() => {
        return user.setLinkedData('Task', null);
      }).then(function() {
        expect(this.findAll).to.have.been.calledTwice;
        expect(this.destroy).to.have.been.calledOnce;
      });
    });
  });

  describe('foreign keys', () => {
    it('should infer otherKey from paired BTM relationship with a through string defined', function() {
      const User = current.define<ItestInstance, ItestAttribute>('User', {});
      const Place = current.define<ItestInstance, ItestAttribute>('Place', {});

      const Places = User.belongsToMany(Place, { through: 'user_places', foreignKey: 'user_id' });
      const Users = Place.belongsToMany(User, { through: 'user_places', foreignKey: 'place_id' });

      expect(Places.paired).to.equal(Users);
      expect(Users.paired).to.equal(Places);

      expect(Places.foreignKey).to.equal('user_id');
      expect(Users.foreignKey).to.equal('place_id');

      expect(Places.otherKey).to.equal('place_id');
      expect(Users.otherKey).to.equal('user_id');
    });

    it('should infer otherKey from paired BTM relationship with a through model defined', function() {
      const User = current.define<ItestInstance, ItestAttribute>('User', {});
      const Place = current.define<ItestInstance, ItestAttribute>('User', {});
      const UserPlace = current.define<ItestInstance, ItestAttribute>('UserPlace', {
        id: {
          primaryKey: true,
          type: new DataTypes.INTEGER(),
          autoIncrement: true
        }
      }, {timestamps: false});

      const Places = User.belongsToMany(Place, { through: UserPlace, foreignKey: 'user_id' });
      const Users = Place.belongsToMany(User, { through: UserPlace, foreignKey: 'place_id' });

      expect(Places.paired).to.equal(Users);
      expect(Users.paired).to.equal(Places);

      expect(Places.foreignKey).to.equal('user_id');
      expect(Users.foreignKey).to.equal('place_id');

      expect(Places.otherKey).to.equal('place_id');
      expect(Users.otherKey).to.equal('user_id');

      expect(Object.keys(UserPlace.rawAttributes).length).to.equal(3); // Defined primary key and two foreign keys
    });
  });

  describe('pseudo associations', () => {
    it('should setup belongsTo relations to source and target from join model with defined foreign/other keys', function() {
      const Product = current.define<ItestInstance, ItestAttribute>('Product', {
        title: new DataTypes.STRING()
      });
      const Tag = current.define<ItestInstance, ItestAttribute>('Tag', {
        name: new DataTypes.STRING()
      });
      const ProductTag = current.define<ItestInstance, ItestAttribute>('ProductTag', {
        id: {
          primaryKey: true,
          type: new DataTypes.INTEGER(),
          autoIncrement: true
        },
        priority: new DataTypes.INTEGER()
      }, {
        timestamps: false
      });

      const Product_Tags = Product.belongsToMany(Tag, {through: ProductTag, foreignKey: 'productId', otherKey: 'tagId'});
      const Tag_Products = Tag.belongsToMany(Product, {through: ProductTag, foreignKey: 'tagId', otherKey: 'productId'});

      expect(Product_Tags.toSource).to.be.an.instanceOf(BelongsTo);
      expect(Product_Tags.toTarget).to.be.an.instanceOf(BelongsTo);

      expect(Tag_Products.toSource).to.be.an.instanceOf(BelongsTo);
      expect(Tag_Products.toTarget).to.be.an.instanceOf(BelongsTo);

      expect(Product_Tags.toSource.foreignKey).to.equal(Product_Tags.foreignKey);
      expect(Product_Tags.toTarget.foreignKey).to.equal(Product_Tags.otherKey);

      expect(Tag_Products.toSource.foreignKey).to.equal(Tag_Products.foreignKey);
      expect(Tag_Products.toTarget.foreignKey).to.equal(Tag_Products.otherKey);

      expect(Object.keys(ProductTag.rawAttributes).length).to.equal(4);
      expect(Object.keys(ProductTag.rawAttributes)).to.deep.equal(['id', 'priority', 'productId', 'tagId']);
    });

    it('should setup hasOne relations to source and target from join model with defined foreign/other keys', function() {
      const Product = current.define<ItestInstance, ItestAttribute>('Product', {
        title: new DataTypes.STRING()
      });
      const Tag = current.define<ItestInstance, ItestAttribute>('Tag', {
        name: new DataTypes.STRING()
      });
      const ProductTag = current.define<ItestInstance, ItestAttribute>('ProductTag', {
        id: {
          primaryKey: true,
          type: new DataTypes.INTEGER(),
          autoIncrement: true
        },
        priority: new DataTypes.INTEGER()
      }, {
        timestamps: false
      });

      const Product_Tags = Product.belongsToMany(Tag, {through: ProductTag, foreignKey: 'productId', otherKey: 'tagId'});
      const Tag_Products = Tag.belongsToMany(Product, {through: ProductTag, foreignKey: 'tagId', otherKey: 'productId'});

      expect(Product_Tags.manyFromSource).to.be.an.instanceOf(HasMany);
      expect(Product_Tags.manyFromTarget).to.be.an.instanceOf(HasMany);

      expect(Tag_Products.manyFromSource).to.be.an.instanceOf(HasMany);
      expect(Tag_Products.manyFromTarget).to.be.an.instanceOf(HasMany);

      expect(Product_Tags.manyFromSource.foreignKey).to.equal(Product_Tags.foreignKey);
      expect(Product_Tags.manyFromTarget.foreignKey).to.equal(Product_Tags.otherKey);

      expect(Tag_Products.manyFromSource.foreignKey).to.equal(Tag_Products.foreignKey);
      expect(Tag_Products.manyFromTarget.foreignKey).to.equal(Tag_Products.otherKey);

      expect(Object.keys(ProductTag.rawAttributes).length).to.equal(4);
      expect(Object.keys(ProductTag.rawAttributes)).to.deep.equal(['id', 'priority', 'productId', 'tagId']);
    });

    it('should setup hasOne relations to source and target from join model with defined foreign/other keys', function() {
      const Product = current.define<ItestInstance, ItestAttribute>('Product', {
        title: new DataTypes.STRING()
      });
      const Tag = current.define<ItestInstance, ItestAttribute>('Tag', {
        name: new DataTypes.STRING()
      });
      const ProductTag = current.define<ItestInstance, ItestAttribute>('ProductTag', {
        id: {
          primaryKey: true,
          type: new DataTypes.INTEGER(),
          autoIncrement: true
        },
        priority: new DataTypes.INTEGER()
      }, {
        timestamps: false
      });

      const Product_Tags = Product.belongsToMany(Tag, {through: ProductTag, foreignKey: 'productId', otherKey: 'tagId'});
      const Tag_Products = Tag.belongsToMany(Product, {through: ProductTag, foreignKey: 'tagId', otherKey: 'productId'});

      expect(Product_Tags.oneFromSource).to.be.an.instanceOf(HasOne);
      expect(Product_Tags.oneFromTarget).to.be.an.instanceOf(HasOne);

      expect(Tag_Products.oneFromSource).to.be.an.instanceOf(HasOne);
      expect(Tag_Products.oneFromTarget).to.be.an.instanceOf(HasOne);

      expect(Product_Tags.oneFromSource.foreignKey).to.equal(Product_Tags.foreignKey);
      expect(Product_Tags.oneFromTarget.foreignKey).to.equal(Product_Tags.otherKey);

      expect(Tag_Products.oneFromSource.foreignKey).to.equal(Tag_Products.foreignKey);
      expect(Tag_Products.oneFromTarget.foreignKey).to.equal(Tag_Products.otherKey);

      expect(Object.keys(ProductTag.rawAttributes).length).to.equal(4);
      expect(Object.keys(ProductTag.rawAttributes)).to.deep.equal(['id', 'priority', 'productId', 'tagId']);
    });

    it('should setup belongsTo relations to source and target from join model with only foreign keys defined', function() {
      const Product = current.define<ItestInstance, ItestAttribute>('Product', {
        title: new DataTypes.STRING()
      });
      const Tag = current.define<ItestInstance, ItestAttribute>('Tag', {
        name: new DataTypes.STRING()
      });
      const ProductTag = current.define<ItestInstance, ItestAttribute>('ProductTag', {
        id: {
          primaryKey: true,
          type: new DataTypes.INTEGER(),
          autoIncrement: true
        },
        priority: new DataTypes.INTEGER()
      }, {
        timestamps: false
      });

      const Product_Tags = Product.belongsToMany(Tag, {through: ProductTag, foreignKey: 'product_ID'});
      const Tag_Products = Tag.belongsToMany(Product, {through: ProductTag, foreignKey: 'tag_ID'});

      expect(Product_Tags.toSource).to.be.ok;
      expect(Product_Tags.toTarget).to.be.ok;

      expect(Tag_Products.toSource).to.be.ok;
      expect(Tag_Products.toTarget).to.be.ok;

      expect(Product_Tags.toSource.foreignKey).to.equal(Product_Tags.foreignKey);
      expect(Product_Tags.toTarget.foreignKey).to.equal(Product_Tags.otherKey);

      expect(Tag_Products.toSource.foreignKey).to.equal(Tag_Products.foreignKey);
      expect(Tag_Products.toTarget.foreignKey).to.equal(Tag_Products.otherKey);

      expect(Object.keys(ProductTag.rawAttributes).length).to.equal(4);
      expect(Object.keys(ProductTag.rawAttributes)).to.deep.equal(['id', 'priority', 'product_ID', 'tag_ID']);
    });

    it('should setup hasOne relations to source and target from join model with only foreign keys defined', function() {
      const Product = current.define<ItestInstance, ItestAttribute>('Product', {
        title: new DataTypes.STRING()
      });
      const Tag = current.define<ItestInstance, ItestAttribute>('Tag', {
        name: new DataTypes.STRING()
      });
      const ProductTag = current.define<ItestInstance, ItestAttribute>('ProductTag', {
        id: {
          primaryKey: true,
          type: new DataTypes.INTEGER(),
          autoIncrement: true
        },
        priority: new DataTypes.INTEGER()
      }, {
        timestamps: false
      });

      const Product_Tags = Product.belongsToMany(Tag, {through: ProductTag, foreignKey: 'product_ID'});
      const Tag_Products = Tag.belongsToMany(Product, {through: ProductTag, foreignKey: 'tag_ID'});

      expect(Product_Tags.oneFromSource).to.be.an.instanceOf(HasOne);
      expect(Product_Tags.oneFromTarget).to.be.an.instanceOf(HasOne);

      expect(Tag_Products.oneFromSource).to.be.an.instanceOf(HasOne);
      expect(Tag_Products.oneFromTarget).to.be.an.instanceOf(HasOne);

      expect(Product_Tags.oneFromSource.foreignKey).to.equal(Product_Tags.foreignKey);
      expect(Product_Tags.oneFromTarget.foreignKey).to.equal(Product_Tags.otherKey);

      expect(Tag_Products.oneFromSource.foreignKey).to.equal(Tag_Products.foreignKey);
      expect(Tag_Products.oneFromTarget.foreignKey).to.equal(Tag_Products.otherKey);

      expect(Object.keys(ProductTag.rawAttributes).length).to.equal(4);
      expect(Object.keys(ProductTag.rawAttributes)).to.deep.equal(['id', 'priority', 'product_ID', 'tag_ID']);
    });

    it('should setup belongsTo relations to source and target from join model with no foreign keys defined', function() {
      const Product = current.define<ItestInstance, ItestAttribute>('Product', {
        title: new DataTypes.STRING()
      });
      const Tag = current.define<ItestInstance, ItestAttribute>('Tag', {
        name: new DataTypes.STRING()
      });
      const ProductTag = current.define<ItestInstance, ItestAttribute>('ProductTag', {
        id: {
          primaryKey: true,
          type: new DataTypes.INTEGER(),
          autoIncrement: true
        },
        priority: new DataTypes.INTEGER()
      }, {
        timestamps: false
      });

      const Product_Tags = Product.belongsToMany(Tag, {through: ProductTag});
      const Tag_Products = Tag.belongsToMany(Product, {through: ProductTag});

      expect(Product_Tags.toSource).to.be.ok;
      expect(Product_Tags.toTarget).to.be.ok;

      expect(Tag_Products.toSource).to.be.ok;
      expect(Tag_Products.toTarget).to.be.ok;

      expect(Product_Tags.toSource.foreignKey).to.equal(Product_Tags.foreignKey);
      expect(Product_Tags.toTarget.foreignKey).to.equal(Product_Tags.otherKey);

      expect(Tag_Products.toSource.foreignKey).to.equal(Tag_Products.foreignKey);
      expect(Tag_Products.toTarget.foreignKey).to.equal(Tag_Products.otherKey);

      expect(Object.keys(ProductTag.rawAttributes).length).to.equal(4);
      expect(Object.keys(ProductTag.rawAttributes)).to.deep.equal(['id', 'priority', 'ProductId', 'TagId']);
    });
  });

  describe('self-associations', () => {
    it('does not pair multiple self associations with different through arguments', () => {
      const User = current.define<ItestInstance, ItestAttribute>('user', {});
      const UserFollowers = current.define<ItestInstance, ItestAttribute>('userFollowers', {});
      const Invite = current.define<ItestInstance, ItestAttribute>('invite', {});

      const User_Followers = User.belongsToMany(User, {
        as: 'Followers',
        through: UserFollowers
      });

      const User_Invites = User.belongsToMany(User, {
        as: 'Invites',
        foreignKey: 'InviteeId',
        through: Invite
      });

      expect(User_Followers.paired).not.to.be.ok;
      expect(User_Invites.paired).not.to.be.ok;

      expect(User_Followers.otherKey).not.to.equal(User_Invites.foreignKey);
    });

    it('correctly generates a foreign/other key when none are defined', () => {
      const User = current.define<ItestInstance, ItestAttribute>('user', {});
      const UserFollowers = current.define<ItestInstance, ItestAttribute>('userFollowers', {
        id: {
          type: new DataTypes.INTEGER(),
          primaryKey: true,
          autoIncrement: true
        }
      }, {
        timestamps: false
      });

      const User_Followers = User.belongsToMany(User, {
        as: 'Followers',
        through: UserFollowers
      });

      expect(User_Followers.foreignKey).to.be.ok;
      expect(User_Followers.otherKey).to.be.ok;

      expect(Object.keys(UserFollowers.rawAttributes).length).to.equal(3);
    });
  });

  describe('constraints', () => {

    it('work properly when through is a string', function() {
      const User = current.define<ItestInstance, ItestAttribute>('User', {});
      const Group = current.define<ItestInstance, ItestAttribute>('Group', {});

      User.belongsToMany(Group, { as: 'MyGroups', through: 'group_user', onUpdate: 'RESTRICT', onDelete: 'SET NULL' });
      Group.belongsToMany(User, { as: 'MyUsers', through: 'group_user', onUpdate: 'SET NULL', onDelete: 'RESTRICT' });

      expect(Group.associations.MyUsers.through.model === User.associations.MyGroups.through.model);
      expect(Group.associations.MyUsers.through.model.rawAttributes.UserId.onUpdate).to.equal('RESTRICT');
      expect(Group.associations.MyUsers.through.model.rawAttributes.UserId.onDelete).to.equal('SET NULL');
      expect(Group.associations.MyUsers.through.model.rawAttributes.GroupId.onUpdate).to.equal('SET NULL');
      expect(Group.associations.MyUsers.through.model.rawAttributes.GroupId.onDelete).to.equal('RESTRICT');
    });

    it('work properly when through is a model', function() {
      const User = current.define<ItestInstance, ItestAttribute>('User', {});
      const Group = current.define<ItestInstance, ItestAttribute>('Group', {});
      const UserGroup = current.define<ItestInstance, ItestAttribute>('GroupUser', {}, {tableName: 'user_groups'});

      User.belongsToMany(Group, { as: 'MyGroups', through: UserGroup, onUpdate: 'RESTRICT', onDelete: 'SET NULL' });
      Group.belongsToMany(User, { as: 'MyUsers', through: UserGroup, onUpdate: 'SET NULL', onDelete: 'RESTRICT' });

      expect(Group.associations.MyUsers.through.model === User.associations.MyGroups.through.model);
      expect(Group.associations.MyUsers.through.model.rawAttributes.UserId.onUpdate).to.equal('RESTRICT');
      expect(Group.associations.MyUsers.through.model.rawAttributes.UserId.onDelete).to.equal('SET NULL');
      expect(Group.associations.MyUsers.through.model.rawAttributes.GroupId.onUpdate).to.equal('SET NULL');
      expect(Group.associations.MyUsers.through.model.rawAttributes.GroupId.onDelete).to.equal('RESTRICT');
    });
  });
});
