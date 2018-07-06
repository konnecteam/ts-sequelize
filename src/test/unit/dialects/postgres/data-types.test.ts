'use strict';

import * as chai from 'chai';
import DataTypes from '../../../../lib/dialects/postgres/postgres-data-types';
import Support from '../../../support';
const expect = chai.expect;
const dialect = Support.getTestDialect();
const QueryGenerator = Support.sequelize.dialect.QueryGenerator;

if (dialect.match(/^postgres/)) {
  describe('[POSTGRES Specific] DataTypes', () => {
    describe('GEOMETRY', () => {
      it('should use bindParam fn', function() {
        const value = { type: 'Point' };
        const bind = [];
        const bindParam = QueryGenerator.bindParam(bind);
        const result = new DataTypes.GEOMETRY().bindParam(value, { bindParam });
        expect(result).to.equal('ST_GeomFromGeoJSON($1)');
        expect(bind).to.eql([value]);
      });
    });

    describe('GEOGRAPHY', () => {
      it('should use bindParam fn', function() {
        const value = { type: 'Point' };
        const bind = [];
        const bindParam = QueryGenerator.bindParam(bind);
        const result = new DataTypes.GEOGRAPHY().bindParam(value, { bindParam });
        expect(result).to.equal('ST_GeomFromGeoJSON($1)');
        expect(bind).to.eql([value]);
      });
    });
  });
}
