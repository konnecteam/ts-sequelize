'use strict';

import * as _ from 'lodash';
import * as moment from 'moment';
import inherits from '../../utils/inherits';

export function DataTypes (BaseTypes) {
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

  function BLOB(length) {
    if (!(this instanceof BLOB)) return new (BLOB as any)(length);
    BaseTypes.BLOB.apply(this, arguments);
  }
  inherits(BLOB, BaseTypes.BLOB);

  BLOB.prototype.toSql = function toSql() {
    if (this._length) {
      if (this._length.toLowerCase() === 'tiny') { // tiny = 2^8
        warn('MSSQL does not support BLOB with the `length` = `tiny` option. `VARBINARY(256)` will be used instead.');
        return 'VARBINARY(256)';
      }
      warn('MSSQL does not support BLOB with the `length` option. `VARBINARY(MAX)` will be used instead.');
    }
    return 'VARBINARY(MAX)';
  };

  BLOB.prototype._hexify = function _hexify(hex) {
    return '0x' + hex;
  };

  function STRING(length, binary) {
    if (!(this instanceof STRING)) return new (STRING as any)(length, binary);
    BaseTypes.STRING.apply(this, arguments);
  }
  inherits(STRING, BaseTypes.STRING);

  STRING.prototype.toSql = function toSql() {
    if (!this._binary) {
      return 'NVARCHAR(' + this._length + ')';
    } else {
      return 'BINARY(' + this._length + ')';
    }
  };

  STRING.prototype.escape = false;
  STRING.prototype._stringify = function _stringify(value, options) {
    if (this._binary) {
      return BLOB.prototype._stringify(value);
    } else {
      return options.escape(value);
    }
  };

  function TEXT(length) {
    if (!(this instanceof TEXT)) return new (TEXT as any)(length);
    BaseTypes.TEXT.apply(this, arguments);
  }
  inherits(TEXT, BaseTypes.TEXT);

  TEXT.prototype.toSql = function toSql() {
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
  };

  function BOOLEAN() {
    if (!(this instanceof BOOLEAN)) return new (BOOLEAN as any)();
    BaseTypes.BOOLEAN.apply(this, arguments);
  }
  inherits(BOOLEAN, BaseTypes.BOOLEAN);

  BOOLEAN.prototype.toSql = function toSql() {
    return 'BIT';
  };

  function UUID() {
    if (!(this instanceof UUID)) return new (UUID as any)();
    BaseTypes.UUID.apply(this, arguments);
  }
  inherits(UUID, BaseTypes.UUID);

  UUID.prototype.toSql = function toSql() {
    return 'CHAR(36)';
  };

  function NOW() {
    if (!(this instanceof NOW)) return new (NOW as any)();
    BaseTypes.NOW.apply(this, arguments);
  }
  inherits(NOW, BaseTypes.NOW);

  NOW.prototype.toSql = function toSql() {
    return 'GETDATE()';
  };

  function DATE(length) {
    if (!(this instanceof DATE)) return new (DATE as any)(length);
    BaseTypes.DATE.apply(this, arguments);
  }
  inherits(DATE, BaseTypes.DATE);

  DATE.prototype.toSql = function toSql() {
    return 'DATETIMEOFFSET';
  };

  function DATEONLY() {
    if (!(this instanceof DATEONLY)) return new (DATEONLY as any)();
    BaseTypes.DATEONLY.apply(this, arguments);
  }
  inherits(DATEONLY, BaseTypes.DATEONLY);

  (DATEONLY as any).parse = function(value) {
    return moment(value).format('YYYY-MM-DD');
  };

  function INTEGER(length) {
    if (!(this instanceof INTEGER)) return new (INTEGER as any)(length);
    BaseTypes.INTEGER.apply(this, arguments);

    // MSSQL does not support any options for integer
    if (this._length || this.options.length || this._unsigned || this._zerofill) {
      warn('MSSQL does not support INTEGER with options. Plain `INTEGER` will be used instead.');
      this._length = undefined;
      this.options.length = undefined;
      this._unsigned = undefined;
      this._zerofill = undefined;
    }
  }
  inherits(INTEGER, BaseTypes.INTEGER);

  function TINYINT(length) {
    if (!(this instanceof TINYINT)) return new (TINYINT as any)(length);
    BaseTypes.TINYINT.apply(this, arguments);

    // MSSQL does not support any options for tinyint
    if (this._length || this.options.length || this._unsigned || this._zerofill) {
      warn('MSSQL does not support TINYINT with options. Plain `TINYINT` will be used instead.');
      this._length = undefined;
      this.options.length = undefined;
      this._unsigned = undefined;
      this._zerofill = undefined;
    }
  }
  inherits(TINYINT, BaseTypes.TINYINT);

  function SMALLINT(length) {
    if (!(this instanceof SMALLINT)) return new (SMALLINT as any)(length);
    BaseTypes.SMALLINT.apply(this, arguments);

    // MSSQL does not support any options for smallint
    if (this._length || this.options.length || this._unsigned || this._zerofill) {
      warn('MSSQL does not support SMALLINT with options. Plain `SMALLINT` will be used instead.');
      this._length = undefined;
      this.options.length = undefined;
      this._unsigned = undefined;
      this._zerofill = undefined;
    }
  }
  inherits(SMALLINT, BaseTypes.SMALLINT);

  function BIGINT(length) {
    if (!(this instanceof BIGINT)) return new (BIGINT as any)(length);
    BaseTypes.BIGINT.apply(this, arguments);

    // MSSQL does not support any options for bigint
    if (this._length || this.options.length || this._unsigned || this._zerofill) {
      warn('MSSQL does not support BIGINT with options. Plain `BIGINT` will be used instead.');
      this._length = undefined;
      this.options.length = undefined;
      this._unsigned = undefined;
      this._zerofill = undefined;
    }
  }
  inherits(BIGINT, BaseTypes.BIGINT);

  function REAL(length, decimals) {
    if (!(this instanceof REAL)) return new (REAL as any)(length, decimals);
    BaseTypes.REAL.apply(this, arguments);

    // MSSQL does not support any options for real
    if (this._length || this.options.length || this._unsigned || this._zerofill) {
      warn('MSSQL does not support REAL with options. Plain `REAL` will be used instead.');
      this._length = undefined;
      this.options.length = undefined;
      this._unsigned = undefined;
      this._zerofill = undefined;
    }
  }
  inherits(REAL, BaseTypes.REAL);

  function FLOAT(length, decimals) {
    if (!(this instanceof FLOAT)) return new (FLOAT as any)(length, decimals);
    BaseTypes.FLOAT.apply(this, arguments);

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
  inherits(FLOAT, BaseTypes.FLOAT);

  function ENUM() {
    if (!(this instanceof ENUM)) {
      const obj = Object.create(ENUM.prototype);
      ENUM.apply(obj, arguments);
      return obj;
    }
    BaseTypes.ENUM.apply(this, arguments);
  }
  inherits(ENUM, BaseTypes.ENUM);

  ENUM.prototype.toSql = function toSql() {
    return 'VARCHAR(255)';
  };

  const exports = {
    BLOB,
    BOOLEAN,
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

  _.forIn(exports, (DataType, key) => {
    if (!DataType.key) DataType.key = key;
    if (!DataType.extend) {
      DataType.extend = function extend(oldType) {
        return DataType(oldType.options);
      };
    }
  });

  return exports;
};
