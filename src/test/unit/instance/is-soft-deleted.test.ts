'use strict';

import * as chai from 'chai';
import * as moment from 'moment';
import DataTypes from '../../../lib/data-types';
import Support from '../../support';
const expect = chai.expect;
const current = Support.sequelize;

describe(Support.getTestDialectTeaser('Instance'), () => {
  describe('isSoftDeleted', () => {
    beforeEach(function() {
      const User = current.define('User', {
        name: new DataTypes.STRING(),
        birthdate: new DataTypes.DATE(),
        meta: new DataTypes.JSON(),
        deletedAt: {
          type: new DataTypes.DATE()
        }
      });

      const ParanoidUser = current.define('User', {
        name: new DataTypes.STRING(),
        birthdate: new DataTypes.DATE(),
        meta: new DataTypes.JSON(),
        deletedAt: {
          type: new DataTypes.DATE()
        }
      }, {
        paranoid: true
      });

      this.paranoidUser = ParanoidUser.build({
        name: 'a'
      }, {
        isNewRecord: false,
        raw: true
      });

      this.user = User.build({
        name: 'a'
      }, {
        isNewRecord: false,
        raw: true
      });
    });

    it('should not throw if paranoid is set to true', function() {
      expect(() => {
        this.paranoidUser.isSoftDeleted();
      }).to.not.throw();
    });

    it('should throw if paranoid is set to false', function() {
      expect(() => {
        this.user.isSoftDeleted();
      }).to.throw('Model is not paranoid');
    });

    it('should return false if the soft-delete property is the same as ' +
      'the default value', function() {
      this.paranoidUser.setDataValue('deletedAt', null);
      expect(this.paranoidUser.isSoftDeleted()).to.be.false;
    });

    it('should return false if the soft-delete property is set to a date in ' +
      'the future', function() {
      this.paranoidUser.setDataValue('deletedAt', moment().add(5, 'days').format());
      expect(this.paranoidUser.isSoftDeleted()).to.be.false;
    });

    it('should return true if the soft-delete property is set to a date ' +
      'before now', function() {
      this.paranoidUser.setDataValue('deletedAt', moment().subtract(5, 'days').format());
      expect(this.paranoidUser.isSoftDeleted()).to.be.true;
    });
  });
});
