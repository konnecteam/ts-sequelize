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
  let ParanoidUser : Model<ItestInstance, ItestAttribute>;
  beforeEach(function() {
    current.define<ItestInstance, ItestAttribute>('User', {
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

  describe('#restore', () => {
    describe('on success', () => {
      it('should run hooks', function() {
        const beforeHook = sinon.spy();
        const afterHook = sinon.spy();

        ParanoidUser.beforeRestore(beforeHook);
        ParanoidUser.afterRestore(afterHook);

        return ParanoidUser.create({username: 'Toni', mood: 'happy'}).then(user => {
          return user.destroy().then(() => {
            return user.restore().then(() => {
              expect(beforeHook).to.have.been.calledOnce;
              expect(afterHook).to.have.been.calledOnce;
            });
          });
        });
      });
    });

    describe('on error', () => {
      it('should return an error from before', function() {
        const beforeHook = sinon.spy();
        const afterHook = sinon.spy();

        ParanoidUser.beforeRestore(() => {
          beforeHook();
          throw new Error('Whoops!');
        });
        ParanoidUser.afterRestore(afterHook);

        return ParanoidUser.create({username: 'Toni', mood: 'happy'}).then(user => {
          return user.destroy().then(() => {
            return expect(user.restore()).to.be.rejected.then(() => {
              expect(beforeHook).to.have.been.calledOnce;
              expect(afterHook).not.to.have.been.called;
            });
          });
        });
      });

      it('should return an error from after', function() {
        const beforeHook = sinon.spy();
        const afterHook = sinon.spy();

        ParanoidUser.beforeRestore(beforeHook);
        ParanoidUser.afterRestore(() => {
          afterHook();
          throw new Error('Whoops!');
        });

        return ParanoidUser.create({username: 'Toni', mood: 'happy'}).then(user => {
          return user.destroy().then(() => {
            return expect(user.restore()).to.be.rejected.then(() => {
              expect(beforeHook).to.have.been.calledOnce;
              expect(afterHook).to.have.been.calledOnce;
            });
          });
        });
      });
    });
  });

});
