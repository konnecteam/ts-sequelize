'use strict';

import * as chai from 'chai';
import { Model, Sequelize } from '../../../../index';
import DataTypes from '../../../../lib/data-types';
import { ItestAttribute, ItestInstance } from '../../../dummy/dummy-data-set';
import Support from '../../support';
const expect = chai.expect;
const Promise = Sequelize.Promise;
const dialect = Support.getTestDialect();
const current = Support.sequelize;

describe(Support.getTestDialectTeaser('Model'), () => {
  describe('attributes', () => {
    describe('types', () => {
      describe('VIRTUAL', () => {
        let User : Model<ItestInstance, ItestAttribute>;
        let Task : Model<ItestInstance, ItestAttribute>;
        let Project : Model<ItestInstance, ItestAttribute>;
        beforeEach(function() {
          User = current.define<ItestInstance, ItestAttribute>('user', {
            storage: new DataTypes.STRING(),
            field1: {
              type: new DataTypes.VIRTUAL(),
              set(val) {
                this.setDataValue('storage', val);
                this.setDataValue('field1', val);
              },
              get() {
                return this.getDataValue('field1');
              }
            },
            field2: {
              type: new DataTypes.VIRTUAL(),
              get() {
                return 42;
              }
            },
            virtualWithDefault: {
              type: new DataTypes.VIRTUAL(),
              defaultValue: 'cake'
            }
          }, { timestamps: false });

          Task = current.define<ItestInstance, ItestAttribute>('task', {});
          Project = current.define<ItestInstance, ItestAttribute>('project', {});

          Task.belongsTo(User);
          Project.belongsToMany(User, {through: 'project_user'});
          User.belongsToMany(Project, {through: 'project_user'});

          this.sqlAssert = function(sql) {
            expect(sql.indexOf('field1')).to.equal(-1);
            expect(sql.indexOf('field2')).to.equal(-1);
          };

          return current.sync({ force: true });
        });

        it('should not be ignored in dataValues get', function() {
          const user = User.build({
            field1: 'field1_value',
            field2: 'field2_value'
          });

          expect(user.get()).to.deep.equal({ storage: 'field1_value', field1: 'field1_value', virtualWithDefault: 'cake', field2: 42, id: null });
        });

        it('should be ignored in table creation', function() {
          return current.getQueryInterface().describeTable(User.tableName).then(fields => {
            expect(Object.keys(fields).length).to.equal(2);
          });
        });

        it('should be ignored in find, findAll and includes', function() {
          return Promise.all([
            User.findOne({
              logging: this.sqlAssert
            }),
            User.findAll({
              logging: this.sqlAssert
            }),
            Task.findAll({
              include: [
                User ],
              logging: this.sqlAssert
            }),
            Project.findAll({
              include: [
                User ],
              logging: this.sqlAssert
            }),
          ]);
        });

        it('should allow me to store selected values', function() {
          const Post = current.define<ItestInstance, ItestAttribute>('Post', {
            text: new DataTypes.TEXT(),
            someBoolean: {
              type: new DataTypes.VIRTUAL()
            }
          });

          return current.sync({ force: true}).then(() => {
            return Post.bulkCreate([{ text: 'text1' }, { text: 'text2' }]);
          }).then(() => {
            let boolQuery = 'EXISTS(SELECT 1) AS "someBoolean"';
            if (dialect === 'mssql') {
              boolQuery = 'CAST(CASE WHEN EXISTS(SELECT 1) THEN 1 ELSE 0 END AS BIT) AS "someBoolean"';
            } else if (dialect === 'oracle') {
              boolQuery = 'CAST(CASE WHEN EXISTS(SELECT 1 FROM DUAL) THEN 1 ELSE 0 END AS NUMBER) AS "someBoolean"';
            }

            return Post.find({ attributes: ['id', 'text', Sequelize.literal(boolQuery)] });
          }).then(post => {
            expect(post.get('someBoolean')).to.be.ok;
            expect(post.get().someBoolean).to.be.ok;
          });
        });

        it('should be ignored in create and updateAttributes', function() {
          return User.create({
            field1: 'something'
          }).then(user => {
            // We already verified that the virtual is not added to the table definition, so if this succeeds, were good

            expect(user.virtualWithDefault).to.equal('cake');
            expect(user.storage).to.equal('something');
            return user.updateAttributes({
              field1: 'something else'
            }, {
              fields: ['storage']
            });
          }).then(user => {
            expect(user.virtualWithDefault).to.equal('cake');
            expect(user.storage).to.equal('something else');
          });
        });

        it('should be ignored in bulkCreate and bulkUpdate', function() {
          return User.bulkCreate([{
            field1: 'something'
          }], {
            logging: this.sqlAssert
          }).then(() => {
            return User.findAll();
          }).then(users => {
            expect(users[0].storage).to.equal('something');
          });
        });
      });
    });
  });
});
