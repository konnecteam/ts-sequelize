'use strict';

import * as Promise from 'bluebird';
import * as _ from 'lodash';
import { DataSet } from '../data-set';
import { Model } from '../model';
import Op from '../operators';
import { Transaction } from '../transaction';
import { Utils } from '../utils';
import { Association } from './base';
import { Helpers } from './helpers';

/**
 * One-to-one association
 *
 * In the API reference below, add the name of the association to the method, e.g. for `User.hasOne(Project)` the getter will be `user.getProject()`.
 * This is almost the same as `belongsTo` with one exception - The foreign key will be defined on the target model.
 *
 * @see {@link Model.hasOne}
 */
export class HasOne
<TSourceInstance extends DataSet<TSourceAttributes>, TSourceAttributes,
TTargetInstance extends DataSet<TTargetAttributes>, TTargetAttributes>
extends Association <TSourceInstance, TSourceAttributes, TTargetInstance, TTargetAttributes> {

  public sourceIdentifier : string;
  public sourceKeyIsPrimary : boolean;

  constructor(source : Model<TSourceInstance, TSourceAttributes>, target : Model<TTargetInstance, TTargetAttributes>, options : {
    /** : string | {}, assocation alias */
    as? : any,
    createByBTM? : boolean,
    foreignKey? : string,
    useHooks? : boolean,
  }) {
    super(source, target, options);

    this.associationType = 'HasOne';
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
      this.foreignKey = this.options.foreignKey as string;
    }

    if (!this.foreignKey) {
      this.foreignKey = Utils.camelize(
        [
          Utils.singularize(this.options.as || this.source.name),
          this.source.primaryKeyAttribute].join('_')
      );
    }

    if (
      this.options.sourceKey
      && !this.source.rawAttributes[this.options.sourceKey]
    ) {
      throw new Error(`Unknown attribute "${this.options.sourceKey}" passed as sourceKey, define this attribute on model "${this.source.name}" first`);
    }

    this.sourceKey = this.options.sourceKey || this.source.primaryKeyAttribute;
    this.sourceKeyField = this.source.rawAttributes[this.sourceKey].field || this.sourceKey;
    this.sourceKeyIsPrimary = this.sourceKey === this.source.primaryKeyAttribute;
    this.sourceIdentifier = this.sourceKey;

    this.associationAccessor = this.as;
    this.options.useHooks = options.useHooks;

    if (this.target.rawAttributes[this.foreignKey]) {
      this.identifierField = this.target.rawAttributes[this.foreignKey].field || this.foreignKey;
    }

    // Get singular name, trying to uppercase the first letter, unless the model forbids it
    const singular = _.upperFirst(this.options.name.singular);

    this.accessors = {
      get: 'get' + singular,
      set: 'set' + singular,
      create: 'create' + singular
    };
  }

  /**
   * add attributes to the target of this association
   */
  public injectAttributes() : HasOne<TSourceInstance, TSourceAttributes, TTargetInstance, TTargetAttributes> {
    const newAttributes = {};

    newAttributes[this.foreignKey] = _.defaults({}, this.foreignKeyAttribute, {
      type: this.options.keyType || this.source.rawAttributes[this.sourceKey].type,
      allowNull: true
    });

    if (this.options.constraints !== false) {
      const target = this.target.rawAttributes[this.foreignKey] || newAttributes[this.foreignKey];
      this.options.onDelete = this.options.onDelete || (target.allowNull ? 'SET NULL' : 'CASCADE');
      this.options.onUpdate = this.options.onUpdate || 'CASCADE';
    }

    Helpers.addForeignKeyConstraints(newAttributes[this.foreignKey], this.source, this.target, this.options, this.sourceKeyField);
    Utils.mergeDefaults(this.target.rawAttributes, newAttributes);

    // Sync attributes and setters/getters to Model prototype
    this.target.refreshAttributes();

    this.identifierField = this.target.rawAttributes[this.foreignKey].field || this.foreignKey;

    Helpers.checkNamingCollision(this);

    return this;
  }

  /**
   * Get the associated instance.
   * @see {@link Model.findOne} for a full explanation of options
   */
  public get(instances : TSourceInstance[] | TSourceInstance, options? : {
    /** Apply a schema on the related model */
    schema? : string,
    schemaDelimiter? : string,
    /** Apply a scope on the related model, or remove its default scope by passing false */
    scope? : string|boolean,
    /** A hash of search attributes. */
    where? : {}
  }) : Promise<TTargetInstance | TTargetInstance[]> {
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
      where[this.foreignKey] = {
        [Op.in]: (instances as TSourceInstance[]).map(instance => instance.get(this.sourceKey))
      };
    } else {
      where[this.foreignKey] = instanceNoArray.get(this.sourceKey);
    }

    if (this.scope) {
      _.assign(where, this.scope);
    }

    options.where = options.where ?
      {[Op.and]: [where, options.where]} :
      where;

    if (instances) {
      return Target.findAll(options).then(results => {
        const result = {};
        for (const instance of (instances as TSourceInstance[])) {
          result[instance.get(this.sourceKey, {raw: true})] = null;
        }

        for (const instance of results) {
          result[instance.get(this.foreignKey, {raw: true})] = instance;
        }

        return result as any;
      });
    }

    return Target.findOne(options);
  }

  /**
   * Set the associated model.
   * @param newAssociation An persisted instance or the primary key of a persisted instance to associate with this. Pass `null` or `undefined` to remove the association.
   * @param options Options passed to getAssociation and `target.save`
   */
  public set(sourceInstance : TSourceInstance, associatedInstance : TTargetInstance, options : { transaction? : Transaction }) : Promise<TSourceInstance> {

    let alreadyAssociated;

    options = _.assign({}, options, {
      scope: false
    });

    return sourceInstance.getLinkedData(this, options).then(oldInstance => {
      // TODO Use equals method once #5605 is resolved
      alreadyAssociated = oldInstance && associatedInstance && _.every(this.target.primaryKeyAttributes, attribute =>
        oldInstance.get(attribute, {raw: true}) === (associatedInstance.get ? associatedInstance.get(attribute, {raw: true}) : associatedInstance)
      );

      if (oldInstance && !alreadyAssociated) {
        oldInstance[this.foreignKey] = null;
        return oldInstance.save(_.extend({}, options, {
          fields: [this.foreignKey],
          allowNull: [this.foreignKey],
          association: true
        }));
      }
    }).then(() => {
      if (associatedInstance && !alreadyAssociated) {
        if (!(associatedInstance.model === this.target)) {
          const tmpInstance = {} as TTargetAttributes;
          tmpInstance[this.target.primaryKeyAttribute] = associatedInstance;
          associatedInstance = this.target.build(tmpInstance, {
            isNewRecord: false
          });
        }

        _.assign(associatedInstance, this.scope);
        associatedInstance.set(this.foreignKey, sourceInstance.get(this.sourceIdentifier));

        return associatedInstance.save(options);
      }

      return null;
    }) as any;
  }

  /**
   * Create a new instance of the associated model and associate it with this.
   *
   * @param options Options passed to `target.create` and setAssociation.
   * @see {@link Model#create} for a full explanation of options
   */
  public create(sourceInstance : TSourceInstance, values : TTargetAttributes, options : {
    /**
     * If set, only columns matching those in fields will be saved
     * An optional array of strings, representing database columns. If fields is provided, only those columns will be validated and saved.
     */
    fields? : string[],
    values? : {}
  }) : Promise<TTargetInstance> {

    values = values || {} as TTargetAttributes;
    options = options || {};

    if (this.scope) {
      for (const attribute of Object.keys(this.scope)) {
        values[attribute] = this.scope[attribute];
        if (options.fields) {
          options.fields.push(attribute);
        }
      }
    }

    values[this.foreignKey] = sourceInstance.get(this.sourceIdentifier);
    if (options.fields) {
      options.fields.push(this.foreignKey);
    }

    return this.target.create(values, options);
  }
}
