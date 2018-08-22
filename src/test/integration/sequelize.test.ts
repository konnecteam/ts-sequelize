'use strict';

import * as chai from 'chai';
import * as _ from 'lodash';
import * as moment from 'moment';
import * as semver from 'semver';
import * as sinon from 'sinon';
import { Model, Sequelize } from '../../index';
import DataTypes from '../../lib/data-types';
import { Transaction } from '../../lib/transaction';
import { Utils } from '../../lib/utils';
import config from '../config/config';
import { ItestAttribute, ItestInstance } from '../dummy/dummy-data-set';
import Support from './support';
const expect = chai.expect;
const assert = chai.assert;
const dialect = Support.getTestDialect();
let current = Support.sequelize;


const qq = function(str) {
  if (dialect === 'postgres' || dialect === 'mssql') {
    return '"' + str + '"';
  } else if (dialect === 'mysql' || dialect === 'sqlite') {
    return '`' + str + '`';
  } else if (dialect === 'oracle') {
    if (str.indexOf('.') > -1) {
      return `"${str}"`;
    }
    return str.replace('user', '"user"');
  } else {
    return str;
  }
};

//Function adding the from dual clause for Oracle requests
const formatQuery = (qry, force = null) => {
  if (dialect === 'oracle' && ((qry.indexOf('FROM') === -1) || force !== undefined && force)) {
    if (qry.charAt(qry.length - 1) === ';') {
      qry = qry.substr(0, qry.length - 1);
    }
    return qry + ' FROM DUAL';
  }
  return qry;
};

describe(Support.getTestDialectTeaser('Sequelize'), () => {
  let User : Model<ItestInstance, ItestAttribute>;
  let Review : Model<ItestInstance, ItestAttribute>;
  let insertQuery : string;
  let sequelizeWithInvalidConnection : Sequelize;
  let sequelizeWithInvalidCredentials : Sequelize;
  let sequelizeWithTransaction : Sequelize;
  let transaction : Transaction;
  let t : Transaction;
  let t1 : Transaction;
  let t2 : Transaction;
  let sp1;
  let sp2;
  describe('constructor', () => {
    afterEach(() => {
      if (Utils.deprecate.restore) {
        Utils.deprecate.restore();
      }
    });

    if (dialect !== 'sqlite') {
      it.skip('should work with min connections', () => {
        const ConnectionManager = current.dialect.connectionManager;
        const connectionSpy = ConnectionManager.connect = chai.this.spy(ConnectionManager.connect);

        Support.createSequelizeInstance({
          pool: {
            min: 2
          }
        });
        expect(connectionSpy).to.have.been.called.twice;
      });
    }

    it('should pass the global options correctly', () => {
      const sequelize = Support.createSequelizeInstance({ logging: false, define: { underscored: true } });
      const DAO = sequelize.define<ItestInstance, ItestAttribute>('dao', {name: new DataTypes.STRING()});

      expect(DAO.options.underscored).to.be.ok;
    });

    it('should correctly set the host and the port', () => {
      const sequelize = Support.createSequelizeInstance({ host: '127.0.0.1', port: 1234 });
      expect(sequelize.config.port).to.equal(1234);
      expect(sequelize.config.host).to.equal('127.0.0.1');
    });

    it('should set operators aliases on dialect QueryGenerator', () => {
      const operatorsAliases = { fake: true };
      const sequelize = Support.createSequelizeInstance({ operatorsAliases });

      expect(sequelize).to.have.property('dialect');
      expect(sequelize.dialect).to.have.property('QueryGenerator');
      expect(sequelize.dialect.QueryGenerator).to.have.property('OperatorsAliasMap');
      expect(sequelize.dialect.QueryGenerator.OperatorsAliasMap).to.be.eql(operatorsAliases);
    });

    if (dialect === 'sqlite') {
      it('should work with connection strings (1)', () => {
        // tslint:disable-next-line:no-unused-expression-chai
        new Sequelize('sqlite://test.sqlite');
      });
      it('should work with connection strings (2)', () => {
        // tslint:disable-next-line:no-unused-expression-chai
        new Sequelize('sqlite://test.sqlite/');
      });
      it('should work with connection strings (3)', () => {
        // tslint:disable-next-line:no-unused-expression-chai
        new Sequelize('sqlite://test.sqlite/lol?reconnect=true');
      });
    }

    if (dialect === 'postgres') {
      const getConnectionUri = _.template('<%= protocol %>://<%= username %>:<%= password %>@<%= host %><% if(port) { %>:<%= port %><% } %>/<%= database %>');
      it('should work with connection strings (postgres protocol)', () => {
        const connectionUri = getConnectionUri(_.extend(config[dialect], {protocol: 'postgres'}));
        // postgres://...
        // tslint:disable-next-line:no-unused-expression-chai
        new Sequelize(connectionUri);
      });
      it('should work with connection strings (postgresql protocol)', () => {
        const connectionUri = getConnectionUri(_.extend(config[dialect], {protocol: 'postgresql'}));
        // postgresql://...
        // tslint:disable-next-line:no-unused-expression-chai
        new Sequelize(connectionUri);
      });
    }
  });

  if (dialect !== 'sqlite') {
    describe('authenticate', () => {
      describe('with valid credentials', () => {
        it('triggers the success event', function() {
          return current.authenticate();
        });
      });

      describe('with an invalid connection', () => {
        beforeEach(function() {
          const options = _.extend({}, current.options, { port: '99999' });
          sequelizeWithInvalidConnection = new Sequelize('wat', 'trololo', 'wow', options);
        });

        it('triggers the error event', function() {
          return sequelizeWithInvalidConnection
            .authenticate()
            .catch(err => {
              expect(err).to.not.be.null;
            });
        });

        it('triggers an actual RangeError or ConnectionError', function() {
          return sequelizeWithInvalidConnection
            .authenticate()
            .catch(err => {
              expect(
                err instanceof RangeError ||
                err instanceof Sequelize.ConnectionError
              ).to.be.ok;
            });
        });

        it('triggers the actual adapter error', function() {
          return sequelizeWithInvalidConnection
            .authenticate()
            .catch(err => {
              expect(
                err.message.match(/connect ECONNREFUSED/) ||
                err.message.match(/invalid port number/) ||
                err.message.match(/be >=? 0 and < 65536/) ||
                err.message.match(/Login failed for user/) ||
                err.message.match(/ORA-12541/)
              ).to.be.ok;
            });
        });
      });

      describe('with invalid credentials', () => {
        beforeEach(function() {
          sequelizeWithInvalidCredentials = new Sequelize('localhost', 'wtf', 'lol', current.options);
        });

        it('triggers the error event', function() {
          return sequelizeWithInvalidCredentials
            .authenticate()
            .catch(err => {
              expect(err).to.not.be.null;
            });
        });

        it('triggers an actual sequlize error', function() {
          return sequelizeWithInvalidCredentials
            .authenticate()
            .catch(err => {
              expect(err).to.be.instanceof(Sequelize.Error);
            });
        });

        it('triggers the error event when using replication', () => {
          return new Sequelize('sequelize', null, null, {
            dialect,
            replication: {
              read: {
                host: 'localhost',
                username: 'omg',
                password: 'lol'
              }
            }
          }).authenticate()
            .catch(err => {
              expect(err).to.not.be.null;
            });
        });
      });
    });

    describe('validate', () => {
      it('is an alias for .authenticate()', function() {
        expect(current.validate).to.equal(current.authenticate);
      });
    });
  }

  describe('getDialect', () => {
    it('returns the defined dialect', function() {
      expect(current.getDialect()).to.equal(dialect);
    });
  });

  describe('isDefined', () => {
    it('returns false if the dao wasn\'t defined before', function() {
      expect(current.isDefined('Project')).to.be.false;
    });

    it('returns true if the dao was defined before', function() {
      current.define<ItestInstance, ItestAttribute>('Project', {
        name: new DataTypes.STRING()
      });
      expect(current.isDefined('Project')).to.be.true;
    });
  });

  describe('model', () => {
    it('throws an error if the dao being accessed is undefined', function() {
      expect(() => {
        current.model('Project');
      }).to.throw(/project has not been defined/i);
    });

    it('returns the dao factory defined by daoName', function() {
      const project = current.define<ItestInstance, ItestAttribute>('Project', {
        name: new DataTypes.STRING()
      });

      expect(current.model('Project')).to.equal(project);
    });
  });

  describe('query', () => {
    afterEach(function() {
      current.options.quoteIdentifiers = true;

      if ((console.log as any).restore) {
        (console.log as any).restore();
      }
    });

    beforeEach(function() {
      User = current.define<ItestInstance, ItestAttribute>('User', {
        username: new DataTypes.STRING(),
        emailAddress: {
          type: new DataTypes.STRING(),
          field: 'email_address'
        }
      });


      insertQuery = 'INSERT INTO ' + qq(User.tableName) + ' (username, email_address, ' +
        qq('createdAt') + ', ' + qq('updatedAt');

      if (dialect === 'oracle') {
        insertQuery += ") VALUES ('john', 'john@gmail.com', TO_TIMESTAMP_TZ('2012-01-01 10:10:10','YYYY-MM-DD HH24:MI:SS.FFTZH:TZM'), TO_TIMESTAMP_TZ('2012-01-01 10:10:10','YYYY-MM-DD HH24:MI:SS.FFTZH:TZM'))";
      } else {
        insertQuery += ") VALUES ('john', 'john@gmail.com', '2012-01-01 10:10:10', '2012-01-01 10:10:10')";
      }

      return User.sync({ force: true });
    });

    it('executes a query the internal way', function() {
      return current.query(insertQuery, { raw: true });
    });

    it('executes a query if only the sql is passed', function() {
      return current.query(insertQuery);
    });

    if (dialect !== 'oracle') {
      it('executes a query if a placeholder value is an array', function() {
        return current.query(`INSERT INTO ${qq(User.tableName)} (username, email_address, ` +
          `${qq('createdAt')}, ${qq('updatedAt')}) VALUES ?;`, {
            replacements: [[
            ['john', 'john@gmail.com', '2012-01-01 10:10:10', '2012-01-01 10:10:10'],
            ['michael', 'michael@gmail.com', '2012-01-01 10:10:10', '2012-01-01 10:10:10']]]
          })
          .then(() =>
          current.query(`SELECT * FROM ${qq(User.tableName)};`, {
            type: current.QueryTypes.SELECT
          }))
          .then(rows => {
            expect(rows).to.be.lengthOf(2);
            expect(rows[0].username).to.be.equal('john');
            expect(rows[1].username).to.be.equal('michael');
          });
      });
    }

    describe('logging', () => {
      it('executes a query with global benchmarking option and default logger', () => {
        const logger = sinon.spy(console, 'log');
        const sequelize = Support.createSequelizeInstance({
          logging: logger,
          benchmark: true
        });

        return sequelize.query(formatQuery('select 1;')).then(() => {
          expect(logger.calledOnce).to.be.true;
          if (dialect === 'oracle') {
            expect(logger.args[0][0]).to.be.match(/Executed \(default\): select 1 FROM DUAL Elapsed time: \d+ms/);
          } else {
            expect(logger.args[0][0]).to.be.match(/Executed \(default\): select 1; Elapsed time: \d+ms/);
          }
        });
      });

      // We can only test MySQL warnings when using MySQL.
      if (dialect === 'mysql') {
        it('logs warnings when there are warnings', function() {

          // Due to strict MySQL 5.7 all cases below will throw errors rather than warnings
          if (semver.gte(current.options.databaseVersion, '5.6.0')) {
            return;
          }

          const logger = sinon.spy();
          const sequelize = Support.createSequelizeInstance({
            logging: logger,
            benchmark: false,
            showWarnings: true
          });
          const insertWarningQuery = 'INSERT INTO ' + qq(User.tableName) + ' (username, email_address, ' +
            qq('createdAt') + ', ' + qq('updatedAt') +
            ") VALUES ('john', 'john@gmail.com', 'HORSE', '2012-01-01 10:10:10')";

          return sequelize.query(insertWarningQuery)
            .then(() => {
              expect(logger.callCount).to.equal(3);
              expect(logger.args[2][0]).to.be.match(/^MySQL Warnings \(default\):.*?'createdAt'/m);
            });
        });
      }

      it('executes a query with global benchmarking option and custom logger', () => {
        const logger = sinon.spy();
        const sequelize = Support.createSequelizeInstance({
          logging: logger,
          benchmark: true
        });

        return sequelize.query(formatQuery('select 1;')).then(() => {
          expect(logger.calledOnce).to.be.true;
          if (dialect === 'oracle') {
            expect(logger.args[0][0]).to.be.equal('Executed (default): select 1 FROM DUAL');
          } else {
            expect(logger.args[0][0]).to.be.equal('Executed (default): select 1;');
          }
          expect(typeof logger.args[0][1] === 'number').to.be.true;
        });
      });

      it('executes a query with benchmarking option and default logger', function() {
        const logger = sinon.spy(console, 'log');
        return current.query(formatQuery('select 1;'), {
          logging: logger,
          benchmark: true
        }).then(() => {
          expect(logger.calledOnce).to.be.true;
          if (dialect === 'oracle') {
            expect(logger.args[0][0]).to.be.match(/Executed \(default\): select 1 FROM DUAL Elapsed time: \d+ms/);
          } else {
            expect(logger.args[0][0]).to.be.match(/Executed \(default\): select 1; Elapsed time: \d+ms/);
          }
        });
      });

      it('executes a query with benchmarking option and custom logger', function() {
        const logger = sinon.spy();

        return current.query(formatQuery('select 1;'), {
          logging: logger,
          benchmark: true
        }).then(() => {
          expect(logger.calledOnce).to.be.true;
          if (dialect === 'oracle') {
            expect(logger.args[0][0]).to.be.equal('Executed (default): select 1 FROM DUAL');
          } else {
            expect(logger.args[0][0]).to.be.equal('Executed (default): select 1;');
          }
          expect(typeof logger.args[0][1] === 'number').to.be.true;
        });
      });
    });

    it('executes select queries correctly', function() {
      return current.query(insertQuery).then(() => {
        return current.query('select * from ' + qq(User.tableName) + '');
      }).spread(users => {
        expect((users as any[]).map(u => u.username)).to.include('john');
      });
    });

    it('executes select queries correctly when quoteIdentifiers is false', function() {
      const seq = Object.create(current);

      seq.options.quoteIdentifiers = false;
      return seq.query(insertQuery).then(() => {
        return seq.query('select * from ' + qq(User.tableName) + '');
      }).spread(users => {
        expect(users.map(u => u.username)).to.include('john');
      });
    });

    it('executes select query with dot notation results', function() {
      return current.query('DELETE FROM ' + qq(User.tableName)).then(() => {
        return current.query(insertQuery);
      }).then(() => {
        return current.query('select username as ' + qq('user.username') + ' from ' + qq(User.tableName) + '');
      }).spread(users => {
        expect(users).to.deep.equal([{'user.username': 'john'}]);
      });
    });

    it('executes select query with dot notation results and nest it', function() {
      return current.query('DELETE FROM ' + qq(User.tableName)).then(() => {
        return current.query(insertQuery);
      }).then(() => {
        return current.query('select username as ' + qq('user.username') + ' from ' + qq(User.tableName) + '', { raw: true, nest: true });
      }).then(users => {
        expect(users.map(u => u.user)).to.deep.equal([{username: 'john'}]);
      });
    });

    if (dialect === 'mysql') {
      it('executes stored procedures', function() {
        return current.query(insertQuery).then(() => {
          return current.query('DROP PROCEDURE IF EXISTS foo').then(() => {
            return current.query(
              'CREATE PROCEDURE foo()\nSELECT * FROM ' + User.tableName + ';'
            ).then(() => {
              return current.query('CALL foo()').then(users => {
                expect(users.map(u => u.username)).to.include('john');
              });
            });
          });
        });
      });
    } else {
      Utils.warn('FIXME: I want to be supported in this dialect as well :-(');
    }

    it('uses the passed model', function() {
      return current.query(insertQuery).bind(this).then(function() {
        return current.query('SELECT * FROM ' + qq(User.tableName) + ';', {
          model: User
        });
      }).then(function(users) {
        expect(users[0].model).to.equal(User);
      });
    });

    it('maps the field names to attributes based on the passed model', function() {
      return current.query(insertQuery).bind(this).then(function() {
        return current.query('SELECT * FROM ' + qq(User.tableName) + ';', {
          model: User,
          mapToModel: true
        });
      }).then(users => {
        expect(users[0].emailAddress).to.be.equal('john@gmail.com');
      });
    });

    it('arbitrarily map the field names', function() {
      return current.query(insertQuery).bind(this).then(function() {
        return current.query('SELECT * FROM ' + qq(User.tableName) + ';', {
          type: 'SELECT',
          fieldMap: {username: 'userName', email_address: 'email'}
        });
      }).then(users => {
        expect(users[0].userName).to.be.equal('john');
        expect(users[0].email).to.be.equal('john@gmail.com');
      });
    });

    it('reject if `values` and `options.replacements` are both passed', function() {
      return (current.query({ query: 'select ? as foo, ? as bar', values: [1, 2] }, { raw: true, replacements: [1, 2] }) as any)
        .should.be.rejectedWith(Error, 'Both `sql.values` and `options.replacements` cannot be set at the same time');
    });

    it('reject if `sql.bind` and `options.bind` are both passed', function() {
      return (current.query({ query: 'select $1 + ? as foo, $2 + ? as bar', bind: [1, 2] }, { raw: true, bind: [1, 2] }) as any)
        .should.be.rejectedWith(Error, 'Both `sql.bind` and `options.bind` cannot be set at the same time');
    });

    it('reject if `options.replacements` and `options.bind` are both passed', function() {
      return (current.query('select $1 + ? as foo, $2 + ? as bar', { raw: true, bind: [1, 2], replacements: [1, 2] }) as any)
        .should.be.rejectedWith(Error, 'Both `replacements` and `bind` cannot be set at the same time');
    });

    it('reject if `sql.bind` and `sql.values` are both passed', function() {
      return (current.query({ query: 'select $1 + ? as foo, $2 + ? as bar', bind: [1, 2], values: [1, 2] }, { raw: true }) as any)
        .should.be.rejectedWith(Error, 'Both `replacements` and `bind` cannot be set at the same time');
    });

    it('reject if `sql.bind` and `options.replacements`` are both passed', function() {
      return (current.query({ query: 'select $1 + ? as foo, $2 + ? as bar', bind: [1, 2] }, { raw: true, replacements: [1, 2] }) as any)
        .should.be.rejectedWith(Error, 'Both `replacements` and `bind` cannot be set at the same time');
    });

    it('reject if `options.bind` and `sql.replacements` are both passed', function() {
      return (current.query({ query: 'select $1 + ? as foo, $1 _ ? as bar', values: [1, 2] }, { raw: true, bind: [1, 2] }) as any)
        .should.be.rejectedWith(Error, 'Both `replacements` and `bind` cannot be set at the same time');
    });


    //node-oracledb doesn't support this request (NJS-010 invalid data type in select list)
    if (dialect !== 'oracle') {
      it('properly adds and escapes replacement value', function() {
        let logSql;
        const number  = 1;
        const date = new Date();
        const string = 't\'e"st';
        const boolean = true;
        const buffer = new Buffer('t\'e"st');

        date.setMilliseconds(0);
        return current.query({
          query: 'select ? as number, ? as date,? as string,? as boolean,? as buffer',
          values: [number, date, string, boolean, buffer]
        }, {
          type: current.QueryTypes.SELECT,
          logging(s) {
            logSql = s;
          }
        }).then(result => {
          const res = result[0] || {};
          res.date = res.date && new Date(res.date);
          res.boolean = res.boolean && true;
          if (typeof res.buffer === 'string' && res.buffer.indexOf('\\x') === 0) {
            res.buffer = new Buffer(res.buffer.substring(2), 'hex');
          }
          expect(res).to.deep.equal({
            number,
            date,
            string,
            boolean,
            buffer
          });
          expect(logSql.indexOf('?')).to.equal(-1);
        });
      });
    }

    it('it allows to pass custom class instances', function() {
      let logSql;
      class SQLStatement {
        public values;
        constructor() {
          this.values = [1, 2];
        }
        get query() {
          return formatQuery('select ? as foo, ? as bar');
        }
      }
      return current.query(new SQLStatement(), { type: current.QueryTypes.SELECT, logging: s => logSql = s } ).then(result => {
        expect(result).to.deep.equal([{ foo: 1, bar: 2 }]);
        expect(logSql.indexOf('?')).to.equal(-1);
      });
    });

    it('uses properties `query` and `values` if query is tagged', function() {
      let logSql;
      return current.query({ query: formatQuery('select ? as foo, ? as bar'), values: [1, 2] }, { type: current.QueryTypes.SELECT, logging(s) { logSql = s; } }).then(result => {
        expect(result).to.deep.equal([{ foo: 1, bar: 2 }]);
        expect(logSql.indexOf('?')).to.equal(-1);
      });
    });

    it('uses properties `query` and `bind` if query is tagged', function() {
      const typeCast = dialect === 'postgres' ? '::int' : '';
      let logSql;
      return current.query({
        query: formatQuery('select $1' + typeCast + ' as foo, $2' + typeCast + ' as bar'),
        bind: [1, 2] },
        { type: current.QueryTypes.SELECT, logging(s) { logSql = s; } })
        .then(result => {
          expect(result).to.deep.equal([{ foo: 1, bar: 2 }]);
          if (dialect === 'postgres' || dialect === 'sqlite') {
            expect(logSql.indexOf('$1')).to.be.above(-1);
            expect(logSql.indexOf('$2')).to.be.above(-1);
          } else if (dialect === 'mssql') {
            expect(logSql.indexOf('@0')).to.be.above(-1);
            expect(logSql.indexOf('@1')).to.be.above(-1);
          } else if (dialect === 'mysql') {
            expect(logSql.match(/\?/g).length).to.equal(2);
          }
        });
    });

    it('dot separated attributes when doing a raw query without nest', function() {
      const tickChar = (dialect === 'postgres' || dialect === 'mssql' || dialect === 'oracle') ? '"' : '`';
      const sql = 'select 1 as ' + Sequelize.Utils.addTicks('foo.bar.baz', tickChar);

      return expect(current.query(formatQuery(sql), { raw: true, nest: false }).get(0 as any)).to.eventually.deep.equal([{ 'foo.bar.baz': 1 }]);
    });

    it('destructs dot separated attributes when doing a raw query using nest', function() {
      const tickChar = (dialect === 'postgres' || dialect === 'mssql' || dialect === 'oracle') ? '"' : '`';
      const sql = 'select 1 as ' + Sequelize.Utils.addTicks('foo.bar.baz', tickChar);

      return current.query(formatQuery(sql), { raw: true, nest: true }).then(result => {
        expect(result).to.deep.equal([{ foo: { bar: { baz: 1 } } }]);
      });
    });

    it('replaces token with the passed array', function() {
      return current.query(formatQuery('select ? as foo, ? as bar'), { type: current.QueryTypes.SELECT, replacements: [1, 2] }).then(result => {
        expect(result).to.deep.equal([{ foo: 1, bar: 2 }]);
      });
    });

    it('replaces named parameters with the passed object', function() {
      return expect(current.query(formatQuery('select :one as foo, :two as bar'), { raw: true, replacements: { one: 1, two: 2 }}).get(0 as any))
        .to.eventually.deep.equal([{ foo: 1, bar: 2 }]);
    });

    it('replaces named parameters with the passed object and ignore those which does not qualify', function() {
      return expect(current.query(formatQuery('select :one as foo, :two as bar, \'00:00\' as baz'), { raw: true, replacements: { one: 1, two: 2 }}).get(0 as any))
        .to.eventually.deep.equal([{ foo: 1, bar: 2, baz: '00:00' }]);
    });

    it('replaces named parameters with the passed object using the same key twice', function() {
      return expect(current.query(formatQuery('select :one as foo, :two as bar, :one as baz'), { raw: true, replacements: { one: 1, two: 2 }}).get(0 as any))
        .to.eventually.deep.equal([{ foo: 1, bar: 2, baz: 1 }]);
    });

    it('replaces named parameters with the passed object having a null property', function() {
      return expect(current.query(formatQuery('select :one as foo, :two as bar'), { raw: true, replacements: { one: 1, two: null }}).get(0 as any))
        .to.eventually.deep.equal([{ foo: 1, bar: null }]);
    });

    it('reject when key is missing in the passed object', function() {
      return (current.query('select :one as foo, :two as bar, :three as baz', { raw: true, replacements: { one: 1, two: 2 }}) as any)
        .should.be.rejectedWith(Error, /Named parameter ":\w+" has no value in the given object\./g);
    });

    it('reject with the passed number', function() {
      return (current.query('select :one as foo, :two as bar', { raw: true, replacements: 2 }) as any)
        .should.be.rejectedWith(Error, /Named parameter ":\w+" has no value in the given object\./g);
    });

    it('reject with the passed empty object', function() {
      return (current.query('select :one as foo, :two as bar', { raw: true, replacements: {}}) as any)
        .should.be.rejectedWith(Error, /Named parameter ":\w+" has no value in the given object\./g);
    });

    it('reject with the passed string', function() {
      return (current.query('select :one as foo, :two as bar', { raw: true, replacements: 'foobar'}) as any)
        .should.be.rejectedWith(Error, /Named parameter ":\w+" has no value in the given object\./g);
    });

    it('reject with the passed date', function() {
      return (current.query('select :one as foo, :two as bar', { raw: true, replacements: new Date()}) as any)
        .should.be.rejectedWith(Error, /Named parameter ":\w+" has no value in the given object\./g);
    });

    it('binds token with the passed array', function() {
      const typeCast = (dialect === 'postgres') ? '::int' : '';
      let logSql;
      return current.query(formatQuery('select $1' + typeCast + ' as foo, $2' + typeCast + ' as bar'), { type: current.QueryTypes.SELECT, bind: [1, 2], logging(s) { logSql = s; } }).then(result => {
        expect(result).to.deep.equal([{ foo: 1, bar: 2 }]);
        if (dialect === 'postgres' || dialect === 'sqlite') {
          expect(logSql.indexOf('$1')).to.be.above(-1);
        }
      });
    });

    it('binds named parameters with the passed object', function() {
      const typeCast = (dialect === 'postgres') ? '::int' : '';
      let logSql;
      return current.query(formatQuery('select $one' +  typeCast + ' as foo, $two' + typeCast + ' as bar'), { raw: true, bind: { one: 1, two: 2 }, logging(s) { logSql = s; } }).then(result => {
        expect(result[0]).to.deep.equal([{ foo: 1, bar: 2 }]);
        if (dialect === 'postgres') {
          expect(logSql.indexOf('$1')).to.be.above(-1);
        }
        if (dialect === 'sqlite') {
          expect(logSql.indexOf('$one')).to.be.above(-1);
        }
      });
    });

    it('binds named parameters with the passed object using the same key twice', function() {
      const typeCast = (dialect === 'postgres') ? '::int' : '';
      let logSql;
      return current.query(formatQuery('select $one' + typeCast + ' as foo, $two' + typeCast + ' as bar, $one' + typeCast + ' as baz'), { raw: true, bind: { one: 1, two: 2 }, logging(s) { logSql = s; } }).then(result => {
        expect(result[0]).to.deep.equal([{ foo: 1, bar: 2, baz: 1 }]);
        if (dialect === 'postgres') {
          expect(logSql.indexOf('$1')).to.be.above(-1);
          expect(logSql.indexOf('$2')).to.be.above(-1);
          expect(logSql.indexOf('$3')).to.equal(-1);
        }
      });
    });

    it('binds named parameters with the passed object having a null property', function() {
      const typeCast = (dialect === 'postgres') ? '::int' : '';
      return current.query(formatQuery('select $one' + typeCast + ' as foo, $two' + typeCast + ' as bar'), { raw: true, bind: { one: 1, two: null }}).then(result => {
        expect(result[0]).to.deep.equal([{ foo: 1, bar: null }]);
      });
    });

    it('binds named parameters array handles escaped $$', function() {
      const typeCast = (dialect === 'postgres') ? '::int' : '';
      let logSql;
      return current.query(formatQuery('select $1' + typeCast + ' as foo, \'$$ / $$1\' as bar'), { raw: true, bind: [1 ], logging(s) { logSql = s; } }).then(result => {
        expect(result[0]).to.deep.equal([{ foo: 1, bar: '$ / $1' }]);
        if (dialect === 'postgres' || dialect === 'sqlite') {
          expect(logSql.indexOf('$1')).to.be.above(-1);
        }
      });
    });

    it('binds named parameters object handles escaped $$', function() {
      const typeCast = (dialect === 'postgres') ? '::int' : '';
      return current.query(formatQuery('select $one' + typeCast + ' as foo, \'$$ / $$one\' as bar'), { raw: true, bind: { one: 1 } }).then(result => {
        expect(result[0]).to.deep.equal([{ foo: 1, bar: '$ / $one' }]);
      });
    });

    if (dialect === 'postgres' || dialect === 'sqlite' || dialect === 'mssql') {
      it('does not improperly escape arrays of strings bound to named parameters', function() {
        return current.query('select :stringArray as foo', { raw: true, replacements: { stringArray: ['"string"'] } }).then(result => {
          expect(result[0]).to.deep.equal([{ foo: '"string"' }]);
        });
      });
    }

    it('reject when binds passed with object and numeric $1 is also present', function() {
      const typeCast = dialect === 'postgres' ? '::int' : '';
      return (current.query('select $one' + typeCast + ' as foo, $two' + typeCast + ' as bar, \'$1\' as baz', {  raw: true, bind: { one: 1, two: 2 }}) as any)
        .should.be.rejectedWith(Error, /Named bind parameter "\$\w+" has no value in the given object\./g);
    });

    it('reject when binds passed as array and $alpha is also present', function() {
      const typeCast = dialect === 'postgres' ? '::int' : '';
      return (current.query('select $1' + typeCast + ' as foo, $2' + typeCast + ' as bar, \'$foo\' as baz', { raw: true, bind: [1, 2]}) as any)
        .should.be.rejectedWith(Error, /Named bind parameter "\$\w+" has no value in the given object\./g);
    });

    it('reject when bind key is $0 with the passed array', function() {
      return (current.query('select $1 as foo, $0 as bar, $3 as baz', { raw: true, bind: [1, 2] }) as any)
        .should.be.rejectedWith(Error, /Named bind parameter "\$\w+" has no value in the given object\./g);
    });

    it('reject when bind key is $01 with the passed array', function() {
      return (current.query('select $1 as foo, $01 as bar, $3 as baz', { raw: true, bind: [1, 2] }) as any)
        .should.be.rejectedWith(Error, /Named bind parameter "\$\w+" has no value in the given object\./g);
    });

    it('reject when bind key is missing in the passed array', function() {
      return (current.query('select $1 as foo, $2 as bar, $3 as baz', { raw: true, bind: [1, 2] }) as any)
        .should.be.rejectedWith(Error, /Named bind parameter "\$\w+" has no value in the given object\./g);
    });

    it('reject when bind key is missing in the passed object', function() {
      return (current.query('select $one as foo, $two as bar, $three as baz', { raw: true, bind: { one: 1, two: 2 }}) as any)
        .should.be.rejectedWith(Error, /Named bind parameter "\$\w+" has no value in the given object\./g);
    });

    it('reject with the passed number for bind', function() {
      return (current.query('select $one as foo, $two as bar', { raw: true, bind: 2 }) as any)
        .should.be.rejectedWith(Error, /Named bind parameter "\$\w+" has no value in the given object\./g);
    });

    it('reject with the passed empty object for bind', function() {
      return (current.query('select $one as foo, $two as bar', { raw: true, bind: {}}) as any)
        .should.be.rejectedWith(Error, /Named bind parameter "\$\w+" has no value in the given object\./g);
    });

    it('reject with the passed string for bind', function() {
      return (current.query('select $one as foo, $two as bar', { raw: true, bind: 'foobar'}) as any)
        .should.be.rejectedWith(Error, /Named bind parameter "\$\w+" has no value in the given object\./g);
    });

    it('reject with the passed date for bind', function() {
      return (current.query('select $one as foo, $two as bar', { raw: true, bind: new Date()}) as any)
        .should.be.rejectedWith(Error, /Named bind parameter "\$\w+" has no value in the given object\./g);
    });

    it('handles AS in conjunction with functions just fine', function() {
      let datetime = dialect === 'sqlite' ? 'date(\'now\')' : 'NOW()';
      if (dialect === 'mssql') {
        datetime = 'GETDATE()';
      }
      if (dialect === 'oracle') {
        datetime = '(SELECT SYSDATE FROM DUAL)';
      }

      return current.query(formatQuery('SELECT ' + datetime + ' AS t', true)).spread(result => {
        expect(moment(result[0].t).isValid()).to.be.true;
      });
    });

    if (Support.getTestDialect() === 'postgres') {
      it('replaces named parameters with the passed object and ignores casts', function() {
        return expect(current.query('select :one as foo, :two as bar, \'1000\'::integer as baz', { raw: true, replacements: { one: 1, two: 2 } }).get(0 as any))
          .to.eventually.deep.equal([{ foo: 1, bar: 2, baz: 1000 }]);
      });

      it('supports WITH queries', function() {
        return expect(current.query('WITH RECURSIVE t(n) AS ( VALUES (1) UNION ALL SELECT n+1 FROM t WHERE n < 100) SELECT sum(n) FROM t').get(0 as any))
          .to.eventually.deep.equal([{ sum: '5050' }]);
      });
    }

    if (Support.getTestDialect() === 'sqlite') {
      it('binds array parameters for upsert are replaced. $$ unescapes only once', function() {
        let logSql;
        return current.query('select $1 as foo, $2 as bar, \'$$$$\' as baz', { type: current.QueryTypes.UPSERT, bind: [1, 2], logging(s) { logSql = s; } }).then(() => {
          // sqlite.exec does not return a result
          expect(logSql.indexOf('$one')).to.equal(-1);
          expect(logSql.indexOf('\'$$\'')).to.be.above(-1);
        });
      });

      it('binds named parameters for upsert are replaced. $$ unescapes only once', function() {
        let logSql;
        return current.query('select $one as foo, $two as bar, \'$$$$\' as baz', { type: current.QueryTypes.UPSERT, bind: { one: 1, two: 2 }, logging(s) { logSql = s; } }).then(() => {
          // sqlite.exec does not return a result
          expect(logSql.indexOf('$one')).to.equal(-1);
          expect(logSql.indexOf('\'$$\'')).to.be.above(-1);
        });
      });
    }

  });

  describe('set', () => {
    it('should be configurable with global functions', function() {
      const defaultSetterMethod = sinon.spy();
      const overrideSetterMethod = sinon.spy();
      const defaultGetterMethod = sinon.spy();
      const overrideGetterMethod = sinon.spy();
      const customSetterMethod = sinon.spy();
      const customOverrideSetterMethod = sinon.spy();
      const customGetterMethod = sinon.spy();
      const customOverrideGetterMethod = sinon.spy();

      current.options.define = {
        setterMethods: {
          default: defaultSetterMethod,
          override: overrideSetterMethod
        },
        getterMethods: {
          default: defaultGetterMethod,
          override: overrideGetterMethod
        }
      };
      const testEntity = current.define<ItestInstance, ItestAttribute>('TestEntity', {}, {
        setterMethods: {
          custom: customSetterMethod,
          override: customOverrideSetterMethod
        },
        getterMethods: {
          custom: customGetterMethod,
          override: customOverrideGetterMethod
        }
      });

      // Create Instance to test
      const instance = testEntity.build();

      // Call Getters
      // tslint:disable-next-line:no-unused-expression-chai
      instance.default;
      // tslint:disable-next-line:no-unused-expression-chai
      instance.custom;
      // tslint:disable-next-line:no-unused-expression-chai
      instance.override;

      expect(defaultGetterMethod).to.have.been.calledOnce;
      expect(customGetterMethod).to.have.been.calledOnce;
      expect(overrideGetterMethod.callCount).to.be.eql(0);
      expect(customOverrideGetterMethod).to.have.been.calledOnce;

      // Call Setters
      instance.default = 'test';
      instance.custom = 'test';
      instance.override = 'test';

      expect(defaultSetterMethod).to.have.been.calledOnce;
      expect(customSetterMethod).to.have.been.calledOnce;
      expect(overrideSetterMethod.callCount).to.be.eql(0);
      expect(customOverrideSetterMethod).to.have.been.calledOnce;
    });
  });

  if (dialect === 'mysql') {
    describe('set', () => {
      it("should return an promised error if transaction isn't defined", function() {
        expect(() => {
          current.set({ foo: 'bar' });
        }).to.throw(TypeError, 'options.transaction is required');
      });

      it('one value', function() {
        return current.transaction().bind(this).then(function(_t) {
          t = _t;
          return current.set({ foo: 'bar' }, { transaction: t });
        }).then(function() {
          return current.query('SELECT @foo as `foo`', { plain: true, transaction: t });
        }).then(function(data) {
          expect(data).to.be.ok;
          expect(data.foo).to.be.equal('bar');
          return t.commit();
        });
      });

      it('multiple values', function() {
        return current.transaction().bind(this).then(function(_t) {
          t = _t;
          return current.set({
            foo: 'bar',
            foos: 'bars'
          }, { transaction: t });
        }).then(function() {
          return current.query('SELECT @foo as `foo`, @foos as `foos`', { plain: true, transaction: t });
        }).then(function(data) {
          expect(data).to.be.ok;
          expect(data.foo).to.be.equal('bar');
          expect(data.foos).to.be.equal('bars');
          return t.commit();
        });
      });
    });
  }

  describe('define', () => {
    it('adds a new dao to the dao manager', function() {
      const count = current.modelManager.all.length;
      current.define<ItestInstance, ItestAttribute>('foo', { title: new DataTypes.STRING() });
      expect(current.modelManager.all.length).to.equal(count + 1);
    });

    it('adds a new dao to sequelize.models', function() {
      expect(current.models.bar).to.equal();
      const Bar = current.define<ItestInstance, ItestAttribute>('bar', { title: new DataTypes.STRING() });
      expect(current.models.bar).to.equal(Bar);
    });

    it('overwrites global options', () => {
      const sequelize = Support.createSequelizeInstance({ define: { collate: 'utf8_general_ci' } });
      const DAO = sequelize.define<ItestInstance, ItestAttribute>('foo', {bar: new DataTypes.STRING()}, {collate: 'utf8_bin'});
      expect(DAO.options.collate).to.equal('utf8_bin');
    });

    it('overwrites global rowFormat options', () => {
      const sequelize = Support.createSequelizeInstance({ define: { rowFormat: 'compact' } });
      const DAO = sequelize.define<ItestInstance, ItestAttribute>('foo', {bar: new DataTypes.STRING()}, { rowFormat: 'default' });
      expect(DAO.options.rowFormat).to.equal('default');
    });

    it('inherits global collate option', () => {
      const sequelize = Support.createSequelizeInstance({ define: { collate: 'utf8_general_ci' } });
      const DAO = sequelize.define<ItestInstance, ItestAttribute>('foo', {bar: new DataTypes.STRING()});
      expect(DAO.options.collate).to.equal('utf8_general_ci');
    });

    it('inherits global rowFormat option', () => {
      const sequelize = Support.createSequelizeInstance({ define: { rowFormat: 'default' } });
      const DAO = sequelize.define<ItestInstance, ItestAttribute>('foo', {bar: new DataTypes.STRING()});
      expect(DAO.options.rowFormat).to.equal('default');
    });

    it('uses the passed tableName', function() {
      const Photo = current.define<ItestInstance, ItestAttribute>('Foto', { name: new DataTypes.STRING() }, { tableName: 'photos' });
      return Photo.sync({ force: true }).then(() => {
        return current.getQueryInterface().showAllTables().then(tableNames => {
          if (dialect === 'mssql' || dialect === 'oracle' /* current.dialect.supports.schemas */) {
            tableNames = _.map(tableNames, 'tableName');
          }

          if (dialect === 'oracle') {
            expect(tableNames).to.include('PHOTOS');
          } else {
            expect(tableNames).to.include('photos');
          }
        });
      });
    });
  });

  describe('truncate', () => {
    it('truncates all models', function() {
      const Project = current.define<ItestInstance, ItestAttribute>('project' + config.rand(), {
        id: {
          type: new DataTypes.INTEGER(),
          primaryKey: true,
          autoIncrement: true
        },
        title: new DataTypes.STRING()
      });

      return current.sync({ force: true }).then(() => {
        return Project.create({ title: 'bla' });
      }).bind(this).then(function(project) {
        expect(project).to.exist;
        expect(project.title).to.equal('bla');
        expect(project.id).to.equal(1);
        return current.truncate().then(() => {
          return Project.findAll({});
        });
      }).then(projects => {
        expect(projects).to.exist;
        expect(projects).to.have.length(0);
      });
    });
  });

  describe('sync', () => {
    it('synchronizes all models', function() {
      const Project = current.define<ItestInstance, ItestAttribute>('project' + config.rand(), { title: new DataTypes.STRING() });
      const Task = current.define<ItestInstance, ItestAttribute>('task' + config.rand(), { title: new DataTypes.STRING() });

      return Project.sync({ force: true }).then(() => {
        return Task.sync({ force: true }).then(() => {
          return Project.create({title: 'bla'}).then(() => {
            return Task.create({title: 'bla'}).then(task => {
              expect(task).to.exist;
              expect(task.title).to.equal('bla');
            });
          });
        });
      });
    });

    it('works with correct database credentials', function() {
      User = current.define<ItestInstance, ItestAttribute>('User', { username: new DataTypes.STRING() });
      return User.sync().then(() => {
        expect(true).to.be.true;
      });
    });

    it('fails with incorrect match condition', function() {
      const sequelize = new Sequelize('cyber_bird', 'user', 'pass', {
        dialect: current.options.dialect
      });

      sequelize.define<ItestInstance, ItestAttribute>('Project', {title: new DataTypes.STRING()});
      sequelize.define<ItestInstance, ItestAttribute>('Task', {title: new DataTypes.STRING()});

      return expect(sequelize.sync({force: true, match: /$phoenix/}))
        .to.be.rejectedWith('Database "cyber_bird" does not match sync match parameter "/$phoenix/"');
    });

    if (dialect !== 'sqlite') {
      it('fails with incorrect database credentials (1)', function() {
        sequelizeWithInvalidCredentials = new Sequelize('omg', 'bar', null, _.omit(current.options, ['host']));

        const User2 = sequelizeWithInvalidCredentials.define<ItestInstance, ItestAttribute>('User', { name: new DataTypes.STRING(), bio: new DataTypes.TEXT() });

        return User2.sync().catch(err => {
          if (dialect === 'postgres' || dialect === 'postgres-native') {
            expect([
              'fe_sendauth: no password supplied',
              'role "bar" does not exist',
              'FATAL:  role "bar" does not exist',
              'password authentication failed for user "bar"',
            ].indexOf(err.message.trim()) !== -1).to.equal(true);
          } else if (dialect === 'mssql') {
            expect(err.message).to.equal('Login failed for user \'bar\'.');
          } else if (dialect === 'oracle') {
            expect(err.message).to.equal('NJS-007: invalid value for "password" in parameter 1');
          } else {
            expect(err.message.toString()).to.match(/.*Access\ denied.*/);
          }
        });
      });

      it('fails with incorrect database credentials (2)', function() {
        const sequelize = new Sequelize('db', 'user', 'pass', {
          dialect: current.options.dialect
        });

        sequelize.define<ItestInstance, ItestAttribute>('Project', {title: new DataTypes.STRING()});
        sequelize.define<ItestInstance, ItestAttribute>('Task', {title: new DataTypes.STRING()});

        return sequelize.sync({force: true}).catch(err => {
          expect(err).to.be.ok;
        });
      });

      it('fails with incorrect database credentials (3)', function() {
        const sequelize = new Sequelize('db', 'user', 'pass', {
          dialect: current.options.dialect,
          port: 99999
        });

        sequelize.define<ItestInstance, ItestAttribute>('Project', {title: new DataTypes.STRING()});
        sequelize.define<ItestInstance, ItestAttribute>('Task', {title: new DataTypes.STRING()});

        return sequelize.sync({force: true}).catch(err => {
          expect(err).to.be.ok;
        });
      });

      it('fails with incorrect database credentials (4)', function() {
        const sequelize = new Sequelize('db', 'user', 'pass', {
          dialect: current.options.dialect,
          port: 99999,
          pool: {}
        });

        sequelize.define<ItestInstance, ItestAttribute>('Project', {title: new DataTypes.STRING()});
        sequelize.define<ItestInstance, ItestAttribute>('Task', {title: new DataTypes.STRING()});

        return sequelize.sync({force: true}).catch(err => {
          expect(err).to.be.ok;
        });
      });

      it('returns an error correctly if unable to sync a foreign key referenced model', function() {
        current.define<ItestInstance, ItestAttribute>('Application', {
          authorID: { type: new DataTypes.BIGINT(), allowNull: false, references: { model: 'User', key: 'id' } }
        });

        return current.sync().catch(error => {
          assert.ok(error);
        });
      });

      it('handles self dependant foreign key constraints', function() {
        const block = current.define<ItestInstance, ItestAttribute>('block', {
          id: { type: new DataTypes.INTEGER(), primaryKey: true },
          name: new DataTypes.STRING()
        }, {
          tableName: 'block',
          timestamps: false,
          paranoid: false
        });

        block.hasMany(block, {
          as: 'childBlocks',
          foreignKey: 'parent',
          joinTableName: 'link_block_block',
          useJunctionTable: true,
          foreignKeyConstraint: true
        });
        block.belongsTo(block, {
          as: 'parentBlocks',
          foreignKey: 'child',
          joinTableName: 'link_block_block',
          useJunctionTable: true,
          foreignKeyConstraint: true
        });

        return current.sync();
      });

      it('return the sequelize instance after syncing', function() {
        return current.sync().then(sequelize => {
          expect(sequelize).to.deep.equal(sequelize);
        });
      });

      it('return the single dao after syncing', function() {
        const block = current.define<ItestInstance, ItestAttribute>('block', {
          id: { type: new DataTypes.INTEGER(), primaryKey: true },
          name: new DataTypes.STRING()
        }, {
          tableName: 'block',
          timestamps: false,
          paranoid: false
        });

        return block.sync().then(result => {
          expect(result).to.deep.equal(block);
        });
      });
    }

    describe("doesn't emit logging when explicitly saying not to", () => {
      afterEach(function() {
        current.options.logging = false;
      });

      beforeEach(function() {
        this.spy = sinon.spy();
        current.options.logging = function() { this.spy(); };
        User = current.define<ItestInstance, ItestAttribute>('UserTest', { username: new DataTypes.STRING() });
      });

      it('through Sequelize.sync()', function() {
        this.spy.resetHistory();
        return current.sync({ force: true, logging: false }).then(() => {
          expect(this.spy.notCalled).to.be.true;
        });
      });

      it('through DAOFactory.sync()', function() {
        this.spy.resetHistory();
        return User.sync({ force: true, logging: false }).then(() => {
          expect(this.spy.notCalled).to.be.true;
        });
      });
    });

    describe('match', () => {
      it('will return an error not matching', function() {
        expect(
          current.sync({
            force: true,
            match: /alibabaizshaek/
          })
        ).to.be.rejected;
      });
    });
  });

  describe('drop should work', () => {
    it('correctly succeeds', function() {
      User = current.define<ItestInstance, ItestAttribute>('Users', {username: new DataTypes.STRING() });
      return User.sync({ force: true }).then(() => {
        return User.drop();
      });
    });
  });

  describe('import', () => {
    it('imports a dao definition from a file absolute path', function() {
      const Project = current.import(__dirname + '/assets/project');
      expect(Project).to.exist;
    });

    it('imports a dao definition with a default export', function() {
      const Project = current.import(__dirname + '/assets/es6project');
      expect(Project).to.exist;
    });

    it('imports a dao definition from a function', function() {
      const Project = current.import('Project', (sequelize, _DataTypes) => {
        return (sequelize as Sequelize).define<ItestInstance, ItestAttribute>('Project' + Math.floor(Math.random() * 9999999999999999), {
          name: new _DataTypes.STRING()
        });
      });

      expect(Project).to.exist;
    });
  });

  describe('define', () => {
    [
      { type: new DataTypes.ENUM(), values: ['scheduled', 'active', 'finished']},
      new DataTypes.ENUM('scheduled', 'active', 'finished'),
    ].forEach(status => {
      describe('enum', () => {
        beforeEach(function() {
          current = Support.createSequelizeInstance({
            typeValidation: true
          });

          Review = current.define<ItestInstance, ItestAttribute>('review', { status });
          return Review.sync({ force: true });
        });

        it('raises an error if no values are defined', function() {
          expect(() => {
            current.define<ItestInstance, ItestAttribute>('omnomnom', {
              bla: { type: new DataTypes.ENUM() }
            });
          }).to.throw(Error, 'Values for ENUM have not been defined.');
        });

        it('correctly stores values', function() {
          return Review.create({ status: 'active' }).then(review => {
            expect(review.status).to.equal('active');
          });
        });

        it('correctly loads values', function() {
          return Review.create({ status: 'active' }).then(() => {
            return Review.findAll().then(reviews => {
              expect(reviews[0].status).to.equal('active');
            });
          });
        });

        it("doesn't save an instance if value is not in the range of enums", function() {
          return Review.create({status: 'fnord'}).catch(err => {
            expect(err).to.be.instanceOf(Error);
            expect(err.message).to.equal('"fnord" is not a valid choice in ["scheduled","active","finished"]');
          });
        });
      });
    });

    describe('table', () => {
      [
        { id: { type: DataTypes.BIGINT, primaryKey: true } },
        { id: { type: DataTypes.STRING, allowNull: true, primaryKey: true } },
        { id: { type: DataTypes.BIGINT, allowNull: false, primaryKey: true, autoIncrement: true } },
      ].forEach(customAttributes => {

        it('should be able to override options on the default attributes', function() {
          const Picture = current.define<ItestInstance, ItestAttribute>('picture', _.cloneDeep(customAttributes));
          return Picture.sync({ force: true }).then(() => {
            Object.keys(customAttributes).forEach(attribute => {
              Object.keys(customAttributes[attribute]).forEach(option => {
                const optionValue = customAttributes[attribute][option];
                if (typeof optionValue === 'function' && new optionValue() instanceof DataTypes.ABSTRACT) {
                  expect(Picture.rawAttributes[attribute][option] instanceof optionValue).to.be.ok;
                } else {
                  expect(Picture.rawAttributes[attribute][option]).to.be.equal(optionValue);
                }
              });
            });
          });
        });

      });
    });

    if (current.dialect.supports.transactions) {
      describe('transaction', () => {
        beforeEach(function() {
          return Support.prepareTransactionTest(current).bind({}).then(sequelize => {
            sequelizeWithTransaction = sequelize;
          });
        });

        it('is a transaction method available', () => {
          expect(Support.sequelize).to.respondTo('transaction');
        });

        it('passes a transaction object to the callback', function() {
          return sequelizeWithTransaction.transaction().then(_t => {
            expect(_t).to.be.instanceOf(Transaction);
            return _t.commit();
          });
        });

        it('allows me to define a callback on the result', function() {
          return sequelizeWithTransaction.transaction().then(_t => {
            return _t.commit();
          });
        });

        if (dialect === 'sqlite') {
          it('correctly scopes transaction from other connections', function() {
            const TransactionTest = sequelizeWithTransaction.define<ItestInstance, ItestAttribute>('TransactionTest', { name: new DataTypes.STRING() }, { timestamps: false });

            const count = function(_transaction = null) {
              const sql = sequelizeWithTransaction.getQueryInterface().QueryGenerator.selectQuery('TransactionTests', { attributes: [['count(*)', 'cnt']] });

              return sequelizeWithTransaction.query(sql, { plain: true, transaction : _transaction }).then(result => {
                return result.cnt;
              });
            };

            return TransactionTest.sync({ force: true }).bind(this).then(() => {
              return sequelizeWithTransaction.transaction();
            }).then(function(_t1) {
              t1 = _t1;
              return sequelizeWithTransaction.query('INSERT INTO ' + qq('TransactionTests') + ' (' + qq('name') + ') VALUES (\'foo\');', { transaction: t1 });
            }).then(() => {
              return expect(count()).to.eventually.equal(0);
            }).then(function() {
              return expect(count(t1)).to.eventually.equal(1);
            }).then(function() {
              return t1.commit();
            }).then(() => {
              return expect(count()).to.eventually.equal(1);
            });
          });
        } else {
          it('correctly handles multiple transactions', function() {
            const TransactionTest = sequelizeWithTransaction.define<ItestInstance, ItestAttribute>('TransactionTest', { name: new DataTypes.STRING() }, { timestamps: false });

            const count = function(_transaction = null) {
              const sql = sequelizeWithTransaction.getQueryInterface().QueryGenerator.selectQuery('TransactionTests', { attributes: [['count(*)', 'cnt']] });

              return sequelizeWithTransaction.query(sql, { plain: true, transaction : _transaction }).then(result => {
                return parseInt(result.cnt, 10);
              });
            };

            return TransactionTest.sync({ force: true }).bind(this).then(() => {
              return sequelizeWithTransaction.transaction();
            }).then(function(_t1) {
              t1 = _t1;
              return sequelizeWithTransaction.query('INSERT INTO ' + qq('TransactionTests') + ' (' + qq('name') + ') VALUES (\'foo\');', { transaction: t1 });
            }).then(() => {
              return sequelizeWithTransaction.transaction();
            }).then(function(_t2) {
              t2 = _t2;
              return sequelizeWithTransaction.query('INSERT INTO ' + qq('TransactionTests') + ' (' + qq('name') + ') VALUES (\'bar\');', { transaction: t2 });
            }).then(() => {
              return expect(count()).to.eventually.equal(0);
            }).then(function() {
              return expect(count(t1)).to.eventually.equal(1);
            }).then(function() {
              return expect(count(t2)).to.eventually.equal(1);
            }).then(function() {

              return t2.rollback();
            }).then(() => {
              return expect(count()).to.eventually.equal(0);
            }).then(function() {
              return t1.commit();
            }).then(() => {
              return expect(count()).to.eventually.equal(1);
            });
          });
        }

        it('supports nested transactions using savepoints', function() {
          User = sequelizeWithTransaction.define<ItestInstance, ItestAttribute>('Users', { username: new DataTypes.STRING() });

          return User.sync({ force: true }).then(() => {
            return sequelizeWithTransaction.transaction().then(_t1 => {
              return User.create({ username: 'foo' }, { transaction: _t1 }).then(user => {
                return sequelizeWithTransaction.transaction({ transaction: _t1 }).then(_t2 => {
                  return user.updateAttributes({ username: 'bar' }, { transaction: _t2 }).then(() => {
                    return _t2.commit().then(() => {
                      return user.reload({ transaction: _t1 }).then(newUser => {
                        expect(newUser.username).to.equal('bar');
                        return _t1.commit();
                      });
                    });
                  });
                });
              });
            });
          });
        });

        describe('supports rolling back to savepoints', () => {
          beforeEach(function() {
            User = sequelizeWithTransaction.define<ItestInstance, ItestAttribute>('user', {});
            return sequelizeWithTransaction.sync({ force: true });
          });

          it('rolls back to the first savepoint, undoing everything', function() {
            return sequelizeWithTransaction.transaction().bind(this).then(function(_transaction) {
              transaction = _transaction;

              return sequelizeWithTransaction.transaction({ transaction });
            }).then(function(_sp1) {
              sp1 = _sp1;
              return User.create({}, { transaction });
            }).then(function() {
              return sequelizeWithTransaction.transaction({ transaction });
            }).then(function(_sp2) {
              sp2 = _sp2;
              return User.create({}, { transaction });
            }).then(function() {
              return User.findAll({ transaction });
            }).then(function(users) {
              expect(users).to.have.length(2);

              return sp1.rollback();
            }).then(function() {
              return User.findAll({ transaction });
            }).then(function(users) {
              expect(users).to.have.length(0);

              return transaction.rollback();
            });
          });

          it('rolls back to the most recent savepoint, only undoing recent changes', function() {
            return sequelizeWithTransaction.transaction().bind(this).then(function(_transaction) {
              transaction = _transaction;

              return sequelizeWithTransaction.transaction({ transaction });
            }).then(function(_sp1) {
              sp1 = _sp1;
              return User.create({}, { transaction });
            }).then(function() {
              return sequelizeWithTransaction.transaction({ transaction });
            }).then(function(_sp2) {
              sp2 = _sp2;
              return User.create({}, { transaction });
            }).then(function() {
              return User.findAll({ transaction });
            }).then(function(users) {
              expect(users).to.have.length(2);

              return sp2.rollback();
            }).then(function() {
              return User.findAll({ transaction });
            }).then(function(users) {
              expect(users).to.have.length(1);

              return transaction.rollback();
            });
          });
        });

        it('supports rolling back a nested transaction', function() {
          User = sequelizeWithTransaction.define<ItestInstance, ItestAttribute>('Users', { username: new DataTypes.STRING() });

          return User.sync({ force: true }).then(() => {
            return sequelizeWithTransaction.transaction().then(_t1 => {
              return User.create({ username: 'foo' }, { transaction: _t1 }).then(user => {
                return sequelizeWithTransaction.transaction({ transaction: _t1 }).then(_t2 => {
                  return user.updateAttributes({ username: 'bar' }, { transaction: _t2 }).then(() => {
                    return _t2.rollback().then(() => {
                      return user.reload({ transaction: _t1 }).then(newUser => {
                        expect(newUser.username).to.equal('foo');
                        return _t1.commit();
                      });
                    });
                  });
                });
              });
            });
          });
        });

        it('supports rolling back outermost transaction', function() {
          User = sequelizeWithTransaction.define<ItestInstance, ItestAttribute>('Users', { username: new DataTypes.STRING() });

          return User.sync({ force: true }).then(() => {
            return sequelizeWithTransaction.transaction().then(_t1 => {
              return User.create({ username: 'foo' }, { transaction: _t1 }).then(user => {
                return sequelizeWithTransaction.transaction({ transaction: _t1 }).then(_t2 => {
                  return user.updateAttributes({ username: 'bar' }, { transaction: _t2 }).then(() => {
                    return _t1.rollback().then(() => {
                      return User.findAll().then(users => {
                        expect(users.length).to.equal(0);
                      });
                    });
                  });
                });
              });
            });
          });
        });
      });
    }
  });

  describe('databaseVersion', () => {
    it('should database/dialect version', function() {
      return current.databaseVersion().then(version => {
        expect(typeof version).to.equal('string');
        expect(version).to.be.ok;
      });
    });
  });

  describe('paranoid deletedAt non-null default value', () => {
    it('should use defaultValue of deletedAt in paranoid clause and restore', function() {
      const epochObj = new Date(0);
      const epoch = Number(epochObj);
      User = current.define<ItestInstance, ItestAttribute>('user', {
        username: new DataTypes.STRING(),
        deletedAt: {
          type: new DataTypes.DATE(),
          defaultValue: epochObj
        }
      }, {
        paranoid: true
      });

      return current.sync({force: true}).bind(this).then(() => {
        return User.create({username: 'user1'}).then(user => {
          expect(Number(user.deletedAt)).to.equal(epoch);
          return User.findOne({
            where: {
              username: 'user1'
            }
          }).then(_user => {
            expect(_user).to.exist;
            expect(Number(_user.deletedAt)).to.equal(epoch);
            return _user.destroy();
          }).then(destroyedUser => {
            expect(destroyedUser.deletedAt).to.exist;
            expect(Number(destroyedUser.deletedAt)).not.to.equal(epoch);
            return User.findById(destroyedUser.id, { paranoid: false });
          }).then(fetchedDestroyedUser => {
            expect(fetchedDestroyedUser.deletedAt).to.exist;
            expect(Number(fetchedDestroyedUser.deletedAt)).not.to.equal(epoch);
            return fetchedDestroyedUser.restore();
          }).then(restoredUser => {
            expect(Number(restoredUser.deletedAt)).to.equal(epoch);
            return User.destroy({where: {
              username: 'user1'
            }});
          }).then(() => {
            return User.count();
          }).then(count => {
            expect(count).to.equal(0);
            return User.restore();
          }).then(() => {
            return User.findAll();
          }).then(nonDeletedUsers => {
            expect(nonDeletedUsers.length).to.equal(1);
            nonDeletedUsers.forEach(u => {
              expect(Number(u.deletedAt)).to.equal(epoch);
            });
          });
        });
      });
    });
  });
});
