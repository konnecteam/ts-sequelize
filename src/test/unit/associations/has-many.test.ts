'use strict';

import * as chai from 'chai';
import * as sinon from 'sinon';
import DataTypes from '../../../lib/data-types';
import Op from '../../../lib/operators';
import { ItestAttribute, ItestInstance } from '../../dummy/dummy-data-set';
import Support from '../../support';
const expect = chai.expect;
const stub = sinon.stub;
const current = Support.sequelize;
const Promise = current.Promise;

describe(Support.getTestDialectTeaser('hasMany'), () => {
  describe('optimizations using bulk create, destroy and update', () => {
    const User = current.define<ItestInstance, ItestAttribute>('User', { username: new DataTypes.STRING() });
    const Task = current.define<ItestInstance, ItestAttribute>('Task', { title: new DataTypes.STRING() });

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
    const self = this;

    beforeEach(() => {
      self.oldFindAll = current.Model.prototype.findAll;
      self.oldupdate = current.Model.prototype.update;
      self.findAll = current.Model.prototype.findAll = stub().returns(Promise.resolve([]));
      self.update = current.Model.prototype.update = stub().returns(Promise.resolve([]));
    });

    afterEach(() => {
      current.Model.prototype.findAll = self.oldFindAll;
      current.Model.prototype.update = self.oldupdate;
    });

    it('uses one update statement for addition', function() {
      return user.setLinkedData('Task', [task1, task2]).bind(self).then(function() {
        expect(self.findAll).to.have.been.calledOnce;
        expect(self.update).to.have.been.calledOnce;
      });
    });

    it('uses one delete from statement', function() {
      self.findAll
        .onFirstCall().returns(Promise.resolve([]))
        .onSecondCall().returns(Promise.resolve([
          { userId: 42, taskId: 15 },
          { userId: 42, taskId: 16 }]));

      return user.setLinkedData('Task', [task1, task2]).bind(self).then(function() {
        self.update.reset();
        return user.setLinkedData('Task', null);
      }).then(function() {
        expect(self.findAll).to.have.been.calledTwice;
        expect(self.update).to.have.been.calledOnce;
      });
    });
  });

  describe('get', () => {
    const User = current.define<ItestInstance, ItestAttribute>('User', {});
    const Task = current.define<ItestInstance, ItestAttribute>('Task', {});
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

      const User_Tasks = User.hasMany(Task, {foreignKey});
      const actual = User_Tasks.get(User.build({id: idA}));

      where[foreignKey] = idA;

      expect(findAll).to.have.been.calledOnce;
      expect(findAll.firstCall.args[0].where).to.deep.equal(where);

      return (actual as any).then(results => {
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

      const User_Tasks = User.hasMany(Task, {foreignKey});
      const actual = User_Tasks.get([
        User.build({id: idA}),
        User.build({id: idB}),
        User.build({id: idC}),
      ]);

      expect(findAll).to.have.been.calledOnce;
      expect(findAll.firstCall.args[0].where).to.have.property(foreignKey);
      expect(findAll.firstCall.args[0].where[foreignKey]).to.have.property(Op.in as any);
      expect(findAll.firstCall.args[0].where[foreignKey][Op.in]).to.deep.equal([idA, idB, idC]);

      return (actual as any).then(result => {
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
