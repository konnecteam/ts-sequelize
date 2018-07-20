'use strict';

import * as chai from 'chai';
import * as sinon from 'sinon';
import * as tedious from 'tedious';
import Support from '../../../support';
import { MssqlQuery } from './../../../../lib/dialects/mssql/mssql-query';
const expect = chai.expect;
const dialect = Support.getTestDialect();
const sequelize = Support.sequelize;
const tediousIsolationLevel = tedious.ISOLATION_LEVEL;
const connectionStub = {
  begin: () => {},
  lib: tedious
};

let sandbox;
let query;

if (dialect === 'mssql') {
  describe('[MSSQL Specific] Query', () => {
    describe('beginTransaction', () => {
      beforeEach(() => {
        sandbox = sinon.sandbox.create();
        const options = {
          transaction: { name: 'transactionName' },
          isolationLevel: 'REPEATABLE_READ',
          logging: false
        };
        sandbox.stub(connectionStub, 'begin').callsFake(cb => {
          cb();
        });
        query = new MssqlQuery(connectionStub, sequelize, options);
      });

      it('should call beginTransaction with correct arguments', () => {
        return query._run(connectionStub, 'BEGIN TRANSACTION')
          .then(() => {
            expect((connectionStub.begin as any).called).to.equal(true);
            expect((connectionStub.begin as any).args[0][1]).to.equal('transactionName');
            expect((connectionStub.begin as any).args[0][2]).to.equal(tediousIsolationLevel.REPEATABLE_READ);
          });
      });

      afterEach(() => {
        sandbox.restore();
      });
    });

    describe('formatBindParameters', () => {
      it('should convert Sequelize named binding format to MSSQL format', () => {
        const sql = 'select $one as a, $two as b, $one as c, $three as d, $one as e';
        const values = { one: 1, two: 2, three: 3 };

        const expected = 'select @one as a, @two as b, @one as c, @three as d, @one as e';

        const result = MssqlQuery.formatBindParameters(sql, values, dialect);
        expect(result[0]).to.be.a('string');
        expect(result[0]).to.equal(expected);
      });

      it('should convert Sequelize numbered binding format to MSSQL format', () => {
        const sql = 'select $1 as a, $2 as b, $1 as c, $3 as d, $1 as e';
        const values = [1, 2, 3];

        const expected = 'select @0 as a, @1 as b, @0 as c, @2 as d, @0 as e';

        const result = MssqlQuery.formatBindParameters(sql, values, dialect);
        expect(result[0]).to.be.a('string');
        expect(result[0]).to.equal(expected);
      });
    });
  });

  describe('mapIsolationLevelStringToTedious', () => {
    it('READ_UNCOMMITTED', () => {
      expect(MssqlQuery.mapIsolationLevelStringToTedious('READ_UNCOMMITTED', tedious)).to.equal(tediousIsolationLevel.READ_UNCOMMITTED);
    });

    it('READ_COMMITTED', () => {
      expect(MssqlQuery.mapIsolationLevelStringToTedious('READ_COMMITTED', tedious)).to.equal(tediousIsolationLevel.READ_COMMITTED);
    });

    it('REPEATABLE_READ', () => {
      expect(MssqlQuery.mapIsolationLevelStringToTedious('REPEATABLE_READ', tedious)).to.equal(tediousIsolationLevel.REPEATABLE_READ);
    });

    it('SERIALIZABLE', () => {
      expect(MssqlQuery.mapIsolationLevelStringToTedious('SERIALIZABLE', tedious)).to.equal(tediousIsolationLevel.SERIALIZABLE);
    });

    it('SNAPSHOT', () => {
      expect(MssqlQuery.mapIsolationLevelStringToTedious('SNAPSHOT', tedious)).to.equal(tediousIsolationLevel.SNAPSHOT);
    });

    it('should throw error if tedious lib is not passed as a parameter', () => {
      expect(MssqlQuery.mapIsolationLevelStringToTedious.bind(MssqlQuery, 'SNAPSHOT')).to.throw('An instance of tedious lib should be passed to this function');
    });
  });
}
