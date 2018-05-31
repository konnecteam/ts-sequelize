'use strict';

import * as chai from 'chai';
import * as sinon from 'sinon';
import DataTypes from '../../../lib/data-types';
import Support from '../support';
const expect = chai.expect;

describe(Support.getTestDialectTeaser('Paranoid'), () => {

  beforeEach(function( ) {
    const S = this.sequelize;
    const DT = DataTypes;
    const A = this.A = S.define('A', { name: DT.STRING }, { paranoid: true });
    const B = this.B = S.define('B', { name: DT.STRING }, { paranoid: true });
    const C = this.C = S.define('C', { name: DT.STRING }, { paranoid: true });
    const D = this.D = S.define('D', { name: DT.STRING }, { paranoid: true });

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

  before(function() {
    this.clock = sinon.useFakeTimers();
  });

  after(function() {
    this.clock.restore();
  });

  it('paranoid with timestamps: false should be ignored / not crash', function() {
    const S = this.sequelize;
    const Test = S.define('Test', {
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
    const A = this.A;
    const B = this.B;
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
    const A = this.A;
    const B = this.B;
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
    const X = this.sequelize.define('x', {
      name: new DataTypes.STRING()
    }, {
      paranoid: false
    });

    const Y = this.sequelize.define('y', {
      name: new DataTypes.STRING()
    }, {
      timestamps: true,
      paranoid: true
    });

    X.hasMany(Y);

    return this.sequelize.sync({ force: true}).bind(this).then(function() {
      return this.sequelize.Promise.all([
        X.create(),
        Y.create(),
      ]);
    }).spread(function(x, y) {
      this.x = x;
      this.y = y;

      return x.addY(y);
    }).then(function() {
      return this.y.destroy();
    }).then(function() {
      //prevent CURRENT_TIMESTAMP to be same
      this.clock.tick(1000);

      return X.findAll({
        include: [Y]
      }).get(0);
    }).then(x => {
      expect(x.ys).to.have.length(0);
    });
  });
});
