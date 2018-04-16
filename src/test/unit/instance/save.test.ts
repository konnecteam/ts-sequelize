'use strict';

import * as chai from 'chai';
const expect = chai.expect;
import Support from '../../support';
const current = Support.sequelize;
const Sequelize = Support.Sequelize;
import * as sinon from 'sinon';
import DataTypes from '../../../lib/data-types';

describe(Support.getTestDialectTeaser('Instance'), () => {
  describe('save', () => {
    it('should disallow saves if no primary key values is present', () => {
      const Model = current.define('User', {

        }),
        instance = Model.build({}, {isNewRecord: false});

      expect(() => {
        instance.save();
      }).to.throw();
    });

    describe('options tests', () => {
      let stub, instance;
      const Model = current.define('User', {
        id: {
          type: DataTypes.BIGINT,
          primaryKey: true,
          autoIncrement: true
        }
      });

      before(() => {
        stub = sinon.stub(current, 'query').returns(
          Sequelize.Promise.resolve([{
            _previousDataValues: {},
            dataValues: {id: 1}
          }, 1])
        );
      });

      after(() => {
        stub.restore();
      });

      it('should allow saves even if options are not given', () => {
        instance = Model.build({});
        expect(() => {
          instance.save();
        }).to.not.throw();
      });
    });
  });
});
