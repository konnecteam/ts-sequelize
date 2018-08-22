'use strict';

import { Sequelize } from '../..';
import { Model } from '../model';
import { Association } from './base';

export class Helpers {
  public static checkNamingCollision(association : Association<any, any, any, any>) : void {
    if (association.source.rawAttributes.hasOwnProperty(association.as)) {
      throw new Error(
        `Naming collision between attribute '${association.as}'` +
        ` and association '${association.as}' on model ${association.source.name}` +
        '. To remedy this, change either foreignKey or as in your association definition'
      );
    }
  }

  /**
   * Add a foreign key constraints to a Model
   */
  public static addForeignKeyConstraints(newAttribute : any, source : Model<any, any>, target : Model<any, any>, options : {
    /** : string | {}, assocation alias */
    as? : any,
    /** = {}, Define the default search scope to use for this model. Scopes have the same form as the options passed to find / findAll */
    defaultScope? : {},
    foreignKey? : string | {},
    foreignKeyConstraint? : string,
    /** = false If freezeTableName is true, sequelize will not try to alter the model name to get the table name. Otherwise, the model name will be pluralized */
    freezeTableName? : boolean,
    /** An object of hook function that are called before and after certain lifecycle events */
    hooks? : boolean,
    indexes? : any[],
    /** An object with two attributes, `singular` and `plural`, which are used when this model is associated to others. */
    name? : {
      /** = Utils.pluralize(modelName) */
      plural? : string,
      /** = Utils.singularize(modelName) */
      singular? : string
    },
    /** = false, A flag that defines if null values should be passed to SQL queries or not. */
    omitNull? : boolean,
    onDelete? : string,
    onUpdate? : string,
    otherKey? : string,
    /** = false, Calling `destroy` will not delete the model, but instead set a `deletedAt` timestamp if this is true. Needs `timestamps=true` to work */
    paranoid? : boolean,
    /** Error if no result found */
    rejectOnEmpty? : boolean,
    /** The schema that the tables should be created in. This can be overriden for each table in sequelize.define */
    schema? : string,
    schemaDelimiter? : string,
    scopes? : any[],
    sequelize? : Sequelize,
    /** = true Adds createdAt and updatedAt timestamps to the model. */
    timestamps? : boolean,
    /** = false Converts all camelCased columns to underscored if true. Will not affect timestamp fields named explicitly by model options and will not affect fields with explicitly set `field` option */
    underscored? : boolean,
    /** = false Converts camelCased model names to underscored table names if true. Will not change model name if freezeTableName is set to true */
    underscoredAll? : boolean,
    uniqueKeys? : {},
    useHooks? : boolean,
    validate? : {},
    whereCollection? : {}
  }, key? : string) {
    // FK constraints are opt-in: users must either set `foreignKeyConstraints`
    // on the association, or request an `onDelete` or `onUpdate` behaviour

    if (options.foreignKeyConstraint || options.onDelete || options.onUpdate) {

      // Find primary keys: composite keys not supported with this approach
      const primaryKeys = Object.keys(source.primaryKeys)
      .map(primaryKeyAttribute => source.rawAttributes[primaryKeyAttribute].field || primaryKeyAttribute);

      if (primaryKeys.length === 1) {
        if (source._schema) {
          newAttribute.references = {
            model: source.sequelize.getQueryInterface().QueryGenerator.addSchema({
              tableName: source.tableName,
              _schema: source._schema,
              _schemaDelimiter: source._schemaDelimiter
            })
          };
        } else {
          newAttribute.references = { model: source.tableName };
        }

        newAttribute.references.key = key || primaryKeys[0];
        newAttribute.onDelete = options.onDelete;
        newAttribute.onUpdate = options.onUpdate;
      }
    }
  }
}
