'use strict';

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
    return current.sync({ force: true });
  });

  describe('#updateAttributes', () => {
    describe('on success', () => {
      it('should run hooks', function() {
        const beforeHook = sinon.spy();
        const afterHook = sinon.spy();
        const beforeSave = sinon.spy();
        const afterSave = sinon.spy();

        User.beforeUpdate(beforeHook);
        User.afterUpdate(afterHook);
        User.beforeSave(beforeSave);
        User.afterSave(afterSave);

        return User.create({username: 'Toni', mood: 'happy'}).then(user => {
          return user.updateAttributes({username: 'Chong'}).then(_user => {
            expect(beforeHook).to.have.been.calledOnce;
            expect(afterHook).to.have.been.calledOnce;
            expect(beforeSave).to.have.been.calledTwice;
            expect(afterSave).to.have.been.calledTwice;
            expect(_user.username).to.equal('Chong');
          });
        });
      });
    });

    describe('on error', () => {
      it('should return an error from before', function() {
        const beforeHook = sinon.spy();
        const afterHook = sinon.spy();
        const beforeSave = sinon.spy();
        const afterSave = sinon.spy();

        User.beforeUpdate(() => {
          beforeHook();
          throw new Error('Whoops!');
        });
        User.afterUpdate(afterHook);
        User.beforeSave(beforeSave);
        User.afterSave(afterSave);

        return User.create({username: 'Toni', mood: 'happy'}).then(user => {
          return expect(user.updateAttributes({username: 'Chong'})).to.be.rejected.then(() => {
            expect(beforeHook).to.have.been.calledOnce;
            expect(beforeSave).to.have.been.calledOnce;
            expect(afterHook).not.to.have.been.called;
            expect(afterSave).to.have.been.calledOnce;
          });
        });
      });

      it('should return an error from after', function() {
        const beforeHook = sinon.spy();
        const afterHook = sinon.spy();
        const beforeSave = sinon.spy();
        const afterSave = sinon.spy();

        User.beforeUpdate(beforeHook);
        User.afterUpdate(() => {
          afterHook();
          throw new Error('Whoops!');
        });
        User.beforeSave(beforeSave);
        User.afterSave(afterSave);

        return User.create({username: 'Toni', mood: 'happy'}).then(user => {
          return expect(user.updateAttributes({username: 'Chong'})).to.be.rejected.then(() => {
            expect(beforeHook).to.have.been.calledOnce;
            expect(afterHook).to.have.been.calledOnce;
            expect(beforeSave).to.have.been.calledTwice;
            expect(afterSave).to.have.been.calledOnce;
          });
        });
      });
    });

    describe('preserves changes to instance', () => {
      it('beforeValidate', function() {

        User.beforeValidate(user => {
          user.mood = 'happy';
        });

        return User.create({username: 'fireninja', mood: 'invalid'}).then(user => {
          return user.updateAttributes({username: 'hero'});
        }).then(user => {
          expect(user.username).to.equal('hero');
          expect(user.mood).to.equal('happy');
        });
      });

      it('afterValidate', function() {

        User.afterValidate(user => {
          user.mood = 'sad';
        });

        return User.create({username: 'fireninja', mood: 'nuetral'}).then(user => {
          return user.updateAttributes({username: 'spider'});
        }).then(user => {
          expect(user.username).to.equal('spider');
          expect(user.mood).to.equal('sad');
        });
      });

      it('beforeSave', function() {
        let hookCalled = 0;

        User.beforeSave(user => {
          user.mood = 'happy';
          hookCalled++;
        });

        return User.create({username: 'fireninja', mood: 'nuetral'}).then(user => {
          return user.updateAttributes({username: 'spider', mood: 'sad'});
        }).then(user => {
          expect(user.username).to.equal('spider');
          expect(user.mood).to.equal('happy');
          expect(hookCalled).to.equal(2);
        });
      });

      it('beforeSave with beforeUpdate', function() {
        let hookCalled = 0;

        User.beforeUpdate(user => {
          user.mood = 'sad';
          hookCalled++;
        });

        User.beforeSave(user => {
          user.mood = 'happy';
          hookCalled++;
        });

        return User.create({username: 'akira'}).then(user => {
          return user.updateAttributes({username: 'spider', mood: 'sad'});
        }).then(user => {
          expect(user.mood).to.equal('happy');
          expect(user.username).to.equal('spider');
          expect(hookCalled).to.equal(3);
        });
      });
    });
  });
});
