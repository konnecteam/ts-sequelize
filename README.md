# ts-sequelize

[![npm version](https://img.shields.io/npm/v/ts-sequelize.svg)](https://www.npmjs.com/package/ts-sequelize)
[![Build Status](https://travis-ci.org/konnecteam/ts-sequelize.svg?)](https://travis-ci.org/konnecteam/ts-sequelize)
[![Windows Build status](https://ci.appveyor.com/api/projects/status/github/konnecteam/ts-sequelize?svg=true)](https://ci.appveyor.com/project/konnecteam/ts-sequelize)
[![codecov](https://codecov.io/gh/konnecteam/ts-sequelize/graph/badge.svg)](https://codecov.io/gh/konnecteam/ts-sequelize)
[![npm downloads](https://img.shields.io/npm/dm/ts-sequelize.svg?maxAge=2592000)](https://www.npmjs.com/package/ts-sequelize)
![node](https://img.shields.io/node/v/sequelize.svg)
[![License](https://img.shields.io/npm/l/sequelize.svg?maxAge=2592000?style=plastic)](https://github.com/konnecteam/ts-sequelize/blob/typescript/LICENSE)
[![semantic-release](https://img.shields.io/badge/%20%20%F0%9F%93%A6%F0%9F%9A%80-semantic--release-e10079.svg)](https://github.com/semantic-release/semantic-release)
[![Greenkeeper badge](https://badges.greenkeeper.io/sequelize/sequelize.svg)](https://greenkeeper.io/)

Improved version of Sequelize developed with typescript; based on Sequelize's V4 version.
Independant version, no links with Sequelize anymore


Sequelize is a promise-based Node.js ORM for Postgres, MySQL, SQLite and Microsoft SQL Server. It features solid transaction support, relations, read replication and more.

[Changelog](https://github.com/konnecteam/ts-sequelize/releases)

## Table of Contents
- [Installation](#installation)
- [Features](#features)
- [Responsible disclosure](#responsible-disclosure)
- [Documentation](#documentation)

## Installation

```bash
$ npm install --save ts-sequelize

# And one of the following:
$ npm install --save pg@6 pg-hstore # Note that `pg@7` is not supported yet
$ npm install --save mysql2
$ npm install --save sqlite3
$ npm install --save tedious # MSSQL
```

Sequelize follows [SEMVER](http://semver.org). Supports Node v4 and above to use ES6 features.

## Features

- Schema definition
- Schema synchronization/dropping
- 1:1, 1:M & N:M Associations
- Through models
- Promises
- Hooks/callbacks/lifecycle events
- Prefetching/association including
- Transactions
- Migrations
- CLI ([sequelize-cli](https://github.com/sequelize/cli))

## Responsible disclosure
If you have any security issue to report, contact project maintainers privately. You can find contact information [here](https://github.com/sequelize/sequelize/blob/master/CONTACT.md)

## Documentation

You can generate the documentation repository using "npm run docs" on the racine of the project
We accept all contributions to this project

### Tools
- [Add-ons & Plugins](https://github.com/sequelize/sequelize/wiki/Add-ons-&-Plugins)

### Learning
- [Getting Started](http://docs.sequelizejs.com/manual/installation/getting-started)
- [Express Example](https://github.com/sequelize/express-example)


### Translations
- [English v4](http://docs.sequelizejs.com) (OFFICIAL)
- [中文文档 v4](https://github.com/demopark/sequelize-docs-Zh-CN) (UNOFFICIAL)

