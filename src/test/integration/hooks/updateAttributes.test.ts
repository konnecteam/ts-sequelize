'use strict';

import * as chai from 'chai';
import * as sinon from 'sinon';
import DataTypes from '../../../lib/data-types';
import Support from '../support';
const expect = chai.expect;

describe(Support.getTestDialectTeaser('Hooks'), () => {
  beforeEach(function() {
    this.User = this.sequelize.define('User', {
      username: {
        type: new DataTypes.STRING(),
        allowNull: false
      },
      mood: {
        type: new DataTypes.ENUM(),
        values: ['happy', 'sad', 'neutral']
      }
    });
    return this.sequelize.sync({ force: true });
  });

  describe('#updateAttributes', () => {
    describe('on success', () => {
      it('should run hooks', function() {
        const beforeHook = sinon.spy();
        const afterHook = sinon.spy();
        const beforeSave = sinon.spy();
        const afterSave = sinon.spy();

        this.User.beforeUpdate(beforeHook);
        this.User.afterUpdate(afterHook);
        this.User.beforeSave(beforeSave);
        this.User.afterSave(afterSave);

        return this.User.create({username: 'Toni', mood: 'happy'}).then(user => {
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

        this.User.beforeUpdate(() => {
          beforeHook();
          throw new Error('Whoops!');
        });
        this.User.afterUpdate(afterHook);
        this.User.beforeSave(beforeSave);
        this.User.afterSave(afterSave);

        return this.User.create({username: 'Toni', mood: 'happy'}).then(user => {
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

        this.User.beforeUpdate(beforeHook);
        this.User.afterUpdate(() => {
          afterHook();
          throw new Error('Whoops!');
        });
        this.User.beforeSave(beforeSave);
        this.User.afterSave(afterSave);

        return this.User.create({username: 'Toni', mood: 'happy'}).then(user => {
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

        this.User.beforeValidate(user => {
          user.mood = 'happy';
        });

        return this.User.create({username: 'fireninja', mood: 'invalid'}).then(user => {
          return user.updateAttributes({username: 'hero'});
        }).then(user => {
          expect(user.username).to.equal('hero');
          expect(user.mood).to.equal('happy');
        });
      });

      it('afterValidate', function() {

        this.User.afterValidate(user => {
          user.mood = 'sad';
        });

        return this.User.create({username: 'fireninja', mood: 'nuetral'}).then(user => {
          return user.updateAttributes({username: 'spider'});
        }).then(user => {
          expect(user.username).to.equal('spider');
          expect(user.mood).to.equal('sad');
        });
      });

      it('beforeSave', function() {
        let hookCalled = 0;

        this.User.beforeSave(user => {
          user.mood = 'happy';
          hookCalled++;
        });

        return this.User.create({username: 'fireninja', mood: 'nuetral'}).then(user => {
          return user.updateAttributes({username: 'spider', mood: 'sad'});
        }).then(user => {
          expect(user.username).to.equal('spider');
          expect(user.mood).to.equal('happy');
          expect(hookCalled).to.equal(2);
        });
      });

      it('beforeSave with beforeUpdate', function() {
        let hookCalled = 0;

        this.User.beforeUpdate(user => {
          user.mood = 'sad';
          hookCalled++;
        });

        this.User.beforeSave(user => {
          user.mood = 'happy';
          hookCalled++;
        });

        return this.User.create({username: 'akira'}).then(user => {
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
