'use strict';

import * as chai from 'chai';
import DataTypes from '../../../../lib/data-types';
import { Model } from '../../../../lib/model';
import { ItestAttribute, ItestInstance } from '../../../dummy/dummy-data-set';
import Support from '../../support';
const expect = chai.expect;
const dialect = Support.getTestDialect();
const dbFile = __dirname + '/test.sqlite';
const storages = [dbFile];
const current = Support.sequelize;

if (dialect === 'sqlite') {
  describe('[SQLITE Specific] DAOFactory', () => {
    let User : Model<ItestInstance, ItestAttribute>;
    after(function() {
      current.options.storage = ':memory:';
    });

    beforeEach(function() {
      current.options.storage = dbFile;
      User = current.define<ItestInstance, ItestAttribute>('User', {
        age: new DataTypes.INTEGER(),
        name: new DataTypes.STRING(),
        bio: new DataTypes.TEXT()
      });
      return User.sync({ force: true });
    });

    storages.forEach(storage => {
      describe('with storage "' + storage + '"', () => {
        after(() => {
          if (storage === dbFile) {
            require('fs').writeFileSync(dbFile, '');
          }
        });

        describe('create', () => {
          it('creates a table entry', function() {
            return User.create({ age: 21, name: 'John Wayne', bio: 'noot noot' }).then(user => {
              expect(user.age).to.equal(21);
              expect(user.name).to.equal('John Wayne');
              expect(user.bio).to.equal('noot noot');

              return User.findAll().then(users => {
                const usernames = users.map(_user => {
                  return _user.name;
                });
                expect(usernames).to.contain('John Wayne');
              });
            });
          });

          it('should allow the creation of an object with options as attribute', function() {
            const Person = current.define<ItestInstance, ItestAttribute>('Person', {
              name: new DataTypes.STRING(),
              options: new DataTypes.TEXT()
            });

            return Person.sync({ force: true }).then(() => {
              const options = JSON.stringify({ foo: 'bar', bar: 'foo' });

              return Person.create({
                name: 'John Doe',
                options
              }).then(people => {
                expect(people.options).to.deep.equal(options);
              });
            });
          });

          it('should allow the creation of an object with a boolean (true) as attribute', function() {
            const Person = current.define<ItestInstance, ItestAttribute>('Person', {
              name: new DataTypes.STRING(),
              has_swag: new DataTypes.BOOLEAN()
            });

            return Person.sync({ force: true }).then(() => {
              return Person.create({
                name: 'John Doe',
                has_swag: true
              }).then(people => {
                expect(people.has_swag).to.be.ok;
              });
            });
          });

          it('should allow the creation of an object with a boolean (false) as attribute', function() {
            const Person = current.define<ItestInstance, ItestAttribute>('Person', {
              name: new DataTypes.STRING(),
              has_swag: new DataTypes.BOOLEAN()
            });

            return Person.sync({ force: true }).then(() => {
              return Person.create({
                name: 'John Doe',
                has_swag: false
              }).then(people => {
                expect(people.has_swag).to.not.be.ok;
              });
            });
          });
        });

        describe('.find', () => {
          beforeEach(function() {
            return User.create({name: 'user', bio: 'footbar'});
          });

          it('finds normal lookups', function() {
            return User.find({ where: { name: 'user' } }).then(user => {
              expect(user.name).to.equal('user');
            });
          });

          it.skip('should make aliased attributes available', function() {
            return User.find({ where: { name: 'user' }, attributes: ['id', ['name', 'username']] }).then(user => {
              expect(user.username).to.equal('user');
            });
          });
        });

        describe('.all', () => {
          beforeEach(function() {
            return User.bulkCreate([
              {name: 'user', bio: 'foobar'},
              {name: 'user', bio: 'foobar'},
            ]);
          });

          it('should return all users', function() {
            return User.findAll().then(users => {
              expect(users).to.have.length(2);
            });
          });
        });

        describe('.min', () => {
          it('should return the min value', function() {
            const users = [];

            for (let i = 2; i < 5; i++) {
              users[users.length] = {age: i};
            }

            return User.bulkCreate(users).then(() => {
              return User.min('age').then(min => {
                expect(min).to.equal(2);
              });
            });
          });
        });

        describe('.max', () => {
          it('should return the max value', function() {
            const users = [];

            for (let i = 2; i <= 5; i++) {
              users[users.length] = {age: i};
            }

            return User.bulkCreate(users).then(() => {
              return User.max('age').then(min => {
                expect(min).to.equal(5);
              });
            });
          });
        });
      });
    });
  });
}
