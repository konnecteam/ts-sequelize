import { PostgresQueryGenerator } from './dialects/postgres/postgres-query-generator';

/**
 * A collection of properties related to deferrable constraints. It can be used to
 * make foreign key constraints deferrable and to set the constraints within a
 * transaction. This is only supported in PostgreSQL.
 *
 * The foreign keys can be configured like this. It will create a foreign key
 * that will check the constraints immediately when the data was inserted.
 *
 * ```js
 * sequelize.define('Model', {
 *   foreign_id: {
 *     type: Sequelize.INTEGER,
 *     references: {
 *       model: OtherModel,
 *       key: 'id',
 *       deferrable: Sequelize.Deferrable.InitiallyImmediate
 *     }
 *   }
 * });
 * ```
 *
 * The constraints can be configured in a transaction like this. It will
 * trigger a query once the transaction has been started and set the constraints
 * to be checked at the very end of the transaction.
 *
 * ```js
 * sequelize.transaction({
 *   deferrable: Sequelize.Deferrable.SetDeferred
 * });
 * ```
 *
 * @property InitiallyDeferred Defer constraints checks to the end of transactions.
 * @property InitiallyImmediate Trigger the constraint checks immediately
 * @property NOT Set the constraints to not deferred. This is the default in PostgreSQL and it make it impossible to dynamically defer the constraints within a transaction.
 * @property SetDeferred
 * @property SetImmediate
 */

export abstract class ABSTRACT {
  public toString() : string {
    return this.toSql.apply(this, arguments);
  }

  public abstract toSql(queryGenerator? : PostgresQueryGenerator) : string;
}

export class InitiallyDeferred extends ABSTRACT {
  public toSql() : string {
    return 'DEFERRABLE INITIALLY DEFERRED';
  }
}

export class InitiallyImmediate extends ABSTRACT {
  public toSql() : string {
    return 'DEFERRABLE INITIALLY IMMEDIATE';
  }
}

export class NOT extends ABSTRACT {
  public toSql() : string {
    return 'NOT DEFERRABLE';
  }
}

export class SetDeferred extends ABSTRACT {
  private constraints : any;
  constructor(constraints : any) {
    super();
    this.constraints = constraints;
  }
  public toSql(queryGenerator : PostgresQueryGenerator) : string {
    return queryGenerator.setDeferredQuery(this.constraints);
  }
}

export class SetImmediate extends ABSTRACT {
  private constraints : any;
  constructor(constraints : any) {
    super();
    this.constraints = constraints;
  }
  public toSql(queryGenerator : PostgresQueryGenerator) : string {
    return queryGenerator.setImmediateQuery(this.constraints);
  }
}
