'use strict';

import * as _ from 'lodash';
import { Sequelize } from '../..';
import { Model } from '../model';
import { IInclude } from '../model/iinclude';
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
export class HasMany extends Association {

  public foreignKeyField : string;
  public sequelize : Sequelize;
  public sourceIdentifier : string;
  public sourceKey : string;
  public targetAssociation : Association;

  constructor(source : typeof Model, target : typeof Model, options : {
    /** : string | {}, assocation alias */
    as? : any,
    createByBTM? : boolean,
    foreignKey? : string,
    /** Additional attributes for the join table */
    through? : {}
  }) {
    super(source, target, options);

    this.associationType = 'HasMany';
    this.targetAssociation = null;
    this.sequelize = source.sequelize;
    this.through = options.through;
    this.isMultiAssociation = true;
    this.foreignKeyAttribute = {};

    if (this.options.through) {
      throw new Error('N:M associations are not supported with hasMany. Use belongsToMany instead');
    }

    /*
    * If self association, this is the target association
    */
    if (this.isSelfAssociation) {
      this.targetAssociation = this;
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
      this.foreignKey = this.options.foreignKey;
    }

    if (!this.foreignKey) {
      this.foreignKey = Utils.camelizeIf(
        [
          Utils.underscoredIf(this.source.options.name.singular, this.source.options.underscored),
          this.source.primaryKeyAttribute,
        ].join('_'),
        !this.source.options.underscored
      );
    }

    if (this.target.rawAttributes[this.foreignKey]) {
      this.identifierField = this.target.rawAttributes[this.foreignKey].field || this.foreignKey;
      this.foreignKeyField = this.target.rawAttributes[this.foreignKey].field || this.foreignKey;
    }

    this.sourceKey = this.options.sourceKey || this.source.primaryKeyAttribute;
    if (this.target.rawAttributes[this.sourceKey]) {
      this.sourceKeyField = this.source.rawAttributes[this.sourceKey].field || this.sourceKey;
    } else {
      this.sourceKeyField = this.sourceKey;
    }

    if (this.source .fieldRawAttributesMap[this.sourceKey]) {
      this.sourceKeyAttribute = this.source .fieldRawAttributesMap[this.sourceKey].fieldName;
    } else {
      this.sourceKeyAttribute = this.source .primaryKeyAttribute;
    }
    this.sourceIdentifier = this.sourceKey;
    this.associationAccessor = this.as;

    // Get singular and plural names, trying to uppercase the first letter, unless the model forbids it
    const plural = Utils.uppercaseFirst(this.options.name.plural);
    const singular = Utils.uppercaseFirst(this.options.name.singular);

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
  public injectAttributes() {
    const newAttributes = {};
    const constraintOptions = _.clone(this.options); // Create a new options object for use with addForeignKeyConstraints, to avoid polluting this.options in case it is later used for a n:m
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

    this.identifierField = this.target.rawAttributes[this.foreignKey].field || this.foreignKey;
    this.foreignKeyField = this.target.rawAttributes[this.foreignKey].field || this.foreignKey;

    this.target.refreshAttributes();
    this.source.refreshAttributes();

    Helpers.checkNamingCollision(this);

    return this;
  }

  /**
   * Mixin (inject) association methods to model prototype
   */
  public mixin(obj) : void {
    const methods = ['get', 'count', 'hasSingle', 'hasAll', 'set', 'add', 'addMultiple', 'remove', 'removeMultiple', 'create'];
    const aliases = {
      hasSingle: 'has',
      hasAll: 'has',
      addMultiple: 'add',
      removeMultiple: 'remove'
    };

    Helpers.mixinMethods(this, obj, methods, aliases);
  }

  /**
   * Get everything currently associated with this, using an optional where clause.
   * @see {@link Model.findAll}  for a full explanation of options
   */
  public get(instances : Model[] | Model, options : {
    /** Array<String>|Object, A list of the attributes that you want to select, or an object with `include` and `exclude` keys. */
    attributes? : any,
    /** Group by clause */
    group? : {},
    /** limit on group by - auto-completed */
    groupedLimit? : {},
    /**
     * Array<Object|Model|String>, A list of associations to eagerly load using a left join.
     * Supported is either `{ include: [ Model1, Model2, ...]}` or `{ include: [{ model: Model1, as: 'Alias' }]}` or `{ include: ['Alias']}`.
     * If your association are set up with an `as` (eg. `X.hasMany(Y, { as: 'Z }`, you need to specify Z in the as attribute when eager loading Y).
     */
    include? : IInclude[],
    /** The maximum count you want to get. */
    limit? : number,
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
  }) : Promise<Model[]> {
    const association = this;
    const where = {};
    let targetModel = association.target;
    let instanceNoArray;
    let values;

    if (!Array.isArray(instances)) {
      instanceNoArray = instances;
      instances = undefined;
    }

    options = Utils.cloneDeep(options) || {};

    if (association.scope) {
      _.assign(where, association.scope);
    }

    if (instances) {
      values = (instances as any).map(instance => instance.get(association.sourceKey, {raw: true}));

      if (options.limit && (instances as any).length > 1) {
        options.groupedLimit = {
          limit: options.limit,
          on: association,
          values
        };

        delete options.limit;
      } else {
        where[association.foreignKey] = {
          [Op.in]: values
        };
        delete options.groupedLimit;
      }
    } else {
      where[association.foreignKey] = instanceNoArray.get(association.sourceKey, {raw: true});
    }


    options.where = options.where ?
      {[Op.and]: [where, options.where]} :
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
      for (const instance of (instances as any)) {
        result[instance.get(association.sourceKey, {raw: true})] = [];
      }

      for (const instance of results) {
        result[instance.get(association.foreignKey, {raw: true})].push(instance);
      }

      return result;
    });
  }

  /**
   * Count everything currently associated with this, using an optional where clause.
   */
  public count(instance : Model, options : {
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
    const association = this;
    const model = association.target;
    const sequelize = model.sequelize;

    options = Utils.cloneDeep(options);
    options.attributes = [
      [sequelize.fn('COUNT', sequelize.col(model.name.concat('.', model.primaryKeyField))), 'count'],
    ];
    options.raw = true;
    options.plain = true;

    return association.get(instance, options).then(result => parseInt((result as any).count, 10));
  }

  /**
   * Check if one or more rows are associated with `this`.
   * @param options Options passed to getAssociations
   */
  public has(sourceInstance : Model, targetInstances : Model[]|Model|string[]|string|number[]|number, options : {
    /** Transaction to run query under */
    transaction? : Transaction,
    /** A hash of search attributes. */
    where? : {}
  }) : Promise<any> {
    const association = this;
    const where = {};

    if (!Array.isArray(targetInstances)) {
      (targetInstances as any) = [targetInstances];
    }

    options = _.assign({}, options, {
      scope: false,
      raw: true
    });

    where[Op.or] = (targetInstances as any).map(instance => {
      if (instance instanceof association.target) {
        return instance.where();
      } else {
        const _where = {};
        _where[association.target.primaryKeyAttribute] = instance;
        return _where;
      }
    });

    options.where = {
      [Op.and]: [
        where,
        options.where,
      ]
    };

    return association.get(sourceInstance, options).then(associatedObjects => associatedObjects.length === (targetInstances as any).length);
  }

  /**
   * Set the associated models by passing an array of persisted instances or their primary keys. Everything that is not in the passed array will be un-associated
   *
   * @param newAssociations An array of persisted instances or primary key of instances to associate with this. Pass `null` or `undefined` to remove all associations.
   * @param options Options passed to `target.findAll` and `update`.
   */
  public set(sourceInstance : Model, targetInstances : Array<Model|string|number>, options : {
    /** Transaction to run query under */
    transaction? : Transaction,
    /** Run validation for the join model */
    validate? : {}
  }) : Promise<any> {
    const association = this;

    if (targetInstances === null) {
      targetInstances = [];
    } else {
      targetInstances = association.toInstanceArray(targetInstances);
    }

    return association.get(sourceInstance, _.defaults({scope: false, raw: true}, options)).then(oldAssociations => {
      const promises = [];
      const obsoleteAssociations = oldAssociations.filter(old =>
        !_.find(targetInstances, obj =>
          obj[association.target.primaryKeyAttribute] === old[association.target.primaryKeyAttribute]
        )
      );
      const unassociatedObjects = targetInstances.filter(obj =>
        !_.find(oldAssociations, old =>
          obj[association.target.primaryKeyAttribute] === old[association.target.primaryKeyAttribute]
        )
      );
      let updateWhere;
      let update;

      if (obsoleteAssociations.length > 0) {
        update = {};
        update[association.foreignKey] = null;

        updateWhere = {};

        updateWhere[association.target.primaryKeyAttribute] = obsoleteAssociations.map(associatedObject =>
          associatedObject[association.target.primaryKeyAttribute]
        );

        promises.push(association.target.unscoped().update(
          update,
          _.defaults({
            where: updateWhere
          }, options)
        ));
      }

      if (unassociatedObjects.length > 0) {
        updateWhere = {};

        update = {};
        update[association.foreignKey] = (sourceInstance as any).get(association.sourceKey);

        _.assign(update, association.scope);
        updateWhere[association.target.primaryKeyAttribute] = unassociatedObjects.map(unassociatedObject =>
          unassociatedObject[association.target.primaryKeyAttribute]
        );

        promises.push(association.target.unscoped().update(
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
   * @param {Model[]|Model|string[]|string|number[]|number} newAssociation(s)
   * @param options Options passed to `target.update`.
   */
  public add(sourceInstance : Model, targetInstances : Model[]|Model|string[]|string|number[]|number, options : {}) : Promise<any> {
    if (!targetInstances) {
      return Utils.Promise.resolve();
    }

    const association = this;
    const update = {};
    const where = {};

    options = options || {};

    targetInstances = association.toInstanceArray(targetInstances);

    update[association.foreignKey] = (sourceInstance as any).get(association.sourceKey);
    _.assign(update, association.scope);

    where[association.target.primaryKeyAttribute] = (targetInstances as any).map(unassociatedObject =>
      unassociatedObject.get(association.target.primaryKeyAttribute)
    );

    return association.target.unscoped().update(update, _.defaults({where}, options)).then( () => sourceInstance);
  }

  /**
   * Un-associate one or several target rows.
   *
   * @param {Model[]|Model|String[]|string|Number[]|number} [oldAssociatedInstance(s)]
   * @param options Options passed to `target.update`
   */
  public remove(sourceInstance : Model, targetInstances : Model[]|Model|string[]|string|number[]|number, options : {}) {
    const association = this;
    const update = {};
    const where = {};

    options = options || {};
    targetInstances = association.toInstanceArray(targetInstances);

    update[association.foreignKey] = null;

    where[association.foreignKey] = sourceInstance.get(association.sourceKey);
    where[association.target.primaryKeyAttribute] = (targetInstances as any).map(targetInstance =>
      targetInstance.get(association.target.primaryKeyAttribute)
    );

    return association.target.unscoped().update(update, _.defaults({where}, options)).then( () => this);
  }

  /**
   * Create a new instance of the associated model and associate it with this.
   * @param options Options passed to `target.create`.
   */
  public create(sourceInstance : Model, values, options : {
    fields? : string[],
    values? : {}
  }) : Promise<any> {
    const association = this;

    options = options || {};

    if (Array.isArray(options)) {
      options = {
        fields: options
      };
    }

    if (values === undefined) {
      values = {};
    }

    if (association.scope) {
      for (const attribute of Object.keys(association.scope)) {
        values[attribute] = association.scope[attribute];
        if (options.fields) {
          options.fields.push(attribute);
        }
      }
    }

    values[association.foreignKey] = sourceInstance.get(association.sourceKey);
    if (options.fields) {
      options.fields.push(association.foreignKey);
    }
    return association.target.create(values, options);
  }
}
