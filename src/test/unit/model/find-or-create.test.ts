'use strict';

import * as Promise from 'bluebird';
import * as chai from 'chai';
import * as cls from 'continuation-local-storage';
import * as sinon from 'sinon';
import { Model, Sequelize } from '../../..';
import { ItestAttribute, ItestInstance } from '../../dummy/dummy-data-set';
import Support from '../../support';
const expect = chai.expect;
const current = Support.sequelize;
const stub = sinon.stub;

describe(Support.getTestDialectTeaser('Model'), () => {

  describe('method findOrCreate', () => {
    let User : Model<ItestInstance, ItestAttribute>;

    before(() => {
      (current.constructor as typeof Sequelize).useCLS(cls.createNamespace('sequelize'));
    });

    after(() => {
      delete (current.constructor as typeof Sequelize)._cls;
    });

    beforeEach(function() {
      User = current.define<ItestInstance, ItestAttribute>('User', {}, {
        name: 'John'
      });

      this.transactionStub = stub(User.sequelize, 'transaction');
      this.transactionStub.returns(new Promise(() => {}));

      this.clsStub = stub((current.constructor as typeof Sequelize)._cls, 'get');
      this.clsStub.returns({ id: 123 });
    });

    afterEach(function() {
      this.transactionStub.restore();
      this.clsStub.restore();
    });

    it('should use transaction from cls if available', function() {

      const options = {
        where: {
          name: 'John'
        }
      };

      User.findOrCreate(options);

      expect(this.clsStub.calledOnce).to.equal(true, 'expected to ask for transaction');
    });

    it('should not use transaction from cls if provided as argument', function() {

      const options = {
        where: {
          name: 'John'
        },
        transaction: { id: 123 }
      };

      User.findOrCreate(options);

      expect(this.clsStub.called).to.equal(false);
    });
  });
});
