'use strict';

import * as chai from 'chai';
import { Model } from '../../..';
import DataTypes from '../../../lib/data-types';
import { ItestAttribute, ItestInstance } from '../../dummy/dummy-data-set';
import Support from '../../support';
const expect = chai.expect;
const current = Support.sequelize;

describe(Support.getTestDialectTeaser('Model'), () => {
  let M : Model<ItestInstance, ItestAttribute>;
  let N : Model<ItestInstance, ItestAttribute>;
  let NM : Model<ItestInstance, ItestAttribute>;
  describe('options.underscored', () => {
    beforeEach(function() {
      N = current.define<ItestInstance, ItestAttribute>('N', {
        id: {
          type: new DataTypes.CHAR(10),
          primaryKey: true,
          field: 'n_id'
        }
      }, {
        underscored: true
      });

      M = current.define<ItestInstance, ItestAttribute>('M', {
        id: {
          type: new DataTypes.CHAR(20),
          primaryKey: true,
          field: 'm_id'
        }
      }, {
        underscored: true
      });
      NM = current.define<ItestInstance, ItestAttribute>('NM', {});
    });

    it('should properly set field when defining', function() {
      expect(N.rawAttributes['id'].field).to.equal('n_id');
      expect(M.rawAttributes['id'].field).to.equal('m_id');
    });

    it('hasOne does not override already defined field', function() {
      N.rawAttributes['mId'] = {
        type: new DataTypes.CHAR(20),
        field: 'n_m_id'
      };
      N.refreshAttributes();

      expect(N.rawAttributes['mId'].field).to.equal('n_m_id');
      M.hasOne(N, { foreignKey: 'mId' });
      expect(N.rawAttributes['mId'].field).to.equal('n_m_id');
    });

    it('belongsTo does not override already defined field', function() {
      N.rawAttributes['mId'] = {
        type: new DataTypes.CHAR(20),
        field: 'n_m_id'
      };
      N.refreshAttributes();

      expect(N.rawAttributes['mId'].field).to.equal('n_m_id');
      N.belongsTo(M, { foreignKey: 'mId' });
      expect(N.rawAttributes['mId'].field).to.equal('n_m_id');
    });

    it('hasOne/belongsTo does not override already defined field', function() {
      N.rawAttributes['mId'] = {
        type: new DataTypes.CHAR(20),
        field: 'n_m_id'
      };
      N.refreshAttributes();

      expect(N.rawAttributes['mId'].field).to.equal('n_m_id');
      N.belongsTo(M, { foreignKey: 'mId' });
      M.hasOne(N, { foreignKey: 'mId' });
      expect(N.rawAttributes['mId'].field).to.equal('n_m_id');
    });

    it('hasMany does not override already defined field', function() {
      M.rawAttributes['nId'] = {
        type: new DataTypes.CHAR(20),
        field: 'nana_id'
      };
      M.refreshAttributes();

      expect(M.rawAttributes['nId'].field).to.equal('nana_id');

      N.hasMany(M, { foreignKey: 'nId' });
      M.belongsTo(N, { foreignKey: 'nId' });

      expect(M.rawAttributes['nId'].field).to.equal('nana_id');
    });

    it('belongsToMany does not override already defined field', function() {
      NM = current.define<ItestInstance, ItestAttribute>('NM', {
        n_id: {
          type: new DataTypes.CHAR(10),
          field: 'nana_id'
        },
        m_id: {
          type: new DataTypes.CHAR(20),
          field: 'mama_id'
        }
      }, {
        underscored: true
      });

      N.belongsToMany(M, { through: NM, foreignKey: 'n_id' });
      M.belongsToMany(N, { through: NM, foreignKey: 'm_id' });

      expect(NM.rawAttributes['n_id'].field).to.equal('nana_id');
      expect(NM.rawAttributes['m_id'].field).to.equal('mama_id');
    });
  });
});
