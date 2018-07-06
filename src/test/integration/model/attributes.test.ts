'use strict';

import * as chai from 'chai';
import {Sequelize} from '../../../index';
import DataTypes from '../../../lib/data-types';
import Support from '../support';
const Promise = Sequelize.Promise;
const expect = chai.expect;

describe(Support.getTestDialectTeaser('Model'), () => {
  describe('attributes', () => {
    describe('set', () => {
      it('should only be called once when used on a join model called with an association getter', function() {
        const self = this;
        self.callCount = 0;

        this.Student = this.sequelize.define('student', {
          no: {type: new DataTypes.INTEGER(), primaryKey: true},
          name: new DataTypes.STRING()
        }, {
          tableName: 'student',
          timestamps: false
        });

        this.Course = this.sequelize.define('course', {
          no: {type: new DataTypes.INTEGER(), primaryKey: true},
          name: new DataTypes.STRING()
        }, {
          tableName: 'course',
          timestamps: false
        });

        this.Score = this.sequelize.define('score', {
          score: new DataTypes.INTEGER(),
          test_value: {
            type: new DataTypes.INTEGER(),
            set(v) {
              self.callCount++;
              this.setDataValue('test_value', v + 1);
            }
          }
        }, {
          tableName: 'score',
          timestamps: false
        });

        this.Student.belongsToMany(this.Course, {through: this.Score, foreignKey: 'StudentId'});
        this.Course.belongsToMany(this.Student, {through: this.Score, foreignKey: 'CourseId'});

        return this.sequelize.sync({force: true}).then(() => {
          return Promise.join(
            self.Student.create({no: 1, name: 'ryan'}),
            self.Course.create({no: 100, name: 'history'})
          ).spread((student, course) => {
            return student.addCourse(course, { through: {score: 98, test_value: 1000}});
          }).then(() => {
            expect(self.callCount).to.equal(1);
            return self.Score.find({ where: { StudentId: 1, CourseId: 100 } }).then(score => {
              expect(score.test_value).to.equal(1001);
            });
          })
            .then(() => {
              return Promise.join(
                self.Student.build({no: 1}).getCourses({where: {no: 100}}),
                self.Score.find({ where: { StudentId: 1, CourseId: 100 } })
              );
            })
            .spread((courses, score) => {
              expect(score.test_value).to.equal(1001);
              expect(courses[0].score.toJSON().test_value).to.equal(1001);
              expect(self.callCount).to.equal(1);
            });
        });
      });

      it('allows for an attribute to be called "toString"', function() {
        const Person = this.sequelize.define('person', {
          name: new DataTypes.STRING(),
          nick: new DataTypes.STRING()
        }, {
          timestamps: false
        });

        return this.sequelize.sync({force: true})
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
        const Person = this.sequelize.define('person', {
          name: new DataTypes.STRING(),
          nick: new DataTypes.STRING()
        });

        const Computer = this.sequelize.define('computer', {
          hostname: new DataTypes.STRING(),
        });

        Person.hasMany(Computer);

        return this.sequelize.sync({force: true})
          .then(() => Person.create({name: 'Jozef', nick: 'Joe'}))
          .then(person => person.createComputer({hostname: 'laptop'}))
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
