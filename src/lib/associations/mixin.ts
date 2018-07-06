'use strict';

import * as _ from 'lodash';
import { Sequelize } from '../..';
import { Model } from '../model';
import { Utils } from '../utils';
import { Association } from './base';
import { BelongsTo } from './belongs-to';
import { BelongsToMany } from './belongs-to-many';
import { HasMany } from './has-many';
import { HasOne } from './has-one';


export class Mixin {

  /**
   * The logic for hasOne and belongsTo is exactly the same
   * @hidden
   */
  private static singleLinked(Type : typeof HasOne | typeof BelongsTo) {
    return function(target, options : {
      /** : string | {}, assocation alias */
      as? : any,
      constraints? : boolean,
      foreignKey? : string,
      /** An object of hook function that are called before and after certain lifecycle events */
      hooks? : boolean,
      onDelete? : string,
      onUpdate? : string,
      useHooks? : boolean,
    } = {}) : BelongsTo | HasOne { // testhint options:none
      if (!target || !target.prototype || !(target.prototype instanceof this.sequelize.Model)) {
        throw new Error(this.name + '.' + Utils.lowercaseFirst(Type.name) + ' called with something that\'s not a subclass of Sequelize.Model');
      }

      const source = this;

      // Since this is a mixin, we'll need a unique letiable name for hooks (since Model will override our hooks option)
      options.hooks = options.hooks === undefined ? false : Boolean(options.hooks);
      options.useHooks = options.hooks;

      // the id is in the foreign table
      const association = new Type(source, target, _.extend(options, source.options));
      source.associations[association.associationAccessor] = association;

      association.injectAttributes();
      association.mixin(source.prototype);

      return association;
    };
  }

  /**
   * Create a new HasOne association between this model and the target
   */
  public static hasOne = Mixin.singleLinked(HasOne);
  /**
   * Create a new BelongsTo association between this model and the target
   */
  public static belongsTo = Mixin.singleLinked(BelongsTo);

  /**
   * Create a new HasMany association between this model and the target
   */
  public static hasMany(target : typeof Model, options : {
    /** : string | {}, assocation alias */
    as? : any,
    constraints? : boolean,
    foreignKey? : string,
    /** An object of hook function that are called before and after certain lifecycle events */
    hooks? : boolean,
    scope? : {}
    useHooks? : boolean,
  } = {}) : HasMany { // testhint options:none
    if (!target || !target.prototype || !(target.prototype instanceof (this as any).sequelize.Model)) {
      throw new Error(this.name + '.hasMany called with something that\'s not a subclass of Sequelize.Model');
    }

    const source : any = this;

    // Since this is a mixin, we'll need a unique letiable name for hooks (since Model will override our hooks option)
    options.hooks = options.hooks === undefined ? false : Boolean(options.hooks);
    options.useHooks = options.hooks;

    options = _.extend(options, _.omit(source.options, ['hooks']));

    // the id is in the foreign table or in a connecting table
    const association = new HasMany(source, target, options);
    source.associations[association.associationAccessor] = association;

    association.injectAttributes();
    association.mixin(source.prototype);

    return association;
  }

  /**
   * Create a new BelongsToMany association between this model and the target
   */
  public static belongsToMany(targetModel : typeof Model , options : {
    /** : string | {}, assocation alias */
    as? : any
    foreignKey? : string
    /** An object of hook function that are called before and after certain lifecycle events */
    hooks? : boolean,
    onDelete? : string,
    onUpdate? : string,
    otherKey? : string,
    /** Additional attributes for the join table */
    through? : {},
    /** = true Adds createdAt and updatedAt timestamps to the model. */
    timestamps? : any,
    useHooks? : boolean,
  } = {}) : BelongsToMany { // testhint options:none
    if (!targetModel || !targetModel.prototype || !(targetModel.prototype instanceof (this as any).sequelize.Model)) {
      throw new Error(this.name + '.belongsToMany called with something that\'s not a subclass of Sequelize.Model');
    }

    const sourceModel : any = this;

    // Since this is a mixin, we'll need a unique letiable name for hooks (since Model will override our hooks option)
    options.hooks = options.hooks === undefined ? false : Boolean(options.hooks);
    options.useHooks = options.hooks;
    options.timestamps = options.timestamps === undefined ? (this as any).sequelize.options.timestamps : options.timestamps;
    options = _.extend(options, _.omit(sourceModel.options, ['hooks', 'timestamps', 'scopes', 'defaultScope']));

    // the id is in the foreign table or in a connecting table
    const association = new BelongsToMany(sourceModel, targetModel, options);
    sourceModel.associations[association.associationAccessor] = association;

    association.injectAttributes();
    association.mixin(sourceModel.prototype);

    return association;
  }

  /**
   * get the associations between this Model and the target
   */
  public static getAssociations(target : typeof Model) {
    return _.values((this as any).associations).filter(association => association.target.name === target.name);
  }

  /**
   * get the association between this Model and the target with the alias passed in parameter
   */
  public static getAssociationForAlias(target : typeof Model, alias : string) {
    // Two associations cannot have the same alias, so we can use find instead of filter
    return this.getAssociations(target).find(association => this.verifyAssociationAlias(association, alias)) || null;
  }

  /**
   * return true if the association's alias is the same as the alias passed in parameter
   * or if there is no alias for this association and the alias passed in parameter is null
   */
  public static verifyAssociationAlias(association : Association, alias : string) {
    if (alias) {
      return association.as === alias;
    } else {
      return !association.isAliased;
    }
  }

  public isModel(model : typeof Model, sequelize : Sequelize) {
    return model
      && model.prototype
      && model.prototype instanceof sequelize.Model;
  }
}
