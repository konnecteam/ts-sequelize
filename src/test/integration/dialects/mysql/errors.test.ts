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
  describe('[MYSQL Specific] Errors', () => {

    const validateError = (promise, errClass, errValues) => {
      const wanted = Object.assign({}, errValues);

      return expect(promise).to.have.been.rejectedWith(errClass).then(() =>
        promise.catch(err => Object.keys(wanted).forEach(k => expect(err[k]).to.eql(wanted[k]))));
    };

    describe('ForeignKeyConstraintError', () => {
      let Task : Model<ItestInstance, ItestAttribute>;
      let User : Model<ItestInstance, ItestAttribute>;
      let user : ItestInstance;
      let task : ItestInstance;
      beforeEach(function() {
        Task = current.define<ItestInstance, ItestAttribute>('task', { title: new DataTypes.STRING() });
        User = current.define<ItestInstance, ItestAttribute>('user', { username: new DataTypes.STRING() });
        current.define<ItestInstance, ItestAttribute>('tasksusers', { userId: new DataTypes.INTEGER(), taskId: new DataTypes.INTEGER() });

        User.belongsToMany(Task, { onDelete: 'RESTRICT', through: 'tasksusers' });
        Task.belongsToMany(User, { onDelete: 'RESTRICT', through: 'tasksusers' });

        Task.belongsTo(User, { foreignKey: 'primaryUserId', as: 'primaryUsers' });
      });

      it('in context of DELETE restriction', function() {
        const ForeignKeyConstraintError = current.ForeignKeyConstraintError;

        return current.sync({ force: true }).bind({}).then(() => {
          return Promise.all([
            User.create({ id: 67, username: 'foo' }),
            Task.create({ id: 52, title: 'task' }),
          ]);
        }).spread(function(user1, task1) {
          user = user1;
          task = task1;
          return user.setLinkedData('task', [task]);
        }).then(function() {
          return Promise.all([
            validateError(user.destroy(), ForeignKeyConstraintError, {
              fields: ['userId'],
              table: 'users',
              value: undefined,
              index: 'tasksusers_ibfk_1',
              reltype: 'parent'
            }),
            validateError(task.destroy(), ForeignKeyConstraintError, {
              fields: ['taskId'],
              table: 'tasks',
              value: undefined,
              index: 'tasksusers_ibfk_2',
              reltype: 'parent'
            }),
          ]);
        });
      });

      it('in context of missing relation', function() {
        const ForeignKeyConstraintError = current.ForeignKeyConstraintError;

        return current.sync({ force: true }).then(() =>
          validateError(Task.create({ title: 'task', primaryUserId: 5 }), ForeignKeyConstraintError, {
            fields: ['primaryUserId'],
            table: 'users',
            value: 5,
            index: 'tasks_ibfk_1',
            reltype: 'child'
          }));
      });

    });
  });
}
