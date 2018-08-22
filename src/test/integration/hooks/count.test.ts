'use strict';

import * as chai from 'chai';
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

  describe('#count', () => {
    beforeEach(function() {
      return User.bulkCreate([
        {username: 'adam', mood: 'happy'},
        {username: 'joe', mood: 'sad'},
        {username: 'joe', mood: 'happy'},
      ]);
    });

    describe('on success', () => {
      it('hook runs', function() {
        let beforeHook = false;

        User.beforeCount(() => {
          beforeHook = true;
        });

        return User.count().then(count => {
          expect(count).to.equal(3);
          expect(beforeHook).to.be.true;
        });
      });

      it('beforeCount hook can change options', function() {
        User.beforeCount(options => {
          options.where.username = 'adam';
        });

        return expect(User.count({where: {username: 'joe'}})).to.eventually.equal(1);
      });
    });

    describe('on error', () => {
      it('in beforeCount hook returns error', function() {
        User.beforeCount(() => {
          throw new Error('Oops!');
        });

        return expect(User.count({where: {username: 'adam'}})).to.be.rejectedWith('Oops!');
      });
    });
  });

});
