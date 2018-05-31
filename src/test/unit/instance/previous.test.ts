'use strict';

import * as chai from 'chai';
import DataTypes from '../../../lib/data-types';
import Support from '../../support';
const expect = chai.expect;
const current = Support.sequelize;

describe(Support.getTestDialectTeaser('Instance'), () => {
  describe('previous', () => {
    it('should return correct previous value', () => {
      const Model = current.define('Model', {
        text: new DataTypes.STRING(),
        textCustom: {
          type: new DataTypes.STRING(),
          set(val) {
            this.setDataValue('textCustom', val);
          },
          get() {
            this.getDataValue('textCustom');
          }
        }
      });

      const instance = Model.build({ text: 'a', textCustom: 'abc' });
      expect(instance.previous('text')).to.be.not.ok;
      expect(instance.previous('textCustom')).to.be.not.ok;

      instance.set('text', 'b');
      instance.set('textCustom', 'def');

      expect(instance.previous('text')).to.be.equal('a');
      expect(instance.previous('textCustom')).to.be.equal('abc');
    });
  });
});
