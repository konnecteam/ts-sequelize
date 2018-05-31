'use strict';

import Support from '../../support';
const expectsql      = Support.expectsql;
const current        = Support.sequelize;
const queryGenerator = current.dialect.QueryGenerator;

// Notice: [] will be replaced by dialect specific tick/quote character when there is not dialect specific expectation but only a default expectation

describe(Support.getTestDialectTeaser('SQL'), () => {
  describe('offset/limit', () => {

    it('order by tableRef.id limit 10', () => {
      const options = {
        limit: 10, //when no order by present, one is automagically prepended, test its existence
        model: {primaryKeyField: 'id', name: 'tableRef'}
      };
      const expectation = {
        default: ' LIMIT 10',
        oracle: ' ORDER BY tableRef.id OFFSET 0 ROWS FETCH NEXT 10 ROWS ONLY',
        mssql: ' ORDER BY [tableRef].[id] OFFSET 0 ROWS FETCH NEXT 10 ROWS ONLY'
      };
      expectsql(
        queryGenerator.addLimitAndOffset(
          options,
          options.model
        ),
        expectation
      );
    });

    it('order email desc limit 10', () => {
      const options = {
        limit: 10,
        order: [
          ['email', 'DESC'], // for MSSQL
        ],
        model: undefined
      };
      const expectation = {
        default: ' LIMIT 10',
        oracle: ' OFFSET 0 ROWS FETCH NEXT 10 ROWS ONLY',
        mssql: ' OFFSET 0 ROWS FETCH NEXT 10 ROWS ONLY'
      };
      expectsql(
        queryGenerator.addLimitAndOffset(
          options,
          options.model
        ),
        expectation
      );
    });

    it('order email desc limit 10 offset 20', () => {
      const options = {
        limit: 10,
        offset: 20,
        order: [
          ['email', 'DESC'], // for MSSQL
        ],
        model: undefined
      };
      const expectation = {
        default: ' LIMIT 20, 10',
        postgres: ' LIMIT 10 OFFSET 20',
        oracle: ' OFFSET 20 ROWS FETCH NEXT 10 ROWS ONLY',
        mssql: ' OFFSET 20 ROWS FETCH NEXT 10 ROWS ONLY'
      };
      expectsql(
        queryGenerator.addLimitAndOffset(
          options,
          options.model
        ),
        expectation
      );
    });

    it('Limit delete from user', () => {
      const options = {
        limit: "';DELETE FROM user",
        order: [
          ['email', 'DESC'], // for MSSQL
        ],
        model: undefined
      };
      const expectation = {
        default: " LIMIT ''';DELETE FROM user'",
        mysql: " LIMIT '\\';DELETE FROM user'",
        oracle: " OFFSET 0 ROWS FETCH NEXT ''';DELETE FROM user' ROWS ONLY",
        mssql: " OFFSET 0 ROWS FETCH NEXT N''';DELETE FROM user' ROWS ONLY"
      };
      expectsql(
        queryGenerator.addLimitAndOffset(
          options,
          options.model
        ),
        expectation
      );
    });

    it('Limit 10 offset delete from user', () => {
      const options = {
        limit: 10,
        offset: "';DELETE FROM user",
        order: [
          ['email', 'DESC'], // for MSSQL
        ],
        model: undefined
      };
      const expectation = {
        sqlite: " LIMIT ''';DELETE FROM user', 10",
        oracle: " OFFSET ''';DELETE FROM user' ROWS FETCH NEXT 10 ROWS ONLY",
        postgres: " LIMIT 10 OFFSET ''';DELETE FROM user'",
        mysql: " LIMIT '\\';DELETE FROM user', 10",
        mssql: " OFFSET N''';DELETE FROM user' ROWS FETCH NEXT 10 ROWS ONLY"
      };
      expectsql(
        queryGenerator.addLimitAndOffset(
          options,
          options.model
        ),
        expectation
      );
    });
  });
});
