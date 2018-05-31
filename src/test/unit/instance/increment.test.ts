'use strict';

import * as chai from 'chai';
import * as sinon from 'sinon';
import DataTypes from '../../../lib/data-types';
import Support from '../../support';
const expect = chai.expect;
const current = Support.sequelize;
const Sequelize = Support.Sequelize;

describe(Support.getTestDialectTeaser('Instance'), () => {
  describe('increment', () => {
    describe('options tests', () => {
      let stub;
      let instance;
      const Model = current.define('User', {
        id: {
          type: new DataTypes.BIGINT(),
          primaryKey: true,
          autoIncrement: true
        }
      });

      before(() => {
        stub = sinon.stub(current, 'query').returns(
          Sequelize.Promise.resolve({
            _previousDataValues: {id: 1},
            dataValues: {id: 3}
          })
        );
      });

      after(() => {
        stub.restore();
      });

      it('should allow increments even if options are not given', () => {
        instance = Model.build({id: 1}, {isNewRecord: false});
        expect(() => {
          instance.increment(['id']);
        }).to.not.throw();
      });
    });
  });
});
