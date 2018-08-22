export interface ISequelizeOption {
  /** = false, Pass query execution time in milliseconds as second argument to logging function (options.logging). */
  benchmark? : boolean;
  database? : string;
  databaseVersion? : number | string;
  /** = {}, Default options for model definitions. See sequelize.define for options */
  define? : {};
  /** The dialect of the database you are connecting to. One of mysql, postgres, sqlite, oracle and mssql. */
  dialect? : string;
  /** = null, If specified, load the dialect library from this path. For example, if you want to use pg.js instead of pg when connecting to a pg database, you should specify 'pg.js' here */
  dialectModulePath? : string;
  /** An object of additional options, which are passed directly to the connection library */
  dialectOptions? : any;
  foreignKeys? : boolean; // sqlite
  /** An object of hook function that are called before and after certain lifecycle events */
  hooks?;
  /** = 'localhost', The host of the relational database. */
  host? : string;
  isolationLevel? : string;
  keepDefaultTimezone? : any;
  /** A function that logs sql queries, or false for no logging */
  logging? : boolean | any;
  /** = false, A flag that defines if native library shall be used or not. Currently only has an effect for postgres */
  native? : boolean;
  /** = false, A flag that defines if null values should be passed to SQL queries or not. */
  omitNull? : boolean;
  /** = true, String based operator alias, default value is true which will enable all operators alias. Pass object to limit set of aliased operators or false to disable completely. */
  operatorsAliases? : boolean;
  password? : string;
  /** sequelize connection pool configuration */
  pool? : {};
  /** The port of the relational database. */
  port? : number;
  /** = 'tcp', The protocol of the relational database. */
  protocol? : string;
  query? : {};
  /** = true, Set to `false` to make table names and attributes case-insensitive on Postgres and skip double quoting of them.  WARNING: Setting this to false may expose vulnerabilities and is not recommended! */
  quoteIdentifiers? : boolean;
  /** = false, Use read / write replication. To enable replication, pass an object, with two properties, read and write. */
  replication? : {};
  /** Set of flags that control when a query is automatically retried. */
  retry? : {};
  /** The schema that the tables should be created in. This can be overriden for each table in sequelize.define */
  schema? : string;
  /** = DEFAULT An optional parameter to specify the schema search_path (Postgres only) */
  searchPath? : string;
  set? : any;
  showWarnings? : boolean;
  ssl? : boolean;
  storage? : any;
  /** = {}, Default options for sequelize.sync */
  sync? : {};
  /** The timezone used when converting a date from the database into a JavaScript date. */
  timezone? : string;
  transactionType? : string;
  typeValidation? : boolean;
  username? : string;
}
