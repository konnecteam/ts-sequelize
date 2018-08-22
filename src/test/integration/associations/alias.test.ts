'use strict';


import * as chai from 'chai';
import { Sequelize } from '../../../index';
import { ItestAttribute, ItestInstance } from '../../dummy/dummy-data-set';
import Support from '../support';
const expect = chai.expect;
const Promise = Sequelize.Promise;
const current = Support.sequelize;

describe(Support.getTestDialectTeaser('Alias'), () => {
  it('should uppercase the first letter in alias getter, but not in eager loading', function() {
    const User = current.define<ItestInstance, ItestAttribute>('user', {});
    const Task = current.define<ItestInstance, ItestAttribute>('task', {});

    User.hasMany(Task, { as: 'assignments', foreignKey: 'userId' });
    Task.belongsTo(User, { as: 'owner', foreignKey: 'userId' });

    return current.sync({ force: true }).then(() => {
      return User.create({ id: 1 });
    }).then(() => {
      return Task.create({ id: 1, userId: 1 });
    }).then(() => {
      return Promise.all([
        User.find({ where: { id: 1 }, include: [{model: Task, as: 'assignments'}] }),
        Task.find({ where: { id: 1 }, include: [{model: User, as: 'owner'}] }),
      ]);
    }).spread((user, task) => {
      expect(user.assignments).to.be.ok;
      expect(task.owner).to.be.ok;
    });
  });

  it('shouldnt touch the passed alias', function() {
    const  User = current.define<ItestInstance, ItestAttribute>('user', {});
    const Task = current.define<ItestInstance, ItestAttribute>('task', {});

    User.hasMany(Task, { as: 'ASSIGNMENTS', foreignKey: 'userId' });
    Task.belongsTo(User, { as: 'OWNER', foreignKey: 'userId' });

    return current.sync({ force: true }).then(() => {
      return User.create({ id: 1 });
    }).then(() => {
      return Task.create({ id: 1, userId: 1 });
    }).then(() => {
      return Promise.all([
        User.find({ where: { id: 1 }, include: [{model: Task, as: 'ASSIGNMENTS'}] }),
        Task.find({ where: { id: 1 }, include: [{model: User, as: 'OWNER'}] })]);
    }).spread((user, task) => {
      expect(user.ASSIGNMENTS).to.be.ok;
      expect(task.OWNER).to.be.ok;
    });
  });

  it('should allow me to pass my own plural and singular forms to hasMany', function() {
    const User = current.define<ItestInstance, ItestAttribute>('user', {});
    const Task = current.define<ItestInstance, ItestAttribute>('task', {});

    User.hasMany(Task, { as: { singular: 'task', plural: 'taskz'} });

    return current.sync({ force: true }).then(() => {
      return User.create({ id: 1 });
    }).then(() => {
      return User.find({ where: { id: 1 }, include: [{model: Task, as: 'taskz'}] });
    }).then(user => {
      expect(user.taskz).to.be.ok;
    });
  });

  it('should allow me to define plural and singular forms on the model', function() {
    const User = current.define<ItestInstance, ItestAttribute>('user', {});
    const Task = current.define<ItestInstance, ItestAttribute>('task', {}, {
      name: {
        singular: 'assignment',
        plural: 'assignments'
      }
    });

    User.hasMany(Task);

    return current.sync({ force: true }).then(() => {
      return User.create({ id: 1 });
    }).then(() => {
      return User.find({ where: { id: 1 }, include: [Task] });
    }).then(user => {
      expect(user.assignments).to.be.ok;
    });
  });
});
