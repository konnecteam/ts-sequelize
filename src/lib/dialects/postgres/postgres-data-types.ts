'use strict';

import * as _ from 'lodash';
import * as wkx from 'wkx';
import * as BaseTypes from '../../data-types';
import { Utils } from '../../utils';
import { Range } from './range';


const warn = BaseTypes.ABSTRACT.warn.bind(undefined, 'http://www.postgresql.org/docs/9.4/static/datatype.html');

/**
 * types:
 * {
 *   oids: [oid],
 *   array_oids: [oid]
 * }
 * @see oid here https://github.com/lib/pq/blob/master/oid/types.go
 */

BaseTypes.UUID.types.postgres = {
  oids: [2950],
  array_oids: [2951]
};

BaseTypes.JSONTYPE.types.postgres = {
  oids: [114],
  array_oids: [199]
};

BaseTypes.JSONB.types.postgres = {
  oids: [3802],
  array_oids: [3807]
};

BaseTypes.TIME.types.postgres = {
  oids: [1083],
  array_oids: [1183]
};

export class DATEONLY extends BaseTypes.DATEONLY {
  public static parse(value) {
    if (value === 'infinity') {
      value = Infinity;
    } else if (value === '-infinity') {
      value = -Infinity;
    }

    return value;
  }

  public _stringify(value, options?) {
    if (value === Infinity) {
      return 'Infinity';
    } else if (value === -Infinity) {
      return '-Infinity';
    }

    return super._stringify(value, options);
  }

  public _sanitize(value, options) {
    if ((!options || options && !options.raw) && value !== Infinity && value !== -Infinity) {
      if (_.isString(value)) {
        if (_.toLower(value) === 'infinity') {
          return Infinity;
        } else if (_.toLower(value) === '-infinity') {
          return -Infinity;
        }
      }
      return super._sanitize(value);
    }
    return value;
  }
}


BaseTypes.DATEONLY.types.postgres = {
  oids: [1082],
  array_oids: [1182]
};

export class DECIMAL extends BaseTypes.DECIMAL {
  public static parse(value) {
    return value;
  }
}

// numeric
BaseTypes.DECIMAL.types.postgres = {
  oids: [1700],
  array_oids: [1231]
};

export class STRING extends BaseTypes.STRING {
  public toSql() : string  {
    if (this._binary) {
      return 'BYTEA';
    }
    return super.toSql();
  }
}

BaseTypes.STRING.types.postgres = {
  oids: [1043],
  array_oids: [1015]
};

export class TEXT extends BaseTypes.TEXT {
  public toSql() : string  {
    if (this._length) {
      warn('PostgreSQL does not support TEXT with options. Plain `TEXT` will be used instead.');
      this._length = undefined;
    }
    return 'TEXT';
  }
}

BaseTypes.TEXT.types.postgres = {
  oids: [25],
  array_oids: [1009]
};

export class CHAR extends BaseTypes.CHAR {
  public toSql() : string  {
    if (this._binary) {
      return 'BYTEA';
    }
    return super.toSql();
  }
}

BaseTypes.CHAR.types.postgres = {
  oids: [18, 1042],
  array_oids: [1002, 1014]
};

export class BOOLEAN extends BaseTypes.BOOLEAN {
  public toSql() : string  {
    return 'BOOLEAN';
  }

  public _sanitize(value) {
    if (value !== null && value !== undefined) {
      if (Buffer.isBuffer(value) && value.length === 1) {
        // Bit fields are returned as buffers
        value = value[0];
      }

      if (_.isString(value)) {
        // Only take action on valid boolean strings.
        value = value === 'true' || value === 't' ? true : value === 'false' || value === 'f' ? false : value;

      } else if (_.isNumber(value)) {
        // Only take action on valid boolean integers.
        value = value === 1 ? true : value === 0 ? false : value;
      }
    }

    return value;
  }

  public parse = this._sanitize;
}

BaseTypes.BOOLEAN.types.postgres = {
  oids: [16],
  array_oids: [1000]
};

export class DATE extends BaseTypes.DATE {
  public toSql() : string  {
    return 'TIMESTAMP WITH TIME ZONE';
  }

  public validate(value) {
    if (value !== Infinity && value !== -Infinity) {
      return super.validate(value);
    }

    return true;
  }

  public _stringify(value, options) {
    if (value === Infinity) {
      return 'Infinity';
    } else if (value === -Infinity) {
      return '-Infinity';
    }

    return super._stringify(value, options);
  }

  public _sanitize(value, options) {
    if ((!options || options && !options.raw) && !(value instanceof Date) && !!value && value !== Infinity && value !== -Infinity) {
      if (_.isString(value)) {
        if (_.toLower(value) === 'infinity') {
          return Infinity;
        } else if (_.toLower(value) === '-infinity') {
          return -Infinity;
        }
      }

      return new Date(value);
    }

    return value;
  }
}

BaseTypes.DATE.types.postgres = {
  oids: [1184],
  array_oids: [1185]
};

export class NOW extends BaseTypes.NOW {
  public toSql() : string  {
    return 'CURRENT_DATE';
  }
}

export class SMALLINT extends BaseTypes.SMALLINT {
  constructor(length) {
    super(length);

    // POSTGRES does not support any parameters for bigint
    if (this._length || this.options.length || this._unsigned || this._zerofill) {
      warn('PostgreSQL does not support SMALLINT with options. Plain `SMALLINT` will be used instead.');
      this._length = undefined;
      this.options.length = undefined;
      this._unsigned = undefined;
      this._zerofill = undefined;
    }
  }
}

// int2
BaseTypes.SMALLINT.types.postgres = {
  oids: [21],
  array_oids: [1005]
};

export class INTEGER extends BaseTypes.INTEGER {
  constructor(length) {
    super(length);

    // POSTGRES does not support any parameters for bigint
    if (this._length || this.options.length || this._unsigned || this._zerofill) {
      warn('PostgreSQL does not support INTEGER with options. Plain `INTEGER` will be used instead.');
      this._length = undefined;
      this.options.length = undefined;
      this._unsigned = undefined;
      this._zerofill = undefined;
    }
  }

  public static parse(value) {
    return parseInt(value, 10);
  }
}

// int4
BaseTypes.INTEGER.types.postgres = {
  oids: [23],
  array_oids: [1007]
};

export class BIGINT extends BaseTypes.BIGINT {
  constructor(length) {
    super(length);

    // POSTGRES does not support any parameters for bigint
    if (this._length || this.options.length || this._unsigned || this._zerofill) {
      warn('PostgreSQL does not support BIGINT with options. Plain `BIGINT` will be used instead.');
      this._length = undefined;
      this.options.length = undefined;
      this._unsigned = undefined;
      this._zerofill = undefined;
    }
  }
}

// int8
BaseTypes.BIGINT.types.postgres = {
  oids: [20],
  array_oids: [1016]
};

export class REAL extends BaseTypes.REAL {
  constructor(length, decimals) {
    super(length, decimals);

    // POSTGRES does not support any parameters for bigint
    if (this._length || this.options.length || this._unsigned || this._zerofill) {
      warn('PostgreSQL does not support REAL with options. Plain `REAL` will be used instead.');
      this._length = undefined;
      this.options.length = undefined;
      this._unsigned = undefined;
      this._zerofill = undefined;
    }
  }
}

// float4
BaseTypes.REAL.types.postgres = {
  oids: [700],
  array_oids: [1021]
};

export class DOUBLE extends BaseTypes.DOUBLE {
  constructor(length, decimals) {
    super(length, decimals);

    // POSTGRES does not support any parameters for bigint
    if (this._length || this.options.length || this._unsigned || this._zerofill) {
      warn('PostgreSQL does not support DOUBLE with options. Plain `DOUBLE` will be used instead.');
      this._length = undefined;
      this.options.length = undefined;
      this._unsigned = undefined;
      this._zerofill = undefined;
    }
  }
}

// float8
BaseTypes.DOUBLE.types.postgres = {
  oids: [701],
  array_oids: [1022]
};

export class FLOAT extends BaseTypes.FLOAT {
  constructor(length, decimals) {
    super(length, decimals);

    // POSTGRES does only support lengths as parameter.
    // Values between 1-24 result in REAL
    // Values between 25-53 result in DOUBLE PRECISION
    // If decimals are provided remove these and print a warning
    if (this._decimals) {
      warn('PostgreSQL does not support FLOAT with decimals. Plain `FLOAT` will be used instead.');
      this._length = undefined;
      this.options.length = undefined;
      this._decimals = undefined;
    }
    if (this._unsigned) {
      warn('PostgreSQL does not support FLOAT unsigned. `UNSIGNED` was removed.');
      this._unsigned = undefined;
    }
    if (this._zerofill) {
      warn('PostgreSQL does not support FLOAT zerofill. `ZEROFILL` was removed.');
      this._zerofill = undefined;
    }
  }
}

export class BLOB extends BaseTypes.BLOB {
  public toSql() : string  {
    if (this._length) {
      warn('PostgreSQL does not support BLOB (BYTEA) with options. Plain `BYTEA` will be used instead.');
      this._length = undefined;
    }
    return 'BYTEA';
  }

  public _hexify(hex) {
    // bytea hex format http://www.postgresql.org/docs/current/static/datatype-binary.html
    return "E'\\\\x" + hex + "'";
  }
}

BaseTypes.BLOB.types.postgres = {
  oids: [17],
  array_oids: [1001]
};

export class GEOMETRY extends BaseTypes.GEOMETRY {
  public toSql() : string  {
    let result = this.key;

    if (this.type) {
      result += '(' + this.type;

      if (this.srid) {
        result += ',' + this.srid;
      }

      result += ')';
    }

    return result;
  }

  public static parse(value) {
    const b = Buffer.from(value, 'hex');
    return wkx.Geometry.parse(b).toGeoJSON();
  }

  public _stringify(value, options) {
    return 'ST_GeomFromGeoJSON(' + options.escape(JSON.stringify(value)) + ')';
  }

  public _bindParam(value, options) {
    return 'ST_GeomFromGeoJSON(' + options.bindParam(value) + ')';
  }
}

BaseTypes.GEOMETRY.types.postgres = {
  oids: [],
  array_oids: []
};

export class GEOGRAPHY extends BaseTypes.GEOGRAPHY {
  public toSql() : string  {
    let result = 'GEOGRAPHY';
    if (this.type) {
      result += '(' + this.type;
      if (this.srid) {
        result += ',' + this.srid;
      }
      result += ')';
    }
    return result;
  }

  public static parse(value) {
    const b = Buffer.from(value, 'hex');
    return wkx.Geometry.parse(b).toGeoJSON();
  }

  public _stringify(value, options) {
    return 'ST_GeomFromGeoJSON(' + options.escape(JSON.stringify(value)) + ')';
  }

  public bindParam(value, options) {
    return 'ST_GeomFromGeoJSON(' + options.bindParam(value) + ')';
  }
}

BaseTypes.GEOGRAPHY.types.postgres = {
  oids: [],
  array_oids: []
};

let hstore;
export class HSTORE extends BaseTypes.HSTORE {
  public escape : boolean = false;

  constructor() {
    super();
    if (!hstore) {
      // All datatype files are loaded at import - make sure we don't load the hstore parser before a hstore is instantiated
      hstore = require('./hstore')['Hstore'];
    }
  }

  public static parse(value) {
    if (!hstore) {
      // All datatype files are loaded at import - make sure we don't load the hstore parser before a hstore is instantiated
      hstore = require('./hstore')['Hstore'];
    }
    return hstore.parse(value);
  }

  private _value(value) {
    if (!hstore) {
      // All datatype files are loaded at import - make sure we don't load the hstore parser before a hstore is instantiated
      hstore = require('./hstore')['Hstore'];
    }
    return hstore.stringify(value);
  }

  public _stringify(value) {
    return "'" + this._value(value) + "'";
  }

  public _bindParam(value, options) {
    return options.bindParam(this._value(value));
  }
}

BaseTypes.HSTORE.types.postgres = {
  oids: [],
  array_oids: []
};

export class RANGE extends BaseTypes.RANGE {
  public escape : boolean = false;
  public static oid_map = {
    3904: 23, // int4
    3905: 23,
    3906: 1700, // Numeric
    3907: 1700,
    3908: 1114, // timestamp
    3909: 1114,
    3910: 1184, // timestamptz
    3911: 1184,
    3912: 1082, // date
    3913: 1082,
    3926: 20,    // int8
    3927: 20
  };

  public static parse(value, oid, getTypeParser) {
    const parser = getTypeParser(RANGE.oid_map[oid]);

    return Range.parse(value, parser);
  }

  public _stringify(values, options) {
    const value = this._value(values, options);
    if (!Array.isArray(values)) {
      return `'${value}'::` + this.toCastType();
    }
    return `'${value}'`;
  }

  public _bindParam(values, options) {
    const value = this._value(values, options);
    if (!Array.isArray(values)) {
      return options.bindParam(value) + '::' + this.toCastType();
    }
    return options.bindParam(value);
  }

  public _value(values, options) {
    if (!Array.isArray(values)) {
      return this.options.subtype.stringify(values, options);
    }

    const valueInclusivity = [true, false];
    const valuesStringified = values.map((value, index) => {
      if (_.isObject(value) && value.hasOwnProperty('value')) {
        if (value.hasOwnProperty('inclusive')) {
          valueInclusivity[index] = value.inclusive;
        }
        value = value.value;
      }
      if (_.includes([null, -Infinity, Infinity], value)) {
        // Pass through "unbounded" bounds unchanged
        return value;
      } else if (this.options.subtype.stringify) {
        return this.options.subtype.stringify(value, options);
      } else {
        return options.escape(value);
      }
    });

    // Array.map does not preserve extra array properties
    (valuesStringified as any).inclusive = valueInclusivity;

    return Range.stringify(valuesStringified);
  }
}

BaseTypes.RANGE.types.postgres = {
  oids: [3904, 3906, 3908, 3910, 3912, 3926],
  array_oids: [3905, 3907, 3909, 3911, 3913, 3927]
};

(BaseTypes.ARRAY.prototype as any).escape = false;
(BaseTypes.ARRAY.prototype as any)._value = function _value(values, options) {
  return values.map(value => {
    if (options && options.bindParam && this.type && this.type._value) {
      return this.type._value(value, options);
    }
    if (this.type && this.type.stringify) {
      value = this.type.stringify(value, options);

      if (this.type.escape === false) {
        return value;
      }
    }
    return options.escape(value);
  }, this);
};
(BaseTypes.ARRAY.prototype as any)._stringify = function _stringify(values, options) {
  let str = 'ARRAY[' + this._value(values, options).join(',') + ']';

  if (this.type) {
    let castKey = this.toSql();

    if (this.type instanceof BaseTypes.ENUM) {
      castKey = Utils.addTicks(
        Utils.generateEnumName(options.field.Model.getTableName(), options.field.fieldName),
        '"'
      ) + '[]';
    }

    str += '::' + castKey;
  }

  return str;
};
(BaseTypes.ARRAY.prototype as any)._bindParam = function _bindParam(values, options) {
  return options.bindParam(this._value(values, options));
};


export class ENUM extends BaseTypes.ENUM {
  public static parse(value) {
    return value;
  }
}

BaseTypes.ENUM.types.postgres = {
  oids: [],
  array_oids: []
};

const exp = {
  DECIMAL,
  NOW,
  BLOB,
  STRING,
  CHAR,
  TEXT,
  SMALLINT,
  INTEGER,
  BIGINT,
  BOOLEAN,
  DATE,
  DATEONLY,
  REAL,
  'DOUBLE PRECISION': DOUBLE,
  FLOAT,
  GEOMETRY,
  GEOGRAPHY,
  HSTORE,
  RANGE,
  ENUM
};

_.forIn(exp, (DataType : any, key) => {
  if (!DataType.key) {
    DataType.key = key;
  }
  if (!DataType.extend) {
    DataType.extend = function extend(oldType) {
      return new DataType(oldType.options);
    };
  }
});

export default exp;
