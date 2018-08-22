'use strict';

import * as Promise from 'bluebird';
import * as chai from 'chai';
import DataTypes from '../../../../lib/data-types';
import { Model } from '../../../../lib/model';
import { ItestAttribute, ItestInstance } from '../../../dummy/dummy-data-set';
import Support from '../../support';
const expect = chai.expect;
const dialect = Support.getTestDialect();
const current = Support.sequelize;

if (dialect.match(/^mssql/)) {
  describe('[MSSQL Specific] Query Queue', () => {
    let User : Model<ItestInstance, ItestAttribute>;
    beforeEach(function() {
      User = current.define<ItestInstance, ItestAttribute>('User', {
        username: new DataTypes.STRING()
      });

      return current.sync({ force: true }).then(() => {
        return User.create({ username: 'John'});
      });
    });

    it('should queue concurrent requests to a connection', function() {
      return expect(current.transaction(t => {
        return Promise.all([
          User.findOne({
            transaction: t
          }),
          User.findOne({
            transaction: t
          }),
        ]);
      })).not.to.be.rejected;
    });
  });
}
