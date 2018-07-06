'use strict';

import * as _ from 'lodash';
import { Model } from '../model';
import Op from '../operators';
import { Transaction } from '../transaction';
import { Utils } from '../utils';
import { Association } from './base';
import { Helpers } from './helpers';

/**
 * One-to-one association
 *
 * In the API reference below, add the name of the association to the method, e.g. for `User.belongsTo(Project)` the getter will be `user.getProject()`.
 *
 * @see {@link Model.belongsTo}
 */
export class BelongsTo extends Association {

  public identifier : string;
  public targetIdentifier : string;
  public targetKey : string;
  public targetKeyField : string;
  public targetKeyIsPrimary : boolean;

  constructor(source : typeof Model, target : typeof Model, options : {
    /** : string | {}, assocation alias */
    as? : any,
    createByBTM? : boolean,
    foreignKey? : string,
    useHooks? : boolean
  }) {
    super(source, target, options);

    this.associationType = 'BelongsTo';
    this.isSingleAssociation = true;
    this.foreignKeyAttribute = {};

    if (this.as) {
      this.isAliased = true;
      this.options.name = {
        singular: this.as
      };
    } else {
      this.as = this.target.options.name.singular;
      this.options.name = this.target.options.name;
    }

    if (_.isObject(this.options.foreignKey)) {
      this.foreignKeyAttribute = this.options.foreignKey;
      this.foreignKey = this.foreignKeyAttribute.name || this.foreignKeyAttribute.fieldName;
    } else if (this.options.foreignKey) {
      this.foreignKey = this.options.foreignKey;
    }

    if (!this.foreignKey) {
      this.foreignKey = Utils.camelize(
        [
          this.as,
          this.target.primaryKeyAttribute].join('_')
      );
    }

    this.identifier = this.foreignKey;
    if (this.source.rawAttributes[this.identifier]) {
      this.identifierField = this.source.rawAttributes[this.identifier].field || this.identifier;
    }

    if (
      this.options.targetKey
      && !this.target.rawAttributes[this.options.targetKey]
    ) {
      throw new Error(`Unknown attribute "${this.options.targetKey}" passed as targetKey, define this attribute on model "${this.target.name}" first`);
    }

    this.targetKey = this.options.targetKey || this.target.primaryKeyAttribute;
    this.targetKeyField = this.target.rawAttributes[this.targetKey].field || this.targetKey;
    this.targetKeyIsPrimary = this.targetKey === this.target.primaryKeyAttribute;
    this.targetIdentifier = this.targetKey;

    this.associationAccessor = this.as;
    this.options.useHooks = options.useHooks;

    // Get singular name, trying to uppercase the first letter, unless the model forbids it
    const singular = _.upperFirst(this.options.name.singular);

    this.accessors = {
      get: 'get' + singular,
      set: 'set' + singular,
      create: 'create' + singular
    };
  }

  /**
   * add attributes to the source of this association
   */
  public injectAttributes() {
    const newAttributes = {};

    newAttributes[this.foreignKey] = _.defaults({}, this.foreignKeyAttribute, {
      type: this.options.keyType || this.target.rawAttributes[this.targetKey].type,
      allowNull: true
    });

    if (this.options.constraints !== false) {
      const source = this.source.rawAttributes[this.foreignKey] || newAttributes[this.foreignKey];
      this.options.onDelete = this.options.onDelete || (source.allowNull ? 'SET NULL' : 'NO ACTION');
      this.options.onUpdate = this.options.onUpdate || 'CASCADE';
    }

    Helpers.addForeignKeyConstraints(newAttributes[this.foreignKey], this.target, this.source, this.options, this.targetKeyField);
    Utils.mergeDefaults(this.source.rawAttributes, newAttributes);

    this.source.refreshAttributes();

    this.identifierField = this.source.rawAttributes[this.foreignKey].field || this.foreignKey;

    Helpers.checkNamingCollision(this);

    return this;
  }

  /**
   * Mixin (inject) association methods to model prototype
   */
  public mixin(obj) {
    const methods = ['get', 'set', 'create'];

    Helpers.mixinMethods(this, obj, methods);
  }

  /**
   * Get the associated instance.
   * @see {@link Model.findOne} for a full explanation of options
   */
  public get(instances : Model[], options : {
    /** The maximum count you want to get. */
    limit? : number,
    /** Apply a schema on the related model */
    schema? : string,
    schemaDelimiter? : string,
    /** Apply a scope on the related model, or remove its default scope by passing false. */
    scope? : string|boolean,
    /** Transaction to run query under */
    transaction? : Transaction,
    /** A hash of search attributes. */
    where? : {}
  }) : Promise<Model> {
    const where = {};
    let Target = this.target;
    let instanceNoArray;

    options = Utils.cloneDeep(options);

    if (options.hasOwnProperty('scope')) {
      if (!options.scope) {
        Target = Target.unscoped();
      } else {
        Target = Target.scope(options.scope);
      }
    }

    if (options.hasOwnProperty('schema')) {
      Target = Target.schema(options.schema, options.schemaDelimiter);
    }

    if (!Array.isArray(instances)) {
      instanceNoArray = instances;
      instances = undefined;
    }

    if (instances) {
      where[this.targetKey] = {
        [Op.in]: instances.map(instance => instance.get(this.foreignKey))
      };
    } else {
      if (this.targetKeyIsPrimary && !options.where) {
        return Target.findById(instanceNoArray.get(this.foreignKey), options);
      } else {
        where[this.targetKey] = instanceNoArray.get(this.foreignKey);
        options.limit = null;
      }
    }

    options.where = options.where ?
      {[Op.and]: [where, options.where]} :
      where;

    if (instances) {
      return Target.findAll(options).then(results => {
        const result = {};
        for (const instance of instances) {
          result[instance.get(this.foreignKey, {raw: true})] = null;
        }

        for (const instance of results) {
          result[instance.get(this.targetKey, {raw: true})] = instance;
        }

        return result;
      });
    }

    return Target.findOne(options);
  }

  /**
   * Set the associated model.
   *
   * @param associatedInstance An persisted instance or the primary key of an instance to associate with this. Pass `null` or `undefined` to remove the association.
   * @param options Options passed to `this.save`
   */
  public set(sourceInstance : Model, associatedInstance : Model|string|number, options : {
    /** A function that logs sql queries, or false for no logging */
    logging? : boolean | any,
    /** = true Skip saving this after setting the foreign key if false. */
    save? : boolean
  } = {}) : Promise<any> {
    let value = associatedInstance;

    if (associatedInstance instanceof this.target) {
      value = associatedInstance[this.targetKey];
    }

    sourceInstance.set(this.foreignKey, value);

    if (options.save === false) {
      return;
    }

    options = _.extend({
      fields: [this.foreignKey],
      allowNull: [this.foreignKey],
      association: true
    }, options);

    // passes the changed field to save, so only that field get updated.
    return sourceInstance.save(options);
  }

  /**
   * Create a new instance of the associated model and associate it with this.
   *
   * @param options Options passed to `target.create` and setAssociation.
   * @see {@link Model#create}  for a full explanation of options
   */
  public create(sourceInstance : Model, values : {}, fieldsOrOptions : {
    /** = false, A function that gets executed while running the query to log the sql. */
    logging? : boolean | any,
    /** Transaction to run query under */
    transaction? : Transaction
  }) : Promise<any> {

    const options = {
      transaction: undefined,
      logging: undefined
    };

    options.logging = (fieldsOrOptions || {}).logging;

    if ((fieldsOrOptions || {}).transaction instanceof Transaction) {
      options.transaction = fieldsOrOptions.transaction;
    }

    return this.target.create(values, fieldsOrOptions)
      .then(newAssociatedObject =>
        sourceInstance[this.accessors.set](newAssociatedObject, options)
      );
  }
}
