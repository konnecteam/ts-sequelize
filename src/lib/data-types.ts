'use strict';

import * as _ from 'lodash';
import * as moment from 'moment';
import * as momentTz from 'moment-timezone';
import * as Wkt from 'terraformer-wkt-parser';
import * as util from 'util';
import * as sequelizeErrors from './errors/index';
import { Utils } from './utils';
import * as valid from './utils/validator-extras';

const Validator = valid.validator;
const warnings = {};


export class ABSTRACT {
  public dialectTypes : string = '';
  public key : string;
  public static types : {
    mssql?,
    mysql?,
    oracle?,
    postgres?,
    sqlite?
  } = {};

  public toString(options : {}) {
    return this.toSql(options);
  }

  public toSql(options? : {}) {
    return this.key;
  }

  public static warn(link : string, text : string) {
    if (!warnings[text]) {
      warnings[text] = true;
      Utils.warn(`${text}, '\n>> Check:', ${link}`);
    }
  }

  public stringify(value : any, options? : {}) {
    if ((this as any)._stringify) {
      return (this as any)._stringify(value, options);
    }
    return value;
  }
}

export class STRING extends ABSTRACT {
  public options : { binary? : boolean };
  protected _binary : boolean;
  protected _length : number;
  public static key : string = 'STRING';
  public static types : {
    mssql?,
    mysql?,
    oracle?,
    postgres?,
    sqlite?
  } = {};

  constructor(length? : number, binary? : boolean) {
    super();
    const options = typeof length === 'object' && length || {length, binary};
    this.options = options;
    this._binary = options.binary;
    this._length = options.length || 255;
    this.key = 'STRING';
  }

  public toSql() : string {
    return 'VARCHAR(' + this._length + ')' + (this._binary ? ' BINARY' : '');
  }

  public validate(value : any) : boolean {
    if (Object.prototype.toString.call(value) !== '[object String]') {
      if (this.options.binary && Buffer.isBuffer(value) || _.isNumber(value)) {
        return true;
      }
      throw new sequelizeErrors.ValidationError(util.format('%j is not a valid string', value));
    }

    return true;
  }

}


Object.defineProperty(STRING.prototype, 'BINARY', {
  get() {
    this._binary = true;
    this.options.binary = true;
    return this;
  }
});

export class CHAR extends STRING {
  public static key : string = 'CHAR';
  public static types : {
    mssql?,
    mysql?,
    oracle?,
    postgres?,
    sqlite?
  } = {};

  constructor(length?, binary?) {
    super(length, binary);
    this.key = 'CHAR';
  }

  public toSql() : string {
    return 'CHAR(' + this._length + ')' + (this._binary ? ' BINARY' : '');
  }
}

export class TEXT extends ABSTRACT {
  public options;
  public _length : string;
  public static key : string = 'TEXT';
  public static types : {
    mssql?,
    mysql?,
    oracle?,
    postgres?,
    sqlite?
  } = {};

  constructor(length?) {
    super();
    const options = typeof length === 'object' && length || {length};
    this.options = options;
    this._length = options.length || '';
    this.key = 'TEXT';
  }

  public toSql() : string {
    switch (this._length.toLowerCase()) {
      case 'tiny':
        return 'TINYTEXT';
      case 'medium':
        return 'MEDIUMTEXT';
      case 'long':
        return 'LONGTEXT';
      default:
        return this.key;
    }
  }

  public validate(value : any) : boolean {
    if (!_.isString(value)) {
      throw new sequelizeErrors.ValidationError(util.format('%j is not a valid string', value));
    }

    return true;
  }
}

export class NUMBER extends ABSTRACT {
  public options;
  public _length;
  public _zerofill : boolean;
  public _decimals : number;
  public _precision : number;
  public _scale : number;
  public _unsigned : boolean;
  public static key : string = 'NUMBER';
  public static types : {
    mssql?,
    mysql?,
    oracle?,
    postgres?,
    sqlite?
  } = {};

  constructor(options : { length? : number | { length : number }, zerofill? : boolean, decimals? : number, precision? : number, scale? : number, unsigned? : boolean }) {
    super();
    this.options = options;
    this._length = options.length;
    this._zerofill = options.zerofill;
    this._decimals = options.decimals;
    this._precision = options.precision;
    this._scale = options.scale;
    this._unsigned = options.unsigned;
    this.key = 'NUMBER';
  }

  public toSql() : string {
    let result = this.key;
    if (this._length) {
      result += '(' + this._length;
      if (typeof this._decimals === 'number') {
        result += ',' + this._decimals;
      }
      result += ')';
    }
    if (this._unsigned) {
      result += ' UNSIGNED';
    }
    if (this._zerofill) {
      result += ' ZEROFILL';
    }
    return result;
  }

  public validate(value : any) : boolean {
    if (!Validator.isFloat(String(value))) {
      throw new sequelizeErrors.ValidationError(util.format('%j is not a valid ' + _.toLower(this.key), value));
    }

    return true;
  }
}

Object.defineProperty(NUMBER.prototype, 'UNSIGNED', {
  get() {
    this._unsigned = true;
    this.options.unsigned = true;
    return this;
  }
});
Object.defineProperty(NUMBER.prototype, 'ZEROFILL', {
  get() {
    this._zerofill = true;
    this.options.zerofill = true;
    return this;
  }
});

export class INTEGER extends NUMBER {
  public static key : string = 'INTEGER';
  public static types : {
    mssql?,
    mysql?,
    oracle?,
    postgres?,
    sqlite?
  } = {};
  constructor(length? : number | { length : number }) {
    const options = typeof length === 'object' && length || {length};
    super(options);
    this.key = 'INTEGER';
  }

  public validate(value : any) : boolean {
    if (!Validator.isInt(String(value))) {
      throw new sequelizeErrors.ValidationError(util.format('%j is not a valid ' + _.toLower(this.key), value));
    }

    return true;
  }
}

export class TINYINT extends INTEGER {
  public static key : string = 'TINYINT';
  public static types : {
    mssql?,
    mysql?,
    oracle?,
    postgres?,
    sqlite?
  } = {};
  constructor(length? : number | { length : number }) {
    super(length);
    this.key = 'TINYINT';
  }
}

export class SMALLINT extends INTEGER {
  public static key : string = 'SMALLINT';
  public static types : {
    mssql?,
    mysql?,
    oracle?,
    postgres?,
    sqlite?
  } = {};
  constructor(length? : number | { length : number }) {
    super(length);
    this.key = 'SMALLINT';
  }
}

export class MEDIUMINT extends INTEGER {
  public static key : string = 'MEDIUMINT';
  public static types : {
    mssql?,
    mysql?,
    oracle?,
    postgres?,
    sqlite?
  } = {};
  constructor(length? : number | { length : number }) {
    super(length);
    this.key = 'MEDIUMINT';
  }
}

export class BIGINT extends INTEGER {
  public static key : string = 'BIGINT';
  public static types : {
    mssql?,
    mysql?,
    oracle?,
    postgres?,
    sqlite?
  } = {};
  constructor(length? : number | { length : number }) {
    super(length);
    this.key = 'BIGINT';
  }
}

export class FLOAT extends NUMBER {
  public escape : boolean;
  public static key : string = 'FLOAT';
  public static types : {
    mssql?,
    mysql?,
    oracle?,
    postgres?,
    sqlite?
  } = {};

  constructor(length? : number, decimals? : number) {
    const options = typeof length === 'object' && length || {length, decimals};
    super(options);
    this.escape = false;
    this.key = 'FLOAT';
  }

  public validate(value : any) : boolean {
    if (!Validator.isFloat(String(value))) {
      throw new sequelizeErrors.ValidationError(util.format('%j is not a valid float', value));
    }

    return true;
  }

  public _stringify(value : any) : string {
    if (isNaN(value)) {
      return "'NaN'";
    } else if (!isFinite(value)) {
      const sign = value < 0 ? '-' : '';
      return "'" + sign + "Infinity'";
    }

    return value;
  }
}

export class REAL extends NUMBER {
  public escape : boolean;
  public static key : string = 'REAL';
  public static types : {
    mssql?,
    mysql?,
    oracle?,
    postgres?,
    sqlite?
  } = {};

  constructor(length? : number, decimals? : number) {
    const options = typeof length === 'object' && length || {length, decimals};
    super(options);
    this.escape = false;
    this.key = 'REAL';
  }

  public _stringify(value : any) : string {
    if (isNaN(value)) {
      return "'NaN'";
    } else if (!isFinite(value)) {
      const sign = value < 0 ? '-' : '';
      return "'" + sign + "Infinity'";
    }

    return value;
  }
}

export class DOUBLE extends NUMBER {
  public escape : boolean;
  public static key : string = 'DOUBLE PRECISION';
  public static types : {
    mssql?,
    mysql?,
    oracle?,
    postgres?,
    sqlite?
  } = {};

  constructor(length? : number, decimals? : number) {
    const options = typeof length === 'object' && length || {length, decimals};
    super(options);
    this.escape = false;
    this.key = 'DOUBLE PRECISION';
  }

  public _stringify(value : any) : string {
    if (isNaN(value)) {
      return "'NaN'";
    } else if (!isFinite(value)) {
      const sign = value < 0 ? '-' : '';
      return "'" + sign + "Infinity'";
    }

    return value;
  }
}

export class DECIMAL extends NUMBER {
  public static key : string = 'DECIMAL';
  public static types : {
    mssql?,
    mysql?,
    oracle?,
    postgres?,
    sqlite?
  } = {};
  constructor(precision? : number, scale? : number) {
    const options = typeof precision === 'object' && precision || {precision, scale};
    super(options);
    this.key = 'DECIMAL';
  }

  public toSql() : string {
    if (this._precision || this._scale) {
      return 'DECIMAL(' + [this._precision, this._scale].filter(_.identity).join(',') + ')';
    }

    return 'DECIMAL';
  }

  public validate(value : any) : boolean {
    if (!Validator.isDecimal(String(value))) {
      throw new sequelizeErrors.ValidationError(util.format('%j is not a valid decimal', value));
    }

    return true;
  }
}

export class BOOLEAN extends ABSTRACT {
  public static key : string = 'BOOLEAN';
  public static types : {
    mssql?,
    mysql?,
    oracle?,
    postgres?,
    sqlite?
  } = {};

  constructor() {
    super();
    this.key = 'BOOLEAN';
  }

  public toSql() : string {
    return 'TINYINT(1)';
  }

  public validate(value : any) : boolean {
    if (!Validator.isBoolean(String(value))) {
      throw new sequelizeErrors.ValidationError(util.format('%j is not a valid boolean', value));
    }

    return true;
  }

  public _sanitize(value : any) : boolean {
    if (value !== null && value !== undefined) {
      if (Buffer.isBuffer(value) && value.length === 1) {
        // Bit fields are returned as buffers
        value = value[0];
      }

      if (_.isString(value)) {
        // Only take action on valid boolean strings.
        value = value === 'true' ? true : value === 'false' ? false : value;

      } else if (_.isNumber(value)) {
        // Only take action on valid boolean integers.
        value = value === 1 ? true : value === 0 ? false : value;
      }
    }

    return value;
  }

  public parse = this._sanitize;
}

export class TIME extends ABSTRACT {
  public static key : string = 'TIME';
  public static types : {
    mssql?,
    mysql?,
    oracle?,
    postgres?,
    sqlite?
  } = {};
  constructor() {
    super();
    this.key = 'TIME';
  }

  public toSql() : string {
    return 'TIME';
  }
}

export class DATE extends ABSTRACT {
  public options : {};
  public _length : number | string;
  public static key : string = 'DATE';
  public static types : {
    mssql?,
    mysql?,
    oracle?,
    postgres?,
    sqlite?
  } = {};
  constructor(length? : number) {
    super();
    const options = typeof length === 'object' && length || {length};
    this.options = options;
    this._length = options.length || '';
    this.key = 'DATE';
  }

  public toSql() : string {
    return 'DATETIME';
  }

  public validate(value : any) : boolean {
    if (!Validator.isDate(String(value))) {
      throw new sequelizeErrors.ValidationError(util.format('%j is not a valid date', value));
    }

    return true;
  }

  public _sanitize(value : any, options : { raw? }) : Date {
    if ((!options || options && !options.raw) && !(value instanceof Date) && !!value) {
      return new Date(value);
    }

    return value;
  }

  public _isChanged(value : Date, originalValue : Date) : boolean {
    if (
      originalValue && !!value &&
      (
        value === originalValue ||
        value instanceof Date && originalValue instanceof Date && value.getTime() === originalValue.getTime()
      )
    ) {
      return false;
    }

    // not changed when set to same empty value
    if (!originalValue && !value && originalValue === value) {
      return false;
    }

    return true;
  }

  public _applyTimezone(date : moment.Moment, options : { timezone? : string }) : moment.Moment {
    if (options.timezone) {
      if (momentTz.tz.zone(options.timezone)) {
        date = momentTz(date).tz(options.timezone);
      } else {
        date = moment(date).utcOffset(options.timezone);
      }
    } else {
      date = momentTz(date);
    }

    return date;
  }

  public _stringify(date : moment.Moment, options : {}) : string {
    date = this._applyTimezone(date, options);

    // Z here means current timezone, _not_ UTC
    return date.format('YYYY-MM-DD HH:mm:ss.SSS Z');
  }
}

export class DATEONLY extends ABSTRACT {
  public static key : string = 'DATEONLY';
  public static types : {
    mssql?,
    mysql?,
    oracle?,
    postgres?,
    sqlite?
  } = {};
  constructor() {
    super();
    this.key = 'DATEONLY';
  }

  public toSql() : string {
    return 'DATE';
  }

  public _stringify(date : Date, options? : {}) : string {
    return moment(date).format('YYYY-MM-DD');
  }

  public _sanitize(value : Date, options? : { raw? }) {
    if ((!options || options && !options.raw) && !!value) {
      return moment(value).format('YYYY-MM-DD');
    }

    return value;
  }

  public _isChanged(value : Date, originalValue : Date) {
    if (originalValue && !!value && originalValue === value) {
      return false;
    }

    // not changed when set to same empty value
    if (!originalValue && !value && originalValue === value) {
      return false;
    }

    return true;
  }
}

export class HSTORE extends ABSTRACT {
  public static key : string = 'HSTORE';
  public static types : {
    mssql?,
    mysql?,
    oracle?,
    postgres?,
    sqlite?
  } = {};
  constructor() {
    super();
    this.key = 'HSTORE';
  }

  public validate(value : any) : boolean {
    if (!_.isPlainObject(value)) {
      throw new sequelizeErrors.ValidationError(util.format('%j is not a valid hstore', value));
    }

    return true;
  }
}

export class JSONTYPE extends ABSTRACT {
  public static key : string = 'JSON';
  public static types : {
    mssql?,
    mysql?,
    oracle?,
    postgres?,
    sqlite?
  } = {};
  constructor() {
    super();
    this.key = 'JSON';
  }

  public validate() : boolean {
    return true;
  }

  public _stringify(value : any) : string {
    return JSON.stringify(value);
  }
}

export class JSONB extends JSONTYPE {
  public static key : string = 'JSONB';
  public static types : {
    mssql?,
    mysql?,
    oracle?,
    postgres?,
    sqlite?
  } = {};
  constructor() {
    super();
    this.key = 'JSONB';
  }
}

export class NOW extends ABSTRACT {
  public static key : string = 'NOW';
  public static types : {
    mssql?,
    mysql?,
    oracle?,
    postgres?,
    sqlite?
  } = {};
  constructor() {
    super();
    this.key = 'NOW';
  }
}

export class BLOB extends ABSTRACT {
  public options : {};
  public _length : any;
  public escape : boolean = false;
  public static key : string = 'BLOB';
  public static types : {
    mssql?,
    mysql?,
    oracle?,
    postgres?,
    sqlite?
  } = {};

  constructor(length? : any) {
    super();
    const options = typeof length === 'object' && length || {length};
    this.options = options;
    this._length = options.length || '';
    this.key = 'BLOB';
  }

  public toSql() : string {
    switch (this._length.toLowerCase()) {
      case 'tiny':
        return 'TINYBLOB';
      case 'medium':
        return 'MEDIUMBLOB';
      case 'long':
        return 'LONGBLOB';
      default:
        return this.key;
    }
  }

  public validate(value : any) : boolean {
    if (!_.isString(value) && !Buffer.isBuffer(value)) {
      throw new sequelizeErrors.ValidationError(util.format('%j is not a valid blob', value));
    }

    return true;
  }

  public _stringify(value : any) : string {
    if (!Buffer.isBuffer(value)) {
      if (Array.isArray(value)) {
        value = new Buffer(value);
      } else {
        value = new Buffer(value.toString());
      }
    }
    const hex = value.toString('hex');

    return this._hexify(hex);
  }

  public _hexify(hex : string) : string {
    return "X'" + hex + "'";
  }
}

const pgRangeSubtypes = {
  integer: 'int4range',
  bigint: 'int8range',
  decimal: 'numrange',
  dateonly: 'daterange',
  date: 'tstzrange',
  datenotz: 'tsrange'
};

const pgRangeCastTypes = {
  integer: 'integer',
  bigint: 'bigint',
  decimal: 'numeric',
  dateonly: 'date',
  date: 'timestamptz',
  datenotz: 'timestamp'
};

export class RANGE extends ABSTRACT {
  public _subtype : any;
  public options : { subtype? };
  public static key : string = 'RANGE';
  public static types : {
    mssql?,
    mysql?,
    oracle?,
    postgres?,
    sqlite?
  } = {};

  constructor(subtype? : any) {
    super();
    const options = _.isPlainObject(subtype) ? subtype : {subtype};

    if (!options.subtype) {
      options.subtype = new INTEGER();
    }

    if (_.isFunction(options.subtype)) {
      options.subtype = new options.subtype();
    }

    this._subtype = options.subtype.key;
    this.options = options;
    this.key = 'RANGE';
  }

  public toSql() : string {
    return pgRangeSubtypes[this._subtype.toLowerCase()];
  }

  public toCastType() {
    return pgRangeCastTypes[this._subtype.toLowerCase()];
  }

  public validate(value : any) : boolean {
    if (_.isPlainObject(value) && value.inclusive) {
      value = value.inclusive;
    }

    if (!_.isArray(value)) {
      throw new sequelizeErrors.ValidationError(util.format('%j is not a valid range', value));
    }

    if (value.length !== 2) {
      throw new sequelizeErrors.ValidationError('A range must be an array with two elements');
    }

    return true;
  }
}

export class UUID extends ABSTRACT {
  public static key : string = 'UUID';
  public static types : {
    mssql?,
    mysql?,
    oracle?,
    postgres?,
    sqlite?
  } = {};
  constructor() {
    super();
    this.key = 'UUID';
  }

  public validate(value : any, options? : { acceptStrings? : boolean}) : boolean {
    if (!_.isString(value) || !Validator.isUUID(value) && (!options || !options.acceptStrings)) {
      throw new sequelizeErrors.ValidationError(util.format('%j is not a valid uuid', value));
    }

    return true;
  }
}

export class UUIDV1 extends ABSTRACT {
  public static key : string = 'UUIDV1';
  public static types : {
    mssql?,
    mysql?,
    oracle?,
    postgres?,
    sqlite?
  } = {};
  constructor() {
    super();
    this.key = 'UUIDV1';
  }

  public validate(value : any, options? : { acceptStrings? : boolean}) : boolean {
    if (!_.isString(value) || !Validator.isUUID(value) && (!options || !options.acceptStrings)) {
      throw new sequelizeErrors.ValidationError(util.format('%j is not a valid uuid', value));
    }

    return true;
  }
}

export class UUIDV4 extends ABSTRACT {
  public static key : string = 'UUIDV4';
  public static types : {
    mssql?,
    mysql?,
    oracle?,
    postgres?,
    sqlite?
  } = {};
  constructor() {
    super();
    this.key = 'UUIDV4';
  }

  public validate(value : any, options? : { acceptStrings? : boolean}) : boolean {
    if (!_.isString(value) || !Validator.isUUID(value, 4) && (!options || !options.acceptStrings)) {
      throw new sequelizeErrors.ValidationError(util.format('%j is not a valid uuidv4', value));
    }

    return true;
  }
}

export class VIRTUAL extends ABSTRACT {
  public returnType : any;
  public fields : any;
  public static key : string = 'VIRTUAL';
  public static types : {
    mssql?,
    mysql?,
    oracle?,
    postgres?,
    sqlite?
  } = {};

  constructor(ReturnType? : any, fields? : any) {
    super();
    if (typeof ReturnType === 'function') {
      ReturnType = new ReturnType();
    }

    this.returnType = ReturnType;
    this.fields = fields;
    this.key = 'VIRTUAL';
  }
}

export class ENUM extends ABSTRACT {
  public values : any;
  public options : {};
  public static key : string = 'ENUM';
  public static types : {
    mssql?,
    mysql?,
    oracle?,
    postgres?,
    sqlite?
  } = {};

  constructor(value? : any) {
    super();
    const options = typeof value === 'object' && !Array.isArray(value) && value || {
      values: Array.prototype.slice.call(arguments).reduce((result, element) => {
        return result.concat(Array.isArray(element) ? element : [element]);
      }, [])
    };
    this.values = options.values;
    this.options = options;
    this.key = 'ENUM';
  }

  public validate(value : any) : boolean {
    if (!_.includes(this.values, value)) {
      throw new sequelizeErrors.ValidationError(util.format('%j is not a valid choice in %j', value, this.values));
    }

    return true;
  }
}

export class ARRAY extends ABSTRACT {
  public type : any;
  public static key : string = 'ARRAY';
  public static types : {
    mssql?,
    mysql?,
    oracle?,
    postgres?,
    sqlite?
  } = {};

  constructor(type? : any) {
    super();
    const options = _.isPlainObject(type) ? type : {type};
    this.type = typeof options.type === 'function' ? new options.type() : options.type;
    this.key = 'ARRAY';
  }

  public toSql() : string {
    return this.type.toSql() + '[]';
  }

  public validate(value : any) : boolean {
    if (!_.isArray(value)) {
      throw new sequelizeErrors.ValidationError(util.format('%j is not a valid array', value));
    }

    return true;
  }

  public static is(obj : any, type : any) : boolean {
    return obj instanceof ARRAY && obj.type instanceof type;
  }
}

export class GEOMETRY extends ABSTRACT {
  public options : {};
  public type : string;
  public srid : number;
  public escape : boolean = false;
  public static key : string = 'GEOMETRY';
  public static types : {
    mssql?,
    mysql?,
    oracle?,
    postgres?,
    sqlite?
  } = {};

  constructor(type? : any, srid? : number) {
    super();
    const options = _.isPlainObject(type) ? type : {type, srid};
    this.options = options;
    this.type = options.type;
    this.srid = options.srid;
    this.key = 'GEOMETRY';
  }

  public _stringify(value : any, options : { escape }) {
    return 'GeomFromText(' + options.escape(Wkt.convert(value)) + ')';
  }
}

export class GEOGRAPHY extends ABSTRACT {
  public options : {};
  public type : string;
  public srid : number;
  public escape : boolean = false;
  public static key : string = 'GEOGRAPHY';
  public static types : {
    mssql?,
    mysql?,
    oracle?,
    postgres?,
    sqlite?
  } = {};

  constructor(type? : any, srid? : number) {
    super();
    const options = _.isPlainObject(type) ? type : {type, srid};
    this.options = options;
    this.type = options.type;
    this.srid = options.srid;
    this.key = 'GEOGRAPHY';
  }

  public _stringify(value : any, options : { escape? }) {
    return 'GeomFromText(' + options.escape(Wkt.convert(value)) + ')';
  }
}

const helpers = {
  BINARY: [STRING, CHAR],
  UNSIGNED: [TINYINT, SMALLINT, MEDIUMINT, INTEGER, BIGINT, FLOAT, DOUBLE, REAL, DECIMAL],
  ZEROFILL: [TINYINT, SMALLINT, MEDIUMINT, INTEGER, BIGINT, FLOAT, DOUBLE, REAL, DECIMAL],
  PRECISION: [DECIMAL],
  SCALE: [DECIMAL]
};


for (const helper of Object.keys(helpers)) {
  for (const DataType of helpers[helper]) {
    if (!DataType[helper]) {
      Object.defineProperty(DataType, helper, {
        get() {
          const dataType = new DataType();
          if (typeof dataType[helper] === 'object') {
            return dataType;
          }
          return dataType[helper].apply(dataType, arguments);
        }
      });
    }
  }
}

/**
 * A convenience class holding commonly used data types. The datatypes are used when defining a new model using `Sequelize.define`, like this:
 * ```js
 * sequelize.define('model', {
 *   column: DataTypes.INTEGER
 * })
 * ```
 * When defining a model you can just as easily pass a string as type, but often using the types defined here is beneficial. For example, using `DataTypes.BLOB`, mean
 * that that column will be returned as an instance of `Buffer` when being fetched by sequelize.
 *
 * To provide a length for the data type, you can invoke it like a function: `INTEGER(2)`
 *
 * Some data types have special properties that can be accessed in order to change the data type.
 * For example, to get an unsigned integer with zerofill you can do `DataTypes.INTEGER.UNSIGNED.ZEROFILL`.
 * The order you access the properties in do not matter, so `DataTypes.INTEGER.ZEROFILL.UNSIGNED` is fine as well.
 *
 * * All number types (`INTEGER`, `BIGINT`, `FLOAT`, `DOUBLE`, `REAL`, `DECIMAL`) expose the properties `UNSIGNED` and `ZEROFILL`
 * * The `CHAR` and `STRING` types expose the `BINARY` property
 *
 *
 * Three of the values provided here (`NOW`, `UUIDV1` and `UUIDV4`) are special default values, that should not be used to define types. Instead they are used as shorthands for
 * defining default values. For example, to get a uuid field with a default value generated following v1 of the UUID standard:
 * ```js`
 * sequelize.define('model',` {
 *   uuid: {
 *     type: DataTypes.UUID,
 *     defaultValue: DataTypes.UUIDV1,
 *     primaryKey: true
 *   }
 * })
 * ```
 * There may be times when you want to generate your own UUID conforming to some other algorithm. This is accomplished
 * using the defaultValue property as well, but instead of specifying one of the supplied UUID types, you return a value
 * from a function.
 * ```js
 * sequelize.define('model', {
 *   uuid: {
 *     type: DataTypes.UUID,
 *     defaultValue: function() {
 *       return generateMyId()
 *     },
 *     primaryKey: true
 *   }
 * })
 * ```
 *
 * @property {function(length=255: integer)} STRING A variable length string
 * @property {function(length=255: integer)} CHAR A fixed length string.
 * @property {function(length: string)} TEXT An unlimited length text column. Available lengths: `tiny`, `medium`, `long`
 * @property {function(length: integer)} TINYINT A 8 bit integer.
 * @property {function(length: integer)} SMALLINT A 16 bit integer.
 * @property {function(length: integer)} MEDIUMINT A 24 bit integer.
 * @property {function(length=255: integer)} INTEGER A 32 bit integer.
 * @property {function(length: integer)} BIGINT A 64 bit integer. Note: an attribute defined as `BIGINT` will be treated like a `string` due this [feature from node-postgres](https://github.com/brianc/node-postgres/pull/353)
 * to prevent precision loss.To have this attribute as a `number`, this is a possible [workaround](https://github.com/sequelize/sequelize/issues/2383#issuecomment-58006083).
 * @property {function(length: integer, decimals: integer)} FLOAT Floating point number (4-byte precision).
 * @property {function(length: integer, decimals: integer)} DOUBLE Floating point number (8-byte precision).
 * @property {function(precision: integer, scale: integer)} DECIMAL Decimal number.
 * @property {function(length: integer, decimals: integer)} REAL Floating point number (4-byte precision).
 * @property {function} BOOLEAN A boolean / tinyint column, depending on dialect
 * @property {function(length: string)} BLOB Binary storage. Available lengths: `tiny`, `medium`, `long`
 * @property {function(values: string[])} ENUM An enumeration. `DataTypes.ENUM('value', 'another value')`.
 * @property {function(length: integer)} DATE A datetime column
 * @property {function} DATEONLY A date only column (no timestamp)
 * @property {function} TIME A time column
 * @property {function} NOW A default value of the current timestamp
 * @property {function} UUID A column storing a unique universal identifier. Use with `UUIDV1` or `UUIDV4` for default values.
 * @property {function} UUIDV1 A default unique universal identifier generated following the UUID v1 standard
 * @property {function} UUIDV4 A default unique universal identifier generated following the UUID v4 standard
 * @property {function} HSTORE A key / value store column. Only available in Postgres.
 * @property {function} JSON A JSON string column. Available in MySQL, Postgres and SQLite
 * @property {function} JSONB A binary storage JSON column. Only available in Postgres.
 * @property {function(type: DataTypes)} ARRAY An array of `type`, e.g. `DataTypes.ARRAY(DataTypes.DECIMAL)`. Only available in Postgres.
 * @property {function(type: DataTypes)} RANGE Range types are data types representing a range of values of some element type (called the range's subtype).
 * Only available in Postgres. See [the Postgres documentation](http://www.postgresql.org/docs/9.4/static/rangetypes.html) for more details
 * @property {function(type: string, srid: string)} GEOMETRY A column storing Geometry information. It is only available in PostgreSQL (with PostGIS) or MySQL.
 * In MySQL, allowable Geometry types are `POINT`, `LINESTRING`, `POLYGON`.
 *
 * GeoJSON is accepted as input and returned as output.
 * In PostGIS, the GeoJSON is parsed using the PostGIS function `ST_GeomFromGeoJSON`.
 * In MySQL it is parsed using the function `GeomFromText`.
 * Therefore, one can just follow the [GeoJSON spec](http://geojson.org/geojson-spec.html) for handling geometry objects.  See the following examples:
 *
 * ```js
 * // Create a new point:
 * const point = { type: 'Point', coordinates: [39.807222,-76.984722]};
 *
 * User.create({username: 'username', geometry: point });
 *
 * // Create a new linestring:
 * const line = { type: 'LineString', 'coordinates': [ [100.0, 0.0], [101.0, 1.0] ] };
 *
 * User.create({username: 'username', geometry: line });
 *
 * // Create a new polygon:
 * const polygon = { type: 'Polygon', coordinates: [
 *                 [ [100.0, 0.0], [101.0, 0.0], [101.0, 1.0],
 *                   [100.0, 1.0], [100.0, 0.0] ]
 *                 ]};
 *
 * User.create({username: 'username', geometry: polygon });
 * // Create a new point with a custom SRID:
 * const point = {
 *   type: 'Point',
 *   coordinates: [39.807222,-76.984722],
 *   crs: { type: 'name', properties: { name: 'EPSG:4326'} }
 * };
 *
 * User.create({username: 'username', geometry: point })
 * ```
 * @property {function(type: string, srid: string)} GEOGRAPHY A geography datatype represents two dimensional spacial objects in an elliptic coord system.
 * @property {function(returnType: DataTypes, fields: string[])} VIRTUAL A virtual value that is not stored in the DB.
 * This could for example be useful if you want to provide a default value in your model that is returned to the user but not stored in the DB.
 *
 * You could also use it to validate a value before permuting and storing it. Checking password length before hashing it for example:
 * ```js
 * sequelize.define('user', {
 *   password_hash: DataTypes.STRING,
 *   password: {
 *     type: DataTypes.VIRTUAL,
 *     set: function (val) {
 *        // Remember to set the data value, otherwise it won't be validated
 *        this.setDataValue('password', val);
 *        this.setDataValue('password_hash', this.salt + val);
 *      },
 *      validate: {
 *         isLongEnough: function (val) {
 *           if (val.length < 7) {
 *             throw new Error("Please choose a longer password")
 *          }
 *       }
 *     }
 *   }
 * })
 * ```
 * In the above code the password is stored plainly in the password field so it can be validated, but is never stored in the DB.
 *
 * VIRTUAL also takes a return type and dependency fields as arguments
 * If a virtual attribute is present in `attributes` it will automatically pull in the extra fields as well.
 * Return type is mostly useful for setups that rely on types like GraphQL.
 * ```js
 * {
 *   active: {
 *     type: new DataTypes.VIRTUAL(DataTypes.BOOLEAN, ['createdAt']),
 *     get: function() {
 *       return this.get('createdAt') > Date.now() - (7 * 24 * 60 * 60 * 1000)
 *     }
 *   }
 * }
 * ```
 */

export interface IDataTypes {
  ABSTRACT; STRING; CHAR; TEXT; NUMBER; TINYINT; SMALLINT; MEDIUMINT; INTEGER; BIGINT;
  FLOAT; TIME; DATE; DATEONLY; BOOLEAN; NOW; BLOB; DECIMAL; NUMERIC; UUID; UUIDV1; UUIDV4; HSTORE;
  JSON; JSONB; VIRTUAL; ARRAY; NONE; ENUM; RANGE; REAL; DOUBLE; 'DOUBLE PRECISION'; GEOMETRY;
  GEOGRAPHY; mysql; mssql; oracle; postgres; sqlite;
}

const DataTypes : IDataTypes = {
  ABSTRACT,
  STRING,
  CHAR,
  TEXT,
  NUMBER,
  TINYINT,
  SMALLINT,
  MEDIUMINT,
  INTEGER,
  BIGINT,
  FLOAT,
  TIME,
  DATE,
  DATEONLY,
  BOOLEAN,
  NOW,
  BLOB,
  DECIMAL,
  'NUMERIC': DECIMAL,
  UUID,
  UUIDV1,
  UUIDV4,
  HSTORE,
  'JSON' : JSONTYPE,
  JSONB,
  VIRTUAL,
  ARRAY,
  'NONE': VIRTUAL,
  ENUM,
  RANGE,
  REAL,
  DOUBLE,
  'DOUBLE PRECISION': DOUBLE,
  GEOMETRY,
  GEOGRAPHY,
  'mssql': {},
  'mysql': {},
  'oracle': {},
  'postgres': {},
  'sqlite': {}
};

import mssql from './dialects/mssql/mssql-data-types';
DataTypes.mssql = mssql;
import mysql from './dialects/mysql/mysql-data-types';
DataTypes.mysql = mysql;
import oracle from './dialects/oracle/oracle-data-types';
DataTypes.oracle = oracle;
import postgres from './dialects/postgres/postgres-data-types';
DataTypes.postgres = postgres;
import sqlite from './dialects/sqlite/sqlite-data-types';
DataTypes.sqlite = sqlite;

export default DataTypes;
