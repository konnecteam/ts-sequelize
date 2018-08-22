'use strict';

import * as chai from 'chai';
import * as sinon from 'sinon';
import { Model } from '../../..';
import DataTypes from '../../../lib/data-types';
import { ItestAttribute, ItestInstance } from '../../dummy/dummy-data-set';
import Support from '../../support';
const expect = chai.expect;
const current = Support.sequelize;

describe(Support.getTestDialectTeaser('Instance'), () => {
  let User : Model<ItestInstance, ItestAttribute>;
  describe('get', () => {
    beforeEach(function() {
      this.getSpy = sinon.spy();
      User = current.define<ItestInstance, ItestAttribute>('User', {
        name: {
          type: new DataTypes.STRING(),
          get: this.getSpy
        }
      });
    });

    it('invokes getter if raw: false', function() {
      User.build().get('name');

      expect(this.getSpy).to.have.been.called;
    });

    it('does not invoke getter if raw: true', function() {
      expect(this.getSpy, { raw: true }).not.to.have.been.called;
    });
  });
});
