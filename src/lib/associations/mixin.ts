'use strict';

import * as _ from 'lodash';
import { Sequelize  } from '../..';
import { DataSet } from '../data-set';
import { Hooks } from '../hooks';
import { Model } from '../model';
import { Utils } from '../utils';
import { Association } from './base';
import { BelongsTo } from './belongs-to';
import { BelongsToMany } from './belongs-to-many';
import { HasMany } from './has-many';
import { HasOne } from './has-one';


export class Mixin <TInstance extends DataSet<TAttributes>, TAttributes> extends Hooks {

  public name : any;

  /**
   * Create a new HasOne association between this model and the target
   */
  public hasOne<TTargetInstance extends DataSet<TTargetAttributes>, TTargetAttributes>(target? : Model<any, any>, options : {
    /** : string | {}, assocation alias */
    as? : any,
    constraints? : boolean,
    foreignKey? : any,
    foreignKeyConstraint? : boolean,
    /** An object of hook function that are called before and after certain lifecycle events */
    hooks? : boolean,
    keyType? : any,
    onDelete? : string,
    onUpdate? : string,
    scope? : {},
    sourceKey? : string,
    targetKey? : string,
    useHooks? : boolean,
  } = {}) : HasOne<TInstance, TAttributes, TTargetInstance, TTargetAttributes> { // testhint options:none
    if (!target || !(target instanceof Model)) {
      throw new Error(this.name + '.' + Utils.lowercaseFirst(HasOne.name) + ' called with something that\'s not a subclass of Sequelize.Model');
    }

    const source : Model<TInstance, TAttributes> = (this as any);

    // Since this is a mixin, we'll need a unique letiable name for hooks (since Model will override our hooks option)
    options.hooks = options.hooks === undefined ? false : Boolean(options.hooks);
    options.useHooks = options.hooks;

    // the id is in the foreign table
    const association = new HasOne<TInstance, TAttributes, TTargetInstance, TTargetAttributes>(source, target, _.extend(options, source.options));
    source.associations[association.associationAccessor] = association;

    association.injectAttributes();

    return association;
  }
  /**
   * Create a new BelongsTo association between this model and the target
   */
  public belongsTo<TTargetInstance extends DataSet<TTargetAttributes>, TTargetAttributes>(target? : Model<any, any>, options : {
    /** : string | {}, assocation alias */
    as? : any,
    constraints? : boolean,
    foreignKey? : any,
    foreignKeyConstraint? : boolean,
    /** An object of hook function that are called before and after certain lifecycle events */
    hooks? : boolean,
    joinTableName? : string,
    keyType? : any,
    onDelete? : string,
    onUpdate? : string,
    sourceKey? : string,
    targetKey? : string,
    useHooks? : boolean,
    useJunctionTable? : boolean,
  } = {}) : BelongsTo<TInstance, TAttributes, TTargetInstance, TTargetAttributes> { // testhint options:none
    if (!target || !(target instanceof Model)) {
      throw new Error(this.name + '.' + Utils.lowercaseFirst(BelongsTo.name) + ' called with something that\'s not a subclass of Sequelize.Model');
    }

    const source : Model<TInstance, TAttributes> = (this as any);

    // Since this is a mixin, we'll need a unique letiable name for hooks (since Model will override our hooks option)
    options.hooks = options.hooks === undefined ? false : Boolean(options.hooks);
    options.useHooks = options.hooks;

    // the id is in the foreign table
    const association = new BelongsTo<TInstance, TAttributes, TTargetInstance, TTargetAttributes>(source, target, _.extend(options, source.options));
    source.associations[association.associationAccessor] = association;

    association.injectAttributes();

    return association;
  }

  /**
   * Create a new HasMany association between this model and the target
   */
  public hasMany<TTargetInstance extends DataSet<TTargetAttributes>, TTargetAttributes>(target : Model<any, any>, options : {
    /** : string | {}, assocation alias */
    as? : any,
    constraints? : boolean,
    foreignKey? : string | {},
    foreignKeyConstraint? : boolean,
    /** An object of hook function that are called before and after certain lifecycle events */
    hooks? : boolean,
    joinTableName? : string,
    keyType? : any,
    onDelete? : string,
    onUpdate? : string,
    scope? : {},
    sourceKey? : string,
    useHooks? : boolean,
    useJunctionTable? : boolean,
  } = {}) : HasMany<TInstance, TAttributes, TTargetInstance, TTargetAttributes> { // testhint options:none
    if (!target || !(target instanceof Model)) {
      throw new Error(this.name + '.hasMany called with something that\'s not a subclass of Sequelize.Model');
    }

    const source : any = this;

    // Since this is a mixin, we'll need a unique letiable name for hooks (since Model will override our hooks option)
    options.hooks = options.hooks === undefined ? false : Boolean(options.hooks);
    options.useHooks = options.hooks;

    options = _.extend(options, _.omit(source.options, ['hooks']));

    // the id is in the foreign table or in a connecting table
    const association = new HasMany<TInstance, TAttributes, TTargetInstance, TTargetAttributes>(source, target, options);
    source.associations[association.associationAccessor] = association;

    association.injectAttributes();

    return association;
  }

  /**
   * Create a new BelongsToMany association between this model and the target
   */
  public belongsToMany<TTargetInstance extends DataSet<TTargetAttributes>, TTargetAttributes>(targetModel? : Model<any, any>, options : {
    /** : string | {}, assocation alias */
    as? : any,
    cascade? : string,
    constraints? : boolean,
    foreignKey? : string | {},
    /** An object of hook function that are called before and after certain lifecycle events */
    hooks? : boolean,
    onDelete? : string,
    onUpdate? : string,
    otherKey? : string | {},
    scope? : {},
    /** Additional attributes for the join table */
    through? : {},
    /** = true Adds createdAt and updatedAt timestamps to the model. */
    timestamps? : any,
    useHooks? : boolean,
  } = {}) : BelongsToMany<TInstance, TAttributes, TTargetInstance, TTargetAttributes> { // testhint options:none
    if (!targetModel || !(targetModel instanceof Model)) {
      throw new Error(this.name + '.belongsToMany called with something that\'s not a subclass of Sequelize.Model');
    }

    const sourceModel : Model<TInstance, TAttributes> = this as any;

    // Since this is a mixin, we'll need a unique letiable name for hooks (since Model will override our hooks option)
    options.hooks = options.hooks === undefined ? false : Boolean(options.hooks);
    options.useHooks = options.hooks;
    options.timestamps = options.timestamps === undefined ? (this as any).sequelize.options.timestamps : options.timestamps;
    options = _.extend(options, _.omit(sourceModel.options, ['hooks', 'timestamps', 'scopes', 'defaultScope']));

    // the id is in the foreign table or in a connecting table
    const association = new BelongsToMany<TInstance, TAttributes, TTargetInstance, TTargetAttributes>(sourceModel, targetModel, options);
    sourceModel.associations[association.associationAccessor] = association;

    association.injectAttributes();

    return association;
  }

  /**
   * get the associations between this Model and the target
   */
  public getAssociations<TTargetInstance extends DataSet<TTargetAttributes>, TTargetAttributes>(target : Model<TTargetInstance, TTargetAttributes>) : Array<Association<TInstance, TAttributes, TTargetInstance, TTargetAttributes>> {
    return _.values((this as any).associations).filter(association => association.target.name === target.name);
  }

  /**
   * get the association between this Model and the target with the alias passed in parameter
   */
  public getAssociationForAlias<TTargetInstance extends DataSet<TTargetAttributes>, TTargetAttributes>(target : Model<TTargetInstance, TTargetAttributes>, alias : string) : Association<TInstance, TAttributes, TTargetInstance, TTargetAttributes> {
    // Two associations cannot have the same alias, so we can use find instead of filter
    return this.getAssociations(target).find(association => this.verifyAssociationAlias(association, alias)) || null;
  }

  /**
   * return true if the association's alias is the same as the alias passed in parameter
   * or if there is no alias for this association and the alias passed in parameter is null
   */
  public verifyAssociationAlias(association : Association<TInstance, TAttributes, any, any>, alias : string) : boolean {
    if (alias) {
      return association.as === alias;
    } else {
      return !association.isAliased;
    }
  }

  public isModel(model : DataSet<TAttributes>, sequelize : Sequelize) : boolean {
    return model instanceof Model;
  }
}
