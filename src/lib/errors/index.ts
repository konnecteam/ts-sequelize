'use strict';

import * as _ from 'lodash';
import { Model } from '../model';

/**
 * Sequelize provides a host of custom error classes, to allow you to do easier debugging. All of these errors are exposed on the sequelize object and the sequelize constructor.
 * All sequelize errors inherit from the base JS error object.
 *
 * This means that errors can be accessed using `Sequelize.ValidationError` or `sequelize.ValidationError`
 * The Base Error all Sequelize Errors inherit from.
 */
export class BaseError extends Error {
  constructor(message : any) {
    super(message);
    this.name = 'SequelizeBaseError';
    Error.captureStackTrace(this, this.constructor);
  }
}

/**
 * Scope Error. Thrown when the sequelize cannot query the specified scope.
 */
export class SequelizeScopeError extends BaseError {
  constructor(parent : Error | string) {
    super(parent);
    this.name = 'SequelizeScopeError';
    Error.captureStackTrace(this, this.constructor);
  }
}

/**
 * Validation Error. Thrown when the sequelize validation has failed. The error contains an `errors` property,
 * which is an array with 1 or more ValidationErrorItems, one for each validation that failed.
 *
 * @param message Error message
 * @param errors Array of ValidationErrorItem objects describing the validation errors
 *
 * @property errors {ValidationErrorItems[]}
 */
export class ValidationError extends BaseError {
  public errors : ValidationErrorItem[];
  constructor(message? : string, errors? : ValidationErrorItem[]) {
    super(message);
    this.name = 'SequelizeValidationError';
    this.message = 'Validation Error';
    /**
     *
     * @type {ValidationErrorItem[]}
     */
    this.errors = errors || [];

    // Use provided error message if available...
    if (message) {
      this.message = message;

      // ... otherwise create a concatenated message out of existing errors.
    } else if (this.errors.length > 0 && this.errors[0].message) {
      this.message = this.errors.map(err => (err.type || err.origin) + ': ' + err.message).join(',\n');
    }
    Error.captureStackTrace(this, this.constructor);
  }

  /**
   * Gets all validation error items for the path / field specified.
   *
   * @param path The path to be checked for error items
   * @returns {ValidationErrorItem[]} Validation error items for the specified path
   */
  public get(path : string) : ValidationErrorItem[] {
    return this.errors.reduce((reduced, error) => {
      if (error.path === path) {
        reduced.push(error);
      }
      return reduced;
    }, []);
  }
}

/**
 * Thrown when attempting to update a stale model instance
 */
export class OptimisticLockError extends BaseError {
  public modelName : string;
  public values : {};
  public where : {};
  constructor(options : {
    message? : string,
    /** Set name of the model. By default its same as Class name. */
    modelName? : string,
    values? : {},
    /** A hash of search attributes. */
    where? : {}
  }) {
    options = options || {};
    options.message = options.message || 'Attempting to update a stale model instance: ' + options.modelName;
    super(options);
    this.name = 'SequelizeOptimisticLockError';
    /**
     * The name of the model on which the update was attempted
     * @type {string}
     */
    this.modelName = options.modelName;
    /**
     * The values of the attempted update
     * @type {object}
     */
    this.values = options.values;
    /**
     *
     * @type {object}
     */
    this.where = options.where;
    Error.captureStackTrace(this, this.constructor);
  }
}

/**
 * A base class for all database related errors.
 */
export class DatabaseError extends BaseError {
  public parent : Error;
  public original : Error;
  public sql : string;
  constructor(parent : any) {
    super(parent.message);
    this.name = 'SequelizeDatabaseError';
    /**rors = options.errors;
     * this.fields = options.fields;
     * this.parent = options.parent;
     * this.origi
     * @type {Error}
     */
    this.parent = parent;
    /**
     * @type {Error}
     */
    this.original = parent;
    /**
     * The SQL that triggered the error
     * @type {string}
     */
    this.sql = parent.sql;
    Error.captureStackTrace(this, this.constructor);
  }
}

/**
 * Thrown when a database query times out because of a deadlock
 */
export class TimeoutError extends DatabaseError {
  constructor(parent : any) {
    super(parent);
    this.name = 'SequelizeTimeoutError';
    Error.captureStackTrace(this, this.constructor);
  }
}

/**
 * Thrown when a unique constraint is violated in the database
 */
export class UniqueConstraintError extends ValidationError {
  public fields : any;
  public parent : Error;
  public original : Error;
  public sql : string;
  constructor(options? : any) {
    options = options || {};
    options.parent = options.parent || { sql: '' };
    options.message = options.message || options.parent.message || 'Validation Error';
    options.errors = options.errors || {};
    super(options.message, options.errors);

    this.name = 'SequelizeUniqueConstraintError';
    this.errors = options.errors;
    this.fields = options.fields;
    this.parent = options.parent;
    this.original = options.parent;
    this.sql = options.parent.sql;
    Error.captureStackTrace(this, this.constructor);
  }
}

/**
 * Thrown when a foreign key constraint is violated in the database
 */
export class ForeignKeyConstraintError extends DatabaseError {
  public fields : any;
  public table : string;
  public value : any;
  public index : string;
  public reltype : any;
  constructor(options) {
    options = options || {};
    options.parent = options.parent || { sql: '' };

    super(options.parent);
    this.name = 'SequelizeForeignKeyConstraintError';

    this.message = options.message || options.parent.message || 'Database Error';
    this.fields = options.fields;
    this.table = options.table;
    this.value = options.value;
    this.index = options.index;
    this.reltype = options.reltype;
    Error.captureStackTrace(this, this.constructor);
  }
}

/**
 * Thrown when an exclusion constraint is violated in the database
 */
export class ExclusionConstraintError extends DatabaseError {
  public constraint;
  public fields;
  public table : string;
  constructor(options : { parent?, message? : string, constraint?, fields?, table? : string}) {
    options = options || {};
    options.parent = options.parent || { sql: '' };

    super(options.parent);
    this.name = 'SequelizeExclusionConstraintError';

    this.message = options.message || options.parent.message || '';
    this.constraint = options.constraint;
    this.fields = options.fields;
    this.table = options.table;
    Error.captureStackTrace(this, this.constructor);
  }
}

/**
 * Thrown when constraint name is not found in the database
 */
export class UnknownConstraintError extends DatabaseError {
  constructor(message) {
    const parent : any = { message };
    super(parent);
    this.name = 'SequelizeUnknownConstraintError';
    this.message = message || 'The specified constraint does not exist';
    Error.captureStackTrace(this, this.constructor);
  }
}

/**
 * Validation Error Item
 * Instances of this class are included in the `ValidationError.errors` property.
 *
 * @param message An error message
 * @param type The type/origin of the validation error
 * @param path The field that triggered the validation error
 * @param value The value that generated the error
 * @param inst the DAO instance that caused the validation error
 * @param validatorKey a validation "key", used for identification
 * @param fnName property name of the BUILT-IN validator function that caused the validation error (e.g. "in" or "len"), if applicable
 * @param fnArgs parameters used with the BUILT-IN validator function, if applicable
 */
export class ValidationErrorItem {
  public message : string;
  public type : string;
  public path : string;
  public value : string;
  public origin;
  public instance : Model;
  public validatorKey : string;
  public validatorName : string;
  public validatorArgs;
  public static Origins;
  public static TypeStringMap;
  constructor(message : string, type : string, path : string, value? : string, inst? : Model, validatorKey? : string, fnName? : string, fnArgs? : any[]) {
    /**
     * An error message
     *
     * @type {String} message
     */
    this.message = message || '';

    /**
     * The type/origin of the validation error
     *
     * @type {String}
     */
    this.type = null;

    /**
     * The field that triggered the validation error
     *
     * @type {String}
     */
    this.path = path || null;

    /**
     * The value that generated the error
     *
     * @type {String}
     */
    this.value = value !== undefined ? value : null;

    this.origin = null;

    /**
     * The DAO instance that caused the validation error
     *
     * @type {Model}
     */
    this.instance = inst || null;

    /**
     * A validation "key", used for identification
     *
     * @type {String}
     */
    this.validatorKey = validatorKey || null;

    /**
     * Property name of the BUILT-IN validator function that caused the validation error (e.g. "in" or "len"), if applicable
     *
     * @type {String}
     */
    this.validatorName = fnName || null;

    /**
     * Parameters used with the BUILT-IN validator function, if applicable
     *
     * @type {String}
     */
    this.validatorArgs = fnArgs || [];

    if (type) {
      if (ValidationErrorItem.Origins[ type ]) {
        this.origin = type;
      } else {
        const lowercaseType = _.toLower(type + '').trim();
        const realType  = ValidationErrorItem.TypeStringMap[ lowercaseType ];

        if (realType && ValidationErrorItem.Origins[ realType ]) {
          this.origin = realType;
          this.type = type;
        }
      }
    }

    // This doesn't need captureStackTrace because it's not a subclass of Error
  }

  /**
   * return a lowercase, trimmed string "key" that identifies the validator.
   *
   * Note: the string will be empty if the instance has neither a valid `validatorKey` property nor a valid `validatorName` property
   *
   * @param useTypeAsNS = true, controls whether the returned value is "namespace",
   * this parameter is ignored if the validator's `type` is not one of ValidationErrorItem.Origins
   * @param NSSeparator = '.', a separator string for concatenating the namespace, must be not be empty,
   * defaults to "." (fullstop). only used and validated if useTypeAsNS is TRUE.
   * @throws {Error} thrown if NSSeparator is found to be invalid.
   * @hidden
   */
  private _getValidatorKey(useTypeAsNS : boolean, NSSeparator : string) : string {
    const useTANS = typeof useTypeAsNS === 'undefined' ?  true : !!useTypeAsNS;
    const NSSep = typeof NSSeparator === 'undefined' ? '.' : NSSeparator;

    const type = this.origin;
    const key = this.validatorKey || this.validatorName;
    const useNS = useTANS && type && ValidationErrorItem.Origins[ type ];

    if (useNS && (typeof NSSep !== 'string' || !NSSep.length)) {
      throw new Error('Invalid namespace separator given, must be a non-empty string');
    }

    if (!(typeof key === 'string' && key.length)) {
      return '';
    }

    return _.toLower(useNS ? [type, key].join(NSSep) : key).trim();
  }

  /**
   * @internal
   * @hidden
   */
  public getValidatorKey(useTypeAsNS : boolean, NSSeparator : string) : string {
    return this._getValidatorKey(useTypeAsNS, NSSeparator);
  }
}


/**
 * An enum that defines valid ValidationErrorItem `origin` values
 *
 * @type {Object}
 * @property CORE       {String}  specifies errors that originate from the sequelize "core"
 * @property DB         {String}  specifies validation errors that originate from the storage engine
 * @property FUNCTION   {String}  specifies validation errors that originate from validator functions (both built-in and custom) defined for a given attribute
 */
ValidationErrorItem.Origins = {
  CORE: 'CORE',
  DB: 'DB',
  FUNCTION: 'FUNCTION'
};

/**
 * An object that is used internally by the `ValidationErrorItem` class
 * that maps current `type` strings (as given to ValidationErrorItem.constructor()) to
 * our new `origin` values.
 *
 * @type {Object}
 */
ValidationErrorItem.TypeStringMap = {
  'notnull violation': 'CORE',
  'string violation': 'CORE',
  'unique violation': 'DB',
  'validation error': 'FUNCTION'
};

/**
 * A base class for all connection related errors.
 */
export class ConnectionError extends BaseError {
  public parent : Error;
  public original : Error;
  constructor(parent : any) {
    super(parent ? parent.message : '');
    this.name = 'SequelizeConnectionError';
    /**
     * The connection specific error which triggered this one
     * @type {Error}
     */
    this.parent = parent;
    this.original = parent;
    Error.captureStackTrace(this, this.constructor);
  }
}

/**
 * Thrown when a connection to a database is refused
 */
export class ConnectionRefusedError extends ConnectionError {
  constructor(parent : Error) {
    super(parent);
    this.name = 'SequelizeConnectionRefusedError';
    Error.captureStackTrace(this, this.constructor);
  }
}

/**
 * Thrown when a connection to a database is refused due to insufficient privileges
 */
export class AccessDeniedError extends ConnectionError {
  constructor(parent : Error) {
    super(parent);
    this.name = 'SequelizeAccessDeniedError';
    Error.captureStackTrace(this, this.constructor);
  }
}

/**
 * Thrown when a connection to a database has a hostname that was not found
 */
export class HostNotFoundError extends ConnectionError {
  constructor(parent : Error) {
    super(parent);
    this.name = 'SequelizeHostNotFoundError';
    Error.captureStackTrace(this, this.constructor);
  }
}

/**
 * Thrown when a connection to a database has a hostname that was not reachable
 */
export class HostNotReachableError extends ConnectionError {
  constructor(parent : Error) {
    super(parent);
    this.name = 'SequelizeHostNotReachableError';
    Error.captureStackTrace(this, this.constructor);
  }
}

/**
 * Thrown when a connection to a database has invalid values for any of the connection parameters
 */
export class InvalidConnectionError extends ConnectionError {
  constructor(parent : Error) {
    super(parent);
    this.name = 'SequelizeInvalidConnectionError';
    Error.captureStackTrace(this, this.constructor);
  }
}

/**
 * Thrown when a connection to a database times out
 */
export class ConnectionTimedOutError extends ConnectionError {
  constructor(parent : Error) {
    super(parent);
    this.name = 'SequelizeConnectionTimedOutError';
    Error.captureStackTrace(this, this.constructor);
  }
}

/**
 * Thrown when a some problem occurred with Instance methods (see message for details)
 */
export class InstanceError extends BaseError {
  constructor(message : string) {
    super(message);
    this.name = 'SequelizeInstanceError';
    Error.captureStackTrace(this, this.constructor);
  }
}

/**
 * Thrown when a record was not found, Usually used with rejectOnEmpty mode (see message for details)
 */
export class EmptyResultError extends BaseError {
  constructor(message? : string) {
    super(message);
    this.name = 'SequelizeEmptyResultError';
    Error.captureStackTrace(this, this.constructor);
  }
}

/**
 * Thrown when an include statement is improperly constructed (see message for details)
 */
export class EagerLoadingError extends BaseError {
  constructor(message : string) {
    super(message);
    this.name = 'SequelizeEagerLoadingError';
    Error.captureStackTrace(this, this.constructor);
  }
}

/**
 * Thrown when an association is improperly constructed (see message for details)
 */
export class AssociationError extends BaseError {
  constructor(message : string) {
    super(message);
    this.name = 'SequelizeAssociationError';
    Error.captureStackTrace(this, this.constructor);
  }
}
/**
 * Thrown when a query is passed invalid options (see message for details)
 */
export class QueryError extends BaseError {
  constructor(message : string) {
    super(message);
    this.name = 'SequelizeQueryError';
    Error.captureStackTrace(this, this.constructor);
  }
}
