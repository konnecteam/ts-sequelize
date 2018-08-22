'use strict';

import * as chai from 'chai';
import * as _ from 'lodash';
import DataTypes from '../../../../lib/data-types';
import { Model } from '../../../../lib/model';
import { ItestAttribute, ItestInstance } from '../../../dummy/dummy-data-set';
import Support from '../../support';
const expect = chai.expect;
const Sequelize = Support.Sequelize;
const current = Support.sequelize;
const dialect   = Support.getTestDialect();

if (dialect.match(/^postgres/)) {
  const constraintName = 'overlap_period';
  let Booking : Model<ItestInstance, ItestAttribute>;
  beforeEach(function() {
    Booking = current.define<ItestInstance, ItestAttribute>('Booking', {
      roomNo: new DataTypes.INTEGER(),
      period: new DataTypes.RANGE(new DataTypes.DATE())
    });
    return Booking
      .sync({ force: true })
      .then(() => {
        return current.query('ALTER TABLE "' + Booking.tableName + '" ADD CONSTRAINT ' + constraintName +
                                    ' EXCLUDE USING gist ("roomNo" WITH =, period WITH &&)');
      });
  });

  describe('[POSTGRES Specific] ExclusionConstraintError', () => {

    it('should contain error specific properties', () => {
      const errDetails = {
        message: 'Exclusion constraint error',
        constraint: 'constraint_name',
        fields: { field1: 1, field2: [123, 321] },
        table: 'table_name',
        parent: new Error('Test error')
      };
      const err = new Sequelize.ExclusionConstraintError(errDetails);

      _.each(errDetails, (value, key) => {
        expect(value).to.be.deep.equal(err[key]);
      });
    });

    it('should throw ExclusionConstraintError when "period" value overlaps existing', function() {
      return Booking
        .create({
          roomNo: 1,
          guestName: 'Incognito Visitor',
          period: [new Date(2015, 0, 1), new Date(2015, 0, 3)]
        })
        .then(() => {
          return expect(Booking
            .create({
              roomNo: 1,
              guestName: 'Frequent Visitor',
              period: [new Date(2015, 0, 2), new Date(2015, 0, 5)]
            })).to.eventually.be.rejectedWith(Sequelize.ExclusionConstraintError);
        });
    });

  });
}
