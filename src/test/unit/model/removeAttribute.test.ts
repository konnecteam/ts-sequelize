'use strict';

import * as chai from 'chai';
import * as _ from 'lodash';
import DataTypes from '../../../lib/data-types';
import { ItestAttribute, ItestInstance } from '../../dummy/dummy-data-set';
import Support from '../../support';
const expect = chai.expect;
const current = Support.sequelize;

describe(Support.getTestDialectTeaser('Model'), () => {
  describe('removeAttribute', () => {
    it('should support removing the primary key', () => {
      const Model = current.define<ItestInstance, ItestAttribute>('m', {
        name: new DataTypes.STRING()
      });

      expect(Model.primaryKeyAttribute).not.to.be.undefined;
      expect(_.size(Model.primaryKeys)).to.equal(1);

      Model.removeAttribute('id');

      expect(Model.primaryKeyAttribute).to.be.undefined;
      expect(_.size(Model.primaryKeys)).to.equal(0);
    });

    it('should not add undefined attribute after removing primary key', () => {
      const Model = current.define<ItestInstance, ItestAttribute>('m', {
        name: new DataTypes.STRING()
      });

      Model.removeAttribute('id');

      const instance = Model.build();
      expect(instance.dataValues).not.to.include.keys('undefined');
    });
  });
});
