'use strict';

import * as chai from 'chai';
import * as moment from 'moment';
import DataTypes from '../../../lib/data-types';
import { ItestAttribute, ItestInstance } from '../../dummy/dummy-data-set';
import Support from '../../support';
const expect = chai.expect;
const current = Support.sequelize;

describe(Support.getTestDialectTeaser('Instance'), () => {
  let paranoidUser : ItestInstance;
  let user : ItestInstance;
  describe('isSoftDeleted', () => {
    beforeEach(function() {
      const User = current.define<ItestInstance, ItestAttribute>('User', {
        name: new DataTypes.STRING(),
        birthdate: new DataTypes.DATE(),
        meta: new DataTypes.JSON(),
        deletedAt: {
          type: new DataTypes.DATE()
        }
      });

      const ParanoidUser = current.define<ItestInstance, ItestAttribute>('User', {
        name: new DataTypes.STRING(),
        birthdate: new DataTypes.DATE(),
        meta: new DataTypes.JSON(),
        deletedAt: {
          type: new DataTypes.DATE()
        }
      }, {
        paranoid: true
      });

      paranoidUser = ParanoidUser.build({
        name: 'a'
      }, {
        isNewRecord: false,
        raw: true
      });

      user = User.build({
        name: 'a'
      }, {
        isNewRecord: false,
        raw: true
      });
    });

    it('should not throw if paranoid is set to true', function() {
      expect(() => {
        paranoidUser.isSoftDeleted();
      }).to.not.throw();
    });

    it('should throw if paranoid is set to false', function() {
      expect(() => {
        user.isSoftDeleted();
      }).to.throw('Model is not paranoid');
    });

    it('should return false if the soft-delete property is the same as the default value', function() {
      paranoidUser.setDataValue('deletedAt', null);
      expect(paranoidUser.isSoftDeleted()).to.be.false;
    });

    it('should return true if the soft-delete property is set', function() {
      paranoidUser.setDataValue('deletedAt', moment().subtract(5, 'days').format());
      expect(paranoidUser.isSoftDeleted()).to.be.true;
    });
  });
});
