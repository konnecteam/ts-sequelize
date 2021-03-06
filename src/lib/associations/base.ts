'use strict';
import { Sequelize } from '../..';
import * as Errors from '../errors/index';
import { Model } from '../model';
import { HasOne } from './has-one';
const AssociationError = Errors.AssociationError;


/**
 * Creating associations in sequelize is done by calling one of the belongsTo / hasOne / hasMany / belongsToMany functions on a model (the source), and providing another model as the first argument to the function (the target).
 *
 * * hasOne - adds a foreign key to the target and singular association mixins to the source.
 * * belongsTo - add a foreign key and singular association mixins to the source.
 * * hasMany - adds a foreign key to target and plural association mixins to the source.
 * * belongsToMany - creates an N:M association with a join table and adds plural association mixins to the source. The junction table is created with sourceId and targetId.
 *
 * Creating an association will add a foreign key constraint to the attributes. All associations use `CASCADE` on update and `SET NULL` on delete, except for n:m, which also uses `CASCADE` on delete.
 *
 * When creating associations, you can provide an alias, via the `as` option. This is useful if the same model is associated twice, or you want your association to be called something other than the name of the target model.
 *
 * As an example, consider the case where users have many pictures, one of which is their profile picture. All pictures have a `userId`, but in addition the user model also has a `profilePictureId`,
 * to be able to easily load the user's profile picture.
 *
 * ```js
 * User.hasMany(Picture)
 * User.belongsTo(Picture, { as: 'ProfilePicture', constraints: false })
 *
 * user.getPictures() // gets you all pictures
 * user.getProfilePicture() // gets you only the profile picture
 *
 * User.findAll({
 *   where: ...,
 *   include: [
 *     { model: Picture }, // load all pictures
 *     { model: Picture, as: 'ProfilePicture' }, // load the profile picture.
 *     // Notice that the spelling must be the exact same as the one in the association
 *   ]
 * })
 * ```
 * To get full control over the foreign key column added by sequelize, you can use the `foreignKey` option. It can either be a string, that specifies the name, or and object type definition,
 * equivalent to those passed to `sequelize.define`.
 *
 * ```js
 * User.hasMany(Picture, { foreignKey: 'uid' })
 * ```
 *
 * The foreign key column in Picture will now be called `uid` instead of the default `userId`.
 *
 * ```js
 * User.hasMany(Picture, {
 *   foreignKey: {
 *     name: 'uid',
 *     allowNull: false
 *   }
 * })
 * ```
 *
 * This specifies that the `uid` column cannot be null. In most cases this will already be covered by the foreign key constraints,
 * which sequelize creates automatically, but can be useful in case where the foreign keys are disabled, e.g. due to circular references (see `constraints: false` below).
 *
 * When fetching associated models, you can limit your query to only load some models. These queries are written in the same way as queries to `find`/`findAll`. To only get pictures in JPG, you can do:
 *
 * ```js
 * user.getPictures({
 *   where: {
 *     format: 'jpg'
 *   }
 * })
 * ```
 *
 * There are several ways to update and add new associations. Continuing with our example of users and pictures:
 * ```js
 * user.addPicture(p) // Add a single picture
 * user.setPictures([p1, p2]) // Associate user with ONLY these two picture, all other associations will be deleted
 * user.addPictures([p1, p2]) // Associate user with these two pictures, but don't touch any current associations
 * ```
 *
 * You don't have to pass in a complete object to the association functions, if your associated model has a single primary key:
 *
 * ```js
 * user.addPicture(req.query.pid) // Here pid is just an integer, representing the primary key of the picture
 * ```
 *
 * In the example above we have specified that a user belongs to his profile picture. Conceptually, this might not make sense, but since we want to add the foreign key to the user model this is the way to do it.
 *
 * Note how we also specified `constraints: false` for profile picture.
 * This is because we add a foreign key from user to picture (profilePictureId), and from picture to user (userId).
 * If we were to add foreign keys to both, it would create a cyclic dependency, and sequelize would not know which table to create first, since user depends on picture, and picture depends on user.
 * These kinds of problems are detected by sequelize before the models are synced to the database, and you will get an error along the lines of `Error: Cyclic dependency found.
 * 'users' is dependent of itself`. If you encounter this, you should either disable some constraints, or rethink your associations completely.
 */

export class Association {
  /**
   * contains the name of the accessors
   */
  public accessors : {
    get? : string,
    set? : string,
    addMultiple? : string,
    add? : string,
    create? : string,
    remove? : string,
    removeMultiple? : string,
    hasSingle? : string,
    hasAll? : string,
    count? : string
  };
  /**
   * type : string | { plural : string, singular : string }
   */
  public as : any;
  public associationAccessor : string;
  public associationType : string;
  public foreignIdentifier : string;
  public foreignIdentifierField : string;
  public foreignKey : string;
  public foreignKeyAttribute;
  public identifierField : string;
  public isAliased : boolean;
  public isMultiAssociation : boolean;
  public isSingleAssociation : boolean;
  public isSelfAssociation : boolean;
  public oneFromTarget : HasOne;
  public options : {
    /** : string | {}, assocation alias */
    as? : any,
    constraints? : boolean,
    createByBTM? : boolean,
    /** = {}, Define the default search scope to use for this model. Scopes have the same form as the options passed to find / findAll */
    defaultScope? : {},
    foreignKey? : string,
    /** = false If freezeTableName is true, sequelize will not try to alter the model name to get the table name. Otherwise, the model name will be pluralized */
    freezeTableName? : boolean,
    /** An object of hook function that are called before and after certain lifecycle events */
    hooks? : boolean,
    indexes? : any[],
    keyType? : string,
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
    scope? : any,
    scopes? : any[],
    sequelize? : Sequelize,
    sourceKey?
    /** Defaults to pluralized model name, unless freezeTableName is true, in which case it uses model name verbatim */
    tableName? : string,
    targetKey? : string,
    /** Additional attributes for the join table */
    through? : {
      model?
    },
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
  };
  public otherKey : string;
  public otherKeyDefault : boolean;
  public scope : {
    ismain? : boolean
  };
  public source : typeof Model;
  public sourceKeyAttribute;
  public sourceKeyField : string;
  public target : typeof Model;
  public through : {
    model?,
    unique? : boolean,
    scope?
  };
  public toTarget : Association;

  constructor(source : typeof Model, target : typeof Model, options : {
    /** : string | {}, assocation alias */
    as? : any,
    createByBTM? : boolean,
    /** = {}, Define the default search scope to use for this model. Scopes have the same form as the options passed to find / findAll */
    defaultScope? : {},
    foreignKey? : string,
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
    /** = false, Calling `destroy` will not delete the model, but instead set a `deletedAt` timestamp if this is true. Needs `timestamps=true` to work */
    paranoid? : boolean,
    /** Error if no result found */
    rejectOnEmpty? : boolean,
    /** The schema that the tables should be created in. This can be overriden for each table in sequelize.define */
    schema? : string,
    schemaDelimiter? : string,
    scope? : any,
    scopes? : any[],
    sequelize? : Sequelize,
    /** Additional attributes for the join table */
    through? : {
      model?
    },
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
  }) {
    options = options || {};
    this.source = source;
    this.target = target;
    this.options = options;
    this.scope = options.scope;
    this.isSelfAssociation = this.source === this.target;
    this.as = options.as;
    this.associationType = '';

    if (source.hasAlias(options.as)) {
      throw new AssociationError(`You have used the alias ${options.as} in two separate associations. ` +
      'Aliased associations must have unique aliases.'
      );
    }
  }

  /**
   * Normalize input - may be array or single obj, instance or primary key - convert it to an array of built objects
   */
  public toInstanceArray(objs : any) : any[] {
    if (!Array.isArray(objs)) {
      objs = [objs];
    }
    return objs.map(function(obj) {
      if (!(obj instanceof this.target)) {
        const tmpInstance = {};
        tmpInstance[this.target.primaryKeyAttribute] = obj;
        return this.target.build(tmpInstance, {
          isNewRecord: false
        });
      }
      return obj;
    }, this);
  }

  /**
   * return the alias of the association
   */
  public inspect() : any {
    return this.as;
  }
}
