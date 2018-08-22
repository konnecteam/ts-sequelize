'use strict';

import * as chai from 'chai';
import { Model } from '../../..';
import DataTypes from '../../../lib/data-types';
import { ItestAttribute, ItestInstance } from '../../dummy/dummy-data-set';
import Support from '../support';
const expect = chai.expect;
const Promise = Support.sequelize.Promise;
const current = Support.sequelize;

describe(Support.getTestDialectTeaser('Paranoid'), () => {
  let A : Model<ItestInstance, ItestAttribute>;
  let B : Model<ItestInstance, ItestAttribute>;
  let C : Model<ItestInstance, ItestAttribute>;
  let D : Model<ItestInstance, ItestAttribute>;

  beforeEach(function( ) {
    const S = current;
    const DT = DataTypes;
    A = S.define<ItestInstance, ItestAttribute>('A', { name: DT.STRING }, { paranoid: true });
    B = S.define<ItestInstance, ItestAttribute>('B', { name: DT.STRING }, { paranoid: true });
    C = S.define<ItestInstance, ItestAttribute>('C', { name: DT.STRING }, { paranoid: true });
    D = S.define<ItestInstance, ItestAttribute>('D', { name: DT.STRING }, { paranoid: true });

    A.belongsTo(B);
    A.belongsToMany(D, {through: 'a_d'});
    A.hasMany(C);

    B.hasMany(A);
    B.hasMany(C);

    C.belongsTo(A);
    C.belongsTo(B);

    D.belongsToMany(A, {through: 'a_d'});

    return S.sync({ force: true });
  });

  it('paranoid with timestamps: false should be ignored / not crash', function() {
    const S = current;
    const Test = S.define<ItestInstance, ItestAttribute>('Test', {
      name: new DataTypes.STRING()
    }, {
      timestamps: false,
      paranoid: true
    });

    return S.sync({ force: true }).then(() => {
      return Test.findById(1);
    });
  });

  it('test if non required is marked as false', function( ) {
    const options = {
      include: [
        {
          model: B,
          required: false
        },
      ]
    };

    return A.find(options).then(() => {
      expect(options.include[0].required).to.be.equal(false);
    });
  });

  it('test if required is marked as true', function( ) {
    const options = {
      include: [
        {
          model: B,
          required: true
        },
      ]
    };

    return A.find(options).then(() => {
      expect(options.include[0].required).to.be.equal(true);
    });
  });

  it('should not load paranoid, destroyed instances, with a non-paranoid parent', function() {
    const X = current.define<ItestInstance, ItestAttribute>('x', {
      name: new DataTypes.STRING()
    }, {
      paranoid: false
    });

    const Y = current.define<ItestInstance, ItestAttribute>('y', {
      name: new DataTypes.STRING()
    }, {
      timestamps: true,
      paranoid: true
    });

    X.hasMany(Y);

    let y : ItestInstance;
    return current.sync({ force: true}).bind(this).then(function() {
      return current.Promise.all([
        X.create(),
        Y.create(),
      ]);
    }).spread(function(x, _y) {
      y = _y;

      return x.addLinkedData('y', y);
    }).then(function() {
      return y.destroy();
    }).then(function() {
      //prevent CURRENT_TIMESTAMP to be same
      return Promise.delay(1000).then(() => {
        return X.findAll({
          include: [Y]
        }).get(0 as any);
      }).then(x => {
        expect(x.ys).to.have.length(0);
      });
    });
  });
});
