'use strict';

import * as chai from 'chai';
const expect = chai.expect;
import Support from '../support';
const Sequelize = Support.Sequelize;
const Promise = Sequelize.Promise;
import * as Bluebird from 'bluebird';

describe('Promise', () => {
  it('should be an independent copy of bluebird library', () => {
    expect(Promise.prototype.then).to.be.a('function');
    expect(Promise).to.not.equal(Bluebird);
    expect(Promise.prototype).to.not.equal(Bluebird.prototype);
  });
});
