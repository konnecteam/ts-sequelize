'use strict';

import * as chai from 'chai';
import { DataSet } from '../../../lib/data-set';
import DataTypes from '../../../lib/data-types';
import { ItestAttribute, ItestInstance } from '../../dummy/dummy-data-set';
import Support from '../../support';
const expect = chai.expect;
const current = Support.sequelize;

export interface ItestAttribute {
  data : {
    foo? : string,
  };
}
export interface ItestInstance extends DataSet<ItestAttribute>, ItestAttribute { }


describe(Support.getTestDialectTeaser('Instance'), () => {
  describe('build', () => {
    it('should populate NOW default values', () => {
      const Model = current.define<ItestInstance, ItestAttribute>('Model', {
        created_time: {
          type: new DataTypes.DATE(),
          allowNull: true,
          defaultValue: new DataTypes.NOW()
        },
        updated_time: {
          type: new DataTypes.DATE(),
          allowNull: true,
          defaultValue: new DataTypes.NOW()
        },
        ip: {
          type: new DataTypes.STRING(),
          validate: {
            isIP: true
          }
        },
        ip2: {
          type: new DataTypes.STRING(),
          validate: {
            isIP: {
              msg: 'test'
            }
          }
        }
      }, {
        timestamps: false
      });
      const instance = Model.build({ip: '127.0.0.1', ip2: '0.0.0.0'});

      expect(instance.get('created_time')).to.be.ok;
      expect(instance.get('created_time')).to.be.an.instanceof(Date);

      expect(instance.get('updated_time')).to.be.ok;
      expect(instance.get('updated_time')).to.be.an.instanceof(Date);

      return instance.validate();
    });

    it('should populate explicitly undefined UUID primary keys', () => {
      const Model = current.define<ItestInstance, ItestAttribute>('Model', {
        id: {
          type: new DataTypes.UUID(),
          primaryKey: true,
          allowNull: false,
          defaultValue: new DataTypes.UUIDV4()
        }
      });
      const instance  = Model.build({
        id: undefined
      });

      expect(instance.get('id')).not.to.be.undefined;
      expect(instance.get('id')).to.be.ok;
    });

    it('should populate undefined columns with default value', () => {
      const Model = current.define<ItestInstance, ItestAttribute>('Model', {
        number1: {
          type: new DataTypes.INTEGER(),
          defaultValue: 1
        },
        number2: {
          type: new DataTypes.INTEGER(),
          defaultValue: 2
        }
      });
      const instance = Model.build({
        number1: undefined
      });

      expect(instance.get('number1')).not.to.be.undefined;
      expect(instance.get('number1')).to.equal(1);
      expect(instance.get('number2')).not.to.be.undefined;
      expect(instance.get('number2')).to.equal(2);
    });

    it('should clone the default values', () => {
      const Model = current.define<ItestInstance, ItestAttribute>('Model', {
        data: {
          type: new DataTypes.JSONB(),
          defaultValue: { foo: 'bar' }
        }
      });
      const instance = Model.build();
      instance.data.foo = 'biz';

      expect(instance.get('data')).to.eql({ foo: 'biz' });
      expect(Model.build().get('data')).to.eql({ foo: 'bar' });
    });
  });
});
