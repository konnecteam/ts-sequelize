'use strict';

import * as chai from 'chai';
import * as _ from 'lodash';
import * as moment from 'moment';
import * as types from 'pg-types';
import * as semver from 'semver';
import * as sinon from 'sinon';
import * as uuid from 'uuid';
import {Sequelize} from '../../index';
import DataTypes from '../../lib/data-types';
import Support from './support';
const expect = chai.expect;
const current = Support.sequelize;
const dialect = Support.getTestDialect();

describe(Support.getTestDialectTeaser('DataTypes'), () => {
  afterEach(function() {
    // Restore some sanity by resetting all parsers
    switch (dialect) {
      case 'postgres':

        Object.keys(DataTypes).forEach(key => {
          const dataType = DataTypes[key];
          if (dataType.types && dataType.types.postgres) {
            dataType.types.postgres.oids.forEach(oid => {
              types.setTypeParser(oid, _.identity);
            });
          }
        });

        require('pg-types/lib/binaryParsers').init((oid, converter) => {
          types.setTypeParser(oid, 'binary', converter);
        });
        require('pg-types/lib/textParsers').init((oid, converter) => {
          types.setTypeParser(oid, 'text', converter);
        });
        break;
      default:
        this.sequelize.connectionManager._clearTypeParser();
    }

    this.sequelize.connectionManager.refreshTypeParser(DataTypes[dialect]); // Reload custom parsers
  });

  it('allows me to return values from a custom parse function', () => {

    const parse = (DataTypes.DATE as any).parse = sinon.spy(value => {
      return moment(value, 'YYYY-MM-DD HH:mm:ss');
    });

    const stringify = DataTypes.DATE.prototype.stringify = sinon.spy(function(value, options) {
      if (!moment.isMoment(value)) {
        value = this._applyTimezone(value, options);
      }

      if (dialect === 'oracle') {
        return `TO_TIMESTAMP('${value.format('YYYY-MM-DD HH:mm:ss')}','YYYY-MM-DD HH24:MI:SS.FFTZH')`;
      }
      return value.format('YYYY-MM-DD HH:mm:ss');
    });

    current.refreshTypes();

    const User = current.define('user', {
      dateField: new DataTypes.DATE()
    }, {
      timestamps: false
    });

    return current.sync({ force: true }).then(() => {
      return User.create({
        dateField: moment('2011 10 31', 'YYYY MM DD')
      });
    }).then(() => {
      return User.findAll().get(0);
    }).then(user => {
      expect(parse).to.have.been.called;
      expect(stringify).to.have.been.called;

      expect(moment.isMoment(user.dateField)).to.be.ok;

      delete (DataTypes.DATE as any).parse;
    });
  });


  const testSuccess = function(Type, value, shouldPass = true) {
    const parse = Type.constructor.parse = sinon.spy(_value => {
      return _value;
    });

    const stringify = Type.constructor.prototype.stringify = sinon.spy(function() {
      return DataTypes.ABSTRACT.prototype.stringify.apply(this, arguments);
    });

    const User = current.define('user', {
      field: Type
    }, {
      timestamps: false
    });

    return current.sync({ force: true }).then(() => {

      current.refreshTypes();

      return User.create({
        field: value
      });
    }).then(() => {
      return User.findAll().get(0);
    }).then(() => {
      //Specific for Oracle BLOB management; we can't pass here
      if (shouldPass) {
        expect(parse).to.have.been.called;
        expect(stringify).to.have.been.called;
      }

      delete Type.constructor.parse;
      delete Type.constructor.prototype.stringify;
    });
  };

  const testFailure = function(Type) {
    Type.constructor.parse = _.noop();

    expect(() => {
      current.refreshTypes();
    }).to.throw('Parse function not supported for type ' + Type.key + ' in dialect ' + dialect);

    delete Type.constructor.parse;
  };

  if (current.dialect.supports.JSON) {
    it('calls parse and stringify for JSON', () => {
      const Type = new DataTypes.JSON();

      return testSuccess(Type, { test: 42, nested: { foo: 'bar' }});
    });
  }

  if (current.dialect.supports.JSONB) {
    it('calls parse and stringify for JSONB', () => {
      const Type = new DataTypes.JSONB();

      return testSuccess(Type, { test: 42, nested: { foo: 'bar' }});
    });
  }

  if (current.dialect.supports.HSTORE) {
    it('calls parse and stringify for HSTORE', () => {
      const Type = new DataTypes.HSTORE();

      return testSuccess(Type, { test: 42, nested: false });
    });
  }

  if (current.dialect.supports.RANGE) {
    it('calls parse and stringify for RANGE', () => {
      const Type = new DataTypes.RANGE(new DataTypes.INTEGER());

      return testSuccess(Type, [1, 2]);
    });
  }

  it('calls parse and stringify for DATE', () => {
    const Type = new DataTypes.DATE();

    return testSuccess(Type, new Date());
  });

  it('calls parse and stringify for DATEONLY', () => {
    const Type = new DataTypes.DATEONLY();

    return testSuccess(Type, moment(new Date()).format('YYYY-MM-DD'));
  });

  it('calls parse and stringify for TIME', () => {
    const Type = new DataTypes.TIME();

    return testSuccess(Type, new Date());
  });

  it('calls parse and stringify for BLOB', () => {
    const Type = new DataTypes.BLOB();

    return testSuccess(Type, 'foobar', false);
  });

  it('calls parse and stringify for CHAR', () => {
    const Type = new DataTypes.CHAR();

    return testSuccess(Type, 'foobar');
  });

  it('calls parse and stringify for BLOB', () => {
    const Type = new DataTypes.BLOB();

    return testSuccess(Type, 'foobar', false);
  });

  it('calls parse and stringify for STRING', () => {
    const Type = new DataTypes.STRING();

    return testSuccess(Type, 'foobar');
  });

  it('calls parse and stringify for TEXT', () => {
    const Type = new DataTypes.TEXT();

    if (dialect === 'mssql' || dialect === 'oracle') {
      // Text uses nvarchar, same type as string
      testFailure(Type);
    } else {
      return testSuccess(Type, 'foobar');
    }
  });

  it('calls parse and stringify for BOOLEAN', () => {
    const Type = new DataTypes.BOOLEAN();

    return testSuccess(Type, true);
  });

  it('calls parse and stringify for INTEGER', () => {
    const Type = new DataTypes.STRING();

    return testSuccess(Type, 1);
  });

  it('calls parse and stringify for DECIMAL', () => {
    const Type = new DataTypes.DECIMAL();

    if (dialect === 'oracle') {
      //Oracle does not support decimal, mapping to number
      testFailure(Type);
    } else {
      return testSuccess(Type, 1.5);
    }
  });

  it('calls parse and stringify for BIGINT', () => {
    const Type = new DataTypes.BIGINT();

    if (dialect === 'mssql' || dialect === 'oracle') {
      // Same type as integer
      testFailure(Type);
    } else {
      return testSuccess(Type, 1);
    }
  });

  it('calls parse and stringify for DOUBLE', () => {
    const Type = new DataTypes.DOUBLE();

    if (dialect === 'oracle') {
      // Oracle doesn't have float, maps to either number
      testFailure(Type);
    } else {
      return testSuccess(Type, 1.5);
    }
  });

  it('calls parse and stringify for FLOAT', () => {
    const Type = new DataTypes.FLOAT();

    if (dialect === 'postgres' || dialect === 'oracle') {
      // Postgres doesn't have float, maps to either decimal or double
      testFailure(Type);
    } else {
      return testSuccess(Type, 1.5);
    }
  });

  it('calls parse and stringify for REAL', () => {
    const Type = new DataTypes.REAL();

    if (dialect === 'oracle') {
      // Oracle doesn't have float, maps to either decimal or double
      testFailure(Type);
    } else {
      return testSuccess(Type, 1.5);
    }
  });

  it('calls parse and stringify for UUID', () => {
    const Type = new DataTypes.UUID();

    // there is no dialect.supports.UUID yet
    if (['postgres', 'sqlite'].indexOf(dialect) !== -1) {
      return testSuccess(Type, uuid.v4());
    } else {
      // No native uuid type
      testFailure(Type);
    }
  });

  it('calls parse and stringify for ENUM', () => {
    const Type = new (DataTypes as any).ENUM('hat', 'cat');

    if (['postgres'].indexOf(dialect) !== -1) {
      return testSuccess(Type, 'hat');
    } else {
      testFailure(Type);
    }
  });

  if (current.dialect.supports.GEOMETRY) {
    it('calls parse and stringify for GEOMETRY', () => {
      const Type = new DataTypes.GEOMETRY();

      return testSuccess(Type, { type: 'Point', coordinates: [125.6, 10.1] });
    });

    it('should parse an empty GEOMETRY field', () => {
      const Type = new DataTypes.GEOMETRY();

      // MySQL 5.7 or above doesn't support POINT EMPTY
      if (dialect === 'mysql' && semver.gte(current.options.databaseVersion, '5.7.0')) {
        return;
      }

      return new Sequelize.Promise((resolve, reject) => {
        if (/^postgres/.test(dialect)) {
          current.query('SELECT PostGIS_Lib_Version();')
            .then(result => {
              if (result[0][0] && semver.lte(result[0][0].postgis_lib_version, '2.1.7')) {
                resolve(true);
              } else {
                resolve();
              }
            }).catch(reject);
        } else {
          resolve(true);
        }
      }).then(runTests => {
        if (current.dialect.supports.GEOMETRY && runTests) {
          current.refreshTypes();

          const User = current.define('user', { field: Type }, { timestamps: false });
          const point = { type: 'Point', coordinates: [] };

          return current.sync({ force: true }).then(() => {
            return User.create({
              //insert a empty GEOMETRY type
              field: point
            });
          }).then(() => {
            //This case throw unhandled exception
            return User.findAll();
          }).then(users => {
            if (dialect === 'mysql') {
              // MySQL will return NULL, becuase they lack EMPTY geometry data support.
              expect(users[0].field).to.be.eql(null);
            } else if (dialect === 'postgres' || dialect === 'postgres-native') {
              //Empty Geometry data [0,0] as per https://trac.osgeo.org/postgis/ticket/1996
              expect(users[0].field).to.be.deep.equal({ type: 'Point', coordinates: [0, 0] });
            } else {
              expect(users[0].field).to.be.deep.equal(point);
            }
          });
        }
      });
    });

    it('should parse null GEOMETRY field', () => {
      const Type = new DataTypes.GEOMETRY();

      current.refreshTypes();

      const User = current.define('user', { field: Type }, { timestamps: false });
      const point = null;

      return current.sync({ force: true }).then(() => {
        return User.create({
          // insert a null GEOMETRY type
          field: point
        });
      }).then(() => {
        //This case throw unhandled exception
        return User.findAll();
      }).then(users => {
        expect(users[0].field).to.be.eql(null);
      });
    });
  }

  if (dialect === 'postgres' || dialect === 'sqlite') {
    // postgres actively supports IEEE floating point literals, and sqlite doesn't care what we throw at it
    it('should store and parse IEEE floating point literals (NaN and Infinity)', function() {
      const Model = this.sequelize.define('model', {
        float: new DataTypes.FLOAT(),
        double: new DataTypes.DOUBLE(),
        real: new DataTypes.REAL()
      });

      return Model.sync({ force: true }).then(() => {
        return Model.create({
          id: 1,
          float: NaN,
          double: Infinity,
          real: -Infinity
        });
      }).then(() => {
        return Model.find({ where: { id: 1 } });
      }).then(user => {
        expect(user.get('float')).to.be.NaN;
        expect(user.get('double')).to.eq(Infinity);
        expect(user.get('real')).to.eq(-Infinity);
      });
    });
  }

  if (dialect === 'postgres' || dialect === 'mysql') {
    it('should parse DECIMAL as string', function() {
      const Model = this.sequelize.define('model', {
        decimal: new DataTypes.DECIMAL(),
        decimalPre: new DataTypes.DECIMAL(10, 4),
        decimalWithParser: new DataTypes.DECIMAL(32, 15),
        decimalWithIntParser: new DataTypes.DECIMAL(10, 4),
        decimalWithFloatParser: new DataTypes.DECIMAL(10, 8)
      });

      const sampleData = {
        id: 1,
        decimal: 12345678.12345678,
        decimalPre: 123456.1234,
        decimalWithParser: '12345678123456781.123456781234567',
        decimalWithIntParser: 1.234,
        decimalWithFloatParser: 0.12345678
      };

      return Model.sync({ force: true }).then(() => {
        return Model.create(sampleData);
      }).then(() => {
        return Model.findById(1);
      }).then(user => {
        /**
         * MYSQL default precision is 10 and scale is 0
         * Thus test case below will return number without any fraction values
         */
        if (dialect === 'mysql') {
          expect(user.get('decimal')).to.be.eql('12345678');
        } else {
          expect(user.get('decimal')).to.be.eql('12345678.12345678');
        }

        expect(user.get('decimalPre')).to.be.eql('123456.1234');
        expect(user.get('decimalWithParser')).to.be.eql('12345678123456781.123456781234567');
        expect(user.get('decimalWithIntParser')).to.be.eql('1.2340');
        expect(user.get('decimalWithFloatParser')).to.be.eql('0.12345678');
      });
    });

    it('should parse BIGINT as string', function() {
      const Model = this.sequelize.define('model', {
        jewelPurity: new DataTypes.BIGINT()
      });

      const sampleData = {
        id: 1,
        jewelPurity: '9223372036854775807'
      };

      return Model.sync({ force: true }).then(() => {
        return Model.create(sampleData);
      }).then(() => {
        return Model.findById(1);
      }).then(user => {
        expect(user.get('jewelPurity')).to.be.eql(sampleData.jewelPurity);
        expect(user.get('jewelPurity')).to.be.string;
      });
    });
  }

  if (dialect === 'postgres') {
    it('should return Int4 range properly #5747', function() {
      const Model = this.sequelize.define('M', {
        interval: {
          type: new DataTypes.RANGE(new DataTypes.INTEGER()),
          allowNull: false,
          unique: true
        }
      });

      return Model.sync({ force: true })
        .then(() => Model.create({ interval: [1, 4] }) )
        .then(() => Model.findAll() )
        .spread(m => {
          expect(m.interval[0]).to.be.eql(1);
          expect(m.interval[1]).to.be.eql(4);
        });
    });
  }

  it('should allow spaces in ENUM', function() {
    const Model = this.sequelize.define('user', {
      name: new DataTypes.STRING(),
      type: new DataTypes.ENUM(['action', 'mecha', 'canon', 'class s'])
    });

    return Model.sync({ force: true }).then(() => {
      return Model.create({ name: 'sakura', type: 'class s' });
    }).then(record => {
      expect(record.type).to.be.eql('class s');
    });
  });

  it('should return YYYY-MM-DD format string for DATEONLY', function() {
    const Model = this.sequelize.define('user', {
      stamp: new DataTypes.DATEONLY()
    });
    const testDate = moment().format('YYYY-MM-DD');
    const newDate = new Date();

    return Model.sync({ force: true})
      .then(() => Model.create({ stamp: testDate }))
      .then(record => {
        expect(typeof record.stamp).to.be.eql('string');
        expect(record.stamp).to.be.eql(testDate);

        return Model.findById(record.id);
      }).then(record => {
        expect(typeof record.stamp).to.be.eql('string');
        expect(record.stamp).to.be.eql(testDate);

        return record.update({
          stamp: testDate
        });
      }).then(record => {
        return record.reload();
      }).then(record => {
        expect(typeof record.stamp).to.be.eql('string');
        expect(record.stamp).to.be.eql(testDate);

        return record.update({
          stamp: newDate
        });
      }).then(record => {
        return record.reload();
      }).then(record => {
        expect(typeof record.stamp).to.be.eql('string');
        expect(new Date(record.stamp)).to.equalDate(newDate);
      });
  });

  it('should return set DATEONLY field to NULL correctly', function() {
    const Model = this.sequelize.define('user', {
      stamp: new DataTypes.DATEONLY()
    });
    const testDate = moment().format('YYYY-MM-DD');

    return Model.sync({ force: true})
      .then(() => Model.create({ stamp: testDate }))
      .then(record => {
        expect(typeof record.stamp).to.be.eql('string');
        expect(record.stamp).to.be.eql(testDate);

        return Model.findById(record.id);
      }).then(record => {
        expect(typeof record.stamp).to.be.eql('string');
        expect(record.stamp).to.be.eql(testDate);

        return record.update({
          stamp: null
        });
      }).then(record => {
        return record.reload();
      }).then(record => {
        expect(record.stamp).to.be.eql(null);
      });
  });

  it('should be able to cast buffer as boolean', function() {
    const ByteModel = this.sequelize.define('Model', {
      byteToBool: this.sequelize.Sequelize.BLOB
    }, {
      timestamps: false
    });

    const BoolModel = this.sequelize.define('Model', {
      byteToBool: this.sequelize.Sequelize.BOOLEAN
    }, {
      timestamps: false
    });

    return ByteModel.sync({
      force: true
    }).then(() => {
      return ByteModel.create({
        byteToBool: new Buffer([true])
      });
    }).then(byte => {
      expect(byte.byteToBool).to.be.ok;

      return BoolModel.findById(byte.id);
    }).then(bool => {
      if (dialect === 'oracle') {
        //BLOB in Oracle needs to be read
        bool.byteToBool.read(content => {
          expect(content).to.be.true;
        });
      } else {
        expect(bool.byteToBool).to.be.true;
      }
    });
  });
});
