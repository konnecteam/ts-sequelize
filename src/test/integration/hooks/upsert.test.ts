'use strict';

import * as chai from 'chai';
import * as sinon from 'sinon';
import { Model } from '../../..';
import DataTypes from '../../../lib/data-types';
import { ItestAttribute, ItestInstance } from '../../dummy/dummy-data-set';
import Support from '../support';
const expect = chai.expect;
const current = Support.sequelize;

if (Support.sequelize.dialect.supports.upserts) {
  describe(Support.getTestDialectTeaser('Hooks'), () => {
    let User : Model<ItestInstance, ItestAttribute>;
    beforeEach(function() {
      User = current.define<ItestInstance, ItestAttribute>('User', {
        username: {
          type: new DataTypes.STRING(),
          allowNull: false,
          unique: true //Either Primary Key/Unique Keys should be passed to upsert
        },
        mood: {
          type: new DataTypes.ENUM(),
          values: ['happy', 'sad', 'neutral']
        }
      });
      return current.sync({ force: true });
    });

    describe('#upsert', () => {
      describe('on success', () => {
        it('should run hooks', function() {
          const beforeHook = sinon.spy();
          const afterHook = sinon.spy();

          User.beforeUpsert(beforeHook);
          User.afterUpsert(afterHook);

          return User.upsert({username: 'Toni', mood: 'happy'}).then(() => {
            expect(beforeHook).to.have.been.calledOnce;
            expect(afterHook).to.have.been.calledOnce;
          });
        });
      });

      describe('on error', () => {
        it('should return an error from before', function() {
          const beforeHook = sinon.spy();
          const afterHook = sinon.spy();

          User.beforeUpsert(() => {
            beforeHook();
            throw new Error('Whoops!');
          });
          User.afterUpsert(afterHook);

          return expect(User.upsert({username: 'Toni', mood: 'happy'})).to.be.rejected.then(() => {
            expect(beforeHook).to.have.been.calledOnce;
            expect(afterHook).not.to.have.been.called;
          });
        });

        it('should return an error from after', function() {
          const beforeHook = sinon.spy();
          const afterHook = sinon.spy();

          User.beforeUpsert(beforeHook);
          User.afterUpsert(() => {
            afterHook();
            throw new Error('Whoops!');
          });

          return expect(User.upsert({username: 'Toni', mood: 'happy'})).to.be.rejected.then(() => {
            expect(beforeHook).to.have.been.calledOnce;
            expect(afterHook).to.have.been.calledOnce;
          });
        });
      });

      describe('preserves changes to values', () => {
        it('beforeUpsert', function() {
          let hookCalled = 0;
          const valuesOriginal = { mood: 'sad', username: 'leafninja' };

          User.beforeUpsert(values => {
            values.mood = 'happy';
            hookCalled++;
          });

          return User.upsert(valuesOriginal).then(() => {
            expect(valuesOriginal.mood).to.equal('happy');
            expect(hookCalled).to.equal(1);
          });
        });
      });
    });
  });
}
