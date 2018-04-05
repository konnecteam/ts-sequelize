'use strict';

const Support        = require(__dirname + '/../support');
const DataTypes      = require(__dirname + '/../../../lib/data-types');
const Sequelize      = require(__dirname + '/../../../lib/sequelize');
const util           = require('util');
const _              = require('lodash');
const expectsql      = Support.expectsql;
const current        = Support.sequelize;
const queryGenerator = current.dialect.QueryGenerator;

// Notice: [] will be replaced by dialect specific tick/quote character when there is not dialect specific expectation but only a default expectation

describe(Support.getTestDialectTeaser('SQL'), () => {
  describe('generateJoin', () => {
    const User = current.define('User', {
      id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true,
        field: 'id_user'
      },
      companyId: {
        type: DataTypes.INTEGER,
        field: 'company_id'
      }
    }, {
      tableName: 'user'
    });
    const Task = current.define('Task', {
      title: Sequelize.STRING,
      userId: {
        type: DataTypes.INTEGER,
        field: 'user_id'
      }
    }, {
      tableName: 'task'
    });

    const Company = current.define('Company', {
      name: Sequelize.STRING,
      ownerId: {
        type: Sequelize.INTEGER,
        field: 'owner_id'
      },
      public: {
        type: Sequelize.BOOLEAN
      }
    }, {
      tableName: 'company'
    });

    const Profession = current.define('Profession', {
      name: Sequelize.STRING
    }, {
      tableName: 'profession'
    });

    User.Tasks = User.hasMany(Task, {as: 'Tasks', foreignKey: 'userId'});
    User.Company = User.belongsTo(Company, {foreignKey: 'companyId'});
    User.Profession = User.belongsTo(Profession, {foreignKey: 'professionId'});
    Profession.Professionals = Profession.hasMany(User, {as: 'Professionals', foreignKey: 'professionId'});
    Company.Employees = Company.hasMany(User, {as: 'Employees', foreignKey: 'companyId'});
    Company.Owner = Company.belongsTo(User, {as: 'Owner', foreignKey: 'ownerId'});


    const preparesql = function(path, options) {
    
      Sequelize.Model._conformOptions(options);
      options = Sequelize.Model._validateIncludedElements(options);
  
      const include = _.at(options, path)[0];

      const join = queryGenerator.generateJoin(include,
        {
          options,
          subQuery: options.subQuery === undefined ? options.limit && options.hasMultiAssociation : options.subQuery
        }
      );
      return join;
    };

    /*
     * BelongsTo
     */
    it('User => Company', () => {

      const options = {
        model: User,
        include: [
          User.Company
        ]
      };

      const join = preparesql('include[0]', options);

      const expectation = {
        default: 'LEFT OUTER JOIN [company] AS [Company] ON [User].[company_id] = [Company].[id]',
        oracle: 'LEFT OUTER JOIN company Company ON "User".company_id = Company.id'
      };

      expectsql(`${join.join} ${join.body} ON ${join.condition}`, expectation);
    });

    it('User => Company or (Company.public = true)', () => {

      const options = {
        model: User,
        include: [
          {
            association: User.Company,
            where: { public: true },
            or: true
          }
        ]
      };

      const join = preparesql('include[0]', options);

      const expectation = {
        default: 'INNER JOIN [company] AS [Company] ON [User].[company_id] = [Company].[id] OR [Company].[public] = true',
        sqlite: 'INNER JOIN `company` AS `Company` ON `User`.`company_id` = `Company`.`id` OR `Company`.`public` = 1',
        mssql: 'INNER JOIN [company] AS [Company] ON [User].[company_id] = [Company].[id] OR [Company].[public] = 1',
        oracle: 'INNER JOIN company Company ON "User".company_id = Company.id OR Company."public" = 1'
      };

      expectsql(`${join.join} ${join.body} ON ${join.condition}`, expectation);
    });

    it('Profession => Company limit 3', () => {

      const options = {
        model: Profession,
        include: [
          {
            association: Profession.Professionals,
            limit: 3,
            include: [
              User.Company
            ]
          }
        ]
      };

      const join = preparesql('include[0].include[0]', options);

      const expectation = {
        default: 'LEFT OUTER JOIN [company] AS [Professionals->Company] ON [Professionals].[company_id] = [Professionals->Company].[id]',
        oracle: 'LEFT OUTER JOIN company "Professionals->Company" ON Professionals.company_id = "Professionals->Company".id'
      };

      expectsql(`${join.join} ${join.body} ON ${join.condition}`, expectation);
    });

    it('User => Company  (subQuery = true)', () => {

      const options = {
        model: User,
        subQuery: true,
        include: [
          User.Company
        ]
      };

      const join = preparesql('include[0]', options);

      const expectation = {
        default: 'LEFT OUTER JOIN [company] AS [Company] ON [User].[companyId] = [Company].[id]',
        oracle: 'LEFT OUTER JOIN company Company ON "User".companyId = Company.id'
      };

      expectsql(`${join.join} ${join.body} ON ${join.condition}`, expectation);
    });

    it('User => Company and (Company.name = "ABC")', () => {

      const options = {
        model: User,
        subQuery: true,
        include: [
          {
            association: User.Company, required: false, where: { name: 'ABC' }
          }
        ]
      };

      const join = preparesql('include[0]', options);

      const expectation = {
        default: "LEFT OUTER JOIN [company] AS [Company] ON [User].[companyId] = [Company].[id] AND [Company].[name] = 'ABC'",
        oracle: "LEFT OUTER JOIN company Company ON \"User\".companyId = Company.id AND Company.name = 'ABC'",
        mssql: "LEFT OUTER JOIN [company] AS [Company] ON [User].[companyId] = [Company].[id] AND [Company].[name] = N'ABC'"
      };

      expectsql(`${join.join} ${join.body} ON ${join.condition}`, expectation);
    });

    it('User => Company => owner', () => {

      const options = {
        subQuery: true,
        model: User,
        include: [
          {
            association: User.Company, include: [
              Company.Owner
            ]
          }
        ]
      };

      const join = preparesql('include[0].include[0]', options);

      const expectation = {
        default: 'LEFT OUTER JOIN [user] AS [Company->Owner] ON [Company].[owner_id] = [Company->Owner].[id_user]',
        oracle: 'LEFT OUTER JOIN "user" "Company->Owner" ON Company.owner_id = "Company->Owner".id_user'
      };

      expectsql(`${join.join} ${join.body} ON ${join.condition}`, expectation);
    });

    it('User => Company => Owner => Profession', () => {

      const options = {
        model: User,
        subQuery: true,
        include: [
          {
            association: User.Company,
            include: [{
              association: Company.Owner,
              include: [
                User.Profession
              ]
            }]
          }
        ]
      };

      const join = preparesql('include[0].include[0].include[0]', options);

      const expectation = { 
        default: 'LEFT OUTER JOIN [profession] AS [Company->Owner->Profession] ON [Company->Owner].[professionId] = [Company->Owner->Profession].[id]',
        oracle: 'LEFT OUTER JOIN profession "Company->Owner->Profession" ON "Company->Owner".professionId = "Company->Owner->Profession".id' 
      };

      expectsql(`${join.join} ${join.body} ON ${join.condition}`, expectation);
    });

    it('User => Company => Owner', () => {

      const options = {
        model: User,
        subQuery: true,
        include: [
          {
            association: User.Company,
            required: true,
            include: [
              Company.Owner
            ]
          }
        ]
      };

      const join = preparesql('include[0].include[0]', options);

      const expectation = { 
        default: 'LEFT OUTER JOIN [user] AS [Company->Owner] ON [Company].[owner_id] = [Company->Owner].[id_user]',
        oracle: 'LEFT OUTER JOIN "user" "Company->Owner" ON Company.owner_id = "Company->Owner".id_user' 
      };

      expectsql(`${join.join} ${join.body} ON ${join.condition}`, expectation);
    });

    it('User => Company required: true', () => {

      const options = {
        model: User,
        subQuery: true,
        include: [
          { association: User.Company, required: true }
        ]
      };

      const join = preparesql('include[0]', options);

      const expectation = { 
        default: 'INNER JOIN [company] AS [Company] ON [User].[companyId] = [Company].[id]',
        oracle: 'INNER JOIN company Company ON "User".companyId = Company.id'
      };

      expectsql(`${join.join} ${join.body} ON ${join.condition}`, expectation);
    });

    // /*
    //  * HasMany
    //  */

    it('User => Task', () => {

      const options = {
        model: User,
        include: [
          User.Tasks
        ]
      };

      const join = preparesql('include[0]', options);

      const expectation = { 
        default: 'LEFT OUTER JOIN [task] AS [Tasks] ON [User].[id_user] = [Tasks].[user_id]',
        oracle: 'LEFT OUTER JOIN task Tasks ON "User".id_user = Tasks.user_id' 
      };

      expectsql(`${join.join} ${join.body} ON ${join.condition}`, expectation);
    });

    it('User => Task required: true', () => {

      const options = {
        model: User,
        subQuery: true,
        include: [
          User.Tasks
        ]
      };

      const join = preparesql('include[0]', options);

      const expectation = {
        // The primary key of the main model will be aliased because it's coming from a subquery that the :M join is not a part of
        default: 'LEFT OUTER JOIN [task] AS [Tasks] ON [User].[id] = [Tasks].[user_id]',
        oracle: 'LEFT OUTER JOIN task Tasks ON "User".id = Tasks.user_id'
      };

      expectsql(`${join.join} ${join.body} ON ${join.condition}`, expectation);
    });

    it('User => Task or (Task = 2)', () => {

      const options = {
        model: User,
        include: [
          {
            association: User.Tasks, on: {
              $or: [
                { '$User.id_user$': { $col: 'Tasks.user_id' } },
                { '$Tasks.user_id$': 2 }
              ]
            }
          }
        ]
      };

      const join = preparesql('include[0]', options);

      const expectation = { 
        default: 'LEFT OUTER JOIN [task] AS [Tasks] ON ([User].[id_user] = [Tasks].[user_id] OR [Tasks].[user_id] = 2)',
        oracle: 'LEFT OUTER JOIN task Tasks ON ("User".id_user = Tasks.user_id OR Tasks.user_id = 2)'
      };

      expectsql(`${join.join} ${join.body} ON ${join.condition}`, expectation);
    });

    it('User => Task (user_id : User.alternative_id)', () => {

      const options = {
        model: User,
        include: [
          {
            association: User.Tasks,
            on: { 'user_id': { $col: 'User.alternative_id' } }
          }
        ]
      };

      const join = preparesql('include[0]', options);

      const expectation = { 
        default: 'LEFT OUTER JOIN [task] AS [Tasks] ON [Tasks].[user_id] = [User].[alternative_id]',
        oracle: 'LEFT OUTER JOIN task Tasks ON Tasks.user_id = "User".alternative_id'
      };

      expectsql(`${join.join} ${join.body} ON ${join.condition}`, expectation);
    });

    it('User => Company => Owner or (Company.Owner.id_user = 2)', () => {

      const options = {
        subQuery: true,
        model: User,
        include: [
          {
            association: User.Company,
            include: [
              {
                association: Company.Owner,
                on: {
                  $or: [
                    { '$Company.owner_id$': { $col: 'Company.Owner.id_user'} },
                    { '$Company.Owner.id_user$': 2 }
                  ]
                }
              }
            ]
          }
        ]
      };

      const join = preparesql('include[0].include[0]', options);

      const expectation = {
        default: 'LEFT OUTER JOIN [user] AS [Company->Owner] ON ([Company].[owner_id] = [Company->Owner].[id_user] OR [Company->Owner].[id_user] = 2)',
        oracle: 'LEFT OUTER JOIN "user" "Company->Owner" ON (Company.owner_id = "Company->Owner".id_user OR "Company->Owner".id_user = 2)'
      };

      expectsql(`${join.join} ${join.body} ON ${join.condition}`, expectation);
    });
  });
});
