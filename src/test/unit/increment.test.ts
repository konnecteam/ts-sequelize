'use strict';

import * as chai from 'chai';
import DataTypes from '../../lib/data-types';
import { ItestAttribute, ItestInstance } from '../dummy/dummy-data-set';
import Support from '../support';
const expect = chai.expect;
const current = Support.sequelize;

describe(Support.getTestDialectTeaser('Model'), () => {
  describe('increment', () => {
    describe('options tests', () => {
      const Model = current.define<ItestInstance, ItestAttribute>('User', {
        id: {
          type: new DataTypes.BIGINT(),
          primaryKey: true,
          autoIncrement: true
        },
        count: new DataTypes.BIGINT()
      });

      it('should reject if options are missing', function(done) {
        expect(() => Model.increment(['id', 'count'])).to.throw('Missing where attribute in the options parameter');
        done();
      });

      it('should reject if options.where are missing', function(done) {
        expect(() => Model.increment(['id', 'count'], { by: 10})).to.throw('Missing where attribute in the options parameter');
        done();
      });
    });
  });
});
