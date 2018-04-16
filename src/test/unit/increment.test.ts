'use strict';

import * as chai from 'chai';
const expect = chai.expect;
import Support from '../support';
import DataTypes from '../../lib/data-types';
const current = Support.sequelize;

describe(Support.getTestDialectTeaser('Model'), () => {
  describe('increment', () => {
    describe('options tests', () => {
      const Model = current.define('User', {
        id: {
          type: DataTypes.BIGINT,
          primaryKey: true,
          autoIncrement: true
        },
        count: DataTypes.BIGINT
      });

      it('should reject if options are missing', () => {
        return expect(() => Model.increment(['id', 'count']))
          .to.throw('Missing where attribute in the options parameter');
      });

      it('should reject if options.where are missing', () => {
        return expect(() => Model.increment(['id', 'count'], { by: 10}))
          .to.throw('Missing where attribute in the options parameter');
      });
    });
  });
});
