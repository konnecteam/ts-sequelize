'use strict';

import * as _ from 'lodash';
import * as moment from 'moment';
import * as Tedious from 'tedious';
import * as BaseTypes from '../../data-types';
import { GlobalOptions } from '../../global-options';

const TYPES = Tedious.TYPES;
const warn = BaseTypes.ABSTRACT.warn.bind(undefined, 'https://msdn.microsoft.com/en-us/library/ms187752%28v=sql.110%29.aspx');

/**
 * types: [hex, ...]
 * @see hex here https://github.com/tediousjs/tedious/blob/master/src/data-type.js
 */

BaseTypes.DATE.types.mssql = [43];
BaseTypes.STRING.types.mssql = [231, 173];
BaseTypes.CHAR.types.mssql = [175];
BaseTypes.TEXT.types.mssql = false;
// https://msdn.microsoft.com/en-us/library/ms187745(v=sql.110).aspx
BaseTypes.TINYINT.types.mssql = [30];
BaseTypes.SMALLINT.types.mssql = [34];
BaseTypes.MEDIUMINT.types.mssql = false;
BaseTypes.INTEGER.types.mssql = [38];
BaseTypes.BIGINT.types.mssql = false;
BaseTypes.FLOAT.types.mssql = [109];
BaseTypes.TIME.types.mssql = [41];
BaseTypes.DATEONLY.types.mssql = [40];
BaseTypes.BOOLEAN.types.mssql = [104];
BaseTypes.BLOB.types.mssql = [165];
BaseTypes.DECIMAL.types.mssql = [106];
BaseTypes.UUID.types.mssql = false;
BaseTypes.ENUM.types.mssql = false;
BaseTypes.REAL.types.mssql = [109];
BaseTypes.DOUBLE.types.mssql = [109];
// BaseTypes.GEOMETRY.types.mssql = [240]; // not yet supported
BaseTypes.GEOMETRY.types.mssql = false;

export class BLOB extends BaseTypes.BLOB {
  public toSql() : string {
    if (this._length) {
      if (this._length.toLowerCase() === 'tiny') { // tiny = 2^8
        warn('MSSQL does not support BLOB with the `length` = `tiny` option. `VARBINARY(256)` will be used instead.');
        return 'VARBINARY(256)';
      }
      warn('MSSQL does not support BLOB with the `length` option. `VARBINARY(MAX)` will be used instead.');
    }
    return 'VARBINARY(MAX)';
  }

  public _hexify(hex : string) : string {
    return '0x' + hex;
  }
}

export class STRING extends BaseTypes.STRING {
  public escape : boolean = false;

  public toSql() : string {
    if (!this._binary) {
      return 'NVARCHAR(' + this._length + ')';
    } else {
      return 'BINARY(' + this._length + ')';
    }
  }

  public _stringify(value, options) {
    if (this._binary) {
      return BLOB.prototype._stringify(value);
    } else {
      return options.escape(value);
    }
  }

  public _bindParam(value, options) {
    return options.bindParam({
      val: this._binary ? Buffer.from(value) : value,
      type: this._binary ? TYPES.VarBinary : TYPES.NVarChar,
      typeOptions: { length: this._length || 255 }
    });
  }
}

export class TEXT extends BaseTypes.TEXT {
  public toSql() : string {
    // TEXT is deprecated in mssql and it would normally be saved as a non-unicode string.
    // Using unicode is just future proof
    if (this._length) {
      if (this._length.toLowerCase() === 'tiny') { // tiny = 2^8
        warn('MSSQL does not support TEXT with the `length` = `tiny` option. `NVARCHAR(256)` will be used instead.');
        return 'NVARCHAR(256)';
      }
      warn('MSSQL does not support TEXT with the `length` option. `NVARCHAR(MAX)` will be used instead.');
    }
    return 'NVARCHAR(MAX)';
  }

  public _bindParam(value, options) {
    return options.bindParam({
      val: value,
      type: TYPES.Text
    });
  }
}

export class BOOLEAN extends BaseTypes.BOOLEAN {
  public toSql() : string {
    return 'BIT';
  }

  public _bindParam(value, options) {
    return options.bindParam({
      val: value,
      type: TYPES.Bit
    });
  }
}

export class UUID extends BaseTypes.UUID {
  public toSql() : string {
    return 'CHAR(36)';
  }
}

export class NOW extends BaseTypes.NOW {
  public toSql() : string {
    return 'GETDATE()';
  }
}

export class DATE extends BaseTypes.DATE {

  public toSql() : string {
    const noTimezone = 'mssql' in GlobalOptions.Instance.dialectOptions && 'noTimezone' in GlobalOptions.Instance.dialectOptions['mssql'] ? GlobalOptions.Instance.dialectOptions['mssql']['noTimezone'] : false;
    if (noTimezone) {
      return 'DATETIME2';
    }
    return 'DATETIMEOFFSET';
  }

  /**
   * Patch pour les dates MsSql
   * A n'utiliser que dans la version hybride
   */
  public _stringify(date, options) {
    const noTimezone = 'mssql' in GlobalOptions.Instance.dialectOptions && 'noTimezone' in GlobalOptions.Instance.dialectOptions['mssql'] ? GlobalOptions.Instance.dialectOptions['mssql']['noTimezone'] : false;
    if (noTimezone) {
      date = this._applyTimezone(date, options);
      //On ne passe pas le timezone comme sequelize tente de le faire (reprise https://github.com/sequelize/sequelize/blob/v3/lib/dialects/mssql/data-types.js)
      return date.format('YYYY-MM-DD HH:mm:ss.SSS');
    }
    return super._stringify(date, options);
  }
}

export class DATEONLY extends BaseTypes.DATEONLY {
  public static parse(value) : string {
    return moment(value).format('YYYY-MM-DD');
  }
}

export class INTEGER extends BaseTypes.INTEGER {
  constructor(length : any) {
    super(length);

    // MSSQL does not support any options for integer
    if (this._length || this.options.length || this._unsigned || this._zerofill) {
      warn('MSSQL does not support INTEGER with options. Plain `INTEGER` will be used instead.');
      this._length = undefined;
      this.options.length = undefined;
      this._unsigned = undefined;
      this._zerofill = undefined;
    }
  }

  public _bindParam(value, options) {
    return options.bindParam({
      val: value,
      type: TYPES.Int
    });
  }
}

export class TINYINT extends BaseTypes.TINYINT {
  constructor(length : any) {
    super(length);

    // MSSQL does not support any options for integer
    if (this._length || this.options.length || this._unsigned || this._zerofill) {
      warn('MSSQL does not support TINYINT with options. Plain `TINYINT` will be used instead.');
      this._length = undefined;
      this.options.length = undefined;
      this._unsigned = undefined;
      this._zerofill = undefined;
    }
  }

  public _bindParam(value, options) {
    return options.bindParam({
      val: value,
      type: TYPES.TinyInt
    });
  }
}

export class SMALLINT extends BaseTypes.SMALLINT {
  constructor(length : any) {
    super(length);

    // MSSQL does not support any options for integer
    if (this._length || this.options.length || this._unsigned || this._zerofill) {
      warn('MSSQL does not support SMALLINT with options. Plain `SMALLINT` will be used instead.');
      this._length = undefined;
      this.options.length = undefined;
      this._unsigned = undefined;
      this._zerofill = undefined;
    }
  }

  public _bindParam(value, options) {
    return options.bindParam({
      val: value,
      type: TYPES.SmallInt
    });
  }
}

export class BIGINT extends BaseTypes.BIGINT {
  constructor(length : any) {
    super(length);

    // MSSQL does not support any options for integer
    if (this._length || this.options.length || this._unsigned || this._zerofill) {
      warn('MSSQL does not support BIGINT with options. Plain `BIGINT` will be used instead.');
      this._length = undefined;
      this.options.length = undefined;
      this._unsigned = undefined;
      this._zerofill = undefined;
    }
  }
}

export class REAL extends BaseTypes.REAL {
  constructor(length : number, decimals : number) {
    super(length, decimals);

    // MSSQL does not support any options for integer
    if (this._length || this.options.length || this._unsigned || this._zerofill) {
      warn('MSSQL does not support REAL with options. Plain `REAL` will be used instead.');
      this._length = undefined;
      this.options.length = undefined;
      this._unsigned = undefined;
      this._zerofill = undefined;
    }
  }

  public _bindParam(value, options) {
    return options.bindParam({
      val: value,
      type: TYPES.Real
    });
  }
}

export class FLOAT extends BaseTypes.FLOAT {
  constructor(length : number, decimals : number) {
    super(length, decimals);

    // MSSQL does only support lengths as option.
    // Values between 1-24 result in 7 digits precision (4 bytes storage size)
    // Values between 25-53 result in 15 digits precision (8 bytes storage size)
    // If decimals are provided remove these and print a warning
    if (this._decimals) {
      warn('MSSQL does not support Float with decimals. Plain `FLOAT` will be used instead.');
      this._length = undefined;
      this.options.length = undefined;
    }
    if (this._unsigned) {
      warn('MSSQL does not support Float unsigned. `UNSIGNED` was removed.');
      this._unsigned = undefined;
    }
    if (this._zerofill) {
      warn('MSSQL does not support Float zerofill. `ZEROFILL` was removed.');
      this._zerofill = undefined;
    }
  }

  public _bindParam(value, options) {
    return options.bindParam({
      val: value,
      type: TYPES.Float
    });
  }
}

export class ENUM extends BaseTypes.ENUM {
  public toSql() : string {
    return 'VARCHAR(255)';
  }
}

export class DECIMAL extends BaseTypes.DECIMAL {
  public _bindParam(value, options) {
    return options.bindParam({
      val: value,
      type: TYPES.Decimal,
      typeOptions: {precision: 30, scale: 15}
    });
  }
}

const exp = {
  BLOB,
  BOOLEAN,
  DECIMAL,
  ENUM,
  STRING,
  UUID,
  DATE,
  DATEONLY,
  NOW,
  TINYINT,
  SMALLINT,
  INTEGER,
  BIGINT,
  REAL,
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
