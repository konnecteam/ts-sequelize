'use strict';

import * as path from 'path';

module.exports = {
  configFile: path.resolve('config', 'database.json'),
  migrationsPath: path.resolve('db', 'migrate')
};
