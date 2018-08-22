'use strict';

import * as chai from 'chai';
import { Model } from '../..';
import DataTypes from '../../lib/data-types';
import { ItestAttribute, ItestInstance } from '../dummy/dummy-data-set';
import Support from './support';
const expect = chai.expect;
const current = Support.sequelize;

describe(Support.getTestDialectTeaser('Schema'), () => {
  let User : Model<ItestInstance, ItestAttribute>;
  beforeEach(function() {
    return current.createSchema('testschema');
  });

  afterEach(function() {
    return current.dropSchema('testschema');
  });

  beforeEach(function() {
    User = current.define<ItestInstance, ItestAttribute>('User', {
      aNumber: { type: new DataTypes.INTEGER() }
    }, {
      schema: 'testschema'
    });

    return User.sync({ force: true });
  });

  it('supports increment', function() {
    return User.create({ aNumber: 1 }).then(user => {
      return user.increment('aNumber', { by: 3 });
    }).then(result => {
      return result.reload();
    }).then(user => {
      expect(user).to.be.ok;
      expect(user.aNumber).to.be.equal(4);
    });
  });

  it('supports decrement', function() {
    return User.create({ aNumber: 10 }).then(user => {
      return user.decrement('aNumber', { by: 3 });
    }).then(result => {
      return result.reload();
    }).then(user => {
      expect(user).to.be.ok;
      expect(user.aNumber).to.be.equal(7);
    });
  });
});
