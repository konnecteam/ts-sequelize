
import * as Promise from 'bluebird';
import * as Dottie from 'dottie';
import * as _ from 'lodash';
import { Sequelize } from '..';
import { Association } from './associations/base';
import { BelongsTo } from './associations/belongs-to';
import { BelongsToMany } from './associations/belongs-to-many';
import * as sequelizeErrors from './errors/index';
import { Hooks } from './hooks';
import { InstanceValidator } from './instance-validator';
import { IInclude } from './interfaces/iinclude';
import { Model } from './model';
import { QueryTypes } from './query-types';
import { Transaction } from './transaction';
import * as AllUtils from './utils';

const Utils = AllUtils.Utils;
const defaultsOptions = { raw: true };

export class DataSet <TAttributes> extends Hooks {

  public __eagerlyLoadedAssociations : any[];
  public _changed;
  public _customGetters : {};
  public _customSetters : {};
  public _hasCustomGetters : number;
  public _hasCustomSetters : number;
  public _modelOptions : { hasTrigger? : boolean, whereCollection?, validate? };
  public _options : { include? : IInclude[], includeNames?, includeMap? };
  public _previousDataValues : TAttributes;
  public _schema : string;
  public _schemaDelimiter : string;
  public _scope;
  public _scopeNames : string;
  public attributes : string[];
  public dataValues : TAttributes;
  public isNewRecord : boolean;
  public options : {};
  public rawAttributes : {};
  public updateAttributes;
  public validators : {};

  public model : Model<this, TAttributes>;

  /**
   * Builds a new model instance.
   * @param values an object of key value pairs
   */
  constructor(model : Model<any, any>, values? : {}, options : {
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
  } = {}) {
    super();
    this.model = model;
    Object.assign(this, model.dataSetsMethods);
    for (const key of Object.keys(model.attributeManipulation)) {
      if (this.hasOwnProperty(key) || DataSet.prototype.hasOwnProperty(key)) {
        this.sequelize.log('Not overriding built-in method from model attribute: ' + key);
        continue;
      }
      Object.defineProperty(this, key, model.attributeManipulation[key]);
    }
    this.rawAttributes = model.rawAttributes;

    // Allias
    this.updateAttributes = this.update;

    values = values || {};
    options = _.extend({
      isNewRecord: true,
      _schema: this.model._schema,
      _schemaDelimiter: this.model._schemaDelimiter
    }, options || {});

    if (options.attributes) {
      options.attributes = options.attributes.map(attribute => Array.isArray(attribute) ? attribute[1] : attribute);
    }

    if (!options.includeValidated) {
      this.model._conformOptions(options, this.model);
      if (options.include) {
        this.model._expandIncludeAll(options);
        this.model._validateIncludedElements(options);
      }
    }

    this.dataValues = {} as TAttributes;
    this._previousDataValues = {} as TAttributes;
    this._changed = {};
    this._modelOptions = this.model.options;
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

      if (this.model._hasDefaultValues) {
        defaults = _.mapValues((this.model._defaultValues as any), valueFn => {
          const value = valueFn();
          return value && value instanceof AllUtils.SequelizeMethod ? value : _.cloneDeep(value);
        });
      }

      // set id to null if not passed as value, a newly created dao has no id
      // removing this breaks bulkCreate
      // do after default values since it might have UUID as a default value
      if (this.model.primaryKeyAttribute && !defaults.hasOwnProperty(this.model.primaryKeyAttribute)) {
        defaults[this.model.primaryKeyAttribute] = null;
      }

      if (this.model._timestampAttributes.createdAt && defaults[this.model._timestampAttributes.createdAt]) {
        this.dataValues[this.model._timestampAttributes.createdAt] = Utils.toDefaultValue(defaults[this.model._timestampAttributes.createdAt], this.sequelize.options.dialect);
        delete defaults[this.model._timestampAttributes.createdAt];
      }

      if (this.model._timestampAttributes.updatedAt && defaults[this.model._timestampAttributes.updatedAt]) {
        this.dataValues[this.model._timestampAttributes.updatedAt] = Utils.toDefaultValue(defaults[this.model._timestampAttributes.updatedAt], this.sequelize.options.dialect);
        delete defaults[this.model._timestampAttributes.updatedAt];
      }

      if (this.model._timestampAttributes.deletedAt && defaults[this.model._timestampAttributes.deletedAt]) {
        this.dataValues[this.model._timestampAttributes.deletedAt] = Utils.toDefaultValue(defaults[this.model._timestampAttributes.deletedAt], this.sequelize.options.dialect);
        delete defaults[this.model._timestampAttributes.deletedAt];
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
    return this.model.sequelize;
  }

  /**
   * Get an object representing the query for this instance, use with `options.where`
   * @property where
   */
  public where(checkVersion? : boolean) : {} {
    const where = this.model.primaryKeyAttributes.reduce((result, attribute) => {
      result[attribute] = this.get(attribute, {raw: true});
      return result;
    }, {});

    if (_.size(where) === 0) {
      return this._modelOptions.whereCollection;
    }
    const versionAttr = this.model._versionAttribute;
    if (checkVersion && versionAttr) {
      where[versionAttr] = this.get(versionAttr, {raw: true});
    }
    return Utils.mapWhereFieldNames(where, this.model);
  }

  public toString() : string {
    return '[object SequelizeInstance:' + this.model.name + ']';
  }

  /**
   * Get the value of the underlying data value
   */
  public getDataValue(key : keyof TAttributes) : any {
    return this.dataValues[key];
  }

  /**
   * Update the underlying data value
   */
  public setDataValue <K extends keyof TAttributes>(key : K, value : TAttributes[K]) : void {
    const originalValue = this._previousDataValues[key];
    if ((!Utils.isPrimitive(value) && value !== null) || value !== originalValue) {
      this.changed(key, true);
    }

    this.dataValues[key] = value;
  }

  /**
   * If no key is given, returns all values of the instance, also invoking virtual getters.
   * If key is given and a field or virtual getter is present for the key it will call that getter - else it will return the value for key.
   */
  public get(key? : keyof TAttributes | any, options? : {
    apiVersion? : number,
    clone? : boolean,
    /** = false If set to true, included instances will be returned as plain objects */
    plain? : boolean,
    /** = false If set to true, field and virtual setters will be ignored */
    raw? : boolean
  }) : any { // testhint options:none
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
        } else if (this.dataValues[key] instanceof DataSet) {
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
  public set <K extends keyof TAttributes>(key? : K | any, value? : TAttributes[K] | {
    /** Array<String>|Object, A list of the attributes that you want to select, or an object with `include` and `exclude` keys. */
    attributes? : any,
    /** = false If set to true, field and virtual setters will be ignored */
    raw? : boolean,
    /** = false Clear all previously set data values */
    reset? : boolean
  }, options? : {
    /** Array<String>|Object, A list of the attributes that you want to select, or an object with `include` and `exclude` keys. */
    attributes? : any,
    /** = false If set to true, field and virtual setters will be ignored */
    raw? : boolean,
    /** = false Clear all previously set data values */
    reset? : boolean
  }) : this { // testhint options:none
    let values;
    let originalValue;

    if (typeof key === 'object' && key !== null) {
      values = key;
      options = value || {} as any;

      if (options.reset) {
        this.dataValues = {} as TAttributes;
      }

      // If raw, and we're not dealing with includes or special attributes, just set it straight on the dataValues object
      if (options.raw && !(this._options && this._options.include) && !(options && options.attributes) && !this.model._hasBooleanAttributes && !this.model._hasDateAttributes) {
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
          if (this.model.hasVirtualAttributes) {
            keys = keys.concat(this.model.virtualAttributes);
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
            if (!this.rawAttributes.hasOwnProperty(key)) {
              if (key.indexOf('.') > -1 && this.model._isJsonAttribute(key.split('.')[0])) {
                const previousDottieValue = Dottie.get(this.dataValues, key);
                if (!_.isEqual(previousDottieValue, value)) {
                  Dottie.set(this.dataValues, key, value);
                  this.changed(key.split('.')[0], true);
                }
              }
              return this;
            }

            // If attempting to set primary key and primary key is already defined, return
            if (this.model._hasPrimaryKeys && originalValue && this.model._isPrimaryKey(key)) {
              return this;
            }

            // If attempting to set read only attributes, return
            if (!this.isNewRecord && this.model._hasReadOnlyAttributes && this.model._isReadOnlyAttribute(key)) {
              return this;
            }
          }

          // If there's a data type sanitizer
          if (!(value instanceof AllUtils.SequelizeMethod) && this.model._dataTypeSanitizers.hasOwnProperty(key)) {
            value = this.model._dataTypeSanitizers[key].call(this, value, options);
          }

          // Set when the value has changed and not raw
          if (
            !options.raw &&
            (
              // True when sequelize method
              value instanceof AllUtils.SequelizeMethod ||
              // Check for data type type comparators
              !(value instanceof AllUtils.SequelizeMethod) && this.model._dataTypeChanges[key] && this.model._dataTypeChanges[key].call(this, value, originalValue, options) ||
              // Check default
              !this.model._dataTypeChanges[key] && (!Utils.isPrimitive(value) && value !== null || value !== originalValue)
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

  public setAttributes(updates : any) : DataSet<any> {
    return this.set(updates);
  }

  /**
   * If changed is called with a string it will return a boolean indicating whether the value of that key in `dataValues` is different from the value in `_previousDataValues`.
   * If changed is called without an argument, it will return an array of keys that have changed.
   * If changed is called without an argument and no keys have changed, it will return `false`.
   *
   * @returns : Boolean|Array
   */
  public changed(key? : string, value? : boolean) : any {
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
  public previous(key? : keyof TAttributes) : any {
    if (key) {
      return this._previousDataValues[key];
    }

    return _.pickBy(this._previousDataValues as any, (value, valueKey) => this.changed(valueKey));
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
    if (value[0] instanceof DataSet) {
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
  public save(options? : {
    association? : Association<DataSet<TAttributes>, TAttributes, any, any>,
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
    transaction? : Transaction | {},
    /** = true, If false, validations won't be run. */
    validate? : boolean
  }) : Promise<this> {
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
        options.fields = Object.keys(this.model.rawAttributes);
      } else {
        options.fields = _.intersection(this.changed(), Object.keys(this.model.rawAttributes));
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

    const primaryKeyName = this.model.primaryKeyAttribute;
    const primaryKeyAttribute = primaryKeyName && this.model.rawAttributes[primaryKeyName];
    const createdAtAttr = this.model._timestampAttributes.createdAt;
    const versionAttr = this.model._versionAttribute;
    const hook = this.isNewRecord ? 'Create' : 'Update';
    const wasNewRecord = this.isNewRecord;
    const now = Utils.now(this.sequelize.options.dialect);
    let updatedAtAttr = this.model._timestampAttributes.updatedAt;

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
      this.dataValues[updatedAtAttr] = this.model._getDefaultTimestamp(updatedAtAttr) || now;
    }

    if (this.isNewRecord && createdAtAttr && !this.dataValues[createdAtAttr]) {
      this.dataValues[createdAtAttr] = this.model._getDefaultTimestamp(createdAtAttr) || now;
    }

    return (Promise as any).try(() => {
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

        return this.model.runHooks('before' + hook, this, options)
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

                options.skip = _.difference(Object.keys(this.model.rawAttributes), hookChanged);
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

        return instance.save(includeOptions).then(() => this.setLinkedData(include.association, instance, {save: false, logging: options.logging}));
      });
    }).then(() => {
      const realFields = options.fields.filter(field => !this.model.isVirtualAttribute(field));
      if (!realFields.length) {
        return this;
      }
      if (!this.changed() && !this.isNewRecord) {
        return this;
      }

      const versionFieldName = _.get(this.model.rawAttributes[versionAttr], 'field') || versionAttr;
      let values = Utils.mapValueFieldNames(this.dataValues, options.fields, this.model);
      let query = null;
      let args = [];
      let where;

      if (this.isNewRecord) {
        query = 'insert';
        args = [this, this.model.getTableName(options), values, options];
      } else {
        where = this.where(true);
        where = Utils.mapValueFieldNames(where, Object.keys(where), this.model);
        if (versionAttr) {
          values[versionFieldName] += 1;
        }
        query = 'update';
        args = [this, this.model.getTableName(options), values, where, options];
      }

      return this.sequelize.getQueryInterface()[query].apply(this.sequelize.getQueryInterface(), args)
        .then(results => {
          const result : { dataValues? } = _.head(results);
          const rowsUpdated = results[1];

          if (versionAttr) {
            // Check to see that a row was updated, otherwise it's an optimistic locking error.
            if (rowsUpdated < 1) {
              throw new sequelizeErrors.OptimisticLockError({
                modelName: this.model.name,
                values,
                where
              });
            } else {
              result.dataValues[versionAttr] = values[versionFieldName];
            }
          }

          // Transfer database generated values (defaults, autoincrement, etc)
          for (const attr of Object.keys(this.model.rawAttributes)) {
            if (this.model.rawAttributes[attr].field &&
                values[this.model.rawAttributes[attr].field] !== undefined &&
                this.model.rawAttributes[attr].field !== attr
            ) {
              values[attr] = values[this.model.rawAttributes[attr].field];
              delete values[this.model.rawAttributes[attr].field];
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
          return (Promise as any).map(this._options.include.filter(include => !(include.association instanceof BelongsTo)), include => {
            let instances : Array<DataSet<TAttributes>> = this.get(include.as);

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
                  _values[include.association.foreignKey] = this.get(this.model.primaryKeyAttribute, {raw: true});
                  _values[include.association.otherKey] = instance.get(instance.model.primaryKeyAttribute, {raw: true});
                  // Include values defined in the scope of the association
                  _.assign(_values, include.association.through.scope);
                  return (include.association as BelongsToMany<any, any, any, any>).throughModel.create(_values, includeOptions);
                });
              } else {
                instance.set(include.association.foreignKey, this.get(include.association.sourceKey || this.model.primaryKeyAttribute, {raw: true}));
                _.assign(instance, include.association.scope);
                return instance.save(includeOptions);
              }
            });
          });
        })
        .tap(result => {
          // Run after hook
          if (options.hooks) {
            return this.model.runHooks('after' + hook, result, options);
          }
        })
        .then(result => {
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
  public reload(options? : {
    attributes? : any[],
    /**
     * Array<Object|Model|String>, A list of associations to eagerly load using a left join.
     * Supported is either `{ include: [ Model1, Model2, ...]}` or `{ include: [{ model: Model1, as: 'Alias' }]}` or `{ include: ['Alias']}`.
     * If your association are set up with an `as` (eg. `X.hasMany(Y, { as: 'Z }`, you need to specify Z in the as attribute when eager loading Y).
     */
    include? : IInclude[],
    /** = false, A function that gets executed while running the query to log the sql. */
    logging? : boolean | any,
    paranoid? : boolean,
    transaction? : Transaction,
    /** A hash of search attributes. */
    where? : {}
  }) : Promise<this> {
    options = _.defaults({}, options, {
      where: this.where(),
      include: this._options.include || null
    });

    return this.model.findOne(options)
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
  public validate(options? : {
    defaultFields? : string[],
    /** An array of strings. Only the properties that are in this array will be validated */
    fields? : string[],
    /** = true Run before and after validate hooks */
    hooks? : boolean,
    ruterning? : boolean,
    /** An array of strings. All properties that are in this array will not be validated */
    skip? : string[],
    validate? : boolean
  }) : Promise<any> {
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
  public update(values : TAttributes, options? : {
    defaultFields? : string[],
    fields? : string[],
    logging? : any,
    returning? : boolean,
    silent? : boolean,
    transaction? : Transaction
  }) : Promise<this> {
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
  public destroy(options? : {
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
  }) : Promise<this> {
    options = _.extend({
      hooks: true,
      force: false
    }, options);

    return Promise.try(() => {
      // Run before hook
      if (options.hooks) {
        return this.model.runHooks('beforeDestroy', this, options);
      }
    }).then(() => {
      const where = this.where(true);

      if (this.model._timestampAttributes.deletedAt && options.force === false) {
        const attribute = this.model.rawAttributes[this.model._timestampAttributes.deletedAt];
        const field = attribute.field || this.model._timestampAttributes.deletedAt;
        const values = {};

        values[field] = new Date();
        where[field] = attribute.hasOwnProperty('defaultValue') ? attribute.defaultValue : null;

        this.setDataValue(field, values[field]);

        return this.sequelize.getQueryInterface().update(
          this, this.model.getTableName(options), values, where, _.defaults({ hooks: false, model: this.model }, options)
        ).then(results => {
          const rowsUpdated = results[1];
          if (this.model._versionAttribute && rowsUpdated < 1) {
            throw new sequelizeErrors.OptimisticLockError({
              modelName: this.model.name,
              values,
              where
            });
          }
          return _.head(results);
        });
      } else {
        return this.sequelize.getQueryInterface().delete(this, this.model.getTableName(options), where, _.assign({ type: QueryTypes.DELETE, limit: null }, options));
      }
    }).tap(() => {
      // Run after hook
      if (options.hooks) {
        return this.model.runHooks('afterDestroy', this, options);
      }
    });
  }

  /**
   * Helper method to determine if a instance is "soft deleted".  This is
   * particularly useful if the implementer renamed the `deletedAt` attribute
   * to something different.  This method requires `paranoid` to be enabled.
   */
  public isSoftDeleted() : boolean {
    if (!this.model._timestampAttributes.deletedAt) {
      throw new Error('Model is not paranoid');
    }

    const deletedAtAttribute = this.model.rawAttributes[this.model._timestampAttributes.deletedAt];
    const defaultValue = deletedAtAttribute.hasOwnProperty('defaultValue') ? deletedAtAttribute.defaultValue : null;
    const deletedAt = this.get(this.model._timestampAttributes.deletedAt);
    const isSet = deletedAt !== defaultValue;
    return isSet;
  }

  /**
   * Restore the row corresponding to this instance. Only available for paranoid models.
   */
  public restore(options? : {
    force? : boolean,
    /** An object of hook function that are called before and after certain lifecycle events */
    hooks? : boolean,
    /** = false, A function that gets executed while running the query to log the sql. */
    logging? : boolean | any,
    /** Transaction to run query under */
    transaction? : Transaction
  }) : Promise<this> {
    if (!this.model._timestampAttributes.deletedAt) {
      throw new Error('Model is not paranoid');
    }
    options = _.extend({
      hooks: true,
      force: false
    }, options);

    return Promise.try(() => {
      // Run before hook
      if (options.hooks) {
        return this.model.runHooks('beforeRestore', this, options);
      }
    }).then(() => {
      const deletedAtCol = this.model._timestampAttributes.deletedAt;
      const deletedAtAttribute = this.model.rawAttributes[deletedAtCol];
      const deletedAtDefaultValue = deletedAtAttribute.hasOwnProperty('defaultValue') ? deletedAtAttribute.defaultValue : null;

      this.setDataValue(deletedAtCol, deletedAtDefaultValue);
      return this.save(_.extend({}, options, {hooks: false, omitNull: false}));
    }).tap(() => {
      // Run after hook
      if (options.hooks) {
        return this.model.runHooks('afterRestore', this, options);
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
  public increment(fields : Partial<TAttributes> | Array<keyof TAttributes> | keyof TAttributes, options? : {
    /** = 1, The number to increment by */
    by? : number,
    /** = false, If true, the updatedAt timestamp will not be updated. */
    instance? : DataSet<any>,
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
  }) : Promise<this> {
    const identifier = this.where();

    options = Utils.cloneDeep(options);
    options.where = _.extend({}, options.where, identifier);
    options.instance = this;

    return this.model.increment(fields, options).return(this);
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
  public decrement(fields : Partial<TAttributes> | Array<keyof TAttributes> | keyof TAttributes, options? : {
    /** = 1, The number to decrement by */
    by? : number,
    instance? : DataSet<any>,
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
  }) : Promise<this> {
    options = _.defaults({ increment: false }, options, {
      by: 1
    });

    return this.increment(fields, options);
  }

  /**
   * Check whether this and `other` Instance refer to the same row
   */
  public equals(other : DataSet<any>) : boolean {

    if (!other || !other.model) {
      return false;
    }

    if (!(other.model === this.model)) {
      return false;
    }

    return _.every(this.model.primaryKeyAttributes, attribute => this.get(attribute, {raw: true}) === other.get(attribute, {raw: true}));
  }

  /**
   * Check if this is equal to one of `others` by calling equals
   */
  public equalsOneOf(others : Array<DataSet<any>>) : boolean {
    return _.some(others, other => this.equals(other));
  }

  public setValidators(attribute : string, validators : any) {
    this.validators[attribute] = validators;
  }

  /**
   * Convert the instance to a JSON representation. Proxies to calling `get` with no keys. This means get all values gotten from the DB, and apply all custom getters.
   * @see {@link Model#get}
   */
  public toJSON() : TAttributes {
    return _.clone(
      this.get({
        plain: true
      })
    );
  }

  /**
   * get the association between the current dataSet and the target dataSet
   */
  private _getAssociation<TTargetInstance extends DataSet<TTargetAttributes>, TTargetAttributes>(
    aliases : string | { model : string | Model<TTargetInstance, TTargetAttributes>, associationAlias : string } | Model<TTargetInstance, TTargetAttributes> | Association<this, TAttributes, TTargetInstance, TTargetAttributes>)
  : Association<this, TAttributes, TTargetInstance, TTargetAttributes> {
    if (aliases instanceof Association) {
      return aliases;
    } else if (typeof aliases === 'string') {
      const target = this.sequelize.modelManager.getModel(aliases);
      if (!target) {
        throw Error('There is no model with the alias ' + aliases);
      }
      const associations = this.model.getAssociations<TTargetInstance, TTargetAttributes>(target);
      if (associations.length === 0) {
        throw Error('There is no associations with the model ' + target.name);
      }
      return associations[0];
    } else if (aliases instanceof Model) {
      const associations = this.model.getAssociations<TTargetInstance, TTargetAttributes>(aliases);
      if (associations.length === 0) {
        throw Error('There is no associations with the model ' + aliases.name);
      }
      return associations[0];
    } else if (aliases && aliases.model && aliases.associationAlias) {
      if (typeof aliases.model === 'string') {
        const targetAlias = aliases.model;
        aliases.model = this.sequelize.modelManager.getModel(targetAlias);
        if (!aliases.model) {
          throw Error('There is no model with the alias ' + targetAlias);
        }
      }
      const association = this.model.getAssociationForAlias<TTargetInstance, TTargetAttributes>(aliases.model, aliases.associationAlias);
      if (!association) {
        throw Error('There is no associations with the model ' + aliases.model.name + ' with the alias ' + aliases.associationAlias);
      }
      return association;
    } else {
      throw Error('Invalid value of aliases parameter, need to be a string, a Model, an Association or { model : string | Model, associationAlias : string }');
    }
  }

  public getLinkedData<TTargetInstance extends DataSet<TTargetAttributes>, TTargetAttributes>(
    aliases : string | { model : string | Model<any, any>, associationAlias : string } | Model<any, any> | Association<this, TAttributes, any, any>, options?)
    : Promise<TTargetInstance> {
    const association = this._getAssociation<TTargetInstance, TTargetAttributes>(aliases);
    return association.get(this, options) as any;
  }

  public getManyLinkedData<TTargetInstance extends DataSet<TTargetAttributes>, TTargetAttributes>(
    aliases : string | { model : string | Model<any, any>, associationAlias : string } | Model<any, any> | Association<this, TAttributes, any, any>, options?)
    : Promise<TTargetInstance[]> {
    return this.getLinkedData<TTargetInstance, TTargetAttributes>(aliases, options) as any;
  }

  public setLinkedData(aliases : string | { model : string | Model<any, any>, associationAlias : string } | Model<any, any> | Association<this, TAttributes, any, any>,
    newAssociatedObjects : Array<DataSet<any> | string | number> | DataSet<any>, options?) : Promise<this> {
    const association = this._getAssociation(aliases);
    return association.set(this, newAssociatedObjects, options);
  }

  public createLinkedData<TTargetInstance extends DataSet<TTargetAttributes>, TTargetAttributes>(aliases : string | { model : string | Model<any, any>, associationAlias : string } | Model<any, any> | Association<this, TAttributes, any, any>,
    values? : TTargetAttributes, options?) : Promise<TTargetInstance> {
    const association = this._getAssociation<TTargetInstance, TTargetAttributes>(aliases);
    return association.create(this, values, options);
  }

  public addLinkedData(aliases : string | { model : string | Model<any, any>, associationAlias : string } | Model<any, any> | Association<this, TAttributes, any, any>,
    newInstances : Array<DataSet<any>> | DataSet<any> | string, options?) : Promise<this> {
    const association = this._getAssociation(aliases);
    return association.add(this, newInstances, options) as any;
  }

  public removeLinkedData(aliases : string | { model : string | Model<any, any>, associationAlias : string } | Model<any, any> | Association<this, TAttributes, any, any>, oldInstances : Array<DataSet<any>> | DataSet<any>, options?) : Promise<this> {
    const association = this._getAssociation(aliases);
    return association.remove(this, oldInstances, options);
  }

  public hasLinkedData(aliases : string | { model : string | Model<any, any>, associationAlias : string } | Model<any, any> | Association<this, TAttributes, any, any>,
    instances? : DataSet<any> | Array<DataSet<any>> | string[] | string | number[] | number, options?) : Promise<boolean> {
    const association = this._getAssociation(aliases);
    return association.has(this, instances, options);
  }

  public countLinkedData(aliases : string | { model : string | Model<any, any>, associationAlias : string } | Model<any, any> | Association<this, TAttributes, any, any>, options?) : Promise<number> {
    const association = this._getAssociation(aliases);
    return association.count(this, options);
  }
}
