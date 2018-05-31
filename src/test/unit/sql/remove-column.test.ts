'use strict';

import Support from '../../support';
const expectsql      = Support.expectsql;
const current        = Support.sequelize;
const queryGenerator = current.dialect.QueryGenerator;

// Notice: [] will be replaced by dialect specific tick/quote character when there is not dialect specific expectation but only a default expectation

if (current.dialect.name !== 'sqlite') {
  describe(Support.getTestDialectTeaser('SQL'), () => {
    describe('removeColumn', () => {
      it('schema', () => {
        expectsql(queryGenerator.removeColumnQuery({
          schema: 'archive',
          tableName: 'user'
        }, 'email'), {
          mssql: 'ALTER TABLE [archive].[user] DROP COLUMN [email];',
          mysql: 'ALTER TABLE `archive.user` DROP `email`;',
          postgres: 'ALTER TABLE "archive"."user" DROP COLUMN "email";',
          oracle: 'ALTER TABLE "archive"."user" DROP COLUMN email'
        });
      });
    });
  });
}