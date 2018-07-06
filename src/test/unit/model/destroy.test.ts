'use strict';

import * as chai from 'chai';
import * as _ from 'lodash';
import * as sinon from 'sinon';
import DataTypes from '../../../lib/data-types';
import Support from '../../support';
const expect = chai.expect;
const current = Support.sequelize;
const Promise = current.Promise;

describe(Support.getTestDialectTeaser('Model'), () => {

  describe('method destroy', () => {
    const User = current.define('User', {
      name: new DataTypes.STRING(),
      secretValue: new DataTypes.INTEGER()
    });

    before(function() {
      this.stubDelete = sinon.stub(current.getQueryInterface(), 'bulkDelete').callsFake(() => {
        return Promise.resolve([]);
      });
    });

    beforeEach(function() {
      this.deloptions = {where: {secretValue: '1'}};
      this.cloneOptions = _.clone(this.deloptions);
      this.stubDelete.resetHistory();
    });

    afterEach(function() {
      delete this.deloptions;
      delete this.cloneOptions;
    });

    after(function() {
      this.stubDelete.restore();
    });

    it('can detect complexe objects', () => {
      const Where = function() { this.secretValue = '1'; };

      expect(() => {
        User.destroy({where: new Where()});
      }).to.throw();

    });
  });
});
