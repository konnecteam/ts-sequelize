'use strict';

import * as _ from 'lodash';
import * as moment from 'moment';
import * as momentTz from 'moment-timezone';
import * as BaseTypes from '../../data-types';
import { GlobalOptions } from '../../global-options';

const warn = BaseTypes.ABSTRACT.warn.bind(undefined, 'https://docs.oracle.com/database/122/SQLRF/Data-Types.htm#SQLRF30020');

BaseTypes.DATE.types.oracle = ['TIMESTAMP', 'TIMESTAMP WITH LOCAL TIME ZONE'];
BaseTypes.STRING.types.oracle = ['VARCHAR2', 'NVARCHAR2'];
BaseTypes.CHAR.types.oracle = ['CHAR', 'RAW'];
BaseTypes.TEXT.types.oracle = false;
BaseTypes.INTEGER.types.oracle = ['INTEGER'];
BaseTypes.BIGINT.types.oracle = false;
BaseTypes.FLOAT.types.oracle = false;
BaseTypes.TIME.types.oracle = ['TIMESTAMP WITH LOCAL TIME ZONE'];
BaseTypes.DATEONLY.types.oracle = ['DATE', 'DATEONLY'];
BaseTypes.BOOLEAN.types.oracle = ['NUMBER'];
BaseTypes.BLOB.types.oracle = ['BLOB'];
BaseTypes.DECIMAL.types.oracle = ['DECIMAL'];
BaseTypes.UUID.types.oracle = false;
BaseTypes.ENUM.types.oracle = false;
BaseTypes.REAL.types.oracle = false;
BaseTypes.DECIMAL.types.oracle = false;
BaseTypes.DOUBLE.types.oracle = false;
BaseTypes.GEOMETRY.types.oracle = false;

export class BLOB extends BaseTypes.BLOB {
  public toSql() : string  {
    if (this._length) {
      if (this._length.toLowerCase() === 'tiny') { // tiny = 2^8
        warn('ORACLE does not support BLOB with the `length` = `tiny` option. `RAW(256)` will be used instead.');
        return 'RAW(256)';
      }
      warn('ORACLE does not support BLOB with the `length` option. `RAW(2000)` will be used instead.');
      if (isNaN(this._length) || this._length > 2000) {
        return 'RAW(2000)';
      } else {
        return `RAW(${this._length})`;
      }
    }
    return 'BLOB';
  }

  public _hexify(hex : string) : string {
    return 'hextoraw(\'' + hex + '\')';
  }
}

export class CHAR extends BaseTypes.CHAR {
  public toSql() : string  {
    if (this._binary) {
      return 'RAW(' + this._length + ')';
    }
    return super.toSql();
  }
}

export class STRING extends BaseTypes.STRING {
  public escape : boolean = false;

  public toSql() : string  {
    if (this._length > 4000 || this._binary && this._length > 2000) {
      warn('Oracle 12 supports length up to 32764; be sure that your administrator has extended the MAX_STRING_SIZE parameter. Check https://docs.oracle.com/database/121/REFRN/GUID-D424D23B-0933-425F-BC69-9C0E6724693C.htm#REFRN10321');
    }
    if (!this._binary) {
      return 'NVARCHAR2(' + this._length + ')';
    } else {
      return 'RAW(' + this._length + ')';
    }
  }

  public _stringify(value : any, options : { escape? }) : string {
    if (this._binary) {
      return BLOB.prototype._stringify(value);
    } else {
      return options.escape(value);
    }
  }
}

export class TEXT extends BaseTypes.TEXT {
  public toSql() : string  {
    //TEXT is not support by Oracle, passing through NVARCHAR
    if (this._length) {
      if (typeof this._length === 'string') {
        switch (this._length.toLowerCase()) {
          case 'tiny' :
            warn('ORACLE does not support TEXT with the `length` = `tiny` option. `NVARCHAR(256)` will be used instead.');
            return 'NVARCHAR2(256)';
          case 'medium' :
            warn('ORACLE does not support TEXT with the `length` = `medium` option. `NVARCHAR(2000)` will be used instead.');
            return 'NVARCHAR2(2000)';
          case 'long' :
            warn('ORACLE does not support TEXT with the `length` = `long` option. `NVARCHAR(4000)` will be used instead.');
            return 'NVARCHAR2(4000)';
        }
      }
      warn('As parameter length has been given, NVARCHAR2(length) will be used');
      return `NVARCHAR2(${this._length})`;
    }
    return 'CLOB';
  }
}

export class BOOLEAN extends BaseTypes.BOOLEAN {
  public toSql() : string  {
    return 'NUMBER(1)';
  }

  public _stringify(value : any) : number {
    if (typeof value === 'string') {
      if (value === '0') {
        return 0;
      } else {
        return 1;
      }
    }
    return !!value ? 1 : 0;
  }
}

export class UUID extends BaseTypes.UUID {
  public toSql() : string  {
    return 'NVARCHAR2(36)';
  }
}

export class NOW extends BaseTypes.NOW {
  public toSql() : string  {
    // return 'SELECT TO_CHAR(SYSDATE, \'YYYY-MM-DD HH24:MI:SS\') "NOW" FROM DUAL;';
    return 'CURRENT_TIMESTAMP';
  }

  public _stringify() : string {
    return 'SELECT TO_CHAR(SYSDATE, \'YYYY-MM-DD HH24:MI:SS\') "NOW" FROM DUAL;';
  }
}

export class TIME extends BaseTypes.TIME {
  public escape : boolean = false;

  public toSql() : string  {
    return 'TIMESTAMP WITH LOCAL TIME ZONE';
  }

  public _applyTimezone(date : moment.Moment, options : { timezone? : string }) {
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

  public _stringify(date : Date, options : {}) {
    const format = 'HH24:MI:SS.FFTZH:TZM';

    //Oracle has no TIME object, we have to deal it as a real date and insert only the time we need
    let momentDate = moment(date);
    momentDate = this._applyTimezone(momentDate, options);
    const formatedDate = momentDate.format('HH:mm:ss.SSS Z');

    return `TO_TIMESTAMP_TZ('${formatedDate}','${format}')`;
  }
}

export class DATE extends BaseTypes.DATE {
  public escape : boolean = false;
  private noTimezone : boolean = 'oracle' in GlobalOptions.Instance.dialectOptions && 'noTimezone' in GlobalOptions.Instance.dialectOptions['oracle'] ? GlobalOptions.Instance.dialectOptions['oracle']['noTimezone'] : false;

  public toSql() : string  {
    if (this.noTimezone) {
      return 'TIMESTAMP';
    }
    return 'TIMESTAMP WITH LOCAL TIME ZONE';
  }

  public _stringify(date : moment.Moment, options : {}) {
    if (this.noTimezone) {
      const format = 'YYYY-MM-DD HH24:MI:SS.FF';
      date = this._applyTimezone(date, options);
      const formatedDate = date.format('YYYY-MM-DD HH:mm:ss.SSS');
      return `TO_TIMESTAMP('${formatedDate}','${format}')`;
    } else {
      const format = 'YYYY-MM-DD HH24:MI:SS.FFTZH:TZM';
      date = this._applyTimezone(date, options);
      const formatedDate = date.format('YYYY-MM-DD HH:mm:ss.SSS Z');
      return `TO_TIMESTAMP_TZ('${formatedDate}','${format}')`;
    }
  }
}

export class DECIMAL extends BaseTypes.DECIMAL {
  public toSql() : string  {
    let result = '';
    if (this._length) {
      result += '(' + this._length;
      if (typeof this._decimals === 'number') {
        result += ',' + this._decimals;
      }
      result += ')';
    }

    if (!this._length && this._precision) {
      result += '(' + this._precision;
      if (typeof this._scale === 'number') {
        result += ',' + this._scale;
      }
      result += ')';
    }

    return 'NUMBER' + result;
  }
}

export class INTEGER extends BaseTypes.INTEGER {
  constructor(length : number | { length : number }) {
    super(length);

    if (this._zerofill) {
      warn('ORACLE does not support INTEGER with options. Plain `INTEGER` will be used instead.');
      this._zerofill = undefined;
    }
  }

  public toSql() : string  {
    if (this._unsigned) {
      if (this._length) {
        return 'INTEGER(' + this._length + ')';
      }
      return 'INTEGER';
    }
    return 'INTEGER';
  }
}

export class BIGINT extends BaseTypes.BIGINT {
  constructor(length : number | { length : number }) {
    super(length);
    warn('Oracle does not support BIGINT. Plain `NUMBER(19)` will be used instead.');

    // ORACLE does not support any options for bigint
    if (this._length || this.options.length || this._unsigned || this._zerofill) {
      this._length = undefined;
      this.options.length = undefined;
      this._unsigned = undefined;
      this._zerofill = undefined;
    }
  }

  public toSql() : string  {
    return 'NUMBER(19)';
  }
}

export class REAL extends BaseTypes.REAL {
  public toSql() : string  {
    return 'REAL';
  }
}

export class FLOAT extends BaseTypes.FLOAT {
  public toSql() : string  {
    if (this._length) {
      return 'FLOAT(' + this._length + ')';
    }
    return 'FLOAT';
  }
}

export class DOUBLE extends BaseTypes.DOUBLE {
  constructor(length : number, decimals : number) {
    super(length, decimals);

    if (this._length || this._unsigned || this._zerofill) {
      this._length = undefined;
      this.options.length = undefined;
      this._unsigned = undefined;
      this._zerofill = undefined;
    }
  }

  public toSql() : string  {
    return 'NUMBER(15,5)';
  }
}

export class ENUM extends BaseTypes.ENUM {
  public toSql() : string  {
    return 'NVARCHAR2(255)';
  }
}

export class DATEONLY extends BaseTypes.DATEONLY {
  public static parse(value : Date) : string {
    return moment(value).format('YYYY-MM-DD');
  }

  public _stringify(date : Date) : string {
    const format = 'YYYY/MM/DD';
    return `TO_DATE('${date}','${format}')`;
  }
}

const exp = {
  BLOB,
  BOOLEAN,
  'DOUBLE PRECISION': DOUBLE,
  DOUBLE,
  ENUM,
  STRING,
  BIGINT,
  CHAR,
  UUID,
  DATEONLY,
  DATE,
  NOW,
  INTEGER,
  REAL,
  TIME,
  DECIMAL,
  FLOAT,
  TEXT
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
