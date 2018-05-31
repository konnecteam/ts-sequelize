'use strict';

import DataTypes from '../../../lib/data-types';
import Support from '../support';

describe(Support.getTestDialectTeaser('IncludeAdvanced'), () => {
  describe('findAll', () => {

    it('[WA] BT->(outer  BT, outer BT) and where', function() {

      const Project = this.sequelize.define('project', { name: new DataTypes.STRING() });
      const Issue = this.sequelize.define('issue', { name: new DataTypes.STRING() });
      const IssueType = this.sequelize.define('issueType', { description: new DataTypes.TEXT() });
      const IssuePriority = this.sequelize.define('issuePriority', { description: new DataTypes.TEXT() });
      const IssueComment = this.sequelize.define('issueComment', { comment: new DataTypes.TEXT() });
      Project.hasOne(Issue);
      Issue.belongsTo(IssueType);
      Issue.belongsTo(IssuePriority);
      Issue.hasMany(IssueComment);

      return this.sequelize.sync({ force: true }).then(() => {
        return Project.findAll({
          limit : 5,
          include: [{
            model: Issue,
            required: true,
            where : {
              $or : [
                {
                  '$issue.issueType.id$' : null
                }, {
                  '$issue.issuePriority.id$' : null
                },
              ]
            },
            include: [{
              model: IssueType,
              required: false,
              mismatch: true
            }, {
              model: IssuePriority,
              required: false,
              mismatch: true
            }]
          }]
        });
      });
    });

    it('BT->(outer  BT, outer BT) and where', function() {

      const Project = this.sequelize.define('project', { name: new DataTypes.STRING() });
      const Issue = this.sequelize.define('issue', { name: new DataTypes.STRING() });
      const IssueType = this.sequelize.define('issueType', { description: new DataTypes.TEXT() });
      const IssuePriority = this.sequelize.define('issuePriority', { description: new DataTypes.TEXT() });
      const IssueComment = this.sequelize.define('issueComment', { comment: new DataTypes.TEXT() });
      Project.hasOne(Issue);
      Issue.belongsTo(IssueType);
      Issue.belongsTo(IssuePriority);
      Issue.hasMany(IssueComment);

      return this.sequelize.sync({ force: true }).then(() => {
        return Project.findAll({
          limit : 5,
          include: [{
            model: Issue,
            required: true,
            where : {
              $or : [
                {
                  '$issue.issueType.id$' : null
                }, {
                  '$issue.issuePriority.id$' : null
                },
              ]
            },
            include: [{
              attributes: [],
              model: IssueType,
              required: false,
              mismatch: true
            }, {
              attributes: [],
              model: IssuePriority,
              required: false,
              mismatch: true
            }]
          }]
        });
      });
    });

    it('BT->(inner HM, outer  BT[WA] , outer BT[WA]) and where', function() {

      const Project = this.sequelize.define('project', { name: new DataTypes.STRING() });
      const Issue = this.sequelize.define('issue', { name: new DataTypes.STRING() });
      const IssueType = this.sequelize.define('issueType', { description: new DataTypes.TEXT() });
      const IssuePriority = this.sequelize.define('issuePriority', { description: new DataTypes.TEXT() });
      const IssueComment = this.sequelize.define('issueComment', { comment: new DataTypes.TEXT() });
      Project.hasOne(Issue);
      Issue.belongsTo(IssueType);
      Issue.belongsTo(IssuePriority);
      Issue.hasMany(IssueComment);

      return this.sequelize.sync({ force: true }).then(() => {
        return Project.findAll({
          limit : 5,
          include: [{
            model: Issue,
            required: true,
            where : {
              $or : [
                {
                  '$issue.issueType.id$' : null
                }, {
                  '$issue.issuePriority.id$' : null
                },
              ]
            },
            include: [{
              attributes: [],
              model: IssueComment,
              required: true,
              mismatch: true
            }, {
              model: IssueType,
              required: false,
              mismatch: true
            }, {
              model: IssuePriority,
              required: false,
              mismatch: true
            }]
          }]
        });
      });
    });

    it('BT[WOA]->(inner HM, outer  BT[WA] , outer BT[WA]) and where', function() {

      const Project = this.sequelize.define('project', { name: new DataTypes.STRING() });
      const Issue = this.sequelize.define('issue', { name: new DataTypes.STRING() });
      const IssueType = this.sequelize.define('issueType', { description: new DataTypes.TEXT() });
      const IssuePriority = this.sequelize.define('issuePriority', { description: new DataTypes.TEXT() });
      const IssueComment = this.sequelize.define('issueComment', { comment: new DataTypes.TEXT() });
      Project.hasOne(Issue);
      Issue.belongsTo(IssueType);
      Issue.belongsTo(IssuePriority);
      Issue.hasMany(IssueComment);

      return this.sequelize.sync({ force: true }).then(() => {
        return Project.findAll({
          limit : 5,
          include: [{
            attributes: [],
            model: Issue,
            required: true,
            where : {
              $or : [
                {
                  '$issue.issueType.id$' : null
                }, {
                  '$issue.issuePriority.id$' : null
                },
              ]
            },
            include: [{
              attributes: [],
              model: IssueComment,
              required: true,
              mismatch: true
            }, {
              model: IssueType,
              required: false,
              mismatch: true
            }, {
              model: IssuePriority,
              required: false,
              mismatch: true
            }]
          }]
        });
      });
    });

    it('BT->(inner HM, outer  BT, outer BT) and where', function() {

      const Project = this.sequelize.define('project', { name: new DataTypes.STRING() });
      const Issue = this.sequelize.define('issue', { name: new DataTypes.STRING() });
      const IssueType = this.sequelize.define('issueType', { description: new DataTypes.TEXT() });
      const IssuePriority = this.sequelize.define('issuePriority', { description: new DataTypes.TEXT() });
      const IssueComment = this.sequelize.define('issueComment', { comment: new DataTypes.TEXT() });
      Project.hasOne(Issue);
      Issue.belongsTo(IssueType);
      Issue.belongsTo(IssuePriority);
      Issue.hasMany(IssueComment);

      return this.sequelize.sync({ force: true }).then(() => {
        return Project.findAll({
          limit : 5,
          include: [{
            model: Issue,
            required: true,
            where : {
              $or : [
                {
                  '$issue.issueType.id$' : null
                }, {
                  '$issue.issuePriority.id$' : null
                },
              ]
            },
            include: [{
              attributes: [],
              model: IssueComment,
              required: true,
              mismatch: true
            }, {
              attributes: [],
              model: IssueType,
              required: false,
              mismatch: true
            }, {
              attributes: [],
              model: IssuePriority,
              required: false,
              mismatch: true
            }]
          }]
        });
      });
    });

    it('BT->(outer HM, outer  BT, outer BT) and where', function() {
      const Project = this.sequelize.define('project', { name: new DataTypes.STRING() });
      const Issue = this.sequelize.define('issue', { name: new DataTypes.STRING() });
      const IssueType = this.sequelize.define('issueType', { description: new DataTypes.TEXT() });
      const IssuePriority = this.sequelize.define('issuePriority', { description: new DataTypes.TEXT() });
      const IssueComment = this.sequelize.define('issueComment', { comment: new DataTypes.TEXT() });
      Project.hasOne(Issue);
      Issue.belongsTo(IssueType);
      Issue.belongsTo(IssuePriority);
      Issue.hasMany(IssueComment);

      return this.sequelize.sync({ force: true }).then(() => {
        return Project.findAll({
          limit : 5,
          include: [{
            model: Issue,
            required: true,
            where : {
              $or : [ { '$issue.issueType.id$' : null }, { '$issue.issuePriority.id$' : null } ]
            },
            include: [{
              attributes: [], model: IssueComment, required: false, mismatch: true
            }, {
              attributes: [], model: IssueType, required: false, mismatch: true
            }, {
              attributes: [], model: IssuePriority, required: false, mismatch: true
            }]
          }]
        });
      });
    });

    it('BT->([WA]outer HM, outer  BT, outer BT) and where', function() {
      const Project = this.sequelize.define('project', { name: new DataTypes.STRING() });
      const Issue = this.sequelize.define('issue', { name: new DataTypes.STRING() });
      const IssueType = this.sequelize.define('issueType', { description: new DataTypes.TEXT() });
      const IssuePriority = this.sequelize.define('issuePriority', { description: new DataTypes.TEXT() });
      const IssueComment = this.sequelize.define('issueComment', { comment: new DataTypes.TEXT() });
      Project.hasOne(Issue);
      Issue.belongsTo(IssueType);
      Issue.belongsTo(IssuePriority);
      Issue.hasMany(IssueComment);

      return this.sequelize.sync({ force: true }).then(() => {
        return Project.findAll({
          limit : 5,
          include: [{
            model: Issue,
            required: true,
            where : {
              $or : [ { '$issue.issueType.id$' : null }, { '$issue.issuePriority.id$' : null } ]
            },
            include: [{
              model: IssueComment, required: false, mismatch: true
            }, {
              attributes: [], model: IssueType, required: false, mismatch: true
            }, {
              attributes: [], model: IssuePriority, required: false, mismatch: true
            }]
          }]
        });
      });
    });

    it('BT->([WA]outer HM, outer  BT, [WA]outer BT) and where', function() {
      const Project = this.sequelize.define('project', { name: new DataTypes.STRING() });
      const Issue = this.sequelize.define('issue', { name: new DataTypes.STRING() });
      const IssueType = this.sequelize.define('issueType', { description: new DataTypes.TEXT() });
      const IssuePriority = this.sequelize.define('issuePriority', { description: new DataTypes.TEXT() });
      const IssueComment = this.sequelize.define('issueComment', { comment: new DataTypes.TEXT() });
      Project.hasOne(Issue);
      Issue.belongsTo(IssueType);
      Issue.belongsTo(IssuePriority);
      Issue.hasMany(IssueComment);

      return this.sequelize.sync({ force: true }).then(() => {
        return Project.findAll({
          limit : 5,
          include: [{
            model: Issue,
            required: true,
            where : {
              $or : [ { '$issue.issueType.id$' : null }, { '$issue.issuePriority.id$' : null } ]
            },
            include: [{
              model: IssueComment, required: false, mismatch: true
            }, {
              attributes: [], model: IssueType, required: false, mismatch: true
            }, {
              model: IssuePriority, required: false, mismatch: true
            }]
          }]
        });
      });
    });
  });
});
