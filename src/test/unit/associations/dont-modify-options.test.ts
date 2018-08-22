'use strict';

import * as chai from 'chai';
import { Model } from '../../..';
import DataTypes from '../../../lib/data-types';
import { ItestAttribute, ItestInstance } from '../../dummy/dummy-data-set';
import Support from '../../support';
const expect = chai.expect;
const current = Support.sequelize;

describe(Support.getTestDialectTeaser('associations'), () => {
  let A : Model<ItestInstance, ItestAttribute>;
  let B : Model<ItestInstance, ItestAttribute>;
  let C : Model<ItestInstance, ItestAttribute>;
  describe('Test options.foreignKey', () => {
    beforeEach(function() {

      A = current.define<ItestInstance, ItestAttribute>('A', {
        id: {
          type: new DataTypes.CHAR(20),
          primaryKey: true
        }
      });
      B = current.define<ItestInstance, ItestAttribute>('B', {
        id: {
          type: new DataTypes.CHAR(20),
          primaryKey: true
        }
      });
      C = current.define<ItestInstance, ItestAttribute>('C', {});
    });

    it('should not be overwritten for belongsTo', function() {
      const reqValidForeignKey = { foreignKey: { allowNull: false }};
      A.belongsTo(B, reqValidForeignKey);
      A.belongsTo(C, reqValidForeignKey);
      expect(A.rawAttributes.CId.type).to.deep.equal(C.rawAttributes.id.type);
    });
    it('should not be overwritten for belongsToMany', function() {
      const reqValidForeignKey = { foreignKey: { allowNull: false }, through: 'ABBridge'};
      B.belongsToMany(A, reqValidForeignKey);
      A.belongsTo(C, reqValidForeignKey);
      expect(A.rawAttributes.CId.type).to.deep.equal(C.rawAttributes.id.type);
    });
    it('should not be overwritten for hasOne', function() {
      const reqValidForeignKey = { foreignKey: { allowNull: false }};
      B.hasOne(A, reqValidForeignKey);
      A.belongsTo(C, reqValidForeignKey);
      expect(A.rawAttributes.CId.type).to.deep.equal(C.rawAttributes.id.type);
    });
    it('should not be overwritten for hasMany', function() {
      const reqValidForeignKey = { foreignKey: { allowNull: false }};
      B.hasMany(A, reqValidForeignKey);
      A.belongsTo(C, reqValidForeignKey);
      expect(A.rawAttributes.CId.type).to.deep.equal(C.rawAttributes.id.type);
    });
  });
});
