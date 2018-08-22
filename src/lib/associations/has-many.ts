'use strict';

import * as Promise from 'bluebird';
import * as _ from 'lodash';
import { Sequelize } from '../..';
import { DataSet } from '../data-set';
import { IInclude } from '../interfaces/iinclude';
import { Model } from '../model';
import Op from '../operators';
import { Transaction } from '../transaction';
import { Utils } from '../utils';
import { Association } from './base';
import { Helpers } from './helpers';

/**
 * One-to-many association
 *
 * In the API reference below, add the name of the association to the method, e.g. for `User.hasMany(Project)` the getter will be `user.getProjects()`.
 * If the association is aliased, use the alias instead, e.g. `User.hasMany(Project, { as: 'jobs' })` will be `user.getJobs()`.
 *
 * @see {@link Model.hasMany}
 */
export class HasMany
<TSourceInstance extends DataSet<TSourceAttributes>, TSourceAttributes,
TTargetInstance extends DataSet<TTargetAttributes>, TTargetAttributes>
extends Association <TSourceInstance, TSourceAttributes, TTargetInstance, TTargetAttributes> {

  public foreignKeyField : string;
  public sequelize : Sequelize;
  public sourceIdentifier : string;
  public targetAssociation : Association<TTargetInstance, TTargetAttributes, TSourceInstance, TSourceAttributes>;

  constructor(source : Model<TSourceInstance, TSourceAttributes>, target : Model<TTargetInstance, TTargetAttributes>, options : {
    /** : string | {}, assocation alias */
    as? : any,
    createByBTM? : boolean,
    foreignKey? : string | {},
    /** Additional attributes for the join table */
    through? : {}
  }) {
    super(source, target, options);

    this.associationType = 'HasMany';
    this.targetAssociation = null;
    this.sequelize = source.sequelize;
    this.isMultiAssociation = true;
    this.foreignKeyAttribute = {};

    if (this.options.through) {
      throw new Error('N:M associations are not supported with hasMany. Use belongsToMany instead');
    }

    /*
    * If self association, this is the target association
    */
    if (this.isSelfAssociation) {
      this.targetAssociation = (this as any);
    }

    if (this.as) {
      this.isAliased = true;

      if (_.isPlainObject(this.as)) {
        this.options.name = this.as;
        this.as = this.as.plural;
      } else {
        this.options.name = {
          plural: this.as,
          singular: Utils.singularize(this.as)
        };
      }
    } else {
      this.as = this.target.options.name.plural;
      this.options.name = this.target.options.name;
    }

    /*
     * Foreign key setup
     */
    if (_.isObject(this.options.foreignKey)) {
      this.foreignKeyAttribute = this.options.foreignKey;
      this.foreignKey = this.foreignKeyAttribute.name || this.foreignKeyAttribute.fieldName;
    } else if (this.options.foreignKey) {
      this.foreignKey = this.options.foreignKey as string;
    }

    if (!this.foreignKey) {
      this.foreignKey = Utils.camelize(
        [
          this.source.options.name.singular,
          this.source.primaryKeyAttribute].join('_')
      );
    }

    if (this.target.rawAttributes[this.foreignKey]) {
      this.identifierField = this.target.rawAttributes[this.foreignKey].field || this.foreignKey;
      this.foreignKeyField = this.target.rawAttributes[this.foreignKey].field || this.foreignKey;
    }

    /*
     * Source key setup
     */
    this.sourceKey = this.options.sourceKey || this.source.primaryKeyAttribute;
    this.sourceIdentifier = this.sourceKey;

    if (this.source.rawAttributes[this.sourceKey]) {
      this.sourceKeyAttribute = this.sourceKey;
      this.sourceKeyField = this.source.rawAttributes[this.sourceKey].field || this.sourceKey;
    } else {
      this.sourceKeyAttribute = this.source.primaryKeyAttribute;
      this.sourceKeyField = this.source.primaryKeyField;
    }

    // Get singular and plural names
    // try to uppercase the first letter, unless the model forbids it
    const plural = _.upperFirst(this.options.name.plural);
    const singular = _.upperFirst(this.options.name.singular);

    this.associationAccessor = this.as;
    this.accessors = {
      get: 'get' + plural,
      set: 'set' + plural,
      addMultiple: 'add' + plural,
      add: 'add' + singular,
      create: 'create' + singular,
      remove: 'remove' + singular,
      removeMultiple: 'remove' + plural,
      hasSingle: 'has' + singular,
      hasAll: 'has' + plural,
      count: 'count' + plural
    };
  }

  /**
   * add attributes to the target table of this association or in an extra table which connects two tables
   */
  public injectAttributes() : HasMany<TSourceInstance, TSourceAttributes, TTargetInstance, TTargetAttributes> {
    const newAttributes = {};
    // Create a new options object for use with addForeignKeyConstraints, to avoid polluting this.options in case it is later used for a n:m
    const constraintOptions = _.clone(this.options);

    newAttributes[this.foreignKey] = _.defaults({}, this.foreignKeyAttribute, {
      type: this.options.keyType || this.source.rawAttributes[this.sourceKeyAttribute].type,
      allowNull: true
    });

    if (this.options.constraints !== false) {
      const target = this.target.rawAttributes[this.foreignKey] || newAttributes[this.foreignKey];
      constraintOptions.onDelete = constraintOptions.onDelete || (target.allowNull ? 'SET NULL' : 'CASCADE');
      constraintOptions.onUpdate = constraintOptions.onUpdate || 'CASCADE';
    }

    Helpers.addForeignKeyConstraints(newAttributes[this.foreignKey], this.source, this.target, constraintOptions, this.sourceKeyField);
    Utils.mergeDefaults(this.target.rawAttributes, newAttributes);

    this.target.refreshAttributes();
    this.source.refreshAttributes();

    this.identifierField = this.target.rawAttributes[this.foreignKey].field || this.foreignKey;
    this.foreignKeyField = this.target.rawAttributes[this.foreignKey].field || this.foreignKey;
    this.sourceKeyField = this.source.rawAttributes[this.sourceKey].field || this.sourceKey;

    Helpers.checkNamingCollision(this);

    return this;
  }

  /**
   * Get everything currently associated with this, using an optional where clause.
   * @see {@link Model.findAll}  for a full explanation of options
   */
  public get(instances : TSourceInstance[] | TSourceInstance, options : {
    /** Array<String>|Object, A list of the attributes that you want to select, or an object with `include` and `exclude` keys. */
    attributes? : any,
    /** Group by clause */
    group? : {},
    /** limit on group by - auto-completed */
    groupedLimit? : {},
    /**
     * Array<Object|Model|String>, A list of associations to eagerly load using a left join.
     * Supported is either `{ include: [ Model1, Model2, ...]}` or `{ include: [{ model: DataSet<any>1, as: 'Alias' }]}` or `{ include: ['Alias']}`.
     * If your association are set up with an `as` (eg. `X.hasMany(Y, { as: 'Z }`, you need to specify Z in the as attribute when eager loading Y).
     */
    include? : IInclude[],
    /** The maximum count you want to get. */
    limit? : number,
    order? : string[][],
    /** Specify if we want only one row without using an array */
    plain? : boolean,
    /** Apply a schema on the related model */
    schema? : string,
    schemaDelimiter? : string,
    /** Apply a scope on the related model, or remove its default scope by passing false */
    scope? : string|boolean,
    /** Return raw result. See sequelize.query for more information. */
    raw? : boolean,
    /** An optional where clause to limit the associated models */
    where? : {},
  } = {}) : Promise<TTargetInstance[]> {
    const where = {};
    let targetModel = this.target;
    let instanceNoArray : TSourceInstance;
    let values;

    if (!Array.isArray(instances)) {
      instanceNoArray = instances;
      instances = undefined;
    }

    options = Utils.cloneDeep(options);

    if (this.scope) {
      _.assign(where, this.scope);
    }

    if (instances) {
      values = (instances as TSourceInstance[]).map(instance => instance.get(this.sourceKey, {raw: true}));

      if (options.limit && (instances as TSourceInstance[]).length > 1) {
        options.groupedLimit = {
          limit: options.limit,
          on: this, // association
          values
        };

        delete options.limit;
      } else {
        where[this.foreignKey] = {
          [Op.in]: values
        };
        delete options.groupedLimit;
      }
    } else {
      where[this.foreignKey] = instanceNoArray.get(this.sourceKey, {raw: true});
    }

    options.where = options.where ?
      { [Op.and]: [where, options.where] } :
      where;

    if (options.hasOwnProperty('scope')) {
      if (!options.scope) {
        targetModel = targetModel.unscoped();
      } else {
        targetModel = targetModel.scope(options.scope);
      }
    }

    if (options.hasOwnProperty('schema')) {
      targetModel = targetModel.schema(options.schema, options.schemaDelimiter);
    }


    return targetModel.findAll(options).then(results => {
      if (instanceNoArray) {
        return results;
      }

      const result = {};
      for (const instance of (instances as TSourceInstance[])) {
        result[instance.get(this.sourceKey, {raw: true})] = [];
      }

      for (const instance of results) {
        result[instance.get(this.foreignKey, { raw: true })].push(instance);
      }

      return result as any;
    });
  }

  /**
   * Count everything currently associated with this, using an optional where clause.
   */
  public count(instance : TSourceInstance, options : {
    /** Array<String>|Object, A list of the attributes that you want to select, or an object with `include` and `exclude` keys. */
    attributes? : any,
    /** Group by clause */
    group? : {},
    include? : IInclude[],
    /** Specify if we want only one row without using an array */
    plain? : boolean
    /** Return raw result. */
    raw? : boolean,
    /** Apply a scope on the related model, or remove its default scope by passing false */
    scope? : string|boolean,
    /** An optional where clause to limit the associated models */
    where? : {},
  }) : Promise<number> {
    options = Utils.cloneDeep(options);

    options.attributes = [
      [
        this.sequelize.fn(
          'COUNT',
          this.sequelize.col(this.target.name.concat('.', this.target.primaryKeyField))
        ),
        'count']];
    options.raw = true;
    options.plain = true;

    return this.get(instance, options).then(result => parseInt((result as any).count, 10));
  }

  /**
   * Check if one or more rows are associated with `this`.
   * @param options Options passed to getAssociations
   */
  public has(sourceInstance : TSourceInstance, targetInstances : TTargetInstance[] | TTargetInstance | string[] | string | number[] | number, options : {
    /** Transaction to run query under */
    transaction? : Transaction,
    /** A hash of search attributes. */
    where? : {}
  }) : Promise<boolean> {
    const where = {};

    if (!Array.isArray(targetInstances)) {
      (targetInstances as any) = [targetInstances];
    }

    options = _.assign({}, options, {
      scope: false,
      raw: true
    });

    where[Op.or] = (targetInstances as any[]).map(instance => {
      if (instance.model === this.target) {
        return (instance as TTargetInstance).where();
      } else {
        const _where = {};
        _where[this.target.primaryKeyAttribute] = instance;
        return _where;
      }
    });

    options.where = {
      [Op.and]: [
        where,
        options.where,
      ]
    };

    return this.get(sourceInstance, options).then(associatedObjects => associatedObjects.length === (targetInstances as any[]).length);
  }

  /**
   * Set the associated models by passing an array of persisted instances or their primary keys. Everything that is not in the passed array will be un-associated
   *
   * @param newAssociations An array of persisted instances or primary key of instances to associate with this. Pass `null` or `undefined` to remove all associations.
   * @param options Options passed to `target.findAll` and `update`.
   */
  public set(sourceInstance : TSourceInstance, targetInstances : Array<TTargetInstance | string | number>, options : {
    /** Transaction to run query under */
    transaction? : Transaction,
    /** Run validation for the join model */
    validate? : {}
  }) : Promise<TSourceInstance> {

    if (targetInstances === null) {
      targetInstances = [];
    } else {
      targetInstances = this.toInstanceArray(targetInstances);
    }

    return this.get(sourceInstance, _.defaults({scope: false, raw: true}, options)).then(oldAssociations => {
      const promises = [];
      const obsoleteAssociations = oldAssociations.filter(old =>
        !_.find(targetInstances, obj =>
          obj[this.target.primaryKeyAttribute] === old[this.target.primaryKeyAttribute]
        )
      );
      const unassociatedObjects = targetInstances.filter(obj =>
        !_.find(oldAssociations, old =>
          obj[this.target.primaryKeyAttribute] === old[this.target.primaryKeyAttribute]
        )
      );
      let updateWhere;
      let update;

      if (obsoleteAssociations.length > 0) {
        update = {};
        update[this.foreignKey] = null;

        updateWhere = {};

        updateWhere[this.target.primaryKeyAttribute] = obsoleteAssociations.map(associatedObject =>
          associatedObject[this.target.primaryKeyAttribute]
        );

        promises.push(this.target.unscoped().update(
          update,
          _.defaults({
            where: updateWhere
          }, options)
        ));
      }

      if (unassociatedObjects.length > 0) {
        updateWhere = {};

        update = {};
        update[this.foreignKey] = sourceInstance.get(this.sourceKey);

        _.assign(update, this.scope);
        updateWhere[this.target.primaryKeyAttribute] = unassociatedObjects.map(unassociatedObject =>
          unassociatedObject[this.target.primaryKeyAttribute]
        );

        promises.push(this.target.unscoped().update(
          update,
          _.defaults({
            where: updateWhere
          }, options)
        ));
      }

      return Utils.Promise.all(promises).return(sourceInstance);
    });
  }

  /**
   * Associate one or more target rows with `this`. This method accepts a Model / string / number to associate a single row,
   * or a mixed array of Model / string / numbers to associate multiple rows.
   *
   * @param {Array<Model<any, any>>|Model|string[]|string|number[]|number} newAssociation(s)
   * @param options Options passed to `target.update`.
   */
  public add(sourceInstance : TSourceInstance, targetInstances : TTargetInstance[] | TTargetInstance | string[] | string | number[] | number, options : {} = {}) : Promise<TSourceInstance | void> {
    if (!targetInstances) {
      return Utils.Promise.resolve();
    }

    const update = {} as TTargetAttributes;
    const where = {};

    targetInstances = this.toInstanceArray(targetInstances);

    update[this.foreignKey] = sourceInstance.get(this.sourceKey);
    _.assign(update, this.scope);

    where[this.target.primaryKeyAttribute] = (targetInstances as TTargetInstance[]).map(unassociatedObject =>
      unassociatedObject.get(this.target.primaryKeyAttribute)
    );

    return this.target.unscoped().update(update, _.defaults({where}, options)).then( () => sourceInstance);
  }

  /**
   * Un-associate one or several target rows.
   *
   * @param {Array<Model<any, any>>|Model|String[]|string|Number[]|number} [oldAssociatedInstance(s)]
   * @param options Options passed to `target.update`
   */
  public remove(sourceInstance : TSourceInstance, targetInstances : TTargetInstance[] | TTargetInstance | string[] | string | number[] | number, options : {} = {})
  : Promise<TSourceInstance> {
    const update = {} as TTargetAttributes;
    const where = {};

    targetInstances = this.toInstanceArray(targetInstances);

    update[this.foreignKey] = null;

    where[this.foreignKey] = sourceInstance.get(this.sourceKey);
    where[this.target.primaryKeyAttribute] = (targetInstances as TTargetInstance[]).map(targetInstance =>
      targetInstance.get(this.target.primaryKeyAttribute)
    );

    return this.target.unscoped().update(update, _.defaults({where}, options)).then( () => this) as any;
  }

  /**
   * Create a new instance of the associated model and associate it with this.
   * @param options Options passed to `target.create`.
   */
  public create(sourceInstance : TSourceInstance, values : TTargetAttributes, options : {
    fields? : string[],
    values? : {}
  } = {}) : Promise<TTargetInstance> {

    if (Array.isArray(options)) {
      options = {
        fields: options
      };
    }

    if (values === undefined) {
      values = {} as TTargetAttributes;
    }

    if (this.scope) {
      for (const attribute of Object.keys(this.scope)) {
        values[attribute] = this.scope[attribute];
        if (options.fields) {
          options.fields.push(attribute);
        }
      }
    }

    values[this.foreignKey] = sourceInstance.get(this.sourceKey);
    if (options.fields) {
      options.fields.push(this.foreignKey);
    }
    return this.target.create(values, options);
  }
}
