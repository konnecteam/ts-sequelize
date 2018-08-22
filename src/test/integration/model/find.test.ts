'use strict';

import * as chai from 'chai';
import * as sinon from 'sinon';
import { Model, Sequelize } from '../../../index';
import DataTypes from '../../../lib/data-types';
import config from '../../config/config';
import { ItestAttribute, ItestInstance } from '../../dummy/dummy-data-set';
import Support from '../support';
const Promise = Sequelize.Promise;
const expect = chai.expect;
const dialect = Support.getTestDialect();
const current = Support.sequelize;

describe(Support.getTestDialectTeaser('Model'), () => {
  let User : Model<ItestInstance, ItestAttribute>;
  let UserPrimary : Model<ItestInstance, ItestAttribute>;
  let Task : Model<ItestInstance, ItestAttribute>;
  let Domain : Model<ItestInstance, ItestAttribute>;
  let Environment : Model<ItestInstance, ItestAttribute>;
  let Group : Model<ItestInstance, ItestAttribute>;
  let Contact : Model<ItestInstance, ItestAttribute>;
  let Photo : Model<ItestInstance, ItestAttribute>;
  let PhoneNumber : Model<ItestInstance, ItestAttribute>;
  let Tag : Model<ItestInstance, ItestAttribute>;
  let Product : Model<ItestInstance, ItestAttribute>;
  let Worker : Model<ItestInstance, ItestAttribute>;
  let _user : ItestInstance;
  let task : ItestInstance;
  let worker : ItestInstance;
  let products : ItestInstance[];
  let tags : ItestInstance[];
  beforeEach(function() {
    User = current.define<ItestInstance, ItestAttribute>('User', {
      username: new DataTypes.STRING(),
      secretValue: new DataTypes.STRING(),
      data: new DataTypes.STRING(),
      intVal: new DataTypes.INTEGER(),
      theDate: new DataTypes.DATE(),
      aBool: new DataTypes.BOOLEAN()
    });

    return User.sync({ force: true });
  });

  describe('find', () => {
    if (current.dialect.supports.transactions) {
      it('supports transactions', function() {
        return Support.prepareTransactionTest(current).bind({}).then(sequelize => {
          User = (sequelize as Sequelize).define<ItestInstance, ItestAttribute>('User', { username: new DataTypes.STRING() });

          return User.sync({ force: true }).then(() => {
            return sequelize.transaction().then(t => {
              return User.create({ username: 'foo' }, { transaction: t }).then(() => {
                return User.findOne({
                  where: { username: 'foo' }
                }).then(user1 => {
                  return User.findOne({
                    where: { username: 'foo' },
                    transaction: t
                  }).then(user2 => {
                    expect(user1).to.be.null;
                    expect(user2).to.not.be.null;
                    return t.rollback();
                  });
                });
              });
            });
          });
        });
      });
    }

    describe('general / basic function', () => {
      beforeEach(function() {
        return User.create({username: 'barfooz'}).then(user => {
          UserPrimary = current.define<ItestInstance, ItestAttribute>('UserPrimary', {
            specialkey: {
              type: new DataTypes.STRING(),
              primaryKey: true
            }
          });

          return UserPrimary.sync({force: true}).then(() => {
            return UserPrimary.create({specialkey: 'a string'}).then(() => {
              _user = user;
            });
          });
        });
      });

      if (dialect === 'mysql') {
        // Bit fields interpreted as boolean need conversion from buffer / bool.
        // Sqlite returns the inserted value as is, and postgres really should the built in bool type instead

        it('allows bit fields as booleans', function() {
          let bitUser = current.define<ItestInstance, ItestAttribute>('bituser', {
            bool: 'BIT(1)'
          }, {
            timestamps: false
          });

          // First use a custom data type def to create the bit field
          return bitUser.sync({ force: true }).then(() => {
            // Then change the definition to BOOLEAN
            bitUser = current.define<ItestInstance, ItestAttribute>('bituser', {
              bool: new DataTypes.BOOLEAN()
            }, {
              timestamps: false
            });

            return bitUser.bulkCreate([
              { bool: 0 },
              { bool: 1 },
            ]);
          }).then(() => {
            return bitUser.findAll();
          }).then(bitUsers => {
            expect(bitUsers[0].bool).not.to.be.ok;
            expect(bitUsers[1].bool).to.be.ok;
          });
        });
      }

      it('treats questionmarks in an array', function() {
        let test = false;
        return UserPrimary.findOne({
          where: {specialkey: 'awesome'},
          logging(sql) {
            test = true;
            if (dialect === 'oracle') {
              expect(sql).to.match(/WHERE UserPrimary.specialkey = 'awesome'/);
            } else {
              expect(sql).to.match(/WHERE ["|`|\[]UserPrimary["|`|\]]\.["|`|\[]specialkey["|`|\]] = N?'awesome'/);
            }
          }
        }).then(() => {
          expect(test).to.be.true;
        });
      });

      it('doesn\'t throw an error when entering in a non integer value for a specified primary field', function() {
        return UserPrimary.findById('a string').then(user => {
          expect(user.specialkey).to.equal('a string');
        });
      });

      it('returns a single dao', function() {
        return User.findById(_user.id).then(user => {
          expect(Array.isArray(user)).to.not.be.ok;
          expect(user.id).to.equal(user.id);
          expect(user.id).to.equal(1);
        });
      });

      it('returns a single dao given a string id', function() {
        return User.findById(_user.id + '').then(user => {
          expect(Array.isArray(user)).to.not.be.ok;
          expect(user.id).to.equal(user.id);
          expect(user.id).to.equal(1);
        });
      });

      it('should make aliased attributes available', function() {
        return User.findOne({
          where: { id: 1 },
          attributes: ['id', ['username', 'name']]
        }).then(user => {
          expect(user.dataValues.name).to.equal('barfooz');
        });
      });

      it('should fail with meaningful error message on invalid attributes definition', function() {
        expect(User.findOne({
          where: { id: 1 },
          attributes: ['id', ['username']]
        })).to.be.rejectedWith('["username"] is not a valid attribute definition. Please use the following format: [\'attribute definition\', \'alias\']');
      });

      it('should not try to convert boolean values if they are not selected', function() {
        const UserWithBoolean = current.define<ItestInstance, ItestAttribute>('UserBoolean', {
          active: new DataTypes.BOOLEAN()
        });

        return UserWithBoolean.sync({force: true}).then(() => {
          return UserWithBoolean.create({ active: true }).then(user => {
            return UserWithBoolean.findOne({ where: { id: user.id }, attributes: ['id'] }).then(user2 => {
              expect(user2.active).not.to.exist;
            });
          });
        });
      });

      it('finds a specific user via where option', function() {
        return User.findOne({ where: { username: 'barfooz' } }).then(user => {
          expect(user.username).to.equal('barfooz');
        });
      });

      it('doesn\'t find a user if conditions are not matching', function() {
        return User.findOne({ where: { username: 'foo' } }).then(user => {
          expect(user).to.be.null;
        });
      });

      it('allows sql logging', function() {
        let test = false;
        return User.findOne({
          where: { username: 'foo' },
          logging(sql) {
            test = true;
            expect(sql).to.exist;
            expect(sql.toUpperCase().indexOf('SELECT')).to.be.above(-1);
          }
        }).then(() => {
          expect(test).to.be.true;
        });
      });

      it('ignores passed limit option', function() {
        return User.findOne({ limit: 10 }).then(user => {
          // it returns an object instead of an array
          expect(Array.isArray(user)).to.not.be.ok;
          expect(user.dataValues.hasOwnProperty('username')).to.be.ok;
        });
      });

      it('finds entries via primary keys', function() {
        UserPrimary = current.define<ItestInstance, ItestAttribute>('UserWithPrimaryKey', {
          identifier: {type: new DataTypes.STRING(), primaryKey: true},
          name: new DataTypes.STRING()
        });

        return UserPrimary.sync({ force: true }).then(() => {
          return UserPrimary.create({
            identifier: 'an identifier',
            name: 'John'
          }).then(u => {
            expect(u.id).not.to.exist;
            return UserPrimary.findById('an identifier').then(u2 => {
              expect(u2.identifier).to.equal('an identifier');
              expect(u2.name).to.equal('John');
            });
          });
        });
      });

      it('finds entries via a string primary key called id', function() {
        UserPrimary = current.define<ItestInstance, ItestAttribute>('UserWithPrimaryKey', {
          id: {type: new DataTypes.STRING(), primaryKey: true},
          name: new DataTypes.STRING()
        });

        return UserPrimary.sync({ force: true }).then(() => {
          return UserPrimary.create({
            id: 'a string based id',
            name: 'Johnno'
          }).then(() => {
            return UserPrimary.findById('a string based id').then(u2 => {
              expect(u2.id).to.equal('a string based id');
              expect(u2.name).to.equal('Johnno');
            });
          });
        });
      });

      it('always honors ZERO as primary key', function() {
        const permutations = [
          0,
          '0',
        ];
        let count = 0;

        return User.bulkCreate([{username: 'jack'}, {username: 'jack'}]).then(() => {
          return current.Promise.map(permutations, perm => {
            return User.findById(perm, {
              logging(s) {
                expect(s.indexOf(0)).not.to.equal(-1);
                count++;
              }
            }).then(user => {
              expect(user).to.be.null;
            });
          });
        }).then(() => {
          expect(count).to.be.equal(permutations.length);
        });
      });

      it('should allow us to find IDs using capital letters', function() {
        User = current.define<ItestInstance, ItestAttribute>('User' + config.rand(), {
          ID: { type: new DataTypes.INTEGER(), primaryKey: true, autoIncrement: true },
          Login: { type: new DataTypes.STRING() }
        });

        return User.sync({ force: true }).then(() => {
          return User.create({Login: 'foo'}).then(() => {
            return User.findById(1).then(user => {
              expect(user).to.exist;
              expect(user.ID).to.equal(1);
            });
          });
        });
      });
    });

    describe('eager loading', () => {
      beforeEach(function() {
        Task = current.define<ItestInstance, ItestAttribute>('Task', { title: new DataTypes.STRING() });
        Worker = current.define<ItestInstance, ItestAttribute>('Worker', { name: new DataTypes.STRING() });

        this.init = function(callback) {
          return current.sync({ force: true }).then(() => {
            return Worker.create({ name: 'worker' }).then(_worker => {
              return Task.create({ title: 'homework' }).then(_task => {
                worker = _worker;
                task = _task;
                return callback();
              });
            });
          });
        };
      });

      describe('belongsTo', () => {
        describe('generic', () => {
          it('throws an error about unexpected input if include contains a non-object', function() {
            return Worker.findOne({ include: [1] }).catch (err => {
              expect(err.message).to.equal('Include unexpected. Element has to be either a Model, an Association or an object.');
            });
          });

          it('throws an error if included DaoFactory is not associated', function() {
            return Worker.findOne({ include: [Task] }).catch (err => {
              expect(err.message).to.equal('Task is not associated to Worker!');
            });
          });

          it('returns the associated worker via task.worker', function() {
            Task.belongsTo(Worker);
            return this.init(() => {
              return task.setLinkedData('Worker', worker).then(() => {
                return Task.findOne({
                  where: { title: 'homework' },
                  include: [Worker]
                }).then(_task => {
                  expect(_task).to.exist;
                  expect(_task.Worker).to.exist;
                  expect(_task.Worker.name).to.equal('worker');
                });
              });
            });
          });
        });

        it('returns the private and public ip', function() {
          Domain = current.define<ItestInstance, ItestAttribute>('Domain', { ip: new DataTypes.STRING() });
          Environment = current.define<ItestInstance, ItestAttribute>('Environment', { name: new DataTypes.STRING() });
          Environment.belongsTo(Domain, { as: 'PrivateDomain', foreignKey: 'privateDomainId' });
          Environment.belongsTo(Domain, { as: 'PublicDomain', foreignKey: 'publicDomainId' });

          return Domain.sync({ force: true }).then(() => {
            return Environment.sync({ force: true }).then(() => {
              return Domain.create({ ip: '192.168.0.1' }).then(privateIp => {
                return Domain.create({ ip: '91.65.189.19' }).then(publicIp => {
                  return Environment.create({ name: 'environment' }).then(env => {
                    return env.setLinkedData({ model : 'Domain', associationAlias : 'PrivateDomain' }, privateIp).then(() => {
                      return env.setLinkedData({ model : 'Domain', associationAlias : 'PublicDomain' },  publicIp).then(() => {
                        return Environment.findOne({
                          where: { name: 'environment' },
                          include: [
                            { model: Domain, as: 'PrivateDomain' },
                            { model: Domain, as: 'PublicDomain' },
                          ]
                        }).then(environment => {
                          expect(environment).to.exist;
                          expect(environment.PrivateDomain).to.exist;
                          expect(environment.PrivateDomain.ip).to.equal('192.168.0.1');
                          expect(environment.PublicDomain).to.exist;
                          expect(environment.PublicDomain.ip).to.equal('91.65.189.19');
                        });
                      });
                    });
                  });
                });
              });
            });
          });
        });

        it('eager loads with non-id primary keys', function() {
          User = current.define<ItestInstance, ItestAttribute>('UserPKeagerbelong', {
            username: {
              type: new DataTypes.STRING(),
              primaryKey: true
            }
          });
          Group = current.define<ItestInstance, ItestAttribute>('GroupPKeagerbelong', {
            name: {
              type: new DataTypes.STRING(),
              primaryKey: true
            }
          });
          User.belongsTo(Group);

          return current.sync({ force: true }).then(() => {
            return Group.create({ name: 'people' }).then(() => {
              return User.create({ username: 'someone', GroupPKeagerbelongName: 'people' }).then(() => {
                return User.findOne({
                  where: {
                    username: 'someone'
                  },
                  include: [Group]
                }).then(someUser => {
                  expect(someUser).to.exist;
                  expect(someUser.username).to.equal('someone');
                  expect(someUser.GroupPKeagerbelong.name).to.equal('people');
                });
              });
            });
          });
        });

        it('getting parent data in many to one relationship', function() {
          User = current.define<ItestInstance, ItestAttribute>('User', {
            id: {type: new DataTypes.INTEGER(), autoIncrement: true, primaryKey: true},
            username: {type: new DataTypes.STRING()}
          });

          const Message = current.define<ItestInstance, ItestAttribute>('Message', {
            id: {type: new DataTypes.INTEGER(), autoIncrement: true, primaryKey: true},
            user_id: {type: new DataTypes.INTEGER()},
            message: {type: new DataTypes.STRING()}
          });

          User.hasMany(Message);
          Message.belongsTo(User, { foreignKey: 'user_id' });

          return current.sync({ force: true }).then(() => {
            return User.create({username: 'test_testerson'}).then(user => {
              return Message.create({user_id: user.id, message: 'hi there!'}).then(() => {
                return Message.create({user_id: user.id, message: 'a second message'}).then(() => {
                  return Message.findAll({
                    where: {user_id: user.id},
                    attributes: [
                      'user_id',
                      'message',
                    ],
                    include: [{ model: User, attributes: ['username'] }],
                    order : ['id'] //Order is mandatory, on Oracle may return results in any order
                  }).then(messages => {
                    expect(messages.length).to.equal(2);

                    expect(messages[0].message).to.equal('hi there!');
                    expect(messages[0].User.username).to.equal('test_testerson');

                    expect(messages[1].message).to.equal('a second message');
                    expect(messages[1].User.username).to.equal('test_testerson');
                  });
                });
              });
            });
          });
        });

        it('allows mulitple assocations of the same model with different alias', function() {
          Worker.belongsTo(Task, { as: 'ToDo' });
          Worker.belongsTo(Task, { as: 'DoTo' });
          return this.init(() => {
            return Worker.findOne({
              include: [
                { model: Task, as: 'ToDo' },
                { model: Task, as: 'DoTo' },
              ]
            });
          });
        });
      });

      describe('hasOne', () => {
        beforeEach(function() {
          Worker.hasOne(Task);
          return this.init(() => {
            return worker.setLinkedData('Task', task);
          });
        });

        it('throws an error if included DaoFactory is not associated', function() {
          return Task.findOne({ include: [Worker] }).catch (err => {
            expect(err.message).to.equal('Worker is not associated to Task!');
          });
        });

        it('returns the associated task via worker.task', function() {
          return Worker.findOne({
            where: { name: 'worker' },
            include: [Task]
          }).then(_worker => {
            expect(_worker).to.exist;
            expect(_worker.Task).to.exist;
            expect(_worker.Task.title).to.equal('homework');
          });
        });

        it('eager loads with non-id primary keys', function() {
          User = current.define<ItestInstance, ItestAttribute>('UserPKeagerone', {
            username: {
              type: new DataTypes.STRING(),
              primaryKey: true
            }
          });
          Group = current.define<ItestInstance, ItestAttribute>('GroupPKeagerone', {
            name: {
              type: new DataTypes.STRING(),
              primaryKey: true
            }
          });
          Group.hasOne(User);

          return current.sync({ force: true }).then(() => {
            return Group.create({ name: 'people' }).then(() => {
              return User.create({ username: 'someone', GroupPKeageroneName: 'people' }).then(() => {
                return Group.findOne({
                  where: {
                    name: 'people'
                  },
                  include: [User]
                }).then(someGroup => {
                  expect(someGroup).to.exist;
                  expect(someGroup.name).to.equal('people');
                  expect(someGroup.UserPKeagerone.username).to.equal('someone');
                });
              });
            });
          });
        });
      });

      describe('hasOne with alias', () => {
        it('throws an error if included DaoFactory is not referenced by alias', function() {
          return Worker.findOne({ include: [Task] }).catch (err => {
            expect(err.message).to.equal('Task is not associated to Worker!');
          });
        });

        describe('alias', () => {
          beforeEach(function() {
            Worker.hasOne(Task, { as: 'ToDo' });
            return this.init(() => {
              return worker.setLinkedData({ model : 'Task', associationAlias : 'ToDo' }, task);
            });
          });

          it('throws an error indicating an incorrect alias was entered if an association and alias exist but the alias doesn\'t match', function() {
            return Worker.findOne({ include: [{ model: Task, as: 'Work' }] }).catch (err => {
              expect(err.message).to.equal('Task is associated to Worker using an alias. You\'ve included an alias (Work), but it does not match the alias defined in your association.');
            });
          });

          it('returns the associated task via worker.task', function() {
            return Worker.findOne({
              where: { name: 'worker' },
              include: [{ model: Task, as: 'ToDo' }]
            }).then(_worker => {
              expect(_worker).to.exist;
              expect(_worker.ToDo).to.exist;
              expect(_worker.ToDo.title).to.equal('homework');
            });
          });

          it('returns the associated task via worker.task when daoFactory is aliased with model', function() {
            return Worker.findOne({
              where: { name: 'worker' },
              include: [{ model: Task, as: 'ToDo' }]
            }).then(_worker => {
              expect(_worker.ToDo.title).to.equal('homework');
            });
          });

          it('allows mulitple assocations of the same model with different alias', function() {
            Worker.hasOne(Task, { as: 'DoTo' });
            return this.init(() => {
              return Worker.findOne({
                include: [
                  { model: Task, as: 'ToDo' },
                  { model: Task, as: 'DoTo' },
                ]
              });
            });
          });
        });
      });

      describe('hasMany', () => {
        beforeEach(function() {
          Worker.hasMany(Task);
          return this.init(() => {
            return worker.setLinkedData('Task', [task]);
          });
        });

        it('throws an error if included DaoFactory is not associated', function() {
          return Task.findOne({ include: [Worker] }).catch (err => {
            expect(err.message).to.equal('Worker is not associated to Task!');
          });
        });

        it('returns the associated tasks via worker.tasks', function() {
          return Worker.findOne({
            where: { name: 'worker' },
            include: [Task]
          }).then(_worker => {
            expect(_worker).to.exist;
            expect(_worker.Tasks).to.exist;
            expect(_worker.Tasks[0].title).to.equal('homework');
          });
        });

        it('including two has many relations should not result in duplicate values', function() {
          Contact = current.define<ItestInstance, ItestAttribute>('Contact', { name: new DataTypes.STRING() });
          Photo = current.define<ItestInstance, ItestAttribute>('Photo', { img: new DataTypes.TEXT() });
          PhoneNumber = current.define<ItestInstance, ItestAttribute>('PhoneNumber', { phone: new DataTypes.TEXT() });

          Contact.hasMany(Photo, { as: 'Photos' });
          Contact.hasMany(PhoneNumber);

          return current.sync({ force: true }).then(() => {
            return Contact.create({ name: 'Boris' }).then(someContact => {
              return Photo.create({ img: 'img.jpg' }).then(somePhoto => {
                return PhoneNumber.create({ phone: '000000' }).then(somePhone1 => {
                  return PhoneNumber.create({ phone: '111111' }).then(somePhone2 => {
                    return someContact.setLinkedData('Photo', [somePhoto]).then(() => {
                      return someContact.setLinkedData('PhoneNumber', [somePhone1, somePhone2]).then(() => {
                        return Contact.findOne({
                          where: {
                            name: 'Boris'
                          },
                          include: [PhoneNumber, { model: Photo, as: 'Photos' }]
                        }).then(fetchedContact => {
                          expect(fetchedContact).to.exist;
                          expect(fetchedContact.Photos.length).to.equal(1);
                          expect(fetchedContact.PhoneNumbers.length).to.equal(2);
                        });
                      });
                    });
                  });
                });
              });
            });
          });
        });

        it('eager loads with non-id primary keys', function() {
          User = current.define<ItestInstance, ItestAttribute>('UserPKeagerone', {
            username: {
              type: new DataTypes.STRING(),
              primaryKey: true
            }
          });
          Group = current.define<ItestInstance, ItestAttribute>('GroupPKeagerone', {
            name: {
              type: new DataTypes.STRING(),
              primaryKey: true
            }
          });
          Group.belongsToMany(User, {through: 'group_user'});
          User.belongsToMany(Group, {through: 'group_user'});

          return current.sync({ force: true }).then(() => {
            return User.create({ username: 'someone' }).then(someUser => {
              return Group.create({ name: 'people' }).then(someGroup => {
                return someUser.setLinkedData('GroupPKeagerone', [someGroup]).then(() => {
                  return User.findOne({
                    where: {
                      username: 'someone'
                    },
                    include: [Group]
                  }).then(_someUser => {
                    expect(_someUser).to.exist;
                    expect(_someUser.username).to.equal('someone');
                    expect(_someUser.GroupPKeagerones[0].name).to.equal('people');
                  });
                });
              });
            });
          });
        });
      });

      describe('hasMany with alias', () => {
        it('throws an error if included DaoFactory is not referenced by alias', function() {
          return Worker.findOne({ include: [Task] }).catch (err => {
            expect(err.message).to.equal('Task is not associated to Worker!');
          });
        });

        describe('alias', () => {
          beforeEach(function() {
            Worker.hasMany(Task, { as: 'ToDos' });
            return this.init(() => {
              return worker.setLinkedData({ model : 'Task', associationAlias : 'ToDos' }, [task]);
            });
          });

          it('throws an error indicating an incorrect alias was entered if an association and alias exist but the alias doesn\'t match', function() {
            return Worker.findOne({ include: [{ model: Task, as: 'Work' }] }).catch (err => {
              expect(err.message).to.equal('Task is associated to Worker using an alias. You\'ve included an alias (Work), but it does not match the alias defined in your association.');
            });
          });

          it('returns the associated task via worker.task', function() {
            return Worker.findOne({
              where: { name: 'worker' },
              include: [{ model: Task, as: 'ToDos' }]
            }).then(_worker => {
              expect(_worker).to.exist;
              expect(_worker.ToDos).to.exist;
              expect(_worker.ToDos[0].title).to.equal('homework');
            });
          });

          it('returns the associated task via worker.task when daoFactory is aliased with model', function() {
            return Worker.findOne({
              where: { name: 'worker' },
              include: [{ model: Task, as: 'ToDos' }]
            }).then(_worker => {
              expect(_worker.ToDos[0].title).to.equal('homework');
            });
          });

          it('allows mulitple assocations of the same model with different alias', function() {
            Worker.hasMany(Task, { as: 'DoTos' });
            return this.init(() => {
              return Worker.findOne({
                include: [
                  { model: Task, as: 'ToDos' },
                  { model: Task, as: 'DoTos' },
                ]
              });
            });
          });
        });
      });

      describe('hasMany (N:M) with alias', () => {
        beforeEach(function() {
          Product = current.define<ItestInstance, ItestAttribute>('Product', { title: new DataTypes.STRING() });
          Tag = current.define<ItestInstance, ItestAttribute>('Tag', { name: new DataTypes.STRING() });
        });

        it('returns the associated models when using through as string and alias', function() {
          Product.belongsToMany(Tag, {as: 'tags', through: 'product_tag'});
          Tag.belongsToMany(Product, {as: 'products', through: 'product_tag'});

          return current.sync().then(() => {
            return Promise.all([
              Product.bulkCreate([
                {title: 'Chair'},
                {title: 'Desk'},
                {title: 'Handbag'},
                {title: 'Dress'},
                {title: 'Jan'},
              ]),
              Tag.bulkCreate([
                {name: 'Furniture'},
                {name: 'Clothing'},
                {name: 'People'},
              ]),
            ]).then(() => {
              return Promise.all([
                Product.findAll(),
                Tag.findAll(),
              ]);
            }).spread((_products, _tags) => {
              products = _products;
              tags = _tags;
              return Promise.all([
                products[0].setLinkedData('Tag', [tags[0], tags[1]]),
                products[1].addLinkedData('Tag', tags[0]),
                products[2].addLinkedData('Tag', tags[1]),
                products[3].setLinkedData('Tag', [tags[1]]),
                products[4].setLinkedData('Tag', [tags[2]]),
              ]).then(() => {
                return Promise.all([
                  Tag.findOne({
                    where: {
                      id: tags[0].id
                    },
                    include: [
                      {model: Product, as: 'products'},
                    ]
                  }).then(tag => {
                    expect(tag).to.exist;
                    expect(tag.products.length).to.equal(2);
                  }),
                  tags[1].getManyLinkedData<ItestInstance, ItestAttribute>('Product').then(products2 => {
                    expect(products2.length).to.equal(3);
                  }),
                  Product.findOne({
                    where: {
                      id: products[0].id
                    },
                    include: [
                      {model: Tag, as: 'tags'},
                    ]
                  }).then(product => {
                    expect(product).to.exist;
                    expect(product.tags.length).to.equal(2);
                  }),
                  products[1].getManyLinkedData<ItestInstance, ItestAttribute>('Tag').then(tags2 => {
                    expect(tags2.length).to.equal(1);
                  }),
                ]);
              });
            });
          });
        });

        it('returns the associated models when using through as model and alias', function() {
          // Exactly the same code as the previous test, just with a through model instance, and promisified
          const ProductTag = current.define<ItestInstance, ItestAttribute>('product_tag');

          Product.belongsToMany(Tag, {as: 'tags', through: ProductTag});
          Tag.belongsToMany(Product, {as: 'products', through: ProductTag});

          return current.sync().bind(this).then(function() {
            return Promise.all([
              Product.bulkCreate([
                {title: 'Chair'},
                {title: 'Desk'},
                {title: 'Handbag'},
                {title: 'Dress'},
                {title: 'Jan'},
              ]),
              Tag.bulkCreate([
                {name: 'Furniture'},
                {name: 'Clothing'},
                {name: 'People'},
              ]),
            ]);
          }).then(function() {
            return Promise.all([
              Product.findAll(),
              Tag.findAll(),
            ]);
          }).spread(function(_products, _tags) {
            products = _products;
            tags = _tags;

            return Promise.all([
              products[0].setLinkedData('Tag', [tags[0], tags[1]]),
              products[1].addLinkedData('Tag', tags[0]),
              products[2].addLinkedData('Tag', tags[1]),
              products[3].setLinkedData('Tag', [tags[1]]),
              products[4].setLinkedData('Tag', [tags[2]]),
            ]);
          }).then(function() {
            return Promise.all([
              expect(Tag.findOne({
                where: {
                  id: tags[0].id
                },
                include: [
                  {model: Product, as: 'products'},
                ]
              })).to.eventually.have.property('products').to.have.length(2),
              expect(Product.findOne({
                where: {
                  id: products[0].id
                },
                include: [
                  {model: Tag, as: 'tags'},
                ]
              })).to.eventually.have.property('tags').to.have.length(2),
              expect(tags[1].getLinkedData<ItestInstance, ItestAttribute>('Product')).to.eventually.have.length(3),
              expect(products[1].getLinkedData<ItestInstance, ItestAttribute>('Tag')).to.eventually.have.length(1),
            ]);
          });
        });
      });
    });

    describe('queryOptions', () => {
      beforeEach(function() {
        return User.create({username: 'barfooz'}).then(user => {
          user = user;
        });
      });

      it('should return a DAO when queryOptions are not set', function() {
        return User.findOne({ where: { username: 'barfooz'}}).then(user => {
          expect(user.model).to.equal(User);
        });
      });

      it('should return a DAO when raw is false', function() {
        return User.findOne({ where: { username: 'barfooz'}, raw: false }).then(user => {
          expect(user.model).to.equal(User);
        });
      });

      it('should return raw data when raw is true', function() {
        return User.findOne({ where: { username: 'barfooz'}, raw: true }).then(user => {
          expect(user.model).to.not.equal(User);
          expect(user).to.be.instanceOf(Object);
        });
      });
    });

    it('should support logging', function() {
      const spy = sinon.spy();

      return User.findOne({
        where: {},
        logging: spy
      }).then(() => {
        expect(spy.called).to.be.ok;
      });
    });

    describe('rejectOnEmpty mode', () => {
      it('throws error when record not found by findOne', function() {
        return expect(User.findOne({
          where: {
            username: 'ath-kantam-pradakshnami'
          },
          rejectOnEmpty: true
        })).to.eventually.be.rejectedWith(Sequelize.EmptyResultError);
      });

      it('throws error when record not found by findById', function() {
        return expect(User.findById(4732322332323333232344334354234, {
          rejectOnEmpty: true
        })).to.eventually.be.rejectedWith(Sequelize.EmptyResultError);
      });

      it('throws error when record not found by find', function() {
        return expect(User.find({
          where: {
            username: 'some-username-that-is-not-used-anywhere'
          },
          rejectOnEmpty: true
        })).to.eventually.be.rejectedWith(Sequelize.EmptyResultError);
      });

      it('works from model options', () => {
        const _Model = current.define<ItestInstance, ItestAttribute>('Test', {
          username: new DataTypes.STRING(100)
        }, {
          rejectOnEmpty: true
        });

        return _Model.sync({ force: true })
          .then(() => {
            return expect(_Model.findOne({
              where: {
                username: 'some-username-that-is-not-used-anywhere'
              }
            })).to.eventually.be.rejectedWith(Sequelize.EmptyResultError);
          });
      });

      it('resolve null when disabled', () => {
        const _Model = current.define<ItestInstance, ItestAttribute>('Test', {
          username: new DataTypes.STRING(100)
        });

        return _Model.sync({ force: true })
          .then(() => {
            return expect(_Model.findOne({
              where: {
                username: 'some-username-that-is-not-used-anywhere-for-sure-this-time'
              }
            })).to.eventually.be.equal(null);
          });
      });
    });
  });
});
