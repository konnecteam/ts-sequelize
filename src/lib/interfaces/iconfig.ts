export interface IConfig {
  /** The name of the database */
  database? : string;
  /** = null, If specified, load the dialect library from this path. For example, if you want to use pg.js instead of pg when connecting to a pg database, you should specify 'pg.js' here */
  dialectModulePath? : string;
  /** An object of additional options, which are passed directly to the connection library */
  dialectOptions? : {
    domain? : string,
    debug?,
    fetchAsString?,
    instanceName? : string,
    maxRows?,
    mode?,
    stmtCacheSize?,
    bigNumberStrings? : boolean,
    supportBigNumbers? : boolean,
  };
  /** = 'localhost', The host of the relational database. */
  host? : string;
  keepDefaultTimezone? : boolean;
  /** = false, A flag that defines if native library shall be used or not. Currently only has an effect for postgres */
  native? : boolean;
  /** = null, The password which is used to authenticate against the database. */
  password? : string;
  /** sequelize connection pool configuration */
  pool? : {
    /** = 10000, The maximum time, in milliseconds, that pool will try to get connection before throwing error */
    acquire? : number,
    /** = 10000, The time interval, in milliseconds, for evicting stale connections. Set it to 0 to disable this feature. */
    evict? : number,
    /** = true, Controls if pool should handle connection disconnect automatically without throwing errors */
    handleDisconnects? : boolean,
    /**
     * = 10000, The maximum time, in milliseconds, that a connection can be idle before being released.
     * Use with combination of evict for proper working, for more details read https://github.com/coopernurse/node-pool/issues/178#issuecomment-327110870
     */
    idle? : number,
    /** = 5, Maximum number of connection in pool */
    max? : number,
    /** = 0, Minimum number of connection in pool */
    min? : number,
    Promise?,
    /** A function that validates a connection. Called with client. The default function checks that client is an object, and that its state is not disconnected */
    validate? : any
  };
  /** The port of the relational database. */
  port? : number;
  /** = 'tcp', The protocol of the relational database. */
  protocol? : string;
  /** = false, Use read / write replication. To enable replication, pass an object, with two properties, read and write. */
  replication? : {
    read?,
    write?
  };
  /** The schema that the tables should be created in. This can be overriden for each table in sequelize.define */
  schema? : string;
  ssl? : boolean;
  types?;
  user? : string;
  username? : string;

}

export interface IConfigMysql extends IConfig {
  flags? : string;
  /** The timezone used when converting a date from the database into a JavaScript date. */
  timezone? : string;
  typeCast? : string;
  bigNumberStrings? : boolean;
  supportBigNumbers? : boolean;
}

export interface IConfigOracle extends IConfig {
  connectString? : string;
  /** Authentification externe ? */
  externalAuth : any;
  stmtCacheSize? : number;
}
