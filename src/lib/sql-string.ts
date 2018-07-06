'use strict';

import * as _ from 'lodash';
import * as util from 'util';
import dataTypes from './data-types';

/**
 * @hidden
 */
export class SqlString {
  /**
   * escape a value
   */
  public static escape(val : any, timeZone : string, dialect : string, format? : boolean ) : any {
    let prependN : boolean = false;
    if (val === undefined || val === null) {
      return 'NULL';
    }
    switch (typeof val) {
      case 'boolean':
      // SQLite doesn't have true/false support. MySQL aliases true/false to 1/0
      // for us, Oracle works the same way. Postgres actually has a boolean type with true/false literals,
      // but sequelize doesn't use it yet.
        if (dialect === 'sqlite' || dialect === 'mssql' || dialect === 'oracle') {
          return +!!val;
        }
        return '' + !!val;
      case 'number':
        return val + '';
      case 'string':
      // In mssql, prepend N to all quoted vals which are originally a string (for
      // unicode compatibility)
        prependN = dialect === 'mssql';
        break;
    }

    if (val instanceof Date) {
      val = dataTypes[dialect].DATE.prototype.stringify(val, { timezone: timeZone });
    }

    if (Buffer.isBuffer(val)) {
      if (dataTypes[dialect].BLOB) {
        return dataTypes[dialect].BLOB.prototype.stringify(val);
      }

      return dataTypes.BLOB.prototype.stringify(val);
    }

    if (Array.isArray(val)) {
      const partialEscape = _.partial(SqlString.escape, _, timeZone, dialect, format);
      if (dialect === 'postgres' && !format) {
        return dataTypes.ARRAY.prototype.stringify(val, {escape: partialEscape});
      }
      return SqlString.arrayToList(val, timeZone, dialect, format);
    }

    if (!val.replace) {
      throw new Error('Invalid value ' + util.inspect(val));
    }

    if (dialect === 'postgres' || dialect === 'sqlite' || dialect === 'mssql') {
      // http://www.postgresql.org/docs/8.2/static/sql-syntax-lexical.html#SQL-SYNTAX-STRINGS
      // http://stackoverflow.com/q/603572/130598
      val = val.replace(/'/g, "''");
      if (dialect === 'postgres') {
        // null character is not allowed in Postgres
        val = val.replace(/\0/g, '\\0');
      }
    } else if (dialect === 'oracle' && (val.indexOf('TO_TIMESTAMP') > -1 || val.indexOf('TO_DATE') > -1 || typeof val === 'string')) {
      //The insertion / selection of date has to pass by the TO_TIMESTAMP method, if we pass through the normal flow the method will be quoted -> 'TO_TIMESTAMP('1970-01-01 00:00:00.00','YYYY-MM-DD HH24:MI:SS.FF')'
      if (val.indexOf('TO_TIMESTAMP') > -1 || val.indexOf('TO_DATE') > -1) {
        return val;
      }
      if (typeof val === 'string') {
        val = val.replace(/'/g, "''");
      }
    } else {
      val = val.replace(/[\0\n\r\b\t\\\'\"\x1a]/g, s => {
        switch (s) {
          case '\0': return '\\0';
          case '\n': return '\\n';
          case '\r': return '\\r';
          case '\b': return '\\b';
          case '\t': return '\\t';
          case '\x1a': return '\\Z';
          default: return '\\' + s;
        }
      });
    }
    return (prependN ? "N'" : "'") + val + "'";
  }

  public static format(sql : string, values : any[], timeZone : string, dialect : string) : string {
    values = [].concat(values);

    if (typeof sql !== 'string') {
      throw new Error('Invalid SQL string provided: ' + sql);
    }
    return sql.replace(/\?/g, match => {
      if (!values.length) {
        return match;
      }

      return SqlString.escape(values.shift(), timeZone, dialect, true);
    });
  }

  public static formatNamedParameters(sql : string, values : any, timeZone, dialect : string) : any {
    return sql.replace(/\:+(?!\d)(\w+)/g, (value, key) => {
      if ('postgres' === dialect && '::' === value.slice(0, 2)) {
        return value;
      }

      if (values[key] !== undefined) {
        return SqlString.escape(values[key], timeZone, dialect, true);
      } else {
        throw new Error('Named parameter "' + value + '" has no value in the given object.');
      }
    });
  }

  private static arrayToList(array : any[], timeZone : string, dialect : string, format : boolean) {
    return array.reduce((sql, val, i) => {
      if (i !== 0) {
        sql += ', ';
      }
      if (Array.isArray(val)) {
        sql += `(${SqlString.arrayToList(val, timeZone, dialect, format)})`;
      } else {
        sql += SqlString.escape(val, timeZone, dialect, format);
      }
      return sql;
    }, '');
  }
}
