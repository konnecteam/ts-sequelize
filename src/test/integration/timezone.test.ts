'use strict';

import * as chai from 'chai';
import {Sequelize} from '../../index';
import { ItestAttribute, ItestInstance } from '../dummy/dummy-data-set';
import Support from './support';
const current = Support.sequelize;
const expect = chai.expect;
const dialect = Support.getTestDialect();
const Promise = Sequelize.Promise;

if (dialect !== 'sqlite') {
  // Sqlite does not support setting timezone

  describe(Support.getTestDialectTeaser('Timezone'), () => {
    let sequelizeWithTimezone : Sequelize;
    let sequelizeWithNamedTimezone : Sequelize;
    beforeEach(function() {
      sequelizeWithTimezone = Support.createSequelizeInstance({
        timezone: '+07:00'
      });
      sequelizeWithNamedTimezone = Support.createSequelizeInstance({
        timezone: 'America/New_York'
      });
    });

    it('returns the same value for current timestamp', function() {
      let now = 'now()';
      const startQueryTime = Date.now();

      if (dialect === 'mssql') {
        now = 'GETDATE()';
      }

      let query = 'SELECT ' + now + ' as now';
      if (dialect === 'oracle') {
        query = 'SELECT CURRENT_DATE AS now FROM DUAL';
      }

      return Promise.all([
        current.query(query, { type: current.QueryTypes.SELECT }),
        sequelizeWithTimezone.query(query, { type: current.QueryTypes.SELECT }),
      ]).spread((now1, now2) => {
        const elapsedQueryTime = Date.now() - startQueryTime + 1001;
        expect(now1[0].now.getTime()).to.be.closeTo(now2[0].now.getTime(), elapsedQueryTime);
      });
    });

    if (dialect === 'mysql') {
      it('handles existing timestamps', function() {
        const NormalUser = current.define<ItestInstance, ItestAttribute>('user', {});
        const TimezonedUser = sequelizeWithTimezone.define<ItestInstance, ItestAttribute>('user', {});
        let normalUser;

        return current.sync({ force: true }).bind(this).then(() => {
          return NormalUser.create({});
        }).then(function(_normalUser) {
          normalUser = _normalUser;
          return TimezonedUser.findById(normalUser.id);
        }).then(function(timezonedUser) {
          // Expect 7 hours difference, in milliseconds.
          // This difference is expected since two instances, configured for each their timezone is trying to read the same timestamp
          // this test does not apply to PG, since it stores the timezone along with the timestamp.
          expect(normalUser.createdAt.getTime() - timezonedUser.createdAt.getTime()).to.be.closeTo(60 * 60 * 7 * 1000, 1000);
        });
      });

      it('handles named timezones', function() {
        const NormalUser = current.define<ItestInstance, ItestAttribute>('user', {});
        const TimezonedUser = sequelizeWithNamedTimezone.define<ItestInstance, ItestAttribute>('user', {});

        return current.sync({ force: true }).bind(this).then(() => {
          return TimezonedUser.create({});
        }).then(timezonedUser => {
          return Promise.all([
            NormalUser.findById(timezonedUser.id),
            TimezonedUser.findById(timezonedUser.id),
          ]);
        }).spread((normalUser, timezonedUser) => {
          // Expect 5 hours difference, in milliseconds, +/- 1 hour for DST
          expect(normalUser.createdAt.getTime() - timezonedUser.createdAt.getTime()).to.be.closeTo(60 * 60 * 4 * 1000 * -1, 60 * 60 * 1000);
        });
      });
    }
  });
}
