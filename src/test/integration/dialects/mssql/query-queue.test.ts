'use strict';

import * as chai from 'chai';
const expect = chai.expect;
import Promise from '../../../../lib/promise';
import DataTypes from '../../../../lib/data-types';
import Support from '../../support';
const dialect = Support.getTestDialect();

if (dialect.match(/^mssql/)) {
  describe('[MSSQL Specific] Query Queue', () => {
    beforeEach(function() {
      const User = this.User = this.sequelize.define('User', {
        username: DataTypes.STRING
      });

      return this.sequelize.sync({ force: true }).then(() => {
        return User.create({ username: 'John'});
      });
    });

    it('should queue concurrent requests to a connection', function() {
      const User = this.User;

      return expect(this.sequelize.transaction(t => {
        return Promise.all([
          User.findOne({
            transaction: t
          }),
          User.findOne({
            transaction: t
          })
        ]);
      })).not.to.be.rejected;
    });
  });
}
