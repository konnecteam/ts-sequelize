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

  describe('#find', () => {
    beforeEach(function() {
      return User.bulkCreate([
        {username: 'adam', mood: 'happy'},
        {username: 'joe', mood: 'sad'},
      ]);
    });

    it('allow changing attributes via beforeFind #5675', function() {
      User.beforeFind(options => {
        options.attributes = {
          include: ['id']
        };
      });
      return User.findAll({});
    });

    describe('on success', () => {
      it('all hooks run', function() {
        let beforeHook = false;
        let beforeHook2 = false;
        let beforeHook3 = false;
        let afterHook = false;

        User.beforeFind(() => {
          beforeHook = true;
        });

        User.beforeFindAfterExpandIncludeAll(() => {
          beforeHook2 = true;
        });

        User.beforeFindAfterOptions(() => {
          beforeHook3 = true;
        });

        User.afterFind(() => {
          afterHook = true;
        });

        return User.find({where: {username: 'adam'}}).then(user => {
          expect(user.mood).to.equal('happy');
          expect(beforeHook).to.be.true;
          expect(beforeHook2).to.be.true;
          expect(beforeHook3).to.be.true;
          expect(afterHook).to.be.true;
        });
      });

      it('beforeFind hook can change options', function() {
        User.beforeFind(options => {
          options.where.username = 'joe';
        });

        return User.find({where: {username: 'adam'}}).then(user => {
          expect(user.mood).to.equal('sad');
        });
      });

      it('beforeFindAfterExpandIncludeAll hook can change options', function() {
        User.beforeFindAfterExpandIncludeAll(options => {
          options.where.username = 'joe';
        });

        return User.find({where: {username: 'adam'}}).then(user => {
          expect(user.mood).to.equal('sad');
        });
      });

      it('beforeFindAfterOptions hook can change options', function() {
        User.beforeFindAfterOptions(options => {
          options.where.username = 'joe';
        });

        return User.find({where: {username: 'adam'}}).then(user => {
          expect(user.mood).to.equal('sad');
        });
      });

      it('afterFind hook can change results', function() {
        User.afterFind(user => {
          user.mood = 'sad';
        });

        return User.find({where: {username: 'adam'}}).then(user => {
          expect(user.mood).to.equal('sad');
        });
      });
    });

    describe('on error', () => {
      it('in beforeFind hook returns error', function() {
        User.beforeFind(() => {
          throw new Error('Oops!');
        });

        return User.find({where: {username: 'adam'}}).catch (err => {
          expect(err.message).to.equal('Oops!');
        });
      });

      it('in beforeFindAfterExpandIncludeAll hook returns error', function() {
        User.beforeFindAfterExpandIncludeAll(() => {
          throw new Error('Oops!');
        });

        return User.find({where: {username: 'adam'}}).catch (err => {
          expect(err.message).to.equal('Oops!');
        });
      });

      it('in beforeFindAfterOptions hook returns error', function() {
        User.beforeFindAfterOptions(() => {
          throw new Error('Oops!');
        });

        return User.find({where: {username: 'adam'}}).catch (err => {
          expect(err.message).to.equal('Oops!');
        });
      });

      it('in afterFind hook returns error', function() {
        User.afterFind(() => {
          throw new Error('Oops!');
        });

        return User.find({where: {username: 'adam'}}).catch (err => {
          expect(err.message).to.equal('Oops!');
        });
      });
    });
  });

});
