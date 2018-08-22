'use strict';

import * as Bluebird from 'bluebird';
import * as chai from 'chai';
import Support from '../support';
const expect = chai.expect;
const Sequelize = Support.Sequelize;
const Promise = Sequelize.Promise;

describe.skip('Promise', () => {
  it('should be an independent copy of bluebird library', () => {
    expect(Promise.prototype.then).to.be.a('function');
    expect(Promise).to.not.equal(Bluebird);
    expect(Promise.prototype).to.not.equal(Bluebird.prototype);
  });
});
