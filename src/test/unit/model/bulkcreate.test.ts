'use strict';

import * as chai from 'chai';
import * as sinon from 'sinon';
import DataTypes from '../../../lib/data-types';
import Support from '../../support';
const expect = chai.expect;
const current = Support.sequelize;
const Promise = current.Promise;

describe(Support.getTestDialectTeaser('Model'), () => {
  describe('bulkCreate', () => {
    before(function() {
      this.Model = current.define('model', {
        accountId: {
          type: new DataTypes.INTEGER(11).UNSIGNED,
          allowNull: false,
          field: 'account_id'
        }
      }, { timestamps: false });

      this.stub = sinon.stub(current.getQueryInterface(), 'bulkInsert').returns(Promise.resolve([]));
    });

    afterEach(function() {
      this.stub.resetHistory();
    });

    after(function() {
      this.stub.restore();
    });

    describe('validations', () => {
      it('should not fail for renamed fields', function() {
        return this.Model.bulkCreate([
          { accountId: 42 },
        ], { validate: true }).then(() => {
          expect(this.stub.getCall(0).args[1]).to.deep.equal([
            { account_id: 42, id: null },
          ]);
        });
      });
    });
  });
});
