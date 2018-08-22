'use strict';

import * as chai from 'chai';
import DataTypes from '../../../../lib/data-types';
import { Model } from '../../../../lib/model';
import {Sequelize as sequelize} from '../../../../lib/sequelize';
import { ItestAttribute, ItestInstance } from '../../../dummy/dummy-data-set';
import Support from '../../support';
const expect = chai.expect;
const Sequelize = Support.Sequelize;
const Promise = Sequelize.Promise;
const dialect = Support.getTestDialect();
const current = Support.sequelize;

if (dialect.match(/^postgres/)) {
  describe('[POSTGRES Specific] DAO', () => {
    let _User : Model<ItestInstance, ItestAttribute>;
    let _Professor : Model<ItestInstance, ItestAttribute>;
    let _Class : Model<ItestInstance, ItestAttribute>;
    let _Student : Model<ItestInstance, ItestAttribute>;
    let _ClassStudent : Model<ItestInstance, ItestAttribute>;
    beforeEach(function() {
      current.options.quoteIdentifiers = true;
      _User = current.define<ItestInstance, ItestAttribute>('User', {
        username: new DataTypes.STRING(),
        email: { type: new DataTypes.ARRAY(new DataTypes.TEXT()) },
        settings: new DataTypes.HSTORE(),
        document: { type: new DataTypes.HSTORE(), defaultValue: { default: "'value'" } },
        phones: new DataTypes.ARRAY(new DataTypes.HSTORE()),
        emergency_contact: new DataTypes.JSON(),
        emergencyContact: new DataTypes.JSON(),
        friends: {
          type: new DataTypes.ARRAY(new DataTypes.JSON()),
          defaultValue: []
        },
        magic_numbers: {
          type: new DataTypes.ARRAY(new DataTypes.INTEGER()),
          defaultValue: []
        },
        course_period: new DataTypes.RANGE(new DataTypes.DATE()),
        acceptable_marks: { type: new DataTypes.RANGE(new DataTypes.DECIMAL()), defaultValue: [0.65, 1] },
        available_amount: new DataTypes.RANGE(),
        holidays: new DataTypes.ARRAY(new DataTypes.RANGE(new DataTypes.DATE())),
        location: new DataTypes.GEOMETRY()
      });
      return _User.sync({ force: true });
    });

    afterEach(function() {
      current.options.quoteIdentifiers = true;
    });

    it('should be able to search within an array', function() {
      return _User.findAll({
        where: {
          email: ['hello', 'world']
        },
        attributes: ['id', 'username', 'email', 'settings', 'document', 'phones', 'emergency_contact', 'friends'],
        logging(sql) {
          expect(sql).to.equal('Executing (default): SELECT "id", "username", "email", "settings", "document", "phones", "emergency_contact", "friends" FROM "Users" AS "User" WHERE "User"."email" = ARRAY[\'hello\',\'world\']::TEXT[];');
        }
      });
    });

    it('should be able to update a field with type ARRAY(JSON)', function() {
      return _User.create({
        username: 'bob',
        email: ['myemail@email.com'],
        friends: [{
          name: 'John Smith'
        }]
      }).then(userInstance => {
        expect(userInstance.friends).to.have.length(1);
        expect(userInstance.friends[0].name).to.equal('John Smith');

        return userInstance.update({
          friends: [{
            name: 'John Smythe'
          }]
        });
      }).get('friends')
        .tap(friends => {
          expect(friends).to.have.length(1);
          expect(friends[0].name).to.equal('John Smythe');
        });
    });

    it('should be able to find a record while searching in an array', function() {
      return _User.bulkCreate([
        { username: 'bob', email: ['myemail@email.com'] },
        { username: 'tony', email: ['wrongemail@email.com'] },
      ]).then(() => {
        return _User.findAll({ where: { email: ['myemail@email.com'] } }).then(user => {
          expect(user).to.be.instanceof(Array);
          expect(user).to.have.length(1);
          expect(user[0].username).to.equal('bob');
        });
      });
    });

    describe('json', () => {
      it('should be able to retrieve a row with ->> operator', function() {
        return current.Promise.all([
          _User.create({ username: 'swen', emergency_contact: { name: 'kate' } }),
          _User.create({ username: 'anna', emergency_contact: { name: 'joe' } })])
          .then(() => {
            return _User.find({ where: sequelize.json("emergency_contact->>'name'", 'kate'), attributes: ['username', 'emergency_contact'] });
          })
          .then(user => {
            expect(user.emergency_contact.name).to.equal('kate');
          });
      });

      it('should be able to query using the nested query language', function() {
        return current.Promise.all([
          _User.create({ username: 'swen', emergency_contact: { name: 'kate' } }),
          _User.create({ username: 'anna', emergency_contact: { name: 'joe' } })])
          .then(() => {
            return _User.find({
              where: sequelize.json({ emergency_contact: { name: 'kate' } })
            });
          })
          .then(user => {
            expect(user.emergency_contact.name).to.equal('kate');
          });
      });

      it('should be able to query using dot syntax', function() {
        return current.Promise.all([
          _User.create({ username: 'swen', emergency_contact: { name: 'kate' } }),
          _User.create({ username: 'anna', emergency_contact: { name: 'joe' } })])
          .then(() => {
            return _User.find({ where: sequelize.json('emergency_contact.name', 'joe') });
          })
          .then(user => {
            expect(user.emergency_contact.name).to.equal('joe');
          });
      });

      it('should be able to query using dot syntax with uppercase name', function() {
        return current.Promise.all([
          _User.create({ username: 'swen', emergencyContact: { name: 'kate' } }),
          _User.create({ username: 'anna', emergencyContact: { name: 'joe' } })])
          .then(() => {
            return _User.find({
              attributes: [[sequelize.json('emergencyContact.name'), 'contactName']],
              where: sequelize.json('emergencyContact.name', 'joe')
            });
          })
          .then(user => {
            expect(user.get('contactName')).to.equal('joe');
          });
      });

      it('should be able to store values that require JSON escaping', function() {
        const text = "Multi-line '$string' needing \"escaping\" for $$ and $1 type values";

        return _User.create({ username: 'swen', emergency_contact: { value: text } })
          .then(user => {
            expect(user.isNewRecord).to.equal(false);
          })
          .then(() => {
            return _User.find({ where: { username: 'swen' } });
          })
          .then(() => {
            return _User.find({ where: sequelize.json('emergency_contact.value', text) });
          })
          .then(user => {
            expect(user.username).to.equal('swen');
          });
      });

      it('should be able to findOrCreate with values that require JSON escaping', function() {
        const text = "Multi-line '$string' needing \"escaping\" for $$ and $1 type values";

        return _User.findOrCreate({ where: { username: 'swen' }, defaults: { emergency_contact: { value: text } } })
          .then(user => {
            expect(!user.isNewRecord).to.equal(true);
          })
          .then(() => {
            return _User.find({ where: { username: 'swen' } });
          })
          .then(() => {
            return _User.find({ where: sequelize.json('emergency_contact.value', text) });
          })
          .then(user => {
            expect(user.username).to.equal('swen');
          });
      });
    });

    describe('hstore', () => {
      it('should tell me that a column is hstore and not USER-DEFINED', function() {
        return current.queryInterface.describeTable('Users').then(table => {
          expect(table.settings.type).to.equal('HSTORE');
          expect(table.document.type).to.equal('HSTORE');
        });
      });

      it('should NOT stringify hstore with insert', function() {
        return _User.create({
          username: 'bob',
          email: ['myemail@email.com'],
          settings: { mailing: false, push: 'facebook', frequency: 3 }
        }, {
          logging(sql) {
            const unexpected = '\'"mailing"=>"false","push"=>"facebook","frequency"=>"3"\',\'"default"=>"\'\'value\'\'"\'';
            expect(sql).not.to.include(unexpected);
          }
        });
      });

      it('should not rename hstore fields', function() {
        const Equipment = current.define<ItestInstance, ItestAttribute>('Equipment', {
          grapplingHook: {
            type: new DataTypes.STRING(),
            field: 'grappling_hook'
          },
          utilityBelt: {
            type: new DataTypes.HSTORE()
          }
        });

        return Equipment.sync({ force: true }).then(() => {
          return Equipment.findAll({
            where: {
              utilityBelt: {
                grapplingHook: true
              }
            },
            logging(sql) {
              expect(sql).to.equal('Executing (default): SELECT "id", "grappling_hook" AS "grapplingHook", "utilityBelt", "createdAt", "updatedAt" FROM "Equipment" AS "Equipment" WHERE "Equipment"."utilityBelt" = \'"grapplingHook"=>"true"\';');
            }
          });
        });
      });

      it('should not rename json fields', function() {
        const Equipment = current.define<ItestInstance, ItestAttribute>('Equipment', {
          grapplingHook: {
            type: new DataTypes.STRING(),
            field: 'grappling_hook'
          },
          utilityBelt: {
            type: new DataTypes.JSON()
          }
        });

        return Equipment.sync({ force: true }).then(() => {
          return Equipment.findAll({
            where: {
              utilityBelt: {
                grapplingHook: true
              }
            },
            logging(sql) {
              expect(sql).to.equal('Executing (default): SELECT "id", "grappling_hook" AS "grapplingHook", "utilityBelt", "createdAt", "updatedAt" FROM'
              + ' "Equipment" AS "Equipment" WHERE CAST(("Equipment"."utilityBelt"#>>\'{grapplingHook}\') AS BOOLEAN) = true;');
            }
          });
        });
      });

    });

    describe('range', () => {
      it('should tell me that a column is range and not USER-DEFINED', function() {
        return current.queryInterface.describeTable('Users').then(table => {
          expect(table.course_period.type).to.equal('TSTZRANGE');
          expect(table.available_amount.type).to.equal('INT4RANGE');
        });
      });

    });

    describe('enums', () => {
      it('should be able to ignore enum types that already exist', function() {
        const User = current.define<ItestInstance, ItestAttribute>('UserEnums', {
          mood: new DataTypes.ENUM('happy', 'sad', 'meh')
        });

        return User.sync({ force: true }).then(() => {
          return User.sync();
        });
      });

      it('should be able to create/drop enums multiple times', function() {
        const User = current.define<ItestInstance, ItestAttribute>('UserEnums', {
          mood: new DataTypes.ENUM('happy', 'sad', 'meh')
        });

        return User.sync({ force: true }).then(() => {
          return User.sync({ force: true });
        });
      });

      it('should be able to create/drop multiple enums multiple times', function() {
        const DummyModel = current.define<ItestInstance, ItestAttribute>('Dummy-pg', {
          username: new DataTypes.STRING(),
          theEnumOne: {
            type: new DataTypes.ENUM(),
            values: [
              'one',
              'two',
              'three',
            ]
          },
          theEnumTwo: {
            type: new DataTypes.ENUM(),
            values: [
              'four',
              'five',
              'six',
            ]
          }
        });

        return DummyModel.sync({ force: true }).then(() => {
          // now sync one more time:
          return DummyModel.sync({ force: true }).then(() => {
            // sync without dropping
            return DummyModel.sync();
          });
        });
      });

      it('should be able to create/drop multiple enums multiple times with field name (#7812)', function() {
        const DummyModel = current.define<ItestInstance, ItestAttribute>('Dummy-pg', {
          username: new DataTypes.STRING(),
          theEnumOne: {
            field: 'oh_my_this_enum_one',
            type: new DataTypes.ENUM(),
            values: [
              'one',
              'two',
              'three',
            ]
          },
          theEnumTwo: {
            field: 'oh_my_this_enum_two',
            type: new DataTypes.ENUM(),
            values: [
              'four',
              'five',
              'six',
            ]
          }
        });

        return DummyModel.sync({ force: true }).then(() => {
          // now sync one more time:
          return DummyModel.sync({ force: true }).then(() => {
            // sync without dropping
            return DummyModel.sync();
          });
        });
      });

      it('should be able to add values to enum types', function() {
        let User = current.define<ItestInstance, ItestAttribute>('UserEnums', {
          mood:  new DataTypes.ENUM('happy', 'sad', 'meh')
        });

        return User.sync({ force: true }).then(() => {
          User = current.define<ItestInstance, ItestAttribute>('UserEnums', {
            mood: new DataTypes.ENUM('neutral', 'happy', 'sad', 'ecstatic', 'meh', 'joyful')
          });

          return User.sync();
        }).then(() => {
          return current.getQueryInterface().pgListEnums(User.getTableName());
        }).then(enums => {
          expect(enums).to.have.length(1);
          expect(enums[0].enum_value).to.equal('{neutral,happy,sad,ecstatic,meh,joyful}');
        });
      });

      describe('ARRAY(ENUM)', () => {
        it('should be able to ignore enum types that already exist', function() {
          const User = current.define<ItestInstance, ItestAttribute>('UserEnums', {
            permissions: new DataTypes.ARRAY(new DataTypes.ENUM([
              'access',
              'write',
              'check',
              'delete',
            ]))
          });

          return User.sync({ force: true }).then(() => User.sync());
        });

        it('should be able to create/drop enums multiple times', function() {
          const User = current.define<ItestInstance, ItestAttribute>('UserEnums', {
            permissions: new DataTypes.ARRAY(new DataTypes.ENUM([
              'access',
              'write',
              'check',
              'delete',
            ]))
          });

          return User.sync({ force: true }).then(() => User.sync({ force: true }));
        });

        it('should be able to add values to enum types', function() {
          let User = current.define<ItestInstance, ItestAttribute>('UserEnums', {
            permissions: new DataTypes.ARRAY(new DataTypes.ENUM([
              'access',
              'write',
              'check',
              'delete',
            ]))
          });

          return User.sync({ force: true }).then(() => {
            User = current.define<ItestInstance, ItestAttribute>('UserEnums', {
              permissions: new DataTypes.ARRAY(
                new DataTypes.ENUM('view', 'access', 'edit', 'write', 'check', 'delete')
              )
            });

            return User.sync();
          }).then(() => {
            return current.getQueryInterface().pgListEnums(User.getTableName());
          }).then(enums => {
            expect(enums).to.have.length(1);
            expect(enums[0].enum_value).to.equal('{view,access,edit,write,check,delete}');
          });
        });

        it('should be able to insert new record', function() {
          const User = current.define<ItestInstance, ItestAttribute>('UserEnums', {
            name: new DataTypes.STRING(),
            type: new DataTypes.ENUM('A', 'B', 'C'),
            owners: new DataTypes.ARRAY(new DataTypes.STRING()),
            permissions: new DataTypes.ARRAY(new DataTypes.ENUM([
              'access',
              'write',
              'check',
              'delete',
            ]))
          });

          return User.sync({ force: true })
            .then(() => {
              return User.create({
                name: 'file.exe',
                type: 'C',
                owners: ['userA', 'userB'],
                permissions: ['access', 'write']
              });
            })
            .then(user => {
              expect(user.name).to.equal('file.exe');
              expect(user.type).to.equal('C');
              expect(user.owners).to.deep.equal(['userA', 'userB']);
              expect(user.permissions).to.deep.equal(['access', 'write']);
            });
        });

        it('should fail when trying to insert foreign element on ARRAY(ENUM)', function() {
          const User = current.define<ItestInstance, ItestAttribute>('UserEnums', {
            name: new DataTypes.STRING(),
            type: new DataTypes.ENUM('A', 'B', 'C'),
            owners: new DataTypes.ARRAY(new DataTypes.STRING()),
            permissions: new DataTypes.ARRAY(new DataTypes.ENUM([
              'access',
              'write',
              'check',
              'delete',
            ]))
          });

          return expect(User.sync({ force: true }).then(() => {
            return User.create({
              name: 'file.exe',
              type: 'C',
              owners: ['userA', 'userB'],
              permissions: ['cosmic_ray_disk_access']
            });
          })).to.be.rejectedWith(/invalid input value for enum "enum_UserEnums_permissions": "cosmic_ray_disk_access"/);
        });

        it('should be able to find records', function() {
          const User = current.define<ItestInstance, ItestAttribute>('UserEnums', {
            name: new DataTypes.STRING(),
            type: new DataTypes.ENUM('A', 'B', 'C'),
            permissions: new DataTypes.ARRAY(new DataTypes.ENUM([
              'access',
              'write',
              'check',
              'delete',
            ]))
          });

          return User.sync({ force: true })
            .then(() => {
              return User.bulkCreate([{
                name: 'file1.exe',
                type: 'C',
                permissions: ['access', 'write']
              }, {
                name: 'file2.exe',
                type: 'A',
                permissions: ['access', 'check']
              }, {
                name: 'file3.exe',
                type: 'B',
                permissions: ['access', 'write', 'delete']
              }]);
            })
            .then(() => {
              return User.findAll({
                where: {
                  type: {
                    $in: ['A', 'C']
                  },
                  permissions: {
                    $contains: ['write']
                  }
                }
              });
            })
            .then(users => {
              expect(users.length).to.equal(1);
              expect(users[0].name).to.equal('file1.exe');
              expect(users[0].type).to.equal('C');
              expect(users[0].permissions).to.deep.equal(['access', 'write']);
            });
        });
      });
    });

    describe('integers', () => {
      describe('integer', () => {
        beforeEach(function() {
          _User = current.define<ItestInstance, ItestAttribute>('User', {
            aNumber: new DataTypes.INTEGER()
          });

          return _User.sync({ force: true });
        });

        it('positive', function() {
          const User = _User;

          return User.create({ aNumber: 2147483647 }).then(user => {
            expect(user.aNumber).to.equal(2147483647);
            return User.find({ where: { aNumber: 2147483647 } }).then(_user => {
              expect(_user.aNumber).to.equal(2147483647);
            });
          });
        });

        it('negative', function() {
          const User = _User;

          return User.create({ aNumber: -2147483647 }).then(user => {
            expect(user.aNumber).to.equal(-2147483647);
            return User.find({ where: { aNumber: -2147483647 } }).then(_user => {
              expect(_user.aNumber).to.equal(-2147483647);
            });
          });
        });
      });

      describe('bigint', () => {
        beforeEach(function() {
          _User = current.define<ItestInstance, ItestAttribute>('User', {
            aNumber: new DataTypes.BIGINT()
          });

          return _User.sync({ force: true });
        });

        it('positive', function() {
          const User = _User;

          return User.create({ aNumber: '9223372036854775807' }).then(user => {
            expect(user.aNumber).to.equal('9223372036854775807');
            return User.find({ where: { aNumber: '9223372036854775807' } }).then(_user => {
              expect(_user.aNumber).to.equal('9223372036854775807');
            });
          });
        });

        it('negative', function() {
          const User = _User;

          return User.create({ aNumber: '-9223372036854775807' }).then(user => {
            expect(user.aNumber).to.equal('-9223372036854775807');
            return User.find({ where: { aNumber: '-9223372036854775807' } }).then(_user => {
              expect(_user.aNumber).to.equal('-9223372036854775807');
            });
          });
        });
      });
    });

    describe('timestamps', () => {
      beforeEach(function() {
        _User = current.define<ItestInstance, ItestAttribute>('User', {
          dates: new DataTypes.ARRAY(new DataTypes.DATE())
        });
        return _User.sync({ force: true });
      });

      it('should use bind params instead of "TIMESTAMP WITH TIME ZONE"', function() {
        return _User.create({
          dates: []
        }, {
          logging(sql) {
            expect(sql).not.to.contain('TIMESTAMP WITH TIME ZONE');
            expect(sql).not.to.contain('DATETIME');
          }
        });
      });
    });

    describe('model', () => {
      it('create handles array correctly', function() {
        return _User
          .create({ username: 'user', email: ['foo@bar.com', 'bar@baz.com'] })
          .then(oldUser => {
            expect(oldUser.email).to.contain.members(['foo@bar.com', 'bar@baz.com']);
          });
      });

      it('should save hstore correctly', function() {
        return _User.create({ username: 'user', email: ['foo@bar.com'], settings: { created: '"value"' } }).then(newUser => {
          // Check to see if the default value for an hstore field works
          expect(newUser.document).to.deep.equal({ default: "'value'" });
          expect(newUser.settings).to.deep.equal({ created: '"value"' });

          // Check to see if updating an hstore field works
          return newUser.updateAttributes({ settings: { should: 'update', to: 'this', first: 'place' } }).then(oldUser => {
            // Postgres always returns keys in alphabetical order (ascending)
            expect(oldUser.settings).to.deep.equal({ first: 'place', should: 'update', to: 'this' });
          });
        });
      });

      it('should save hstore array correctly', function() {
        const User = _User;

        return _User.create({
          username: 'bob',
          email: ['myemail@email.com'],
          phones: [{ number: '123456789', type: 'mobile' }, { number: '987654321', type: 'landline' }, { number: '8675309', type: "Jenny's" }, { number: '5555554321', type: '"home\n"' }]
        }).then(() => {
          return User.findById(1).then(user => {
            expect(user.phones.length).to.equal(4);
            expect(user.phones[1].number).to.equal('987654321');
            expect(user.phones[2].type).to.equal("Jenny's");
            expect(user.phones[3].type).to.equal('"home\n"');
          });
        });
      });

      it('should bulkCreate with hstore property', function() {
        const User = _User;

        return _User.bulkCreate([{
          username: 'bob',
          email: ['myemail@email.com'],
          settings: { mailing: true, push: 'facebook', frequency: 3 }
        }]).then(() => {
          return User.findById(1).then(user => {
            expect(user.settings.mailing).to.equal('true');
          });
        });
      });

      it('should update hstore correctly', function() {
        return _User.create({ username: 'user', email: ['foo@bar.com'], settings: { test: '"value"' } }).then(newUser => {
          // Check to see if the default value for an hstore field works
          expect(newUser.document).to.deep.equal({ default: "'value'" });
          expect(newUser.settings).to.deep.equal({ test: '"value"' });

          // Check to see if updating an hstore field works
          return _User.update({ settings: { should: 'update', to: 'this', first: 'place' } }, { where: newUser.where() }).then(() => {
            return newUser.reload().then(() => {
              // Postgres always returns keys in alphabetical order (ascending)
              expect(newUser.settings).to.deep.equal({ first: 'place', should: 'update', to: 'this' });
            });
          });
        });
      });

      it('should update hstore correctly and return the affected rows', function() {
        return _User.create({ username: 'user', email: ['foo@bar.com'], settings: { test: '"value"' } }).then(oldUser => {
          // Update the user and check that the returned object's fields have been parsed by the hstore library
          return _User.update({ settings: { should: 'update', to: 'this', first: 'place' } }, { where: oldUser.where(), returning: true }).spread((count, users) => {
            expect(count).to.equal(1);
            expect(users[0].settings).to.deep.equal({ should: 'update', to: 'this', first: 'place' });
          });
        });
      });

      it('should read hstore correctly', function() {
        const data = { username: 'user', email: ['foo@bar.com'], settings: { test: '"value"' } };

        return _User.create(data)
          .then(() => {
            return _User.find({ where: { username: 'user' } });
          })
          .then(user => {
            // Check that the hstore fields are the same when retrieving the user
            expect(user.settings).to.deep.equal(data.settings);
          });
      });

      it('should read an hstore array correctly', function() {
        const data = { username: 'user', email: ['foo@bar.com'], phones: [{ number: '123456789', type: 'mobile' }, { number: '987654321', type: 'landline' }] };

        return _User.create(data)
          .then(() => {
            // Check that the hstore fields are the same when retrieving the user
            return _User.find({ where: { username: 'user' } });
          }).then(user => {
            expect(user.phones).to.deep.equal(data.phones);
          });
      });

      it('should read hstore correctly from multiple rows', function() {
        return _User
          .create({ username: 'user1', email: ['foo@bar.com'], settings: { test: '"value"' } })
          .then(() => {
            return _User.create({ username: 'user2', email: ['foo2@bar.com'], settings: { another: '"example"' } });
          })
          .then(() => {
            // Check that the hstore fields are the same when retrieving the user
            return _User.findAll({ order: ['username'] });
          })
          .then(users => {
            expect(users[0].settings).to.deep.equal({ test: '"value"' });
            expect(users[1].settings).to.deep.equal({ another: '"example"' });
          });
      });

      it('should read hstore correctly from included models as well', function() {
        const HstoreSubmodel = current.define<ItestInstance, ItestAttribute>('hstoreSubmodel', {
          someValue: new DataTypes.HSTORE()
        });
        const submodelValue = { testing: '"hstore"' };

        _User.hasMany(HstoreSubmodel);

        return current
          .sync({ force: true })
          .then(() => {
            return _User.create({ username: 'user1' })
              .then(user => {
                return HstoreSubmodel.create({ someValue: submodelValue })
                  .then(submodel => {
                    return user.setLinkedData('hstoreSubmodel', [submodel]);
                  });
              });
          })
          .then(() => {
            return _User.find({ where: { username: 'user1' }, include: [HstoreSubmodel] });
          })
          .then(user => {
            expect(user.hasOwnProperty('hstoreSubmodels')).to.be.ok;
            expect(user.hstoreSubmodels.length).to.equal(1);
            expect(user.hstoreSubmodels[0].someValue).to.deep.equal(submodelValue);
          });
      });

      it('should save range correctly', function() {
        const period = [new Date(2015, 0, 1), new Date(2015, 11, 31)];
        return _User.create({ username: 'user', email: ['foo@bar.com'], course_period: period }).then(newUser => {
          // Check to see if the default value for a range field works

          expect(newUser.acceptable_marks.length).to.equal(2);
          expect(newUser.acceptable_marks[0].value).to.equal('0.65'); // lower bound
          expect(newUser.acceptable_marks[1].value).to.equal('1'); // upper bound
          expect(newUser.acceptable_marks[0].inclusive).to.deep.equal(true); // inclusive
          expect(newUser.acceptable_marks[1].inclusive).to.deep.equal(false); // exclusive
          expect(newUser.course_period[0].value instanceof Date).to.be.ok; // lower bound
          expect(newUser.course_period[1].value instanceof Date).to.be.ok; // upper bound
          expect(newUser.course_period[0].value).to.equalTime(period[0]); // lower bound
          expect(newUser.course_period[1].value).to.equalTime(period[1]); // upper bound
          expect(newUser.course_period[0].inclusive).to.deep.equal(true); // inclusive
          expect(newUser.course_period[1].inclusive).to.deep.equal(false); // exclusive

          // Check to see if updating a range field works
          return newUser.updateAttributes({ acceptable_marks: [0.8, 0.9] })
            .then(() => newUser.reload()) // Ensure the acceptable_marks array is loaded with the complete range definition
            .then(() => {
              expect(newUser.acceptable_marks.length).to.equal(2);
              expect(newUser.acceptable_marks[0].value).to.equal('0.8'); // lower bound
              expect(newUser.acceptable_marks[1].value).to.equal('0.9'); // upper bound
            });
        });
      });

      it('should save range array correctly', function() {
        const User = _User;
        const holidays = [
          [new Date(2015, 3, 1), new Date(2015, 3, 15)],
          [new Date(2015, 8, 1), new Date(2015, 9, 15)],
        ];

        return User.create({
          username: 'bob',
          email: ['myemail@email.com'],
          holidays
        }).then(() => {
          return User.findById(1).then(user => {
            expect(user.holidays.length).to.equal(2);
            expect(user.holidays[0].length).to.equal(2);
            expect(user.holidays[0][0].value instanceof Date).to.be.ok;
            expect(user.holidays[0][1].value instanceof Date).to.be.ok;
            expect(user.holidays[0][0].value).to.equalTime(holidays[0][0]);
            expect(user.holidays[0][1].value).to.equalTime(holidays[0][1]);
            expect(user.holidays[1].length).to.equal(2);
            expect(user.holidays[1][0].value instanceof Date).to.be.ok;
            expect(user.holidays[1][1].value instanceof Date).to.be.ok;
            expect(user.holidays[1][0].value).to.equalTime(holidays[1][0]);
            expect(user.holidays[1][1].value).to.equalTime(holidays[1][1]);
          });
        });
      });

      it('should bulkCreate with range property', function() {
        const User = _User;
        const period = [new Date(2015, 0, 1), new Date(2015, 11, 31)];

        return User.bulkCreate([{
          username: 'bob',
          email: ['myemail@email.com'],
          course_period: period
        }]).then(() => {
          return User.findById(1).then(user => {
            expect(user.course_period[0].value instanceof Date).to.be.ok;
            expect(user.course_period[1].value instanceof Date).to.be.ok;
            expect(user.course_period[0].value).to.equalTime(period[0]);  // lower bound
            expect(user.course_period[1].value).to.equalTime(period[1]);  // upper bound
            expect(user.course_period[0].inclusive).to.deep.equal(true);  // inclusive
            expect(user.course_period[1].inclusive).to.deep.equal(false); // exclusive
          });
        });
      });

      it('should update range correctly', function() {
        const User = _User;
        const period = [new Date(2015, 0, 1), new Date(2015, 11, 31)];

        return User.create({ username: 'user', email: ['foo@bar.com'], course_period: period }).then(newUser => {
          // Check to see if the default value for a range field works
          expect(newUser.acceptable_marks.length).to.equal(2);
          expect(newUser.acceptable_marks[0].value).to.equal('0.65'); // lower bound
          expect(newUser.acceptable_marks[1].value).to.equal('1'); // upper bound
          expect(newUser.acceptable_marks[0].inclusive).to.deep.equal(true); // inclusive
          expect(newUser.acceptable_marks[1].inclusive).to.deep.equal(false); // exclusive
          expect(newUser.course_period[0].value instanceof Date).to.be.ok;
          expect(newUser.course_period[1].value instanceof Date).to.be.ok;
          expect(newUser.course_period[0].value).to.equalTime(period[0]); // lower bound
          expect(newUser.course_period[1].value).to.equalTime(period[1]); // upper bound
          expect(newUser.course_period[0].inclusive).to.deep.equal(true);  // inclusive
          expect(newUser.course_period[1].inclusive).to.deep.equal(false); // exclusive


          const period2 = [new Date(2015, 1, 1), new Date(2015, 10, 30)];

          // Check to see if updating a range field works
          return User.update({ course_period: period2 }, { where: newUser.where() }).then(() => {
            return newUser.reload().then(() => {
              expect(newUser.course_period[0].value instanceof Date).to.be.ok;
              expect(newUser.course_period[1].value instanceof Date).to.be.ok;
              expect(newUser.course_period[0].value).to.equalTime(period2[0]); // lower bound
              expect(newUser.course_period[1].value).to.equalTime(period2[1]); // upper bound
              expect(newUser.course_period[0].inclusive).to.deep.equal(true);  // inclusive
              expect(newUser.course_period[1].inclusive).to.deep.equal(false); // exclusive
            });
          });
        });
      });

      it('should update range correctly and return the affected rows', function() {
        const User = _User;
        const period = [new Date(2015, 1, 1), new Date(2015, 10, 30)];

        return User.create({
          username: 'user',
          email: ['foo@bar.com'],
          course_period: [new Date(2015, 0, 1), new Date(2015, 11, 31)]
        }).then(oldUser => {
          // Update the user and check that the returned object's fields have been parsed by the range parser
          return User.update({ course_period: period }, { where: oldUser.where(), returning: true })
            .spread((count, users) => {
              expect(count).to.equal(1);
              expect(users[0].course_period[0].value instanceof Date).to.be.ok;
              expect(users[0].course_period[1].value instanceof Date).to.be.ok;
              expect(users[0].course_period[0].value).to.equalTime(period[0]); // lower bound
              expect(users[0].course_period[1].value).to.equalTime(period[1]); // upper bound
              expect(users[0].course_period[0].inclusive).to.deep.equal(true);  // inclusive
              expect(users[0].course_period[1].inclusive).to.deep.equal(false); // exclusive
            });
        });
      });

      it('should read range correctly', function() {
        const User = _User;

        const course_period = [{ value: new Date(2015, 1, 1), inclusive: false }, { value: new Date(2015, 10, 30), inclusive: false }];

        const data = { username: 'user', email: ['foo@bar.com'], course_period };

        return User.create(data)
          .then(() => {
            return User.find({ where: { username: 'user' } });
          })
          .then(user => {
            // Check that the range fields are the same when retrieving the user
            expect(user.course_period).to.deep.equal(data.course_period);
          });
      });

      it('should read range array correctly', function() {
        const User = _User;
        const holidays = [
          [{ value: new Date(2015, 3, 1, 10), inclusive: true}, { value: new Date(2015, 3, 15), inclusive: true }],
          [{ value: new Date(2015, 8, 1), inclusive: true }, { value: new Date(2015, 9, 15), inclusive: true }]];
        const data = { username: 'user', email: ['foo@bar.com'], holidays };

        return User.create(data)
          .then(() => {
            // Check that the range fields are the same when retrieving the user
            return User.find({ where: { username: 'user' } });
          }).then(user => {
            expect(user.holidays).to.deep.equal(data.holidays);
          });
      });

      it('should read range correctly from multiple rows', function() {
        const User = _User;
        const periods = [
          [new Date(2015, 0, 1), new Date(2015, 11, 31)],
          [new Date(2016, 0, 1), new Date(2016, 11, 31)],
        ];

        return User
          .create({ username: 'user1', email: ['foo@bar.com'], course_period: periods[0] })
          .then(() => {
            return User.create({ username: 'user2', email: ['foo2@bar.com'], course_period: periods[1] });
          })
          .then(() => {
            // Check that the range fields are the same when retrieving the user
            return User.findAll({ order: ['username'] });
          })
          .then(users => {
            expect(users[0].course_period[0].value).to.equalTime(periods[0][0]); // lower bound
            expect(users[0].course_period[1].value).to.equalTime(periods[0][1]); // upper bound
            expect(users[0].course_period[0].inclusive).to.deep.equal(true); // inclusive
            expect(users[0].course_period[1].inclusive).to.deep.equal(false); // exclusive
            expect(users[1].course_period[0].value).to.equalTime(periods[1][0]); // lower bound
            expect(users[1].course_period[1].value).to.equalTime(periods[1][1]); // upper bound
            expect(users[1].course_period[0].inclusive).to.deep.equal(true); // inclusive
            expect(users[1].course_period[1].inclusive).to.deep.equal(false); // exclusive
          });
      });

      it('should read range correctly from included models as well', function() {
        const period = [new Date(2016, 0, 1), new Date(2016, 11, 31)];
        const HolidayDate = current.define<ItestInstance, ItestAttribute>('holidayDate', {
          period: new DataTypes.RANGE(new DataTypes.DATE())
        });

        _User.hasMany(HolidayDate);

        return current
          .sync({ force: true })
          .then(() => {
            return _User
              .create({ username: 'user', email: ['foo@bar.com'] })
              .then(user => {
                return HolidayDate.create({ period })
                  .then(holidayDate => {
                    return user.setLinkedData('holidayDate', [holidayDate]);
                  });
              });
          })
          .then(() => {
            return _User.find({ where: { username: 'user' }, include: [HolidayDate] });
          })
          .then(user => {
            expect(user.hasOwnProperty('holidayDates')).to.be.ok;
            expect(user.holidayDates.length).to.equal(1);
            expect(user.holidayDates[0].period.length).to.equal(2);
            expect(user.holidayDates[0].period[0].value).to.equalTime(period[0]);
            expect(user.holidayDates[0].period[1].value).to.equalTime(period[1]);
          });
      });
    });

    it('should save geometry correctly', function() {
      const point = { type: 'Point', coordinates: [39.807222, -76.984722] };
      return _User.create({ username: 'user', email: ['foo@bar.com'], location: point }).then(newUser => {
        expect(newUser.location).to.deep.eql(point);
      });
    });

    it('should update geometry correctly', function() {
      const User = _User;
      const point1 = { type: 'Point', coordinates: [39.807222, -76.984722] };
      const point2 = { type: 'Point', coordinates: [39.828333, -77.232222] };
      return User.create({ username: 'user', email: ['foo@bar.com'], location: point1 }).then(oldUser => {
        return User.update({ location: point2 }, { where: { username: oldUser.username }, returning: true }).spread((count, updatedUsers) => {
          expect(updatedUsers[0].location).to.deep.eql(point2);
        });
      });
    });

    it('should read geometry correctly', function() {
      const User = _User;
      const point = { type: 'Point', coordinates: [39.807222, -76.984722] };

      return User.create({ username: 'user', email: ['foo@bar.com'], location: point }).then(user => {
        return User.find({ where: { username: user.username } });
      }).then(user => {
        expect(user.location).to.deep.eql(point);
      });
    });

    describe('[POSTGRES] Unquoted identifiers', () => {
      it('can insert and select', function() {
        current.options.quoteIdentifiers = false;
        current.getQueryInterface().QueryGenerator.options.quoteIdentifiers = false;

        _User = current.define<ItestInstance, ItestAttribute>('Userxs', {
          username: new DataTypes.STRING(),
          fullName: new DataTypes.STRING() // Note mixed case
        }, {
          quoteIdentifiers: false
        });

        return _User.sync({ force: true }).then(() => {
          return _User
            .create({ username: 'user', fullName: 'John Smith' })
            .then(user => {
              // We can insert into a table with non-quoted identifiers
              expect(user.id).to.exist;
              expect(user.id).not.to.be.null;
              expect(user.username).to.equal('user');
              expect(user.fullName).to.equal('John Smith');

              // We can query by non-quoted identifiers
              return _User.find({
                where: { fullName: 'John Smith' }
              }).then(user2 => {
                // We can map values back to non-quoted identifiers
                expect(user2.id).to.equal(user.id);
                expect(user2.username).to.equal('user');
                expect(user2.fullName).to.equal('John Smith');

                // We can query and aggregate by non-quoted identifiers
                return _User
                  .count({
                    where: { fullName: 'John Smith' }
                  })
                  .then(count => {
                    current.options.quoteIdentifiers = true;
                    current.getQueryInterface().QueryGenerator.options.quoteIdentifiers = true;
                    current.options.logging = false;
                    expect(count).to.equal(1);
                  });
              });
            });
        });
      });

      it('can select nested include', function() {
        current.options.quoteIdentifiers = false;
        current.getQueryInterface().QueryGenerator.options.quoteIdentifiers = false;
        _Professor = current.define<ItestInstance, ItestAttribute>('Professor', {
          fullName: new DataTypes.STRING()
        }, {
          quoteIdentifiers: false
        });
        _Class = current.define<ItestInstance, ItestAttribute>('Class', {
          name: new DataTypes.STRING()
        }, {
          quoteIdentifiers: false
        });
        _Student = current.define<ItestInstance, ItestAttribute>('Student', {
          fullName: new DataTypes.STRING()
        }, {
          quoteIdentifiers: false
        });
        _ClassStudent = current.define<ItestInstance, ItestAttribute>('ClassStudent', {
        }, {
          quoteIdentifiers: false,
          tableName: 'class_student'
        });
        _Professor.hasMany(_Class);
        _Class.belongsTo(_Professor);
        _Class.belongsToMany(_Student, { through: _ClassStudent });
        _Student.belongsToMany(_Class, { through: _ClassStudent });
        return _Professor.sync({ force: true })
          .then(() => {
            return _Student.sync({ force: true });
          })
          .then(() => {
            return _Class.sync({ force: true });
          })
          .then(() => {
            return _ClassStudent.sync({ force: true });
          })
          .then(() => {
            return _Professor.bulkCreate([
              {
                id: 1,
                fullName: 'Albus Dumbledore'
              },
              {
                id: 2,
                fullName: 'Severus Snape'
              },
            ]);
          })
          .then(() => {
            return _Class.bulkCreate([
              {
                id: 1,
                name: 'Transfiguration',
                ProfessorId: 1
              },
              {
                id: 2,
                name: 'Potions',
                ProfessorId: 2
              },
              {
                id: 3,
                name: 'Defence Against the Dark Arts',
                ProfessorId: 2
              },
            ]);
          })
          .then(() => {
            return _Student.bulkCreate([
              {
                id: 1,
                fullName: 'Harry Potter'
              },
              {
                id: 2,
                fullName: 'Ron Weasley'
              },
              {
                id: 3,
                fullName: 'Ginny Weasley'
              },
              {
                id: 4,
                fullName: 'Hermione Granger'
              },
            ]);
          })
          .then(() => {
            return Promise.all([
              _Student.findById(1)
                .then(Harry => {
                  return Harry.setLinkedData('Class', [1, 2, 3]);
                }),
              _Student.findById(2)
                .then(Ron => {
                  return Ron.setLinkedData('Class', [1, 2]);
                }),
              _Student.findById(3)
                .then(Ginny => {
                  return Ginny.setLinkedData('Class', [2, 3]);
                }),
              _Student.findById(4)
                .then(Hermione => {
                  return Hermione.setLinkedData('Class', [1, 2, 3]);
                }),
            ]);
          })
          .then(() => {
            return _Professor.findAll({
              include: [
                {
                  model: _Class,
                  include: [
                    {
                      model: _Student
                    },
                  ]
                },
              ],
              order: [
                ['id'],
                [_Class, 'id'],
                [_Class, _Student, 'id'],
              ]
            });
          })
          .then(professors => {
            expect(professors.length).to.eql(2);
            expect(professors[0].fullName).to.eql('Albus Dumbledore');
            expect(professors[0].Classes.length).to.eql(1);
            expect(professors[0].Classes[0].Students.length).to.eql(3);
          })
          .finally(() => {
            current.getQueryInterface().QueryGenerator.options.quoteIdentifiers = true;
          });
      });
    });
  });
}
