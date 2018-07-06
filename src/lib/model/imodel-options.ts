export interface IModelOptions {
  /** Override the name of the createdAt column if a string is provided, or disable it if false. Timestamps must be true. Not affected by underscored setting. */
  createdAt? : string | boolean;
  /** = {}, Define the default search scope to use for this model. Scopes have the same form as the options passed to find / findAll */
  defaultScope? : {};
  /** Override the name of the deletedAt column if a string is provided, or disable it if false. Timestamps must be true. Not affected by underscored setting. */
  deletedAt? : boolean | string;
  /** = false If freezeTableName is true, sequelize will not try to alter the model name to get the table name. Otherwise, the model name will be pluralized */
  freezeTableName? : boolean;
  hasTrigger? : boolean;
  /** An object of hook function that are called before and after certain lifecycle events */
  hooks? : {};
  indexes? : any[];
  /** An object with two attributes, `singular` and `plural`, which are used when this model is associated to others. */
  name? : {
    /** = Utils.pluralize(modelName) */
    plural? : string,
    /** = Utils.singularize(modelName) */
    singular? : string
  };
  /** = false, A flag that defines if null values should be passed to SQL queries or not. */
  omitNull? : boolean;
  /** = false, Calling `destroy` will not delete the model, but instead set a `deletedAt` timestamp if this is true. Needs `timestamps=true` to work */
  paranoid? : boolean;
  /** Error if no result found */
  rejectOnEmpty? : boolean;
  /** The schema that the tables should be created in. This can be overriden for each table in sequelize.define */
  schema? : string;
  schemaDelimiter? : string;
  scopes? : {};
  /** Defaults to pluralized model name, unless freezeTableName is true, in which case it uses model name verbatim */
  tableName? : string;
  /** = true Adds createdAt and updatedAt timestamps to the model. */
  timestamps? : boolean;
  /** = false Converts all camelCased columns to underscored if true. Will not affect timestamp fields named explicitly by model options and will not affect fields with explicitly set `field` option */
  underscored? : boolean;
  /** = false Converts camelCased model names to underscored table names if true. Will not change model name if freezeTableName is set to true */
  underscoredAll? : boolean;
  uniqueKeys? : {};
  updatedAt? : boolean;
  validate? : {};
  version? : string;
  whereCollection? : {};
}
