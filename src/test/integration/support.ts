'use strict';

import Support from '../support';
const current = Support.sequelize;

beforeEach(function() {
  current.test.trackRunningQueries();
  return Support.clearDatabase(current);
});

afterEach(function() {
  try {
    current.test.verifyNoRunningQueries();
  } catch (err) {
    err.message += ' in ' + this.currentTest.fullTitle();
    throw err;
  }
});

export default Support;
