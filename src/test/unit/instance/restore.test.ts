'use strict';

import * as chai from 'chai';
const expect = chai.expect;
import Support from '../../support';
const current = Support.sequelize;
const Sequelize = Support.Sequelize;
import * as sinon from 'sinon';
import DataTypes from '../../../lib/data-types';

describe(Support.getTestDialectTeaser('Instance'), () => {
  describe('restore', () => {
    describe('options tests', () => {
      let stub, instance;
      const Model = current.define('User', {
        id: {
          type: DataTypes.BIGINT,
          primaryKey: true,
          autoIncrement: true
        },
        deletedAt: {
          type: DataTypes.DATE
        }
      }, {
        paranoid: true
      });

      before(() => {
        stub = sinon.stub(current, 'query').returns(
          Sequelize.Promise.resolve([{
            _previousDataValues: {id: 1},
            dataValues: {id: 2}
          }, 1])
        );
      });

      after(() => {
        stub.restore();
      });

      it('should allow restores even if options are not given', () => {
        instance = Model.build({id: 1}, {isNewRecord: false});
        expect(() => {
          instance.restore();
        }).to.not.throw();
      });
    });
  });
});
