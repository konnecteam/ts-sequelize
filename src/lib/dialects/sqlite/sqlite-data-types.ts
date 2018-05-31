'use strict';

import * as _ from 'lodash';
import * as BaseTypes from '../../data-types';


const warn = BaseTypes.ABSTRACT.warn.bind(undefined, 'https://www.sqlite.org/datatype3.html');

/**
 * @see https://sqlite.org/datatype3.html
 */

BaseTypes.DATE.types.sqlite = ['DATETIME'];
BaseTypes.STRING.types.sqlite = ['VARCHAR', 'VARCHAR BINARY'];
BaseTypes.CHAR.types.sqlite = ['CHAR', 'CHAR BINARY'];
BaseTypes.TEXT.types.sqlite = ['TEXT'];
BaseTypes.TINYINT.types.sqlite = ['TINYINT'];
BaseTypes.SMALLINT.types.sqlite = ['SMALLINT'];
BaseTypes.MEDIUMINT.types.sqlite = ['MEDIUMINT'];
BaseTypes.INTEGER.types.sqlite = ['INTEGER'];
BaseTypes.BIGINT.types.sqlite = ['BIGINT'];
BaseTypes.FLOAT.types.sqlite = ['FLOAT'];
BaseTypes.TIME.types.sqlite = ['TIME'];
BaseTypes.DATEONLY.types.sqlite = ['DATE'];
BaseTypes.BOOLEAN.types.sqlite = ['TINYINT'];
BaseTypes.BLOB.types.sqlite = ['TINYBLOB', 'BLOB', 'LONGBLOB'];
BaseTypes.DECIMAL.types.sqlite = ['DECIMAL'];
BaseTypes.UUID.types.sqlite = ['UUID'];
BaseTypes.ENUM.types.sqlite = false;
BaseTypes.REAL.types.sqlite = ['REAL'];
BaseTypes.DOUBLE.types.sqlite = ['DOUBLE PRECISION'];
BaseTypes.GEOMETRY.types.sqlite = false;
BaseTypes.JSONTYPE.types.sqlite = ['JSON', 'JSONB'];

export class JSONTYPE extends BaseTypes.JSONTYPE {
  public static parse(data) {
    return JSON.parse(data);
  }
}

export class DATE extends BaseTypes.DATE {
  public static parse(date, options) {
    if (date.indexOf('+') === -1) {
      // For backwards compat. Dates inserted by sequelize < 2.0dev12 will not have a timestamp set
      return new Date(date + options.timezone);
    } else {
      return new Date(date); // We already have a timezone stored in the string
    }
  }
}

export class DATEONLY extends BaseTypes.DATEONLY {
  public static parse(date) {
    return date;
  }
}

export class STRING extends BaseTypes.STRING {
  public toSql() : string  {
    if (this._binary) {
      return 'VARCHAR BINARY(' + this._length + ')';
    } else {
      return super.toSql();
    }
  }
}

export class TEXT extends BaseTypes.TEXT {
  public toSql() : string  {
    if (this._length) {
      warn('SQLite does not support TEXT with options. Plain `TEXT` will be used instead.');
      this._length = undefined;
    }
    return 'TEXT';
  }
}

export class CHAR extends BaseTypes.CHAR {
  public toSql() : string  {
    if (this._binary) {
      return 'CHAR BINARY(' + this._length + ')';
    } else {
      return super.toSql();
    }
  }
}

export class NUMBER extends BaseTypes.NUMBER {
  public toSql() : string  {
    let result = this.key;

    if (this._unsigned) {
      result += ' UNSIGNED';
    }
    if (this._zerofill) {
      result += ' ZEROFILL';
    }

    if (this._length) {
      result += '(' + this._length;
      if (typeof this._decimals === 'number') {
        result += ',' + this._decimals;
      }
      result += ')';
    }
    return result;
  }
}

export class TINYINT extends BaseTypes.TINYINT {
  public toSql() : string  {
    return NUMBER.prototype.toSql.call(this);
  }
}

export class SMALLINT extends BaseTypes.SMALLINT {
  public toSql() : string  {
    return NUMBER.prototype.toSql.call(this);
  }
}

export class MEDIUMINT extends BaseTypes.MEDIUMINT {
  public toSql() : string  {
    return NUMBER.prototype.toSql.call(this);
  }
}

export class INTEGER extends BaseTypes.INTEGER {
  public toSql() : string  {
    return NUMBER.prototype.toSql.call(this);
  }
}

export class BIGINT extends BaseTypes.BIGINT {
  public toSql() : string  {
    return NUMBER.prototype.toSql.call(this);
  }
}

export class FLOAT extends BaseTypes.FLOAT {
  public toSql() : string  {
    return NUMBER.prototype.toSql.call(this);
  }

  public static parse(value) {
    if (_.isString(value)) {
      if (value === 'NaN') {
        return NaN;
      } else if (value === 'Infinity') {
        return Infinity;
      } else if (value === '-Infinity') {
        return -Infinity;
      }
    }
    return value;
  }
}

export class DOUBLE extends BaseTypes.DOUBLE {
  public toSql() : string  {
    return NUMBER.prototype.toSql.call(this);
  }

  public static parse(value) {
    if (_.isString(value)) {
      if (value === 'NaN') {
        return NaN;
      } else if (value === 'Infinity') {
        return Infinity;
      } else if (value === '-Infinity') {
        return -Infinity;
      }
    }
    return value;
  }
}

export class REAL extends BaseTypes.REAL {
  public toSql() : string  {
    return NUMBER.prototype.toSql.call(this);
  }

  public static parse(value) {
    if (_.isString(value)) {
      if (value === 'NaN') {
        return NaN;
      } else if (value === 'Infinity') {
        return Infinity;
      } else if (value === '-Infinity') {
        return -Infinity;
      }
    }
    return value;
  }
}

export class ENUM extends BaseTypes.ENUM {
  public toSql() : string  {
    return 'TEXT';
  }
}

const exp = {
  DATE,
  DATEONLY,
  STRING,
  CHAR,
  NUMBER,
  FLOAT,
  REAL,
  'DOUBLE PRECISION': DOUBLE,
  TINYINT,
  SMALLINT,
  MEDIUMINT,
  INTEGER,
  BIGINT,
  TEXT,
  ENUM,
  'JSON': JSONTYPE
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
