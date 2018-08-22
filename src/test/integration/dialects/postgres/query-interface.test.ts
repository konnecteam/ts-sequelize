'use strict';

import * as chai from 'chai';
import * as _ from 'lodash';
import DataTypes from '../../../../lib/data-types';
import Support from '../../support';
const expect = chai.expect;
const dialect = Support.getTestDialect();
const current = Support.sequelize;


if (dialect.match(/^postgres/)) {
  describe('[POSTGRES Specific] QueryInterface', () => {
    let queryInterface = current.getQueryInterface();
    beforeEach(function() {
      current.options.quoteIdentifiers = true;
      queryInterface = current.getQueryInterface();
    });

    describe('createSchema', () => {
      beforeEach(function() {
        // make sure we don't have a pre-existing schema called testSchema.
        return queryInterface.dropSchema('testschema').reflect();
      });

      it('creates a schema', function() {
        return queryInterface.createSchema('testschema')
          .then(() => current.query(`
            SELECT schema_name
            FROM information_schema.schemata
            WHERE schema_name = 'testschema';
          `, { type: current.QueryTypes.SELECT }))
          .then(res => {
            expect(res, 'query results').to.not.be.empty;
            expect(res[0].schema_name).to.be.equal('testschema');
          });
      });

      it('works even when schema exists', function() {
        return queryInterface.createSchema('testschema')
          .then(() => queryInterface.createSchema('testschema'))
          .then(() => current.query(`
            SELECT schema_name
            FROM information_schema.schemata
            WHERE schema_name = 'testschema';
          `, { type: current.QueryTypes.SELECT }))
          .then(res => {
            expect(res, 'query results').to.not.be.empty;
            expect(res[0].schema_name).to.be.equal('testschema');
          });
      });
    });

    describe('databaseVersion', () => {
      it('reports version', function() {
        return queryInterface.databaseVersion()
          .then(res => {
            // check that result matches expected version number format. example 9.5.4
            expect(res).to.match(/[0-9\.[0-9]\.[0-9]/);
          });
      });
    });

    describe('renameFunction', () => {
      beforeEach(function() {
        // ensure the function names we'll use don't exist before we start.
        // then setup our function to rename
        return queryInterface.dropFunction('rftest1', [])
          .reflect()
          .then(() => queryInterface.dropFunction('rftest2', []))
          .reflect()
          .then(() => queryInterface.createFunction('rftest1', [], 'varchar', 'plpgsql', 'return \'testreturn\';', {}));
      });

      it('renames a function', function() {
        return queryInterface.renameFunction('rftest1', [], 'rftest2')
          .then(() => current.query('select rftest2();', { type: current.QueryTypes.SELECT }))
          .then(res => {
            expect(res[0].rftest2).to.be.eql('testreturn');
          });
      });
    });

    describe('createFunction', () => {

      beforeEach(function() {
        // make sure we don't have a pre-existing function called create_job
        // this is needed to cover the edge case of afterEach not getting called because of an unexpected issue or stopage with the
        // test suite causing a failure of afterEach's cleanup to be called.
        return queryInterface.dropFunction('create_job', [{type: 'varchar', name: 'test'}])
          // suppress errors here. if create_job doesn't exist thats ok.
          .reflect();
      });

      after(function() {
        // cleanup
        return queryInterface.dropFunction('create_job', [{type: 'varchar', name: 'test'}])
          // suppress errors here. if create_job doesn't exist thats ok.
          .reflect();
      });

      it('creates a stored procedure', function() {
        const body = 'return test;';
        const options = {};

        // make our call to create a function
        return queryInterface.createFunction('create_job', [{type: 'varchar', name: 'test'}], 'varchar', 'plpgsql', body, options)
          // validate
          .then(() => current.query('select create_job(\'test\');', { type: current.QueryTypes.SELECT }))
          .then(res => {
            expect(res[0].create_job).to.be.eql('test');
          });
      });

      it('treats options as optional', function() {
        const body = 'return test;';

        // run with null options parameter
        return queryInterface.createFunction('create_job', [{type: 'varchar', name: 'test'}], 'varchar', 'plpgsql', body)
          // validate
          .then(() => current.query('select create_job(\'test\');', { type: current.QueryTypes.SELECT }))
          .then(res => {
            expect(res[0].create_job).to.be.eql('test');
          });
      });

      it('produces an error when missing expected parameters', function() {
        const body = 'return 1;';
        const options = {};

        return Promise.all([
          // requires functionName
          expect(() => {
            return queryInterface.createFunction(null, [{name: 'test'}], 'integer', 'plpgsql', body, options);
          }).to.throw(/createFunction missing some parameters. Did you pass functionName, returnType, language and body/),

          // requires Parameters array
          expect(() => {
            return queryInterface.createFunction('create_job', null, 'integer', 'plpgsql', body, options);
          }).to.throw(/function parameters array required/),

          // requires returnType
          expect(() => {
            return queryInterface.createFunction('create_job', [{type: 'varchar', name: 'test'}], null, 'plpgsql', body, options);
          }).to.throw(/createFunction missing some parameters. Did you pass functionName, returnType, language and body/),

          // requires type in parameter array
          expect(() => {
            return queryInterface.createFunction('create_job', [{name: 'test'}], 'integer', 'plpgsql', body, options);
          }).to.throw(/function or trigger used with a parameter without any type/),

          // requires language
          expect(() => {
            return queryInterface.createFunction('create_job', [{type: 'varchar', name: 'test'}], 'varchar', null, body, options);
          }).to.throw(/createFunction missing some parameters. Did you pass functionName, returnType, language and body/),

          // requires body
          expect(() => {
            return queryInterface.createFunction('create_job', [{type: 'varchar', name: 'test'}], 'varchar', 'plpgsql', null, options);
          }).to.throw(/createFunction missing some parameters. Did you pass functionName, returnType, language and body/),
        ]);
      });
    });

    describe('dropFunction', () => {
      beforeEach(function() {
        const body = 'return test;';
        const options = {};

        // make sure we have a droptest function in place.
        return queryInterface.createFunction('droptest', [{type: 'varchar', name: 'test'}], 'varchar', 'plpgsql', body, options)
          // suppress errors.. this could fail if the function is already there.. thats ok.
          .reflect();
      });

      it('can drop a function', function() {
        return expect(
          // call drop function
          queryInterface.dropFunction('droptest', [{type: 'varchar', name: 'test'}])
            // now call the function we attempted to drop.. if dropFunction worked as expect it should produce an error.
            .then(() => {
              // call the function we attempted to drop.. if it is still there then throw an error informing that the expected behavior is not met.
              return current.query('select droptest(\'test\');', { type: current.QueryTypes.SELECT });
            })
        // test that we did get the expected error indicating that droptest was properly removed.
        ).to.be.rejectedWith(/.*function droptest.* does not exist/);
      });

      it('produces an error when missing expected parameters', function() {
        return Promise.all([
          expect(() => {
            return queryInterface.dropFunction();
          }).to.throw(/.*requires functionName/),

          expect(() => {
            return queryInterface.dropFunction('droptest');
          }).to.throw(/.*function parameters array required/),

          expect(() => {
            return queryInterface.dropFunction('droptest', [{name: 'test'}]);
          }).to.be.throw(/.*function or trigger used with a parameter without any type/),
        ]);
      });
    });

    describe('indexes', () => {
      beforeEach(function() {
        return queryInterface.dropTable('Group')
          .then(() => queryInterface.createTable('Group', {
            username: new DataTypes.STRING(),
            isAdmin: new DataTypes.BOOLEAN(),
            from: new DataTypes.STRING()
          }));
      });

      it('supports newlines', function() {
        return queryInterface.addIndex('Group', [current.literal(`(
            CASE "username"
              WHEN 'foo' THEN 'bar'
              ELSE 'baz'
            END
          )`)], { name: 'group_username_case' })
          .then(() => queryInterface.showIndex('Group'))
          .then(indexes => {
            const indexColumns = _.uniq(indexes.map(index => index.name));

            expect(indexColumns).to.include('group_username_case');
          });
      });

      it('adds, reads and removes a named functional index to the table', function() {
        return queryInterface.addIndex('Group', [current.fn('lower', current.col('username'))], {
          name: 'group_username_lower'
        })
          .then(() => queryInterface.showIndex('Group'))
          .then(indexes => {
            const indexColumns = _.uniq(indexes.map(index => index.name));

            expect(indexColumns).to.include('group_username_lower');
          })
          .then(() => queryInterface.removeIndex('Group', 'group_username_lower'))
          .then(() => queryInterface.showIndex('Group'))
          .then(indexes => {
            const indexColumns = _.uniq(indexes.map(index => index.name));
            expect(indexColumns).to.be.empty;
          });
      });
    });
  });
}
