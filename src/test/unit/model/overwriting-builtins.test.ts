'use strict';

import * as chai from 'chai';
import DataTypes from '../../../lib/data-types';
import { ItestAttribute, ItestInstance } from '../../dummy/dummy-data-set';
import Support from '../../support';
const expect = chai.expect;
const current = Support.sequelize;

describe(Support.getTestDialectTeaser('Model'), () => {

  describe('not breaking built-ins', () => {
    it('it should not break instance.set by defining a model set attribute', function() {
      const User = current.define<ItestInstance, ItestAttribute>('OverWrittenKeys', {
        set: new DataTypes.STRING()
      });

      const user = User.build({set: 'A'});
      expect(user.get('set')).to.equal('A');
      user.set('set', 'B');
      expect(user.get('set')).to.equal('B');
    });
  });
});
