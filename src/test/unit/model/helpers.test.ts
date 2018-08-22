'use strict';

import * as chai from 'chai';
import { Model } from '../../..';
import { ItestAttribute, ItestInstance } from '../../dummy/dummy-data-set';
import Support from '../../support';
const expect = chai.expect;
const current = Support.sequelize;

describe(Support.getTestDialectTeaser('Model'), () => {
  let User : Model<ItestInstance, ItestAttribute>;
  let Task : Model<ItestInstance, ItestAttribute>;
  describe('hasAlias', () => {
    beforeEach(function() {
      User = current.define<ItestInstance, ItestAttribute>('user');
      Task = current.define<ItestInstance, ItestAttribute>('task');
    });

    it('returns true if a model has an association with the specified alias', function() {
      Task.belongsTo(User, { as: 'owner'});
      expect(Task.hasAlias('owner')).to.equal(true);
    });

    it('returns false if a model does not have an association with the specified alias', function() {
      Task.belongsTo(User, { as: 'owner'});
      expect(Task.hasAlias('notOwner')).to.equal(false);
    });
  });
});
