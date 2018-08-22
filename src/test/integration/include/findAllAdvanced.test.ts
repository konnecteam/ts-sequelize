'use strict';

import DataTypes from '../../../lib/data-types';
import { ItestAttribute, ItestInstance } from '../../dummy/dummy-data-set';
import Support from '../support';
const current = Support.sequelize;

describe(Support.getTestDialectTeaser('IncludeAdvanced'), () => {
  describe('findAll', () => {

    it('[WA] BT->(outer  BT, outer BT) and where', function() {

      const Project = current.define<ItestInstance, ItestAttribute>('project', { name: new DataTypes.STRING() });
      const Issue = current.define<ItestInstance, ItestAttribute>('issue', { name: new DataTypes.STRING() });
      const IssueType = current.define<ItestInstance, ItestAttribute>('issueType', { description: new DataTypes.TEXT() });
      const IssuePriority = current.define<ItestInstance, ItestAttribute>('issuePriority', { description: new DataTypes.TEXT() });
      const IssueComment = current.define<ItestInstance, ItestAttribute>('issueComment', { comment: new DataTypes.TEXT() });
      Project.hasOne(Issue);
      Issue.belongsTo(IssueType);
      Issue.belongsTo(IssuePriority);
      Issue.hasMany(IssueComment);

      return current.sync({ force: true }).then(() => {
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

      const Project = current.define<ItestInstance, ItestAttribute>('project', { name: new DataTypes.STRING() });
      const Issue = current.define<ItestInstance, ItestAttribute>('issue', { name: new DataTypes.STRING() });
      const IssueType = current.define<ItestInstance, ItestAttribute>('issueType', { description: new DataTypes.TEXT() });
      const IssuePriority = current.define<ItestInstance, ItestAttribute>('issuePriority', { description: new DataTypes.TEXT() });
      const IssueComment = current.define<ItestInstance, ItestAttribute>('issueComment', { comment: new DataTypes.TEXT() });
      Project.hasOne(Issue);
      Issue.belongsTo(IssueType);
      Issue.belongsTo(IssuePriority);
      Issue.hasMany(IssueComment);

      return current.sync({ force: true }).then(() => {
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

      const Project = current.define<ItestInstance, ItestAttribute>('project', { name: new DataTypes.STRING() });
      const Issue = current.define<ItestInstance, ItestAttribute>('issue', { name: new DataTypes.STRING() });
      const IssueType = current.define<ItestInstance, ItestAttribute>('issueType', { description: new DataTypes.TEXT() });
      const IssuePriority = current.define<ItestInstance, ItestAttribute>('issuePriority', { description: new DataTypes.TEXT() });
      const IssueComment = current.define<ItestInstance, ItestAttribute>('issueComment', { comment: new DataTypes.TEXT() });
      Project.hasOne(Issue);
      Issue.belongsTo(IssueType);
      Issue.belongsTo(IssuePriority);
      Issue.hasMany(IssueComment);

      return current.sync({ force: true }).then(() => {
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

      const Project = current.define<ItestInstance, ItestAttribute>('project', { name: new DataTypes.STRING() });
      const Issue = current.define<ItestInstance, ItestAttribute>('issue', { name: new DataTypes.STRING() });
      const IssueType = current.define<ItestInstance, ItestAttribute>('issueType', { description: new DataTypes.TEXT() });
      const IssuePriority = current.define<ItestInstance, ItestAttribute>('issuePriority', { description: new DataTypes.TEXT() });
      const IssueComment = current.define<ItestInstance, ItestAttribute>('issueComment', { comment: new DataTypes.TEXT() });
      Project.hasOne(Issue);
      Issue.belongsTo(IssueType);
      Issue.belongsTo(IssuePriority);
      Issue.hasMany(IssueComment);

      return current.sync({ force: true }).then(() => {
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

      const Project = current.define<ItestInstance, ItestAttribute>('project', { name: new DataTypes.STRING() });
      const Issue = current.define<ItestInstance, ItestAttribute>('issue', { name: new DataTypes.STRING() });
      const IssueType = current.define<ItestInstance, ItestAttribute>('issueType', { description: new DataTypes.TEXT() });
      const IssuePriority = current.define<ItestInstance, ItestAttribute>('issuePriority', { description: new DataTypes.TEXT() });
      const IssueComment = current.define<ItestInstance, ItestAttribute>('issueComment', { comment: new DataTypes.TEXT() });
      Project.hasOne(Issue);
      Issue.belongsTo(IssueType);
      Issue.belongsTo(IssuePriority);
      Issue.hasMany(IssueComment);

      return current.sync({ force: true }).then(() => {
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
      const Project = current.define<ItestInstance, ItestAttribute>('project', { name: new DataTypes.STRING() });
      const Issue = current.define<ItestInstance, ItestAttribute>('issue', { name: new DataTypes.STRING() });
      const IssueType = current.define<ItestInstance, ItestAttribute>('issueType', { description: new DataTypes.TEXT() });
      const IssuePriority = current.define<ItestInstance, ItestAttribute>('issuePriority', { description: new DataTypes.TEXT() });
      const IssueComment = current.define<ItestInstance, ItestAttribute>('issueComment', { comment: new DataTypes.TEXT() });
      Project.hasOne(Issue);
      Issue.belongsTo(IssueType);
      Issue.belongsTo(IssuePriority);
      Issue.hasMany(IssueComment);

      return current.sync({ force: true }).then(() => {
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
      const Project = current.define<ItestInstance, ItestAttribute>('project', { name: new DataTypes.STRING() });
      const Issue = current.define<ItestInstance, ItestAttribute>('issue', { name: new DataTypes.STRING() });
      const IssueType = current.define<ItestInstance, ItestAttribute>('issueType', { description: new DataTypes.TEXT() });
      const IssuePriority = current.define<ItestInstance, ItestAttribute>('issuePriority', { description: new DataTypes.TEXT() });
      const IssueComment = current.define<ItestInstance, ItestAttribute>('issueComment', { comment: new DataTypes.TEXT() });
      Project.hasOne(Issue);
      Issue.belongsTo(IssueType);
      Issue.belongsTo(IssuePriority);
      Issue.hasMany(IssueComment);

      return current.sync({ force: true }).then(() => {
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
      const Project = current.define<ItestInstance, ItestAttribute>('project', { name: new DataTypes.STRING() });
      const Issue = current.define<ItestInstance, ItestAttribute>('issue', { name: new DataTypes.STRING() });
      const IssueType = current.define<ItestInstance, ItestAttribute>('issueType', { description: new DataTypes.TEXT() });
      const IssuePriority = current.define<ItestInstance, ItestAttribute>('issuePriority', { description: new DataTypes.TEXT() });
      const IssueComment = current.define<ItestInstance, ItestAttribute>('issueComment', { comment: new DataTypes.TEXT() });
      Project.hasOne(Issue);
      Issue.belongsTo(IssueType);
      Issue.belongsTo(IssuePriority);
      Issue.hasMany(IssueComment);

      return current.sync({ force: true }).then(() => {
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
