'use strict';

import * as chai from 'chai';
import * as moment from 'moment';
import * as sinon from 'sinon';
import { Model, Sequelize } from '../../../index';
import DataTypes from '../../../lib/data-types';
import config from '../../config/config';
import { ItestAttribute, ItestInstance } from '../../dummy/dummy-data-set';
import Support from '../support';
const expect = chai.expect;
const dialect = Support.getTestDialect();
const current = Support.sequelize;

describe(Support.getTestDialectTeaser('Model'), () => {
  let User : Model<ItestInstance, ItestAttribute>;
  let Task : Model<ItestInstance, ItestAttribute>;
  let Continent : Model<ItestInstance, ItestAttribute>;
  let Country : Model<ItestInstance, ItestAttribute>;
  let Industry : Model<ItestInstance, ItestAttribute>;
  let IndustryCountry : Model<ItestInstance, ItestAttribute>;
  let Person : Model<ItestInstance, ItestAttribute>;
  let Animal : Model<ItestInstance, ItestAttribute>;
  let Kingdom : Model<ItestInstance, ItestAttribute>;
  let AnimalKingdom : Model<ItestInstance, ItestAttribute>;
  let Worker : Model<ItestInstance, ItestAttribute>;
  let worker : ItestInstance;
  let task : ItestInstance;
  let buf;
  beforeEach(function() {
    User = current.define<ItestInstance, ItestAttribute>('User', {
      username: new DataTypes.STRING(),
      secretValue: new DataTypes.STRING(),
      data: new DataTypes.STRING(),
      intVal: new DataTypes.INTEGER(),
      theDate: new DataTypes.DATE(),
      aBool: new DataTypes.BOOLEAN(),
      binary: new DataTypes.STRING(16, true)
    });

    return User.sync({ force: true });
  });

  describe('findAll', () => {
    if (current.dialect.supports.transactions) {
      it('supports transactions', function() {
        return Support.prepareTransactionTest(current).bind({}).then(sequelize => {
          User = (sequelize as Sequelize).define<ItestInstance, ItestAttribute>('User', { username: new DataTypes.STRING() });

          return User.sync({ force: true }).then(() => {
            return sequelize.transaction().then(t => {
              return User.create({ username: 'foo' }, { transaction: t }).then(() => {
                return User.findAll({ where: {username: 'foo'} }).then(users1 => {
                  return User.findAll({ transaction: t }).then(users2 => {
                    return User.findAll({ where: {username: 'foo'}, transaction: t }).then(users3 => {
                      expect(users1.length).to.equal(0);
                      expect(users2.length).to.equal(1);
                      expect(users3.length).to.equal(1);
                      return t.rollback();
                    });
                  });
                });
              });
            });
          });
        });
      });
    }

    describe('special where conditions/smartWhere object', () => {
      beforeEach(function() {
        buf = new Buffer(16);
        buf.fill('\x01');
        return User.bulkCreate([
          {username: 'boo', intVal: 5, theDate: '2013-01-01 12:00'},
          {username: 'boo2', intVal: 10, theDate: '2013-01-10 12:00', binary: buf },
        ]);
      });

      it('should be able to find rows where attribute is in a list of values', function() {
        return User.findAll({
          where: {
            username: ['boo', 'boo2']
          }
        }).then(users => {
          expect(users).to.have.length(2);
        });
      });

      it('should not break when trying to find rows using an array of primary keys', function() {
        return User.findAll({
          where: {
            id: [1, 2, 3]
          }
        });
      });

      it('should not break when using smart syntax on binary fields', function() {
        return User.findAll({
          where: {
            binary: [buf, buf]
          }
        }).then(users => {
          expect(users).to.have.length(1);
          expect(users[0].binary.toString()).to.equal(buf.toString());
          expect(users[0].username).to.equal('boo2');
        });
      });

      it('should be able to find a row using like', function() {
        return User.findAll({
          where: {
            username: {
              like: '%2'
            }
          }
        }).then(users => {
          expect(users).to.be.an.instanceof(Array);
          expect(users).to.have.length(1);
          expect(users[0].username).to.equal('boo2');
          expect(users[0].intVal).to.equal(10);
        });
      });

      it('should be able to find a row using not like', function() {
        return User.findAll({
          where: {
            username: {
              nlike: '%2'
            }
          }
        }).then(users => {
          expect(users).to.be.an.instanceof(Array);
          expect(users).to.have.length(1);
          expect(users[0].username).to.equal('boo');
          expect(users[0].intVal).to.equal(5);
        });
      });

      it('should be able to find a row using not like', function() {
        return User.findAll({
          where: {
            username: {
              nlike: '%2'
            }
          }
        }).then(users => {
          expect(users).to.be.an.instanceof(Array);
          expect(users).to.have.length(1);
          expect(users[0].username).to.equal('boo');
          expect(users[0].intVal).to.equal(5);
        });
      });

      if (dialect === 'postgres') {
        it('should be able to find a row using ilike', function() {
          return User.findAll({
            where: {
              username: {
                ilike: '%2'
              }
            }
          }).then(users => {
            expect(users).to.be.an.instanceof(Array);
            expect(users).to.have.length(1);
            expect(users[0].username).to.equal('boo2');
            expect(users[0].intVal).to.equal(10);
          });
        });

        it('should be able to find a row using not ilike', function() {
          return User.findAll({
            where: {
              username: {
                notilike: '%2'
              }
            }
          }).then(users => {
            expect(users).to.be.an.instanceof(Array);
            expect(users).to.have.length(1);
            expect(users[0].username).to.equal('boo');
            expect(users[0].intVal).to.equal(5);
          });
        });
      }

      it('should be able to find a row between a certain date using the between shortcut', function() {
        let betweenDte = ['2013-01-02', '2013-01-11'];
        if (dialect === 'oracle') {
          //Specific where we have to use the TO_DATE as in Oracle, the date format is related to the current language settings
          betweenDte = ["TO_DATE('2013-01-02','YYYY-MM-DD')", "TO_DATE('2013-01-11','YYYY-MM-DD')"];
        }
        return User.findAll({
          where: {
            theDate: {
              '..': betweenDte
            }
          }
        }).then(users => {
          expect(users[0].username).to.equal('boo2');
          expect(users[0].intVal).to.equal(10);
        });
      });

      it('should be able to find a row not between a certain integer using the not between shortcut', function() {
        return User.findAll({
          where: {
            intVal: {
              '!..': [8, 10]
            }
          }
        }).then(users => {
          expect(users[0].username).to.equal('boo');
          expect(users[0].intVal).to.equal(5);
        });
      });

      it('should be able to handle false/true values just fine...', function() {
        return User.bulkCreate([
          {username: 'boo5', aBool: false},
          {username: 'boo6', aBool: true},
        ]).then(() => {
          return User.findAll({where: {aBool: false}}).then(users => {
            expect(users).to.have.length(1);
            expect(users[0].username).to.equal('boo5');
            return User.findAll({where: {aBool: true}}).then(_users => {
              expect(_users).to.have.length(1);
              expect(_users[0].username).to.equal('boo6');
            });
          });
        });
      });

      it('should be able to handle false/true values through associations as well...', function() {
        const Passports = current.define<ItestInstance, ItestAttribute>('Passports', {
          isActive: new DataTypes.BOOLEAN()
        });

        User.hasMany(Passports);
        Passports.belongsTo(User);

        return User.sync({ force: true }).then(() => {
          return Passports.sync({ force: true }).then(() => {
            return User.bulkCreate([
              {username: 'boo5', aBool: false},
              {username: 'boo6', aBool: true},
            ]).then(() => {
              return Passports.bulkCreate([
                {isActive: true},
                {isActive: false},
              ]).then(() => {
                return User.findById(1).then(user1 => {
                  return Passports.findById(1).then(passport => {
                    return user1.setLinkedData('Passports', [passport]).then(() => {
                      return User.findById(2).then(_user => {
                        return Passports.findById(2).then(_passport => {
                          return _user.setLinkedData('Passports', [_passport]).then(() => {
                            return _user.getLinkedData<ItestInstance, ItestAttribute>('Passports', {where: {isActive: false}}).then(theFalsePassport => {
                              return user1.getLinkedData<ItestInstance, ItestAttribute>('Passports', {where: {isActive: true}}).then(theTruePassport => {
                                expect(theFalsePassport).to.have.length(1);
                                expect(theFalsePassport[0].isActive).to.be.false;
                                expect(theTruePassport).to.have.length(1);
                                expect(theTruePassport[0].isActive).to.be.true;
                              });
                            });
                          });
                        });
                      });
                    });
                  });
                });
              });
            });
          });
        });
      });

      it('should be able to handle binary values through associations as well...', function() {
        const Binary = current.define<ItestInstance, ItestAttribute>('Binary', {
          id: {
            type: new DataTypes.STRING(16, true),
            primaryKey: true
          }
        });

        const buf1 = buf;
        const buf2 = new Buffer(16);
        buf2.fill('\x02');

        User.belongsTo(Binary, { foreignKey: 'binary' });

        return current.sync({ force: true }).then(() => {
          return User.bulkCreate([
            {username: 'boo5', aBool: false},
            {username: 'boo6', aBool: true},
          ]).then(() => {
            return Binary.bulkCreate([
              {id: buf1},
              {id: buf2},
            ]).then(() => {
              return User.findById(1).then(user1 => {
                return Binary.findById(buf1).then(binary => {
                  return user1.setLinkedData('Binary', binary).then(() => {
                    return User.findById(2).then(_user => {
                      return Binary.findById(buf2).then(_binary => {
                        return _user.setLinkedData('Binary', _binary).then(() => {
                          return _user.getLinkedData<ItestInstance, ItestAttribute>('Binary').then(_binaryRetrieved => {
                            return user1.getLinkedData<ItestInstance, ItestAttribute>('Binary').then(binaryRetrieved => {
                              expect(binaryRetrieved.id).to.have.length(16);
                              expect(_binaryRetrieved.id).to.have.length(16);
                              expect(binaryRetrieved.id.toString()).to.be.equal(buf1.toString());
                              expect(_binaryRetrieved.id.toString()).to.be.equal(buf2.toString());
                            });
                          });
                        });
                      });
                    });
                  });
                });
              });
            });
          });
        });
      });

      it('should be able to find a row between a certain date', function() {

        let betweenDte = ['2013-01-02', '2013-01-11'];
        if (dialect === 'oracle') {
          //Specific where we have to use the TO_DATE as in Oracle, the date format is related to the current language settings
          betweenDte = ["TO_DATE('2013-01-02','YYYY-MM-DD')", "TO_DATE('2013-01-11','YYYY-MM-DD')"];
        }
        return User.findAll({
          where: {
            theDate: {
              between: betweenDte
            }
          }
        }).then(users => {
          expect(users[0].username).to.equal('boo2');
          expect(users[0].intVal).to.equal(10);
        });
      });

      it('should be able to find a row between a certain date and an additional where clause', function() {
        let betweenDte = ['2013-01-02', '2013-01-11'];
        if (dialect === 'oracle') {
          //Specific where we have to use the TO_DATE as in Oracle, the date format is related to the current language settings
          betweenDte = ["TO_DATE('2013-01-02','YYYY-MM-DD')", "TO_DATE('2013-01-11','YYYY-MM-DD')"];
        }
        return User.findAll({
          where: {
            theDate: {
              between: betweenDte
            },
            intVal: 10
          }
        }).then(users => {
          expect(users[0].username).to.equal('boo2');
          expect(users[0].intVal).to.equal(10);
        });
      });

      it('should be able to find a row not between a certain integer', function() {
        return User.findAll({
          where: {
            intVal: {
              nbetween: [8, 10]
            }
          }
        }).then(users => {
          expect(users[0].username).to.equal('boo');
          expect(users[0].intVal).to.equal(5);
        });
      });

      it('should be able to find a row using not between and between logic', function() {
        let betweenDte = ['2012-12-10', '2013-01-02'];
        let notBetweenDte = ['2013-01-04', '2013-01-20'];
        if (dialect === 'oracle') {
          //Specific where we have to use the TO_DATE as in Oracle, the date format is related to the current language settings
          betweenDte = ["TO_DATE('2012-12-10','YYYY-MM-DD')", "TO_DATE('2013-01-02','YYYY-MM-DD')"];
          notBetweenDte = ["TO_DATE('2013-01-04','YYYY-MM-DD')", "TO_DATE('2013-01-20','YYYY-MM-DD')"];
        }
        return User.findAll({
          where: {
            theDate: {
              between: betweenDte,
              nbetween: notBetweenDte
            }
          }
        }).then(users => {
          expect(users[0].username).to.equal('boo');
          expect(users[0].intVal).to.equal(5);
        });
      });

      it('should be able to find a row using not between and between logic with dates', function() {
        return User.findAll({
          where: {
            theDate: {
              between: [new Date('2012-12-10'), new Date('2013-01-02')],
              nbetween: [new Date('2013-01-04'), new Date('2013-01-20')]
            }
          }
        }).then(users => {
          expect(users[0].username).to.equal('boo');
          expect(users[0].intVal).to.equal(5);
        });
      });

      it('should be able to find a row using greater than or equal to logic with dates', function() {
        return User.findAll({
          where: {
            theDate: {
              gte: new Date('2013-01-09')
            }
          }
        }).then(users => {
          expect(users[0].username).to.equal('boo2');
          expect(users[0].intVal).to.equal(10);
        });
      });

      it('should be able to find a row using greater than or equal to', function() {
        return User.find({
          where: {
            intVal: {
              gte: 6
            }
          }
        }).then(_user => {
          expect(_user.username).to.equal('boo2');
          expect(_user.intVal).to.equal(10);
        });
      });

      it('should be able to find a row using greater than', function() {
        return User.find({
          where: {
            intVal: {
              gt: 5
            }
          }
        }).then(_user => {
          expect(_user.username).to.equal('boo2');
          expect(_user.intVal).to.equal(10);
        });
      });

      it('should be able to find a row using lesser than or equal to', function() {
        return User.find({
          where: {
            intVal: {
              lte: 5
            }
          }
        }).then(_user => {
          expect(_user.username).to.equal('boo');
          expect(_user.intVal).to.equal(5);
        });
      });

      it('should be able to find a row using lesser than', function() {
        return User.find({
          where: {
            intVal: {
              lt: 6
            }
          }
        }).then(_user => {
          expect(_user.username).to.equal('boo');
          expect(_user.intVal).to.equal(5);
        });
      });

      it('should have no problem finding a row using lesser and greater than', function() {
        return User.findAll({
          where: {
            intVal: {
              lt: 6,
              gt: 4
            }
          }
        }).then(users => {
          expect(users[0].username).to.equal('boo');
          expect(users[0].intVal).to.equal(5);
        });
      });

      it('should be able to find a row using not equal to logic', function() {
        return User.find({
          where: {
            intVal: {
              ne: 10
            }
          }
        }).then(_user => {
          expect(_user.username).to.equal('boo');
          expect(_user.intVal).to.equal(5);
        });
      });

      it('should be able to find multiple users with any of the special where logic properties', function() {
        return User.findAll({
          where: {
            intVal: {
              lte: 10
            }
          }
        }).then(users => {
          expect(users[0].username).to.equal('boo');
          expect(users[0].intVal).to.equal(5);
          expect(users[1].username).to.equal('boo2');
          expect(users[1].intVal).to.equal(10);
        });
      });
    });

    it('should not crash on an empty where array', function() {
      return User.findAll({
        where: []
      });
    });

    describe('eager loading', () => {
      describe('belongsTo', () => {
        beforeEach(function() {
          Task = current.define<ItestInstance, ItestAttribute>('TaskBelongsTo', { title: new DataTypes.STRING() });
          Worker = current.define<ItestInstance, ItestAttribute>('Worker', { name: new DataTypes.STRING() });
          Task.belongsTo(Worker);

          return Worker.sync({ force: true }).then(() => {
            return Task.sync({ force: true }).then(() => {
              return Worker.create({ name: 'worker' }).then(_worker => {
                return Task.create({ title: 'homework' }).then(_task => {
                  worker = _worker;
                  task = _task;
                  return task.setLinkedData('Worker', worker);
                });
              });
            });
          });
        });

        it('throws an error about unexpected input if include contains a non-object', function() {
          return Worker.findAll({ include: [1] }).catch (err => {
            expect(err.message).to.equal('Include unexpected. Element has to be either a Model, an Association or an object.');
          });
        });

        it('throws an error if included DaoFactory is not associated', function() {
          return Worker.findAll({ include: [Task] }).catch (err => {
            expect(err.message).to.equal('TaskBelongsTo is not associated to Worker!');
          });
        });

        it('returns the associated worker via task.worker', function() {
          return Task.findAll({
            where: { title: 'homework' },
            include: [Worker]
          }).then(tasks => {
            expect(tasks).to.exist;
            expect(tasks[0].Worker).to.exist;
            expect(tasks[0].Worker.name).to.equal('worker');
          });
        });

        it('returns the associated worker via task.worker, using limit and sort', function() {
          return Task.findAll({
            where: { title: 'homework' },
            include: [Worker],
            limit: 1,
            order: [['title', 'DESC']]
          }).then(tasks => {
            expect(tasks).to.exist;
            expect(tasks[0].Worker).to.exist;
            expect(tasks[0].Worker.name).to.equal('worker');
          });
        });
      });

      describe('hasOne', () => {
        beforeEach(function() {
          Task = current.define<ItestInstance, ItestAttribute>('TaskHasOne', { title: new DataTypes.STRING() });
          Worker = current.define<ItestInstance, ItestAttribute>('Worker', { name: new DataTypes.STRING() });
          Worker.hasOne(Task);
          return Worker.sync({ force: true }).then(() => {
            return Task.sync({ force: true }).then(() => {
              return Worker.create({ name: 'worker' }).then(_worker => {
                return Task.create({ title: 'homework' }).then(_task => {
                  worker = _worker;
                  task = _task;
                  return worker.setLinkedData('TaskHasOne', task);
                });
              });
            });
          });
        });

        it('throws an error if included DaoFactory is not associated', function() {
          return Task.findAll({ include: [Worker] }).catch (err => {
            expect(err.message).to.equal('Worker is not associated to TaskHasOne!');
          });
        });

        it('returns the associated task via worker.task', function() {
          return Worker.findAll({
            where: { name: 'worker' },
            include: [Task]
          }).then(workers => {
            expect(workers).to.exist;
            expect(workers[0].TaskHasOne).to.exist;
            expect(workers[0].TaskHasOne.title).to.equal('homework');
          });
        });
      });

      describe('hasOne with alias', () => {
        beforeEach(function() {
          Task = current.define<ItestInstance, ItestAttribute>('Task', { title: new DataTypes.STRING() });
          Worker = current.define<ItestInstance, ItestAttribute>('Worker', { name: new DataTypes.STRING() });
          Worker.hasOne(Task, { as: 'ToDo' });
          return Worker.sync({ force: true }).then(() => {
            return Task.sync({ force: true }).then(() => {
              return Worker.create({ name: 'worker' }).then(_worker => {
                return Task.create({ title: 'homework' }).then(_task => {
                  worker = _worker;
                  task = _task;
                  return worker.setLinkedData({ model : 'Task', associationAlias : 'ToDo' }, task);
                });
              });
            });
          });
        });

        it('throws an error if included DaoFactory is not referenced by alias', function() {
          return Worker.findAll({ include: [Task] }).catch (err => {
            expect(err.message).to.equal('Task is associated to Worker using an alias. ' +
            'You must use the \'as\' keyword to specify the alias within your include statement.');
          });
        });

        it('throws an error if alias is not associated', function() {
          return Worker.findAll({ include: [{ model: Task, as: 'Work' }] }).catch (err => {
            expect(err.message).to.equal('Task is associated to Worker using an alias. ' +
            'You\'ve included an alias (Work), but it does not match the alias defined in your association.');
          });
        });

        it('returns the associated task via worker.task', function() {
          return Worker.findAll({
            where: { name: 'worker' },
            include: [{ model: Task, as: 'ToDo' }]
          }).then(workers => {
            expect(workers).to.exist;
            expect(workers[0].ToDo).to.exist;
            expect(workers[0].ToDo.title).to.equal('homework');
          });
        });

        it('returns the associated task via worker.task when daoFactory is aliased with model', function() {
          return Worker.findAll({
            where: { name: 'worker' },
            include: [{ model: Task, as: 'ToDo' }]
          }).then(workers => {
            expect(workers[0].ToDo.title).to.equal('homework');
          });
        });
      });

      describe('hasMany', () => {
        beforeEach(function() {
          Task = current.define<ItestInstance, ItestAttribute>('task', { title: new DataTypes.STRING() });
          Worker = current.define<ItestInstance, ItestAttribute>('worker', { name: new DataTypes.STRING() });
          Worker.hasMany(Task);
          return Worker.sync({ force: true }).then(() => {
            return Task.sync({ force: true }).then(() => {
              return Worker.create({ name: 'worker' }).then(_worker => {
                return Task.create({ title: 'homework' }).then(_task => {
                  worker = _worker;
                  task = _task;
                  return worker.setLinkedData('task', [task]);
                });
              });
            });
          });
        });

        it('throws an error if included DaoFactory is not associated', function() {
          return Task.findAll({ include: [Worker] }).catch (err => {
            expect(err.message).to.equal('worker is not associated to task!');
          });
        });

        it('returns the associated tasks via worker.tasks', function() {
          return Worker.findAll({
            where: { name: 'worker' },
            include: [Task]
          }).then(workers => {
            expect(workers).to.exist;
            expect(workers[0].tasks).to.exist;
            expect(workers[0].tasks[0].title).to.equal('homework');
          });
        });
      });

      describe('hasMany with alias', () => {
        beforeEach(function() {
          Task = current.define<ItestInstance, ItestAttribute>('Task', { title: new DataTypes.STRING() });
          Worker = current.define<ItestInstance, ItestAttribute>('Worker', { name: new DataTypes.STRING() });
          Worker.hasMany(Task, { as: 'ToDos' });
          return Worker.sync({ force: true }).then(() => {
            return Task.sync({ force: true }).then(() => {
              return Worker.create({ name: 'worker' }).then(_worker => {
                return Task.create({ title: 'homework' }).then(_task => {
                  worker = _worker;
                  task = _task;
                  return worker.setLinkedData({ model : 'Task', associationAlias : 'ToDos' }, [task]);
                });
              });
            });
          });
        });

        it('throws an error if included DaoFactory is not referenced by alias', function() {
          return Worker.findAll({ include: [Task] }).catch (err => {
            expect(err.message).to.equal('Task is associated to Worker using an alias. ' +
            'You must use the \'as\' keyword to specify the alias within your include statement.');
          });
        });

        it('throws an error if alias is not associated', function() {
          return Worker.findAll({ include: [{ model: Task, as: 'Work' }] }).catch (err => {
            expect(err.message).to.equal('Task is associated to Worker using an alias. ' +
            'You\'ve included an alias (Work), but it does not match the alias defined in your association.');
          });
        });

        it('returns the associated task via worker.task', function() {
          return Worker.findAll({
            where: { name: 'worker' },
            include: [{ model: Task, as: 'ToDos' }]
          }).then(workers => {
            expect(workers).to.exist;
            expect(workers[0].ToDos).to.exist;
            expect(workers[0].ToDos[0].title).to.equal('homework');
          });
        });

        it('returns the associated task via worker.task when daoFactory is aliased with model', function() {
          return Worker.findAll({
            where: { name: 'worker' },
            include: [{ model: Task, as: 'ToDos' }]
          }).then(workers => {
            expect(workers[0].ToDos[0].title).to.equal('homework');
          });
        });
      });

      describe('queryOptions', () => {
        beforeEach(function() {
          return User.create({username: 'barfooz'});
        });

        it('should return a DAO when queryOptions are not set', function() {
          return User.findAll({ where: { username: 'barfooz'}}).then(users => {
            users.forEach(_user => {
              expect(_user.model).to.equal(User);
            });
          });
        });

        it('should return a DAO when raw is false', function() {
          return User.findAll({ where: { username: 'barfooz'}, raw: false }).then(users => {
            users.forEach(_user => {
              expect(_user.model).to.equal(User);
            });
          });
        });

        it('should return raw data when raw is true', function() {
          return User.findAll({ where: { username: 'barfooz'}, raw: true }).then(users => {
            users.forEach(_user => {
              expect(_user.model).to.not.equal(User);
              expect(users[0]).to.be.instanceOf(Object);
            });
          });
        });
      });

      describe('include all', () => {
        beforeEach(function() {
          Continent = current.define<ItestInstance, ItestAttribute>('continent', { name: new DataTypes.STRING() });
          Country = current.define<ItestInstance, ItestAttribute>('country', { name: new DataTypes.STRING() });
          Industry = current.define<ItestInstance, ItestAttribute>('industry', { name: new DataTypes.STRING() });
          Person = current.define<ItestInstance, ItestAttribute>('person', { name: new DataTypes.STRING(), lastName: new DataTypes.STRING() });

          Continent.hasMany(Country);
          Country.belongsTo(Continent);
          Country.belongsToMany(Industry, {through: 'country_industry'});
          Industry.belongsToMany(Country, {through: 'country_industry'});
          Country.hasMany(Person);
          Person.belongsTo(Country);
          Country.hasMany(Person, { as: 'residents', foreignKey: 'CountryResidentId' });
          Person.belongsTo(Country, { as: 'CountryResident', foreignKey: 'CountryResidentId' });

          return current.sync({ force: true }).then(() => {
            return current.Promise.props({
              europe: Continent.create({ name: 'Europe' }),
              england: Country.create({ name: 'England' }),
              coal: Industry.create({ name: 'Coal' }),
              bob: Person.create({ name: 'Bob', lastName: 'Becket' })
            }).then(r => {
              return current.Promise.all([
                r.england.setLinkedData('continent', r.europe),
                r.england.addLinkedData('industry', r.coal),
                r.bob.setLinkedData('country', r.england),
                r.bob.setLinkedData({ model : 'country', associationAlias : 'CountryResident' }, r.england),
              ]);
            });
          });
        });

        it('includes all associations', function() {
          return Country.findAll({ include: [{ all: true }] }).then(countries => {
            expect(countries).to.exist;
            expect(countries[0]).to.exist;
            expect(countries[0].continent).to.exist;
            expect(countries[0].industries).to.exist;
            expect(countries[0].people).to.exist;
            expect(countries[0].residents).to.exist;
          });
        });

        it('includes specific type of association', function() {
          return Country.findAll({ include: [{ all: 'BelongsTo' }] }).then(countries => {
            expect(countries).to.exist;
            expect(countries[0]).to.exist;
            expect(countries[0].continent).to.exist;
            expect(countries[0].industries).not.to.exist;
            expect(countries[0].people).not.to.exist;
            expect(countries[0].residents).not.to.exist;
          });
        });

        it('utilises specified attributes', function() {
          return Country.findAll({ include: [{ all: 'HasMany', attributes: ['name'] }] }).then(countries => {
            expect(countries).to.exist;
            expect(countries[0]).to.exist;
            expect(countries[0].people).to.exist;
            expect(countries[0].people[0]).to.exist;
            expect(countries[0].people[0].name).not.to.be.undefined;
            expect(countries[0].people[0].lastName).to.be.undefined;
            expect(countries[0].residents).to.exist;
            expect(countries[0].residents[0]).to.exist;
            expect(countries[0].residents[0].name).not.to.be.undefined;
            expect(countries[0].residents[0].lastName).to.be.undefined;
          });
        });

        it('is over-ruled by specified include', function() {
          return Country.findAll({ include: [{ all: true }, { model: Continent, attributes: ['id'] }] }).then(countries => {
            expect(countries).to.exist;
            expect(countries[0]).to.exist;
            expect(countries[0].continent).to.exist;
            expect(countries[0].continent.name).to.be.undefined;
          });
        });

        it('includes all nested associations', function() {
          return Continent.findAll({ include: [{ all: true, nested: true }] }).then(continents => {
            expect(continents).to.exist;
            expect(continents[0]).to.exist;
            expect(continents[0].countries).to.exist;
            expect(continents[0].countries[0]).to.exist;
            expect(continents[0].countries[0].industries).to.exist;
            expect(continents[0].countries[0].people).to.exist;
            expect(continents[0].countries[0].residents).to.exist;
            expect(continents[0].countries[0].continent).not.to.exist;
          });
        });
      });

      describe('properly handles attributes:[] cases', () => {

        beforeEach(function() {
          Animal = current.define<ItestInstance, ItestAttribute>('Animal', {
            name: new DataTypes.STRING(),
            age: new DataTypes.INTEGER()
          });
          Kingdom = current.define<ItestInstance, ItestAttribute>('Kingdom', {
            name: new DataTypes.STRING()
          });
          AnimalKingdom = current.define<ItestInstance, ItestAttribute>('AnimalKingdom', {
            relation: new DataTypes.STRING(),
            mutation: new DataTypes.BOOLEAN()
          });

          Kingdom.belongsToMany(Animal, { through: AnimalKingdom });

          return current.sync({ force: true })
            .then(() => Sequelize.Promise.all([
              Animal.create({ name: 'Dog', age: 20 }),
              Animal.create({ name: 'Cat', age: 30 }),
              Animal.create({ name: 'Peacock', age: 25 }),
              Animal.create({ name: 'Fish', age: 100 }),
            ]))
            .spread((a1, a2, a3, a4) => Sequelize.Promise.all([
              Kingdom.create({ name: 'Earth' }),
              Kingdom.create({ name: 'Water' }),
              Kingdom.create({ name: 'Wind' }),
            ]).spread((k1, k2, k3) =>
              Sequelize.Promise.all([
                k1.addLinkedData('Animal', [a1, a2]),
                k2.addLinkedData('Animal', [a4]),
                k3.addLinkedData('Animal', [a3]),
              ])
            ));
        });

        it('N:M with ignoring include.attributes only', function() {
          return Kingdom.findAll({
            include: [{
              model: Animal,
              where: { age: { $gte : 29 } },
              attributes: []
            }]
          }).then(kingdoms => {
            expect(kingdoms.length).to.be.eql(2);
            kingdoms.forEach(kingdom => {
              // include.attributes:[] , model doesn't exists
              expect(kingdom.Animals).to.not.exist;
            });
          });
        });

        it('N:M with ignoring through.attributes only', function() {
          return Kingdom.findAll({
            include: [{
              model: Animal,
              where: { age: { $gte : 29 } },
              through: {
                attributes: []
              }
            }]
          }).then(kingdoms => {
            expect(kingdoms.length).to.be.eql(2);
            kingdoms.forEach(kingdom => {
              expect(kingdom.Animals).to.exist; // include model exists
              expect(kingdom.Animals[0].AnimalKingdom).to.not.exist; // through doesn't exists
            });
          });
        });

        it('N:M with ignoring include.attributes but having through.attributes', function() {
          return Kingdom.findAll({
            include: [{
              model: Animal,
              where: { age: { $gte : 29 } },
              attributes: [],
              through: {
                attributes: ['mutation']
              }
            }]
          }).then(kingdoms => {
            expect(kingdoms.length).to.be.eql(2);
            kingdoms.forEach(kingdom => {
              // include.attributes: [], model doesn't exists
              expect(kingdom.Animals).to.not.exist;
            });
          });
        });

      });
    });

    describe('order by eager loaded tables', () => {
      describe('HasMany', () => {
        beforeEach(function() {
          Continent = current.define<ItestInstance, ItestAttribute>('continent', { name: new DataTypes.STRING() });
          Country = current.define<ItestInstance, ItestAttribute>('country', { name: new DataTypes.STRING() });
          Person = current.define<ItestInstance, ItestAttribute>('person', { name: new DataTypes.STRING(), lastName: new DataTypes.STRING() });

          Continent.hasMany(Country);
          Country.belongsTo(Continent);
          Country.hasMany(Person);
          Person.belongsTo(Country);
          Country.hasMany(Person, { as: 'residents', foreignKey: 'CountryResidentId' });
          Person.belongsTo(Country, { as: 'CountryResident', foreignKey: 'CountryResidentId' });

          return current.sync({ force: true }).then(() => {
            return current.Promise.props({
              europe: Continent.create({ name: 'Europe' }),
              asia: Continent.create({ name: 'Asia' }),
              england: Country.create({ name: 'England' }),
              france: Country.create({ name: 'France' }),
              korea: Country.create({ name: 'Korea' }),
              bob: Person.create({ name: 'Bob', lastName: 'Becket' }),
              fred: Person.create({ name: 'Fred', lastName: 'Able' }),
              pierre: Person.create({ name: 'Pierre', lastName: 'Paris' }),
              kim: Person.create({ name: 'Kim', lastName: 'Z' })
            }).then(r => {
              return current.Promise.all([
                r.england.setLinkedData('continent', r.europe),
                r.france.setLinkedData('continent', r.europe),
                r.korea.setLinkedData('continent', r.asia),

                r.bob.setLinkedData('country', r.england),
                r.fred.setLinkedData('country', r.england),
                r.pierre.setLinkedData('country', r.france),
                r.kim.setLinkedData('country', r.korea),

                r.bob.setLinkedData({ model : 'country', associationAlias : 'CountryResident' }, r.england),
                r.fred.setLinkedData({ model : 'country', associationAlias : 'CountryResident' }, r.france),
                r.pierre.setLinkedData({ model : 'country', associationAlias : 'CountryResident' }, r.korea),
                r.kim.setLinkedData({ model : 'country', associationAlias : 'CountryResident' }, r.england),
              ]);
            });
          });
        });

        it('sorts simply', function() {
          return current.Promise.map([['ASC', 'Asia'], ['DESC', 'Europe']], params => {
            return Continent.findAll({
              order: [['name', params[0]]]
            }).then(continents => {
              expect(continents).to.exist;
              expect(continents[0]).to.exist;
              expect(continents[0].name).to.equal(params[1]);
            });
          });
        });

        it('sorts by 1st degree association', function() {
          return current.Promise.map([['ASC', 'Europe', 'England'], ['DESC', 'Asia', 'Korea']], params => {
            return Continent.findAll({
              include: [Country],
              order: [[Country, 'name', params[0]]]
            }).then(continents => {
              expect(continents).to.exist;
              expect(continents[0]).to.exist;
              expect(continents[0].name).to.equal(params[1]);
              expect(continents[0].countries).to.exist;
              expect(continents[0].countries[0]).to.exist;
              expect(continents[0].countries[0].name).to.equal(params[2]);
            });
          });
        });

        it('sorts simply and by 1st degree association with limit where 1st degree associated instances returned for second one and not the first', function() {
          return current.Promise.map([['ASC', 'Asia', 'Europe', 'England']], params => {
            return Continent.findAll({
              include: [{
                model: Country,
                required: false,
                where: {
                  name: params[3]
                }
              }],
              limit: 2,
              order: [['name', params[0]], [Country, 'name', params[0]]]
            }).then(continents => {
              expect(continents).to.exist;
              expect(continents[0]).to.exist;
              expect(continents[0].name).to.equal(params[1]);
              expect(continents[0].countries).to.exist;
              expect(continents[0].countries.length).to.equal(0);
              expect(continents[1]).to.exist;
              expect(continents[1].name).to.equal(params[2]);
              expect(continents[1].countries).to.exist;
              expect(continents[1].countries.length).to.equal(1);
              expect(continents[1].countries[0]).to.exist;
              expect(continents[1].countries[0].name).to.equal(params[3]);
            });
          });
        });

        it('sorts by 2nd degree association', function() {
          return current.Promise.map([['ASC', 'Europe', 'England', 'Fred'], ['DESC', 'Asia', 'Korea', 'Kim']], params => {
            return Continent.findAll({
              include: [{ model: Country, include: [Person] }],
              order: [[Country, Person, 'lastName', params[0]]]
            }).then(continents => {
              expect(continents).to.exist;
              expect(continents[0]).to.exist;
              expect(continents[0].name).to.equal(params[1]);
              expect(continents[0].countries).to.exist;
              expect(continents[0].countries[0]).to.exist;
              expect(continents[0].countries[0].name).to.equal(params[2]);
              expect(continents[0].countries[0].people).to.exist;
              expect(continents[0].countries[0].people[0]).to.exist;
              expect(continents[0].countries[0].people[0].name).to.equal(params[3]);
            });
          });
        }),

        it('sorts by 2nd degree association with alias', function() {
          return current.Promise.map([['ASC', 'Europe', 'France', 'Fred'], ['DESC', 'Europe', 'England', 'Kim']], params => {
            return Continent.findAll({
              include: [{ model: Country, include: [Person, {model: Person, as: 'residents' }] }],
              order: [[Country, {model: Person, as: 'residents' }, 'lastName', params[0]]]
            }).then(continents => {
              expect(continents).to.exist;
              expect(continents[0]).to.exist;
              expect(continents[0].name).to.equal(params[1]);
              expect(continents[0].countries).to.exist;
              expect(continents[0].countries[0]).to.exist;
              expect(continents[0].countries[0].name).to.equal(params[2]);
              expect(continents[0].countries[0].residents).to.exist;
              expect(continents[0].countries[0].residents[0]).to.exist;
              expect(continents[0].countries[0].residents[0].name).to.equal(params[3]);
            });
          });
        });

        it('sorts by 2nd degree association with alias while using limit', function() {
          return current.Promise.map([['ASC', 'Europe', 'France', 'Fred'], ['DESC', 'Europe', 'England', 'Kim']], params => {
            return Continent.findAll({
              include: [{ model: Country, include: [Person, {model: Person, as: 'residents' }] }],
              order: [[{ model: Country }, {model: Person, as: 'residents' }, 'lastName', params[0]]],
              limit: 3
            }).then(continents => {
              expect(continents).to.exist;
              expect(continents[0]).to.exist;
              expect(continents[0].name).to.equal(params[1]);
              expect(continents[0].countries).to.exist;
              expect(continents[0].countries[0]).to.exist;
              expect(continents[0].countries[0].name).to.equal(params[2]);
              expect(continents[0].countries[0].residents).to.exist;
              expect(continents[0].countries[0].residents[0]).to.exist;
              expect(continents[0].countries[0].residents[0].name).to.equal(params[3]);
            });
          });
        });
      }),

      describe('ManyToMany', () => {
        beforeEach(function() {
          Country = current.define<ItestInstance, ItestAttribute>('country', { name: new DataTypes.STRING() });
          Industry = current.define<ItestInstance, ItestAttribute>('industry', { name: new DataTypes.STRING() });
          IndustryCountry = current.define<ItestInstance, ItestAttribute>('IndustryCountry', { numYears: new DataTypes.INTEGER() });

          Country.belongsToMany(Industry, {through: IndustryCountry});
          Industry.belongsToMany(Country, {through: IndustryCountry});

          return current.sync({ force: true }).then(() => {
            return current.Promise.props({
              england: Country.create({ name: 'England' }),
              france: Country.create({ name: 'France' }),
              korea: Country.create({ name: 'Korea' }),
              energy: Industry.create({ name: 'Energy' }),
              media: Industry.create({ name: 'Media' }),
              tech: Industry.create({ name: 'Tech' })
            }).then(r => {
              return current.Promise.all([
                r.england.addLinkedData('industry', r.energy, { through: { numYears: 20 }}),
                r.england.addLinkedData('industry', r.media, { through: { numYears: 40 }}),
                r.france.addLinkedData('industry', r.media, { through: { numYears: 80 }}),
                r.korea.addLinkedData('industry', r.tech, { through: { numYears: 30 }}),
              ]);
            });
          });
        });

        it('sorts by 1st degree association', function() {
          return current.Promise.map([['ASC', 'England', 'Energy'], ['DESC', 'Korea', 'Tech']], params => {
            return Country.findAll({
              include: [Industry],
              order: [[Industry, 'name', params[0]]]
            }).then(countries => {
              expect(countries).to.exist;
              expect(countries[0]).to.exist;
              expect(countries[0].name).to.equal(params[1]);
              expect(countries[0].industries).to.exist;
              expect(countries[0].industries[0]).to.exist;
              expect(countries[0].industries[0].name).to.equal(params[2]);
            });
          });
        });

        it('sorts by 1st degree association while using limit', function() {
          return current.Promise.map([['ASC', 'England', 'Energy'], ['DESC', 'Korea', 'Tech']], params => {
            return Country.findAll({
              include: [Industry],
              order: [
                [Industry, 'name', params[0]],
              ],
              limit: 3
            }).then(countries => {
              expect(countries).to.exist;
              expect(countries[0]).to.exist;
              expect(countries[0].name).to.equal(params[1]);
              expect(countries[0].industries).to.exist;
              expect(countries[0].industries[0]).to.exist;
              expect(countries[0].industries[0].name).to.equal(params[2]);
            });
          });
        });

        it('sorts by through table attribute', function() {
          return current.Promise.map([['ASC', 'England', 'Energy'], ['DESC', 'France', 'Media']], params => {
            return Country.findAll({
              include: [Industry],
              order: [[Industry, IndustryCountry, 'numYears', params[0]]]
            }).then(countries => {
              expect(countries).to.exist;
              expect(countries[0]).to.exist;
              expect(countries[0].name).to.equal(params[1]);
              expect(countries[0].industries).to.exist;
              expect(countries[0].industries[0]).to.exist;
              expect(countries[0].industries[0].name).to.equal(params[2]);
            });
          });
        });
      });
    });

    describe('normal findAll', () => {
      let users : ItestInstance[];
      beforeEach(function() {
        return User.create({username: 'user', data: 'foobar', theDate: moment().toDate()}).then(user1 => {
          return User.create({username: 'user2', data: 'bar', theDate: moment().toDate()}).then(user2 => {
            users = [user1].concat(user2);
          });
        });
      });

      it('finds all entries', function() {
        return User.findAll().then(_users => {
          expect(_users.length).to.equal(2);
        });
      });

      it('can also handle object notation', function() {
        return User.findAll({where: {id: users[1].id}}).then(_users => {
          expect(_users.length).to.equal(1);
          expect(_users[0].id).to.equal(users[1].id);
        });
      });

      it('sorts the results via id in ascending order', function() {
        return User.findAll().then(_users => {
          expect(_users.length).to.equal(2);
          //Oracle - no order by is setted, as for mssql, so how can it be ordered ?
          if (dialect !== 'oracle') {
            expect(_users[0].id).to.be.below(_users[1].id);
          }
        });
      });

      it('sorts the results via id in descending order', function() {
        return User.findAll({ order: [['id', 'DESC']] }).then(_users => {
          expect(_users[0].id).to.be.above(_users[1].id);
        });
      });

      it('sorts the results via a date column', function() {
        return User.create({username: 'user3', data: 'bar', theDate: moment().add(2, 'hours').toDate()}).then(() => {
          return User.findAll({ order: [['theDate', 'DESC']] }).then(_users => {
            expect(_users[0].id).to.be.above(_users[2].id);
          });
        });
      });

      it('handles offset and limit', function() {
        return User.bulkCreate([{username: 'bobby'}, {username: 'tables'}]).then(() => {
          return User.findAll({ limit: 2, offset: 2 }).then(_users => {
            expect(_users.length).to.equal(2);
            expect(_users[0].id).to.equal(3);
          });
        });
      });

      it('should allow us to find IDs using capital letters', function() {
        User = current.define<ItestInstance, ItestAttribute>('User' + config.rand(), {
          ID: { type: new DataTypes.INTEGER(), primaryKey: true, autoIncrement: true },
          Login: { type: new DataTypes.STRING() }
        });

        return User.sync({ force: true }).then(() => {
          return User.create({Login: 'foo'}).then(() => {
            return User.findAll({ where: { ID: 1 } }).then(_user => {
              expect(_user).to.be.instanceof(Array);
              expect(_user).to.have.length(1);
            });
          });
        });
      });

      it('should be possible to order by current.col()', function() {
        const Company = current.define<ItestInstance, ItestAttribute>('Company', {
          name: new DataTypes.STRING()
        });

        return Company.sync().then(() => {
          return Company.findAll({
            order: [current.col('name')]
          });
        });
      });

      it('should pull in dependent fields for a VIRTUAL', function() {
        User = current.define<ItestInstance, ItestAttribute>('User', {
          active: {
            type: new DataTypes.VIRTUAL(new DataTypes.BOOLEAN(), ['createdAt']),
            get() {
              return this.get('createdAt') > Date.now() - 7 * 24 * 60 * 60 * 1000;
            }
          }
        }, {
          timestamps: true
        });

        return User.create().then(() => {
          return User.findAll({
            attributes: ['active']
          }).then(_users => {
            _users.forEach(_user => {
              expect(_user.get('createdAt')).to.be.ok;
              expect(_user.get('active')).to.equal(true);
            });
          });
        });
      });
    });
  });

  describe('findAndCountAll', () => {
    let _users : ItestInstance[];
    beforeEach(function() {
      return User.bulkCreate([
        {username: 'user', data: 'foobar'},
        {username: 'user2', data: 'bar'},
        {username: 'bobby', data: 'foo'},
      ]).then(() => {
        return User.findAll().then(users => {
          _users = users;
        });
      });
    });

    if (current.dialect.supports.transactions) {
      it('supports transactions', function() {
        return Support.prepareTransactionTest(current).bind({}).then(sequelize => {
          User = (sequelize as Sequelize).define<ItestInstance, ItestAttribute>('User', { username: new DataTypes.STRING() });

          return User.sync({ force: true }).then(() => {
            return sequelize.transaction().then(t => {
              return User.create({ username: 'foo' }, { transaction: t }).then(() => {
                return User.findAndCountAll().then(info1 => {
                  return User.findAndCountAll({ transaction: t }).then(info2 => {
                    expect(info1.count).to.equal(0);
                    expect(info2.count).to.equal(1);
                    return t.rollback();
                  });
                });
              });
            });
          });
        });
      });
    }

    it('handles where clause {only}', function() {
      return User.findAndCountAll({where: {id: {$ne: _users[0].id}}}).then(info => {
        expect(info.count).to.equal(2);
        expect(Array.isArray(info.rows)).to.be.ok;
        expect(info.rows.length).to.equal(2);
      });
    });

    it('handles where clause with ordering {only}', function() {
      return User.findAndCountAll({where: {id: {$ne: _users[0].id}}, order: [['id', 'ASC']]}).then(info => {
        expect(info.count).to.equal(2);
        expect(Array.isArray(info.rows)).to.be.ok;
        expect(info.rows.length).to.equal(2);
      });
    });

    it('handles offset', function() {
      return User.findAndCountAll({offset: 1}).then(info => {
        expect(info.count).to.equal(3);
        expect(Array.isArray(info.rows)).to.be.ok;
        expect(info.rows.length).to.equal(2);
      });
    });

    it('handles limit', function() {
      return User.findAndCountAll({limit: 1}).then(info => {
        expect(info.count).to.equal(3);
        expect(Array.isArray(info.rows)).to.be.ok;
        expect(info.rows.length).to.equal(1);
      });
    });

    it('handles offset and limit', function() {
      return User.findAndCountAll({offset: 1, limit: 1}).then(info => {
        expect(info.count).to.equal(3);
        expect(Array.isArray(info.rows)).to.be.ok;
        expect(info.rows.length).to.equal(1);
      });
    });

    it('handles offset with includes', function() {
      const Election = current.define<ItestInstance, ItestAttribute>('Election', {
        name: new DataTypes.STRING()
      });
      const Citizen = current.define<ItestInstance, ItestAttribute>('Citizen', {
        name: new DataTypes.STRING()
      });

      // Associations
      Election.belongsTo(Citizen);
      Election.belongsToMany(Citizen, { as: 'Voters', through: 'ElectionsVotes' });
      Citizen.hasMany(Election);
      Citizen.belongsToMany(Election, { as: 'Votes', through: 'ElectionsVotes' });

      return current.sync().then(() => {
        // Add some data
        return Citizen.create({ name: 'Alice' }).then(alice => {
          return Citizen.create({ name: 'Bob' }).then(bob => {
            return Election.create({ name: 'Some election' }).then(() => {
              return Election.create({ name: 'Some other election' }).then(election => {
                return election.setLinkedData('Citizen', alice).then(() => {
                  return election.setLinkedData({ model : 'Citizen', associationAlias : 'Voters' }, [alice, bob]).then(() => {
                    const criteria = {
                      offset: 5,
                      limit: 1,
                      where: {
                        name: 'Some election'
                      },
                      include: [
                        Citizen, // Election creator
                        { model: Citizen, as: 'Voters' }, // Election voters
                      ]
                    };
                    return Election.findAndCountAll(criteria).then(elections => {
                      expect(elections.count).to.equal(1);
                      expect(elections.rows.length).to.equal(0);
                    });
                  });
                });
              });
            });
          });
        });
      });
    });


    it('handles attributes', function() {
      return User.findAndCountAll({where: {id: {$ne: _users[0].id}}, attributes: ['data']}).then(info => {
        expect(info.count).to.equal(2);
        expect(Array.isArray(info.rows)).to.be.ok;
        expect(info.rows.length).to.equal(2);
        expect(info.rows[0].dataValues).to.not.have.property('username');
        expect(info.rows[1].dataValues).to.not.have.property('username');
      });
    });
  });

  describe('all', () => {
    beforeEach(function() {
      return User.bulkCreate([
        {username: 'user', data: 'foobar'},
        {username: 'user2', data: 'bar'},
      ]);
    });

    if (current.dialect.supports.transactions) {
      it('supports transactions', function() {
        return Support.prepareTransactionTest(current).bind({}).then(sequelize => {
          User = (sequelize as Sequelize).define<ItestInstance, ItestAttribute>('User', { username: new DataTypes.STRING() });

          return User.sync({ force: true }).then(() => {
            return sequelize.transaction().then(t => {
              return User.create({ username: 'foo' }, { transaction: t }).then(() => {
                return User.findAll().then(users1 => {
                  return User.findAll({ transaction: t }).then(users2 => {
                    expect(users1.length).to.equal(0);
                    expect(users2.length).to.equal(1);
                    return t.rollback();
                  });
                });
              });
            });
          });
        });
      });
    }

    it('should return all users', function() {
      return User.findAll().then(users => {
        expect(users.length).to.equal(2);
      });
    });
  });

  it('should support logging', function() {
    const spy = sinon.spy();

    return User.findAll({
      where: {},
      logging: spy
    }).then(() => {
      expect(spy.called).to.be.ok;
    });
  });

  describe('rejectOnEmpty mode', () => {
    it('works from model options', () => {
      const _Model = current.define<ItestInstance, ItestAttribute>('Test', {
        username: new DataTypes.STRING(100)
      }, {
        rejectOnEmpty: true
      });

      return _Model.sync({ force: true })
        .then(() => {
          return expect(_Model.findAll({
            where: {
              username: 'some-username-that-is-not-used-anywhere'
            }
          })).to.eventually.be.rejectedWith(Sequelize.EmptyResultError);
        });
    });

    it('throws custom error with initialized', () => {

      const _Model = current.define<ItestInstance, ItestAttribute>('Test', {
        username: new DataTypes.STRING(100)
      }, {
        rejectOnEmpty: new Sequelize.ConnectionError('Some Error') //using custom error instance
      });

      return _Model.sync({ force: true })
        .then(() => {
          return expect(_Model.findAll({
            where: {
              username: 'some-username-that-is-not-used-anywhere-for-sure-this-time'
            }
          })).to.eventually.be.rejectedWith(Sequelize.ConnectionError);
        });
    });

    it('throws custom error with instance', () => {

      const _Model = current.define<ItestInstance, ItestAttribute>('Test', {
        username: new DataTypes.STRING(100)
      }, {
        rejectOnEmpty: Sequelize.ConnectionError //using custom error instance
      });

      return _Model.sync({ force: true })
        .then(() => {
          return expect(_Model.findAll({
            where: {
              username: 'some-username-that-is-not-used-anywhere-for-sure-this-time'
            }
          })).to.eventually.be.rejectedWith(Sequelize.ConnectionError);
        });
    });

  });

});
