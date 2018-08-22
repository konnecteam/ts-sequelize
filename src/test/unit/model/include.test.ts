'use strict';

import * as chai from 'chai';
import { Model, Sequelize } from '../../../index';
import { BelongsTo } from '../../../lib/associations/belongs-to';
import { HasMany } from '../../../lib/associations/has-many';
import DataTypes from '../../../lib/data-types';
import { ItestAttribute, ItestInstance } from '../../dummy/dummy-data-set';
import Support from '../../support';
const expect = chai.expect;

const current = Support.sequelize;

describe(Support.getTestDialectTeaser('Model'), () => {
  let User : Model<ItestInstance, ItestAttribute>;
  let Task : Model<ItestInstance, ItestAttribute>;
  let Company : Model<ItestInstance, ItestAttribute>;
  let Project : Model<ItestInstance, ItestAttribute>;
  let User_Tasks : HasMany<ItestInstance, ItestAttribute, any, any>;
  let User_Company : BelongsTo<ItestInstance, ItestAttribute, any, any>;
  let Company_Employees : HasMany<ItestInstance, ItestAttribute, any, any>;
  let Company_Owner : BelongsTo<ItestInstance, ItestAttribute, any, any>;

  describe('all', () => {

    const Referral = current.define<ItestInstance, ItestAttribute>('referal');

    Referral.belongsTo(Referral);

    it('can expand nested self-reference', () => {
      const options = { include: [{ all: true, nested: true }] };

      current.Model.prototype._expandIncludeAll.call(Referral, options);

      expect(options.include).to.deep.equal([
        { model: Referral },
      ]);
    });
  });

  describe('_validateIncludedElements', () => {
    beforeEach(function() {
      User = current.define<ItestInstance, ItestAttribute>('User');
      Task = current.define<ItestInstance, ItestAttribute>('Task', {
        title: new DataTypes.STRING()
      });
      Company = current.define<ItestInstance, ItestAttribute>('Company', {
        id: {
          type: new DataTypes.STRING(),
          primaryKey: true,
          autoIncrement: true,
          field: 'field_id'
        },
        name: new DataTypes.STRING()
      });

      User_Tasks = User.hasMany(Task);
      User_Company = User.belongsTo(Company);
      Company_Employees = Company.hasMany(User);
      Company_Owner = Company.belongsTo(User, {as: 'Owner', foreignKey: 'ownerId'});
    });

    describe('attributes', () => {
      it('should not inject the aliased PK again, if it\'s already there', function() {
        let options = Sequelize.Model.prototype._validateIncludedElements({
          model: User,
          include: [
            {
              model: Company,
              attributes: ['name']
            },
          ]
        });

        expect(options.include[0].attributes).to.deep.equal([['field_id', 'id'], 'name']);

        options = Sequelize.Model.prototype._validateIncludedElements(options);

        // Calling validate again shouldn't add the pk again
        expect(options.include[0].attributes).to.deep.equal([['field_id', 'id'], 'name']);
      });

      describe('include / exclude', () => {
        it('allows me to include additional attributes', function() {
          const options = Sequelize.Model.prototype._validateIncludedElements({
            model: User,
            include: [
              {
                model: Company,
                attributes: {
                  include: ['foobar']
                }
              },
            ]
          });

          expect(options.include[0].attributes).to.deep.equal([
            'foobar',
            ['field_id', 'id'],
            'name',
            'createdAt',
            'updatedAt',
            'ownerId',
          ]);
        });

        it('allows me to exclude attributes', function() {
          const options = Sequelize.Model.prototype._validateIncludedElements({
            model: User,
            include: [
              {
                model: Company,
                attributes: {
                  exclude: ['name']
                }
              },
            ]
          });

          expect(options.include[0].attributes).to.deep.equal([
            ['field_id', 'id'],
            'createdAt',
            'updatedAt',
            'ownerId',
          ]);
        });

        it('include takes precendence over exclude', function() {
          const options = Sequelize.Model.prototype._validateIncludedElements({
            model: User,
            include: [
              {
                model: Company,
                attributes: {
                  exclude: ['name'],
                  include: ['name']
                }
              },
            ]
          });

          expect(options.include[0].attributes).to.deep.equal([
            'name',
            ['field_id', 'id'],
            'createdAt',
            'updatedAt',
            'ownerId',
          ]);
        });
      });
    });

    describe('scope', () => {
      beforeEach(function() {
        Project = current.define<ItestInstance, ItestAttribute>('project', {
          bar: {
            type: new DataTypes.STRING(),
            field: 'foo'
          }
        }, {
          defaultScope: {
            where: {
              active: true
            }
          }, scopes: {
            this: {
              where: { this: true}
            },
            that: {
              where: { that: false },
              limit: 12
            },
            attr: {
              attributes: ['baz']
            },
            foobar: {
              where: {
                bar: 42
              }
            }
          }
        });

        User.hasMany(Project);

        User.hasMany(Project.scope('this'), { as: 'thisProject' });
      });

      it('adds the default scope to where', function() {
        const options = Sequelize.Model.prototype._validateIncludedElements({
          model: User,
          include: [{ model: Project }]
        });

        expect(options.include[0]).to.have.property('where').which.deep.equals({ active: true });
      });

      it('adds the where from a scoped model', function() {
        const options = Sequelize.Model.prototype._validateIncludedElements({
          model: User,
          include: [{ model: Project.scope('that') }]
        });

        expect(options.include[0]).to.have.property('where').which.deep.equals({ that: false });
        expect(options.include[0]).to.have.property('limit').which.equals(12);
      });

      it('adds the attributes from a scoped model', function() {
        const options = Sequelize.Model.prototype._validateIncludedElements({
          model: User,
          include: [{ model: Project.scope('attr') }]
        });

        expect(options.include[0]).to.have.property('attributes').which.deep.equals(['baz']);
      });

      it('merges where with the where from a scoped model', function() {
        const options = Sequelize.Model.prototype._validateIncludedElements({
          model: User,
          include: [{ where: { active: false }, model: Project.scope('that') }]
        });

        expect(options.include[0]).to.have.property('where').which.deep.equals({ active: false, that: false });
      });

      it('add the where from a scoped associated model', function() {
        const options = Sequelize.Model.prototype._validateIncludedElements({
          model: User,
          include: [{ model: Project, as: 'thisProject' }]
        });

        expect(options.include[0]).to.have.property('where').which.deep.equals({ this: true });
      });

      it('handles a scope with an aliased column (.field)', function() {
        const options = Sequelize.Model.prototype._validateIncludedElements({
          model: User,
          include: [{ model: Project.scope('foobar') }]
        });

        expect(options.include[0]).to.have.property('where').which.deep.equals({ foo: 42 });
      });
    });

    describe('duplicating', () => {
      it('should tag a hasMany association as duplicating: true if undefined', function() {
        const options = Sequelize.Model.prototype._validateIncludedElements({
          model: User,
          include: [
            User_Tasks,
          ]
        });

        expect(options.include[0].duplicating).to.equal(true);
      });

      it('should respect include.duplicating for a hasMany', function() {
        const options = Sequelize.Model.prototype._validateIncludedElements({
          model: User,
          include: [
            {association: User_Tasks, duplicating: false},
          ]
        });

        expect(options.include[0].duplicating).to.equal(false);
      });
    });

    describe('_conformInclude: string alias', () => {
      it('should expand association from string alias', function() {
        const options = {
          include: ['Owner']
        };
        Sequelize.Model.prototype.conformOptions(options, Company);

        expect(options.include[0]).to.deep.equal({
          model: User,
          association: Company_Owner,
          as: 'Owner'
        });
      });

      it('should expand string association', function() {
        const options = {
          include: [{
            association: 'Owner',
            attributes: ['id']
          }]
        };
        Sequelize.Model.prototype.conformOptions(options, Company);

        expect(options.include[0]).to.deep.equal({
          model: User,
          association: Company_Owner,
          attributes: ['id'],
          as: 'Owner'
        });
      });
    });

    describe('_getIncludedAssociation', () => {
      it('returns an association when there is a single unaliased association', function() {
        expect(User._getIncludedAssociation(Task)).to.equal(User_Tasks);
      });

      it('returns an association when there is a single aliased association', function() {
        User = current.define<ItestInstance, ItestAttribute>('User');
        Task = current.define<ItestInstance, ItestAttribute>('Task');
        const Tasks = Task.belongsTo(User, {as: 'owner'});
        expect(Task._getIncludedAssociation(User, 'owner')).to.equal(Tasks);
      });

      it('returns an association when there are multiple aliased associations', function() {
        expect(Company._getIncludedAssociation(User, 'Owner')).to.equal(Company_Owner);
      });
    });

    describe('subQuery', () => {
      it('should be true if theres a duplicating association', function() {
        const options = Sequelize.Model.prototype._validateIncludedElements({
          model: User,
          include: [
            {association: User_Tasks},
          ],
          limit: 3
        });

        expect(options.subQuery).to.equal(true);
      });

      it('should be false if theres a duplicating association but no limit', function() {
        const options = Sequelize.Model.prototype._validateIncludedElements({
          model: User,
          include: [
            {association: User_Tasks},
          ],
          limit: null
        });

        expect(options.subQuery).to.equal(false);
      });

      it('should be true if theres a nested duplicating association', function() {
        const options = Sequelize.Model.prototype._validateIncludedElements({
          model: User,
          include: [
            {association: User_Company, include: [
              Company_Employees,
            ]},
          ],
          limit: 3
        });

        expect(options.subQuery).to.equal(true);
      });

      it('should be false if theres a nested duplicating association but no limit', function() {
        const options = Sequelize.Model.prototype._validateIncludedElements({
          model: User,
          include: [
            {association: User_Company, include: [
              Company_Employees,
            ]},
          ],
          limit: null
        });

        expect(options.subQuery).to.equal(false);
      });

      it('should tag a required hasMany association', function() {
        const options = Sequelize.Model.prototype._validateIncludedElements({
          model: User,
          include: [
            {association: User_Tasks, required: true},
          ],
          limit: 3
        });

        expect(options.subQuery).to.equal(true);
        expect(options.include[0].subQuery).to.equal(false);
        expect(options.include[0].subQueryFilter).to.equal(true);
      });

      it('should not tag a required hasMany association with duplicating false', function() {
        const options = Sequelize.Model.prototype._validateIncludedElements({
          model: User,
          include: [
            {association: User_Tasks, required: true, duplicating: false},
          ],
          limit: 3
        });

        expect(options.subQuery).to.equal(false);
        expect(options.include[0].subQuery).to.equal(false);
        expect(options.include[0].subQueryFilter).to.equal(false);
      });

      it('should tag a hasMany association with where', function() {
        const options = Sequelize.Model.prototype._validateIncludedElements({
          model: User,
          include: [
            {association: User_Tasks, where: {title: Math.random().toString()}},
          ],
          limit: 3
        });

        expect(options.subQuery).to.equal(true);
        expect(options.include[0].subQuery).to.equal(false);
        expect(options.include[0].subQueryFilter).to.equal(true);
      });

      it('should not tag a hasMany association with where and duplicating false', function() {
        const options = Sequelize.Model.prototype._validateIncludedElements({
          model: User,
          include: [
            {association: User_Tasks, where: {title: Math.random().toString()}, duplicating: false},
          ],
          limit: 3
        });

        expect(options.subQuery).to.equal(false);
        expect(options.include[0].subQuery).to.equal(false);
        expect(options.include[0].subQueryFilter).to.equal(false);
      });

      it('should tag a required belongsTo alongside a duplicating association', function() {
        const options = Sequelize.Model.prototype._validateIncludedElements({
          model: User,
          include: [
            {association: User_Company, required: true},
            {association: User_Tasks},
          ],
          limit: 3
        });

        expect(options.subQuery).to.equal(true);
        expect(options.include[0].subQuery).to.equal(true);
      });

      it('should not tag a required belongsTo alongside a duplicating association with duplicating false', function() {
        const options = Sequelize.Model.prototype._validateIncludedElements({
          model: User,
          include: [
            {association: User_Company, required: true},
            {association: User_Tasks, duplicating: false},
          ],
          limit: 3
        });

        expect(options.subQuery).to.equal(false);
        expect(options.include[0].subQuery).to.equal(false);
      });

      it('should tag a belongsTo association with where alongside a duplicating association', function() {
        const options = Sequelize.Model.prototype._validateIncludedElements({
          model: User,
          include: [
            {association: User_Company, where: {name: Math.random().toString()}},
            {association: User_Tasks},
          ],
          limit: 3
        });

        expect(options.subQuery).to.equal(true);
        expect(options.include[0].subQuery).to.equal(true);
      });

      it('should tag a required belongsTo association alongside a duplicating association with a nested belongsTo', function() {
        const options = Sequelize.Model.prototype._validateIncludedElements({
          model: User,
          include: [
            {association: User_Company, required: true, include: [
              Company_Owner,
            ]},
            User_Tasks,
          ],
          limit: 3
        });

        expect(options.subQuery).to.equal(true);
        expect(options.include[0].subQuery).to.equal(true);
        expect(options.include[0].include[0].subQuery).to.equal(false);
        expect(options.include[0].include[0].parent.subQuery).to.equal(true);
      });

      it('should tag a belongsTo association with where alongside a duplicating association with duplicating false', function() {
        const options = Sequelize.Model.prototype._validateIncludedElements({
          model: User,
          include: [
            {association: User_Company, where: {name: Math.random().toString()}},
            {association: User_Tasks, duplicating: false},
          ],
          limit: 3
        });

        expect(options.subQuery).to.equal(false);
        expect(options.include[0].subQuery).to.equal(false);
      });
    });
  });
});
