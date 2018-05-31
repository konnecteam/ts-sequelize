import { AbstractQueryGenerator } from '../../lib/dialects/abstract/abstract-query-generator';

export class DummyQueryGenerator extends AbstractQueryGenerator {

  /**
   * Declaration void as main class is abstract
   */
  public quoteIdentifier() {}
  protected jsonPathExtractionQuery(column, path) {}
  public createSchema() {}
  public showSchemasQuery() {}
  public versionQuery() {}
  public attributesToSQL() {}
  public createTableQuery() {}
  public dropForeignKeyQuery() {}
  public showTablesQuery() {}
  public addColumnQuery() {}
  public removeColumnQuery() {}
  public changeColumnQuery() {}
  public renameColumnQuery() {}
  public showIndexesQuery() {}
  public getForeignKeysQuery() {}
  public removeIndexQuery() {}
  public showConstraintsQuery() {}
  public upsertQuery() {}
  public deleteQuery() {}
}
