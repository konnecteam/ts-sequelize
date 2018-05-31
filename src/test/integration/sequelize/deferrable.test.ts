'use strict';

import * as chai from 'chai';
import * as _ from 'lodash';
import {Sequelize} from '../../../index';
import DataTypes from '../../../lib/data-types';
import config from '../../config/config';
import Support from '../support';
const expect = chai.expect;

if (Support.sequelize.dialect.supports.deferrableConstraints) {
  describe(Support.getTestDialectTeaser('Sequelize'), () => {
    describe('Deferrable', () => {
      beforeEach(function() {
        this.run = function(deferrable, options) {
          options = options || {};

          const taskTableName      = options.taskTableName || 'tasks_' + config.rand();
          const transactionOptions = _.assign({}, { deferrable: new Sequelize.Deferrable.SetDeferred() }, options);
          const userTableName      = 'users_' + config.rand();

          const User = this.sequelize.define(
            'User', { name: new DataTypes.STRING() }, { tableName: userTableName }
          );

          const Task = this.sequelize.define(
            'Task', {
              title: new DataTypes.STRING(),
              user_id: {
                allowNull: false,
                type: new DataTypes.INTEGER(),
                references: {
                  model: userTableName,
                  key: 'id',
                  deferrable
                }
              }
            }, {
              tableName: taskTableName
            }
          );

          return User.sync({ force: true }).bind(this).then(() => {
            return Task.sync({ force: true });
          }).then(function() {
            return this.sequelize.transaction(transactionOptions, t => {
              return Task
                .create({ title: 'a task', user_id: -1 }, { transaction: t })
                .then(task => {
                  return [task, User.create({}, { transaction: t })];
                })
                .spread((task, user) => {
                  task.user_id = user.id;
                  return task.save({ transaction: t });
                });
            });
          });
        };
      });

      describe('NOT', () => {
        it('does not allow the violation of the foreign key constraint', function() {
          return expect(this.run(new Sequelize.Deferrable.NOT())).to.eventually.be.rejectedWith(Sequelize.ForeignKeyConstraintError);
        });
      });

      describe('InitiallyImmediate', () => {
        it('allows the violation of the foreign key constraint if the transaction is deferred', function() {
          return this
            .run(new Sequelize.Deferrable.InitiallyImmediate())
            .then(task => {
              expect(task.title).to.equal('a task');
              expect(task.user_id).to.equal(1);
            });
        });

        it('does not allow the violation of the foreign key constraint if the transaction is not deffered', function() {
          return expect(this.run(new Sequelize.Deferrable.InitiallyImmediate(), {
            deferrable: undefined
          })).to.eventually.be.rejectedWith(Sequelize.ForeignKeyConstraintError);
        });

        it('allows the violation of the foreign key constraint if the transaction deferres only the foreign key constraint', function() {
          const taskTableName = 'tasks_' + config.rand();

          return this
            .run(new Sequelize.Deferrable.InitiallyImmediate(), {
              deferrable: new Sequelize.Deferrable.SetDeferred([taskTableName + '_user_id_fkey']),
              taskTableName
            })
            .then(task => {
              expect(task.title).to.equal('a task');
              expect(task.user_id).to.equal(1);
            });
        });
      });

      describe('InitiallyDeferred', () => {
        it('allows the violation of the foreign key constraint', function() {
          return this
            .run(new Sequelize.Deferrable.InitiallyDeferred())
            .then(task => {
              expect(task.title).to.equal('a task');
              expect(task.user_id).to.equal(1);
            });
        });
      });
    });
  });
}
