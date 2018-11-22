'use strict';

import * as assert from 'assert';
import * as Dottie from 'dottie';
import * as _ from 'lodash';
import * as moment from 'moment';
import { Sequelize } from '..';
import { Association } from './associations/base';
import { BelongsTo } from './associations/belongs-to';
import { BelongsToMany } from './associations/belongs-to-many';
import { HasMany } from './associations/has-many';
import { Mixin } from './associations/mixin';
import DataTypes from './data-types';
import { AbstractQueryGenerator } from './dialects/abstract/abstract-query-generator';
import * as sequelizeErrors from './errors/index';
import * as Hooks from './hooks';
import { InstanceValidator } from './instance-validator';
import { IInclude } from './model/iinclude';
import { IModelOptions } from './model/imodel-options';
import Op from './operators';
import Promise from './promise';
import { AbstractQueryInterface } from './query-interface';
import { QueryTypes } from './query-types';
import { Transaction } from './transaction';
import * as AllUtils from './utils';

const Utils = AllUtils.Utils;
const defaultsOptions = { raw: true };

/**
 * A Model represents a table in the database. Instances of this class represent a database row.
 *
 * Model instances operate with the concept of a `dataValues` property, which stores the actual values represented by the instance.
 * By default, the values from dataValues can also be accessed directly from the Instance, that is:
 * ```js
 * instance.field
 * // is the same as
 * instance.get('field')
 * // is the same as
 * instance.getDataValue('field')
 * ```
 * However, if getters and/or setters are defined for `field` they will be invoked, instead of returning the value from `dataValues`.
 * Accessing properties directly or using `get` is preferred for regular use, `getDataValue` should only be used for custom getters.
 *
 * @see {@link Sequelize#define} for more information about getters and setters
 * @class Model
 * @mixes Hooks
 */
export class Model extends Mixin {

  public __eagerlyLoadedAssociations : any[];
  public _changed : {};
  public _customGetters : {};
  public _customSetters : {};
  public _hasCustomGetters : number;
  public _hasCustomSetters : number;
  public _isAttribute;
  public _modelOptions : { hasTrigger? : boolean, whereCollection?, validate? };
  public _options : { include?, includeNames?, includeMap? };
  public _previousDataValues : {};
  public _schema : string;
  public _schemaDelimiter : string;
  public _scope;
  public _scopeNames : string;
  public attributes : string[];
  public dataValues : {};
  public isNewRecord : boolean;
  public options : {};
  public rawAttributes : {};
  public scoped;
  public updateAttributes;
  public validators : {};
  /**
   * trick in order to use this.constructor to call static attributes and functions from instances of Model extended classes
   */
  public ['constructor'] : typeof Model;

  public static _booleanAttributes : any[];
  public static _dataTypeChanges : {};
  public static _dataTypeSanitizers : {};
  public static _dateAttributes : string[];
  public static _defaultValues : {};
  public static _geometryAttributes : any[];
  public static _hasBooleanAttributes : boolean;
  public static _hasDateAttributes : boolean;
  public static _hasDefaultValues : boolean;
  public static _hasGeometryAttributes : boolean;
  public static _hasHstoreAttributes : boolean;
  public static _hasJsonAttributes : boolean;
  public static _hasPrimaryKeys : boolean;
  public static _hasRangeAttributes : boolean;
  public static _hasReadOnlyAttributes : number;
  public static _hstoreAttributes : any[];
  public static _isBooleanAttribute;
  public static _isDateAttribute;
  public static _isGeometryAttribute;
  public static _isHstoreAttribute;
  public static _isJsonAttribute;
  public static _isPrimaryKey;
  public static _isRangeAttribute;
  public static _isReadOnlyAttribute;
  public static _jsonAttributes : any[];
  public static _rangeAttributes : any[];
  public static _readOnlyAttributes : any[];
  public static _schema : string;
  public static _schemaDelimiter : string;
  public static _scope : {};
  public static _scopeNames : string[];
  public static _timestampAttributes : { createdAt?, updatedAt?, deletedAt? };
  public static _versionAttribute;
  public static associations : {};
  public static autoIncrementAttribute : string;
  public static fieldAttributeMap : {};
  public static fieldRawAttributesMap : {};
  public static hasVirtualAttributes : boolean;
  public static isVirtualAttribute;
  public static options : IModelOptions;
  public static primaryKeyAttribute : string;
  public static primaryKeyAttributes : string[];
  public static primaryKeyField : string;
  public static primaryKeys : { id? };
  public static rawAttributes : { id? };
  public static sequelize : Sequelize;
  public static tableAttributes : {};
  public static tableName : any;
  public static underscored : boolean;
  public static underscoredAll : boolean;
  public static uniqueKeys : {};
  public static virtualAttributes : any[];
  public static attributes : {};
  public static find;
  public static findAndCountAll;
  public static findByPrimary;
  public static findOrInitialize;
  public static insertOrUpdate;

  public static get QueryInterface() : AbstractQueryInterface {
    return this.sequelize.getQueryInterface();
  }

  public static get QueryGenerator() : AbstractQueryGenerator {
    return this.QueryInterface.QueryGenerator;
  }

  /**
   * validateIncludedElements should have been called before this method
   * @hidden
   */
  private static _paranoidClause(model : typeof Model, options : {
    /** : string | {}, assocation alias */
    as? : string;
    association? : Association;
    /** Array<String>|Object, A list of the attributes that you want to select, or an object with `include` and `exclude` keys. */
    attributes? : any;
    duplicating? : boolean;
    /** limit on group by - auto-completed */
    groupedLimit? : {
      through?
    };
    hasDuplicating? : boolean;
    hasIncludeRequired? : boolean;
    hasJoin? : boolean;
    hasMultiAssociation? : boolean;
    hasParentRequired? : boolean;
    hasParentWhere? : boolean;
    hasRequired? : boolean;
    hasSingleAssociation? : boolean;
    hasWhere? : boolean;
    /** An object of hook function that are called before and after certain lifecycle events */
    hooks? : boolean;
    /**
     * Array<Object|Model|String>, A list of associations to eagerly load using a left join.
     * Supported is either `{ include: [ Model1, Model2, ...]}` or `{ include: [{ model: Model1, as: 'Alias' }]}` or `{ include: ['Alias']}`.
     * If your association are set up with an `as` (eg. `X.hasMany(Y, { as: 'Z }`, you need to specify Z in the as attribute when eager loading Y).
     */
    include? : any[];
    /** Internal map of includes - auto-completed */
    includeMap? : {};
    /** Internal array of attributes - auto-completed */
    includeNames? : string[];
    model? : typeof Model;
    /** = false, Calling `destroy` will not delete the model, but instead set a `deletedAt` timestamp if this is true. Needs `timestamps=true` to work */
    paranoid? : boolean;
    parent? : {};
    /** Specify if we want only one row without using an array */
    plain? : boolean;
    /** Throws an error when no records found */
    rejectOnEmpty? : boolean | any;
    required? : boolean;
    /** Passes by sub-query ? */
    subQuery? : boolean;
    subQueryFilter? : boolean;
    topLimit? : any;
    topModel? : typeof Model;
    /** A hash of search attributes. */
    where? : {};
  }) : {} {
    options = options || {};

    // Apply on each include
    // This should be handled before handling where conditions because of logic with returns
    // otherwise this code will never run on includes of a already conditionable where
    if (options.include) {
      for (const include of options.include) {
        this._paranoidClause(include.model, include);
      }
    }

    // apply paranoid when groupedLimit is used
    if (_.get(options, 'groupedLimit.on.options.paranoid')) {
      const throughModel = _.get(options, 'groupedLimit.on.through.model');
      if (throughModel) {
        options.groupedLimit.through = this._paranoidClause(throughModel, options.groupedLimit.through);
      }
    }

    if (!model.options.timestamps || !model.options.paranoid || options.paranoid === false) {
      // This model is not paranoid, nothing to do here;
      return options;
    }

    const deletedAtCol = model._timestampAttributes.deletedAt;
    const deletedAtAttribute = model.rawAttributes[deletedAtCol];
    const deletedAtObject = {};
    const now = Utils.now(this.sequelize.options.dialect);

    let deletedAtDefaultValue = deletedAtAttribute.hasOwnProperty('defaultValue') ? deletedAtAttribute.defaultValue : null;

    deletedAtDefaultValue = deletedAtDefaultValue || {
      [Op.or]: {
        [Op.gt]: now,
        [Op.eq]: null
      }
    };

    deletedAtObject[deletedAtAttribute.field || deletedAtCol] = deletedAtDefaultValue;

    if (Utils.isWhereEmpty(options.where)) {
      options.where = deletedAtObject;
    } else {
      options.where = { [Op.and]: [deletedAtObject, options.where] };
    }

    return options;
  }

  /**
   * Add the default attributes
   * @internal
   * @hidden
   */
  private static _addDefaultAttributes() {
    const tail = {};
    let head = {};

    // Add id if no primary key was manually added to definition
    // Can't use this.primaryKeys here, since this function is called before PKs are identified
    if (!_.some(this.rawAttributes, 'primaryKey')) {
      if ('id' in this.rawAttributes) {
        // Something is fishy here!
        throw new Error(`A column called 'id' was added to the attributes of '${this.tableName}' but not marked with 'primaryKey: true'`);
      }

      head = {
        id: {
          type: new DataTypes.INTEGER(),
          allowNull: false,
          primaryKey: true,
          autoIncrement: true,
          _autoGenerated: true
        }
      };
    }

    if (this._timestampAttributes.createdAt) {
      tail[this._timestampAttributes.createdAt] = {
        type: DataTypes.DATE,
        allowNull: false,
        _autoGenerated: true
      };
    }

    if (this._timestampAttributes.updatedAt) {
      tail[this._timestampAttributes.updatedAt] = {
        type: DataTypes.DATE,
        allowNull: false,
        _autoGenerated: true
      };
    }

    if (this._timestampAttributes.deletedAt) {
      tail[this._timestampAttributes.deletedAt] = {
        type: DataTypes.DATE,
        _autoGenerated: true
      };
    }

    if (this._versionAttribute) {
      tail[this._versionAttribute] = {
        type: DataTypes.INTEGER,
        allowNull: false,
        defaultValue: 0,
        _autoGenerated: true
      };
    }

    const existingAttributes = _.clone(this.rawAttributes);
    this.rawAttributes = {};

    Object.keys(head).forEach(attr => {
      this.rawAttributes[attr] = head[attr];
    });

    Object.keys(existingAttributes).forEach(attr => {
      this.rawAttributes[attr] = existingAttributes[attr];
    });

    Object.keys(tail).forEach(attr => {
      if (_.isUndefined(this.rawAttributes[attr])) {
        this.rawAttributes[attr] = tail[attr];
      }
    });

    if (!Object.keys(this.primaryKeys).length) {
      this.primaryKeys.id = this.rawAttributes.id;
    }
  }

  /**
   * find the auto increment attribute in rawAttributes
   * @hidden
   */
  private static _findAutoIncrementAttribute() {
    this.autoIncrementAttribute = null;

    Object.keys(this.rawAttributes).forEach(name => {
      const definition = this.rawAttributes[name];
      if (definition && definition.autoIncrement) {
        if (this.autoIncrementAttribute) {
          throw new Error('Invalid Instance definition. Only one autoincrement field allowed.');
        } else {
          this.autoIncrementAttribute = name;
        }
      }
    });
  }

  /**
   * check if options provided is valid
   * @hidden
   */
  private static _conformOptions(options : {
    /** The schema that the tables should be created in. This can be overriden for each table in sequelize.define */
    _schema? : string,
    _schemaDelimiter? : string,
    /** Array<String>|Object, A list of the attributes that you want to select, or an object with `include` and `exclude` keys. */
    attributes? : any,
    /** : string | {}, assocation alias */
    as? : string | {},
    /** An object of hook function that are called before and after certain lifecycle events */
    hooks? : boolean,
    /**
     * Array<Object|Model|String>, A list of associations to eagerly load using a left join.
     * Supported is either `{ include: [ Model1, Model2, ...]}` or `{ include: [{ model: Model1, as: 'Alias' }]}` or `{ include: ['Alias']}`.
     * If your association are set up with an `as` (eg. `X.hasMany(Y, { as: 'Z }`, you need to specify Z in the as attribute when eager loading Y).
     */
    include? : IInclude[],
    isNewRecord? : boolean,
    model? : typeof Model,
    /** Specify if we want only one row without using an array */
    plain? : boolean,
    /** = false, If set to true, values will ignore field and virtual setters. */
    raw? : boolean,
    /** Throws an error when no records found */
    rejectOnEmpty? : boolean,
    silent? : boolean,
    /** A hash of search attributes. */
    where? : {}
  }, self? : typeof Model) {
    if (self) {
      self._expandAttributes(options);
    }

    if (!options.include) {
      return;
    }
    // if include is not an array, wrap in an array
    if (!Array.isArray(options.include)) {
      options.include = [options.include];
    } else if (!options.include.length) {
      delete options.include;
      return;
    }

    // convert all included elements to { model: Model } form
    options.include = options.include.map(include => this._conformInclude(include, self));
  }

  /**
   * @jesaiplus
   * @hidden
   */
  public static conformOptions(options : {
    /** The schema that the tables should be created in. This can be overriden for each table in sequelize.define */
    _schema? : string,
    _schemaDelimiter? : string,
    /** Array<String>|Object, A list of the attributes that you want to select, or an object with `include` and `exclude` keys. */
    attributes? : any,
    /** : string | {}, assocation alias */
    as? : string | {},
    /** An object of hook function that are called before and after certain lifecycle events */
    hooks? : boolean,
    /**
     * Array<Object|Model|String>, A list of associations to eagerly load using a left join.
     * Supported is either `{ include: [ Model1, Model2, ...]}` or `{ include: [{ model: Model1, as: 'Alias' }]}` or `{ include: ['Alias']}`.
     * If your association are set up with an `as` (eg. `X.hasMany(Y, { as: 'Z }`, you need to specify Z in the as attribute when eager loading Y).
     */
    include? : any[],
    isNewRecord? : boolean,
    model? : typeof Model,
    /** Specify if we want only one row without using an array */
    plain? : boolean,
    /** = false, If set to true, values will ignore field and virtual setters. */
    raw? : boolean,
    /** Throws an error when no records found */
    rejectOnEmpty? : boolean,
    silent? : boolean,
    /** A hash of search attributes. */
    where? : {}
  }, self? : typeof Model) {
    this._conformOptions(options, self);
  }

  /**
   * returns the association specified by include
   * @hidden
   */
  private static _transformStringAssociation(include : IInclude | string, self : typeof Model) {
    if (self && typeof include === 'string') {
      if (!self.associations.hasOwnProperty(include)) {
        throw new Error('Association with alias "' + include + '" does not exists');
      }
      return self.associations[include];
    }
    return include;
  }

  /**
   * @hidden
   */
  private static _conformInclude(include?, self? : typeof Model) {
    let model;

    if (include._pseudo) {
      return include;
    }

    include = this._transformStringAssociation(include, self);

    if (include instanceof Association) {
      if (self && include.target.name === self.name) {
        model = include.source;
      } else {
        model = include.target;
      }

      include = { model, association: include, as: include.as };
    } else if (include.prototype && include.prototype instanceof Model) {
      include = { model: include };
    } else if (_.isPlainObject(include)) {
      if (include.association) {

        include.association = this._transformStringAssociation(include.association, self);

        if (self && include.association.target.name === self.name) {
          model = include.association.source;
        } else {
          model = include.association.target;
        }

        if (!include.model) {
          include.model = model;
        }
        if (!include.as) {
          include.as = include.association.as;
        }
      } else {
        model = include.model;
      }

      this._conformOptions(include, model);
    } else {
      throw new Error('Include unexpected. Element has to be either a Model, an Association or an object.');
    }

    return include;
  }

  /**
   * check 'all' attribute provided is valid
   * @hidden
   */
  private static _expandIncludeAllElement(includes : IInclude[], include : { all?, nested?, include? }) {
    let all = include.all;
    delete include.all;

    if (all !== true) {
      if (!Array.isArray(all)) {
        all = [all];
      }

      const validTypes = {
        BelongsTo: true,
        HasOne: true,
        HasMany: true,
        One: ['BelongsTo', 'HasOne'],
        Has: ['HasOne', 'HasMany'],
        Many: ['HasMany']
      };

      for (let i = 0; i < all.length; i++) {
        const type = all[i];
        if (type === 'All') {
          all = true;
          break;
        }

        const types = validTypes[type];
        if (!types) {
          throw new sequelizeErrors.EagerLoadingError('include all \'' + type + '\' is not valid - must be BelongsTo, HasOne, HasMany, One, Has, Many or All');
        }

        if (types !== true) {
          // replace type placeholder e.g. 'One' with its constituent types e.g. 'HasOne', 'BelongsTo'
          all.splice(i, 1);
          i--;
          for (let j = 0; j < types.length; j++) {
            if (all.indexOf(types[j]) === -1) {
              all.unshift(types[j]);
              i++;
            }
          }
        }
      }
    }

    // add all associations of types specified to includes
    const nested = include.nested;
    if (nested) {
      delete include.nested;

      if (!include.include) {
        include.include = [];
      } else if (!Array.isArray(include.include)) {
        include.include = [include.include];
      }
    }

    const used = [];
    (function addAllIncludes(parent, allIncludes) {
      _.forEach(parent.associations, (association : Association) => {
        if (all !== true && all.indexOf(association.associationType) === -1) {
          return;
        }

        // check if model already included, and skip if so
        const model = association.target;
        const as = association.options.as;

        const predicate : {
          model : any,
          /** : string | {}, assocation alias */
          as? : string
        } = {
          model
        };
        if (as) {
          // We only add 'as' to the predicate if it actually exists
          predicate.as = as;
        }

        if (_.find(allIncludes, predicate)) {
          return;
        }

        // skip if recursing over a model already nested
        if (nested && used.indexOf(model) !== -1) {
          return;
        }
        used.push(parent);

        // include this model
        const thisInclude = Utils.cloneDeep(include);
        thisInclude.model = model;
        if (as) {
          thisInclude.as = as;
        }
        allIncludes.push(thisInclude);

        // run recursively if nested
        if (nested) {
          addAllIncludes(model, thisInclude.include);
          if (thisInclude.include.length === 0) {
            delete thisInclude.include;
          }
        }
      });
      used.pop();
    })(this, includes);
  }

  /**
   * check if the included options provided is valid
   */
  public static _validateIncludedElements(options : {
    /** : string | {}, assocation alias */
    as? : any,
    hasDuplicating? : boolean;
    hasIncludeRequired? : boolean;
    hasIncludeWhere? : boolean;
    hasJoin? : boolean;
    hasMultiAssociation? : boolean;
    hasParentRequired? : boolean;
    hasParentWhere? : boolean;
    hasRequired? : boolean;
    hasSingleAssociation? : boolean;
    hasWhere? : boolean;
    /** Having clause */
    having? : {};
    /** An object of hook function that are called before and after certain lifecycle events */
    hooks? : boolean;
    /**
     * Array<Object|Model|String>, A list of associations to eagerly load using a left join.
     * Supported is either `{ include: [ Model1, Model2, ...]}` or `{ include: [{ model: Model1, as: 'Alias' }]}` or `{ include: ['Alias']}`.
     * If your association are set up with an `as` (eg. `X.hasMany(Y, { as: 'Z }`, you need to specify Z in the as attribute when eager loading Y).
     */
    include? : IInclude[];
    /** Internal map of includes - auto-completed */
    includeMap? : {};
    /** Internal array of attributes - auto-completed */
    includeNames? : string[];
    /** The maximum count you want to get. */
    limit? : number;
    model? : typeof Model;
    parent? : {};
    /** Throws an error when no records found */
    rejectOnEmpty? : boolean | any;
    required? : boolean
    /** Passes by sub-query ? */
    subQuery? : boolean;
    topLimit? : any;
    topModel? : typeof Model;
    /** A hash of search attributes. */
    where? : {};
  }, tableNames? : {}) : {
    include? : IInclude[];
    /** Internal map of includes - auto-completed */
    includeMap? : {};
    /** Internal array of attributes - auto-completed */
    includeNames? : string[];
    /** Passes by sub-query ? */
    subQuery? : boolean;
  } {
    if (!options.model) {
      options.model = this;
    }
    tableNames = tableNames || {};
    options.includeNames = [];
    options.includeMap = {};

    /* Legacy */
    options.hasSingleAssociation = false;
    options.hasMultiAssociation = false;

    if (!options.parent) {
      options.topModel = options.model;
      options.topLimit = options.limit;
    }

    options.include = options.include.map(include => {
      include = this._conformInclude(include);
      include.parent = options;

      this._validateIncludedElement.call(options.model, include, tableNames, options);

      if (include.duplicating === undefined) {
        include.duplicating = include.association.isMultiAssociation || (include.required && include.parent.association && include.parent.association instanceof HasMany && Model.hasParentLimit(include)) ? true : false;
      }

      include.hasDuplicating = include.hasDuplicating || include.duplicating;
      include.hasRequired = include.hasRequired || include.required;

      options.hasDuplicating = options.hasDuplicating || include.hasDuplicating;
      options.hasRequired = options.hasRequired || include.required;

      options.hasWhere = options.hasWhere || include.hasWhere || !!include.where;
      return include;
    });

    for (const include of options.include) {
      include.hasParentWhere = options.hasParentWhere || !!options.where;
      include.hasParentRequired = options.hasParentRequired || !!options.required;

      if (include.subQuery !== false && options.hasDuplicating && options.topLimit) {
        if (include.duplicating) {
          include.subQuery = false;
          include.subQueryFilter = include.hasRequired;
        } else {
          include.subQuery = include.hasRequired;
          include.subQueryFilter = false;
        }
      } else {
        include.subQuery = include.subQuery || false;
        if (include.duplicating) {
          include.subQueryFilter = include.subQuery;
          include.subQuery = false;
        } else {
          include.subQueryFilter = false;
          include.subQuery = include.subQuery || (include.hasParentRequired && include.hasRequired && Model.hasReqOrParentRequired(include, false));
        }
      }

      options.includeMap[include.as] = include;
      options.includeNames.push(include.as);

      // Set top level options
      if (options.topModel === options.model && options.subQuery === undefined && options.topLimit) {
        if (include.subQuery) {
          options.subQuery = include.subQuery;
        } else if (include.hasDuplicating) {
          options.subQuery = true;
        }
      }

      /* Legacy */
      options.hasIncludeWhere = options.hasIncludeWhere || include.hasIncludeWhere || !!include.where;
      options.hasIncludeRequired = options.hasIncludeRequired || include.hasIncludeRequired || !!include.required;

      if (include.association.isMultiAssociation || include.hasMultiAssociation) {
        options.hasMultiAssociation = true;
      }
      if (include.association.isSingleAssociation || include.hasSingleAssociation) {
        options.hasSingleAssociation = true;
      }
    }

    if (options.topModel === options.model && options.subQuery === undefined) {
      options.subQuery = false;
    }
    return options;
  }

  /**
   * return true if this model has a parent limit
   * @hidden
   */
  private static hasParentLimit(include : IInclude) : boolean {
    let parent = include.parent;

    while (parent) {
      if (parent.limit) {
        return true;
      } else {
        parent = parent.parent;
      }
    }

    return false;
  }

  /**
   * @unused
   */
  // private static hasParentHMOrBTM(include : IInclude, checkSelf : boolean = false) : boolean {
  //   let parent = include.parent;

  //   if (checkSelf) {
  //     if (include.association instanceof HasMany || include.association instanceof BelongsToMany) {
  //       return true;
  //     }
  //   }

  //   while (parent) {
  //     if (parent.association instanceof HasMany || parent.association instanceof BelongsToMany) {
  //       return true;
  //     } else {
  //       parent = parent.parent;
  //     }
  //   }

  //   return false;
  // }

  /**
   * return true if this model and his parents are required
   */
  public static hasReqOrParentRequired(include : IInclude, ignoreSelf : boolean = false) : boolean {
    if (ignoreSelf === false && !include.required) {
      return false;
    }

    let parent = include.parent;

    while (parent) {
      if (!(parent.required) && parent.parent) {
        return false;
      } else {
        parent = parent.parent;
      }
    }

    return true;
  }

  public static hasParentMismatchOrRequired(include : IInclude, ignoreSelf : boolean = false) : boolean {
    if (ignoreSelf === false && (!(include.required) && !(include.mismatch))) {
      return false;
    }

    let parent = include.parent;

    while (parent) {
      if ((!(parent.required) && !(parent.mismatch)) && parent.parent) {
        return false;
      } else {
        parent = parent.parent;
      }
    }

    return true;
  }

  // static hasTopParentMismatchOrRequired(include) {

  //   let parent = include;

  //   while (parent.parent && parent.parent.parent) {
  //     parent = parent.parent;
  //   }

  //   if (parent.required || parent.mismatch) {
  //     return true;
  //   } else {
  //     return false;
  //   }
  // }

  /**
   * return true if a parent of this model exist in limit query
   */
  public static parentExistInLimitQuery(include : IInclude) : boolean {
    let parent = include.parent;

    while (parent) {
      if (parent.inSubQuery) {
        return true;
      } else {
        parent = parent.parent;
      }
    }

    return false;
  }

  /**
   * return true if a parent of this model has a HasMany association
   */
  public static hasParentHasMany(include : IInclude) : boolean {
    let parent = include.parent;

    while (parent) {
      if (parent.association instanceof HasMany) {
        return true;
      } else {
        parent = parent.parent;
      }
    }

    return false;
  }

  /**
   * return true if a parent of this model has a BelongsToMany association
   */
  public static hasParentBelongsToMany(include : IInclude, testSelf : boolean = false) : boolean {
    if (testSelf && include.association instanceof BelongsToMany || (include.association && include.association.options && include.association.options.createByBTM)) {
      return true;
    }

    let parent = include.parent;
    while (parent) {
      if (parent.association instanceof BelongsToMany || (parent.association && parent.association.options && parent.association.options.createByBTM)) {
        return true;
      } else {
        parent = parent.parent;
      }
    }

    return false;
  }

  /**
   * return the full as path
   */
  public static getFullAsPath(include : IInclude) : string {
    const pathArray = [include.as];
    let parent = include.parent;

    // All path, except the last parent
    while (parent && parent.parent) {
      pathArray.push(parent.as);
      parent = parent.parent;
    }

    return pathArray.reverse().join('->');
  }

  /**
   * check if the include option provided is valid
   */
  public static _validateIncludedElement(include : any, tableNames, options : {
    /** Array<String>|Object, A list of the attributes that you want to select, or an object with `include` and `exclude` keys. */
    attributes? : any;
    hasJoin? : boolean;
    hasMultiAssociation? : boolean;
    hasSingleAssociation? : boolean;
    /** An object of hook function that are called before and after certain lifecycle events */
    hooks? : boolean;
    /**
     * Array<Object|Model|String>, A list of associations to eagerly load using a left join.
     * Supported is either `{ include: [ Model1, Model2, ...]}` or `{ include: [{ model: Model1, as: 'Alias' }]}` or `{ include: ['Alias']}`.
     * If your association are set up with an `as` (eg. `X.hasMany(Y, { as: 'Z }`, you need to specify Z in the as attribute when eager loading Y).
     */
    include? : IInclude[];
    /** Internal map of includes - auto-completed */
    includeMap? : {};
    /** Internal array of attributes - auto-completed */
    includeNames? : string[];
    model? : typeof Model;
    /** Specify if we want only one row without using an array */
    plain? : boolean;
    preventAddPK? : any;
    /** = false, If set to true, values will ignore field and virtual setters. */
    raw? : boolean;
    /** Throws an error when no records found */
    rejectOnEmpty? : boolean | any;
    topLimit? : any;
    topModel? : typeof Model;
    /** A hash of search attributes. */
    where? : {};
  }) : boolean | {} {
    tableNames[include.model.getTableName()] = true;

    if (include.attributes && !options.raw) {
      include.model._expandAttributes(include);

      // Need to make sure virtuals are mapped before setting originalAttributes
      include = Utils.mapFinderOptions(include, include.model);

      include.originalAttributes = include.attributes.slice(0);

      if (include.attributes.length) {
        Object.keys(include.model.primaryKeys).forEach(key => {
          const attr = include.model.primaryKeys[key];
          // Include the primary key if it's not already included - take into account that the pk might be aliased (due to a .field prop)
          if (!_.some(include.attributes, includeAttr => {
            if (attr.field !== key) {
              return Array.isArray(includeAttr) && includeAttr[0] === attr.field && includeAttr[1] === key;
            }
            return includeAttr === key;
          })) {
            include.attributes.unshift(key);
          }
        });
      }
    } else {
      include = Utils.mapFinderOptions(include, include.model);
    }

    // pseudo include just needed the attribute logic, return
    if (include._pseudo) {
      include.attributes = Object.keys(include.model.tableAttributes);
      return Utils.mapFinderOptions(include, include.model);
    }

    // check if the current Model is actually associated with the passed Model - or it's a pseudo include
    const association = include.association || this._getIncludedAssociation(include.model, include.as);

    include.association = association;
    include.as = association.as;

    // If through, we create a pseudo child include, to ease our parsing later on
    if (include.association.through && Object(include.association.through.model) === include.association.through.model) {
      if (!include.include) {
        include.include = [];
      }
      const through = include.association.through;

      include.through = _.defaults(include.through || {}, {
        model: through.model,
        as: through.model.name,
        association: {
          isSingleAssociation: true
        },
        _pseudo: true,
        parent: include
      });

      if (through.scope) {
        include.through.where = include.through.where ? { [Op.and]: [include.through.where, through.scope]} :  through.scope;
      }

      include.include.push(include.through);
      tableNames[through.tableName || through.model.tableName] = true;
    }

    // include.model may be the main model, while the association target may be scoped - thus we need to look at association.target/source
    let model;
    if (include.model.scoped === true) {
      // If the passed model is already scoped, keep that
      model = include.model;
    } else {
      // Otherwise use the model that was originally passed to the association
      model = include.association.target.name === include.model.name ? include.association.target : include.association.source;
    }

    model._injectScope(include);

    // This check should happen after injecting the scope, since the scope may contain a .attributes
    if (!include.attributes) {
      include.attributes = Object.keys(include.model.tableAttributes);
    }

    include = Utils.mapFinderOptions(include, include.model);

    if (include.required === undefined) {
      include.required = !!include.where;
    }

    if (include.association.scope) {
      include.where = include.where ? { [Op.and]: [include.where, include.association.scope] } :  include.association.scope;
    }

    if (include.limit && include.separate === undefined) {
      include.separate = true;
    }

    if (include.separate === true && !(include.association instanceof HasMany)) {
      throw new Error('Only HasMany associations support include.separate');
    }

    if (include.separate === true) {
      include.duplicating = false;
    }

    if (include.separate === true && !options.preventAddPK && options.attributes && options.attributes.length && !_.includes(options.attributes, association.source.primaryKeyAttribute)) {
      options.attributes.push(association.source.primaryKeyAttribute);
    }

    // Validate child includes
    if (include.hasOwnProperty('include')) {
      this._validateIncludedElements.call(include.model, include, tableNames, options);
    }

    return include;
  }

  /**
   * return the association between this model and the target model with the targetAlias
   * @hidden
   */
  private static _getIncludedAssociation(targetModel : typeof Model, targetAlias : string) : Association {
    const associations = this.getAssociations(targetModel);
    let association = null;
    if (associations.length === 0) {
      throw new sequelizeErrors.EagerLoadingError(`${targetModel.name} is not associated to ${this.name}!`);
    } else if (associations.length === 1) {
      association = this.getAssociationForAlias(targetModel, targetAlias);
      if (!association) {
        if (targetAlias) {
          throw new sequelizeErrors.EagerLoadingError(`${targetModel.name} is associated to ${this.name} using an alias. ` +
            `You've included an alias (${targetAlias}), but it does not match the alias defined in your association.`);
        } else {
          throw new sequelizeErrors.EagerLoadingError(`${targetModel.name} is associated to ${this.name} using an alias. ` +
            'You must use the \'as\' keyword to specify the alias within your include statement.');
        }
      }
    } else {
      association = this.getAssociationForAlias(targetModel, targetAlias);
      if (!association) {
        throw new sequelizeErrors.EagerLoadingError(`${targetModel.name} is associated to ${this.name} multiple times. ` +
          'To identify the correct association, you must use the \'as\' keyword to specify the alias of the association you want to include.');
      }
    }
    return association;
  }

  /**
   * @jesaiplus
   * @hidden
   */
  public static getIncludedAssociation(targetModel : typeof Model, targetAlias : string) : Association {
    return this._getIncludedAssociation(targetModel, targetAlias);
  }


  /**
   * expand include.all
   * @hidden
   */
  private static _expandIncludeAll(options : {
    /** An object of hook function that are called before and after certain lifecycle events */
    hooks? : boolean,
    /**
     * Array<Object|Model|String>, A list of associations to eagerly load using a left join.
     * Supported is either `{ include: [ Model1, Model2, ...]}` or `{ include: [{ model: Model1, as: 'Alias' }]}` or `{ include: ['Alias']}`.
     * If your association are set up with an `as` (eg. `X.hasMany(Y, { as: 'Z }`, you need to specify Z in the as attribute when eager loading Y).
     */
    include? : IInclude[],
    /** Specify if we want only one row without using an array */
    plain? : boolean,
    /** Throws an error when no records found */
    rejectOnEmpty? : boolean;
    /** A hash of search attributes. */
    where? : {}
  }) {
    const includes = options.include;
    if (!includes) {
      return;
    }

    for (let index = 0; index < includes.length; index++) {
      const include = includes[index];

      if (include.all) {
        includes.splice(index, 1);
        index--;

        this._expandIncludeAllElement.call(this, includes, include);
      }
    }

    _.forEach(includes, include => {
      this._expandIncludeAll.call(include.model, include);
    });
  }

  /**
   * @internal
   * @hidden
   */
  public static expandIncludeAll(options : {
    /** An object of hook function that are called before and after certain lifecycle events */
    hooks? : boolean,
    /**
     * Array<Object|Model|String>, A list of associations to eagerly load using a left join.
     * Supported is either `{ include: [ Model1, Model2, ...]}` or `{ include: [{ model: Model1, as: 'Alias' }]}` or `{ include: ['Alias']}`.
     * If your association are set up with an `as` (eg. `X.hasMany(Y, { as: 'Z }`, you need to specify Z in the as attribute when eager loading Y).
     */
    include? : IInclude[],
    /** Specify if we want only one row without using an array */
    plain? : boolean,
    /** Throws an error when no records found */
    rejectOnEmpty? : boolean;
    /** A hash of search attributes. */
    where? : {}
  }) {
    this._expandIncludeAll(options);
  }

  /**
   * Initialize a model, representing a table in the DB, with attributes and options.
   *
   * The table columns are define by the hash that is given as the second argument. Each attribute of the hash represents a column. A short table definition might look like this:
   *
   * ```js
   * Project.init({
   *   columnA: {
   *     type: Sequelize.BOOLEAN,
   *     validate: {
   *       is: ['[a-z]','i'],        // will only allow letters
   *       max: 23,                  // only allow values <= 23
   *       isIn: {
   *         args: [['en', 'zh']],
   *         msg: "Must be English or Chinese"
   *       }
   *     },
   *     field: 'column_a'
   *     // Other attributes here
   *   },
   *   columnB: Sequelize.STRING,
   *   columnC: 'MY VERY OWN COLUMN TYPE'
   * }, {sequelize})
   *
   * sequelize.models.modelName // The model will now be available in models under the class name
   * ```
   *
   *
   * As shown above, column definitions can be either strings, a reference to one of the datatypes that are predefined on the Sequelize constructor,
   * or an object that allows you to specify both the type of the column, and other attributes such as default values, foreign key constraints and custom setters and getters.
   *
   * For a list of possible data types, see {@link DataTypes}
   *
   * For more about validation, see http://docs.sequelizejs.com/manual/tutorial/models-definition.html#validations
   *
   * @see {@link DataTypes}
   * @see {@link Hooks}
   *
   * @param attributes An object, where each attribute is a column of the table. Each column can be either a DataType, a string or a type-description object, with the properties described below:
   * @param options These options are merged with the default define options provided to the Sequelize constructor
   * @param options.indexes[].name The name of the index. Defaults to model name + _ + fields concatenated
   * @param options.indexes[].type Index type. Only used by mysql. One of `UNIQUE`, `FULLTEXT` and `SPATIAL`
   * @param options.indexes[].method The method to create the index by (`USING` statement in SQL). BTREE and HASH are supported by mysql and postgres, and postgres additionally supports GIST and GIN.
   * @param options.indexes[].unique = false, Should the index by unique? Can also be triggered by setting type to `UNIQUE`
   * @param options.indexes[].concurrently = false, PostgreSQL will build the index without taking any write locks. Postgres only
   * @param options.indexes[].fields An array of the fields to index.Each field can either be a string containing the name of the field, a sequelize object (e.g `sequelize.fn`),
   * or an object with the following attributes: `attribute` (field name), `length` (create a prefix index of length chars), `order` (the direction the column should be sorted in),
   * `collate` (the collation (sort order) for the column)
   */
  public static init(attributes : {
    /** : String|DataTypes|Object, The description of a database column */
    column? : {
      /** = true, If false, the column will have a NOT NULL constraint, and a not null validation will be run before an instance is saved. */
      allowNull? : boolean;
      /** = false */
      autoIncrement? : boolean;
      /** = null */
      comment? : string;
      /** = null, A literal default value, a JavaScript function, or an SQL function (see `sequelize.fn`) */
      defaultValue? : any;
      /** = null, If set, sequelize will map the attribute name to a different name in the database */
      field? : string;
      /** : Function. Provide a custom getter for this column. Use `this.getDataValue(String)` to manipulate the underlying values. */
      get? : any;
      /** What should happen when the referenced key is updated. One of CASCADE, RESTRICT, SET DEFAULT, SET NULL or NO ACTION */
      onUpdate? : string;
      /** What should happen when the referenced key is deleted. One of CASCADE, RESTRICT, SET DEFAULT, SET NULL or NO ACTION */
      onDelete? : string;
      /** = false */
      primaryKey? : boolean;
      /** = null, An object with reference configurations */
      references? : {
        /** If this column references another table, provide it here as a Model, or a string */
        model? : typeof Model | string,
        /** = 'id', The column of the foreign table that this column references */
        key? : string;
      };
      /** : Function. Provide a custom setter for this column. Use `this.setDataValue(String, Value)` to manipulate the underlying values. */
      set? : any;
      /** : String|DataTypes, A string or a data type */
      type? : string;
      /**
       * = false, If true, the column will get a unique constraint. If a string is provided, the column will be part of a composite unique index.
       * If multiple columns have the same string, they will be part of the same unique index
       */
      unique? : string | boolean;
    };
    /**
     * An object of validations to execute for this column every time the model is saved.
     * Can be either the name of a validation provided by validator.ts, a validation function provided by extending validator.js (see the `DAOValidator` property for more details), or a custom validation function.
     * Custom validation functions are called with the value of the field, and can possibly take a second callback argument, to signal that they are asynchronous. If the validator is sync,
     * it should throw in the case of a failed validation, it it is async, the callback should be called with the error text.
     */
    validate? : any;
  },
  options : {
    charset? : string,
    collate? : string,
    comment? : string,
    /** Override the name of the createdAt column if a string is provided, or disable it if false. Timestamps must be true. Not affected by underscored setting. */
    createdAt? : string | boolean,
    /** = {}, Define the default search scope to use for this model. Scopes have the same form as the options passed to find / findAll */
    defaultScope? : {},
    /** Override the name of the deletedAt column if a string is provided, or disable it if false. Timestamps must be true. Not affected by underscored setting. */
    deletedAt? : string | boolean,
    engine? : string,
    /** = false If freezeTableName is true, sequelize will not try to alter the model name to get the table name. Otherwise, the model name will be pluralized */
    freezeTableName? : boolean,
    /**
     * An object of hook function that are called before and after certain lifecycle events.
     * The possible hooks are: beforeValidate, afterValidate, validationFailed, beforeBulkCreate, beforeBulkDestroy, beforeBulkUpdate, beforeCreate, beforeDestroy,beforeUpdate, afterCreate, afterDestroy,
     * afterUpdate, afterBulkCreate, afterBulkDestory and afterBulkUpdate. See Hooks for more information about hook functions and their signatures. Each property can either be a function, or an array of functions.
     */
    hooks? : boolean,
    indexes? : any[],
    /** Set the initial AUTO_INCREMENT value for the table in MySQL. */
    initialAutoIncrement? : string,
    /** Set name of the model. By default its same as Class name. */
    modelName? : string,
    /** An object with two attributes, `singular` and `plural`, which are used when this model is associated to others. */
    name? : {
      /** = Utils.pluralize(modelName) */
      plural? : string,
      /** = Utils.singularize(modelName) */
      singular? : string
    },
    /** Don't persist null values. This means that all columns with null values will not be saved */
    omitNull? : boolean,
    /** = false, Calling `destroy` will not delete the model, but instead set a `deletedAt` timestamp if this is true. Needs `timestamps=true` to work */
    paranoid? : boolean,
    /** = 'public' The schema that the tables should be created in. This can be overriden for each table in sequelize.define */
    schema? : string,
    /** More scopes, defined in the same way as defaultScope above. See `Model.scope` for more information about how scopes are defined, and what you can do with them */
    scopes? : any[],
    /** Define the sequelize instance to attach to the new Model. Throw error if none is provided. */
    sequelize? : Sequelize,
    /** Defaults to pluralized model name, unless freezeTableName is true, in which case it uses model name verbatim */
    tableName? : string,
    /** = true Adds createdAt and updatedAt timestamps to the model. */
    timestamps? : boolean,
    /** = false Converts all camelCased columns to underscored if true. Will not affect timestamp fields named explicitly by model options and will not affect fields with explicitly set `field` option */
    underscored? : boolean,
    /** = false Converts camelCased model names to underscored table names if true. Will not change model name if freezeTableName is set to true */
    underscoredAll? : boolean,
    /** Override the name of the updatedAt column if a string is provided, or disable it if false. Timestamps must be true. Not affected by underscored setting. */
    updatedAt? : string | boolean,
    /**
     * An object of model wide validations. Validations have access to all model values via `this`.
     * If the validator function takes an argument, it is assumed to be async,and is called with a callback that accepts an optional error.
     */
    validate? : {}
  }) : typeof Model { // testhint options:none
    options = options || {};

    if (!options.sequelize) {
      throw new Error('No Sequelize instance passed');
    }

    this.sequelize = options.sequelize;

    const globalOptions = this.sequelize.options;

    options = Utils.merge(_.cloneDeep(globalOptions.define), options);

    if (!options.modelName) {
      options.modelName = this.name;
    }

    options = Utils.merge({
      name: {
        plural: Utils.pluralize(options.modelName),
        singular: Utils.singularize(options.modelName)
      },
      indexes: [],
      omitNull: globalOptions.omitNull,
      schema: globalOptions.schema
    }, options);

    this.sequelize.runHooks('beforeDefine', attributes, options);

    if (options.modelName !== this.name) {
      Object.defineProperty(this, 'name', {value: options.modelName});
    }
    delete options.modelName;

    this.options = Object.assign({
      timestamps: true,
      validate: {},
      freezeTableName: false,
      underscored: false,
      underscoredAll: false,
      paranoid: false,
      rejectOnEmpty: false,
      whereCollection: null,
      schema: null,
      schemaDelimiter: '',
      defaultScope: {},
      scopes: [],
      indexes: []
    }, options);

    // if you call "define" multiple times for the same modelName, do not clutter the factory
    if (this.sequelize.isDefined(this.name)) {
      this.sequelize.modelManager.removeModel(this.sequelize.modelManager.getModel(this.name));
    }

    this.associations = {};
    (this as any)._setupHooks(options.hooks);

    this.underscored = this.underscored || this.underscoredAll;

    if (!this.options.tableName) {
      this.tableName = this.options.freezeTableName ? this.name : Utils.underscoredIf(Utils.pluralize(this.name), this.options.underscoredAll);
    } else {
      this.tableName = this.options.tableName;
    }

    this._schema = this.options.schema;
    this._schemaDelimiter = this.options.schemaDelimiter;

    // error check options
    if (options.validate) {
      Object.keys(options.validate).forEach(validatorType => {
        const validator = options.validate[validatorType];
        if (_.includes(_.keys(attributes), validatorType)) {
          throw new Error('A model validator function must not have the same name as a field. Model: ' + this.name + ', field/validation name: ' + validatorType);
        }

        if (!_.isFunction(validator)) {
          throw new Error('Members of the validate option must be functions. Model: ' + this.name + ', error with validate member ' + validatorType);
        }
      });
    }

    this.rawAttributes = _.mapValues(attributes, (attribute, name) => {

      attribute = this.sequelize.normalizeAttribute(attribute);

      if (attribute.type === undefined) {
        throw new Error('Unrecognized data type for field ' + name);
      }

      if (_.get(attribute, 'references.model.prototype') instanceof Model) {
        attribute.references.model = attribute.references.model.tableName;
      }

      return attribute;
    });

    this.primaryKeys = {};

    // Setup names of timestamp attributes
    this._timestampAttributes = {};
    if (this.options.timestamps) {
      if (this.options.createdAt !== false) {
        this._timestampAttributes.createdAt = this.options.createdAt || Utils.underscoredIf('createdAt', this.options.underscored);
      }
      if (this.options.updatedAt !== false) {
        this._timestampAttributes.updatedAt = this.options.updatedAt || Utils.underscoredIf('updatedAt', this.options.underscored);
      }
      if (this.options.paranoid && this.options.deletedAt !== false) {
        this._timestampAttributes.deletedAt = this.options.deletedAt || Utils.underscoredIf('deletedAt', this.options.underscored);
      }
    }
    if (this.options.version) {
      this._versionAttribute = typeof this.options.version === 'string' ? this.options.version : 'version';
    }

    // Add head and tail default attributes (id, timestamps)
    this._readOnlyAttributes = _.values(this._timestampAttributes);
    if (this._versionAttribute) {
      this._readOnlyAttributes.push(this._versionAttribute);
    }
    this._hasReadOnlyAttributes = this._readOnlyAttributes && this._readOnlyAttributes.length;
    this._isReadOnlyAttribute = _.memoize(key => this._hasReadOnlyAttributes && this._readOnlyAttributes.indexOf(key) !== -1);

    this._addDefaultAttributes();
    this.refreshAttributes();
    this._findAutoIncrementAttribute();

    this._scope = this.options.defaultScope;
    this._scopeNames = ['defaultScope'];

    if (_.isPlainObject(this._scope)) {
      this._conformOptions(this._scope, this);
    }

    Object.keys(this.options.scopes).forEach(scopeKey => {
      const scope = this.options.scopes[scopeKey];
      if (_.isPlainObject(scope)) {
        this._conformOptions(scope, this);
      }
    });

    this.options.indexes = this.options.indexes.map(this._conformIndex);

    this.sequelize.modelManager.addModel(this);
    this.sequelize.runHooks('afterDefine', this);

    return this;
  }

  /**
   * conform the index
   */
  public static _conformIndex(index : { type? : string, unique? : boolean }) : { type? : string, unique? : boolean } {
    index = _.defaults(index, {
      type: '',
      parser: null
    });

    if (index.type && index.type.toLowerCase() === 'unique') {
      index.unique = true;
      delete index.type;
    }
    return index;
  }

  /**
   * refresh the attributes of the model
   */
  public static refreshAttributes() {
    const attributeManipulation = {};

    this.prototype._customGetters = {};
    this.prototype._customSetters = {};

    for (const type of ['get', 'set']) {
      const opt = type + 'terMethods';
      const funcs = _.clone(_.isObject(this.options[opt]) ? this.options[opt] : {});
      const _custom = type === 'get' ? this.prototype._customGetters : this.prototype._customSetters;

      Object.keys(funcs).forEach(attribute => {
        const method = funcs[attribute];
        _custom[attribute] = method;

        if (type === 'get') {
          funcs[attribute] = function() {
            return this.get(attribute);
          };
        }
        if (type === 'set') {
          funcs[attribute] = function(value) {
            return this.set(attribute, value);
          };
        }
      });

      Object.keys(this.rawAttributes).forEach(attribute => {
        const options = this.rawAttributes[attribute];
        if (options.hasOwnProperty(type)) {
          _custom[attribute] = options[type];
        }

        if (type === 'get') {
          funcs[attribute] = function() {
            return this.get(attribute);
          };
        }
        if (type === 'set') {
          funcs[attribute] = function(value) {
            return this.set(attribute, value);
          };
        }
      });

      Object.keys(funcs).forEach(name => {
        const fct = funcs[name];
        if (!attributeManipulation[name]) {
          attributeManipulation[name] = {
            configurable: true
          };
        }
        attributeManipulation[name][type] = fct;
      });
    }

    this._dataTypeChanges = {};
    this._dataTypeSanitizers = {};

    this._booleanAttributes = [];
    this._dateAttributes = [];
    this._hstoreAttributes = [];
    this._rangeAttributes = [];
    this._jsonAttributes = [];
    this._geometryAttributes = [];
    this.virtualAttributes = [];
    this._defaultValues = {};
    this.prototype.validators = {};

    this.fieldRawAttributesMap = {};

    this.primaryKeys = {};
    this.options.uniqueKeys = {};

    Object.keys(this.rawAttributes).forEach(name => {
      const definition = this.rawAttributes[name];
      definition.type = this.sequelize.normalizeDataType(definition.type);

      definition.Model = this;
      definition.fieldName = name;
      definition._modelAttribute = true;

      if (definition.field === undefined) {
        definition.field = name;
      }

      if (definition.primaryKey === true) {
        this.primaryKeys[name] = definition;
      }

      this.fieldRawAttributesMap[definition.field] = definition;


      if (definition.type._sanitize) {
        this._dataTypeSanitizers[name] = definition.type._sanitize;
      }

      if (definition.type._isChanged) {
        this._dataTypeChanges[name] = definition.type._isChanged;
      }

      if (definition.type instanceof DataTypes.BOOLEAN) {
        this._booleanAttributes.push(name);
      } else if (definition.type instanceof DataTypes.DATE || definition.type instanceof DataTypes.DATEONLY) {
        this._dateAttributes.push(name);
      } else if (definition.type instanceof DataTypes.HSTORE || DataTypes.ARRAY.is(definition.type, DataTypes.HSTORE)) {
        this._hstoreAttributes.push(name);
      } else if (definition.type instanceof DataTypes.RANGE || (DataTypes.ARRAY as any).is(definition.type, DataTypes.RANGE)) {
        this._rangeAttributes.push(name);
      } else if (definition.type instanceof DataTypes.JSON) {
        this._jsonAttributes.push(name);
      } else if (definition.type instanceof DataTypes.VIRTUAL) {
        this.virtualAttributes.push(name);
      } else if (definition.type instanceof DataTypes.GEOMETRY) {
        this._geometryAttributes.push(name);
      }

      if (definition.hasOwnProperty('defaultValue')) {
        this._defaultValues[name] = _.partial(Utils.toDefaultValue, definition.defaultValue, this.sequelize.options.dialect);
      }

      if (definition.hasOwnProperty('unique') && definition.unique) {
        let idxName;
        if (typeof definition.unique === 'object' && definition.unique.hasOwnProperty('name')) {
          idxName = definition.unique.name;
        } else if (typeof definition.unique === 'string') {
          idxName = definition.unique;
        } else {
          idxName = this.tableName + '_' + name + '_unique';
        }

        let idx = this.options.uniqueKeys[idxName] || { fields: [] };
        idx = idx || {fields: [], msg: null};
        idx.fields.push(definition.field);
        idx.msg = idx.msg || definition.unique.msg || null;
        idx.name = idxName || false;
        idx.column = name;
        idx.customIndex = definition.unique !== true;

        this.options.uniqueKeys[idxName] = idx;
      }

      if (definition.hasOwnProperty('validate')) {
        this.prototype.validators[name] = definition.validate;
      }

      if (definition.index === true && definition.type instanceof DataTypes.JSONB) {
        this.options.indexes.push({
          fields: [definition.field || name],
          using: 'gin'
        });

        delete definition.index;
      }
    });
    // Create a map of field to attribute names
    this.fieldAttributeMap = _.reduce(this.fieldRawAttributesMap, (map, value, key) => {
      if (key !== value['fieldName']) {
        map[key] = value['fieldName'];
      }
      return map;
    }, {});

    this.uniqueKeys = this.options.uniqueKeys;

    this._hasBooleanAttributes = !!this._booleanAttributes.length;
    this._isBooleanAttribute = _.memoize(key => this._booleanAttributes.indexOf(key) !== -1);

    this._hasDateAttributes = !!this._dateAttributes.length;
    this._isDateAttribute = _.memoize(key => this._dateAttributes.indexOf(key) !== -1);

    this._hasHstoreAttributes = !!this._hstoreAttributes.length;
    this._isHstoreAttribute = _.memoize(key => this._hstoreAttributes.indexOf(key) !== -1);

    this._hasRangeAttributes = !!this._rangeAttributes.length;
    this._isRangeAttribute = _.memoize(key => this._rangeAttributes.indexOf(key) !== -1);

    this._hasJsonAttributes = !!this._jsonAttributes.length;
    this._isJsonAttribute = _.memoize(key => this._jsonAttributes.indexOf(key) !== -1);

    this.hasVirtualAttributes = !!this.virtualAttributes.length;
    this.isVirtualAttribute = _.memoize(key => this.virtualAttributes.indexOf(key) !== -1);

    this._hasGeometryAttributes = !!this._geometryAttributes.length;
    this._isGeometryAttribute = _.memoize(key => this._geometryAttributes.indexOf(key) !== -1);

    this._hasDefaultValues = !_.isEmpty(this._defaultValues);

    // DEPRECATE: All code base is free from this.attributes now
    //            This should be removed in v5
    this.attributes = this.rawAttributes;

    this.tableAttributes = _.omit(this.rawAttributes, this.virtualAttributes);

    this.prototype._hasCustomGetters = Object.keys(this.prototype._customGetters).length;
    this.prototype._hasCustomSetters = Object.keys(this.prototype._customSetters).length;

    for (const key of Object.keys(attributeManipulation)) {
      if (Model.prototype.hasOwnProperty(key)) {
        this.sequelize.log('Not overriding built-in method from model attribute: ' + key);
        continue;
      }
      Object.defineProperty(this.prototype, key, attributeManipulation[key]);
    }

    this.prototype.rawAttributes = this.rawAttributes;
    this.prototype.attributes = Object.keys(this.prototype.rawAttributes);
    this.prototype._isAttribute = _.memoize(key => this.prototype.attributes.indexOf(key) !== -1);

    // Primary key convenience constiables
    this.primaryKeyAttributes = Object.keys(this.primaryKeys);
    this.primaryKeyAttribute = this.primaryKeyAttributes[0];
    if (this.primaryKeyAttribute) {
      this.primaryKeyField = this.rawAttributes[this.primaryKeyAttribute].field || this.primaryKeyAttribute;
    }

    this._hasPrimaryKeys = this.primaryKeyAttributes.length > 0;
    this._isPrimaryKey = _.memoize(key => this.primaryKeyAttributes.indexOf(key) !== -1);
  }

  /**
   * Remove attribute from model definition
   */
  public static removeAttribute(attribute : string) {
    delete this.rawAttributes[attribute];
    this.refreshAttributes();
  }

  /**
   * Sync this Model to the DB, that is create the table. Upon success, the callback will be called with the model instance (this)
   * @see {@link Sequelize#sync} for options
   * @returns Promise<this>
   */
  public static sync(options : {
    /** = false Alters tables to fit models. Not recommended for production use. Deletes data in columns that were removed or had their type changed in the model. */
    alter? : any,
    /** = false, Pass query execution time in milliseconds as second argument to logging function (options.logging). */
    benchmark? : boolean,
    databaseVersion? : number,
    /** = {}, Define the default search scope to use for this model. Scopes have the same form as the options passed to find / findAll */
    defaultScope? : {},
    /** = {}, Default options for model definitions. See sequelize.define for options */
    define? : {},
    /** The dialect of the database you are connecting to. One of mysql, postgres, sqlite, oracle and mssql. */
    dialect? : string,
    /** = null, If specified, load the dialect library from this path. For example, if you want to use pg.js instead of pg when connecting to a pg database, you should specify 'pg.js' here */
    dialectModulePath? : string,
    /** An object of additional options, which are passed directly to the connection library */
    dialectOptions? : {},
    /** = false If force is true, each Model will run `DROP TABLE IF EXISTS`, before it tries to create its own table */
    force? : boolean,
    /** = false If freezeTableName is true, sequelize will not try to alter the model name to get the table name. Otherwise, the model name will be pluralized */
    freezeTableName? : boolean,
    /** = true If hooks is true then beforeSync, afterSync, beforeBulkSync, afterBulkSync hooks will be called */
    hooks? : boolean,
    /** = 'localhost', The host of the relational database. */
    host? : string,
    indexes? : any[],
    /** Set the default transaction isolation level */
    isolationLevel? : string,
    /** = console.log A function that logs sql queries, or false for no logging */
    logging? : boolean | any,
    /** An object with two attributes, `singular` and `plural`, which are used when this model is associated to others. */
    name? : {
      /** = Utils.pluralize(modelName) */
      plural? : string,
      /** = Utils.singularize(modelName) */
      singular? : string
    },
    /** = false, A flag that defines if native library shall be used or not. Currently only has an effect for postgres */
    native? : boolean,
    /** = false, A flag that defines if null values should be passed to SQL queries or not. */
    omitNull? : boolean,
    /** = true, String based operator alias, default value is true which will enable all operators alias. Pass object to limit set of aliased operators or false to disable completely. */
    operatorsAliases? : boolean,
    /** = false, Calling `destroy` will not delete the model, but instead set a `deletedAt` timestamp if this is true. Needs `timestamps=true` to work */
    paranoid? : boolean,
    /** sequelize connection pool configuration */
    pool? : {},
    /** The port of the relational database. */
    port? : number,
    /** = 'tcp', The protocol of the relational database. */
    protocol? : string,
    query? : {},
    /** = true, Set to `false` to make table names and attributes case-insensitive on Postgres and skip double quoting of them.  WARNING: Setting this to false may expose vulnerabilities and is not recommended! */
    quoteIdentifiers? : boolean,
    /** Throws an error when no records found */
    rejectOnEmpty? : boolean,
    /** = false, Use read / write replication. To enable replication, pass an object, with two properties, read and write. */
    replication? : boolean,
    retry : {},
    /** = 'public' The schema that the tables should be created in. This can be overriden for each table in sequelize.define */
    schema? : string,
    schemaDelimiter? : string,
    scopes? : any[],
    sequelize? : Sequelize,
    ssl? : boolean,
    /** = {}, Default options for sequelize.sync */
    sync? : {},
    /** = true Adds createdAt and updatedAt timestamps to the model. */
    timestamps? : boolean,
    /** The timezone used when converting a date from the database into a JavaScript date. */
    timezone? : string,
    /** Transaction to run query under */
    transaction? : Transaction,
    transactionTypes? : string,
    typeValidation? : boolean,
    /** = false Converts all camelCased columns to underscored if true. Will not affect timestamp fields named explicitly by model options and will not affect fields with explicitly set `field` option */
    underscored? : boolean,
    /** = false Converts camelCased model names to underscored table names if true. Will not change model name if freezeTableName is set to true */
    underscoredAll? : boolean,
    uniqueKeys? : {},
    validate? : {},
    whereCollection? : {}
  }) {
    options = _.extend({}, this.options, options);
    options.hooks = options.hooks === undefined ? true : !!options.hooks;

    const attributes = this.tableAttributes;

    return Promise.try(() => {
      if (options.hooks) {
        return this.runHooks('beforeSync', options);
      }
    }).then(() => {
      if (options.force) {
        return this.drop(options);
      }
    })
      .then(() => this.QueryInterface.createTable(this.getTableName(options), attributes, options, this))
      .then(() => {
        if (options.alter) {
          return Promise.all([
            this.QueryInterface.describeTable(this.getTableName(options)),
            this.QueryInterface.getForeignKeyReferencesForTable(this.getTableName(options)),
          ])
            .then(tableInfos => {
              const columns = tableInfos[0];
              // Use for alter foreign keys
              const foreignKeyReferences = tableInfos[1];

              const changes = []; // array of promises to run
              const removedConstraints = {};

              Object.keys(attributes).forEach(columnName => {
                if (!columns[columnName]) {
                  changes.push(() => this.QueryInterface.addColumn(this.getTableName(options), columnName, attributes[columnName]));
                }
              });
              Object.keys(columns).forEach(columnName => {
                const currentAttributes = attributes[columnName];
                if (!currentAttributes) {
                  changes.push(() => this.QueryInterface.removeColumn(this.getTableName(options), columnName, options));
                } else if (!currentAttributes.primaryKey) {
                  // Check foreign keys. If it's a foreign key, it should remove constraint first.
                  const references = currentAttributes.references;
                  if (currentAttributes.references) {
                    const database = this.sequelize.config.database;
                    const schema = this.sequelize.config.schema;
                    // Find existed foreign keys
                    Object.keys(foreignKeyReferences).forEach(key => {
                      const foreignKeyReference = foreignKeyReferences[key];
                      const constraintName = foreignKeyReference.constraintName;
                      if (!!constraintName
                        && foreignKeyReference.tableCatalog === database
                        && (schema ? foreignKeyReference.tableSchema === schema : true)
                        && foreignKeyReference.referencedTableName === references.model
                        && foreignKeyReference.referencedColumnName === references.key
                        && (schema ? foreignKeyReference.referencedTableSchema === schema : true)
                        && !removedConstraints[constraintName]) {
                        // Remove constraint on foreign keys.
                        changes.push(() => this.QueryInterface.removeConstraint(this.getTableName(options), constraintName, options));
                        removedConstraints[constraintName] = true;
                      }
                    });
                  }
                  changes.push(() => this.QueryInterface.changeColumn(this.getTableName(options), columnName, attributes[columnName]));
                }
              });
              return changes.reduce((p, fn) => p.then(fn), Promise.resolve());
            });
        }
      })
      .then(() => this.QueryInterface.showIndex(this.getTableName(options), options))
      .then(indexes => {
      // Assign an auto-generated name to indexes which are not named by the user
        this.options.indexes = this.QueryInterface.nameIndexes(this.options.indexes, this.tableName);

        indexes = _.filter(this.options.indexes, item1 =>
          !_.some(indexes, item2 => item1.name === item2.name)
        ).sort((index1, index2) => {
          if (this.sequelize.options.dialect === 'postgres') {
          // move concurrent indexes to the bottom to avoid weird deadlocks
            if (index1.concurrently === true) {
              return 1;
            }
            if (index2.concurrently === true) {
              return -1;
            }
          }

          return 0;
        });

        return Promise.map(indexes, index => this.QueryInterface.addIndex(
          this.getTableName(options),
          _.assign({
            logging: options.logging,
            benchmark: options.benchmark,
            transaction: options.transaction
          }, index),
          this.tableName
        ));
      }).then(() => {
        if (options.hooks) {
          return this.runHooks('afterSync', options);
        }
      }).return(this);
  }

  /**
   * Drop the table represented by this Model
   * @returns : Promise
   */
  public static drop(options : {
    /** = false, Pass query execution time in milliseconds as second argument to logging function (options.logging). */
    benchmark? : boolean,
    /** = false, Also drop all objects depending on this table, such as views. Only works in postgres */
    cascade? : boolean,
    databaseVersion? : number,
    /** The dialect of the database you are connecting to. One of mysql, postgres, sqlite, oracle and mssql. */
    dialect? : string,
    /** = null, If specified, load the dialect library from this path. For example, if you want to use pg.js instead of pg when connecting to a pg database, you should specify 'pg.js' here */
    dialectModulePath? : string,
    /** An object of additional options, which are passed directly to the connection library */
    dialectOptions? : {},
    force? : boolean,
    /** An object of hook function that are called before and after certain lifecycle events */
    hooks? : boolean,
    /** = 'localhost', The host of the relational database. */
    host? : string,
    /** Set the default transaction isolation level */
    isolationLevel? : string,
    /** = false, A function that gets executed while running the query to log the sql. */
    logging? : boolean | any,
    /** = false, A flag that defines if native library shall be used or not. Currently only has an effect for postgres */
    native? : boolean,
    /** = false, A flag that defines if null values should be passed to SQL queries or not. */
    omitNull? : boolean,
    /** = true, String based operator alias, default value is true which will enable all operators alias. Pass object to limit set of aliased operators or false to disable completely. */
    operatorsAliases? : boolean,
    /** sequelize connection pool configuration */
    pool? : {},
    /** The port of the relational database. */
    port? : number,
    /** = 'tcp', The protocol of the relational database. */
    protocol? : string,
    query? : {},
    /** = true, Set to `false` to make table names and attributes case-insensitive on Postgres and skip double quoting of them.  WARNING: Setting this to false may expose vulnerabilities and is not recommended! */
    quoteIdentifiers? : boolean,
    /** = false, Use read / write replication. To enable replication, pass an object, with two properties, read and write. */
    replication? : boolean,
    /** Set of flags that control when a query is automatically retried. */
    retry? : { max? : number, match? : any[] },
    ssl? : boolean,
    /** = {}, Default options for sequelize.sync */
    sync? : {},
    /** The timezone used when converting a date from the database into a JavaScript date. */
    timezone? : string,
    transactionTypes? : string,
    typeValidation? : boolean
  }) {
    return this.QueryInterface.dropTable(this.getTableName(options), options);
  }

  /**
   * drop a schema
   */
  public static dropSchema(schema? : string) {
    return this.QueryInterface.dropSchema(schema);
  }

  /**
   * Apply a schema to this model. For postgres, this will actually place the schema in front of the table name - `"schema"."tableName"`,
   * while the schema will be prepended to the table name for mysql and sqlite - `'schema.tablename'`.
   *
   * This method is intended for use cases where the same model is needed in multiple schemas. In such a use case it is important
   * to call `model.schema(schema, [options]).sync()` for each model to ensure the models are created in the correct schema.
   *
   * If a single default schema per model is needed, set the `options.schema='schema'` parameter during the `define()` call
   * for the model.
   *
   * @param schema The name of the schema
   * @see {@link Sequelize#define} for more information about setting a default schema.
   */
  public static schema(schema : string, options : {
    /** = '.', The character(s) that separates the schema name from the table name */
    schemaDelimiter? : string,
    /** = false, A function that gets executed while running the query to log the sql. */
    logging? : boolean | any,
    /** = false, Pass query execution time in milliseconds as second argument to logging function (options.logging). */
    benchmark? : boolean
  } | string) : typeof Model { // testhint options:none

    const clone = (class extends this {}) as any;
    Object.defineProperty(clone, 'name', {value: this.name});

    clone._schema = schema;

    if (options) {
      if (typeof options === 'string') {
        clone._schemaDelimiter = options;
      } else {
        if (options.schemaDelimiter) {
          clone._schemaDelimiter = options.schemaDelimiter;
        }
      }
    }

    // return { scopeObj : clone};
    return clone;
  }

  /**
   * Get the tablename of the model, taking schema into account. The method will return The name as a string if the model has no schema,
   * or an object with `tableName`, `schema` and `delimiter` properties.
   *
   * @returns : String|Object
   */
  public static getTableName(options? : string | {}) : any { // testhint options:none
    return this.QueryGenerator.addSchema(this);
  }

  public static unscoped() : typeof Model {
    return this.scope(null);
    // return 'scopeObj' in scopeObj ? scopeObj['scopeObj'] : scopeObj;
  }


  /**
   * Add a new scope to the model. This is especially useful for adding scopes with includes, when the model you want to include is not available at the time this model is defined.
   *
   * By default this will throw an error if a scope with that name already exists. Pass `override: true` in the options object to silence this error.
   *
   * @param name The name of the scope. Use `defaultScope` to override the default scope
   * @param scope : Object|Function
   */
  public static addScope(name : string, scope : any, options : { override? : boolean }) {
    options = _.assign({
      override: false
    }, options);

    if ((name === 'defaultScope' || name in this.options.scopes) && options.override === false) {
      throw new Error('The scope ' + name + ' already exists. Pass { override: true } as options to silence this error');
    }

    this._conformOptions(scope, this);

    if (name === 'defaultScope') {
      this.options.defaultScope = this._scope = scope;
    } else {
      this.options.scopes[name] = scope;
    }
  }

  /**
   * Apply a scope created in `define` to the model. First let's look at how to create scopes:
   * ```js
   * const Model = sequelize.define('model', attributes, {
   *   defaultScope: {
   *     where: {
   *       username: 'dan'
   *     },
   *     limit: 12
   *   },
   *   scopes: {
   *     isALie: {
   *       where: {
   *         stuff: 'cake'
   *       }
   *     },
   *     complexFunction: function(email, accessLevel) {
   *       return {
   *         where: {
   *           email: {
   *             [Op.like]: email
   *           },
   *           accesss_level {
   *             [Op.gte]: accessLevel
   *           }
   *         }
   *       }
   *     }
   *   }
   * })
   * ```
   * Now, since you defined a default scope, every time you do Model.find, the default scope is appended to your query. Here's a couple of examples:
   * ```js
   * Model.findAll() // WHERE username = 'dan'
   * Model.findAll({ where: { age: { [Op.gt]: 12 } } }) // WHERE age > 12 AND username = 'dan'
   * ```
   *
   * To invoke scope functions you can do:
   * ```js
   * Model.scope({ method: ['complexFunction', 'dan@sequelize.com', 42]}).findAll()
   * // WHERE email like 'dan@sequelize.com%' AND access_level >= 42
   * ```
   *
   * @param options : Array|Object|String|null, The scope(s) to apply. Scopes can either be passed as consecutive arguments, or as an array of arguments.
   * To apply simple scopes and scope functions with no arguments, pass them as strings. For scope function, pass an object, with a `method` property.
   * The value can either be a string, if the method does not take any arguments, or an array, where the first element is the name of the method, and consecutive elements are arguments to that method.
   * Pass null to remove all scopes, including the default.
   * @returns A reference to the model, with the scope(s) applied. Calling scope again on the returned model will clear the previous scope.
   */
  public static scope(options : any) : typeof Model {

    const self = class extends this {} as any;
    let scope;
    let scopeName;
    Object.defineProperty(self, 'name', {value: this.name});
    Object.assign(self, this);

    self._scope = {};
    self._scopeNames = [];
    self.scoped = true;

    if (!options) {
      return self;
    }
    const opt = _.flatten(arguments);
    for (const option of opt) {
      scope = null;
      scopeName = null;

      if (_.isPlainObject(option)) {
        if (option.method) {
          if (Array.isArray(option.method) && !!self.options.scopes[option.method[0]]) {
            scopeName = option.method[0];
            scope = self.options.scopes[scopeName].apply(self, option.method.slice(1));
          } else if (self.options.scopes[option.method]) {
            scopeName = option.method;
            scope = self.options.scopes[scopeName].apply(self);
          }
        } else {
          scope = option;
        }
      } else {
        if (option === 'defaultScope' && _.isPlainObject(self.options.defaultScope)) {
          scope = self.options.defaultScope;
        } else {
          scopeName = option;
          scope = self.options.scopes[scopeName];

          if (_.isFunction(scope)) {
            scope = scope();
            this._conformOptions(scope, self);
          }
        }
      }

      if (scope) {
        _.assignWith(self._scope, scope, (objectValue, sourceValue, key) => {
          if (key === 'where') {
            // return Array.isArray(sourceValue) ? sourceValue : Object.assign(objectValue || {}, sourceValue);
            let concatWhere = [];
            // objectValue est le scope actuel
            // sourceValue est la valeur a ajouter
            if (objectValue) {
              if (Array.isArray(objectValue)) {
                concatWhere = objectValue;
              } else {
                concatWhere.push(objectValue);
              }
            }
            if (sourceValue) {
              if (Array.isArray(sourceValue)) {
                concatWhere = concatWhere.concat(sourceValue);
              } else if (typeof option === 'string' || option['method']) {
                return Object.assign(objectValue || {}, sourceValue);
              } else {
                concatWhere.push(sourceValue);
              }
            }
            return concatWhere;
          } else if (['attributes', 'include', 'group'].indexOf(key) >= 0 && Array.isArray(objectValue) && Array.isArray(sourceValue)) {
            return objectValue.concat(sourceValue);
          }

          return objectValue ? objectValue : sourceValue;
        });

        self._scopeNames.push(scopeName ? scopeName : 'defaultScope');
      } else {
        throw new sequelizeErrors.SequelizeScopeError('Invalid scope ' + scopeName + ' called.');
      }
    }

    return self;
  }


  /**
   * alias of findAll
   */
  public static all(options : {}) : any {
    return this.findAll(options);
  }

  /**
   * Search for multiple instances.
   *
   * __Simple search using AND and =__
   * ```js
   * Model.findAll({
   *   where: {
   *     attr1: 42,
   *     attr2: 'cake'
   *   }
   * })
   * ```
   * ```sql
   * WHERE attr1 = 42 AND attr2 = 'cake'
   * ```
   *
   * __Using greater than, less than etc.__
   * ```js
   * const {gt, lte, ne, in: opIn} = Sequelize.Op;
   * Model.findAll({
   *   where: {
   *     attr1: {
   *       [gt]: 50
   *     },
   *     attr2: {
   *       [lte]: 45
   *     },
   *     attr3: {
   *       [opIn]: [1,2,3]
   *     },
   *     attr4: {
   *       [ne]: 5
   *     }
   *   }
   * })
   * ```
   * ```sql
   * WHERE attr1 > 50 AND attr2 <= 45 AND attr3 IN (1,2,3) AND attr4 != 5
   * ```
   * See {@link Operators} for possible operators
   *
   * __Queries using OR__
   * ```js
   * const {or, and, gt, lt} = Sequelize.Op;
   * Model.findAll({
   *   where: {
   *     name: 'a project',
   *     [or]: [
   *       {id: [1, 2, 3]},
   *       {
   *         [and]: [
   *           {id: {[gt]: 10}},
   *           {id: {[lt]: 100}}
   *         ]
   *       }
   *     ]
   *   }
   * });
   * ```
   * ```sql
   * WHERE `Model`.`name` = 'a project' AND (`Model`.`id` IN (1, 2, 3) OR (`Model`.`id` > 10 AND `Model`.`id` < 100));
   * ```
   *
   * The promise is resolved with an array of Model instances if the query succeeds.
   *
   * __Alias__: _all_
   *
   * @param  options A hash of options to describe the scope of the search
   * @param  options.attributes.include | Array<String>, Select all the attributes of the model, plus some additional ones.
   * Useful for aggregations, e.g. `{ attributes: { include: [[sequelize.fn('COUNT', sequelize.col('id')), 'total']] }`
   * @param  options.attributes.exclude | Array<String>, Select all the attributes of the model, except some few. Useful for security purposes e.g. `{ attributes: { exclude: ['password'] } }`
   *
   * @link   {@link Sequelize.query}
   * @returns : Promise<Array<Model>>
   */
  public static findAll(options : {
    /**
     * Array<String>|Object, A list of the attributes that you want to select, or an object with `include` and `exclude` keys.
     * To rename an attribute, you can pass an array, with two elements - the first is the name of the attribute in the DB (or some kind of expression such as `Sequelize.literal`,
     * `Sequelize.fn` and so on), and the second is the name you want the attribute to have in the returned instance
     */
    attributes? : any;
    /** = false, Pass query execution time in milliseconds as second argument to logging function (options.logging). */
    benchmark? : boolean;
    /** Group by clause */
    group? : {};
    hasDuplicating? : boolean;
    hasIncludeRequired? : boolean;
    hasIncludeWhere? : boolean,
    hasJoin? : boolean;
    hasMultiAssociation? : boolean;
    hasRequired? : boolean;
    hasSingleAssociation? : boolean;
    hasWhere? : boolean;
    /** Having clause */
    having? : {};
    /** An object of hook function that are called before and after certain lifecycle events */
    hooks? : boolean;
    /**
     * Array<Object|Model|String>, A list of associations to eagerly load using a left join.
     * Supported is either `{ include: [ Model1, Model2, ...]}` or `{ include: [{ model: Model1, as: 'Alias' }]}` or `{ include: ['Alias']}`.
     * If your association are set up with an `as` (eg. `X.hasMany(Y, { as: 'Z }`, you need to specify Z in the as attribute when eager loading Y).
     */
    include? : IInclude[];
    /** Internal map of includes - auto-completed */
    includeMap? : {};
    /** Internal array of attributes - auto-completed */
    includeNames? : string[];
    /** The maximum count you want to get. */
    limit? : number;
    /**
     * Lock the selected rows. Possible options are transaction.LOCK.UPDATE and transaction.LOCK.SHARE. Postgres also supports transaction.LOCK.KEY_SHARE,
     * transaction.LOCK.NO_KEY_UPDATE and specific model locks with joins. See [transaction.LOCK for an example](transaction#lock)
     */
    lock? : string | any;
    /** = false, A function that gets executed while running the query to log the sql. */
    logging? : boolean | any;
    model? : typeof Model;
    /** An offset value to start from. Only useable with limit! */
    offset? : number;
    /**
     * Specifies an ordering. Using an array, you can provide several columns / functions to order by. Each element can be further wrapped in a two-element array.
     * The first element is the column / function to order by, the second is the direction. For example: `order: [['name', 'DESC']]`.
     * In this way the column will be escaped, but the direction will not.
     */
    order? : any[];
    originalAttributes? : any;
    /**
     * = true, If true, only non-deleted records will be returned. If false, both deleted and non-deleted records will be returned.
     * Only applies if `options.paranoid` is true for the model.
     */
    paranoid? : boolean;
    /** Specify if we want only one row without using an array */
    plain? : boolean;
    preventAddPK? : any;
    /** Return raw result. See sequelize.query for more information. */
    raw? : boolean;
    /** = false, Throws an error when no records found */
    rejectOnEmpty? : boolean | any;
    /** = DEFAULT, An optional parameter to specify the schema search_path (Postgres only) */
    searchPath? : string;
    /**
     * Oracle specific; should separate the request for retrieving CLOB fields
     * required if the request contains a DISTINCT, automatic if using includes
     */
    shouldTreatTextColumns? : boolean;
    /** Passes by sub-query ? */
    subQuery? : boolean;
    tableNames? : string[];
    topLimit? : any;
    topModel? : typeof Model;
    /** Transaction to run query under */
    transaction? : Transaction;
    /** A hash of attributes to describe your search. */
    where? : {};
  }) {
    if (options !== undefined && !_.isPlainObject(options)) {
      throw new sequelizeErrors.QueryError('The argument passed to findAll must be an options object, use findById if you wish to pass a single primary key value');
    }
    if (options !== undefined && options.attributes) {
      if (!Array.isArray(options.attributes) && !_.isPlainObject(options.attributes)) {
        throw new sequelizeErrors.QueryError('The attributes option must be an array of column names or an object');
      }
    }

    this.warnOnInvalidOptions(options, Object.keys(this.rawAttributes));

    const tableNames = {};
    let originalOptions;

    tableNames[(this.getTableName(options) as string)] = true;
    options = Utils.cloneDeep(options);

    _.defaults(options, { hooks: true, rejectOnEmpty: this.options.rejectOnEmpty });

    // set rejectOnEmpty option from model config
    options.rejectOnEmpty = options.rejectOnEmpty || this.options.rejectOnEmpty;

    return Promise.try(() => {
      this._injectScope(options);

      if (options.hooks) {
        return this.runHooks('beforeFind', options);
      }
    }).then(() => {
      this._conformOptions(options, this);
      this._expandIncludeAll(options);

      //Oracle specific case
      if (this.sequelize.dialect.name === 'oracle') {
        this._separateAttributes(options);
      }

      if (options.hooks) {
        return this.runHooks('beforeFindAfterExpandIncludeAll', options);
      }
    }).then(() => {
      if (options.include) {
        options.hasJoin = true;

        this._validateIncludedElements(options, tableNames);

        // If we're not raw, we have to make sure we include the primary key for deduplication
        if (options.attributes && !options.raw && !options.preventAddPK && this.primaryKeyAttribute && options.attributes.indexOf(this.primaryKeyAttribute) === -1) {
          options.originalAttributes = options.attributes;
          if (!options.group || !options.hasSingleAssociation || options.hasMultiAssociation) {
            options.attributes = [this.primaryKeyAttribute].concat(options.attributes);
          }
        }
      }

      if (!options.attributes) {
        options.attributes = Object.keys(this.tableAttributes);
      }

      // whereCollection is used for non-primary key updates
      this.options.whereCollection = options.where || null;

      Utils.mapFinderOptions(options, this);

      options = this._paranoidClause(this, options);

      if (options.hooks) {
        return this.runHooks('beforeFindAfterOptions', options);
      }
    }).then(() => {
      originalOptions = Utils.cloneDeep(options);
      options.tableNames = Object.keys(tableNames);
      return this.QueryInterface.select(this, this.getTableName(options), options);
    }).tap(results => {
      if (options.hooks) {
        return this.runHooks('afterFind', results, options);
      }
    }).then(results => {

      //rejectOnEmpty mode
      if (_.isEmpty(results) && options.rejectOnEmpty) {
        if (typeof options.rejectOnEmpty === 'function') {
          throw new options.rejectOnEmpty();
        } else if (typeof options.rejectOnEmpty === 'object') {
          throw options.rejectOnEmpty;
        } else {
          throw new sequelizeErrors.EmptyResultError();
        }
      }

      return Model._findSeparate(results, originalOptions);
    });
  }

  /**
   * Oracle special case
   * We need to protect the select on CLOB fields as it may be problematic in the query
   * For example : Oracle doesn't support SELECT DISTINCT(id), CLOB
   * To get rid of this, we have to create a map of all CLOB fields called in the query
   * They are replaced by "" in the select
   * The map will be treated later in the _findSeparate method
   * @param options
   */
  private static _separateAttributes(options) {
    if (('separateFields' in options)) {
      //Remove the separate fields, we pass here only if the separateFields are being processed
      //If they are still available, we loop over again and again
      delete options.separateFields;
    } else {
      if ((options as any).attributes) {
        //We need to transform the attributes ONLY IF there is some includes OR a function inside the main attributes
        let shouldBeSeparated = false;
        if (options.include || options.shouldTreatTextColumns) {
          shouldBeSeparated = true;
        }
        if (shouldBeSeparated) {
          //We need to loop over each attribute to use and verify if it's a TEXT (CLOB)
          for (let i = 0; i < (options as any).attributes.length; i++) {
            const modelAttr = this.attributes[(options as any).attributes[i]];
            if (modelAttr && modelAttr.type.key === 'TEXT' && !('separateFields' in options)) {
              if (!('separateFields' in options)) {
                options.separateFields = [];
              }
              options.separateFields.push({
                attribute : options.attributes[i],
                model : this,
                options
              });
              if (options.attributes.indexOf(this.primaryKeyAttribute) === -1) {
                options.attributes.push(this.primaryKeyAttribute);
              }
              //The attribute is still in the request but just "" as field
              const field = [new AllUtils.Literal('\'\''), (options as any).attributes[i]];
              (options as any).attributes[i] = field;
            }
          }
        }
      }
      if (options.include) {
        //Case where the TEXT field may be in an association
        for (let i = 0; i < options.include.length; i++) {
          const include = options.include[i];
          if (include.attributes && include.attributes.length > 0) {
            for (let j = 0 ; j < include.attributes.length; j++) {
              const modelAttr = include.model.attributes[include.attributes[j]];
              if (modelAttr && modelAttr.type.key === 'TEXT') {
                const field = [new AllUtils.Literal('\'\''), include.attributes[j]];
                if (!('separateFields' in include)) {
                  include.separateFields = [];
                }
                include.separateFields.push({
                  attribute : include.attributes[j],
                  include
                });
                include.attributes[j] = field;
              }
            }
          }
        }
      }
    }
  }

  /**
   * write warning message if invalid options
   * @hidden
   */
  private static _warnOnInvalidOptions(options : {
    /** Array<String>|Object, A list of the attributes that you want to select, or an object with `include` and `exclude` keys. */
    attributes? : any;
    /** = false, Pass query execution time in milliseconds as second argument to logging function (options.logging). */
    benchmark? : boolean;
    default? : any;
    force? : boolean;
    /** Group by clause */
    group? : {};
    /** Having clause */
    having? : {};
    /** An object of hook function that are called before and after certain lifecycle events */
    hooks? : boolean;
    /**
     * Array<Object|Model|String>, A list of associations to eagerly load using a left join.
     * Supported is either `{ include: [ Model1, Model2, ...]}` or `{ include: [{ model: Model1, as: 'Alias' }]}` or `{ include: ['Alias']}`.
     * If your association are set up with an `as` (eg. `X.hasMany(Y, { as: 'Z }`, you need to specify Z in the as attribute when eager loading Y).
     */
    include? : IInclude[];
    /** The maximum count you want to get. */
    limit? : number;
    /**
     * Lock the selected rows. Possible options are transaction.LOCK.UPDATE and transaction.LOCK.SHARE. Postgres also supports transaction.LOCK.KEY_SHARE,
     * transaction.LOCK.NO_KEY_UPDATE and specific model locks with joins. See [transaction.LOCK for an example](transaction#lock)
     */
    lock? : string | any;
    logging? : boolean | any;
    /** An offset value to start from. Only useable with limit! */
    offset? : number;
    /** OrderBy clause */
    order? : any;
    /** = false, Calling `destroy` will not delete the model, but instead set a `deletedAt` timestamp if this is true. Needs `timestamps=true` to work */
    paranoid? : boolean;
    /** Specify if we want only one row without using an array */
    plain? : boolean;
    /** = false, If set to true, values will ignore field and virtual setters. */
    raw? : boolean;
    /** Throws an error when no records found */
    rejectOnEmpty? : boolean | any;
    /** = DEFAULT An optional parameter to specify the schema search_path (Postgres only) */
    searchPath? : string;
    /** Transaction to run query under */
    transaction? : Transaction;
    /** A hash of search attributes. */
    where? : {};

  }, validColumnNames : string[]) {
    if (!_.isPlainObject(options)) {
      return;
    }

    // This list will quickly become dated, but failing to maintain this list just means
    // we won't throw a warning when we should. At least most common cases will forever be covered
    // so we stop throwing erroneous warnings when we shouldn't.
    const validQueryKeywords = ['where', 'attributes', 'paranoid', 'include', 'order', 'limit', 'offset',
      'transaction', 'lock', 'raw', 'logging', 'benchmark', 'having', 'searchPath', 'rejectOnEmpty', 'plain',
      'scope', 'group', 'through', 'defaults', 'distinct', 'primary', 'exception', 'type', 'hooks', 'force',
      'name'];

    const unrecognizedOptions = _.difference(Object.keys(options), validQueryKeywords);
    const unexpectedModelAttributes = _.intersection(unrecognizedOptions, validColumnNames);
    if (!options.where && unexpectedModelAttributes.length > 0) {
      Utils.warn(`Model attributes (${unexpectedModelAttributes.join(', ')}) passed into finder method options of model ${this.name}, but the options.where object is empty. Did you forget to use options.where?`);
    }
  }

  /**
   * @internal
   * @hidden
   */
  public static warnOnInvalidOptions(options : {}, validColumnNames : string[]) {
    this._warnOnInvalidOptions(options, validColumnNames);
  }

  /**
   * @param results : Model | Model[]
   * @hidden
   */
  private static _findSeparate(results : any, options : {
    /** Array<String>|Object, A list of the attributes that you want to select, or an object with `include` and `exclude` keys. */
    attributes? : any;
    hasDuplicating? : boolean;
    hasIncludeRequired? : boolean;
    hasIncludeWhere? : boolean;
    hasJoin? : boolean;
    hasMultiAssociation? : boolean;
    hasRequired? : boolean;
    hasSingleAssociation? : boolean;
    hasWhere? : boolean;
    hooks? : boolean;
    /**
     * Array<Object|Model|String>, A list of associations to eagerly load using a left join.
     * Supported is either `{ include: [ Model1, Model2, ...]}` or `{ include: [{ model: Model1, as: 'Alias' }]}` or `{ include: ['Alias']}`.
     * If your association are set up with an `as` (eg. `X.hasMany(Y, { as: 'Z }`, you need to specify Z in the as attribute when eager loading Y).
     */
    include? : IInclude[];
    /** Internal map of includes - auto-completed */
    includeMap? : {};
    /** Internal array of attributes - auto-completed */
    includeNames? : string[];
    model? : typeof Model;
    /** Specify if we want only one row without using an array */
    plain? : boolean;
    /** = false, If set to true, values will ignore field and virtual setters. */
    raw? : boolean;
    /** Throws an error when no records found */
    rejectOnEmpty? : boolean | any;
    /** Passes by sub-query ? */
    subQuery? : boolean;
    topLimit? : any;
    topModel? : typeof Model;
    /** A hash of search attributes. */
    where? : {};
  }) : any {
    if ((!options.include || options.raw || !results) && !('separateFields' in options)) {
      return Promise.resolve(results);
    }

    const original = results;
    if (options.plain) {
      results = [results];
    }

    if (!results.length) {
      return original;
    }

    let firstPromise = Promise.resolve(results);

    //If there are separate fields in the main model
    if ('separateFields' in options) {
      const findAllParameters = _.assign(
        {},
        _.omit(options, 'include', 'attributes', 'order', 'where', 'limit', 'plain', 'group', 'includeMap', 'includeNames')
      );
      const modelToUse = (options as any).model || (options['separateFields'][0] as any).model;
      modelToUse._scope = [];
      //We need to get the CLOB attributes
      (findAllParameters as any).attributes = [modelToUse.primaryKeyAttribute].concat((options as any).separateFields.map(f => f.attribute));
      const whereCond = {};
      //We create the where condition based on the ids previously retrieved
      whereCond[modelToUse.primaryKeyAttribute] = {
        $in : results.map(f => f[modelToUse.primaryKeyAttribute])
      };
      (findAllParameters as any).where = whereCond;
      delete (options as any).separateFields; //We remove the separateFields attribute
      firstPromise = modelToUse.findAll(findAllParameters).then(map => {
        //Datas from DB, we have to set them in the results object
        const fieldsToUpdate = map[0]._options.attributes.filter( f => f !== modelToUse.primaryKeyAttribute);
        map.forEach(mapping => {
          const resToUpdate = results.find(result => {
            return result[modelToUse.primaryKeyAttribute] === mapping[modelToUse.primaryKeyAttribute];
          });
          if (resToUpdate) {
            fieldsToUpdate.forEach(field => {
              resToUpdate[field] = mapping[field];
            });
          }

        });
        return results;
      });
    }
    return firstPromise.then(firstRangeResults => {
      results = firstRangeResults;
      if (options.include) {

        return Promise.map(options.include, include => {
          if ('separateFields' in include) {
            //As previously for the main model, we need to treat each include as if it was a separate and create a new request for each include
            const includeParams =  _.assign(
              {},
              _.omit(options, 'include', 'attributes', 'order', 'where', 'limit', 'plain', 'group'),
              _.omit(include, 'parent', 'association', 'as')
            );
            includeParams.attributes = include.attributes.map(attr => {
              if (typeof attr === 'string') {
                return attr;
              } else {
                //If we have a CLOB attribute -> [AllUtils.Literal(''), FIELD]
                if (attr[0] instanceof AllUtils.Literal) {
                  return attr[1];
                }
              }
            });
            //We need to add the foreign key in the attributes asked to the DB
            if (includeParams.attributes && includeParams.attributes.indexOf(include.association.foreignKey) === -1) {
              includeParams.attributes.push(include.association.foreignKey);
            }
            //We need to add the foreign key to the include attributes for Sequelize to map the results
            if (include.attributes && include.attributes.indexOf(include.association.foreignKey) === -1) {
              include.attributes.push(include.association.foreignKey);
            }
            //We need to add the foreign key to the include originalAttributes for Sequelize to map the results
            if (include.originalAttributes && include.originalAttributes.indexOf(include.association.foreignKey) === -1) {
              include.originalAttributes.push(include.association.foreignKey);
            }
            return include.association.get(results, includeParams).then(map => {
              //Setting values on the result object
              for (const result of results) {
                result.set(
                  include.association.as,
                  map[result.get(include.association.source.primaryKeyAttribute)],
                  {
                    raw: true
                  }
                );
              }
            });
          }
          if (include && !include.separate) {
            return Model._findSeparate(
              results.reduce((memo, result) => {
                let associations = result.get(include.association.as);

                // Might be an empty belongsTo relation
                if (!associations) {
                  return memo;
                }

                // Force array so we can concat no matter if it's 1:1 or :M
                if (!Array.isArray(associations)) {
                  associations = [associations];
                }

                for (let i = 0, len = associations.length; i !== len; ++i) {
                  memo.push(associations[i]);
                }
                return memo;
              }, []),
              _.assign(
                {},
                _.omit(options, 'include', 'attributes', 'order', 'where', 'limit', 'plain', 'scope', 'group'),
                {include: include.include || []}
              )
            );
          }

          return include.association.get(results, _.assign(
            {},
            _.omit(options, 'include', 'attributes', 'order', 'where', 'limit', 'plain', 'group'),
            _.omit(include, 'parent', 'association', 'as')
          )).then(map => {
            for (const result of results) {
              result.set(
                include.association.as,
                map[result.get(include.association.source.primaryKeyAttribute)],
                {
                  raw: true
                }
              );
            }
          });
        }).return(original);
      } else {
        return Promise.resolve(original);
      }
    });
  }

  /**
   * Search for a single instance by its primary key.
   *
   * __Alias__: _findByPrimary_
   *
   * @param  id : Number|String|Buffer, The value of the desired instance's primary key.
   * @see {@link Model.findAll} for a full explanation of options
   */
  public static findById(param : any, options : {
    /**
     * Array<Object|Model|String>, A list of associations to eagerly load using a left join.
     * Supported is either `{ include: [ Model1, Model2, ...]}` or `{ include: [{ model: Model1, as: 'Alias' }]}` or `{ include: ['Alias']}`.
     * If your association are set up with an `as` (eg. `X.hasMany(Y, { as: 'Z }`, you need to specify Z in the as attribute when eager loading Y).
     */
    include? : IInclude[]
    /** = DEFAULT, An optional parameter to specify the schema search_path (Postgres only) */
    searchPath? : string,
    /** Transaction to run query under */
    transaction? : Transaction,
    /** A hash of search attributes. */
    where? : {},
  }) : Promise<Model> {
    // return Promise resolved with null if no arguments are passed
    if ([null, undefined].indexOf(param) !== -1) {
      return Promise.resolve(null);
    }

    options = Utils.cloneDeep(options) || {};

    if (typeof param === 'number' || typeof param === 'string' || Buffer.isBuffer(param)) {
      options.where = {};
      options.where[this.primaryKeyAttribute] = param;
    } else {
      throw new Error('Argument passed to findById is invalid: ' + param);
    }

    // Bypass a possible overloaded findOne
    return this.findOne(options);
  }

  /**
   * Search for a single instance. This applies LIMIT 1, so the listener will always be called with a single instance.
   *
   * __Alias__: _find_
   *
   * @param options A hash of options to describe the scope of the search
   * @see {@link Model.findAll} for an explanation of options
   */
  public static findOne(options : {
    dataType? : any,
    /** An object of hook function that are called before and after certain lifecycle events */
    hooks? : boolean,
    /**
     * Array<Object|Model|String>, A list of associations to eagerly load using a left join.
     * Supported is either `{ include: [ Model1, Model2, ...]}` or `{ include: [{ model: Model1, as: 'Alias' }]}` or `{ include: ['Alias']}`.
     * If your association are set up with an `as` (eg. `X.hasMany(Y, { as: 'Z }`, you need to specify Z in the as attribute when eager loading Y).
     */
    include? : IInclude[],
    includeIgnoreAttributs? : boolean,
    /** The maximum count you want to get. */
    limit? : number,
    /** An offset value to start from. Only useable with limit! */
    offset? : number,
    /** OrderBy clause */
    order? : any,
    /** Specify if we want only one row without using an array */
    plain? : boolean,
    /** = DEFAULT, An optional parameter to specify the schema search_path (Postgres only) */
    searchPath? : string,
    /** Transaction to run query under */
    transaction? : Transaction,
    /** A hash of search attributes. */
    where? : {},
  }) : Promise<Model> {
    if (options !== undefined && !_.isPlainObject(options)) {
      throw new Error('The argument passed to findOne must be an options object, use findById if you wish to pass a single primary key value');
    }
    options = Utils.cloneDeep(options);

    if (options.limit === undefined) {
      const pkVal = options.where && options.where[this.primaryKeyAttribute];

      // Don't add limit if querying directly on the pk
      if (!options.where || !(Utils.isPrimitive(pkVal) || Buffer.isBuffer(pkVal))) {
        options.limit = 1;
      }
    }

    // Bypass a possible overloaded findAll.
    return this.findAll(_.defaults(options, {
      plain: true,
      rejectOnEmpty: false
    }));
  }

  /**
   * Run an aggregation method on the specified field
   *
   * @param field The field to aggregate over. Can be a field name or *
   * @param aggregateFunction The function to use for aggregation, e.g. sum, max etc.
   * @param options Query options. See sequelize.query for full options
   * @returns : Promise<DataTypes|object>, Returns the aggregate result cast to `options.dataType`, unless `options.plain` is false, in which case the complete data result is returned.
   */
  public static aggregate(attribute : string, aggregateFunction : string, options : {
    /** Array<String>|Object, A list of the attributes that you want to select, or an object with `include` and `exclude` keys. */
    attributes? : any,
    /** = false Pass query execution time in milliseconds as second argument to logging function (options.logging). */
    benchmark? : boolean,
    /** : DataTypes|String. The type of the result. If `field` is a field in this Model, the default will be the type of that field, otherwise defaults to float. */
    dataType? : any,
    /** Applies DISTINCT to the field being aggregated over */
    distinct? : boolean,
    /** An object of hook function that are called before and after certain lifecycle events */
    hooks? : boolean,
    /**
     * Array<Object|Model|String>, A list of associations to eagerly load using a left join.
     * Supported is either `{ include: [ Model1, Model2, ...]}` or `{ include: [{ model: Model1, as: 'Alias' }]}` or `{ include: ['Alias']}`.
     * If your association are set up with an `as` (eg. `X.hasMany(Y, { as: 'Z }`, you need to specify Z in the as attribute when eager loading Y).
     */
    include? : IInclude[],
    includeIgnoreAttributes? : boolean,
    /** The maximum count you want to get. */
    limit? : number,
    /** = false A function that gets executed while running the query to log the sql. */
    logging? : boolean | any,
    /** An offset value to start from. Only useable with limit! */
    offset? : number,
    /** OrderBy clause */
    order? : any,
    /**
     *  When `true`, the first returned value of `aggregateFunction` is cast to `dataType` and returned.
     * If additional attributes are specified, along with `group` clauses, set `plain` to `false` to return all values of all returned rows.  Defaults to `true`
     */
    plain? : boolean,
    /** = DEFAULT An optional parameter to specify the schema search_path (Postgres only) */
    searchPath? : string,
    /** Transaction to run query under */
    transaction? : Transaction,
    /** A hash of search attributes. */
    where? : {},
  }) : Promise<any> {
    options = Utils.cloneDeep(options);
    options = _.defaults(options, { attributes: [] });

    this._conformOptions(options, this);
    this._injectScope(options);

    if (options.include) {
      this._expandIncludeAll(options);
      this._validateIncludedElements(options);
    }

    const attrOptions = this.rawAttributes[attribute];
    const field = attrOptions && attrOptions.field || attribute;
    let aggregateColumn = this.sequelize.col(field);

    if (options.distinct) {
      aggregateColumn = this.sequelize.fn('DISTINCT', aggregateColumn);
    }

    options.attributes.push([this.sequelize.fn(aggregateFunction, aggregateColumn), aggregateFunction]);

    if (!options.dataType) {
      if (attrOptions) {
        options.dataType = attrOptions.type;
      } else {
        // Use FLOAT as fallback
        options.dataType = new DataTypes.FLOAT();
      }
    } else {
      options.dataType = this.sequelize.normalizeDataType(options.dataType);
    }

    Utils.mapOptionFieldNames(options, this);
    options = this._paranoidClause(this, options);

    return this.QueryInterface.rawSelect(this.getTableName(options), options, aggregateFunction, this);
  }


  /**
   * Count the number of records matching the provided where clause.
   * If you provide an `include` option, the number of matching associations will be counted instead.
   */
  public static count(options : {
    /** Used in conjunction with `group` */
    attributes? : any,
    /** = false Pass query execution time in milliseconds as second argument to logging function (options.logging). */
    benchmark? : boolean,
    /** Column on which COUNT() should be applied */
    col? : string,
    dataType? : any,
    /** Apply COUNT(DISTINCT(col)) on primary key or on options.col. */
    distinct? : boolean,
    /** For creating complex counts. Will return multiple rows as needed. */
    group? : {},
    /** An object of hook function that are called before and after certain lifecycle events */
    hooks? : boolean,
    /**
     * Array<Object|Model|String>, A list of associations to eagerly load using a left join.
     * Supported is either `{ include: [ Model1, Model2, ...]}` or `{ include: [{ model: Model1, as: 'Alias' }]}` or `{ include: ['Alias']}`.
     * If your association are set up with an `as` (eg. `X.hasMany(Y, { as: 'Z }`, you need to specify Z in the as attribute when eager loading Y).
     */
    include? : IInclude[],
    includeIgnoreAttributes? : boolean,
    /** The maximum count you want to get. */
    limit? : number,
    /** = false A function that gets executed while running the query to log the sql. */
    logging? : boolean | any,
    /** An offset value to start from. Only useable with limit! */
    offset? : number,
    /** OrderBy clause */
    order? : any,
    /** = true Set `true` to count only non-deleted records. Can be used on models with `paranoid` enabled */
    paranoid? : boolean,
    /** Specify if we want only one row without using an array */
    plain? : boolean,
    /** = DEFAULT An optional parameter to specify the schema search_path (Postgres only) */
    searchPath? : string,
    /** Transaction to run query under */
    transaction? : Transaction,
    /** A hash of search attributes. */
    where? : {},
  }) : Promise<number> {
    return Promise.try(() => {
      options = _.defaults(Utils.cloneDeep(options), { hooks: true });
      if (options.hooks) {
        return this.runHooks('beforeCount', options);
      }
    }).then(() => {
      let col = options.col || '*';
      if (options.include) {
        col = this.name + '.' + (options.col || this.primaryKeyField);
      }

      Utils.mapOptionFieldNames(options, this);

      options.plain = !options.group;
      options.dataType = new DataTypes.INTEGER();
      options.includeIgnoreAttributes = false;

      // No limit, offset or order for the options max be given to count()
      // Set them to null to prevent scopes setting those values
      options.limit = null;
      options.offset = null;
      options.order = null;

      return this.aggregate(col, 'count', options);
    });
  }


  /**
   * Find all the rows matching your query, within a specified offset / limit, and get the total number of rows matching your query. This is very useful for paging
   *
   * ```js
   * Model.findAndCountAll({
   *   where: ...,
   *   limit: 12,
   *   offset: 12
   * }).then(result => {
   *   ...
   * })
   * ```
   * In the above example, `result.rows` will contain rows 13 through 24, while `result.count` will return the total number of rows that matched your query.
   *
   * When you add includes, only those which are required (either because they have a where clause, or because `required` is explicitly set to true on the include) will be added to the count part.
   *
   * Suppose you want to find all users who have a profile attached:
   * ```js
   * User.findAndCountAll({
   *   include: [
   *      { model: Profile, required: true}
   *   ],
   *   limit 3
   * });
   * ```
   * Because the include for `Profile` has `required` set it will result in an inner join, and only the users who have a profile will be counted. If we remove `required` from the include, both users with and without profiles will be counted
   *
   * __Alias__: _findAndCountAll_
   *
   * @param findOptions See findAll
   *
   * @see {@link Model.findAll} for a specification of find and query options
   * @return {Promise<{count: Integer, rows: Model[]}>}
   */
  public static findAndCount(options : {
    distinct? : boolean,
    /**
     * Array<Object|Model|String>, A list of associations to eagerly load using a left join.
     * Supported is either `{ include: [ Model1, Model2, ...]}` or `{ include: [{ model: Model1, as: 'Alias' }]}` or `{ include: ['Alias']}`.
     * If your association are set up with an `as` (eg. `X.hasMany(Y, { as: 'Z }`, you need to specify Z in the as attribute when eager loading Y).
     */
    include? : IInclude[],
    /** The maximum count you want to get. */
    limit? : number,
    /** An offset value to start from. Only useable with limit! */
    offset? : number,
    /** A hash of search attributes. */
    where? : {}
  }) : Promise<any> {
    if (options !== undefined && !_.isPlainObject(options)) {
      throw new Error('The argument passed to findAndCount must be an options object, use findById if you wish to pass a single primary key value');
    }

    const countOptions = Utils.cloneDeep(options);

    if (countOptions.attributes) {
      countOptions.attributes = undefined;
    }

    return Promise.all([
      this.count(countOptions),
      this.findAll(options),
    ]).spread((count, rows) => ({
      count,
      rows: count === 0 ? [] : rows
    }));
  }

  /**
   * Find the maximum value of field
   *
   * @param field
   * @param options See aggregate
   * @see {@link Model#aggregate} for options
   */
  public static max(field : string, options : {}) : Promise<any> {
    return this.aggregate(field, 'max', options);
  }

  /**
   * Find the minimum value of field
   *
   * @param field
   * @param options See aggregate
   * @see {@link Model#aggregate} for options
   */
  public static min(field : string, options : {}) : Promise<any> {
    return this.aggregate(field, 'min', options);
  }

  /**
   * Find the sum of field
   *
   * @param field
   * @param options See aggregate
   * @see {@link Model#aggregate} for options
   */
  public static sum(field : string, options : {}) : Promise<number> {
    return this.aggregate(field, 'sum', options);
  }

  /**
   * Builds a new model instance.
   * class extends Model {}
   * @param values = {} An object of key value pairs or an array of such. If an array, the function will return an array of instances.
   * @returns : Model|Model[]
   */
  public static build(values : {}, options? : {
    /** Array<String>|Object, A list of the attributes that you want to select, or an object with `include` and `exclude` keys. */
    attributes? : any,
    /**
     * Array<Object|Model|String>, A list of associations to eagerly load using a left join.
     * Supported is either `{ include: [ Model1, Model2, ...]}` or `{ include: [{ model: Model1, as: 'Alias' }]}` or `{ include: ['Alias']}`.
     * If your association are set up with an `as` (eg. `X.hasMany(Y, { as: 'Z }`, you need to specify Z in the as attribute when eager loading Y).
     */
    include? : any[],
    /** = true */
    isNewRecord? : boolean,
    /** = false, If set to true, values will ignore field and virtual setters. */
    raw? : boolean,
    silent? : boolean
  }) : any { // testhint options:none
    if (Array.isArray(values)) {
      return this.bulkBuild(values, options);
    }

    return new this(values, options);
  }

  public static bulkBuild(valueSets : any, options : {
    /** Array<String>|Object, A list of the attributes that you want to select, or an object with `include` and `exclude` keys. */
    attributes? : any
    /**
     * Array<Object|Model|String>, A list of associations to eagerly load using a left join.
     * Supported is either `{ include: [ Model1, Model2, ...]}` or `{ include: [{ model: Model1, as: 'Alias' }]}` or `{ include: ['Alias']}`.
     * If your association are set up with an `as` (eg. `X.hasMany(Y, { as: 'Z }`, you need to specify Z in the as attribute when eager loading Y).
     */
    include? : IInclude[],
    /** Internal map of includes - auto-completed */
    includeMap? : {},
    /** Internal array of attributes - auto-completed */
    includeNames? : string[],
    includeValidated? : boolean,
    isNewRecord? : boolean,
    /** = false, If set to true, values will ignore field and virtual setters. */
    raw? : boolean
  }) { // testhint options:none
    options = _.extend({
      isNewRecord: true
    }, options || {});

    if (!options.includeValidated) {
      this._conformOptions(options, this);
      if (options.include) {
        this._expandIncludeAll(options);
        this._validateIncludedElements(options);
      }
    }

    if (options.attributes) {
      options.attributes = options.attributes.map(attribute => Array.isArray(attribute) ? attribute[1] : attribute);
    }

    return valueSets.map(values => this.build(values, options));
  }

  /**
   * Builds a new model instance and calls save on it.
   * @see {@link Model#build}
   * @see {@link Model#save}
   * @returns : Promise<Model>
   */
  public static create(values : {}, options : {
    /** = false, Pass query execution time in milliseconds as second argument to logging function (options.logging). */
    benchmark? : boolean;
    /**
     * If set, only columns matching those in fields will be saved
     * An optional array of strings, representing database columns. If fields is provided, only those columns will be validated and saved.
     */
    fields? : any[];
    /** = true, Run before and after create / update + validate hooks */
    hooks? : boolean;
    /**
     * Array<Object|Model|String>, A list of associations to eagerly load using a left join.
     * Supported is either `{ include: [ Model1, Model2, ...]}` or `{ include: [{ model: Model1, as: 'Alias' }]}` or `{ include: ['Alias']}`.
     * If your association are set up with an `as` (eg. `X.hasMany(Y, { as: 'Z }`, you need to specify Z in the as attribute when eager loading Y).
     */
    include? : IInclude[];
    /** = true */
    isNewRecord? : boolean;
    /** = false, A function that gets executed while running the query to log the sql */
    logging? : boolean | any;
    /** = false, If set to true, values will ignore field and virtual setters. */
    raw? : boolean;
    /** = true, Return the affected rows (only for postgres) */
    returning? : boolean;
    /** = DEFAULT, An optional parameter to specify the schema search_path (Postgres only) */
    searchPath? : string;
    /** = false, If true, the updatedAt timestamp will not be updated. */
    silent? : boolean;
    /** Transaction to run query under */
    transaction? : Transaction;
    /** = true, If false, validations won't be run. */
    validate? : boolean;
    /** A hash of search attributes. */
    where? : {}
  }) : any {
    options = Utils.cloneDeep(options || {});

    return this.build(values, {
      isNewRecord: true,
      attributes: options.fields,
      include: options.include,
      raw: options.raw,
      silent: options.silent
    }).save(options);
  }

  /**
   * Find a row that matches the query, or build (but don't save) the row if none is found.
   * The successful result of the promise will be (instance, initialized) - Make sure to use .spread()
   *
   * __Alias__: _findOrInitialize_
   * @return {Promise<Model,initialized>}
   */
  public static findOrBuild(options : {
    /** = false, Pass query execution time in milliseconds as second argument to logging function (options.logging). */
    benchmark? : boolean,
    /** Default values to use if building a new instance */
    defaults? : {},
    /** = false, A function that gets executed while running the query to log the sql. */
    logging? : boolean | any,
    /** Transaction to run query under */
    transaction? : Transaction,
    /** A hash of search attributes. */
    where? : {}
  }) {
    if (!options || !options.where || arguments.length > 1) {
      throw new Error(
        'Missing where attribute in the options parameter passed to findOrInitialize. ' +
        'Please note that the API has changed, and is now options only (an object with where, defaults keys, transaction etc.)'
      );
    }

    let values;

    return this.find(options).then(instance => {
      if (instance === null) {
        values = _.clone(options.defaults) || {};
        if (_.isPlainObject(options.where)) {
          values = _.defaults(values, options.where);
        }

        instance = this.build(values);

        return Promise.resolve([instance, true]);
      }

      return Promise.resolve([instance, false]);
    });
  }

  /**
   * Find a row that matches the query, or build and save the row if none is found
   * The successful result of the promise will be (instance, created) - Make sure to use .spread()
   *
   * If no transaction is passed in the `options` object, a new transaction will be created internally, to prevent the race condition where a matching row is created by another connection after the find but before the insert call.
   * However, it is not always possible to handle this case in SQLite, specifically if one transaction inserts and another tries to select before the first one has committed.
   * In this case, an instance of sequelize. TimeoutError will be thrown instead.
   * If a transaction is created, a savepoint will be created instead, and any unique constraint violation will be handled internally.
   *
   * @returns : Promise<Model,created>
   */
  public static findOrCreate(options : {
    /** Default values to use if creating a new instance */
    defaults? : {},
    exception? : boolean,
    /** Transaction to run query under */
    transaction? : Transaction,
    /** where A hash of search attributes. */
    where? : {}
  }) {
    if (!options || !options.where || arguments.length > 1) {
      throw new Error(
        'Missing where attribute in the options parameter passed to findOrCreate. ' +
        'Please note that the API has changed, and is now options only (an object with where, defaults keys, transaction etc.)'
      );
    }

    options = _.assign({}, options);

    if (options.transaction === undefined && (this.sequelize.constructor as any)._cls) {
      const t = (this.sequelize.constructor as any)._cls.get('transaction');
      if (t) {
        options.transaction = t;
      }
    }

    const internalTransaction = !options.transaction;
    let values;
    let transaction;

    // Create a transaction or a savepoint, depending on whether a transaction was passed in
    return this.sequelize.transaction(options).then(t => {
      transaction = t;
      options.transaction = t;

      return this.findOne(_.defaults({transaction}, options));
    }).then(mainInstance => {
      if (mainInstance !== null) {
        return [mainInstance, false];
      }

      values = _.clone(options.defaults) || {};
      if (_.isPlainObject(options.where)) {
        values = _.defaults(values, options.where);
      }

      options.exception = true;

      return this.create(values, options).then(instance => {
        if (instance.get(this.primaryKeyAttribute, { raw: true }) === null) {
          // If the query returned an empty result for the primary key, we know that this was actually a unique constraint violation
          throw new this.sequelize.UniqueConstraintError();
        }

        return [instance, true];
      }).catch(this.sequelize.UniqueConstraintError, err => {
        const flattenedWhere = Utils.flattenObjectDeep(options.where);
        const flattenedWhereKeys = _.map(_.keys(flattenedWhere), name => _.last(_.split(name, '.')));
        const whereFields = flattenedWhereKeys.map(name => _.get(this.rawAttributes, `${name}.field`, name));
        const defaultFields = options.defaults && Object.keys(options.defaults).map(name => this.rawAttributes[name].field || name);

        if (defaultFields) {
          if (!_.intersection(Object.keys(err.fields), whereFields).length && _.intersection(Object.keys(err.fields), defaultFields).length) {
            throw err;
          }
        }

        if (_.intersection(Object.keys(err.fields), whereFields).length) {
          Object.keys(err.fields).forEach(key => {
            const value = err.fields[key];
            const name = this.fieldRawAttributesMap[key].fieldName;
            if (value.toString() !== options.where[name].toString()) {
              throw new Error(`${this.name}#findOrCreate: value used for ${name} was not equal for both the find and the create calls, '${options.where[name]}' vs '${value}'`);
            }
          });
        }

        // Someone must have created a matching instance inside the same transaction since we last did a find. Let's find it!
        return this.findOne(_.defaults({
          transaction: internalTransaction ? null : transaction
        }, options)).then(instance => {
          // Sanity check, ideally we caught this at the defaultFeilds/err.fields check
          // But if we didn't and instance is null, we will throw
          if (instance === null) {
            throw err;
          }
          return [instance, false];
        });
      });
    }).finally(() => {
      if (internalTransaction && transaction) {
        // If we created a transaction internally (and not just a savepoint), we should clean it up
        return transaction.commit();
      }
    });
  }

  /**
   * A more performant findOrCreate that will not work under a transaction (at least not in postgres)
   * Will execute a find call, if empty then attempt to create, if unique constraint then attempt to find again
   * @see {@link Model.findAll} for a full specification of find and options
   * @returns : Promise<Model,created>
   */
  public static findCreateFind(options : {
    /** Default values to use if creating a new instance */
    defaults? : {},
    /** where A hash of search attributes. */
    where? : {}
  }) {
    if (!options || !options.where) {
      throw new Error(
        'Missing where attribute in the options parameter passed to findOrCreate.'
      );
    }

    let values = _.clone(options.defaults) || {};
    if (_.isPlainObject(options.where)) {
      values = _.defaults(values, options.where);
    }


    return this.findOne(options).then(findOneResult => {
      if (findOneResult) {
        return [findOneResult, false];
      }

      return this.create(values, options)
      .then(result => [result, true])
      .catch(this.sequelize.UniqueConstraintError, () => this.findOne(options).then(result => [result, false]));
    });
  }

  /**
   * Insert or update a single row. An update will be executed if a row which matches the supplied values on either the primary key or a unique key is found.
   * Note that the unique index must be defined in your sequelize model and not just in the table.Otherwise you may experience a unique constraint violation, because sequelize fails to identify the row that should be updated.
   *
   * **Implementation details:**
   *
   * * MySQL - Implemented as a single query `INSERT values ON DUPLICATE KEY UPDATE values`
   * * PostgreSQL - Implemented as a temporary function with exception handling: INSERT EXCEPTION WHEN unique_constraint UPDATE
   * * SQLite - Implemented as two queries `INSERT; UPDATE`. This means that the update is executed regardless of whether the row already existed or not
   * * MSSQL - Implemented as a single query using `MERGE` and `WHEN (NOT) MATCHED THEN`
   * **Note** that SQLite returns undefined for created, no matter if the row was created or updated. This is because SQLite always runs INSERT OR IGNORE + UPDATE, in a single query, so there is no way to know whether the row was inserted or not.
   *
   * __Alias__: _insertOrUpdate_
   *
   * @returns : Promise<created>, Returns a boolean indicating whether the row was created or updated.
   */
  public static upsert(values : {}, options : {
    /** = false, Pass query execution time in milliseconds as second argument to logging function (options.logging). */
    benchmark? : boolean,
    /** = Object.keys(this.attributes)], The fields to insert / update. Defaults to all changed fields */
    fields? : any[],
    /** = true, Run before / after upsert hooks? */
    hooks? : boolean,
    /** = false, A function that gets executed while running the query to log the sql. */
    logging? : boolean | any,
    model? : typeof Model,
    /** = DEFAULT, An optional parameter to specify the schema search_path (Postgres only) */
    searchPath? : string,
    /** Transaction to run query under */
    transaction? : Transaction,
    /** = true, Run validations before the row is inserted */
    validate? : boolean
  }) {
    options = _.extend({
      hooks: true
    }, Utils.cloneDeep(options || {}));
    options.model = this;

    const createdAtAttr = this._timestampAttributes.createdAt;
    const updatedAtAttr = this._timestampAttributes.updatedAt;
    const hadPrimary = this.primaryKeyField in values || this.primaryKeyAttribute in values;
    const instance = this.build(values);

    if (!options.fields) {
      options.fields = Object.keys(instance._changed);
    }

    return instance.validate(options).then(() => {
      // Map field names
      const updatedDataValues = _.pick(instance.dataValues, Object.keys(instance._changed));
      const insertValues = Utils.mapValueFieldNames(instance.dataValues, instance.attributes, this);
      const updateValues = Utils.mapValueFieldNames(updatedDataValues, options.fields, this);
      const now = Utils.now(this.sequelize.options.dialect);

      // Attach createdAt
      if (createdAtAttr && !updateValues[createdAtAttr]) {
        const field = this.rawAttributes[createdAtAttr].field || createdAtAttr;
        insertValues[field] = this._getDefaultTimestamp(createdAtAttr) || now;
      }
      if (updatedAtAttr && !insertValues[updatedAtAttr]) {
        const field = this.rawAttributes[updatedAtAttr].field || updatedAtAttr;
        insertValues[field] = updateValues[field] = this._getDefaultTimestamp(updatedAtAttr) || now;
      }

      // Build adds a null value for the primary key, if none was given by the user.
      // We need to remove that because of some Postgres technicalities.
      if (!hadPrimary && this.primaryKeyAttribute && !this.rawAttributes[this.primaryKeyAttribute].defaultValue) {
        delete insertValues[this.primaryKeyField];
        delete updateValues[this.primaryKeyField];
      }

      return Promise.try(() => {
        if (options.hooks) {
          return this.runHooks('beforeUpsert', values, options);
        }
      }).then(() => {
        return this.QueryInterface.upsert(this.getTableName(options), insertValues, updateValues, instance.where(), this, options);
      }).tap(result => {
        if (options.hooks) {
          return this.runHooks('afterUpsert', result, options);
        }
      });
    });
  }

  /**
   * Create and insert multiple instances in bulk.
   *
   * The success handler is passed an array of instances, but please notice that these may not completely represent the state of the rows in the DB. This is because MySQL
   * and SQLite do not make it easy to obtain back automatically generated IDs and other default values in a way that can be mapped to multiple records.
   * To obtain Instances for the newly created values, you will need to query for them again.
   *
   * If validation fails, the promise is rejected with an array-like [AggregateError](http://bluebirdjs.com/docs/api/aggregateerror.html)
   *
   * @param  records List of objects (key/value pairs) to create instances from
   */
  public static bulkCreate(records : any[], options : {
    /** = false, Pass query execution time in milliseconds as second argument to logging function (options.logging). */
    benchmark? : boolean,
    /** Fields to insert (defaults to all fields) */
    fields? : any[],
    /** = true, Run before / after bulk create hooks? */
    hooks? : boolean,
    /** = false, Ignore duplicate values for primary keys? (not supported by postgres) */
    ignoreDuplicates? : boolean,
    /** = false, Run before / after create hooks for each individual Instance? BulkCreate hooks will still be run if options.hooks is true. */
    individualHooks? : boolean,
    /** = false, A function that gets executed while running the query to log the sql. */
    logging? : boolean | any,
    model? : typeof Model,
    /** = false, Append RETURNING * to get back auto generated values (Postgres only) */
    returning? : boolean,
    /** = DEFAULT, An optional parameter to specify the schema search_path (Postgres only) */
    searchPath? : string,
    skip? : any,
    /** Transaction to run query under */
    transaction? : Transaction,
    /** Fields to update if row key already exists (on duplicate key update)? (only supported by mysql). By default, all fields are updated. */
    updateOnDuplicate? : any[],
    /** = false, Should each row be subject to validation before it is inserted. The whole insert will fail if one row fails validation */
    validate? : boolean
  }) : Promise<Model[]> {
    if (!records.length) {
      return Promise.resolve([]);
    }

    options = _.extend({
      validate: false,
      hooks: true,
      individualHooks: false,
      ignoreDuplicates: false
    }, options || {});

    options.fields = options.fields || Object.keys(this.tableAttributes);

    const dialect = this.sequelize.options.dialect;
    if (options.ignoreDuplicates && ['postgres', 'mssql', 'oracle'].indexOf(dialect) !== -1) {
      return Promise.reject(new Error(dialect + ' does not support the \'ignoreDuplicates\' option.'));
    }
    if (options.updateOnDuplicate && dialect !== 'mysql') {
      return Promise.reject(new Error(dialect + ' does not support the \'updateOnDuplicate\' option.'));
    }

    if (options.updateOnDuplicate) {
      // By default, all attributes except 'createdAt' can be updated
      let updatableFields = _.pull(Object.keys(this.tableAttributes), 'createdAt');
      if (_.isArray(options.updateOnDuplicate) && !_.isEmpty(options.updateOnDuplicate)) {
        updatableFields = _.intersection(updatableFields, options.updateOnDuplicate);
      }
      options.updateOnDuplicate = updatableFields;
    }

    options.model = this;

    const createdAtAttr = this._timestampAttributes.createdAt;
    const updatedAtAttr = this._timestampAttributes.updatedAt;
    const now = Utils.now(this.sequelize.options.dialect);

    let instances = records.map(values => this.build(values, {isNewRecord: true}));

    return Promise.try(() => {
      // Run before hook
      if (options.hooks) {
        return this.runHooks('beforeBulkCreate', instances, options);
      }
    }).then(() => {
      // Validate
      if (options.validate) {
        const errors = new Promise.AggregateError();
        const validateOptions = _.clone(options);
        validateOptions.hooks = options.individualHooks;

        return Promise.map(instances, instance =>
          instance.validate(validateOptions).catch(err => {
            errors.push({record: instance, errors: err});
          })
        ).then(() => {
          delete options.skip;
          if (errors.length) {
            throw errors;
          }
        });
      }
    }).then(() => {
      for (const instance of instances) {
        const values = instance.dataValues;

        // set createdAt/updatedAt attributes
        if (createdAtAttr && !values[createdAtAttr]) {
          values[createdAtAttr] = now;
          if (options.fields.indexOf(createdAtAttr) === -1) {
            options.fields.push(createdAtAttr);
          }
        }
        if (updatedAtAttr && !values[updatedAtAttr]) {
          values[updatedAtAttr] = now;
          if (options.fields.indexOf(updatedAtAttr) === -1) {
            options.fields.push(updatedAtAttr);
          }
        }

        instance.dataValues = Utils.mapValueFieldNames(values, options.fields, this);
      }

      if (options.individualHooks) {
        // Create each instance individually
        return Promise.map(instances, instance => {
          const individualOptions = _.clone(options);
          delete individualOptions.fields;
          delete individualOptions.individualHooks;
          delete individualOptions.ignoreDuplicates;
          individualOptions.validate = false;
          individualOptions.hooks = true;

          return instance.save(individualOptions);
        }).then(_instances => {
          instances = _instances;
        });
      } else {
        // Create all in one query
        // Recreate records from instances to represent any changes made in hooks or validation
        records = instances.map(instance => {
          return _.omit(instance.dataValues, this.virtualAttributes);
        });

        // Map attributes for serial identification
        const attributes = {};
        Object.keys(this.tableAttributes).forEach(attr => {
          attributes[this.rawAttributes[attr].field] = this.rawAttributes[attr];
        });

        return this.QueryInterface.bulkInsert(this.getTableName(options), records, options, attributes).then(results => {
          if (Array.isArray(results)) {
            results.forEach((result, i) => {
              if (instances[i] && !instances[i].get(this.primaryKeyAttribute)) {
                instances[i].set(this.primaryKeyAttribute, result[this.primaryKeyField], { raw: true });
              }
            });
          }
          return results;
        });
      }
    }).then(() => {

      // map fields back to attributes
      instances.forEach(instance => {
        Object.keys(this.rawAttributes).forEach(attr => {
          if (this.rawAttributes[attr].field &&
              instance.dataValues[this.rawAttributes[attr].field] !== undefined &&
              this.rawAttributes[attr].field !== attr
          ) {
            instance.set(attr, instance.dataValues[this.rawAttributes[attr].field]);
            delete instance.dataValues[this.rawAttributes[attr].field];
          }
          instance._previousDataValues[attr] = instance.dataValues[attr];
          instance.changed(attr, false);
        });
        instance.isNewRecord = false;
      });

      // Run after hook
      if (options.hooks) {
        return this.runHooks('afterBulkCreate', instances, options);
      }
    }).then(() => instances);
  }


  /**
   * Truncate all instances of the model. This is a convenient method for Model.destroy({ truncate: true }).
   * @param options The options passed to Model.destroy in addition to truncate
   * @see {@link Model#destroy} for more information
   */
  public static truncate(options : {
    /** = false Pass query execution time in milliseconds as second argument to logging function (options.logging). */
    benchmark? : boolean,
    /** = false : Boolean|function, Only used in conjunction with TRUNCATE. Truncates  all tables that have foreign-key references to the named table, or to any tables added to the group due to CASCADE. */
    cascade? : boolean,
    /** : Boolean|function. A function that logs sql queries, or false for no logging */
    logging? : boolean | any,
    /** = DEFAULT An optional parameter to specify the schema search_path (Postgres only) */
    searchPath? : string,
    /** Transaction to run query under */
    transaction? : Transaction,
    /** = false, If set to true, dialects that support it will use TRUNCATE instead of DELETE FROM. If a table is truncated the where and limit options are ignored */
    truncate? : boolean
  }) : Promise<any> {
    options = Utils.cloneDeep(options) || {};
    options.truncate = true;
    return this.destroy(options);
  }

  /**
   * Delete multiple instances, or set their deletedAt timestamp to the current time if `paranoid` is enabled.
   * @returns The number of destroyed rows
   */
  public static destroy(options : {
    /** = false, Pass query execution time in milliseconds as second argument to logging function (options.logging). */
    benchmark? : boolean,
    /** = false, Only used in conjunction with TRUNCATE. Truncates  all tables that have foreign-key references to the named table, or to any tables added to the group due to CASCADE. */
    cascade? : boolean,
    /** = false, Delete instead of setting deletedAt to current timestamp (only applicable if `paranoid` is enabled) */
    force? : boolean,
    /** = true, Run before / after bulk destroy hooks? */
    hooks? : boolean,
    /** = false, If set to true, destroy will SELECT all records matching the where parameter and will execute before / after destroy hooks on each row */
    individualHooks? : boolean,
    /** How many rows to delete */
    limit? : number,
    /** A function that gets executed while running the query to log the sql. */
    logging? : boolean | any,
    model? : typeof Model,
    /** = false, Only used in conjunction with TRUNCATE. Automatically restart sequences owned by columns of the truncated table. */
    restartIdentity? : boolean,
    /** An optional parameter to specify the schema search_path (Postgres only) */
    searchPath? : string,
    /** Transaction to run query under */
    transaction? : Transaction,
    /** = false, If set to true, dialects that support it will use TRUNCATE instead of DELETE FROM. If a table is truncated the where and limit options are ignored */
    truncate? : boolean,
    /**
     * The type of query you are executing. The query type affects how results are formatted before they are passed back.
     * The type is a string, but `Sequelize.QueryTypes` is provided as convenience shortcuts.
     */
    type? : string,
    /** Filter the destroy */
    where? : {}
  }) : Promise<number> {
    options = Utils.cloneDeep(options);

    this._injectScope(options);

    if (!options || !(options.where || options.truncate)) {
      throw new Error('Missing where or truncate attribute in the options parameter of model.destroy.');
    }

    if (!options.truncate && !_.isPlainObject(options.where) && !_.isArray(options.where) && !(options.where instanceof AllUtils.SequelizeMethod)) {
      throw new Error('Expected plain object, array or sequelize method in the options.where parameter of model.destroy.');
    }

    options = _.defaults(options, {
      hooks: true,
      individualHooks: false,
      force: false,
      cascade: false,
      restartIdentity: false
    });

    options.type = QueryTypes.BULKDELETE;

    Utils.mapOptionFieldNames(options, this);
    options.model = this;

    let instances;

    return Promise.try(() => {
      // Run before hook
      if (options.hooks) {
        return this.runHooks('beforeBulkDestroy', options);
      }
    }).then(() => {
      // Get daos and run beforeDestroy hook on each record individually
      if (options.individualHooks) {
        return this.findAll({where: options.where, transaction: options.transaction, logging: options.logging, benchmark: options.benchmark})
          .map(instance => this.runHooks('beforeDestroy', instance, options).then(() => instance))
          .then(_instances => {
            instances = _instances;
          });
      }
    }).then(() => {
      // Run delete query (or update if paranoid)
      if (this._timestampAttributes.deletedAt && !options.force) {
        // Set query type appropriately when running soft delete
        options.type = QueryTypes.BULKUPDATE;

        const attrValueHash = {};
        const deletedAtAttribute = this.rawAttributes[this._timestampAttributes.deletedAt];
        const field = this.rawAttributes[this._timestampAttributes.deletedAt].field;
        const where = {};

        where[field] = deletedAtAttribute.hasOwnProperty('defaultValue') ? deletedAtAttribute.defaultValue : null;

        attrValueHash[field] = Utils.now(this.sequelize.options.dialect);
        return this.QueryInterface.bulkUpdate(this.getTableName(options), attrValueHash, Object.assign(where, options.where), options, this.rawAttributes);
      } else {
        return this.QueryInterface.bulkDelete(this.getTableName(options), options.where, options, this);
      }
    }).tap(() => {
      // Run afterDestroy hook on each record individually
      if (options.individualHooks) {
        return Promise.map(instances, instance => this.runHooks('afterDestroy', instance, options));
      }
    }).tap(() => {
      // Run after hook
      if (options.hooks) {
        return this.runHooks('afterBulkDestroy', options);
      }
    });
  }

  /**
   * Restore multiple instances if `paranoid` is enabled.
   */
  public static restore(options : {
    /** = false, Pass query execution time in milliseconds as second argument to logging function (options.logging). */
    benchmark? : boolean,
    /** = true, Run before / after bulk restore hooks? */
    hooks? : boolean,
    /** = false, If set to true, restore will find all records within the where parameter and will execute before / after bulkRestore hooks on each row */
    individualHooks? : boolean,
    /** How many rows to undelete (only for mysql) */
    limit? : number,
    /** = false, A function that gets executed while running the query to log the sql. */
    logging? : boolean | any,
    model? : typeof Model,
    /** = false, A flag that defines if null values should be passed to SQL queries or not. */
    omitNull? : boolean,
    /** Transaction to run query under */
    transaction? : Transaction,
    /**
     * The type of query you are executing. The query type affects how results are formatted before they are passed back.
     * The type is a string, but `Sequelize.QueryTypes` is provided as convenience shortcuts.
     */
    type? : string,
    /** Filter the restore */
    where? : {}
  }) : Promise<undefined> {
    if (!this._timestampAttributes.deletedAt) {
      throw new Error('Model is not paranoid');
    }

    options = _.extend({
      hooks: true,
      individualHooks: false
    }, options || {});

    options.type = QueryTypes.RAW;
    options.model = this;

    let instances;

    Utils.mapOptionFieldNames(options, this);

    return Promise.try(() => {
      // Run before hook
      if (options.hooks) {
        return this.runHooks('beforeBulkRestore', options);
      }
    }).then(() => {
      // Get daos and run beforeRestore hook on each record individually
      if (options.individualHooks) {
        return this.findAll({where: options.where, transaction: options.transaction, logging: options.logging, benchmark: options.benchmark, paranoid: false})
          .map(instance => this.runHooks('beforeRestore', instance, options).then(() => instance))
          .then(_instances => {
            instances = _instances;
          });
      }
    }).then(() => {
      // Run undelete query
      const attrValueHash = {};
      const deletedAtCol = this._timestampAttributes.deletedAt;
      const deletedAtAttribute = this.rawAttributes[deletedAtCol];
      const deletedAtDefaultValue = deletedAtAttribute.hasOwnProperty('defaultValue') ? deletedAtAttribute.defaultValue : null;

      attrValueHash[deletedAtAttribute.field || deletedAtCol] = deletedAtDefaultValue;
      options.omitNull = false;
      return this.QueryInterface.bulkUpdate(this.getTableName(options), attrValueHash, options.where, options, this._timestampAttributes.deletedAt);
    }).tap(() => {
      // Run afterDestroy hook on each record individually
      if (options.individualHooks) {
        return Promise.map(instances, instance => this.runHooks('afterRestore', instance, options));
      }
    }).tap(() => {
      // Run after hook
      if (options.hooks) {
        return this.runHooks('afterBulkRestore', options);
      }
    });
  }

  /**
   * Update multiple instances that match the where options. The promise returns an array with one or two elements. The first element is always the number
   * of affected rows, while the second element is the actual affected rows (only supported in postgres with `options.returning` true.)
   * @returns : Promise<Array<affectedCount,affectedRows>>
   */
  public static update(values, options : {
    /** Array<String>|Object, A list of the attributes that you want to select, or an object with `include` and `exclude` keys. */
    attributes? : any,
    /** = false, Pass query execution time in milliseconds as second argument to logging function (options.logging). */
    benchmark? : boolean,
    /** Fields to update (defaults to all fields) */
    fields? : any[],
    hasTrigger? : boolean,
    /** = true, Run before / after bulk update hooks? */
    hooks? : boolean,
    /** = false, Run before / after update hooks?. If true, this will execute a SELECT followed by individual UPDATEs. A select is needed, because the row data needs to be passed to the hooks */
    individualHooks? : boolean,
    /** How many rows to update (only for mysql and mariadb, implemented as TOP(n) for MSSQL; for sqlite it is supported only when rowid is present) */
    limit? : number,
    /** = false, A function that gets executed while running the query to log the sql. */
    logging? : boolean | any,
    model? : typeof Model,
    /** = false, A flag that defines if null values should be passed to SQL queries or not. */
    omitNull? : boolean,
    /** = true, If true, only non-deleted records will be updated. If false, both deleted and non-deleted records will be updated. Only applies if `options.paranoid` is true for the model. */
    paranoid? : boolean,
    /** = false, Return the affected rows (only for postgres) */
    returning? : boolean,
    /** = true, Whether or not to update the side effects of any virtual setters. */
    sideEffects? : boolean,
    /** = false, If true, the updatedAt timestamp will not be updated. */
    silent? : boolean,
    skip? : string[],
    /** Transaction to run query under */
    transaction? : Transaction,
    /**
     * The type of query you are executing. The query type affects how results are formatted before they are passed back.
     * The type is a string, but `Sequelize.QueryTypes` is provided as convenience shortcuts.
     */
    type? : string,
    /** = true, Should each row be subject to validation before it is inserted. The whole insert will fail if one row fails validation */
    validate? : boolean,
    /** Options to describe the scope of the search. */
    where? : {}
  }) : Promise<any> {
    options = Utils.cloneDeep(options);

    this._injectScope(options);
    this._optionsMustContainWhere(options);

    options = this._paranoidClause(this, _.defaults(options, {
      validate: true,
      hooks: true,
      individualHooks: false,
      returning: false,
      force: false,
      sideEffects: true
    }));

    options.type = QueryTypes.BULKUPDATE;

    // Clone values so it doesn't get modified for caller scope
    values = _.clone(values);

    // Remove values that are not in the options.fields
    if (options.fields && options.fields instanceof Array) {
      for (const key of Object.keys(values)) {
        if (options.fields.indexOf(key) < 0) {
          delete values[key];
        }
      }
    } else {
      const updatedAtAttr = this._timestampAttributes.updatedAt;
      options.fields = _.intersection(Object.keys(values), Object.keys(this.tableAttributes));
      if (updatedAtAttr && options.fields.indexOf(updatedAtAttr) === -1) {
        options.fields.push(updatedAtAttr);
      }
    }

    if (this._timestampAttributes.updatedAt && !options.silent) {
      values[this._timestampAttributes.updatedAt] = this._getDefaultTimestamp(this._timestampAttributes.updatedAt) || Utils.now(this.sequelize.options.dialect);
    }

    options.model = this;

    let instances;
    let valuesUse;

    return Promise.try(() => {
      // Validate
      if (options.validate) {
        const build = this.build(values);
        build.set(this._timestampAttributes.updatedAt, values[this._timestampAttributes.updatedAt], { raw: true });

        if (options.sideEffects) {
          values = _.assign(values, _.pick(build.get(), build.changed()));
          options.fields = _.union(options.fields, Object.keys(values));
        }

        // We want to skip validations for all other fields
        options.skip = _.difference(Object.keys(this.rawAttributes), Object.keys(values));
        return build.validate(options).then(attributes => {
          options.skip = undefined;
          if (attributes && attributes.dataValues) {
            values = _.pick(attributes.dataValues, Object.keys(values));
          }
        });
      }
      return null;
    }).then(() => {
      // Run before hook
      if (options.hooks) {
        options.attributes = values;
        return this.runHooks('beforeBulkUpdate', options).then(() => {
          values = options.attributes;
          delete options.attributes;
        });
      }
      return null;
    }).then(() => {
      valuesUse = values;

      // Get instances and run beforeUpdate hook on each record individually
      if (options.individualHooks) {
        return this.findAll({where: options.where, transaction: options.transaction, logging: options.logging, benchmark: options.benchmark}).then(findAllInstances => {
          instances = findAllInstances;
          if (!instances.length) {
            return [];
          }

          // Run beforeUpdate hooks on each record and check whether beforeUpdate hook changes values uniformly
          // i.e. whether they change values for each record in the same way
          let changedValues;
          let different = false;

          return Promise.map(instances, instance => {
            // Record updates in instances dataValues
            _.extend(instance.dataValues, values);
            // Set the changed fields on the instance
            _.forIn(valuesUse, (newValue, attr) => {
              if (newValue !== instance._previousDataValues[attr]) {
                instance.setDataValue(attr, newValue);
              }
            });

            // Run beforeUpdate hook
            return this.runHooks('beforeUpdate', instance, options).then(() => {
              if (!different) {
                const thisChangedValues = {};
                _.forIn(instance.dataValues, (newValue, attr) => {
                  if (newValue !== instance._previousDataValues[attr]) {
                    thisChangedValues[attr] = newValue;
                  }
                });

                if (!changedValues) {
                  changedValues = thisChangedValues;
                } else {
                  different = !_.isEqual(changedValues, thisChangedValues);
                }
              }

              return instance;
            });
          }).then(resultInstances => {
            instances = resultInstances;

            if (!different) {
              const keys = Object.keys(changedValues);
              // Hooks do not change values or change them uniformly
              if (keys.length) {
                // Hooks change values - record changes in valuesUse so they are executed
                valuesUse = changedValues;
                options.fields = _.union(options.fields, keys);
              }
              return;
            } else {
              // Hooks change values in a different way for each record
              // Do not run original query but save each record individually
              return Promise.map(instances, instance => {
                const individualOptions = _.clone(options);
                delete individualOptions.individualHooks;
                individualOptions.hooks = false;
                individualOptions.validate = false;

                return instance.save(individualOptions);
              }).tap(_instances => {
                instances = _instances;
              });
            }
          });
        });
      }
    }).then(results => {
      if (results) {
        // Update already done row-by-row - exit
        return [results.length, results];
      }

      valuesUse = Utils.mapValueFieldNames(valuesUse, options.fields, this);
      options = Utils.mapOptionFieldNames(options, this);
      options.hasTrigger =  this.options ? this.options.hasTrigger : false;

      // Run query to update all rows
      return this.QueryInterface.bulkUpdate(this.getTableName(options), valuesUse, options.where, options, this.tableAttributes).then(affectedRows => {
        if (options.returning) {
          instances = affectedRows;
          return [affectedRows.length, affectedRows];
        }

        return [affectedRows];
      });
    }).tap(result => {
      if (options.individualHooks) {
        return Promise.map(instances, instance => {
          return this.runHooks('afterUpdate', instance, options);
        }).then(() => {
          result[1] = instances;
        });
      }
    }).tap(() => {
      // Run after hook
      if (options.hooks) {
        options.attributes = values;
        return this.runHooks('afterBulkUpdate', options).then(() => {
          delete options.attributes;
        });
      }
    });
  }

  /**
   * Run a describe query on the table. The result will be return to the listener as a hash of attributes and their types.
   */
  public static describe(schema, options) : Promise<any> {
    return this.QueryInterface.describeTable(this.tableName, _.assign({schema: schema || this._schema || undefined}, options));
  }

  /**
   * return the defaultTimestamp or undefined
   * @hidden
   */
  private static _getDefaultTimestamp(attr : string) {
    if (!!this.rawAttributes[attr] && !!this.rawAttributes[attr].defaultValue) {
      return Utils.toDefaultValue(this.rawAttributes[attr].defaultValue, this.sequelize.options.dialect);
    }
    return undefined;
  }

  /**
   * expand attributes option
   * @hidden
   */
  private static _expandAttributes(options : { attributes? : any }) {
    if (_.isPlainObject(options.attributes)) {
      let attributes = Object.keys(this.rawAttributes);

      if (options.attributes.exclude) {
        attributes = attributes.filter(elem => {
          return options.attributes.exclude.indexOf(elem) === -1;
        });
      }
      if (options.attributes.include) {
        attributes = options.attributes.include.concat(attributes);
      }

      options.attributes = attributes;
    }
  }

  /**
   * Compare 2 éléments en profondeur
   */
  private static deepEquals(elem1 : any, elem2 : any) : boolean {
    // si les 2 élements ne sont pas de même type retourne faux
    if (typeof elem1 !== typeof elem2) {
      return false;
    }
    let equal = true;
    // si ce sont des tableaux on regarde si chaque éléments du tableau 1 sont dans le tableaux 2
    if (Array.isArray(elem1) && Array.isArray(elem2)) {
      // si ils n'ont pas la même taille renvoi faux
      if (elem1.length !== elem2.length) {
        return false;
      }
      for (let i = 0; equal && i < elem1.length; i++) {
        const toto = elem2.find(elem => {
          if (this.deepEquals(elem1[i], elem)) {
            return true;
          }
        });
        if (toto == null) {
          equal = false;
        }
      }
    } else if (typeof elem1 === 'object' && elem1 !== null) {
      // si ce sont des objets on regarde si leurs attributs sont identiques
      const elem1Keys = Object.keys(elem1);
      const elem2Keys = Object.keys(elem2);
      // si ils n'ont pas le même nombre d'attributs renvoi faux
      if (elem1Keys.length !== elem2Keys.length) {
        return false;
      }
      elem1Keys.sort();
      elem2Keys.sort();
      // on boucle sur les clés de l'élément 1
      for (let i = 0; equal && i < elem1Keys.length; i++) {
        const key = elem1Keys[i];
        if (elem2Keys[i] === key) {
          equal = this.deepEquals(elem1[key], elem2[key]);
        } else {
          return false;
        }
      }
    } else {
      // si ce ne sont ni des tableaux ni des objets on compare leur valeur
      return elem1 === elem2;
    }
    return equal;
  }

  /**
   *  Inject _scope into options. Includes should have been conformed (conformOptions) before calling this
   * @hidden
   */
  private static _injectScope(options : {
    hooks? : boolean,
    /**
     * Array<Object|Model|String>, A list of associations to eagerly load using a left join.
     * Supported is either `{ include: [ Model1, Model2, ...]}` or `{ include: [{ model: Model1, as: 'Alias' }]}` or `{ include: ['Alias']}`.
     * If your association are set up with an `as` (eg. `X.hasMany(Y, { as: 'Z }`, you need to specify Z in the as attribute when eager loading Y).
     */
    include? : IInclude[]
    /** Throws an error when no records found */
    rejectOnEmpty? : boolean,
    /** A hash of search attributes. */
    where? : {}
  }) : boolean | void {
    const scope = Utils.cloneDeep(this._scope);

    const filteredScope = _.omit(scope, 'include'); // Includes need special treatment

    _.defaults(options, filteredScope);
    if (Array.isArray(filteredScope.where)) {
      // if filteredScope.where and options.where are the same instance of table
      // filteredScope.where length increase as we merge scopes; so we keep it
      const filteredScopeWhereLength = filteredScope.where.length;
      if (Array.isArray(options.where)) {
        // if options.where and filteredScope.where are tables
        // we push all elements of filteredScope.where (which is not already in options.where) in options.where

        // we loop on filteredScope.where attributes
        for (let i = 0; i < filteredScopeWhereLength; i++) {
          let isAlreadyInWhereOption = false;
          // verify if the actual element is already in options.where
          for (let j = 0; j < options.where.length; j++) {
            if (this.deepEquals(options.where[j], filteredScope.where[i])) {
              isAlreadyInWhereOption = true;
            }
          }
          if (!isAlreadyInWhereOption) {
            (options.where as any).push(filteredScope.where[i]);
          }
        }
      } else {
        for (let i = 0; i < filteredScopeWhereLength; i++) {
          _.defaults(options.where, filteredScope.where[i]);
        }
      }
    } else {
      _.defaults(options.where, filteredScope.where);
    }
    /**
     * let tempWhere
     * boucle filteredScope.where -> $and : {tab[i]}
     * $or -> ajouter direct
     * $and : {options.where, tempWhere}
     */

    if (scope.include) {
      options.include = options.include || [];

      // Reverse so we consider the latest include first.
      // This is used if several scopes specify the same include - the last scope should take precedence
      for (const scopeInclude of scope.include.reverse()) {
        if (scopeInclude.all || !options.include.some(item => {
          const isSameModel = item.model && item.model.name === scopeInclude.model.name;
          if (!isSameModel || !item.as) {
            return isSameModel;
          }

          if (scopeInclude.as) {
            return item.as === scopeInclude.as;
          } else {
            const association = scopeInclude.association || this.getAssociationForAlias(scopeInclude.model, scopeInclude.as);
            return association ? item.as === association.as : false;
          }
        })) {
          options.include.push(scopeInclude);
        }
      }
    }
  }


  public static inspect() : string {
    return this.name;
  }

  public static hasAlias(alias) : boolean {
    return this.associations.hasOwnProperty(alias);
  }

 /**
  * Increment the value of one or more columns. This is done in the database, which means it does not use the values currently stored on the Instance. The increment is done using a
  * ```sql
  * SET column = column + X WHERE foo = 'bar'
  * ```
  * query. To get the correct value after an increment into the Instance you should do a reload.
  *
  * ```js
  * Model.increment('number', { where: { foo: 'bar' }) // increment number by 1
  * Model.increment(['number', 'count'], { by: 2, where: { foo: 'bar' } }) // increment number and count by 2
  * Model.increment({ answer: 42, tries: -1}, { by: 2, where: { foo: 'bar' } }) // increment answer by 42, and decrement tries by 1.
  *                                                        // `by` is ignored, since each column has its own value
  * ```
  *
  * @see {@link Model#reload}
  * @param fields If a string is provided, that column is incremented by the value of `by` given in options.
  * If an array is provided, the same is true for each column. If and object is provided, each column is incremented by the value given.
  * @returns : Promise<this>
  */
  public static increment(fields : string | any[] | {}, options : {
    /** Array<String>|Object, A list of the attributes that you want to select, or an object with `include` and `exclude` keys. */
    attributes? : any,
    /** = 1, The number to increment by */
    by? : number,
    increment? : boolean,
    instance? : Model,
    /** = false A function that gets executed while running the query to log the sql. */
    logging? : boolean | any,
    /** Return the affected rows (only for postgres) */
    returning? : boolean;
    /** = DEFAULT, An optional parameter to specify the schema search_path (Postgres only) */
    searchPath? : string,
    /** = false If true, the updatedAt timestamp will not be updated. */
    silent? : boolean,
    /** Transaction to run query under */
    transaction? : Transaction,
    /**  A hash of attributes to describe your search. */
    where? : {}
  }) {
    options = options || {};

    this._injectScope(options);
    this._optionsMustContainWhere(options);

    const updatedAtAttr = this._timestampAttributes.updatedAt;
    const versionAttr = this._versionAttribute;
    const updatedAtAttribute = this.rawAttributes[updatedAtAttr];
    options = _.defaults({}, options, {
      by: 1,
      attributes: {},
      where: {},
      increment: true
    });

    Utils.mapOptionFieldNames(options, this);

    const where = _.extend({}, options.where);
    let values = {};

    if (typeof fields === 'string') {
      values[fields] = options.by;
    } else if (_.isArray(fields)) {
      Object.keys(fields).forEach(key => {
        const field = fields[key];
        values[field] = options.by;
      });
    } else { // Assume fields is key-value pairs
      values = fields;
    }

    if (!options.silent && updatedAtAttr && !values[updatedAtAttr]) {
      options.attributes[updatedAtAttribute.field || updatedAtAttr] = this._getDefaultTimestamp(updatedAtAttr) || Utils.now(this.sequelize.options.dialect);
    }
    if (versionAttr) {
      values[versionAttr] = options.increment ? 1 : -1;
    }

    for (const attr of Object.keys(values)) {
      // Field name mapping
      if (this.rawAttributes[attr] && this.rawAttributes[attr].field && this.rawAttributes[attr].field !== attr) {
        values[this.rawAttributes[attr].field] = values[attr];
        delete values[attr];
      }
    }

    let promise;
    if (!options.increment) {
      promise = this.sequelize.getQueryInterface().decrement(this, this.getTableName(options), values, where, options);
    } else {
      promise = this.sequelize.getQueryInterface().increment(this, this.getTableName(options), values, where, options);
    }

    return promise.then(affectedRows => {
      if (options.returning) {
        return [affectedRows, affectedRows.length];
      }

      return [affectedRows];
    });
  }

  /**
   * @hidden
   */
  private static _optionsMustContainWhere(options : { where? }) {
    assert(options && options.where, 'Missing where attribute in the options parameter');
    assert(_.isPlainObject(options.where) || _.isArray(options.where) || options.where instanceof AllUtils.SequelizeMethod,
      'Expected plain object, array or sequelize method in the options.where parameter');
  }

  /**
   * Builds a new model instance.
   * @param values an object of key value pairs
   */
  constructor(values? : {}, options? : {
    /** Array<String>|Object, A list of the attributes that you want to select, or an object with `include` and `exclude` keys. */
    attributes? : any,
    /**
     * Array<Object|Model|String>, A list of associations to eagerly load using a left join.
     * Supported is either `{ include: [ Model1, Model2, ...]}` or `{ include: [{ model: Model1, as: 'Alias' }]}` or `{ include: ['Alias']}`.
     * If your association are set up with an `as` (eg. `X.hasMany(Y, { as: 'Z }`, you need to specify Z in the as attribute when eager loading Y).
     */
    include? : IInclude[],
    includeValidated? : boolean,
    /** = true */
    isNewRecord? : boolean,
    /** = false If set to true, values will ignore field and virtual setters. */
    raw? : boolean
  }) {
    super();
    values = values || {};
    options = _.extend({
      isNewRecord: true,
      _schema: this.constructor._schema,
      _schemaDelimiter: this.constructor._schemaDelimiter
    }, options || {});

    if (options.attributes) {
      options.attributes = options.attributes.map(attribute => Array.isArray(attribute) ? attribute[1] : attribute);
    }

    if (!options.includeValidated) {
      this.constructor._conformOptions(options, this.constructor);
      if (options.include) {
        this.constructor._expandIncludeAll(options);
        this.constructor._validateIncludedElements(options);
      }
    }

    this.dataValues = {};
    this._previousDataValues = {};
    this._changed = {};
    this._modelOptions = this.constructor.options;
    this._options = options || {};
    this.__eagerlyLoadedAssociations = [];
    /**
     * Returns true if this instance has not yet been persisted to the database
     * @property isNewRecord
     * @returns Boolean,
     */
    this.isNewRecord = options.isNewRecord;

    /**
     * Returns the Model the instance was created from.
     * @see {@link Model}
     * @property Model
     * @returns Model,
     */

    if (values === {}) {
      return;
    }

    this._initValues(values, options);
  }

  /**
   * init the instance values
   */
  public _initValues(values : {}, options : {
    /** Array<String>|Object, A list of the attributes that you want to select, or an object with `include` and `exclude` keys. */
    attributes? : any,
    /**
     * Array<Object|Model|String>, A list of associations to eagerly load using a left join.
     * Supported is either `{ include: [ Model1, Model2, ...]}` or `{ include: [{ model: Model1, as: 'Alias' }]}` or `{ include: ['Alias']}`.
     * If your association are set up with an `as` (eg. `X.hasMany(Y, { as: 'Z }`, you need to specify Z in the as attribute when eager loading Y).
     */
    include? : IInclude[],
    includeValidated? : boolean,
    /** = true */
    isNewRecord? : boolean,
    /** = false If set to true, values will ignore field and virtual setters. */
    raw? : boolean
  }) {
    let defaults;

    values = values && _.clone(values) || {};

    if (options.isNewRecord) {
      defaults = {};

      if (this.constructor._hasDefaultValues) {
        defaults = _.mapValues((this.constructor._defaultValues as any), valueFn => {
          const value = valueFn();
          return value && value instanceof AllUtils.SequelizeMethod ? value : _.cloneDeep(value);
        });
      }

      // set id to null if not passed as value, a newly created dao has no id
      // removing this breaks bulkCreate
      // do after default values since it might have UUID as a default value
      if (this.constructor.primaryKeyAttribute && !defaults.hasOwnProperty(this.constructor.primaryKeyAttribute)) {
        defaults[this.constructor.primaryKeyAttribute] = null;
      }

      if (this.constructor._timestampAttributes.createdAt && defaults[this.constructor._timestampAttributes.createdAt]) {
        this.dataValues[this.constructor._timestampAttributes.createdAt] = Utils.toDefaultValue(defaults[this.constructor._timestampAttributes.createdAt], this.sequelize.options.dialect);
        delete defaults[this.constructor._timestampAttributes.createdAt];
      }

      if (this.constructor._timestampAttributes.updatedAt && defaults[this.constructor._timestampAttributes.updatedAt]) {
        this.dataValues[this.constructor._timestampAttributes.updatedAt] = Utils.toDefaultValue(defaults[this.constructor._timestampAttributes.updatedAt], this.sequelize.options.dialect);
        delete defaults[this.constructor._timestampAttributes.updatedAt];
      }

      if (this.constructor._timestampAttributes.deletedAt && defaults[this.constructor._timestampAttributes.deletedAt]) {
        this.dataValues[this.constructor._timestampAttributes.deletedAt] = Utils.toDefaultValue(defaults[this.constructor._timestampAttributes.deletedAt], this.sequelize.options.dialect);
        delete defaults[this.constructor._timestampAttributes.deletedAt];
      }

      Object.keys(defaults).forEach(key => {
        if (values[key] === undefined) {
          this.set(key, Utils.toDefaultValue(defaults[key], this.sequelize.options.dialect), defaultsOptions);
          delete values[key];
        }
      });
    }

    this.set(values, options);
  }

  /**
   * A reference to the sequelize instance
   * @see {@link Sequelize}
   * @property sequelize
   */
  get sequelize() : Sequelize {
    return this.constructor.sequelize;
  }

  /**
   * Get an object representing the query for this instance, use with `options.where`
   * @property where
   */
  public where(checkVersion? : boolean) : {} {
    const where = this.constructor.primaryKeyAttributes.reduce((result, attribute) => {
      result[attribute] = this.get(attribute, {raw: true});
      return result;
    }, {});

    if (_.size(where) === 0) {
      return this._modelOptions.whereCollection;
    }
    const versionAttr = this.constructor._versionAttribute;
    if (checkVersion && versionAttr) {
      where[versionAttr] = this.get(versionAttr, {raw: true});
    }
    return Utils.mapWhereFieldNames(where, this.constructor);
  }

  public toString() : string {
    return '[object SequelizeInstance:' + this.constructor.name + ']';
  }

  /**
   * Get the value of the underlying data value
   */
  public getDataValue(key : string) : any {
    return this.dataValues[key];
  }

  /**
   * Update the underlying data value
   */
  public setDataValue(key : string, value : any) {
    const originalValue = this._previousDataValues[key];
    if (!Utils.isPrimitive(value) || value !== originalValue) {
      this.changed(key, true);
    }

    this.dataValues[key] = value;
  }

  /**
   * If no key is given, returns all values of the instance, also invoking virtual getters.
   * If key is given and a field or virtual getter is present for the key it will call that getter - else it will return the value for key.
   */
  public get(key? : string | any, options? : {
    clone? : any,
    /** = false If set to true, included instances will be returned as plain objects */
    plain? : boolean,
    /** = false If set to true, field and virtual setters will be ignored */
    raw? : boolean
  }) : {} | any { // testhint options:none
    if (options === undefined && typeof key === 'object') {
      options = key;
      key = undefined;
    }

    options = options || {};

    if (key) {
      if (this._customGetters.hasOwnProperty(key) && !options.raw) {
        return this._customGetters[key].call(this, key, options);
      }
      if (options.plain && this._options.include && this._options.includeNames.indexOf(key) !== -1) {
        if (Array.isArray(this.dataValues[key])) {
          return this.dataValues[key].map(instance => instance.get(options));
        } else if (this.dataValues[key] instanceof Model) {
          return this.dataValues[key].get(options);
        } else {
          return this.dataValues[key];
        }
      }
      return this.dataValues[key];
    }

    if (this._hasCustomGetters || options.plain && this._options.include || options.clone) {
      const values = {};

      if (this._hasCustomGetters) {
        Object.keys(this._customGetters).forEach(_key => {
          values[_key] = this.get(_key, options);
        });
      }

      Object.keys(this.dataValues).forEach(_key => {
        values[_key] = this.get(_key, options);
      });
      return values;
    }
    return this.dataValues;
  }

  /**
   * Set is used to update values on the instance (the sequelize representation of the instance that is, remember that nothing will be persisted before you actually call `save`).
   * In its most basic form `set` will update a value stored in the underlying `dataValues` object. However, if a custom setter function is defined for the key, that function
   * will be called instead. To bypass the setter, you can pass `raw: true` in the options object.
   *
   * If set is called with an object, it will loop over the object, and call set recursively for each key, value pair. If you set raw to true, the underlying dataValues will either be
   * set directly to the object passed, or used to extend dataValues, if dataValues already contain values.
   *
   * When set is called, the previous value of the field is stored and sets a changed flag(see `changed`).
   *
   * Set can also be used to build instances for associations, if you have values for those.
   * When using set with associations you need to make sure the property key matches the alias of the association
   * while also making sure that the proper include options have been set (from .build() or .find())
   *
   * If called with a dot.separated key on a JSON/JSONB attribute it will set the value nested and flag the entire object as changed.
   *
   * @see {@link Model.findAll} for more information about includes
   * @param key : String|Object
   */
  public set(key? : string | any, value? : any, options? : {
    /** Array<String>|Object, A list of the attributes that you want to select, or an object with `include` and `exclude` keys. */
    attributes? : any,
    /** = false If set to true, field and virtual setters will be ignored */
    raw? : boolean,
    /** = false Clear all previously set data values */
    reset? : boolean
  }) : Model { // testhint options:none
    let values;
    let originalValue;

    if (typeof key === 'object' && key !== null) {
      values = key;
      options = value || {};

      if (options.reset) {
        this.dataValues = {};
      }

      // If raw, and we're not dealing with includes or special attributes, just set it straight on the dataValues object
      if (options.raw && !(this._options && this._options.include) && !(options && options.attributes) && !this.constructor._hasBooleanAttributes && !this.constructor._hasDateAttributes) {
        if (Object.keys(this.dataValues).length) {
          this.dataValues = _.extend(this.dataValues, values);
        } else {
          this.dataValues = values;
        }
        // If raw, .changed() shouldn't be true
        this._previousDataValues = _.clone(this.dataValues);
      } else {
        // Loop and call set
        if (options.attributes) {
          let keys = options.attributes;
          if (this.constructor.hasVirtualAttributes) {
            keys = keys.concat(this.constructor.virtualAttributes);
          }

          if (this._options.includeNames) {
            keys = keys.concat(this._options.includeNames);
          }

          for (let i = 0, length = keys.length; i < length; i++) {
            if (values[keys[i]] !== undefined) {
              this.set(keys[i], values[keys[i]], options);
            }
          }
        } else {
          Object.keys(values).forEach(valuesKey => {
            this.set(valuesKey, values[valuesKey], options);
          });
        }

        if (options.raw) {
          // If raw, .changed() shouldn't be true
          this._previousDataValues = _.clone(this.dataValues);
        }
      }
    } else {
      if (!options) {
        options = {};
      }
      if (!options.raw) {
        originalValue = this.dataValues[key];
      }

      // If not raw, and there's a custom setter
      if (!options.raw && this._customSetters[key]) {
        this._customSetters[key].call(this, value, key);
        // custom setter should have changed value, get that changed value
        // TODO: v5 make setters return new value instead of changing internal store
        const newValue = this.dataValues[key];
        if (!Utils.isPrimitive(newValue) && newValue !== null || newValue !== originalValue) {
          this._previousDataValues[key] = originalValue;
          this.changed(key, true);
        }
      } else {
        // Check if we have included models, and if this key matches the include model names/aliases
        if (this._options && this._options.include && this._options.includeNames.indexOf(key) !== -1) {
          // Pass it on to the include handler
          this._setInclude(key, value, options);
          return this;
        } else {
          // Bunch of stuff we won't do when it's raw
          if (!options.raw) {
            // If attribute is not in model definition, return
            if (!this._isAttribute(key)) {
              if (key.indexOf('.') > -1 && this.constructor._isJsonAttribute(key.split('.')[0])) {
                const previousDottieValue = Dottie.get(this.dataValues, key);
                if (!_.isEqual(previousDottieValue, value)) {
                  Dottie.set(this.dataValues, key, value);
                  this.changed(key.split('.')[0], true);
                }
              }
              return this;
            }

            // If attempting to set primary key and primary key is already defined, return
            if (this.constructor._hasPrimaryKeys && originalValue && this.constructor._isPrimaryKey(key)) {
              return this;
            }

            // If attempting to set read only attributes, return
            if (!this.isNewRecord && this.constructor._hasReadOnlyAttributes && this.constructor._isReadOnlyAttribute(key)) {
              return this;
            }
          }

          // If there's a data type sanitizer
          if (!(value instanceof AllUtils.SequelizeMethod) && this.constructor._dataTypeSanitizers.hasOwnProperty(key)) {
            value = this.constructor._dataTypeSanitizers[key].call(this, value, options);
          }

          // Set when the value has changed and not raw
          if (
            !options.raw &&
            (
              // True when sequelize method
              value instanceof AllUtils.SequelizeMethod ||
              // Check for data type type comparators
              !(value instanceof AllUtils.SequelizeMethod) && this.constructor._dataTypeChanges[key] && this.constructor._dataTypeChanges[key].call(this, value, originalValue, options) ||
              // Check default
              !this.constructor._dataTypeChanges[key] && (!Utils.isPrimitive(value) && value !== null || value !== originalValue)
            )
          ) {
            this._previousDataValues[key] = originalValue;
            this.changed(key, true);
          }

          // set data value
          this.dataValues[key] = value;
        }
      }
    }

    return this;
  }

  public setAttributes(updates : any) : Model {
    return this.set(updates);
  }

  /**
   * If changed is called with a string it will return a boolean indicating whether the value of that key in `dataValues` is different from the value in `_previousDataValues`.
   * If changed is called without an argument, it will return an array of keys that have changed.
   * If changed is called without an argument and no keys have changed, it will return `false`.
   *
   * @returns : Boolean|Array
   */
  public changed(key? : string, value? : boolean | any[]) : any {
    if (key) {
      if (value !== undefined) {
        this._changed[key] = value;
        return this;
      }
      return this._changed[key] || false;
    }

    const changed = Object.keys(this.dataValues).filter(datavaluesKey => this.changed(datavaluesKey));

    return changed.length ? changed : false;
  }

  /**
   * Returns the previous value for key from `_previousDataValues`.
   * If called without a key, returns the previous values for all values which have changed
   */
  public previous(key : string) : any | any[] {
    if (key) {
      return this._previousDataValues[key];
    }

    return _.pickBy(this._previousDataValues, (value, valueKey) => this.changed(valueKey));
  }

  /**
   * @hidden
   */
  private _setInclude(key : string, value : any, options : {
    /** The schema that the tables should be created in. This can be overriden for each table in sequelize.define */
    _schema? : string,
    _schemaDelimiter? : string,
    /** Array<String>|Object, A list of the attributes that you want to select, or an object with `include` and `exclude` keys. */
    attributes? : any,
    /**
     * Array<Object|Model|String>, A list of associations to eagerly load using a left join.
     * Supported is either `{ include: [ Model1, Model2, ...]}` or `{ include: [{ model: Model1, as: 'Alias' }]}` or `{ include: ['Alias']}`.
     * If your association are set up with an `as` (eg. `X.hasMany(Y, { as: 'Z }`, you need to specify Z in the as attribute when eager loading Y).
     */
    include? : IInclude[],
    /** Internal map of includes - auto-completed */
    includeMap? : {},
    /** Internal array of attributes - auto-completed */
    includeNames? : string[],
    includeValidated? : boolean,
    isNewRecord? : boolean,
    /** = false, If set to true, values will ignore field and virtual setters. */
    raw? : boolean
  }) {
    if (!Array.isArray(value)) {
      value = [value];
    }
    if (value[0] instanceof Model) {
      value = value.map(instance => instance.dataValues);
    }

    const include = this._options.includeMap[key];
    const association = include.association;
    const accessor = key;
    const primaryKeyAttribute  = include.model.primaryKeyAttribute;
    let childOptions;
    let isEmpty;

    if (!isEmpty) {
      childOptions = {
        isNewRecord: this.isNewRecord,
        include: include.include,
        includeNames: include.includeNames,
        includeMap: include.includeMap,
        includeValidated: true,
        raw: options.raw,
        attributes: include.originalAttributes
      };
    }
    if (include.originalAttributes === undefined || include.originalAttributes.length) {
      if (association.isSingleAssociation) {
        if (Array.isArray(value)) {
          value = value[0];
        }

        isEmpty = value && value[primaryKeyAttribute] === null || value === null;
        this[accessor] = this.dataValues[accessor] = isEmpty ? null : include.model.build(value, childOptions);
      } else {
        isEmpty = value[0] && value[0][primaryKeyAttribute] === null;
        this[accessor] = this.dataValues[accessor] = isEmpty ? [] : include.model.bulkBuild(value, childOptions);
      }
    }
  }

  /**
   * Validate this instance, and if the validation passes, persist it to the database. It will only save changed fields, and do nothing if no fields have changed.
   * On success, the callback will be called with this instance. On validation error, the callback will be called with an instance of `Sequelize.ValidationError`.
   * This error will have a property for each of the fields for which validation failed, with the error message for that field.
   *
   * @returns : Promise<this|Errors.ValidationError>
   */
  public save(options : {
    association? : Association,
    defaultFields? : string[],
    /** An optional array of strings, representing database columns. If fields is provided, only those columns will be validated and saved. */
    fields? : string[],
    /** = true, Run before and after create / update + validate hooks */
    hooks? : boolean,
    /** Do not change the updatedAt value passed as parameter to the instance */
    preventTimestamps? : boolean,
    /** = false, A function that gets executed while running the query to log the sql. */
    logging? : boolean | any,
    /** = DEFAULT, An optional parameter to specify the schema search_path (Postgres only) */
    searchPath? : string,
    /** = false, If true, the updatedAt timestamp will not be updated. */
    silent? : boolean,
    skip? : string[],
    /** Append RETURNING * to get back auto generated values (Postgres only) */
    returning? : boolean,
    /** Transaction to run query under */
    transaction? : Transaction,
    /** = true, If false, validations won't be run. */
    validate? : boolean
  }) : Promise<any> {
    if (arguments.length > 1) {
      throw new Error('The second argument was removed in favor of the options object.');
    }

    options = Utils.cloneDeep(options);
    options = _.defaults(options, {
      hooks: true,
      validate: true
    });

    if (!options.fields) {
      if (this.isNewRecord) {
        options.fields = Object.keys(this.constructor.rawAttributes);
      } else {
        options.fields = _.intersection(this.changed(), Object.keys(this.constructor.rawAttributes));
      }

      options.defaultFields = options.fields;
    }

    if (options.returning === undefined) {
      if (options.association) {
        options.returning = false;
      } else if (this.isNewRecord) {
        options.returning = true;
      }
    }

    const primaryKeyName = this.constructor.primaryKeyAttribute;
    const primaryKeyAttribute = primaryKeyName && this.constructor.rawAttributes[primaryKeyName];
    const createdAtAttr = this.constructor._timestampAttributes.createdAt;
    const versionAttr = this.constructor._versionAttribute;
    const hook = this.isNewRecord ? 'Create' : 'Update';
    const wasNewRecord = this.isNewRecord;
    const now = Utils.now(this.sequelize.options.dialect);
    let updatedAtAttr = this.constructor._timestampAttributes.updatedAt;

    if (updatedAtAttr && options.fields.length >= 1 && options.fields.indexOf(updatedAtAttr) === -1) {
      options.fields.push(updatedAtAttr);
    }
    if (versionAttr && options.fields.length >= 1 && options.fields.indexOf(versionAttr) === -1) {
      options.fields.push(versionAttr);
    }

    if (options.silent === true && !(this.isNewRecord && this.get(updatedAtAttr, {raw: true}))) {
      // UpdateAtAttr might have been added as a result of Object.keys(Model.attributes). In that case we have to remove it again
      _.remove(options.fields, val => val === updatedAtAttr);
      updatedAtAttr = false;
    }

    if (this.isNewRecord === true) {
      if (createdAtAttr && options.fields.indexOf(createdAtAttr) === -1) {
        options.fields.push(createdAtAttr);
      }

      if (primaryKeyAttribute && primaryKeyAttribute.defaultValue && options.fields.indexOf(primaryKeyName) < 0) {
        options.fields.unshift(primaryKeyName);
      }
    }

    if (this.isNewRecord === false) {
      if (primaryKeyName && this.get(primaryKeyName, {raw: true}) === undefined) {
        throw new Error('You attempted to save an instance with no primary key, this is not allowed since it would result in a global update');
      }
    }

    if (updatedAtAttr && !options.silent && options.fields.indexOf(updatedAtAttr) !== -1 && !options.preventTimestamps) {
      this.dataValues[updatedAtAttr] = this.constructor._getDefaultTimestamp(updatedAtAttr) || now;
    }

    if (this.isNewRecord && createdAtAttr && !this.dataValues[createdAtAttr]) {
      this.dataValues[createdAtAttr] = this.constructor._getDefaultTimestamp(createdAtAttr) || now;
    }

    return Promise.try(() => {
      // Validate
      if (options.validate) {
        return this.validate(options);
      }
    }).then(() => {
      // Run before hook
      if (options.hooks) {
        const beforeHookValues = _.pick(this.dataValues, options.fields);
        let ignoreChanged = _.difference(this.changed(), options.fields); // In case of update where it's only supposed to update the passed values and the hook values
        let hookChanged;
        let afterHookValues;

        if (updatedAtAttr && options.fields.indexOf(updatedAtAttr) !== -1) {
          ignoreChanged = _.without(ignoreChanged, updatedAtAttr);
        }

        return this.constructor.runHooks('before' + hook, this, options)
          .then(() => {
            if (options.defaultFields && !this.isNewRecord) {
              afterHookValues = _.pick(this.dataValues, _.difference(this.changed(), ignoreChanged));

              hookChanged = [];
              for (const key of Object.keys(afterHookValues)) {
                if (afterHookValues[key] !== beforeHookValues[key]) {
                  hookChanged.push(key);
                }
              }

              options.fields = _.uniq(options.fields.concat(hookChanged));
            }

            if (hookChanged) {
              if (options.validate) {
              // Validate again

                options.skip = _.difference(Object.keys(this.constructor.rawAttributes), hookChanged);
                return this.validate(options).then(() => {
                  delete options.skip;
                });
              }
            }
          });
      }
    }).then(() => {
      if (!options.fields.length) {
        return this;
      }
      if (!this.isNewRecord) {
        return this;
      }
      if (!this._options.include || !this._options.include.length) {
        return this;
      }

      // Nested creation for BelongsTo relations
      return Promise.map(this._options.include.filter(include => include.association instanceof BelongsTo), include => {
        const instance = this.get(include.as);
        if (!instance) {
          return Promise.resolve();
        }

        const includeOptions =  _(Utils.cloneDeep(include))
          .omit(['association'])
          .defaults({
            transaction: options.transaction,
            logging: options.logging,
            parentRecord: this
          }).value();

        return instance.save(includeOptions).then(() => this[include.association.accessors.set](instance, {save: false, logging: options.logging}));
      });
    }).then(() => {
      const realFields = options.fields.filter(field => !this.constructor.isVirtualAttribute(field));
      if (!realFields.length) {
        return this;
      }
      if (!this.changed() && !this.isNewRecord) {
        return this;
      }

      const versionFieldName = _.get(this.constructor.rawAttributes[versionAttr], 'field') || versionAttr;
      let values = Utils.mapValueFieldNames(this.dataValues, options.fields, this.constructor);
      let query = null;
      let args = [];
      let where;

      if (this.isNewRecord) {
        query = 'insert';
        args = [this, this.constructor.getTableName(options), values, options];
      } else {
        where = this.where(true);
        where = Utils.mapValueFieldNames(where, Object.keys(where), this.constructor);
        if (versionAttr) {
          values[versionFieldName] += 1;
        }
        query = 'update';
        args = [this, this.constructor.getTableName(options), values, where, options];
      }

      return this.sequelize.getQueryInterface()[query].apply(this.sequelize.getQueryInterface(), args)
        .then(results => {
          const result : { dataValues? } = _.head(results);
          const rowsUpdated = results[1];

          if (versionAttr) {
            // Check to see that a row was updated, otherwise it's an optimistic locking error.
            if (rowsUpdated < 1) {
              throw new sequelizeErrors.OptimisticLockError({
                modelName: this.constructor.name,
                values,
                where
              });
            } else {
              result.dataValues[versionAttr] = values[versionFieldName];
            }
          }

          // Transfer database generated values (defaults, autoincrement, etc)
          for (const attr of Object.keys(this.constructor.rawAttributes)) {
            if (this.constructor.rawAttributes[attr].field &&
                values[this.constructor.rawAttributes[attr].field] !== undefined &&
                this.constructor.rawAttributes[attr].field !== attr
            ) {
              values[attr] = values[this.constructor.rawAttributes[attr].field];
              delete values[this.constructor.rawAttributes[attr].field];
            }
          }
          values = _.extend(values, result.dataValues);

          result.dataValues = _.extend(result.dataValues, values);
          return result;
        })
        .tap(() => {
          if (!wasNewRecord) {
            return this;
          }
          if (!this._options.include || !this._options.include.length) {
            return this;
          }

          // Nested creation for HasOne/HasMany/BelongsToMany relations
          return Promise.map(this._options.include.filter(include => !(include.association instanceof BelongsTo)), include => {
            let instances = this.get(include.as);

            if (!instances) {
              return Promise.resolve();
            }
            if (!Array.isArray(instances)) {
              instances = [instances];
            }
            if (!instances.length) {
              return Promise.resolve();
            }

            const includeOptions =  _(Utils.cloneDeep(include))
              .omit(['association'])
              .defaults({
                transaction: options.transaction,
                logging: options.logging,
                parentRecord: this
              }).value();

            // Instances will be updated in place so we can safely treat HasOne like a HasMany
            return Promise.map(instances, instance => {
              if (include.association instanceof BelongsToMany) {
                return instance.save(includeOptions).then(() => {
                  const _values = {};
                  _values[include.association.foreignKey] = this.get(this.constructor.primaryKeyAttribute, {raw: true});
                  _values[include.association.otherKey] = instance.get(instance.constructor.primaryKeyAttribute, {raw: true});
                  // Include values defined in the scope of the association
                  _.assign(_values, include.association.through.scope);
                  return include.association.throughModel.create(_values, includeOptions);
                });
              } else {
                instance.set(include.association.foreignKey, this.get(include.association.sourceKey || this.constructor.primaryKeyAttribute, {raw: true}));
                return instance.save(includeOptions);
              }
            });
          });
        })
        .tap(result => {
          // Run after hook
          if (options.hooks) {
            return this.constructor.runHooks('after' + hook, result, options);
          }
        })
        .then(result => {
          if (result._previousDataValues == null) {
            result._previousDataValues = {};
          }
          for (const field of options.fields) {
            result._previousDataValues[field] = result.dataValues[field];
            this.changed(field, false);
          }
          this.isNewRecord = false;
          return result;
        });
    });
  }

 /**
  * Refresh the current instance in-place, i.e. update the object with current data from the DB and return the same object.
  * This is different from doing a `find(Instance.id)`, because that would create and return a new instance. With this method,
  * all references to the Instance are updated with the new data and no new objects are created.
  *
  * @see {@link Model.findAll}
  * @param options Options that are passed on to `Model.find`
  */
  public reload(options : {
    attributes : any[],
    /**
     * Array<Object|Model|String>, A list of associations to eagerly load using a left join.
     * Supported is either `{ include: [ Model1, Model2, ...]}` or `{ include: [{ model: Model1, as: 'Alias' }]}` or `{ include: ['Alias']}`.
     * If your association are set up with an `as` (eg. `X.hasMany(Y, { as: 'Z }`, you need to specify Z in the as attribute when eager loading Y).
     */
    include? : IInclude[],
    /** = false, A function that gets executed while running the query to log the sql. */
    logging? : boolean | any,
    /** A hash of search attributes. */
    where? : {}
  }) : Promise<Model> {
    options = _.defaults({}, options, {
      where: this.where(),
      include: this._options.include || null
    });

    return this.constructor.findOne(options)
    .then(reload => {
      if (!reload) {
        throw new sequelizeErrors.InstanceError(
          'Instance could not be reloaded because it does not exist anymore (find call returned null)'
        );
      } else {
        // update the internal options of the instance
        this._options = reload._options;
        // re-set instance values
        this.set(reload.dataValues, {
          raw: true,
          reset: true && !options.attributes
        });
        return this;
      }
    });
  }

 /**
  * Validate the attributes of this instance according to validation rules set in the model definition.
  * The promise fulfills if and only if validation successful; otherwise it rejects an Error instance containing { field name : [error msgs] } entries.
  * @param options Options that are passed to the validator
  */
  public validate(options : {
    defaultFields? : string[],
    /** An array of strings. Only the properties that are in this array will be validated */
    fields? : string[],
    /** = true Run before and after validate hooks */
    hooks? : boolean,
    ruterning? : boolean,
    /** An array of strings. All properties that are in this array will not be validated */
    skip? : string[],
    validate? : boolean
  }) : Promise<undefined> {
    return new InstanceValidator(this, options).validate();
  }

  /**
   * This is the same as calling `set` and then calling `save` but it only saves the
   * exact values passed to it, making it more atomic and safer.
   *
   * @see {@link Model#set}
   * @see {@link Model#save}
   * @param updates See `set`
   * @param options See `save`
   */
  public update(values : {}, options : {
    defaultFields? : string[],
    fields? : string[],
  }) : Promise<Model> {
    const changedBefore = this.changed() || [];

    options = options || {};
    if (Array.isArray(options)) {
      options = {fields: options};
    }

    options = Utils.cloneDeep(options);
    const setOptions = Utils.cloneDeep(options);
    setOptions.attributes = options.fields;
    this.set(values, setOptions);

    // Now we need to figure out which fields were actually affected by the setter.
    const sideEffects = _.without.apply(this, [this.changed() || []].concat(changedBefore));
    const fields = _.union(Object.keys(values), sideEffects);

    if (!options.fields) {
      options.fields = _.intersection(fields, this.changed());
      options.defaultFields = options.fields;
    }

    return this.save(options);
  }

  /**
   * Destroy the row corresponding to this instance. Depending on your setting for paranoid, the row will either be completely deleted, or have its deletedAt timestamp set to the current time.
   */
  public destroy(options : {
    /** = false, If set to true, paranoid models will actually be deleted */
    force? : boolean,
    /** An object of hook function that are called before and after certain lifecycle events */
    hooks? : boolean,
    /** = false, A function that gets executed while running the query to log the sql. */
    logging? : boolean | any,
    /** = DEFAULT, An optional parameter to specify the schema search_path (Postgres only) */
    searchPath? : string,
    /** Transaction to run query under */
    transaction? : Transaction
  }) : Promise<undefined> {
    options = _.extend({
      hooks: true,
      force: false
    }, options);

    return Promise.try(() => {
      // Run before hook
      if (options.hooks) {
        return this.constructor.runHooks('beforeDestroy', this, options);
      }
    }).then(() => {
      const where = this.where(true);

      if (this.constructor._timestampAttributes.deletedAt && options.force === false) {
        const attribute = this.constructor.rawAttributes[this.constructor._timestampAttributes.deletedAt];
        const field = attribute.field || this.constructor._timestampAttributes.deletedAt;
        const values = {};

        values[field] = new Date();
        where[field] = attribute.hasOwnProperty('defaultValue') ? attribute.defaultValue : null;

        this.setDataValue(field, values[field]);

        return this.sequelize.getQueryInterface().update(
          this, this.constructor.getTableName(options), values, where, _.defaults({ hooks: false, model: this.constructor }, options)
        ).then(results => {
          const rowsUpdated = results[1];
          if (this.constructor._versionAttribute && rowsUpdated < 1) {
            throw new sequelizeErrors.OptimisticLockError({
              modelName: this.constructor.name,
              values,
              where
            });
          }
          return _.head(results);
        });
      } else {
        return this.sequelize.getQueryInterface().delete(this, this.constructor.getTableName(options), where, _.assign({ type: QueryTypes.DELETE, limit: null }, options));
      }
    }).tap(() => {
      // Run after hook
      if (options.hooks) {
        return this.constructor.runHooks('afterDestroy', this, options);
      }
    });
  }

  /**
   * Helper method to determine if a instance is "soft deleted".  This is
   * particularly useful if the implementer renamed the `deletedAt` attribute
   * to something different.  This method requires `paranoid` to be enabled.
   */
  public isSoftDeleted() : boolean {
    if (!this.constructor._timestampAttributes.deletedAt) {
      throw new Error('Model is not paranoid');
    }

    const deletedAtAttribute = this.constructor.rawAttributes[this.constructor._timestampAttributes.deletedAt];
    const defaultValue = deletedAtAttribute.hasOwnProperty('defaultValue') ? deletedAtAttribute.defaultValue : null;
    const deletedAt = this.get(this.constructor._timestampAttributes.deletedAt);
    const isSet = deletedAt !== defaultValue;

    // No need to check the value of deletedAt if it's equal to the default
    // value.  If so return the inverse of `isNotSet` since we are asking if
    // the model *is* soft-deleted.
    if (!isSet) {
      return isSet;
    }

    const now = moment();
    const deletedAtIsInTheFuture = moment(deletedAt).isAfter(now);

    // If deletedAt is a datetime in the future then the model is *not* soft-deleted.
    // Therefore, return the inverse of `deletedAtIsInTheFuture`.
    return !deletedAtIsInTheFuture;
  }

  /**
   * Restore the row corresponding to this instance. Only available for paranoid models.
   */
  public restore(options : {
    force? : boolean,
    /** An object of hook function that are called before and after certain lifecycle events */
    hooks? : boolean,
    /** = false, A function that gets executed while running the query to log the sql. */
    logging? : boolean | any,
    /** Transaction to run query under */
    transaction? : Transaction
  }) : Promise<undefined> {
    if (!this.constructor._timestampAttributes.deletedAt) {
      throw new Error('Model is not paranoid');
    }
    options = _.extend({
      hooks: true,
      force: false
    }, options);

    return Promise.try(() => {
      // Run before hook
      if (options.hooks) {
        return this.constructor.runHooks('beforeRestore', this, options);
      }
    }).then(() => {
      const deletedAtCol = this.constructor._timestampAttributes.deletedAt;
      const deletedAtAttribute = this.constructor.rawAttributes[deletedAtCol];
      const deletedAtDefaultValue = deletedAtAttribute.hasOwnProperty('defaultValue') ? deletedAtAttribute.defaultValue : null;

      this.setDataValue(deletedAtCol, deletedAtDefaultValue);
      return this.save(_.extend({}, options, {hooks: false, omitNull: false}));
    }).tap(() => {
      // Run after hook
      if (options.hooks) {
        return this.constructor.runHooks('afterRestore', this, options);
      }
    });
  }

 /**
  * Increment the value of one or more columns. This is done in the database, which means it does not use the values currently stored on the Instance. The increment is done using a
  * ```sql
  * SET column = column + X
  * ```
  * query. The updated instance will be returned by default in Postgres. However, in other dialects, you will need to do a reload to get the new values.
  *
  * ```js
  * instance.increment('number') // increment number by 1
  * instance.increment(['number', 'count'], { by: 2 }) // increment number and count by 2
  * instance.increment({ answer: 42, tries: 1}, { by: 2 }) // increment answer by 42, and tries by 1.
  *                                                        // `by` is ignored, since each column has its own value
  * ```
  *
  * @see {@link Model#reload}
  * @param fields : String|Array|Object, If a string is provided, that column is incremented by the value of `by` given in options.
  * If an array is provided, the same is true for each column. If and object is provided, each column is incremented by the value given.
  *
  * @since 4.0.0
  */
  public increment(fields : string[], options : {
    /** = 1, The number to increment by */
    by? : number,
    /** = false, If true, the updatedAt timestamp will not be updated. */
    instance? : Model,
    /**  = false, A function that gets executed while running the query to log the sql. */
    logging? : boolean | any,
    /** = true, Append RETURNING * to get back auto generated values (Postgres only) */
    returning? : boolean,
    /** = DEFAULT, An optional parameter to specify the schema search_path (Postgres only) */
    searchPath? : string,
    /** = false, If true, the updatedAt timestamp will not be updated. */
    silent? : boolean,
    /** Transaction to run query under */
    transaction? : Transaction,
    /** A hash of search attributes. */
    where? : {}
  }) : Promise<Model> {
    const identifier = this.where();

    options = Utils.cloneDeep(options);
    options.where = _.extend({}, options.where, identifier);
    options.instance = this;

    return this.constructor.increment(fields, options).return(this);
  }

  /**
   * Decrement the value of one or more columns. This is done in the database, which means it does not use the values currently stored on the Instance. The decrement is done using a
   * ```sql
   * SET column = column - X
   * ```
   * query. The updated instance will be returned by default in Postgres. However, in other dialects, you will need to do a reload to get the new values.
   *
   * ```js
   * instance.decrement('number') // decrement number by 1
   * instance.decrement(['number', 'count'], { by: 2 }) // decrement number and count by 2
   * instance.decrement({ answer: 42, tries: 1}, { by: 2 }) // decrement answer by 42, and tries by 1.
   *                                                        // `by` is ignored, since each column has its own value
   * ```
   *
   * @see {@link Model#reload}
   * @param fields : String|Array|Object, If a string is provided, that column is decremented by the value of `by` given in options. If an array is provided, the same is true for each column.
   * If and object is provided, each column is decremented by the value given
   * @return : Promise
   */
  public decrement(fields : string[], options : {
    /** = 1, The number to decrement by */
    by? : number,
    instance? : Model,
    /** = false, A function that gets executed while running the query to log the sql. */
    logging? : boolean | any,
    /** = true, Append RETURNING * to get back auto generated values (Postgres only) */
    returning? : boolean,
    /** = DEFAULT, An optional parameter to specify the schema search_path (Postgres only) */
    searchPath? : string,
    /** = false, If true, the updatedAt timestamp will not be updated. */
    silent? : boolean,
    /** Transaction to run query under */
    transaction? : Transaction,
    /** A hash of search attributes. */
    where? : {}
  }) {
    options = _.defaults({ increment: false }, options, {
      by: 1
    });

    return this.increment(fields, options);
  }

  /**
   * Check whether this and `other` Instance refer to the same row
   */
  public equals(other : Model) : boolean {

    if (!other || !other.constructor) {
      return false;
    }

    if (!(other instanceof this.constructor)) {
      return false;
    }

    return _.every(this.constructor.primaryKeyAttributes, attribute => this.get(attribute, {raw: true}) === other.get(attribute, {raw: true}));
  }

  /**
   * Check if this is equal to one of `others` by calling equals
   */
  public equalsOneOf(others : any[]) : boolean {
    return _.some(others, other => this.equals(other));
  }

  public setValidators(attribute : string, validators : any) {
    this.validators[attribute] = validators;
  }

  /**
   * Convert the instance to a JSON representation. Proxies to calling `get` with no keys. This means get all values gotten from the DB, and apply all custom getters.
   * @see {@link Model#get}
   */
  public toJSON() : {} {
    return _.clone(
      this.get({
        plain: true
      })
    );
  }

  public static runHooks(hooks, instance? : Model | Model[] | {}, options? : {}) : Promise<any> {
    throw new Error('runHooks not implemented');
  }

}

// Aliases
Model.prototype.updateAttributes = Model.prototype.update;

Model.findByPrimary = Model.findById;
Model.find = Model.findOne;
Model.findAndCountAll = Model.findAndCount;
Model.findOrInitialize = Model.findOrBuild;
Model.insertOrUpdate = Model.upsert;

// _.extend(Model, associationsMixin.Mixin);
Hooks.applyTo(Model);
