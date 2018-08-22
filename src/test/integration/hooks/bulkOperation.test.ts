'use strict';

import * as Promise from 'bluebird';
import * as chai from 'chai';
import * as sinon from 'sinon';
import { Model } from '../../..';
import DataTypes from '../../../lib/data-types';
import { ItestAttribute, ItestInstance } from '../../dummy/dummy-data-set';
import Support from '../support';
const expect = chai.expect;
const current = Support.sequelize;

describe(Support.getTestDialectTeaser('Hooks'), () => {
  let User : Model<ItestInstance, ItestAttribute>;
  let ParanoidUser : Model<ItestInstance, ItestAttribute>;
  beforeEach(function() {
    User = current.define<ItestInstance, ItestAttribute>('User', {
      username: {
        type: new DataTypes.STRING(),
        allowNull: false
      },
      mood: {
        type: new DataTypes.ENUM(),
        values: ['happy', 'sad', 'neutral']
      }
    });

    ParanoidUser = current.define<ItestInstance, ItestAttribute>('ParanoidUser', {
      username: new DataTypes.STRING(),
      mood: {
        type: new DataTypes.ENUM(),
        values: ['happy', 'sad', 'neutral']
      }
    }, {
      paranoid: true
    });

    return current.sync({ force: true });
  });

  describe('#bulkCreate', () => {
    describe('on success', () => {
      it('should run hooks', function() {
        const beforeBulk = sinon.spy();
        const afterBulk = sinon.spy();

        User.beforeBulkCreate(beforeBulk);

        User.afterBulkCreate(afterBulk);

        return User.bulkCreate([
          {username: 'Cheech', mood: 'sad'},
          {username: 'Chong', mood: 'sad'},
        ]).then(() => {
          expect(beforeBulk).to.have.been.calledOnce;
          expect(afterBulk).to.have.been.calledOnce;
        });
      });
    });

    describe('on error', () => {
      it('should return an error from before', function() {
        User.beforeBulkCreate(() => {
          throw new Error('Whoops!');
        });

        return expect(User.bulkCreate([
          {username: 'Cheech', mood: 'sad'},
          {username: 'Chong', mood: 'sad'},
        ])).to.be.rejected;
      });

      it('should return an error from after', function() {
        User.afterBulkCreate(() => {
          throw new Error('Whoops!');
        });

        return expect(User.bulkCreate([
          {username: 'Cheech', mood: 'sad'},
          {username: 'Chong', mood: 'sad'},
        ])).to.be.rejected;
      });
    });

    describe('with the {individualHooks: true} option', () => {
      beforeEach(function() {
        User = current.define<ItestInstance, ItestAttribute>('User', {
          username: {
            type: new DataTypes.STRING(),
            defaultValue: ''
          },
          beforeHookTest: {
            type: new DataTypes.BOOLEAN(),
            defaultValue: false
          },
          aNumber: {
            type: new DataTypes.INTEGER(),
            defaultValue: 0
          }
        });

        return User.sync({ force: true });
      });

      it('should run the afterCreate/beforeCreate functions for each item created successfully', function() {
        let beforeBulkCreate = false;
        let afterBulkCreate = false;

        User.beforeBulkCreate(() => {
          beforeBulkCreate = true;
          return Promise.resolve();
        });

        User.afterBulkCreate(() => {
          afterBulkCreate = true;
          return Promise.resolve();
        });

        User.beforeCreate(user => {
          user.beforeHookTest = true;
          return Promise.resolve();
        });

        User.afterCreate(user => {
          user.username = 'User' + user.id;
          return Promise.resolve();
        });

        return User.bulkCreate([{aNumber: 5}, {aNumber: 7}, {aNumber: 3}], { fields: ['aNumber'], individualHooks: true }).then(records => {
          records.forEach(record => {
            expect(record.username).to.equal('User' + record.id);
            expect(record.beforeHookTest).to.be.true;
          });
          expect(beforeBulkCreate).to.be.true;
          expect(afterBulkCreate).to.be.true;
        });
      });

      it('should run the afterCreate/beforeCreate functions for each item created with an error', function() {
        let beforeBulkCreate = false;
        let afterBulkCreate = false;

        User.beforeBulkCreate(() => {
          beforeBulkCreate = true;
          return Promise.resolve();
        });

        User.afterBulkCreate(() => {
          afterBulkCreate = true;
          return Promise.resolve();
        });

        User.beforeCreate(() => {
          return Promise.reject(new Error('You shall not pass!'));
        });

        User.afterCreate(user => {
          user.username = 'User' + user.id;
          return Promise.resolve();
        });

        return User.bulkCreate([{aNumber: 5}, {aNumber: 7}, {aNumber: 3}], { fields: ['aNumber'], individualHooks: true }).catch(err => {
          expect(err).to.be.instanceOf(Error);
          expect(beforeBulkCreate).to.be.true;
          expect(afterBulkCreate).to.be.false;
        });
      });
    });
  });

  describe('#bulkUpdate', () => {
    describe('on success', () => {
      it('should run hooks', function() {
        const beforeBulk = sinon.spy();
        const afterBulk = sinon.spy();

        User.beforeBulkUpdate(beforeBulk);
        User.afterBulkUpdate(afterBulk);

        return User.bulkCreate([
          {username: 'Cheech', mood: 'sad'},
          {username: 'Chong', mood: 'sad'},
        ]).then(() => {
          return User.update({mood: 'happy'}, {where: {mood: 'sad'}}).then(() => {
            expect(beforeBulk).to.have.been.calledOnce;
            expect(afterBulk).to.have.been.calledOnce;
          });
        });
      });
    });

    describe('on error', () => {
      it('should return an error from before', function() {

        User.beforeBulkUpdate(() => {
          throw new Error('Whoops!');
        });

        return User.bulkCreate([
          {username: 'Cheech', mood: 'sad'},
          {username: 'Chong', mood: 'sad'},
        ]).then(() => {
          return expect(User.update({mood: 'happy'}, {where: {mood: 'sad'}})).to.be.rejected;
        });
      });

      it('should return an error from after', function() {

        User.afterBulkUpdate(() => {
          throw new Error('Whoops!');
        });

        return User.bulkCreate([
          {username: 'Cheech', mood: 'sad'},
          {username: 'Chong', mood: 'sad'},
        ]).then(() => {
          return expect(User.update({mood: 'happy'}, {where: {mood: 'sad'}})).to.be.rejected;
        });
      });
    });

    describe('with the {individualHooks: true} option', () => {
      beforeEach(function() {
        User = current.define<ItestInstance, ItestAttribute>('User', {
          username: {
            type: new DataTypes.STRING(),
            defaultValue: ''
          },
          beforeHookTest: {
            type: new DataTypes.BOOLEAN(),
            defaultValue: false
          },
          aNumber: {
            type: new DataTypes.INTEGER(),
            defaultValue: 0
          }
        });

        return User.sync({ force: true });
      });

      it('should run the after/before functions for each item created successfully', function() {
        const beforeBulk = sinon.spy();
        const afterBulk = sinon.spy();

        User.beforeBulkUpdate(beforeBulk);

        User.afterBulkUpdate(afterBulk);

        User.beforeUpdate(user => {
          expect(user.changed()).to.not.be.empty;
          user.beforeHookTest = true;
        });

        User.afterUpdate(user => {
          user.username = 'User' + user.id;
        });

        return User.bulkCreate([
          {aNumber: 1}, {aNumber: 1}, {aNumber: 1},
        ]).then(() => {
          return User.update({aNumber: 10}, {where: {aNumber: 1}, individualHooks: true}).spread((affectedRows, records) => {
            records.forEach(record => {
              expect(record.username).to.equal('User' + record.id);
              expect(record.beforeHookTest).to.be.true;
            });
            expect(beforeBulk).to.have.been.calledOnce;
            expect(afterBulk).to.have.been.calledOnce;
          });
        });
      });

      it('should run the after/before functions for each item created successfully changing some data before updating', function() {

        User.beforeUpdate(user => {
          expect(user.changed()).to.not.be.empty;
          if (user.get('id') === 1) {
            user.set('aNumber', user.get('aNumber') + 3);
          }
        });

        return User.bulkCreate([
          {aNumber: 1}, {aNumber: 1}, {aNumber: 1},
        ]).then(() => {
          return User.update({aNumber: 10}, {where: {aNumber: 1}, individualHooks: true}).spread((affectedRows, records) => {
            records.forEach(record => {
              expect(record.aNumber).to.equal(10 + (record.id === 1 ? 3 : 0));
            });
          });
        });
      });

      it('should run the after/before functions for each item created with an error', function() {
        const beforeBulk = sinon.spy();
        const afterBulk = sinon.spy();

        User.beforeBulkUpdate(beforeBulk);

        User.afterBulkUpdate(afterBulk);

        User.beforeUpdate(() => {
          throw new Error('You shall not pass!');
        });

        User.afterUpdate(user => {
          user.username = 'User' + user.id;
        });

        return User.bulkCreate([{aNumber: 1}, {aNumber: 1}, {aNumber: 1}], { fields: ['aNumber'] }).then(() => {
          return User.update({aNumber: 10}, {where: {aNumber: 1}, individualHooks: true}).catch(err => {
            expect(err).to.be.instanceOf(Error);
            expect(err.message).to.be.equal('You shall not pass!');
            expect(beforeBulk).to.have.been.calledOnce;
            expect(afterBulk).not.to.have.been.called;
          });
        });
      });
    });
  });

  describe('#bulkDestroy', () => {
    describe('on success', () => {
      it('should run hooks', function() {
        const beforeBulk = sinon.spy();
        const afterBulk = sinon.spy();

        User.beforeBulkDestroy(beforeBulk);
        User.afterBulkDestroy(afterBulk);

        return User.destroy({where: {username: 'Cheech', mood: 'sad'}}).then(() => {
          expect(beforeBulk).to.have.been.calledOnce;
          expect(afterBulk).to.have.been.calledOnce;
        });
      });
    });

    describe('on error', () => {
      it('should return an error from before', function() {
        User.beforeBulkDestroy(() => {
          throw new Error('Whoops!');
        });

        return expect(User.destroy({where: {username: 'Cheech', mood: 'sad'}})).to.be.rejected;
      });

      it('should return an error from after', function() {
        User.afterBulkDestroy(() => {
          throw new Error('Whoops!');
        });

        return expect(User.destroy({where: {username: 'Cheech', mood: 'sad'}})).to.be.rejected;
      });
    });

    describe('with the {individualHooks: true} option', () => {
      beforeEach(function() {
        User = current.define<ItestInstance, ItestAttribute>('User', {
          username: {
            type: new DataTypes.STRING(),
            defaultValue: ''
          },
          beforeHookTest: {
            type: new DataTypes.BOOLEAN(),
            defaultValue: false
          },
          aNumber: {
            type: new DataTypes.INTEGER(),
            defaultValue: 0
          }
        });

        return User.sync({ force: true });
      });

      it('should run the after/before functions for each item created successfully', function() {
        let beforeBulk = false;
        let afterBulk = false;
        let beforeHook = false;
        let afterHook = false;

        User.beforeBulkDestroy(() => {
          beforeBulk = true;
          return Promise.resolve();
        });

        User.afterBulkDestroy(() => {
          afterBulk = true;
          return Promise.resolve();
        });

        User.beforeDestroy(() => {
          beforeHook = true;
          return Promise.resolve();
        });

        User.afterDestroy(() => {
          afterHook = true;
          return Promise.resolve();
        });

        return User.bulkCreate([
          {aNumber: 1}, {aNumber: 1}, {aNumber: 1},
        ]).then(() => {
          return User.destroy({where: {aNumber: 1}, individualHooks: true}).then(() => {
            expect(beforeBulk).to.be.true;
            expect(afterBulk).to.be.true;
            expect(beforeHook).to.be.true;
            expect(afterHook).to.be.true;
          });
        });
      });

      it('should run the after/before functions for each item created with an error', function() {
        let beforeBulk = false;
        let afterBulk = false;
        let beforeHook = false;
        let afterHook = false;

        User.beforeBulkDestroy(() => {
          beforeBulk = true;
          return Promise.resolve();
        });

        User.afterBulkDestroy(() => {
          afterBulk = true;
          return Promise.resolve();
        });

        User.beforeDestroy(() => {
          beforeHook = true;
          return Promise.reject(new Error('You shall not pass!'));
        });

        User.afterDestroy(() => {
          afterHook = true;
          return Promise.resolve();
        });

        return User.bulkCreate([{aNumber: 1}, {aNumber: 1}, {aNumber: 1}], { fields: ['aNumber'] }).then(() => {
          return User.destroy({where: {aNumber: 1}, individualHooks: true}).catch(err => {
            expect(err).to.be.instanceOf(Error);
            expect(beforeBulk).to.be.true;
            expect(beforeHook).to.be.true;
            expect(afterBulk).to.be.false;
            expect(afterHook).to.be.false;
          });
        });
      });
    });
  });

  describe('#bulkRestore', () => {
    beforeEach(function() {
      return ParanoidUser.bulkCreate([
        {username: 'adam', mood: 'happy'},
        {username: 'joe', mood: 'sad'},
      ]).bind(this).then(function() {
        return ParanoidUser.destroy({truncate: true});
      });
    });

    describe('on success', () => {
      it('should run hooks', function() {
        const beforeBulk = sinon.spy();
        const afterBulk = sinon.spy();

        ParanoidUser.beforeBulkRestore(beforeBulk);
        ParanoidUser.afterBulkRestore(afterBulk);

        return ParanoidUser.restore({where: {username: 'adam', mood: 'happy'}}).then(() => {
          expect(beforeBulk).to.have.been.calledOnce;
          expect(afterBulk).to.have.been.calledOnce;
        });
      });
    });

    describe('on error', () => {
      it('should return an error from before', function() {
        ParanoidUser.beforeBulkRestore(() => {
          throw new Error('Whoops!');
        });

        return expect(ParanoidUser.restore({where: {username: 'adam', mood: 'happy'}})).to.be.rejected;
      });

      it('should return an error from after', function() {
        ParanoidUser.afterBulkRestore(() => {
          throw new Error('Whoops!');
        });

        return expect(ParanoidUser.restore({where: {username: 'adam', mood: 'happy'}})).to.be.rejected;
      });
    });

    describe('with the {individualHooks: true} option', () => {
      beforeEach(function() {
        ParanoidUser = current.define<ItestInstance, ItestAttribute>('ParanoidUser', {
          aNumber: {
            type: new DataTypes.INTEGER(),
            defaultValue: 0
          }
        }, {
          paranoid: true
        });

        return ParanoidUser.sync({ force: true });
      });

      it('should run the after/before functions for each item restored successfully', function() {
        const beforeBulk = sinon.spy();
        const afterBulk = sinon.spy();
        const beforeHook = sinon.spy();
        const afterHook = sinon.spy();

        ParanoidUser.beforeBulkRestore(beforeBulk);
        ParanoidUser.afterBulkRestore(afterBulk);
        ParanoidUser.beforeRestore(beforeHook);
        ParanoidUser.afterRestore(afterHook);

        return ParanoidUser.bulkCreate([
          {aNumber: 1}, {aNumber: 1}, {aNumber: 1},
        ]).then(() => {
          return ParanoidUser.destroy({where: {aNumber: 1}});
        }).then(() => {
          return ParanoidUser.restore({where: {aNumber: 1}, individualHooks: true});
        }).then(() => {
          expect(beforeBulk).to.have.been.calledOnce;
          expect(afterBulk).to.have.been.calledOnce;
          expect(beforeHook).to.have.been.calledThrice;
          expect(afterHook).to.have.been.calledThrice;
        });
      });

      it('should run the after/before functions for each item restored with an error', function() {
        const beforeBulk = sinon.spy();
        const afterBulk = sinon.spy();
        const beforeHook = sinon.spy();
        const afterHook = sinon.spy();

        ParanoidUser.beforeBulkRestore(beforeBulk);
        ParanoidUser.afterBulkRestore(afterBulk);
        ParanoidUser.beforeRestore(() => {
          beforeHook();
          return Promise.reject(new Error('You shall not pass!'));
        });

        ParanoidUser.afterRestore(afterHook);

        return ParanoidUser.bulkCreate([{aNumber: 1}, {aNumber: 1}, {aNumber: 1}], { fields: ['aNumber'] }).then(() => {
          return ParanoidUser.destroy({where: {aNumber: 1}});
        }).then(() => {
          return ParanoidUser.restore({where: {aNumber: 1}, individualHooks: true});
        }).catch(err => {
          expect(err).to.be.instanceOf(Error);
          expect(beforeBulk).to.have.been.calledOnce;
          expect(beforeHook).to.have.been.calledThrice;
          expect(afterBulk).not.to.have.been.called;
          expect(afterHook).not.to.have.been.called;
        });
      });
    });
  });
});
