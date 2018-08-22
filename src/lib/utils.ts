'use strict';

import * as Promise from 'bluebird';
import * as Inflection from 'inflection';
import * as _ from 'lodash';
import * as uuid from 'uuid';
import { Sequelize } from '..';
import DataTypes from './data-types';
import { IInclude } from './interfaces/iinclude';
import { Model } from './model';
import operators from './operators';
import { SqlString } from './sql-string';
import { Logger } from './utils/logger';
import { ParameterValidator } from './utils/parameter-validator';

export class Utils {

  private static inflection = Inflection;
  private static logger = new Logger(null);
  // Object.values is not supported for node version < 7.0.0
  private static operatorsArray = _.values(operators);
  // private static operatorsArray = Object.values(operators);
  private static primitives = ['string', 'number', 'boolean'];

  public static Promise = Promise;
  public static debug = Utils.logger.debug.bind(Utils.logger);
  public static deprecate = Utils.logger.deprecate.bind(Utils.logger);
  public static warn = Utils.logger.warn.bind(Utils.logger);
  public static getLogger = () =>  Utils.logger;
  public static validateParameter = ParameterValidator;

  // Note: Use the `quoteIdentifier()` and `escape()` methods on the
  // `QueryInterface` instead for more portable code.
  public static TICK_CHAR : string = '`';

  // @unused
  // private static _useInflection(_inflection) : void {
  //   Utils.inflection = _inflection;
  // }

  /**
   * camelize if condition is true
   */
  public static camelizeIf(str : string, condition : boolean) : string {
    let result : string = str;

    if (condition) {
      result = Utils.camelize(str);
    }

    return result;
  }

  /**
   * underscore if condition is true
   */
  public static underscoredIf(str : string, condition : boolean) : string {
    let result : string = str;

    if (condition) {
      result = Utils.underscore(str);
    }

    return result;
  }

  /**
   * return true if val is primitive
   */
  public static isPrimitive(val : any) : boolean {
    return Utils.primitives.indexOf(typeof val) !== -1;
  }

  /**
   * Same concept as _.merge, but don't overwrite properties that have already been assigned
   */
  public static mergeDefaults(a : {}, b : {}) : any {
    return _.mergeWith(a, b, objectValue => {
      // If it's an object, let _ handle it this time, we will be called again for each property
      if (!_.isPlainObject(objectValue) && objectValue !== undefined) {
        return objectValue;
      }
    });
  }

  /**
   * An alternative to _.merge, which doesn't clone its arguments
   * Cloning is a bad idea because options arguments may contain references to sequelize
   * models - which again reference database libs which don't like to be cloned (in particular pg-native)
   */
  public static merge(object : {}, options : {
    include? : IInclude[],
    /** Set name of the model. By default its same as Class name. */
    modelName? : string,
    sequelize? : Sequelize,
    user? : any,
  }) : {} {
    const result = {};

    for (const obj of arguments) {
      const keys = Object.keys(obj);
      keys.forEach(key => {
        if (typeof obj[key] !== 'undefined') {
          const value : any = obj[key];
          if (!result[key]) {
            result[key] = value;
          } else if (_.isPlainObject(value) && _.isPlainObject(result[key])) {
            result[key] = Utils.merge(result[key], value);
          } else if (Array.isArray(value) && Array.isArray(result[key])) {
            result[key] = value.concat(result[key]);
          } else {
            result[key] = value;
          }
        }
      });
    }
    return result;
  }

  /**
   * puts the first letter in lower case
   */
  public static lowercaseFirst(s : string) : string {
    return s[0].toLowerCase() + s.slice(1);
  }

  /**
   * puts the first letter in upper case
   */
  public static uppercaseFirst(s : string) : string {
    return s[0].toUpperCase() + s.slice(1);
  }

  /**
   * add a string in another string
   */
  public static spliceStr(str : string, index : number, count : number, add : string) : string {
    return str.slice(0, index) + add + str.slice(index + count);
  }

  /**
   * remove [-_\s.] of the string and puts the next letter in upper case
   * @hidden
   */
  public static camelize(str : string) : string {
    return str.trim().replace(/[-_\s]+(.)?/g, (match, c) => c.toUpperCase());
  }

  /**
   * puts the capital letter to lower case and add an underscore before each
   */
  public static underscore(str : string) : string {
    return Utils.inflection.underscore(str);
  }

  /**
   * format an array for the query
   */
  public static format(arr : any[], dialect? : string) : string {
    const timeZone = null;
    // Make a clone of the array because format modifies the passed args
    return SqlString.format(arr[0], arr.slice(1), timeZone, dialect);
  }

  public static formatNamedParameters(sql : string, parameters : any, dialect : string) : string {
    const timeZone = null;
    return SqlString.formatNamedParameters(sql, parameters, timeZone, dialect);
  }

  /**
   * clone an object
   */
  public static cloneDeep(obj : {}) : any {
    obj = obj || {};
    return _.cloneDeepWith(obj, elem => {
      // Do not try to customize cloning of arrays or POJOs
      if (Array.isArray(elem) || _.isPlainObject(elem)) {
        return undefined;
      }

      // Don't clone stuff that's an object, but not a plain one - fx example sequelize models and instances
      if (typeof elem === 'object') {
        return elem;
      }

      // Preserve special data-types like `fn` across clones. _.get() is used for checking up the prototype chain
      if (elem && typeof elem.clone === 'function') {
        return elem.clone();
      }
    });
  }

  /**
   * Expand and normalize finder options
   */
  public static mapFinderOptions(options : {
    /** : string | {}, assocation alias */
    as? : any,
    /** Array<String>|Object, A list of the attributes that you want to select, or an object with `include` and `exclude` keys. */
    attributes? : any,
    model? : Model<any, any>,
    parent? : {},
  }, model : Model<any, any>) : { attributes? : any} {
    if (model.hasVirtualAttributes && Array.isArray(options.attributes)) {
      for (const attribute of options.attributes) {
        if (model.isVirtualAttribute(attribute) && model.rawAttributes[attribute].type.fields) {
          options.attributes = options.attributes.concat(model.rawAttributes[attribute].type.fields);
        }
      }
      options.attributes = _.without.apply(_, [options.attributes].concat(model.virtualAttributes));
      options.attributes = _.uniq(options.attributes);
    }

    Utils.mapOptionFieldNames(options, model);

    return options;
  }

  /**
   * Used to map field names in attributes and where conditions
   */
  public static mapOptionFieldNames(options : {
    /** : string | {}, assocation alias */
    as? : any,
    /** Array<String>|Object, A list of the attributes that you want to select, or an object with `include` and `exclude` keys. */
    attributes? : any,
    /** An object of hook function that are called before and after certain lifecycle events */
    hooks? : boolean,
    /** Return raw result. */
    raw? : boolean,
    /** Error if no result found */
    rejectOnEmpty? : boolean,
    /** A hash of search attributes. */
    where? : {}
  }, model : Model<any, any>) : { attributes?, where? } {
    if (Array.isArray(options.attributes)) {
      options.attributes = options.attributes.map(attr => {
        // Object lookups will force any variable to strings, we don't want that for special objects etc
        if (typeof attr !== 'string') {
          return attr;
        }
        // Map attributes to aliased syntax attributes
        if (model.rawAttributes[attr] && attr !== model.rawAttributes[attr].field) {
          return [model.rawAttributes[attr].field, attr];
        }
        return attr;
      });
    }

    if (options.where && _.isPlainObject(options.where)) {
      options.where = Utils.mapWhereFieldNames(options.where, model);
    }

    return options;
  }

  /**
   *
   */
  public static mapWhereFieldNames(attributes : any , model : Model<any, any>) : string {
    if (attributes) {
      Utils.getComplexKeys(attributes).forEach(attribute => {
        const rawAttribute = model.rawAttributes[attribute];

        if (rawAttribute && rawAttribute.field !== rawAttribute.fieldName) {
          attributes[rawAttribute.field] = attributes[attribute];
          delete attributes[attribute];
        }

        if (_.isPlainObject(attributes[attribute])
          && !(rawAttribute && (
            rawAttribute.type instanceof DataTypes.HSTORE || rawAttribute.type instanceof DataTypes.JSON))) { // Prevent renaming of HSTORE & JSON fields
          attributes[attribute] = Utils.mapOptionFieldNames({ where: attributes[attribute] }, model).where;
        }

        if (Array.isArray(attributes[attribute])) {
          attributes[attribute] = attributes[attribute].map(where => {
            if (_.isPlainObject(where)) {
              return Utils.mapWhereFieldNames(where, model);
            }

            return where;
          });
        }

      });
    }

    return attributes;
  }

  /**
   * Used to map field names in values
   */
  public static mapValueFieldNames(dataValues : any , fields : string[], model : Model<any, any>) : any {
    const values = {};

    for (const attr of fields) {
      if (dataValues[attr] !== undefined && !model.isVirtualAttribute(attr)) {
        // Field name mapping
        if (model.rawAttributes[attr] && model.rawAttributes[attr].field && model.rawAttributes[attr].field !== attr) {
          values[model.rawAttributes[attr].field] = dataValues[attr];
        } else {
          values[attr] = dataValues[attr];
        }
      }
    }

    return values;
  }

  /**
   * return true if the value is a string like $string$
   */
  public static isColString(value : string) : boolean {
    return typeof value === 'string' && value.substr(0, 1) === '$' && value.substr(value.length - 1, 1) === '$';
  }

  // @unused
  public static argsArePrimaryKeys(args, primaryKeys) {
    let result = args.length === Object.keys(primaryKeys).length;
    if (result) {
      for (const arg of args) {
        if (result) {
          if (['number', 'string'].indexOf(typeof arg) !== -1) {
            result = true;
          } else {
            result = arg instanceof Date || Buffer.isBuffer(arg);
          }
        }
      }
    }
    return result;
  }

  public static canTreatArrayAsAnd(arr : any[]) {
    return arr.reduce((treatAsAnd, arg) => {
      if (treatAsAnd) {
        return treatAsAnd;
      } else {
        return _.isPlainObject(arg);
      }
    }, false);
  }

  /**
   * puts the 2 table name in alphabetical order and combine them
   */
  public static combineTableNames(tableName1 : string, tableName2 : string) : string {
    return tableName1.toLowerCase() < tableName2.toLowerCase() ? tableName1 + tableName2 : tableName2 + tableName1;
  }

  /**
   * Singularize a string
   */
  public static singularize(str : string) : string {
    return Utils.inflection.singularize(str);
  }

  /**
   * Pluralize a string
   */
  public static pluralize(str : string) : string {
    return Utils.inflection.pluralize(str);
  }

  // @unused
  public static removeCommentsFromFunctionString(s) {
    s = s.replace(/\s*(\/\/.*)/g, '');
    s = s.replace(/(\/\*[\n\r\s\S]*?\*\/)/mg, '');

    return s;
  }

  /**
   * return the default value of the type of value
   */
  public static toDefaultValue(value : any, dialect? : string) : any {
    if (typeof value === 'function') {
      if (value.prototype instanceof DataTypes.ABSTRACT) {
        return new value().toSql();
      } else {
        return value();
      }
    } else if (value instanceof DataTypes.UUIDV1) {
      return uuid.v1();
    } else if (value instanceof DataTypes.UUIDV4) {
      return uuid.v4();
    } else if (value instanceof DataTypes.NOW) {
      return Utils.now(dialect);
    } else if (_.isPlainObject(value) || Array.isArray(value)) {
      return _.clone(value);
    } else {
      return value;
    }
  }

  /**
   * Determine if the default value provided exists and can be described
   * in a db schema using the DEFAULT directive.
   *
   * @param value Any default value.
   */
  public static defaultValueSchemable(value : any) : boolean {
    if (typeof value === 'undefined') {
      return false;
    }

    // TODO this will be schemable when all supported db
    // have been normalized for this case
    if (value instanceof DataTypes.NOW) {
      return false;
    }

    if (value instanceof DataTypes.UUIDV1 || value instanceof DataTypes.UUIDV4) {
      return false;
    }

    if (typeof value === 'function') {
      return false;
    }

    return true;
  }

  public static removeNullValuesFromHash(hash : any, omitNull? : boolean, options : any = {}) : any {
    let result : any = hash;

    options.allowNull = options.allowNull || [];

    if (omitNull) {
      const _hash = {};

      const keys = Object.keys(hash);
      keys.forEach(key => {
        if (options.allowNull.indexOf(key) > -1 || key.match(/Id$/) || hash[key] != null) {
          _hash[key] = hash[key];
        }
      });

      result = _hash;
    }

    return result;
  }

  public static stack() {
    const orig = Error.prepareStackTrace;
    Error.prepareStackTrace = (__, stack) => stack;
    const err = new Error();
    Error.captureStackTrace(err, Utils.stack);
    const errStack = err.stack;
    Error.prepareStackTrace = orig;
    return errStack;
  }

  public static sliceArgs(args : any , begin : number = 0) {
    const tmp = new Array(args.length - begin);
    for (let i = begin; i < args.length; ++i) {
      tmp[i - begin] = args[i];
    }
    return tmp;
  }

  public static now(dialect : string) : Date {
    const now : Date = new Date();
    if (['mysql', 'postgres', 'sqlite', 'mssql', 'oracle'].indexOf(dialect) === -1) {
      now.setMilliseconds(0);
    }
    return now;
  }

  public static addTicks(s : string, tickChar : string = Utils.TICK_CHAR) : string {
    return tickChar + Utils.removeTicks(s, tickChar) + tickChar;
  }

  public static removeTicks(s : string, tickChar : string = Utils.TICK_CHAR) : string {
    tickChar = tickChar || Utils.TICK_CHAR;
    return s.replace(new RegExp(tickChar, 'g'), '');
  }

  /**
   * Receives a tree-like object and returns a plain object which depth is 1.
   *
   * - Input:
   *
   *  {
   *    name: 'John',
   *    address: {
   *      street: 'Fake St. 123',
   *      coordinates: {
   *        longitude: 55.6779627,
   *        latitude: 12.5964313
   *      }
   *    }
   *  }
   *
   * - Output:
   *
   *  {
   *    name: 'John',
   *    address.street: 'Fake St. 123',
   *    address.coordinates.latitude: 55.6779627,
   *    address.coordinates.longitude: 12.5964313
   *  }
   *
   * @param value, an Object
   * @returns an flattened object
   */
  public static flattenObjectDeep(value : {}) : {} {
    if (!_.isPlainObject(value)) {
      return value;
    }
    const flattenObject = (obj, flattenedObj = {}, subPath?) => {
      Object.keys(obj).forEach(key => {
        const pathToProperty = subPath ? `${subPath}.${key}` : `${key}`;
        if (typeof obj[key] === 'object') {
          flattenObject(obj[key], flattenedObj, pathToProperty);
        } else {
          flattenedObj[pathToProperty] = _.get(obj, key);
        }
      });
      return flattenedObj;
    };

    return flattenObject(value);
  }

  //Collection of helper methods to make it easier to work with symbol operators

  /**
   * getOperators
   * @returns Array<Symbol>, All operators properties of obj
   */
  public static getOperators(obj : {}) : any[] {
    return _.intersection(Object.getOwnPropertySymbols(obj || {}), Utils.operatorsArray);
  }

  /**
   * getComplexKeys
   * @returns Array<String|Symbol>, All keys including operators
   */
  public static getComplexKeys(obj : {}) : any {
    return Utils.getOperators(obj).concat(Object.keys(obj));
  }

  /**
   * getComplexSize
   * @returns Length of object properties including operators if obj is array returns its length
   */
  public static getComplexSize(obj : {}) : number {
    return Array.isArray(obj) ? obj.length : Utils.getComplexKeys(obj).length;
  }

  /**
   * Returns true if a where clause is empty, even with Symbols
   */
  public static isWhereEmpty(obj : {}) : boolean {
    return _.isEmpty(obj) && Utils.getOperators(obj).length === 0;
  }

  /**
   * Returns ENUM name by joining table and column name
   *
   */
  public static generateEnumName(tableName : string, columnName : string) : string {
    return 'enum_' + tableName + '_' + columnName;
  }

  /**
   * Returns an new Object which keys are camelized
   */
  public static camelizeObjectKeys(obj : {}) : {} {
    const newObj = new Object();
    Object.keys(obj).forEach(key => {
      newObj[Utils.camelize(key)] = obj[key];
    });
    return newObj;
  }

  /**
   * Assigns own and inherited enumerable string and symbol keyed properties of source
   * objects to the destination object.
   *
   * https://lodash.com/docs/4.17.4#defaults
   *
   * **Note:** This method mutates `object`.
   *
   * @param object The destination object.
   * @param arg The sources
   */
  public static defaults(object : {}, arg?) : {} {
    object = Object(object);

    const sources = _.tail(arguments);

    sources.forEach(source => {
      if (source) {
        source = Object(source);

        Utils.getComplexKeys(source).forEach(key => {
          const value = object[key];
          if (
            value === undefined || (
              _.eq(value, Object.prototype[key]) &&
              !Object.prototype.hasOwnProperty.call(object, key)
            )
          ) {
            object[key] = source[key];
          }
        });
      }
    });

    return object;
  }

  /**
   * replace all bind in a query
   */
  public replaceBinding(sql : string, bind : any[]) : string {
    if (bind) {
      const bindKeys = Object.keys(bind);
      for (let i = 0; i < bindKeys.length; i++) {
        const key = bindKeys[i];
        sql = sql.replace(':' + key, bind[key]);
      }
    }
    return sql;
  }
}

/**
 * Utility functions for representing SQL functions, and columns that should be escaped.
 * Please do not use these functions directly, use Sequelize.fn and Sequelize.col instead.
 */
export class SequelizeMethod {}

export class Fn extends SequelizeMethod {
  public fn;
  public args;
  constructor(fn, args) {
    super();
    this.fn = fn;
    this.args = args;
  }
  public clone() {
    return new Fn(this.fn, this.args);
  }
}

export class Col extends SequelizeMethod {
  public col;
  constructor(col) {
    super();
    if (arguments.length > 1) {
      col = Utils.sliceArgs(arguments);
    }
    this.col = col;
  }
}

export class Cast extends SequelizeMethod {
  public val;
  public type;
  public json;
  constructor(val, type, json?) {
    super();
    this.val = val;
    this.type = (type || '').trim();
    this.json = json || false;
  }
}

export class Literal extends SequelizeMethod {
  public val;
  constructor(val) {
    super();
    this.val = val;
  }
}

export class Json extends SequelizeMethod {
  public conditions;
  public path;
  public value;
  constructor(conditionsOrPath, value?) {
    super();
    if (_.isObject(conditionsOrPath)) {
      this.conditions = conditionsOrPath;
    } else {
      this.path = conditionsOrPath;
      if (value) {
        this.value = value;
      }
    }
  }
}

export class Where extends SequelizeMethod {
  public attribute;
  public comparator;
  public logic;
  constructor(attribute, comparator, logic) {
    super();
    if (logic === undefined) {
      logic = comparator;
      comparator = '=';
    }

    this.attribute = attribute;
    this.comparator = comparator;
    this.logic = logic;
  }
}
