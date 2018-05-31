'use strict';

import * as _ from 'lodash';
import { Moment } from 'moment';
import * as moment from 'moment-timezone';
import * as wkx from 'wkx';
import * as BaseTypes from '../../data-types';


BaseTypes.ABSTRACT.prototype.dialectTypes = 'https://dev.mysql.com/doc/refman/5.7/en/data-types.html';

/**
 * types: [buffer_type, ...]
 * @see buffer_type here https://dev.mysql.com/doc/refman/5.7/en/c-api-prepared-statement-type-codes.html
 * @see hex here https://github.com/sidorares/node-mysql2/blob/master/lib/constants/types.js
 */

BaseTypes.DATE.types.mysql = ['DATETIME'];
BaseTypes.STRING.types.mysql = ['VAR_STRING'];
BaseTypes.CHAR.types.mysql = ['STRING'];
BaseTypes.TEXT.types.mysql = ['BLOB'];
BaseTypes.TINYINT.types.mysql = ['TINY'];
BaseTypes.SMALLINT.types.mysql = ['SHORT'];
BaseTypes.MEDIUMINT.types.mysql = ['INT24'];
BaseTypes.INTEGER.types.mysql = ['LONG'];
BaseTypes.BIGINT.types.mysql = ['LONGLONG'];
BaseTypes.FLOAT.types.mysql = ['FLOAT'];
BaseTypes.TIME.types.mysql = ['TIME'];
BaseTypes.DATEONLY.types.mysql = ['DATE'];
BaseTypes.BOOLEAN.types.mysql = ['TINY'];
BaseTypes.BLOB.types.mysql = ['TINYBLOB', 'BLOB', 'LONGBLOB'];
BaseTypes.DECIMAL.types.mysql = ['NEWDECIMAL'];
BaseTypes.UUID.types.mysql = false;
BaseTypes.ENUM.types.mysql = false;
BaseTypes.REAL.types.mysql = ['DOUBLE'];
BaseTypes.DOUBLE.types.mysql = ['DOUBLE'];
BaseTypes.GEOMETRY.types.mysql = ['GEOMETRY'];
BaseTypes.JSONTYPE.types.mysql = ['JSON'];

export class BLOB extends BaseTypes.BLOB {
  public static parse(value, options, next) {
    const data = next();

    if (Buffer.isBuffer(data) && data.length === 0) {
      return null;
    }

    return data;
  }
}

export class DECIMAL extends BaseTypes.DECIMAL {
  public toSql() : string {
    let definition = super.toSql();

    if (this._unsigned) {
      definition += ' UNSIGNED';
    }

    if (this._zerofill) {
      definition += ' ZEROFILL';
    }

    return definition;
  }
}

export class DATE extends BaseTypes.DATE {
  public toSql() : string {
    return 'DATETIME' + (this._length ? '(' + this._length + ')' : '');
  }

  public _stringify(date : Moment, options : {}) : string {
    date = super._applyTimezone(date, options);
    // Fractional DATETIMEs only supported on MySQL 5.6.4+
    if (this._length) {
      return date.format('YYYY-MM-DD HH:mm:ss.SSS');
    }

    return date.format('YYYY-MM-DD HH:mm:ss');
  }

  public static parse(value : any, options : { timezone? : string }) {
    value = value.string();

    if (value === null) {
      return value;
    }

    if (moment.tz.zone(options.timezone)) {
      value = moment.tz(value, options.timezone).toDate();
    } else {
      value = new Date(value + ' ' + options.timezone);
    }

    return value;
  }
}

export class DATEONLY extends BaseTypes.DATEONLY {
  public static parse(value : any) : string {
    return value.string();
  }
}

export class UUID extends BaseTypes.UUID {
  public toSql() : string {
    return 'CHAR(36) BINARY';
  }
}

const SUPPORTED_GEOMETRY_TYPES = ['POINT', 'LINESTRING', 'POLYGON'];

export class GEOMETRY extends BaseTypes.GEOMETRY {
  public sqlType : string;

  constructor(type : any, srid : number) {
    super(type, srid);

    if (_.isEmpty(this.type)) {
      this.sqlType = this.key;
    } else if (_.includes(SUPPORTED_GEOMETRY_TYPES, this.type)) {
      this.sqlType = this.type;
    } else {
      throw new Error('Supported geometry types are: ' + SUPPORTED_GEOMETRY_TYPES.join(', '));
    }
  }

  public static parse(value : any) : any {
    value = value.buffer();

    // Empty buffer, MySQL doesn't support POINT EMPTY
    // check, https://dev.mysql.com/worklog/task/?id=2381
    if (!value || value.length === 0) {
      return null;
    }

    // For some reason, discard the first 4 bytes
    value = value.slice(4);

    return wkx.Geometry.parse(value).toGeoJSON();
  }

  public toSql() : string {
    return this.sqlType;
  }
}

export class ENUM extends BaseTypes.ENUM {
  public toSql(options? : { escape }) : string {
    return 'ENUM(' + _.map(this.values, value => options.escape(value)).join(', ') + ')';
  }
}

export class JSONTYPE extends BaseTypes.JSONTYPE {
  public _stringify(value : any, options? : { operation? }) {
    return options.operation === 'where' && typeof value === 'string' ? value : JSON.stringify(value);
  }
}

const exp = {
  ENUM,
  DATE,
  DATEONLY,
  UUID,
  GEOMETRY,
  DECIMAL,
  BLOB,
  JSON: JSONTYPE
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
