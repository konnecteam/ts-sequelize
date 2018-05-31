'use strict';

import * as chai from 'chai';
import * as _ from 'lodash';
import * as sinon from 'sinon';
import { HasMany } from '../../../lib/associations/has-many';
import DataTypes from '../../../lib/data-types';
import Op from '../../../lib/operators';
import Support from '../../support';
const expect = chai.expect;
const stub = sinon.stub;
const current = Support.sequelize;
const Promise = current.Promise;

describe(Support.getTestDialectTeaser('hasMany'), () => {
  describe('optimizations using bulk create, destroy and update', () => {
    const User = current.define('User', { username: new DataTypes.STRING() });
    const Task = current.define('Task', { title: new DataTypes.STRING() });

    User.hasMany(Task);

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
      this.findAll = stub(Task, 'findAll').returns(Promise.resolve([]));
      this.update = stub(Task, 'update').returns(Promise.resolve([]));
    });

    afterEach(function() {
      this.findAll.restore();
      this.update.restore();
    });

    it('uses one update statement for addition', function() {
      return user.setTasks([task1, task2]).bind(this).  then(function() {
        expect(this.findAll).to.have.been.calledOnce;
        expect(this.update).to.have.been.calledOnce;
      });
    });

    it('uses one delete from statement', function() {
      this.findAll
        .onFirstCall().returns(Promise.resolve([]))
        .onSecondCall().returns(Promise.resolve([
          { userId: 42, taskId: 15 },
          { userId: 42, taskId: 16 }        ]));

      return user.setTasks([task1, task2]).bind(this).then(function() {
        this.update.reset();
        return user.setTasks(null);
      }).then(function() {
        expect(this.findAll).to.have.been.calledTwice;
        expect(this.update).to.have.been.calledOnce;
      });
    });
  });

  describe('mixin', () => {
    const User = current.define('User');
    const Task = current.define('Task');

    it('should mixin association methods', () => {
      const as = Math.random().toString();
      const association = new HasMany(User, Task, { as });
      const obj = {};

      association.mixin(obj);

      expect(obj[association.accessors.get]).to.be.an('function');
      expect(obj[association.accessors.set]).to.be.an('function');
      expect(obj[association.accessors.addMultiple]).to.be.an('function');
      expect(obj[association.accessors.add]).to.be.an('function');
      expect(obj[association.accessors.remove]).to.be.an('function');
      expect(obj[association.accessors.removeMultiple]).to.be.an('function');
      expect(obj[association.accessors.hasSingle]).to.be.an('function');
      expect(obj[association.accessors.hasAll]).to.be.an('function');
      expect(obj[association.accessors.count]).to.be.an('function');
    });

    it('should not override custom methods', () => {
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

      _.each(methods, (alias, method) => {
        User.prototype[method] = function() {
          const realMethod = this.constructor.associations.task[alias];
          expect(realMethod).to.be.a('function');
          return realMethod;
        };
      });

      User.hasMany(Task, { as: 'task' });

      const user = User.build();

      _.each(methods, (alias, method) => {
        expect(user[method]()).to.be.a('function');
      });
    });
  });

  describe('get', () => {
    const User = current.define('User', {});
    const Task = current.define('Task', {});
    const idA = Math.random().toString();
    const idB = Math.random().toString();
    const idC = Math.random().toString();
    const foreignKey = 'user_id';

    it('should fetch associations for a single instance', () => {
      const findAll = stub(Task, 'findAll').returns(Promise.resolve([
        Task.build({}),
        Task.build({}),
      ]));
      const where = {};

      User.Tasks = User.hasMany(Task, {foreignKey});
      const actual = User.Tasks.get(User.build({id: idA}));

      where[foreignKey] = idA;

      expect(findAll).to.have.been.calledOnce;
      expect(findAll.firstCall.args[0].where).to.deep.equal(where);

      return actual.then(results => {
        expect(results).to.be.an('array');
        expect(results.length).to.equal(2);
      }).finally(() => {
        findAll.restore();
      });
    });

    it('should fetch associations for multiple source instances', () => {
      const findAll = stub(Task, 'findAll').returns(
        Promise.resolve([
          Task.build({
            user_id: idA
          }),
          Task.build({
            user_id: idA
          }),
          Task.build({
            user_id: idA
          }),
          Task.build({
            user_id: idB
          }),
        ]));

      User.Tasks = User.hasMany(Task, {foreignKey});
      const actual = User.Tasks.get([
        User.build({id: idA}),
        User.build({id: idB}),
        User.build({id: idC}),
      ]);

      expect(findAll).to.have.been.calledOnce;
      expect(findAll.firstCall.args[0].where).to.have.property(foreignKey);
      expect(findAll.firstCall.args[0].where[foreignKey]).to.have.property(Op.in as any);
      expect(findAll.firstCall.args[0].where[foreignKey][Op.in]).to.deep.equal([idA, idB, idC]);

      return actual.then(result => {
        expect(result).to.be.an('object');
        expect(Object.keys(result)).to.deep.equal([idA, idB, idC]);

        expect(result[idA].length).to.equal(3);
        expect(result[idB].length).to.equal(1);
        expect(result[idC].length).to.equal(0);
      }).finally(() => {
        findAll.restore();
      });
    });
  });
});
