'use strict';

import * as chai from 'chai';
import * as _ from 'lodash';
import DataTypes from '../../../../lib/data-types';
import { ItestAttribute, ItestInstance } from '../../../dummy/dummy-data-set';
import Support from '../../support';
const expect = chai.expect;
const dialect = Support.getTestDialect();
const current = Support.sequelize;

if (dialect.match(/^postgres/)) {
  describe('[POSTGRES] Sequelize', () => {
    function checkTimezoneParsing(baseOptions) {
      const options = _.extend({}, baseOptions, { timezone: 'Asia/Kolkata', timestamps: true });
      const sequelize = Support.createSequelizeInstance(options);

      const tzTable = sequelize.define<ItestInstance, ItestAttribute>('tz_table', { foo: new DataTypes.STRING() });
      return tzTable.sync({force: true}).then(() => {
        return tzTable.create({foo: 'test'}).then(row => {
          expect(row).to.be.not.null;
        });
      });
    }

    it('should correctly parse the moment based timezone', function() {
      return checkTimezoneParsing(current.options);
    });

    it('should correctly parse the moment based timezone while fetching hstore oids', function() {
      // reset oids so we need to refetch them
      DataTypes.HSTORE.types.postgres.oids = [];
      DataTypes.HSTORE.types.postgres.array_oids = [];
      return checkTimezoneParsing(current.options);
    });
  });
}
