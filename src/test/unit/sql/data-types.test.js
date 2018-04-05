'use strict';

const Support   = require(__dirname + '/../support');
const DataTypes = require(__dirname + '/../../../lib/data-types');
const Sequelize = Support.Sequelize;
const chai = require('chai');
const uuid = require('uuid');
const expectsql = Support.expectsql;
const current   = Support.sequelize;
const expect = chai.expect;

// Notice: [] will be replaced by dialect specific tick/quote character when there is not dialect specific expectation but only a default expectation
describe('Data types', () => {
  describe('String', () => {

    it('String standard', () => {
      const result = current.normalizeDataType(DataTypes.STRING).toSql();

      expectsql(result, {
        default: 'VARCHAR(255)',
        oracle: 'NVARCHAR2(255)',
        mssql: 'NVARCHAR(255)'
      });
    });

    it('String length 1234', () => {
      const result = current.normalizeDataType(DataTypes.STRING(1234)).toSql();

      expectsql(result, {
        default: 'VARCHAR(1234)',
        oracle: 'NVARCHAR2(1234)',
        mssql: 'NVARCHAR(1234)'
      });
    });

    it('String { length: 1234 }', () => {
      const result = current.normalizeDataType(DataTypes.STRING({ length: 1234 })).toSql();

      expectsql(result, {
        default: 'VARCHAR(1234)',
        oracle: 'NVARCHAR2(1234)',
        mssql: 'NVARCHAR(1234)'
      });
    });

    it('String length 1234 bynary', () => {
      const result = current.normalizeDataType(DataTypes.STRING(1234).BINARY).toSql();

      expectsql(result, {
        default: 'VARCHAR(1234) BINARY',
        sqlite: 'VARCHAR BINARY(1234)',
        oracle: 'RAW(1234)',
        mssql: 'BINARY(1234)',
        postgres: 'BYTEA'
      });
    });

    it('String binary', () => {
      const result = current.normalizeDataType(DataTypes.STRING.BINARY).toSql();

      expectsql(result, {
        default: 'VARCHAR(255) BINARY',
        sqlite: 'VARCHAR BINARY(255)',
        oracle: 'RAW(255)',
        mssql: 'BINARY(255)',
        postgres: 'BYTEA'
      });
    });

    describe('validate String', () => {
      it('should return `true` if `value` is a string', () => {
        const type = DataTypes.STRING();

        expect(type.validate('foobar')).to.equal(true);
        expect(type.validate(new String('foobar'))).to.equal(true);
        expect(type.validate(12)).to.equal(true);
      });
    });

  });


  describe('Text', () => {

    it('Text standard', () => {
      const result = current.normalizeDataType(DataTypes.TEXT).toSql();

      expectsql(result, {
        default: 'TEXT',
        oracle: 'CLOB',
        mssql: 'NVARCHAR(MAX)' // in mssql text is actually representing a non unicode text field
      });
    });

    it('Text length tiny', () => {
      const result = current.normalizeDataType(DataTypes.TEXT('tiny')).toSql();

      expectsql(result, {
        default: 'TEXT',
        oracle: 'NVARCHAR2(256)',
        mssql: 'NVARCHAR(256)',
        mysql: 'TINYTEXT'
      });
    });

    it('Text { length: "tiny" }', () => {
      const result = current.normalizeDataType(DataTypes.TEXT({ length: 'tiny' })).toSql();

      expectsql(result, {
        default: 'TEXT',
        oracle: 'NVARCHAR2(256)',
        mssql: 'NVARCHAR(256)',
        mysql: 'TINYTEXT'
      });
    });

    it('Text medium', () => {
      const result = current.normalizeDataType(DataTypes.TEXT('medium')).toSql();

      expectsql(result, {
        default: 'TEXT',
        mssql: 'NVARCHAR(MAX)',
        oracle: 'NVARCHAR2(2000)',
        mysql: 'MEDIUMTEXT'
      });
    });

    it('Text long', () => {
      const result = current.normalizeDataType(DataTypes.TEXT('long')).toSql();

      expectsql(result, {
        default: 'TEXT',
        mssql: 'NVARCHAR(MAX)',
        oracle: 'NVARCHAR2(4000)',
        mysql: 'LONGTEXT'
      });
    });

    describe('validate Text', () => {
      it('should throw an error if `value` is invalid', () => {
        const type = DataTypes.TEXT();

        expect(() => {
          type.validate(12345);
        }).to.throw(Sequelize.ValidationError, '12345 is not a valid string');
      });
      it('should return `true` if `value` is a string', () => {
        const type = DataTypes.TEXT();

        expect(type.validate('foobar')).to.equal(true);
      });
    });
  });


  describe('Char', () => {

    it('Char standard', () => {
      const result = current.normalizeDataType(DataTypes.CHAR).toSql();

      expectsql(result, {
        default: 'CHAR(255)'
      });
    });

    it('Char length 12', () => {
      const result = current.normalizeDataType(DataTypes.CHAR(12)).toSql();

      expectsql(result, {
        default: 'CHAR(12)'
      });
    });

    it('Char { length: 12 }', () => {
      const result = current.normalizeDataType(DataTypes.CHAR({ length: 12 })).toSql();

      expectsql(result, {
        default: 'CHAR(12)'
      });
    });

    it('String length 12 bynary', () => {
      const result = current.normalizeDataType(DataTypes.CHAR(12).BINARY).toSql();

      expectsql(result, {
        default: 'CHAR(12) BINARY',
        sqlite: 'CHAR BINARY(12)',
        oracle: 'RAW(12)',
        postgres: 'BYTEA'
      });
    });

    it('Char binary', () => {
      const result = current.normalizeDataType(DataTypes.CHAR.BINARY).toSql();

      expectsql(result, {
        default: 'CHAR(255) BINARY',
        sqlite: 'CHAR BINARY(255)',
        oracle: 'RAW(255)',
        postgres: 'BYTEA'
      });
    });

  });

  describe('Boolean', () => {

    it('Boolean', () => {
      const result = current.normalizeDataType(DataTypes.BOOLEAN).toSql();

      expectsql(result, {
        postgres: 'BOOLEAN',
        mssql: 'BIT',
        oracle: 'NUMBER(1)',
        mysql: 'TINYINT(1)',
        sqlite: 'TINYINT(1)'
      });
    });

    describe('validate Boolean', () => {
      it('should throw an error if `value` is invalid', () => {
        const type = DataTypes.BOOLEAN();

        expect(() => {
          type.validate(12345);
        }).to.throw(Sequelize.ValidationError, '12345 is not a valid boolean');
      });
      it('should return `true` if `value` is a boolean', () => {
        const type = DataTypes.BOOLEAN();

        expect(type.validate(true)).to.equal(true);
        expect(type.validate(false)).to.equal(true);
        expect(type.validate('1')).to.equal(true);
        expect(type.validate('0')).to.equal(true);
        expect(type.validate('true')).to.equal(true);
        expect(type.validate('false')).to.equal(true);
      });
    });

  });


  describe('Date', () => {

    it('Date standart', () => {
      const result = current.normalizeDataType(DataTypes.DATE).toSql();

      expectsql(result, {
        postgres: 'TIMESTAMP WITH TIME ZONE',
        mssql: 'DATETIMEOFFSET',
        oracle: 'TIMESTAMP WITH LOCAL TIME ZONE',
        mysql: 'DATETIME',
        sqlite: 'DATETIME'
      });
    });

    it('Date(6)', () => {
      const result = current.normalizeDataType(DataTypes.DATE(6)).toSql();

      expectsql(result, {
        postgres: 'TIMESTAMP WITH TIME ZONE',
        mssql: 'DATETIMEOFFSET',
        oracle: 'TIMESTAMP WITH LOCAL TIME ZONE',
        mysql: 'DATETIME(6)',
        sqlite: 'DATETIME'
      });
    });

    describe('validate Date', () => {
      it('should throw an error if `value` is invalid', () => {
        const type = DataTypes.DATE();

        expect(() => {
          type.validate('foobar');
        }).to.throw(Sequelize.ValidationError, '"foobar" is not a valid date');
      });

      it('should return `true` if `value` is a date', () => {
        const type = DataTypes.DATE();

        expect(type.validate(new Date())).to.equal(true);
      });
    });

  });

  if (current.dialect.supports.HSTORE) {
    describe('Hstore', () => {
    
      describe('validate Hstore', () => {
        it('should throw an error if `value` is invalid', () => {
          const type = DataTypes.HSTORE();

          expect(() => {
            type.validate('foobar');
          }).to.throw(Sequelize.ValidationError, '"foobar" is not a valid hstore');
        });

        it('should return `true` if `value` is an hstore', () => {
          const type = DataTypes.HSTORE();

          expect(type.validate({ foo: 'bar' })).to.equal(true);
        });
      });
    
    });
  }

  describe('Uuid', () => {
    
    it('Uuid', () => {
      const result = current.normalizeDataType(DataTypes.UUID).toSql();

      expectsql(result, {
        postgres: 'UUID',
        mssql: 'CHAR(36)',
        oracle: 'NVARCHAR2(36)',
        mysql: 'CHAR(36) BINARY',
        sqlite: 'UUID'
      });
    });

    describe('validate Uuid', () => {
      it('should throw an error if `value` is invalid', () => {
        const type = DataTypes.UUID();

        expect(() => {
          type.validate('foobar');
        }).to.throw(Sequelize.ValidationError, '"foobar" is not a valid uuid');

        expect(() => {
          type.validate(['foobar']);
        }).to.throw(Sequelize.ValidationError, '["foobar"] is not a valid uuid');
      });

      it('should return `true` if `value` is an uuid', () => {
        const type = DataTypes.UUID();

        expect(type.validate(uuid.v4())).to.equal(true);
      });

      it('should return `true` if `value` is a string and we accept strings', () => {
        const type = DataTypes.UUID();

        expect(type.validate('foobar', { acceptStrings: true })).to.equal(true);
      });
    });

  });

  describe('Uuidv1', () => {
    
    it('Uuidv1', () => {
      const result = current.normalizeDataType(DataTypes.UUIDV1).toSql();

      expectsql(result, {
        default: 'UUIDV1'
      });
    });

    describe('validate Uuidv1', () => {
      it('should throw an error if `value` is invalid', () => {
        const type = DataTypes.UUIDV1();

        expect(() => {
          type.validate('foobar');
        }).to.throw(Sequelize.ValidationError, '"foobar" is not a valid uuid');

        expect(() => {
          type.validate(['foobar']);
        }).to.throw(Sequelize.ValidationError, '["foobar"] is not a valid uuid');
      });

      it('should return `true` if `value` is an uuid', () => {
        const type = DataTypes.UUIDV1();

        expect(type.validate(uuid.v1())).to.equal(true);
      });

      it('should return `true` if `value` is a string and we accept strings', () => {
        const type = DataTypes.UUIDV1();

        expect(type.validate('foobar', { acceptStrings: true })).to.equal(true);
      });
    });

  });

  describe('Uuidv4', () => {
    
    it('Uuidv4', () => {
      const result = current.normalizeDataType(DataTypes.UUIDV4).toSql();

      expectsql(result, {
        default: 'UUIDV4'
      });
    });

    describe('validate Uuidv4', () => {
      it('should throw an error if `value` is invalid', () => {
        const type = DataTypes.UUIDV4();
        const value = uuid.v1();

        expect(() => {
          type.validate(value);
        }).to.throw(Sequelize.ValidationError, `"${value}" is not a valid uuidv4`);

        expect(() => {
          type.validate(['foobar']);
        }).to.throw(Sequelize.ValidationError, '["foobar"] is not a valid uuidv4');
      });

      it('should return `true` if `value` is an uuid', () => {
        const type = DataTypes.UUIDV4();

        expect(type.validate(uuid.v4())).to.equal(true);
      });

      it('should return `true` if `value` is a string and we accept strings', () => {
        const type = DataTypes.UUIDV4();

        expect(type.validate('foobar', { acceptStrings: true })).to.equal(true);
      });
    });

  });

  describe('Now', () => {
    
    it('Now', () => {
      const result = current.normalizeDataType(DataTypes.NOW).toSql();

      expectsql(result, {
        default: 'NOW',
        postgres: 'CURRENT_DATE',
        oracle: 'CURRENT_TIMESTAMP',
        mssql: 'GETDATE()'
      });
    });
    
  });

  describe('Integer', () => {

    it('Integer standard', () => {
      const result = current.normalizeDataType(DataTypes.INTEGER).toSql();

      expectsql(result, {
        default: 'INTEGER'
      });
    });

    it('Integer unsigned', () => {
      const result = current.normalizeDataType(DataTypes.INTEGER.UNSIGNED).toSql();

      expectsql(result, {
        default: 'INTEGER UNSIGNED',
        postgres: 'INTEGER',
        oracle: 'INTEGER',
        mssql: 'INTEGER'
      });
    });

    it('Integer unsigned zerofill', () => {
      const result = current.normalizeDataType(DataTypes.INTEGER.UNSIGNED.ZEROFILL).toSql();

      expectsql(result, {
        default: 'INTEGER UNSIGNED ZEROFILL',
        postgres: 'INTEGER',
        oracle: 'INTEGER',
        mssql: 'INTEGER'
      });
    });

    it('Integer length 11', () => {
      const result = current.normalizeDataType(DataTypes.INTEGER(11)).toSql();

      expectsql(result, {
        default: 'INTEGER(11)',
        postgres: 'INTEGER',
        oracle: 'INTEGER',
        mssql: 'INTEGER'
      });
    });

    it('Integer { length: 11 }', () => {
      const result = current.normalizeDataType(DataTypes.INTEGER({ length: 11 })).toSql();

      expectsql(result, {
        default: 'INTEGER(11)',
        postgres: 'INTEGER',
        oracle: 'INTEGER',
        mssql: 'INTEGER'
      });
    });

    it('Integer length 11 unsigned', () => {
      const result = current.normalizeDataType(DataTypes.INTEGER(11).UNSIGNED).toSql();

      expectsql(result, {
        default: 'INTEGER(11) UNSIGNED',
        sqlite: 'INTEGER UNSIGNED(11)',
        oracle: 'INTEGER(11)',
        postgres: 'INTEGER',
        mssql: 'INTEGER'
      });
    });

    it('Integer length 11 unsigned zerofill', () => {
      const result = current.normalizeDataType(DataTypes.INTEGER(11).UNSIGNED.ZEROFILL).toSql();

      expectsql(result, {
        default: 'INTEGER(11) UNSIGNED ZEROFILL',
        sqlite: 'INTEGER UNSIGNED ZEROFILL(11)',
        oracle: 'INTEGER(11)',
        postgres: 'INTEGER',
        mssql: 'INTEGER'
      });
    });

    it('Integer length 11 zerofill', () => {
      const result = current.normalizeDataType(DataTypes.INTEGER(11).ZEROFILL).toSql();

      expectsql(result, {
        default: 'INTEGER(11) ZEROFILL',
        sqlite: 'INTEGER ZEROFILL(11)',
        oracle: 'INTEGER',
        postgres: 'INTEGER',
        mssql: 'INTEGER'
      });
    });

    it('Integer length 11 zerofill unsigned', () => {
      const result = current.normalizeDataType(DataTypes.INTEGER(11).ZEROFILL.UNSIGNED).toSql();

      expectsql(result, {
        default: 'INTEGER(11) UNSIGNED ZEROFILL',
        sqlite: 'INTEGER UNSIGNED ZEROFILL(11)',
        oracle: 'INTEGER(11)',
        postgres: 'INTEGER',
        mssql: 'INTEGER'
      });
    });

    describe('validate Integer', () => {
      it('should throw an error if `value` is invalid', () => {
        const type = DataTypes.INTEGER();

        expect(() => {
          type.validate('foobar');
        }).to.throw(Sequelize.ValidationError, '"foobar" is not a valid integer');

        expect(() => {
          type.validate('123.45');
        }).to.throw(Sequelize.ValidationError, '"123.45" is not a valid integer');

        expect(() => {
          type.validate(123.45);
        }).to.throw(Sequelize.ValidationError, '123.45 is not a valid integer');
      });

      it('should return `true` if `value` is a valid integer', () => {
        const type = DataTypes.INTEGER();

        expect(type.validate('12345')).to.equal(true);
        expect(type.validate(12345)).to.equal(true);
      });
    });
  });

  describe('Tinyint', () => {

    it('Tinyint standard', () => {
      const result = current.normalizeDataType(DataTypes.TINYINT).toSql();

      expectsql(result, {
        default: 'TINYINT'
      });
    });

    it('Tinyint length 2', () => {
      const result = current.normalizeDataType(DataTypes.TINYINT(2)).toSql();

      expectsql(result, {
        default: 'TINYINT(2)',
        mssql: 'TINYINT'
      });
    });

    it('Tinyint { length: 2 }', () => {
      const result = current.normalizeDataType(DataTypes.TINYINT({ length: 2 })).toSql();

      expectsql(result, {
        default: 'TINYINT(2)',
        mssql: 'TINYINT'
      });
    });

    it('Tinyint unsigned', () => {
      const result = current.normalizeDataType(DataTypes.TINYINT.UNSIGNED).toSql();

      expectsql(result, {
        default: 'TINYINT UNSIGNED',
        mssql: 'TINYINT'
      });
    });

    it('Tinyint length 2 unsigned', () => {
      const result = current.normalizeDataType(DataTypes.TINYINT(2).UNSIGNED).toSql();

      expectsql(result, {
        default: 'TINYINT(2) UNSIGNED',
        sqlite: 'TINYINT UNSIGNED(2)',
        mssql: 'TINYINT'
      });
    });

    it('Tinyint unsigned zerofill', () => {
      const result = current.normalizeDataType(DataTypes.TINYINT.UNSIGNED.ZEROFILL).toSql();

      expectsql(result, {
        default: 'TINYINT UNSIGNED ZEROFILL',
        mssql: 'TINYINT'
      });
    });

    it('Tinyint length 2 unsigned zerofill', () => {
      const result = current.normalizeDataType(DataTypes.TINYINT(2).UNSIGNED.ZEROFILL).toSql();

      expectsql(result, {
        default: 'TINYINT(2) UNSIGNED ZEROFILL',
        sqlite: 'TINYINT UNSIGNED ZEROFILL(2)',
        mssql: 'TINYINT'
      });
    });

    it('Tinyint zerofill', () => {
      const result = current.normalizeDataType(DataTypes.TINYINT.ZEROFILL).toSql();

      expectsql(result, {
        default: 'TINYINT ZEROFILL',
        mssql: 'TINYINT'
      });
    });

    it('Tinyint length 2 zerofill', () => {
      const result = current.normalizeDataType(DataTypes.TINYINT(2).ZEROFILL).toSql();

      expectsql(result, {
        default: 'TINYINT(2) ZEROFILL',
        sqlite: 'TINYINT ZEROFILL(2)',
        mssql: 'TINYINT'
      });
    });

    it('Tinyint zerofill unsigned', () => {
      const result = current.normalizeDataType(DataTypes.TINYINT.ZEROFILL.UNSIGNED).toSql();

      expectsql(result, {
        default: 'TINYINT UNSIGNED ZEROFILL',
        mssql: 'TINYINT'
      });
    });

    it('Tinyint length 2 zerofill unsigned', () => {
      const result = current.normalizeDataType(DataTypes.TINYINT(2).ZEROFILL.UNSIGNED).toSql();

      expectsql(result, {
        default: 'TINYINT(2) UNSIGNED ZEROFILL',
        sqlite: 'TINYINT UNSIGNED ZEROFILL(2)',
        mssql: 'TINYINT'
      });
    });

    describe('validate Tinyint', () => {
      it('should throw an error if `value` is invalid', () => {
        const type = DataTypes.TINYINT();

        expect(() => {
          type.validate('foobar');
        }).to.throw(Sequelize.ValidationError, '"foobar" is not a valid tinyint');

        expect(() => {
          type.validate(123.45);
        }).to.throw(Sequelize.ValidationError, '123.45 is not a valid tinyint');
      });

      it('should return `true` if `value` is an integer', () => {
        const type = DataTypes.TINYINT();

        expect(type.validate(-128)).to.equal(true);
        expect(type.validate('127')).to.equal(true);
      });
    });
  });

  describe('Smallint', () => {

    it('Smallint standard', () => {
      const result = current.normalizeDataType(DataTypes.SMALLINT).toSql();

      expectsql(result, {
        default: 'SMALLINT'
      });
    });

    it('Smallint length 4', () => {
      const result = current.normalizeDataType(DataTypes.SMALLINT(4)).toSql();

      expectsql(result, {
        default: 'SMALLINT(4)',
        postgres: 'SMALLINT',
        mssql: 'SMALLINT'
      });
    });

    it('Smallint { length: 4 }', () => {
      const result = current.normalizeDataType(DataTypes.SMALLINT({ length: 4 })).toSql();

      expectsql(result, {
        default: 'SMALLINT(4)',
        postgres: 'SMALLINT',
        mssql: 'SMALLINT'
      });
    });

    it('Smallint unsigned', () => {
      const result = current.normalizeDataType(DataTypes.SMALLINT.UNSIGNED).toSql();

      expectsql(result, {
        default: 'SMALLINT UNSIGNED',
        postgres: 'SMALLINT',
        mssql: 'SMALLINT'
      });
    });

    it('Smallint length 4 unsigned', () => {
      const result = current.normalizeDataType(DataTypes.SMALLINT(4).UNSIGNED).toSql();

      expectsql(result, {
        default: 'SMALLINT(4) UNSIGNED',
        sqlite: 'SMALLINT UNSIGNED(4)',
        postgres: 'SMALLINT',
        mssql: 'SMALLINT'
      });
    });

    it('Smallint unsigned zerofill', () => {
      const result = current.normalizeDataType(DataTypes.SMALLINT.UNSIGNED.ZEROFILL).toSql();

      expectsql(result, {
        default: 'SMALLINT UNSIGNED ZEROFILL',
        postgres: 'SMALLINT',
        mssql: 'SMALLINT'
      });
    });

    it('Smallint length 4 unsigned zerofill', () => {
      const result = current.normalizeDataType(DataTypes.SMALLINT(4).UNSIGNED.ZEROFILL).toSql();

      expectsql(result, {
        default: 'SMALLINT(4) UNSIGNED ZEROFILL',
        sqlite: 'SMALLINT UNSIGNED ZEROFILL(4)',
        postgres: 'SMALLINT',
        mssql: 'SMALLINT'
      });
    });

    it('Smallint zerofill', () => {
      const result = current.normalizeDataType(DataTypes.SMALLINT.ZEROFILL).toSql();

      expectsql(result, {
        default: 'SMALLINT ZEROFILL',
        postgres: 'SMALLINT',
        mssql: 'SMALLINT'
      });
    });

    it('Smallint length 4 zerofill', () => {
      const result = current.normalizeDataType(DataTypes.SMALLINT(4).ZEROFILL).toSql();

      expectsql(result, {
        default: 'SMALLINT(4) ZEROFILL',
        sqlite: 'SMALLINT ZEROFILL(4)',
        postgres: 'SMALLINT',
        mssql: 'SMALLINT'
      });
    });

    it('Smallint zerofill unsigned', () => {
      const result = current.normalizeDataType(DataTypes.SMALLINT.ZEROFILL.UNSIGNED).toSql();

      expectsql(result, {
        default: 'SMALLINT UNSIGNED ZEROFILL',
        postgres: 'SMALLINT',
        mssql: 'SMALLINT'
      });
    });

    it('Smallint length 4 zerofill unsigned', () => {
      const result = current.normalizeDataType(DataTypes.SMALLINT(4).ZEROFILL.UNSIGNED).toSql();

      expectsql(result, {
        default: 'SMALLINT(4) UNSIGNED ZEROFILL',
        sqlite: 'SMALLINT UNSIGNED ZEROFILL(4)',
        postgres: 'SMALLINT',
        mssql: 'SMALLINT'
      });
    });

    describe('validate Smallint', () => {
      it('should throw an error if `value` is invalid', () => {
        const type = DataTypes.SMALLINT();

        expect(() => {
          type.validate('foobar');
        }).to.throw(Sequelize.ValidationError, '"foobar" is not a valid smallint');

        expect(() => {
          type.validate(123.45);
        }).to.throw(Sequelize.ValidationError, '123.45 is not a valid smallint');
      });

      it('should return `true` if `value` is an integer', () => {
        const type = DataTypes.SMALLINT();

        expect(type.validate(-32768)).to.equal(true);
        expect(type.validate('32767')).to.equal(true);
      });
    });
  });

  describe('MediumInt', () => {

    it('MediumInt standard', () => {
      const result = current.normalizeDataType(DataTypes.MEDIUMINT).toSql();

      expectsql(result, {
        default: 'MEDIUMINT'
      });
    });

    it('MediumInt length 6', () => {
      const result = current.normalizeDataType(DataTypes.MEDIUMINT(6)).toSql();

      expectsql(result, {
        default: 'MEDIUMINT(6)'
      });
    });

    it('MediumInt { length: 6 }', () => {
      const result = current.normalizeDataType(DataTypes.MEDIUMINT({ length: 6 })).toSql();

      expectsql(result, {
        default: 'MEDIUMINT(6)'
      });
    });

    it('MediumInt unsigned', () => {
      const result = current.normalizeDataType(DataTypes.MEDIUMINT.UNSIGNED).toSql();

      expectsql(result, {
        default: 'MEDIUMINT UNSIGNED'
      });
    });

    it('MediumInt length 6 unsigned', () => {
      const result = current.normalizeDataType(DataTypes.MEDIUMINT(6).UNSIGNED).toSql();

      expectsql(result, {
        default: 'MEDIUMINT(6) UNSIGNED',
        sqlite: 'MEDIUMINT UNSIGNED(6)'
      });
    });

    it('MediumInt unsigned zerofill', () => {
      const result = current.normalizeDataType(DataTypes.MEDIUMINT.UNSIGNED.ZEROFILL).toSql();

      expectsql(result, {
        default: 'MEDIUMINT UNSIGNED ZEROFILL'
      });
    });

    it('MediumInt length 6 unsigned zerofill', () => {
      const result = current.normalizeDataType(DataTypes.MEDIUMINT(6).UNSIGNED.ZEROFILL).toSql();

      expectsql(result, {
        default: 'MEDIUMINT(6) UNSIGNED ZEROFILL',
        sqlite: 'MEDIUMINT UNSIGNED ZEROFILL(6)'
      });
    });

    it('MediumInt zerofill', () => {
      const result = current.normalizeDataType(DataTypes.MEDIUMINT.ZEROFILL).toSql();

      expectsql(result, {
        default: 'MEDIUMINT ZEROFILL'
      });
    });

    it('MediumInt length 6 zerofill', () => {
      const result = current.normalizeDataType(DataTypes.MEDIUMINT(6).ZEROFILL).toSql();

      expectsql(result, {
        default: 'MEDIUMINT(6) ZEROFILL',
        sqlite: 'MEDIUMINT ZEROFILL(6)'
      });
    });

    it('MediumInt length zerofill unsigned', () => {
      const result = current.normalizeDataType(DataTypes.MEDIUMINT.ZEROFILL.UNSIGNED).toSql();

      expectsql(result, {
        default: 'MEDIUMINT UNSIGNED ZEROFILL'
      });
    });

    it('MediumInt length 6 zerofill unsigned', () => {
      const result = current.normalizeDataType(DataTypes.MEDIUMINT(6).ZEROFILL.UNSIGNED).toSql();

      expectsql(result, {
        default: 'MEDIUMINT(6) UNSIGNED ZEROFILL',
        sqlite: 'MEDIUMINT UNSIGNED ZEROFILL(6)'
      });
    });

    describe('validate MediumInt', () => {
      it('should throw an error if `value` is invalid', () => {
        const type = DataTypes.MEDIUMINT();

        expect(() => {
          type.validate('foobar');
        }).to.throw(Sequelize.ValidationError, '"foobar" is not a valid mediumint');

        expect(() => {
          type.validate(123.45);
        }).to.throw(Sequelize.ValidationError, '123.45 is not a valid mediumint');
      });

      it('should return `true` if `value` is an integer', () => {
        const type = DataTypes.MEDIUMINT();

        expect(type.validate(-8388608)).to.equal(true);
        expect(type.validate('8388607')).to.equal(true);
      });
    });
  });

  describe('BigInt', () => {

    it('BigInt standard', () => {
      const result = current.normalizeDataType(DataTypes.BIGINT).toSql();

      expectsql(result, {
        default: 'BIGINT',
        oracle: 'NUMBER(19)'
      });
    });

    it('BigInt length 11', () => {
      const result = current.normalizeDataType(DataTypes.BIGINT(11)).toSql();

      expectsql(result, {
        default: 'BIGINT(11)',
        postgres: 'BIGINT',
        oracle: 'NUMBER(19)',
        mssql: 'BIGINT'
      });
    });

    it('BigInt { length: 11 }', () => {
      const result = current.normalizeDataType(DataTypes.BIGINT({ length: 11 })).toSql();

      expectsql(result, {
        default: 'BIGINT(11)',
        postgres: 'BIGINT',
        oracle: 'NUMBER(19)',
        mssql: 'BIGINT'
      });
    });

    it('BigInt unsigned', () => {
      const result = current.normalizeDataType(DataTypes.BIGINT.UNSIGNED).toSql();

      expectsql(result, {
        default: 'BIGINT UNSIGNED',
        postgres: 'BIGINT',
        oracle: 'NUMBER(19)',
        mssql: 'BIGINT'
      });
    });

    it('BigInt length 11 unsigned', () => {
      const result = current.normalizeDataType(DataTypes.BIGINT(11).UNSIGNED).toSql();

      expectsql(result, {
        default: 'BIGINT(11) UNSIGNED',
        sqlite: 'BIGINT UNSIGNED(11)',
        postgres: 'BIGINT',
        oracle: 'NUMBER(19)',
        mssql: 'BIGINT'
      });
    });

    it('BigInt unsigned zerofill', () => {
      const result = current.normalizeDataType(DataTypes.BIGINT.UNSIGNED.ZEROFILL).toSql();

      expectsql(result, {
        default: 'BIGINT UNSIGNED ZEROFILL',
        postgres: 'BIGINT',
        oracle: 'NUMBER(19)',
        mssql: 'BIGINT'
      });
    });

    it('BigInt length 11 unsigned zerofill', () => {
      const result = current.normalizeDataType(DataTypes.BIGINT(11).UNSIGNED.ZEROFILL).toSql();

      expectsql(result, {
        default: 'BIGINT(11) UNSIGNED ZEROFILL',
        sqlite: 'BIGINT UNSIGNED ZEROFILL(11)',
        oracle: 'NUMBER(19)',
        postgres: 'BIGINT',
        mssql: 'BIGINT'
      });
    });

    it('BigInt zerofill', () => {
      const result = current.normalizeDataType(DataTypes.BIGINT.ZEROFILL).toSql();

      expectsql(result, {
        default: 'BIGINT ZEROFILL',
        sqlite: 'BIGINT ZEROFILL',
        oracle: 'NUMBER(19)',
        postgres: 'BIGINT',
        mssql: 'BIGINT'
      });
    });

    it('BigInt length 11 zerofill', () => {
      const result = current.normalizeDataType(DataTypes.BIGINT(11).ZEROFILL).toSql();

      expectsql(result, {
        default: 'BIGINT(11) ZEROFILL',
        sqlite: 'BIGINT ZEROFILL(11)',
        oracle: 'NUMBER(19)',
        postgres: 'BIGINT',
        mssql: 'BIGINT'
      });
    });

    it('BigInt zerofill unsigned', () => {
      const result = current.normalizeDataType(DataTypes.BIGINT.ZEROFILL.UNSIGNED).toSql();

      expectsql(result, {
        default: 'BIGINT UNSIGNED ZEROFILL',
        postgres: 'BIGINT',
        oracle: 'NUMBER(19)',
        mssql: 'BIGINT'
      });
    });

    it('BigInt length 11 zerofill unsigned', () => {
      const result = current.normalizeDataType(DataTypes.BIGINT(11).ZEROFILL.UNSIGNED).toSql();

      expectsql(result, {
        default: 'BIGINT(11) UNSIGNED ZEROFILL',
        sqlite: 'BIGINT UNSIGNED ZEROFILL(11)',
        oracle: 'NUMBER(19)',
        postgres: 'BIGINT',
        mssql: 'BIGINT'
      });
    });

    describe('validate BigInt', () => {
      it('should throw an error if `value` is invalid', () => {
        const type = DataTypes.BIGINT();

        expect(() => {
          type.validate('foobar');
        }).to.throw(Sequelize.ValidationError, '"foobar" is not a valid bigint');

        expect(() => {
          type.validate(123.45);
        }).to.throw(Sequelize.ValidationError, '123.45 is not a valid bigint');
      });

      it('should return `true` if `value` is an integer', () => {
        const type = DataTypes.BIGINT();

        expect(type.validate('9223372036854775807')).to.equal(true);
      });
    });
  });

  describe('Real', () => {

    it('Real standard', () => {
      const result = current.normalizeDataType(DataTypes.REAL).toSql();

      expectsql(result, {
        default: 'REAL'
      });
    });

    it('Real length 11', () => {
      const result = current.normalizeDataType(DataTypes.REAL(11)).toSql();

      expectsql(result, {
        default: 'REAL(11)',
        postgres: 'REAL',
        oracle: 'REAL',
        mssql: 'REAL'
      });
    });

    it('Real { length: 11 }', () => {
      const result = current.normalizeDataType(DataTypes.REAL({ length: 11 })).toSql();

      expectsql(result, {
        default: 'REAL(11)',
        postgres: 'REAL',
        oracle: 'REAL',
        mssql: 'REAL'
      });
    });

    it('Real unsigned', () => {
      const result = current.normalizeDataType(DataTypes.REAL.UNSIGNED).toSql();

      expectsql(result, {
        default: 'REAL UNSIGNED',
        postgres: 'REAL',
        oracle: 'REAL',
        mssql: 'REAL'
      });
    });

    it('Real length 11 unsigned', () => {
      const result = current.normalizeDataType(DataTypes.REAL(11).UNSIGNED).toSql();

      expectsql(result, {
        default: 'REAL(11) UNSIGNED',
        sqlite: 'REAL UNSIGNED(11)',
        postgres: 'REAL',
        oracle: 'REAL',
        mssql: 'REAL'
      });
    });

    it('Real unsigned zerofill', () => {
      const result = current.normalizeDataType(DataTypes.REAL.UNSIGNED.ZEROFILL).toSql();

      expectsql(result, {
        default: 'REAL UNSIGNED ZEROFILL',
        sqlite: 'REAL UNSIGNED ZEROFILL',
        postgres: 'REAL',
        oracle: 'REAL',
        mssql: 'REAL'
      });
    });

    it('Real length 11 unsigned zerofill', () => {
      const result = current.normalizeDataType(DataTypes.REAL(11).UNSIGNED.ZEROFILL).toSql();

      expectsql(result, {
        default: 'REAL(11) UNSIGNED ZEROFILL',
        sqlite: 'REAL UNSIGNED ZEROFILL(11)',
        postgres: 'REAL',
        oracle: 'REAL',
        mssql: 'REAL'
      });
    });

    it('Real zerofill', () => {
      const result = current.normalizeDataType(DataTypes.REAL.ZEROFILL).toSql();

      expectsql(result, {
        default: 'REAL ZEROFILL',
        sqlite: 'REAL ZEROFILL',
        postgres: 'REAL',
        oracle: 'REAL',
        mssql: 'REAL'
      });
    });

    it('Real length 11 zerofill', () => {
      const result = current.normalizeDataType(DataTypes.REAL(11).ZEROFILL).toSql();

      expectsql(result, {
        default: 'REAL(11) ZEROFILL',
        sqlite: 'REAL ZEROFILL(11)',
        postgres: 'REAL',
        oracle: 'REAL',
        mssql: 'REAL'
      });
    });

    it('Real zerofill unsigned', () => {
      const result = current.normalizeDataType(DataTypes.REAL.ZEROFILL.UNSIGNED).toSql();

      expectsql(result, {
        default: 'REAL UNSIGNED ZEROFILL',
        sqlite: 'REAL UNSIGNED ZEROFILL',
        postgres: 'REAL',
        oracle: 'REAL',
        mssql: 'REAL'
      });
    });

    it('Real length 11 zerofill unsigned', () => {
      const result = current.normalizeDataType(DataTypes.REAL(11).ZEROFILL.UNSIGNED).toSql();

      expectsql(result, {
        default: 'REAL(11) UNSIGNED ZEROFILL',
        sqlite: 'REAL UNSIGNED ZEROFILL(11)',
        postgres: 'REAL',
        oracle: 'REAL',
        mssql: 'REAL'
      });
    });

    it('Real length 11 decimals 12 ', () => {
      const result = current.normalizeDataType(DataTypes.REAL(11, 12)).toSql();

      expectsql(result, {
        default: 'REAL(11,12)',
        sqlite: 'REAL(11,12)',
        postgres: 'REAL',
        oracle: 'REAL',
        mssql: 'REAL'
      });
    });

    it('Real length 11 decimals 12 unsigned', () => {
      const result = current.normalizeDataType(DataTypes.REAL(11, 12).UNSIGNED).toSql();

      expectsql(result, {
        default: 'REAL(11,12) UNSIGNED',
        sqlite: 'REAL UNSIGNED(11,12)',
        postgres: 'REAL',
        oracle: 'REAL',
        mssql: 'REAL'
      });
    });

    it('Real { length: 11, decimals: 12 } unsigned', () => {
      const result = current.normalizeDataType(DataTypes.REAL(11, 12).UNSIGNED).toSql();

      expectsql(result, {
        default: 'REAL(11,12) UNSIGNED',
        sqlite: 'REAL UNSIGNED(11,12)',
        postgres: 'REAL',
        oracle: 'REAL',
        mssql: 'REAL'
      });
    });

    it('Real length 11 decimals 12 unsigned zerofill', () => {
      const result = current.normalizeDataType(DataTypes.REAL(11, 12).ZEROFILL.UNSIGNED).toSql();

      expectsql(result, {
        default: 'REAL(11,12) UNSIGNED ZEROFILL',
        sqlite: 'REAL UNSIGNED ZEROFILL(11,12)',
        postgres: 'REAL',
        oracle: 'REAL',
        mssql: 'REAL'
      });
    });

    it('Real length 11 decimals 12 zerofill', () => {
      const result = current.normalizeDataType(DataTypes.REAL(11, 12).ZEROFILL).toSql();

      expectsql(result, {
        default: 'REAL(11,12) ZEROFILL',
        sqlite: 'REAL ZEROFILL(11,12)',
        postgres: 'REAL',
        oracle: 'REAL',
        mssql: 'REAL'
      });
    });

    it('Real length 11 decimals 12 zerofill unsigned', () => {
      const result = current.normalizeDataType(DataTypes.REAL(11, 12).ZEROFILL.UNSIGNED).toSql();

      expectsql(result, {
        default: 'REAL(11,12) UNSIGNED ZEROFILL',
        sqlite: 'REAL UNSIGNED ZEROFILL(11,12)',
        postgres: 'REAL',
        oracle: 'REAL',
        mssql: 'REAL'
      });
    });
  });

  describe('Double', () => {

    it('Double standard', () => {
      const result = current.normalizeDataType(DataTypes.DOUBLE).toSql();

      expectsql(result, {
        default: 'DOUBLE PRECISION',
        oracle: 'NUMBER(15,5)'
      });
    });

    it('Double length 11', () => {
      const result = current.normalizeDataType(DataTypes.DOUBLE(11)).toSql();

      expectsql(result, {
        default: 'DOUBLE PRECISION(11)',
        oracle: 'NUMBER(15,5)',
        postgres: 'DOUBLE PRECISION'
      });
    });

    it('Double { length: 11 }', () => {
      const result = current.normalizeDataType(DataTypes.DOUBLE({ length: 11 })).toSql();

      expectsql(result, {
        default: 'DOUBLE PRECISION(11)',
        oracle: 'NUMBER(15,5)',
        postgres: 'DOUBLE PRECISION'
      });
    });

    it('Double unsigned', () => {
      const result = current.normalizeDataType(DataTypes.DOUBLE.UNSIGNED).toSql();

      expectsql(result, {
        default: 'DOUBLE PRECISION UNSIGNED',
        oracle: 'NUMBER(15,5)',
        postgres: 'DOUBLE PRECISION'
      });
    });

    it('Double length 11 unsigned', () => {
      const result = current.normalizeDataType(DataTypes.DOUBLE(11).UNSIGNED).toSql();

      expectsql(result, {
        default: 'DOUBLE PRECISION(11) UNSIGNED',
        sqlite: 'DOUBLE PRECISION UNSIGNED(11)',
        oracle: 'NUMBER(15,5)',
        postgres: 'DOUBLE PRECISION'
      });
    });

    it('Double unsigned zerofill', () => {
      const result = current.normalizeDataType(DataTypes.DOUBLE.UNSIGNED.ZEROFILL).toSql();

      expectsql(result, {
        default: 'DOUBLE PRECISION UNSIGNED ZEROFILL',
        sqlite: 'DOUBLE PRECISION UNSIGNED ZEROFILL',
        oracle: 'NUMBER(15,5)',
        postgres: 'DOUBLE PRECISION'
      });
    });

    it('Double length 11 unsigned zerofill', () => {
      const result = current.normalizeDataType(DataTypes.DOUBLE(11).UNSIGNED.ZEROFILL).toSql();

      expectsql(result, {
        default: 'DOUBLE PRECISION(11) UNSIGNED ZEROFILL',
        sqlite: 'DOUBLE PRECISION UNSIGNED ZEROFILL(11)',
        oracle: 'NUMBER(15,5)',
        postgres: 'DOUBLE PRECISION'
      });
    });

    it('Double zerofill', () => {
      const result = current.normalizeDataType(DataTypes.DOUBLE.ZEROFILL).toSql();

      expectsql(result, {
        default: 'DOUBLE PRECISION ZEROFILL',
        sqlite: 'DOUBLE PRECISION ZEROFILL',
        oracle: 'NUMBER(15,5)',
        postgres: 'DOUBLE PRECISION'
      });
    });

    it('Double length 11 zerofill', () => {
      const result = current.normalizeDataType(DataTypes.DOUBLE(11).ZEROFILL).toSql();

      expectsql(result, {
        default: 'DOUBLE PRECISION(11) ZEROFILL',
        sqlite: 'DOUBLE PRECISION ZEROFILL(11)',
        oracle: 'NUMBER(15,5)',
        postgres: 'DOUBLE PRECISION'
      });
    });

    it('Double zerofill unsigned', () => {
      const result = current.normalizeDataType(DataTypes.DOUBLE.ZEROFILL.UNSIGNED).toSql();

      expectsql(result, {
        default: 'DOUBLE PRECISION UNSIGNED ZEROFILL',
        sqlite: 'DOUBLE PRECISION UNSIGNED ZEROFILL',
        oracle: 'NUMBER(15,5)',
        postgres: 'DOUBLE PRECISION'
      });
    });

    it('Double length 11 zerofill unsigned', () => {
      const result = current.normalizeDataType(DataTypes.DOUBLE(11).ZEROFILL.UNSIGNED).toSql();

      expectsql(result, {
        default: 'DOUBLE PRECISION(11) UNSIGNED ZEROFILL',
        sqlite: 'DOUBLE PRECISION UNSIGNED ZEROFILL(11)',
        oracle: 'NUMBER(15,5)',
        postgres: 'DOUBLE PRECISION'
      });
    });

    it('Double length 11 decimals 12 ', () => {
      const result = current.normalizeDataType(DataTypes.DOUBLE(11, 12)).toSql();

      expectsql(result, {
        default: 'DOUBLE PRECISION(11,12)',
        oracle: 'NUMBER(15,5)',
        postgres: 'DOUBLE PRECISION'
      });
    });

    it('Double length 11 decimals 12 unsigned', () => {
      const result = current.normalizeDataType(DataTypes.DOUBLE(11, 12).UNSIGNED).toSql();

      expectsql(result, {
        default: 'DOUBLE PRECISION(11,12) UNSIGNED',
        sqlite: 'DOUBLE PRECISION UNSIGNED(11,12)',
        oracle: 'NUMBER(15,5)',
        postgres: 'DOUBLE PRECISION'
      });
    });

    it('Double { length: 11, decimals: 12 } unsigned', () => {
      const result = current.normalizeDataType(DataTypes.DOUBLE(11, 12).UNSIGNED).toSql();

      expectsql(result, {
        default: 'DOUBLE PRECISION(11,12) UNSIGNED',
        sqlite: 'DOUBLE PRECISION UNSIGNED(11,12)',
        oracle: 'NUMBER(15,5)',
        postgres: 'DOUBLE PRECISION'
      });
    });

    it('Double length 11 decimals 12 unsigned zerofill', () => {
      const result = current.normalizeDataType(DataTypes.DOUBLE(11, 12).ZEROFILL.UNSIGNED).toSql();

      expectsql(result, {
        default: 'DOUBLE PRECISION(11,12) UNSIGNED ZEROFILL',
        sqlite: 'DOUBLE PRECISION UNSIGNED ZEROFILL(11,12)',
        oracle: 'NUMBER(15,5)',
        postgres: 'DOUBLE PRECISION'
      });
    });

    it('Double length 11 decimals 12 zerofill', () => {
      const result = current.normalizeDataType(DataTypes.DOUBLE(11, 12).ZEROFILL).toSql();

      expectsql(result, {
        default: 'DOUBLE PRECISION(11,12) ZEROFILL',
        sqlite: 'DOUBLE PRECISION ZEROFILL(11,12)',
        oracle: 'NUMBER(15,5)',
        postgres: 'DOUBLE PRECISION'
      });
    });

    it('Double length 11 decimals 12 zerofill unsigned', () => {
      const result = current.normalizeDataType(DataTypes.DOUBLE(11, 12).ZEROFILL.UNSIGNED).toSql();

      expectsql(result, {
        default: 'DOUBLE PRECISION(11,12) UNSIGNED ZEROFILL',
        sqlite: 'DOUBLE PRECISION UNSIGNED ZEROFILL(11,12)',
        oracle: 'NUMBER(15,5)',
        postgres: 'DOUBLE PRECISION'
      });
    });
  });

  describe('Float', () => {

    it('Float standard', () => {
      const result = current.normalizeDataType(DataTypes.FLOAT).toSql();

      expectsql(result, {
        default: 'FLOAT',
        postgres: 'FLOAT'
      });
    });

    it('Float length 11', () => {
      const result = current.normalizeDataType(DataTypes.FLOAT(11)).toSql();

      expectsql(result, {
        default: 'FLOAT(11)',
        postgres: 'FLOAT(11)', // 1-24 = 4 bytes; 35-53 = 8 bytes
        oracle: 'FLOAT(11)',
        mssql: 'FLOAT(11)' // 1-24 = 4 bytes; 35-53 = 8 bytes
      });
    });

    it('Float { length: 11 }', () => {
      const result = current.normalizeDataType(DataTypes.FLOAT({ length: 11 })).toSql();

      expectsql(result, {
        default: 'FLOAT(11)',
        postgres: 'FLOAT(11)',
        oracle: 'FLOAT(11)',
        mssql: 'FLOAT(11)'
      });
    });

    it('Float unsigned', () => {
      const result = current.normalizeDataType(DataTypes.FLOAT.UNSIGNED).toSql();

      expectsql(result, {
        default: 'FLOAT UNSIGNED',
        postgres: 'FLOAT',
        oracle: 'FLOAT',
        mssql: 'FLOAT'
      });
    });

    it('Float length 11 unsigned', () => {
      const result = current.normalizeDataType(DataTypes.FLOAT(11).UNSIGNED).toSql();

      expectsql(result, {
        default: 'FLOAT(11) UNSIGNED',
        sqlite: 'FLOAT UNSIGNED(11)',
        postgres: 'FLOAT(11)',
        oracle: 'FLOAT(11)',
        mssql: 'FLOAT(11)'
      });
    });

    it('Float unsigned zerofill', () => {
      const result = current.normalizeDataType(DataTypes.FLOAT.UNSIGNED.ZEROFILL).toSql();

      expectsql(result, {
        default: 'FLOAT UNSIGNED ZEROFILL',
        sqlite: 'FLOAT UNSIGNED ZEROFILL',
        postgres: 'FLOAT',
        oracle: 'FLOAT',
        mssql: 'FLOAT'
      });
    });

    it('Float length 11 unsigned zerofill', () => {
      const result = current.normalizeDataType(DataTypes.FLOAT(11).UNSIGNED.ZEROFILL).toSql();

      expectsql(result, {
        default: 'FLOAT(11) UNSIGNED ZEROFILL',
        sqlite: 'FLOAT UNSIGNED ZEROFILL(11)',
        postgres: 'FLOAT(11)',
        oracle: 'FLOAT(11)',
        mssql: 'FLOAT(11)'
      });
    });

    it('Float zerofill', () => {
      const result = current.normalizeDataType(DataTypes.FLOAT.ZEROFILL).toSql();

      expectsql(result, {
        default: 'FLOAT ZEROFILL',
        sqlite: 'FLOAT ZEROFILL',
        postgres: 'FLOAT',
        oracle: 'FLOAT',
        mssql: 'FLOAT'
      });
    });

    it('Float length 11 zerofill', () => {
      const result = current.normalizeDataType(DataTypes.FLOAT(11).ZEROFILL).toSql();

      expectsql(result, {
        default: 'FLOAT(11) ZEROFILL',
        sqlite: 'FLOAT ZEROFILL(11)',
        postgres: 'FLOAT(11)',
        oracle: 'FLOAT(11)',
        mssql: 'FLOAT(11)'
      });
    });

    it('Float zerofill unsigned', () => {
      const result = current.normalizeDataType(DataTypes.FLOAT.ZEROFILL.UNSIGNED).toSql();

      expectsql(result, {
        default: 'FLOAT UNSIGNED ZEROFILL',
        sqlite: 'FLOAT UNSIGNED ZEROFILL',
        postgres: 'FLOAT',
        oracle: 'FLOAT',
        mssql: 'FLOAT'
      });
    });

    it('Float length 11 zerofill unsigned', () => {
      const result = current.normalizeDataType(DataTypes.FLOAT(11).ZEROFILL.UNSIGNED).toSql();

      expectsql(result, {
        default: 'FLOAT(11) UNSIGNED ZEROFILL',
        sqlite: 'FLOAT UNSIGNED ZEROFILL(11)',
        postgres: 'FLOAT(11)',
        oracle: 'FLOAT(11)',
        mssql: 'FLOAT(11)'
      });
    });

    it('Float length 11 decimals 12 ', () => {
      const result = current.normalizeDataType(DataTypes.FLOAT(11, 12)).toSql();

      expectsql(result, {
        default: 'FLOAT(11,12)',
        postgres: 'FLOAT',
        oracle: 'FLOAT(11)',
        mssql: 'FLOAT'
      });
    });

    it('Float length 11 decimals 12 unsigned', () => {
      const result = current.normalizeDataType(DataTypes.FLOAT(11, 12).UNSIGNED).toSql();

      expectsql(result, {
        default: 'FLOAT(11,12) UNSIGNED',
        sqlite: 'FLOAT UNSIGNED(11,12)',
        postgres: 'FLOAT',
        oracle: 'FLOAT(11)',
        mssql: 'FLOAT'
      });
    });

    it('Float { length: 11, decimals: 12 } unsigned', () => {
      const result = current.normalizeDataType(DataTypes.FLOAT(11, 12).UNSIGNED).toSql();

      expectsql(result, {
        default: 'FLOAT(11,12) UNSIGNED',
        sqlite: 'FLOAT UNSIGNED(11,12)',
        postgres: 'FLOAT',
        oracle: 'FLOAT(11)',
        mssql: 'FLOAT'
      });
    });

    it('Float length 11 decimals 12 unsigned zerofill', () => {
      const result = current.normalizeDataType(DataTypes.FLOAT(11, 12).ZEROFILL.UNSIGNED).toSql();

      expectsql(result, {
        default: 'FLOAT(11,12) UNSIGNED ZEROFILL',
        sqlite: 'FLOAT UNSIGNED ZEROFILL(11,12)',
        postgres: 'FLOAT',
        oracle: 'FLOAT(11)',
        mssql: 'FLOAT'
      });
    });

    it('Float length 11 decimals 12 zerofill', () => {
      const result = current.normalizeDataType(DataTypes.FLOAT(11, 12).ZEROFILL).toSql();

      expectsql(result, {
        default: 'FLOAT(11,12) ZEROFILL',
        sqlite: 'FLOAT ZEROFILL(11,12)',
        postgres: 'FLOAT',
        oracle: 'FLOAT(11)',
        mssql: 'FLOAT'
      });
    });

    it('Float length 11 decimals 12 zerofill unsigned', () => {
      const result = current.normalizeDataType(DataTypes.FLOAT(11, 12).ZEROFILL.UNSIGNED).toSql();

      expectsql(result, {
        default: 'FLOAT(11,12) UNSIGNED ZEROFILL',
        sqlite: 'FLOAT UNSIGNED ZEROFILL(11,12)',
        oracle: 'FLOAT(11)',
        postgres: 'FLOAT',
        mssql: 'FLOAT'
      });
    });

    describe('validate Float', () => {
      it('should throw an error if `value` is invalid', () => {
        const type = DataTypes.FLOAT();

        expect(() => {
          type.validate('foobar');
        }).to.throw(Sequelize.ValidationError, '"foobar" is not a valid float');
      });

      it('should return `true` if `value` is a float', () => {
        const type = DataTypes.FLOAT();

        expect(type.validate(1.2)).to.equal(true);
        expect(type.validate('1')).to.equal(true);
        expect(type.validate('1.2')).to.equal(true);
        expect(type.validate('-0.123')).to.equal(true);
        expect(type.validate('-0.22250738585072011e-307')).to.equal(true);
      });
    });
  });

  if (current.dialect.supports.NUMERIC) {
    describe('Numeric', () => {

      it('Numeric standart', () => {
        const result = current.normalizeDataType(DataTypes.NUMERIC).toSql();
    
        expectsql(result, {
          default: 'DECIMAL',
          oracle: 'NUMBER'
        });
      });

      it('Numeric length 15 decimals 5', () => {
        const result = current.normalizeDataType(DataTypes.NUMERIC(15, 5)).toSql();
    
        expectsql(result, {
          default: 'DECIMAL(15,5)',
          oracle: 'NUMBER(15,5)'
        });
      });
    });
  }

  describe('Decimal', () => {

    it('Decimal standard', () => {
      const result = current.normalizeDataType(DataTypes.DECIMAL).toSql();

      expectsql(result, {
        default: 'DECIMAL',
        oracle: 'NUMBER'
      });
    });

    it('Decimal precision 10 scale 2', () => {
      const result = current.normalizeDataType(DataTypes.DECIMAL(10, 2)).toSql();

      expectsql(result, {
        default: 'DECIMAL(10,2)',
        oracle: 'NUMBER(10,2)'
      });
    });

    it('Decimal { precision: 10, scale: 2 }', () => {
      const result = current.normalizeDataType(DataTypes.DECIMAL({ precision: 10, scale: 2 })).toSql();

      expectsql(result, {
        default: 'DECIMAL(10,2)',
        oracle: 'NUMBER(10,2)'
      });
    });

    it('Decimal precision 10', () => {
      const result = current.normalizeDataType(DataTypes.DECIMAL(10)).toSql();

      expectsql(result, {
        default: 'DECIMAL(10)',
        oracle: 'NUMBER(10)'
      });
    });

    it('Decimal { precision: 10 }', () => {
      const result = current.normalizeDataType(DataTypes.DECIMAL({ precision: 10 })).toSql();

      expectsql(result, {
        default: 'DECIMAL(10)',
        oracle: 'NUMBER(10)'
      });
    });

    it('Decimal unsigned', () => {
      const result = current.normalizeDataType(DataTypes.DECIMAL.UNSIGNED).toSql();

      expectsql(result, {
        mysql: 'DECIMAL UNSIGNED',
        oracle: 'NUMBER',
        default: 'DECIMAL'
      });
    });

    it('Decimal unsigned zerofill', () => {
      const result = current.normalizeDataType(DataTypes.DECIMAL.UNSIGNED.ZEROFILL).toSql();

      expectsql(result, {
        mysql: 'DECIMAL UNSIGNED ZEROFILL',
        oracle: 'NUMBER',
        default: 'DECIMAL'
      });
    });

    it('Decimal { precision: 10, scale: 2 } unsigned', () => {
      const result = current.normalizeDataType(DataTypes.DECIMAL(10, 2).UNSIGNED).toSql();

      expectsql(result, {
        mysql: 'DECIMAL(10,2) UNSIGNED',
        oracle: 'NUMBER(10,2)',
        default: 'DECIMAL(10,2)'
      });
    });

    describe('validate Decimal', () => {
      it('should throw an error if `value` is invalid', () => {
        const type = DataTypes.DECIMAL(10);

        expect(() => {
          type.validate('foobar');
        }).to.throw(Sequelize.ValidationError, '"foobar" is not a valid decimal');

        expect(() => {
          type.validate('0.1a');
        }).to.throw(Sequelize.ValidationError, '"0.1a" is not a valid decimal');

        expect(() => {
          type.validate(NaN);
        }).to.throw(Sequelize.ValidationError, 'null is not a valid decimal');
      });

      it('should return `true` if `value` is a decimal', () => {
        const type = DataTypes.DECIMAL(10);

        expect(type.validate(123)).to.equal(true);
        expect(type.validate(1.2)).to.equal(true);
        expect(type.validate(-0.25)).to.equal(true);
        expect(type.validate(0.0000000000001)).to.equal(true);
        expect(type.validate('123')).to.equal(true);
        expect(type.validate('1.2')).to.equal(true);
        expect(type.validate('-0.25')).to.equal(true);
        expect(type.validate('0.0000000000001')).to.equal(true);
      });
    });
  });

  describe('Enum', () => {
    // TODO: Fix Enums and add more tests
    // testsql('ENUM("value 1", "value 2")', DataTypes.ENUM('value 1', 'value 2'), {
    //   default: 'ENUM'
    // });

    //it('Enum "value 1", "value 2"', function() {
    //  const result = current.normalizeDataType(DataTypes.ENUM("value 1","value 2")).toSql();
    //  expectsql(result, {
    //    default: 'ENUM'
    //  });
    //});

    describe('validate Enum', () => {
      it('should throw an error if `value` is invalid', () => {
        const type = DataTypes.ENUM('foo');

        expect(() => {
          type.validate('foobar');
        }).to.throw(Sequelize.ValidationError, '"foobar" is not a valid choice in ["foo"]');
      });

      it('should return `true` if `value` is a valid choice', () => {
        const type = DataTypes.ENUM('foobar', 'foobiz');

        expect(type.validate('foobar')).to.equal(true);
        expect(type.validate('foobiz')).to.equal(true);
      });
    });
  });

  describe('Blob', () => {

    it('Blob standard', () => {
      const result = current.normalizeDataType(DataTypes.BLOB).toSql();

      expectsql(result, {
        default: 'BLOB',
        mssql: 'VARBINARY(MAX)',
        postgres: 'BYTEA'
      });
    });

    it('Blob tiny', () => {
      const result = current.normalizeDataType(DataTypes.BLOB('tiny')).toSql();

      expectsql(result, {
        default: 'TINYBLOB',
        oracle: 'RAW(256)',
        mssql: 'VARBINARY(256)',
        postgres: 'BYTEA'
      });
    });

    it('Blob medium', () => {
      const result = current.normalizeDataType(DataTypes.BLOB('medium')).toSql();

      expectsql(result, {
        default: 'MEDIUMBLOB',
        mssql: 'VARBINARY(MAX)',
        oracle: 'RAW(2000)',
        postgres: 'BYTEA'
      });
    });

    it('Blob { length: "medium" }', () => {
      const result = current.normalizeDataType(DataTypes.BLOB({ length: 'medium' })).toSql();

      expectsql(result, {
        default: 'MEDIUMBLOB',
        mssql: 'VARBINARY(MAX)',
        oracle: 'RAW(2000)',
        postgres: 'BYTEA'
      });
    });

    it('Blob long', () => {
      const result = current.normalizeDataType(DataTypes.BLOB('long')).toSql();

      expectsql(result, {
        default: 'LONGBLOB',
        mssql: 'VARBINARY(MAX)',
        oracle: 'RAW(2000)',
        postgres: 'BYTEA'
      });
    });

    describe('validate Blob', () => {
      it('should throw an error if `value` is invalid', () => {
        const type = DataTypes.BLOB();

        expect(() => {
          type.validate(12345);
        }).to.throw(Sequelize.ValidationError, '12345 is not a valid blob');
      });

      it('should return `true` if `value` is a blob', () => {
        const type = DataTypes.BLOB();

        expect(type.validate('foobar')).to.equal(true);
        expect(type.validate(new Buffer('foobar'))).to.equal(true);
      });
    });
  });

  describe('Range', () => {

    describe('validate Range', () => {
      it('should throw an error if `value` is invalid', () => {
        const type = DataTypes.RANGE();

        expect(() => {
          type.validate('foobar');
        }).to.throw(Sequelize.ValidationError, '"foobar" is not a valid range');
      });

      it('should throw an error if `value` is not an array with two elements', () => {
        const type = DataTypes.RANGE();

        expect(() => {
          type.validate([1]);
        }).to.throw(Sequelize.ValidationError, 'A range must be an array with two elements');
      });

      it('should throw an error if `value.inclusive` is invalid', () => {
        const type = DataTypes.RANGE();

        expect(() => {
          type.validate({ inclusive: 'foobar' });
        }).to.throw(Sequelize.ValidationError, '"foobar" is not a valid range');
      });

      it('should throw an error if `value.inclusive` is not an array with two elements', () => {
        const type = DataTypes.RANGE();

        expect(() => {
          type.validate({ inclusive: [1] });
        }).to.throw(Sequelize.ValidationError, 'A range must be an array with two elements');
      });

      it('should return `true` if `value` is a range', () => {
        const type = DataTypes.RANGE();

        expect(type.validate([1, 2])).to.equal(true);
      });

      it('should return `true` if `value.inclusive` is a range', () => {
        const type = DataTypes.RANGE();

        expect(type.validate({ inclusive: [1, 2] })).to.equal(true);
      });
    });
  });


  if (current.dialect.supports.ARRAY) {
    describe('Array', () => {

      it('Array varchar', () => {
        const result = current.normalizeDataType(DataTypes.ARRAY(DataTypes.STRING)).toSql();

        expectsql(result, {
          postgres: 'VARCHAR(255)[]'
        });
      });

      it('Array varchar(100)', () => {
        const result = current.normalizeDataType(DataTypes.ARRAY(DataTypes.STRING(100))).toSql();

        expectsql(result, {
          postgres: 'VARCHAR(100)[]'
        });
      });

      it('Array hstore', () => {
        const result = current.normalizeDataType(DataTypes.ARRAY(DataTypes.HSTORE)).toSql();

        expectsql(result, {
          postgres: 'HSTORE[]'
        });
      });

      it('Array array(varchar)', () => {
        const result = current.normalizeDataType(DataTypes.ARRAY(DataTypes.ARRAY(DataTypes.STRING))).toSql();

        expectsql(result, {
          postgres: 'VARCHAR(255)[][]'
        });
      });

      it('Array text', () => {
        const result = current.normalizeDataType(DataTypes.ARRAY(DataTypes.TEXT)).toSql();

        expectsql(result, {
          postgres: 'TEXT[]'
        });
      });

      it('Array date', () => {
        const result = current.normalizeDataType(DataTypes.ARRAY(DataTypes.DATE)).toSql();

        expectsql(result, {
          postgres: 'TIMESTAMP WITH TIME ZONE[]'
        });
      });

      it('Array boolean', () => {
        const result = current.normalizeDataType(DataTypes.ARRAY(DataTypes.BOOLEAN)).toSql();

        expectsql(result, {
          postgres: 'BOOLEAN[]'
        });
      });

      it('Array decimal', () => {
        const result = current.normalizeDataType(DataTypes.ARRAY(DataTypes.DECIMAL)).toSql();

        expectsql(result, {
          postgres: 'DECIMAL[]'
        });
      });

      it('Array decimal(6)', () => {
        const result = current.normalizeDataType(DataTypes.ARRAY(DataTypes.DECIMAL(6))).toSql();

        expectsql(result, {
          postgres: 'DECIMAL(6)[]'
        });
      });

      it('Array decimal(6,4)', () => {
        const result = current.normalizeDataType(DataTypes.ARRAY(DataTypes.DECIMAL(6, 4))).toSql();

        expectsql(result, {
          postgres: 'DECIMAL(6,4)[]'
        });
      });

      it('Array double', () => {
        const result = current.normalizeDataType(DataTypes.ARRAY(DataTypes.DOUBLE)).toSql();

        expectsql(result, {
          postgres: 'DOUBLE PRECISION[]'
        });
      });

      it('Array real', () => {
        const result = current.normalizeDataType(DataTypes.ARRAY(DataTypes.REAL)).toSql();

        expectsql(result, {
          postgres: 'REAL[]'
        });
      });


      if (current.dialect.supports.JSON) {
        it('Array json', () => {
          const result = current.normalizeDataType(DataTypes.ARRAY(DataTypes.JSON)).toSql();

          expectsql(result, {
            postgres: 'JSON[]'
          });
        });
      }

      if (current.dialect.supports.JSONB) {
        it('Array jsonb', () => {
          const result = current.normalizeDataType(DataTypes.ARRAY(DataTypes.JSONB)).toSql();

          expectsql(result, {
            postgres: 'JSONB[]'
          });
        });
      }

      describe('validate Array', () => {
        it('should throw an error if `value` is invalid', () => {
          const type = DataTypes.ARRAY();

          expect(() => {
            type.validate('foobar');
          }).to.throw(Sequelize.ValidationError, '"foobar" is not a valid array');
        });

        it('should return `true` if `value` is an array', () => {
          const type = DataTypes.ARRAY();

          expect(type.validate(['foo', 'bar'])).to.equal(true);
        });
      });
    });
  }

  if (current.dialect.supports.GEOMETRY) {
    describe('Geometry', () => {

      it('Geometry standart', () => {
        const result = current.normalizeDataType(DataTypes.GEOMETRY).toSql();

        expectsql(result, {
          default: 'GEOMETRY'
        });
      });

      it('Geometry point', () => {
        const result = current.normalizeDataType(DataTypes.GEOMETRY('POINT')).toSql();

        expectsql(result, {
          postgres: 'GEOMETRY(POINT)',
          mysql: 'POINT'
        });
      });

      it('Geometry linestring', () => {
        const result = current.normalizeDataType(DataTypes.GEOMETRY('LINESTRING')).toSql();

        expectsql(result, {
          postgres: 'GEOMETRY(LINESTRING)',
          mysql: 'LINESTRING'
        });
      });

      it('Geometry polygon', () => {
        const result = current.normalizeDataType(DataTypes.GEOMETRY('POLYGON')).toSql();

        expectsql(result, {
          postgres: 'GEOMETRY(POLYGON)',
          mysql: 'POLYGON'
        });
      });

      it('Geometry point (4326)', () => {
        const result = current.normalizeDataType(DataTypes.GEOMETRY('POINT', 4326)).toSql();

        expectsql(result, {
          postgres: 'GEOMETRY(POINT,4326)',
          mysql: 'POINT'
        });
      });
    });
  }
});
