'use strict';

import * as assert from 'assert';
import * as chai from 'chai';
import * as _ from 'lodash';
import * as sinon from 'sinon';
import { Model, Sequelize } from '../../../index';
import DataTypes from '../../../lib/data-types';
import { ItestAttribute, ItestInstance } from '../../dummy/dummy-data-set';
import Support from '../support';
const expect = chai.expect;
const dialect = Support.getTestDialect();
const Promise = Sequelize.Promise;
let current = Support.sequelize;

describe(Support.getTestDialectTeaser('Model'), () => {
  let User : Model<ItestInstance, ItestAttribute>;
  let Account : Model<ItestInstance, ItestAttribute>;
  let Student : Model<ItestInstance, ItestAttribute>;
  beforeEach(function() {
    return Support.prepareTransactionTest(current).then(sequelize => {
      current = sequelize;

      User = current.define<ItestInstance, ItestAttribute>('User', {
        username: new DataTypes.STRING(),
        secretValue: new DataTypes.STRING(),
        data: new DataTypes.STRING(),
        intVal: new DataTypes.INTEGER(),
        theDate: new DataTypes.DATE(),
        aBool: new DataTypes.BOOLEAN(),
        uniqueName: { type: new DataTypes.STRING(), unique: true }
      });
      Account = current.define<ItestInstance, ItestAttribute>('Account', {
        accountName: new DataTypes.STRING()
      });
      Student = current.define<ItestInstance, ItestAttribute>('Student', {
        no: {type: new DataTypes.INTEGER(), primaryKey: true},
        name: {type: new DataTypes.STRING(), allowNull: false}
      });

      return current.sync({ force: true });
    });
  });

  describe('findOrCreate', () => {
    if (current.dialect.supports.transactions) {
      it('supports transactions', function() {
        return current.transaction().then(t => {
          return User.findOrCreate({
            where: {
              username: 'Username'
            },
            defaults: {
              data: 'some data'
            },
            transaction: t
          }).then(() => {
            return User.count().then(count => {
              expect(count).to.equal(0);
              return t.commit().then(() => {
                return User.count().then(_count => {
                  expect(_count).to.equal(1);
                });
              });
            });
          });
        });
      });

      it('supports more than one models per transaction', function() {
        return current.transaction().then(t => {
          return User.findOrCreate({ where: { username: 'Username'}, defaults: { data: 'some data' }, transaction: t }).then(() => {
            return Account.findOrCreate({ where: { accountName: 'accountName'}, transaction: t}).then(() => {
              return t.commit();
            });
          });
        });
      });
    }

    it('should error correctly when defaults contain a unique key', function() {
      User = current.define<ItestInstance, ItestAttribute>('user', {
        objectId: {
          type: new DataTypes.STRING(),
          unique: true
        },
        username: {
          type: new DataTypes.STRING(),
          unique: true
        }
      });

      return User.sync({force: true}).then(() => {
        return User.create({
          username: 'gottlieb'
        });
      }).then(() => {
        return expect(User.findOrCreate({
          where: {
            objectId: 'asdasdasd'
          },
          defaults: {
            username: 'gottlieb'
          }
        })).to.eventually.be.rejectedWith(Sequelize.UniqueConstraintError);
      });
    });

    it('should error correctly when defaults contain a unique key and a non-existent field', function() {
      User = current.define<ItestInstance, ItestAttribute>('user', {
        objectId: {
          type: new DataTypes.STRING(),
          unique: true
        },
        username: {
          type: new DataTypes.STRING(),
          unique: true
        }
      });

      return User.sync({force: true}).then(() => {
        return User.create({
          username: 'gottlieb'
        });
      }).then(() => {
        return expect(User.findOrCreate({
          where: {
            objectId: 'asdasdasd'
          },
          defaults: {
            username: 'gottlieb',
            foo: 'bar', // field that's not a defined attribute
            bar: 121
          }
        })).to.eventually.be.rejectedWith(current.UniqueConstraintError);
      });
    });

    it('should error correctly when defaults contain a unique key and the where clause is complex', function() {
      User = current.define<ItestInstance, ItestAttribute>('user', {
        objectId: {
          type: new DataTypes.STRING(),
          unique: true
        },
        username: {
          type: new DataTypes.STRING(),
          unique: true
        }
      });

      return User.sync({force: true})
        .then(() => User.create({ username: 'gottlieb' }))
        .then(() => User.findOrCreate({
          where: {
            $or: [{
              objectId: 'asdasdasd1'
            }, {
              objectId: 'asdasdasd2'
            }]
          },
          defaults: {
            username: 'gottlieb'
          }
        }).catch(error => {
          expect(error).to.be.instanceof(Sequelize.UniqueConstraintError);
          expect(error.errors[0].path).to.be.a('string', 'username');
        }));
    });

    it('should work with undefined uuid primary key in where', function() {
      User = current.define<ItestInstance, ItestAttribute>('User', {
        id: {
          type: new DataTypes.UUID(),
          primaryKey: true,
          allowNull: false,
          defaultValue: new DataTypes.UUIDV4()
        },
        name: {
          type: new DataTypes.STRING()
        }
      });

      return User.sync({force: true}).then(() => {
        return User.findOrCreate({
          where: {
            id: undefined
          },
          defaults: {
            name: Math.random().toString()
          }
        });
      });
    });

    if (['sqlite', 'mssql', 'oracle'].indexOf(current.dialect.name) === -1) {
      it('should not deadlock with no existing entries and no outer transaction', function() {
        User = current.define<ItestInstance, ItestAttribute>('User', {
          email: {
            type: new DataTypes.STRING(),
            unique: 'company_user_email'
          },
          companyId: {
            type: new DataTypes.INTEGER(),
            unique: 'company_user_email'
          }
        });

        return User.sync({force: true}).then(() => {
          return Promise.map(_.range(50), i => {
            return User.findOrCreate({
              where: {
                email: 'unique.email.' + i + '@sequelizejs.com',
                companyId: Math.floor(Math.random() * 5)
              }
            });
          });
        });
      });

      it('should not deadlock with existing entries and no outer transaction', function() {
        User = current.define<ItestInstance, ItestAttribute>('User', {
          email: {
            type: new DataTypes.STRING(),
            unique: 'company_user_email'
          },
          companyId: {
            type: new DataTypes.INTEGER(),
            unique: 'company_user_email'
          }
        });

        return User.sync({force: true}).then(() => {
          return Promise.map(_.range(50), i => {
            return User.findOrCreate({
              where: {
                email: 'unique.email.' + i + '@sequelizejs.com',
                companyId: 2
              }
            });
          }).then(() => {
            return Promise.map(_.range(50), i => {
              return User.findOrCreate({
                where: {
                  email: 'unique.email.' + i + '@sequelizejs.com',
                  companyId: 2
                }
              });
            });
          });
        });
      });

      it('should not deadlock with concurrency duplicate entries and no outer transaction', function() {
        User = current.define<ItestInstance, ItestAttribute>('User', {
          email: {
            type: new DataTypes.STRING(),
            unique: 'company_user_email'
          },
          companyId: {
            type: new DataTypes.INTEGER(),
            unique: 'company_user_email'
          }
        });

        return User.sync({force: true}).then(() => {
          return Promise.map(_.range(50), () => {
            return User.findOrCreate({
              where: {
                email: 'unique.email.1@sequelizejs.com',
                companyId: 2
              }
            });
          });
        });
      });
    }


    it('should support special characters in defaults', function() {
      User = current.define<ItestInstance, ItestAttribute>('user', {
        objectId: {
          type: new DataTypes.INTEGER(),
          unique: true
        },
        description: {
          type: new DataTypes.TEXT()
        }
      });

      return User.sync({force: true}).then(() => {
        return User.findOrCreate({
          where: {
            objectId: 1
          },
          defaults: {
            description: '$$ and !! and :: and ? and ^ and * and \''
          }
        });
      });
    });

    it('should support bools in defaults', function() {
      User = current.define<ItestInstance, ItestAttribute>('user', {
        objectId: {
          type: new DataTypes.INTEGER(),
          unique: true
        },
        bool: new DataTypes.BOOLEAN()
      });

      return User.sync({force: true}).then(() => {
        return User.findOrCreate({
          where: {
            objectId: 1
          },
          defaults: {
            bool: false
          }
        });
      });
    });

    it('returns instance if already existent. Single find field.', function() {
      const data = {
        username: 'Username'
      };

      return User.create(data).then(user => {
        return User.findOrCreate({ where: {
          username: user.username
        }}).spread((_user, created) => {
          expect((_user as ItestInstance).id).to.equal(user.id);
          expect((_user as ItestInstance).username).to.equal('Username');
          expect(created).to.be.false;
        });
      });
    });

    it('Returns instance if already existent. Multiple find fields.', function() {
      const data = {
        username: 'Username',
        data: 'ThisIsData'
      };

      return User.create(data).then(user => {
        return User.findOrCreate({where: data}).spread((_user, created) => {
          expect((_user as ItestInstance).id).to.equal(user.id);
          expect((_user as ItestInstance).username).to.equal('Username');
          expect((_user as ItestInstance).data).to.equal('ThisIsData');
          expect(created).to.be.false;
        });
      });
    });

    it('does not include exception catcher in response', function() {
      const data = {
        username: 'Username',
        data: 'ThisIsData'
      };

      return User.findOrCreate({
        where: data,
        defaults: {}
      }).spread(user => {
        expect((user as ItestInstance).dataValues.sequelize_caught_exception).to.be.undefined;
      }).then(() => {
        return User.findOrCreate({
          where: data,
          defaults: {}
        }).spread(user => {
          expect((user as ItestInstance).dataValues.sequelize_caught_exception).to.be.undefined;
        });
      });
    });

    it('creates new instance with default value.', function() {
      const data = {
        username: 'Username'
      };
      const default_values = {
        data: 'ThisIsData'
      };

      return User.findOrCreate({ where: data, defaults: default_values}).spread((user, created) => {
        expect((user as ItestInstance).username).to.equal('Username');
        expect((user as ItestInstance).data).to.equal('ThisIsData');
        expect(created).to.be.true;
      });
    });

    it('supports .or() (only using default values)', function() {
      return User.findOrCreate({
        where: Sequelize.or({username: 'Fooobzz'}, {secretValue: 'Yolo'}),
        defaults: {username: 'Fooobzz', secretValue: 'Yolo'}
      }).spread((user, created) => {
        expect((user as ItestInstance).username).to.equal('Fooobzz');
        expect((user as ItestInstance).secretValue).to.equal('Yolo');
        expect(created).to.be.true;
      });
    });

    if (current.dialect.supports.transactions) {
      it('should release transaction when meeting errors', function() {
        const test = function(times) {
          if (times > 10) {
            return true;
          }
          return Student.findOrCreate({
            where: {
              no: 1
            }
          })
            .timeout(1000)
            .catch (Promise.TimeoutError, e => {
              throw new Error(e as any);
            })
            .catch (Sequelize.ValidationError, () => {
              return test(times + 1);
            });
        };

        return test(0);
      });
    }

    describe('several concurrent calls', () => {
      if (current.dialect.supports.transactions) {
        it('works with a transaction', function() {
          return current.transaction().bind(this).then(function(transaction) {
            return Promise.join(
              User.findOrCreate({ where: { uniqueName: 'winner' }, transaction }),
              User.findOrCreate({ where: { uniqueName: 'winner' }, transaction }),
              (first, second) => {
                const firstInstance = first[0];
                const firstCreated = first[1];
                const secondInstance = second[0];
                const secondCreated = second[1];

                // Depending on execution order and MAGIC either the first OR the second call should return true
                expect(firstCreated ? !secondCreated : secondCreated).to.be.ok; // XOR

                expect(firstInstance).to.be.ok;
                expect(secondInstance).to.be.ok;

                expect(firstInstance.id).to.equal(secondInstance.id);

                return transaction.commit();
              }
            );
          });
        });
      }

      (dialect !== 'sqlite' && dialect !== 'mssql' && dialect !== 'oracle' ? it : it.skip)('should not fail silently with concurrency higher than pool, a unique constraint and a create hook resulting in mismatched values', function() {
        User = current.define<ItestInstance, ItestAttribute>('user', {
          username: {
            type: new DataTypes.STRING(),
            unique: true,
            field: 'user_name'
          }
        });

        User.beforeCreate(instance => {
          instance.set('username', instance.get('username').trim());
        });

        const spy = sinon.spy();

        const names = [
          'mick ',
          'mick ',
          'mick ',
          'mick ',
          'mick ',
          'mick ',
          'mick ',
        ];

        return User.sync({force: true}).then(() => {
          return Promise.all(
            names.map(username => {
              return User.findOrCreate({where: {username}}).catch(err => {
                spy();
                expect(err.message).to.equal('user#findOrCreate: value used for username was not equal for both the find and the create calls, \'mick \' vs \'mick\'');
              });
            })
          );
        }).then(() => {
          expect(spy).to.have.been.called;
        });
      });

      (dialect !== 'sqlite' ? it : it.skip)('should error correctly when defaults contain a unique key without a transaction', function() {
        User = current.define<ItestInstance, ItestAttribute>('user', {
          objectId: {
            type: new DataTypes.STRING(),
            unique: true
          },
          username: {
            type: new DataTypes.STRING(),
            unique: true
          }
        });

        return User.sync({force: true}).then(() => {
          return User.create({
            username: 'gottlieb'
          });
        }).then(() => {
          return Promise.join(
            User.findOrCreate({
              where: {
                objectId: 'asdasdasd'
              },
              defaults: {
                username: 'gottlieb'
              }
            }).then(() => {
              throw new Error('I should have ben rejected');
            }).catch(err => {
              expect(err instanceof Sequelize.UniqueConstraintError).to.be.ok;
              expect(err.fields).to.be.ok;
            }),
            User.findOrCreate({
              where: {
                objectId: 'asdasdasd'
              },
              defaults: {
                username: 'gottlieb'
              }
            }).then(() => {
              throw new Error('I should have ben rejected');
            }).catch(err => {
              expect(err instanceof Sequelize.UniqueConstraintError).to.be.ok;
              expect(err.fields).to.be.ok;
            })
          );
        });
      });

      // Creating two concurrent transactions and selecting / inserting from the same table throws sqlite off
      (dialect !== 'sqlite' ? it : it.skip)('works without a transaction', function() {
        return Promise.join(
          User.findOrCreate({ where: { uniqueName: 'winner' }}),
          User.findOrCreate({ where: { uniqueName: 'winner' }}),
          (first, second) => {
            const firstInstance = first[0];
            const firstCreated = first[1];
            const secondInstance = second[0];
            const secondCreated = second[1];

            // Depending on execution order and MAGIC either the first OR the second call should return true
            expect(firstCreated ? !secondCreated : secondCreated).to.be.ok; // XOR

            expect(firstInstance).to.be.ok;
            expect(secondInstance).to.be.ok;

            expect(firstInstance.id).to.equal(secondInstance.id);
          }
        );
      });
    });
  });

  describe('findCreateFind', () => {
    (dialect !== 'sqlite' ? it : it.skip)('should work with multiple concurrent calls', function() {
      return Promise.join(
        User.findOrCreate({ where: { uniqueName: 'winner' }}),
        User.findOrCreate({ where: { uniqueName: 'winner' }}),
        User.findOrCreate({ where: { uniqueName: 'winner' }}),
        (first, second, third) => {
          const firstInstance = first[0];
          const firstCreated = first[1];
          const secondInstance = second[0];
          const secondCreated = second[1];
          const thirdInstance = third[0];
          const thirdCreated = third[1];

          expect([firstCreated, secondCreated, thirdCreated].filter(value => {
            return value;
          }).length).to.equal(1);

          expect(firstInstance).to.be.ok;
          expect(secondInstance).to.be.ok;
          expect(thirdInstance).to.be.ok;

          expect(firstInstance.id).to.equal(secondInstance.id);
          expect(secondInstance.id).to.equal(thirdInstance.id);
        }
      );
    });
  });

  describe('create', () => {
    it('works with non-integer primary keys with a default value', function() {
      User = current.define<ItestInstance, ItestAttribute>('User', {
        id: {
          primaryKey: true,
          type: new DataTypes.UUID(),
          defaultValue: new DataTypes.UUIDV4()
        },
        email: {
          type: new DataTypes.UUID(),
          defaultValue: new DataTypes.UUIDV4()
        }
      });

      return current.sync({force: true}).then(() => {
        return User.create({}).then(user => {
          expect(user).to.be.ok;
          expect(user.id).to.be.ok;
        });
      });
    });

    it('should return an error for a unique constraint error', function() {
      User = current.define<ItestInstance, ItestAttribute>('User', {
        email: {
          type: new DataTypes.STRING(),
          unique: { name: 'email', msg: 'Email is already registered.' },
          validate: {
            notEmpty: true,
            isEmail: true
          }
        }
      });

      return current.sync({force: true}).then(() => {
        return User.create({email: 'hello@current.com'}).then(() => {
          return User.create({email: 'hello@current.com'}).then(() => {
            assert(false);
          }).catch(err => {
            expect(err).to.be.ok;
            expect(err).to.be.an.instanceof(Error);
          });
        });
      });
    });

    it('works without any primary key', function() {
      const Log = current.define<ItestInstance, ItestAttribute>('log', {
        level: new DataTypes.STRING()
      });

      Log.removeAttribute('id');

      return current.sync({force: true}).then(() => {
        return (Promise as any).join(
          Log.create({level: 'info'}),
          Log.bulkCreate([
            {level: 'error'},
            {level: 'debug'},
          ])
        );
      }).then(() => {
        return Log.findAll();
      }).then(logs => {
        logs.forEach(log => {
          expect(log.get('id')).not.to.be.ok;
        });
      });
    });

    it('should be able to set createdAt and updatedAt if using silent: true', function() {
      User = current.define<ItestInstance, ItestAttribute>('user', {
        name: new DataTypes.STRING()
      }, {
        timestamps: true
      });

      const createdAt = new Date(2012, 10, 10, 10, 10, 10);
      const updatedAt = new Date(2011, 11, 11, 11, 11, 11);

      return User.sync({force: true}).then(() => {
        return User.create({
          createdAt,
          updatedAt
        }, {
          silent: true
        }).then(user => {
          expect(createdAt.getTime()).to.equal(user.get('createdAt').getTime());
          expect(updatedAt.getTime()).to.equal(user.get('updatedAt').getTime());

          return User.findOne({
            where: {
              updatedAt: {
                ne: null
              }
            }
          }).then(_user => {
            expect(createdAt.getTime()).to.equal(_user.get('createdAt').getTime());
            expect(updatedAt.getTime()).to.equal(_user.get('updatedAt').getTime());
          });
        });
      });
    });

    it('works with custom timestamps with a default value', function() {
      User = current.define<ItestInstance, ItestAttribute>('User', {
        username: new DataTypes.STRING(),
        date_of_birth: new DataTypes.DATE(),
        email: new DataTypes.STRING(),
        password: new DataTypes.STRING(),
        created_time: {
          type: new DataTypes.DATE(),
          allowNull: true,
          defaultValue: new DataTypes.NOW()
        },
        updated_time: {
          type: new DataTypes.DATE(),
          allowNull: true,
          defaultValue: new DataTypes.NOW()
        }
      }, {
        createdAt: 'created_time',
        updatedAt: 'updated_time',
        tableName: 'users',
        underscored: true,
        freezeTableName: true,
        force: false
      });

      return current.sync({force: true}).then(() => {
        return User.create({}).then(user => {
          expect(user).to.be.ok;
          expect(user.created_time).to.be.ok;
          expect(user.updated_time).to.be.ok;
          expect(user.created_time.getMilliseconds()).not.to.equal(0);
          expect(user.updated_time.getMilliseconds()).not.to.equal(0);
        });
      });
    });

    it('works with custom timestamps and underscored', function() {
      User = current.define<ItestInstance, ItestAttribute>('User', {

      }, {
        createdAt: 'createdAt',
        updatedAt: 'updatedAt',
        underscored: true
      });

      return current.sync({force: true}).then(() => {
        return User.create({}).then(user => {
          expect(user).to.be.ok;
          expect(user.createdAt).to.be.ok;
          expect(user.updatedAt).to.be.ok;

          expect(user.created_at).not.to.be.ok;
          expect(user.updated_at).not.to.be.ok;
        });
      });
    });

    if (current.dialect.supports.transactions) {
      it('supports transactions', function() {
        return current.transaction().then(t => {
          return User.create({ username: 'user' }, { transaction: t }).then(() => {
            return User.count().then(count => {
              expect(count).to.equal(0);
              return t.commit().then(() => {
                return User.count().then(_count => {
                  expect(_count).to.equal(1);
                });
              });
            });
          });
        });
      });
    }

    if (current.dialect.supports.returnValues) {
      describe('return values', () => {
        it('should make the autoincremented values available on the returned instances', function() {
          User = current.define<ItestInstance, ItestAttribute>('user', {});

          return User.sync({force: true}).then(() => {
            return User.create({}, {returning: true}).then(user => {
              expect(user.get('id')).to.be.ok;
              expect(user.get('id')).to.equal(1);
            });
          });
        });

        it('should make the autoincremented values available on the returned instances with custom fields', function() {
          User = current.define<ItestInstance, ItestAttribute>('user', {
            maId: {
              type: new DataTypes.INTEGER(),
              primaryKey: true,
              autoIncrement: true,
              field: 'yo_id'
            }
          });

          return User.sync({force: true}).then(() => {
            return User.create({}, {returning: true}).then(user => {
              expect(user.get('maId')).to.be.ok;
              expect(user.get('maId')).to.equal(1);
            });
          });
        });
      });
    }

    it('is possible to use casting when creating an instance', function() {
      const type = dialect === 'mysql' ? 'signed' : 'integer';
      let match = false;

      return User.create({
        intVal: current.cast('1', type)
      }, {
        logging(sql) {
          expect(sql).to.match(new RegExp("CAST\\(N?'1' AS " + type.toUpperCase() + '\\)'));
          match = true;
        }
      }).then(user => {
        return User.findById(user.id).then(_user => {
          expect(_user.intVal).to.equal(1);
          expect(match).to.equal(true);
        });
      });
    });

    it('is possible to use casting multiple times mixed in with other utilities', function() {
      let type = current.cast(current.cast(current.literal('1-2'), 'integer'), 'integer');
      let match = false;

      if (dialect === 'mysql') {
        type = current.cast(current.cast(current.literal('1-2'), 'unsigned'), 'signed');
      }

      return User.create({
        intVal: type
      }, {
        logging(sql) {
          if (dialect === 'mysql') {
            expect(sql).to.contain('CAST(CAST(1-2 AS UNSIGNED) AS SIGNED)');
          } else {
            expect(sql).to.contain('CAST(CAST(1-2 AS INTEGER) AS INTEGER)');
          }
          match = true;
        }
      }).then(user => {
        return User.findById(user.id).then(_user => {
          expect(_user.intVal).to.equal(-1);
          expect(match).to.equal(true);
        });
      });
    });

    it('is possible to just use .literal() to bypass escaping', function() {
      return User.create({
        intVal: current.literal('CAST(1-2 AS ' + (dialect === 'mysql' ? 'SIGNED' : 'INTEGER') + ')')
      }).then(user => {
        return User.findById(user.id).then(_user => {
          expect(_user.intVal).to.equal(-1);
        });
      });
    });

    it('is possible to use funtions when creating an instance', function() {
      return User.create({
        secretValue: current.fn('upper', 'sequelize')
      }).then(user => {
        return User.findById(user.id).then(_user => {
          expect(_user.secretValue).to.equal('SEQUELIZE');
        });
      });
    });

    it('should work with a non-id named uuid primary key columns', function() {
      const Monkey = current.define<ItestInstance, ItestAttribute>('Monkey', {
        monkeyId: { type: new DataTypes.UUID(), primaryKey: true, defaultValue: new DataTypes.UUIDV4(), allowNull: false }
      });

      return current.sync({force: true}).then(() => {
        return Monkey.create();
      }).then(monkey => {
        expect(monkey.get('monkeyId')).to.be.ok;
      });
    });

    it('is possible to use functions as default values', function() {
      let userWithDefaults;

      if (dialect.indexOf('postgres') === 0) {
        return current.query('CREATE EXTENSION IF NOT EXISTS "uuid-ossp"').then(() => {
          userWithDefaults = current.define<ItestInstance, ItestAttribute>('userWithDefaults', {
            uuid: {
              type: 'UUID',
              defaultValue: current.fn('uuid_generate_v4')
            }
          });

          return userWithDefaults.sync({force: true}).then(() => {
            return userWithDefaults.create({}).then(user => {
              // uuid validation regex taken from http://stackoverflow.com/a/13653180/800016
              expect(user.uuid).to.match(/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i);
            });
          });
        });
      } else if (dialect === 'sqlite') {
        // The definition here is a bit hacky. sqlite expects () around the expression for default values, so we call a function without a name
        // to enclose the date function in (). http://www.sqlite.org/syntaxdiagrams.html#column-constraint
        userWithDefaults = current.define<ItestInstance, ItestAttribute>('userWithDefaults', {
          year: {
            type: new DataTypes.STRING(),
            defaultValue: current.fn('', current.fn('date', 'now'))
          }
        });

        return userWithDefaults.sync({force: true}).then(() => {
          return userWithDefaults.create({}).then(user => {
            return userWithDefaults.findById(user.id).then(_user => {
              const now = new Date();
              const pad = function(number) {
                if (number > 9) {
                  return number;
                }
                return '0' + number;
              };

              expect(_user.year).to.equal(now.getUTCFullYear() + '-' + pad(now.getUTCMonth() + 1) + '-' + pad(now.getUTCDate()));
            });
          });
        });
      } else {
        // functions as default values are not supported in mysql, see http://stackoverflow.com/a/270338/800016
        return void 0;
      }
    });

    if (dialect === 'postgres') {
      it('does not cast arrays for postgresql insert', function() {
        User = current.define<ItestInstance, ItestAttribute>('UserWithArray', {
          myvals: { type: new DataTypes.ARRAY(new DataTypes.INTEGER()) },
          mystr: { type: new DataTypes.ARRAY(new DataTypes.STRING()) }
        });

        let test = false;
        return User.sync({force: true}).then(() => {
          return User.create({myvals: [], mystr: []}, {
            logging(sql) {
              test = true;
              expect(sql).to.contain('INSERT INTO "UserWithArrays" ("id","myvals","mystr","createdAt","updatedAt") VALUES (DEFAULT,$1,$2,$3,$4)');
            }
          });
        }).then(() => {
          expect(test).to.be.true;
        });
      });

      it('does not cast arrays for postgres update', function() {
        User = current.define<ItestInstance, ItestAttribute>('UserWithArray', {
          myvals: { type: new DataTypes.ARRAY(new DataTypes.INTEGER()) },
          mystr: { type: new DataTypes.ARRAY(new DataTypes.STRING()) }
        });
        let test = false;

        return User.sync({force: true}).then(() => {
          return User.create({myvals: [1, 2, 3, 4], mystr: ['One', 'Two', 'Three', 'Four']}).then(user => {
            user.myvals = [];
            user.mystr = [];
            return user.save({
              logging(sql) {
                test = true;
                expect(sql).to.contain('UPDATE "UserWithArrays" SET "myvals"=$1,"mystr"=$2,"updatedAt"=$3 WHERE "id" = $4');
              }
            });
          });
        }).then(() => {
          expect(test).to.be.true;
        });
      });
    }

    it("doesn't allow duplicated records with unique:true", function() {
      User = current.define<ItestInstance, ItestAttribute>('UserWithUniqueUsername', {
        username: { type: new DataTypes.STRING(), unique: true }
      });

      return User.sync({ force: true }).then(() => {
        return User.create({ username: 'foo' }).then(() => {
          return User.create({ username: 'foo' }).catch(current.UniqueConstraintError, err => {
            expect(err).to.be.ok;
          });
        });
      });
    });

    it('raises an error if created object breaks definition contraints', function() {
      const UserNull = current.define<ItestInstance, ItestAttribute>('UserWithNonNullSmth', {
        username: { type: new DataTypes.STRING(), unique: true },
        smth: { type: new DataTypes.STRING(), allowNull: false }
      });

      current.options.omitNull = false;

      return UserNull.sync({ force: true }).then(() => {
        return UserNull.create({ username: 'foo2', smth: null }).catch(err => {
          expect(err).to.exist;

          const smth1 = err.get('smth')[0] || {};

          expect(smth1.path).to.equal('smth');
          expect(smth1.type || smth1.origin).to.match(/notNull Violation/);
        });
      });
    });

    it('raises an error if created object breaks definition contraints', function() {
      const UserNull = current.define<ItestInstance, ItestAttribute>('UserWithNonNullSmth', {
        username: { type: new DataTypes.STRING(), unique: true },
        smth: { type: new DataTypes.STRING(), allowNull: false }
      });

      current.options.omitNull = false;

      return UserNull.sync({ force: true }).then(() => {
        return UserNull.create({ username: 'foo', smth: 'foo' }).then(() => {
          return UserNull.create({ username: 'foo', smth: 'bar' }).catch (current.UniqueConstraintError, err => {
            expect(err).to.be.ok;
          });
        });
      });
    });

    it('raises an error if saving an empty string into a column allowing null or URL', function() {
      const StringIsNullOrUrl = current.define<ItestInstance, ItestAttribute>('StringIsNullOrUrl', {
        str: { type: new DataTypes.STRING(), allowNull: true, validate: { isURL: true } }
      });

      current.options.omitNull = false;

      return StringIsNullOrUrl.sync({ force: true }).then(() => {
        return StringIsNullOrUrl.create({ str: null }).then(str1 => {
          expect(str1.str).to.be.null;
          return StringIsNullOrUrl.create({ str: 'http://sequelizejs.org' }).then(str2 => {
            expect(str2.str).to.equal('http://sequelizejs.org');
            return StringIsNullOrUrl.create({ str: '' }).catch(err => {
              expect(err).to.exist;
              expect(err.get('str')[0].message).to.match(/Validation isURL on str failed/);
            });
          });
        });
      });
    });

    it('raises an error if you mess up the datatype', function() {
      expect(() => {
        current.define<ItestInstance, ItestAttribute>('UserBadDataType', {
          activity_date: (DataTypes as any).DATe
        });
      }).to.throw(Error, 'Unrecognized data type for field activity_date');

      expect(() => {
        current.define<ItestInstance, ItestAttribute>('UserBadDataType', {
          activity_date: {type: (DataTypes as any).DATe}
        });
      }).to.throw(Error, 'Unrecognized data type for field activity_date');
    });

    it('sets a 64 bit int in bigint', function() {
      User = current.define<ItestInstance, ItestAttribute>('UserWithBigIntFields', {
        big: new DataTypes.BIGINT()
      });

      return User.sync({ force: true }).then(() => {
        return User.create({ big: '9223372036854775807' }).then(user => {
          expect(user.big).to.be.equal('9223372036854775807');
        });
      });
    });

    it('sets auto increment fields', function() {
      User = current.define<ItestInstance, ItestAttribute>('UserWithAutoIncrementField', {
        userid: { type: new DataTypes.INTEGER(), autoIncrement: true, primaryKey: true, allowNull: false }
      });

      return User.sync({ force: true }).then(() => {
        return User.create({}).then(user => {
          expect(user.userid).to.equal(1);
          return User.create({}).then(_user => {
            expect(_user.userid).to.equal(2);
          });
        });
      });
    });

    it('allows the usage of options as attribute', function() {
      User = current.define<ItestInstance, ItestAttribute>('UserWithNameAndOptions', {
        name: new DataTypes.STRING(),
        options: new DataTypes.TEXT()
      });

      const options = JSON.stringify({ foo: 'bar', bar: 'foo' });

      return User.sync({ force: true }).then(() => {
        return User
          .create({ name: 'John Doe', options })
          .then(user => {
            expect(user.options).to.equal(options);
          });
      });
    });

    //Oracle -> table names are restricted to 30 chars
    if (current.dialect.name !== 'oracle') {
      it('allows sql logging', function() {
        User = current.define<ItestInstance, ItestAttribute>('UserWithUniqueNameAndNonNullSmth', {
          name: {type: new DataTypes.STRING(), unique: true},
          smth: {type: new DataTypes.STRING(), allowNull: false}
        });

        let test = false;
        return User.sync({ force: true }).then(() => {
          return User.create({ name: 'Fluffy Bunny', smth: 'else' }, {
            logging(sql) {
              expect(sql).to.exist;
              test = true;
              expect(sql.toUpperCase().indexOf('INSERT')).to.be.above(-1);
            }
          });
        }).then(() => {
          expect(test).to.be.true;
        });
      });
    }

    it('should only store the values passed in the whitelist', function() {
      const data = { username: 'Peter', secretValue: '42' };

      return User.create(data, { fields: ['username'] }).then(user => {
        return User.findById(user.id).then(_user => {
          expect(_user.username).to.equal(data.username);
          expect(_user.secretValue).not.to.equal(data.secretValue);
          expect(_user.secretValue).to.equal(null);
        });
      });
    });

    it('should store all values if no whitelist is specified', function() {
      const data = { username: 'Peter', secretValue: '42' };

      return User.create(data).then(user => {
        return User.findById(user.id).then(_user => {
          expect(_user.username).to.equal(data.username);
          expect(_user.secretValue).to.equal(data.secretValue);
        });
      });
    });

    it('can omit autoincremental columns', function() {
      const data : {
        title? : string,
        author? : string,
      } = {
        title: 'Iliad'
      };
      const dataTypes = [DataTypes.INTEGER, DataTypes.BIGINT];
      const sync = [];
      const promises = [];
      const books = [];

      dataTypes.forEach((dataType, index) => {
        books[index] = current.define<ItestInstance, ItestAttribute>('Book' + index, {
          id: { type: dataType, primaryKey: true, autoIncrement: true },
          title: new DataTypes.TEXT()
        });
      });

      books.forEach(b => {
        sync.push(b.sync({ force: true }));
      });

      return Promise.all(sync).then(() => {
        books.forEach((b, index) => {
          promises.push(b.create(data).then(book => {
            expect(book.title).to.equal(data.title);
            expect(book.author).to.equal(data.author);
            expect(books[index].rawAttributes.id.type instanceof dataTypes[index]).to.be.ok;
          }));
        });
        return Promise.all(promises);
      });
    });

    it('saves data with single quote', function() {
      const quote = "single'quote";
      return User.create({ data: quote }).then(user => {
        expect(user.data).to.equal(quote);
        return User.find({where: { id: user.id }}).then(_user => {
          expect(_user.data).to.equal(quote);
        });
      });
    });

    it('saves data with double quote', function() {
      const quote = 'double"quote';
      return User.create({ data: quote }).then(user => {
        expect(user.data).to.equal(quote);
        return User.find({where: { id: user.id }}).then(_user => {
          expect(_user.data).to.equal(quote);
        });
      });
    });

    it('saves stringified JSON data', function() {
      const json = JSON.stringify({ key: 'value' });
      return User.create({ data: json }).then(user => {
        expect(user.data).to.equal(json);
        return User.find({where: { id: user.id }}).then(_user => {
          expect(_user.data).to.equal(json);
        });
      });
    });

    it('stores the current date in createdAt', function() {
      return User.create({ username: 'foo' }).then(user => {
        expect(Math.floor(user.createdAt / 5000)).to.be.closeTo(Math.floor(new Date().getTime() / 5000), 1.5);
      });
    });

    it('allows setting custom IDs', function() {
      return User.create({ id: 42 }).then(user => {
        expect(user.id).to.equal(42);
        return User.findById(42).then(_user => {
          expect(_user).to.exist;
        });
      });
    });

    it('should allow blank creates (with timestamps: false)', function() {
      const Worker = current.define<ItestInstance, ItestAttribute>('Worker', {}, {timestamps: false});
      return Worker.sync().then(() => {
        return Worker.create({}, {fields: []}).then(worker => {
          expect(worker).to.be.ok;
        });
      });
    });

    it('should allow truly blank creates', function() {
      const Worker = current.define<ItestInstance, ItestAttribute>('Worker', {}, {timestamps: false});
      return Worker.sync().then(() => {
        return Worker.create({}, {fields: []}).then(worker => {
          expect(worker).to.be.ok;
        });
      });
    });

    it('should only set passed fields', function() {
      User = current.define<ItestInstance, ItestAttribute>('User', {
        email: {
          type: new DataTypes.STRING()
        },
        name: {
          type: new DataTypes.STRING()
        }
      });

      return current.sync({force: true}).then(() => {
        return User.create({
          name: 'Yolo Bear',
          email: 'yolo@bear.com'
        }, {
          fields: ['name']
        }).then(user => {
          expect(user.name).to.be.ok;
          expect(user.email).not.to.be.ok;
          return User.findById(user.id).then(_user => {
            expect(_user.name).to.be.ok;
            expect(_user.email).not.to.be.ok;
          });
        });
      });
    });

    it('Works even when SQL query has a values of transaction keywords such as BEGIN TRANSACTION', function() {
      const Task = current.define<ItestInstance, ItestAttribute>('task', {
        title: new DataTypes.STRING()
      });
      return Task.sync({ force: true })
        .then(() => {
          return Sequelize.Promise.all([
            Task.create({ title: 'BEGIN TRANSACTION' }),
            Task.create({ title: 'COMMIT TRANSACTION' }),
            Task.create({ title: 'ROLLBACK TRANSACTION' }),
            Task.create({ title: 'SAVE TRANSACTION' }),
          ]);
        })
        .then(newTasks => {
          expect(newTasks).to.have.lengthOf(4);
          expect(newTasks[0].title).to.equal('BEGIN TRANSACTION');
          expect(newTasks[1].title).to.equal('COMMIT TRANSACTION');
          expect(newTasks[2].title).to.equal('ROLLBACK TRANSACTION');
          expect(newTasks[3].title).to.equal('SAVE TRANSACTION');
        });
    });

    describe('enums', () => {
      it('correctly restores enum values', function() {
        const Item = current.define<ItestInstance, ItestAttribute>('Item', {
          state: { type: new DataTypes.ENUM(), values: ['available', 'in_cart', 'shipped'] }
        });

        return Item.sync({ force: true }).then(() => {
          return Item.create({ state: 'available' }).then(_item => {
            return Item.find({ where: { state: 'available' }}).then(item => {
              expect(item.id).to.equal(_item.id);
            });
          });
        });
      });

      it('allows null values', function() {
        const Enum = current.define<ItestInstance, ItestAttribute>('Enum', {
          state: {
            type: new DataTypes.ENUM(),
            values: ['happy', 'sad'],
            allowNull: true
          }
        });

        return Enum.sync({ force: true }).then(() => {
          return Enum.create({state: null}).then(_enum => {
            expect(_enum.state).to.be.null;
          });
        });
      });

      describe('when defined via { field: Sequelize.ENUM }', () => {
        it('allows values passed as parameters', function() {
          const Enum = current.define<ItestInstance, ItestAttribute>('Enum', {
            state: new DataTypes.ENUM('happy', 'sad')
          });

          return Enum.sync({ force: true }).then(() => {
            return Enum.create({ state: 'happy' });
          });
        });

        it('allows values passed as an array', function() {
          const Enum = current.define<ItestInstance, ItestAttribute>('Enum', {
            state: new DataTypes.ENUM(['happy', 'sad'])
          });

          return Enum.sync({ force: true }).then(() => {
            return Enum.create({ state: 'happy' });
          });
        });
      });

      describe('when defined via { field: { type: Sequelize.ENUM } }', () => {
        it('allows values passed as parameters', function() {
          const Enum = current.define<ItestInstance, ItestAttribute>('Enum', {
            state: {
              type: new DataTypes.ENUM('happy', 'sad')
            }
          });

          return Enum.sync({ force: true }).then(() => {
            return Enum.create({ state: 'happy' });
          });
        });

        it('allows values passed as an array', function() {
          const Enum = current.define<ItestInstance, ItestAttribute>('Enum', {
            state: {
              type: new DataTypes.ENUM(['happy', 'sad'])
            }
          });

          return Enum.sync({ force: true }).then(() => {
            return Enum.create({ state: 'happy' });
          });
        });
      });

      describe('can safely sync multiple times', () => {
        it('through the factory', function() {
          const Enum = current.define<ItestInstance, ItestAttribute>('Enum', {
            state: {
              type: new DataTypes.ENUM(),
              values: ['happy', 'sad'],
              allowNull: true
            }
          });

          return Enum.sync({ force: true }).then(() => {
            return Enum.sync().then(() => {
              return Enum.sync({ force: true });
            });
          });
        });

        it('through sequelize', function() {
          current.define<ItestInstance, ItestAttribute>('Enum', {
            state: {
              type: new DataTypes.ENUM(),
              values: ['happy', 'sad'],
              allowNull: true
            }
          });

          return current.sync({ force: true }).then(() => {
            return current.sync().then(() => {
              return current.sync({ force: true });
            });
          });
        });
      });
    });
  });

  it('should return autoIncrement primary key (create)', function() {
    const Maya = current.define<ItestInstance, ItestAttribute>('Maya', {});

    const M1 = {};

    return Maya.sync({ force: true }).then(() => Maya.create(M1, {returning: true}))
      .then(m => {
        expect(m.id).to.be.eql(1);
      });
  });


  it('should support logging', function() {
    const spy = sinon.spy();

    return User.create({}, {
      logging: spy
    }).then(() => {
      expect(spy.called).to.be.ok;
    });
  });
});
