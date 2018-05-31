'use strict';

import * as bluebird from 'bluebird';
import * as chai from 'chai';
import * as sinon from 'sinon';
import DataTypes from '../../../lib/data-types';
import Support from '../../support';
const expect = chai.expect;
const current = Support.sequelize;
const Promise = bluebird.getNewLibraryCopy();

describe(Support.getTestDialectTeaser('Model'), () => {
  describe('findAndCount', () => {
    describe('should handle promise rejection', () => {
      before(function() {
        this.stub = sinon.stub();

        Promise.onPossiblyUnhandledRejection(() => {
          this.stub();
        });

        this.User = current.define('User', {
          username: new DataTypes.STRING(),
          age: new DataTypes.INTEGER()
        });

        this.findAll = sinon.stub(this.User, 'findAll').callsFake(() => {
          return Promise.reject(new Error());
        });

        this.count = sinon.stub(this.User, 'count').callsFake(() => {
          return Promise.reject(new Error());
        });
      });

      after(function() {
        this.findAll.resetBehavior();
        this.count.resetBehavior();
      });

      it('with errors in count and findAll both', function() {
        return this.User.findAndCount({})
          .then(() => {
            throw new Error();
          })
          .catch(() => {
            expect(this.stub.callCount).to.eql(0);
          });
      });
    });
  });
});
