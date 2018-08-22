'use strict';

import * as chai from 'chai';
import { Model, Sequelize } from '../../../index';
import DataTypes from '../../../lib/data-types';
import { ItestAttribute, ItestInstance } from '../../dummy/dummy-data-set';
import Support from '../support';
const Promise = Sequelize.Promise;
const expect = chai.expect;
const current = Support.sequelize;

describe(Support.getTestDialectTeaser('Model'), () => {
  let Student : Model<ItestInstance, ItestAttribute>;
  let Course : Model<ItestInstance, ItestAttribute>;
  let Score : Model<ItestInstance, ItestAttribute>;
  let callCount : number;
  describe('attributes', () => {
    describe('set', () => {
      it('should only be called once when used on a join model called with an association getter', function() {
        callCount = 0;

        Student = current.define<ItestInstance, ItestAttribute>('student', {
          no: {type: new DataTypes.INTEGER(), primaryKey: true},
          name: new DataTypes.STRING()
        }, {
          tableName: 'student',
          timestamps: false
        });

        Course = current.define<ItestInstance, ItestAttribute>('course', {
          no: {type: new DataTypes.INTEGER(), primaryKey: true},
          name: new DataTypes.STRING()
        }, {
          tableName: 'course',
          timestamps: false
        });

        Score = current.define<ItestInstance, ItestAttribute>('score', {
          score: new DataTypes.INTEGER(),
          test_value: {
            type: new DataTypes.INTEGER(),
            set(v) {
              callCount++;
              this.setDataValue('test_value', v + 1);
            }
          }
        }, {
          tableName: 'score',
          timestamps: false
        });

        Student.belongsToMany(Course, {through: Score, foreignKey: 'StudentId'});
        Course.belongsToMany(Student, {through: Score, foreignKey: 'CourseId'});

        return current.sync({force: true}).then(() => {
          return Promise.join(
            Student.create({no: 1, name: 'ryan'}),
            Course.create({no: 100, name: 'history'})
          ).spread((student, course) => {
            return student.addLinkedData('course', course, { through: {score: 98, test_value: 1000}});
          }).then(() => {
            expect(callCount).to.equal(1);
            return Score.find({ where: { StudentId: 1, CourseId: 100 } }).then(score => {
              expect(score.test_value).to.equal(1001);
            });
          })
            .then(() => {
              return Promise.join(
                Student.build({no: 1}).getLinkedData<ItestInstance, ItestAttribute>('course', {where: {no: 100}}),
                Score.find({ where: { StudentId: 1, CourseId: 100 } })
              );
            })
            .spread((courses : ItestInstance, score : ItestInstance) => {
              expect(score.test_value).to.equal(1001);
              expect(courses[0].score.toJSON().test_value).to.equal(1001);
              expect(callCount).to.equal(1);
            });
        });
      });

      it('allows for an attribute to be called "toString"', function() {
        const Person = current.define<ItestInstance, ItestAttribute>('person', {
          name: new DataTypes.STRING(),
          nick: new DataTypes.STRING()
        }, {
          timestamps: false
        });

        return current.sync({force: true})
          .then(() => Person.create({name: 'Jozef', nick: 'Joe'}))
          .then(() => Person.findOne({
            attributes: [
              'nick',
              ['name', 'toString'],
            ],
            where: {
              name: 'Jozef'
            }
          }))
          .then(person => {
            expect(person.dataValues['toString']).to.equal('Jozef');
            expect(person.get('toString')).to.equal('Jozef');
          });
      });

      it('allows for an attribute to be called "toString" with associations', function() {
        const Person = current.define<ItestInstance, ItestAttribute>('person', {
          name: new DataTypes.STRING(),
          nick: new DataTypes.STRING()
        });

        const Computer = current.define<ItestInstance, ItestAttribute>('computer', {
          hostname: new DataTypes.STRING(),
        });

        Person.hasMany(Computer);

        return current.sync({force: true})
          .then(() => Person.create({name: 'Jozef', nick: 'Joe'}))
          .then(person => person.createLinkedData<ItestInstance, ItestAttribute>('computer', {hostname: 'laptop'}))
          .then(() => Person.findAll({
            attributes: [
              'nick',
              ['name', 'toString']],
            include: {
              model: Computer
            },
            where: {
              name: 'Jozef'
            }
          }))
          .then(result => {
            expect(result.length).to.equal(1);
            expect(result[0].dataValues['toString']).to.equal('Jozef');
            expect(result[0].get('toString')).to.equal('Jozef');
            expect(result[0].get('computers')[0].hostname).to.equal('laptop');
          });
      });
    });
  });
});
