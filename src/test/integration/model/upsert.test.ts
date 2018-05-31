'use strict';

import * as chai from 'chai';
import * as sinon from 'sinon';
import {Sequelize} from '../../../index';
import DataTypes from '../../../lib/data-types';
import Support from '../support';
const Promise = Sequelize.Promise;
const expect = chai.expect;
const dialect = Support.getTestDialect();
const current = Support.sequelize;

describe(Support.getTestDialectTeaser('Model'), () => {
  before(function() {
    this.clock = sinon.useFakeTimers();
  });

  beforeEach(function() {
    this.User = this.sequelize.define('user', {
      username: new DataTypes.STRING(),
      foo: {
        unique: 'foobar',
        type: new DataTypes.STRING()
      },
      bar: {
        unique: 'foobar',
        type: new DataTypes.INTEGER()
      },
      baz: {
        type: new DataTypes.STRING(),
        field: 'zab',
        defaultValue: 'BAZ_DEFAULT_VALUE'
      },
      blob: new DataTypes.BLOB()
    });

    this.ModelWithFieldPK = this.sequelize.define('ModelWithFieldPK', {
      userId: {
        field: 'user_id',
        type: new DataTypes.INTEGER(),
        autoIncrement: true,
        primaryKey: true
      },
      foo: {
        type: new DataTypes.STRING(),
        unique: true
      }
    });

    return this.sequelize.sync({ force: true });
  });

  after(function() {
    this.clock.restore();
  });

  if (current.dialect.supports.upserts) {
    describe('upsert', () => {
      it('works with upsert on id', function() {
        return this.User.upsert({ id: 42, username: 'john' }).bind(this).then(function(created) {
          if (dialect === 'sqlite') {
            expect(created).to.be.undefined;
          } else {
            expect(created).to.be.ok;
          }

          this.clock.tick(1000);
          return this.User.upsert({ id: 42, username: 'doe' });
        }).then(function(created) {
          if (dialect === 'sqlite') {
            expect(created).to.be.undefined;
          } else {
            expect(created).not.to.be.ok;
          }

          return this.User.findById(42);
        }).then(user => {
          expect(user.createdAt).to.be.ok;
          expect(user.username).to.equal('doe');
          expect(user.updatedAt).to.be.afterTime(user.createdAt);
        });
      });

      it('works with upsert on a composite key', function() {
        return this.User.upsert({ foo: 'baz', bar: 19, username: 'john' }).bind(this).then(function(created) {
          if (dialect === 'sqlite') {
            expect(created).to.be.undefined;
          } else {
            expect(created).to.be.ok;
          }

          this.clock.tick(1000);
          return this.User.upsert({ foo: 'baz', bar: 19, username: 'doe' });
        }).then(function(created) {
          if (dialect === 'sqlite') {
            expect(created).to.be.undefined;
          } else {
            expect(created).not.to.be.ok;
          }

          return this.User.find({ where: { foo: 'baz', bar: 19 }});
        }).then(user => {
          expect(user.createdAt).to.be.ok;
          expect(user.username).to.equal('doe');
          expect(user.updatedAt).to.be.afterTime(user.createdAt);
        });
      });

      it('should work with UUIDs wth default values', function() {
        const User = this.sequelize.define('User', {
          id: {
            primaryKey: true,
            allowNull: false,
            unique: true,
            type: new DataTypes.UUID(),
            defaultValue: new DataTypes.UUIDV4()
          },

          name: {
            type: new DataTypes.STRING()
          }
        });

        return User.sync({ force: true }).then(() => {
          return User.upsert({ name: 'John Doe' });
        });
      });

      it('works with upsert on a composite primary key', function() {
        const User = this.sequelize.define('user', {
          a: {
            type: new DataTypes.STRING(),
            primaryKey: true
          },
          b: {
            type: new DataTypes.STRING(),
            primaryKey: true
          },
          username: new DataTypes.STRING()
        });

        return User.sync({ force: true }).bind(this).then(() => {
          return Promise.all([
            // Create two users
            User.upsert({ a: 'a', b: 'b', username: 'john' }),
            User.upsert({ a: 'a', b: 'a', username: 'curt' }) ]);
        }).spread(function(created1, created2) {
          if (dialect === 'sqlite') {
            expect(created1).to.be.undefined;
            expect(created2).to.be.undefined;
          } else {
            expect(created1).to.be.ok;
            expect(created2).to.be.ok;
          }


          this.clock.tick(1000);
          // Update the first one
          return User.upsert({ a: 'a', b: 'b', username: 'doe' });
        }).then(created => {
          if (dialect === 'sqlite') {
            expect(created).to.be.undefined;
          } else {
            expect(created).not.to.be.ok;
          }

          return User.find({ where: { a: 'a', b: 'b' }});
        }).then(user1 => {
          expect(user1.createdAt).to.be.ok;
          expect(user1.username).to.equal('doe');
          expect(user1.updatedAt).to.be.afterTime(user1.createdAt);

          return User.find({ where: { a: 'a', b: 'a' }});
        }).then(user2 => {
          // The second one should not be updated
          expect(user2.createdAt).to.be.ok;
          expect(user2.username).to.equal('curt');
          expect(user2.updatedAt).to.equalTime(user2.createdAt);
        });
      });

      it('supports validations', function() {
        const User = this.sequelize.define('user', {
          email: {
            type: new DataTypes.STRING(),
            validate: {
              isEmail: true
            }
          }
        });

        return expect(User.upsert({ email: 'notanemail' })).to.eventually.be.rejectedWith(this.sequelize.ValidationError);
      });

      it('works with BLOBs', function() {
        return this.User.upsert({ id: 42, username: 'john', blob: new Buffer('kaj') }).bind(this).then(function(created) {
          if (dialect === 'sqlite') {
            expect(created).to.be.undefined;
          } else {
            expect(created).to.be.ok;
          }

          this.clock.tick(1000);
          return this.User.upsert({ id: 42, username: 'doe', blob: new Buffer('andrea') });
        }).then(function(created) {
          if (dialect === 'sqlite') {
            expect(created).to.be.undefined;
          } else {
            expect(created).not.to.be.ok;
          }

          return this.User.findById(42);
        }).then(user => {
          expect(user.createdAt).to.be.ok;
          expect(user.username).to.equal('doe');
          if (dialect === 'oracle') {
            user.blob.iLob.read((err, lobData) => {
              expect(lobData).to.be.an.instanceOf(Buffer);
              expect(lobData.toString()).to.have.string('andrea');
            });
          } else {
            expect(user.blob.toString()).to.equal('andrea');
          }
          expect(user.updatedAt).to.be.afterTime(user.createdAt);
        });
      });

      it('works with .field', function() {
        return this.User.upsert({ id: 42, baz: 'foo' }).bind(this).then(function(created) {
          if (dialect === 'sqlite') {
            expect(created).to.be.undefined;
          } else {
            expect(created).to.be.ok;
          }

          return this.User.upsert({ id: 42, baz: 'oof' });
        }).then(function(created) {
          if (dialect === 'sqlite') {
            expect(created).to.be.undefined;
          } else {
            expect(created).not.to.be.ok;
          }

          return this.User.findById(42);
        }).then(user => {
          expect(user.baz).to.equal('oof');
        });
      });

      it('works with primary key using .field', function() {
        return this.ModelWithFieldPK.upsert({ userId: 42, foo: 'first' }).bind(this).then(function(created) {
          if (dialect === 'sqlite') {
            expect(created).to.be.undefined;
          } else {
            expect(created).to.be.ok;
          }


          this.clock.tick(1000);
          return this.ModelWithFieldPK.upsert({ userId: 42, foo: 'second' });
        }).then(function(created) {
          if (dialect === 'sqlite') {
            expect(created).to.be.undefined;
          } else {
            expect(created).not.to.be.ok;
          }

          return this.ModelWithFieldPK.findOne({ where: { userId: 42 } });
        }).then(instance => {
          expect(instance.foo).to.equal('second');
        });
      });

      it('works with database functions', function() {
        return this.User.upsert({ id: 42, username: 'john', foo: this.sequelize.fn('upper', 'mixedCase1')}).bind(this).then(function(created) {
          if (dialect === 'sqlite') {
            expect(created).to.be.undefined;
          } else {
            expect(created).to.be.ok;
          }


          this.clock.tick(1000);
          return this.User.upsert({ id: 42, username: 'doe', foo: this.sequelize.fn('upper', 'mixedCase2') });
        }).then(function(created) {
          if (dialect === 'sqlite') {
            expect(created).to.be.undefined;
          } else {
            expect(created).not.to.be.ok;
          }
          return this.User.findById(42);
        }).then(user => {
          expect(user.createdAt).to.be.ok;
          expect(user.username).to.equal('doe');
          expect(user.foo).to.equal('MIXEDCASE2');
        });
      });

      it('does not overwrite createdAt time on update', function() {
        let originalCreatedAt;
        let originalUpdatedAt;
        const clock = sinon.useFakeTimers();
        return this.User.create({ id: 42, username: 'john'}).bind(this).then(function() {
          return this.User.findById(42);
        }).then(function(user) {
          originalCreatedAt = user.createdAt;
          originalUpdatedAt = user.updatedAt;
          clock.tick(5000);
          return this.User.upsert({ id: 42, username: 'doe'});
        }).then(function() {
          return this.User.findById(42);
        }).then(user => {
          expect(user.updatedAt).to.be.gt(originalUpdatedAt);
          expect(user.createdAt).to.deep.equal(originalCreatedAt);
          clock.restore();
        });
      });

      it('does not update using default values', function() {
        return this.User.create({ id: 42, username: 'john', baz: 'new baz value'}).bind(this).then(function() {
          return this.User.findById(42);
        }).then(function(user) {
          // 'username' should be 'john' since it was set
          expect(user.username).to.equal('john');
          // 'baz' should be 'new baz value' since it was set
          expect(user.baz).to.equal('new baz value');
          return this.User.upsert({ id: 42, username: 'doe'});
        }).then(function() {
          return this.User.findById(42);
        }).then(user => {
          // 'username' was updated
          expect(user.username).to.equal('doe');
          // 'baz' should still be 'new baz value' since it was not updated
          expect(user.baz).to.equal('new baz value');
        });
      });

      it('does not update when setting current values', function() {
        return this.User.create({ id: 42, username: 'john' }).bind(this).then(function() {
          return this.User.findById(42);
        }).then(function(user) {
          return this.User.upsert({ id: user.id, username: user.username });
        }).then(created => {
          if (dialect === 'sqlite') {
            expect(created).to.be.undefined;
          } else {
            // After set node-mysql flags = '-FOUND_ROWS' in connection of mysql,
            // result from upsert should be false when upsert a row to its current value
            // https://dev.mysql.com/doc/refman/5.7/en/insert-on-duplicate.html
            expect(created).to.equal(false);
          }
        });
      });

      it('Works when two separate uniqueKeys are passed', function() {
        const User = this.sequelize.define('User', {
          username: {
            type: new DataTypes.STRING(),
            unique: true
          },
          email: {
            type: new DataTypes.STRING(),
            unique: true
          },
          city: {
            type: new DataTypes.STRING()
          }
        });
        const clock = sinon.useFakeTimers();
        return User.sync({ force: true }).bind(this).then(() => {
          return User.upsert({ username: 'user1', email: 'user1@domain.ext', city: 'City' })
            .then(created => {
              if (dialect === 'sqlite') {
                expect(created).to.be.undefined;
              } else {
                expect(created).to.be.ok;
              }
              clock.tick(1000);
              return User.upsert({ username: 'user1', email: 'user1@domain.ext', city: 'New City' });
            }).then(created => {
              if (dialect === 'sqlite') {
                expect(created).to.be.undefined;
              } else {
                expect(created).not.to.be.ok;
              }
              clock.tick(1000);
              return User.findOne({ where: { username: 'user1', email: 'user1@domain.ext' }});
            })
            .then(user => {
              expect(user.createdAt).to.be.ok;
              expect(user.city).to.equal('New City');
              expect(user.updatedAt).to.be.afterTime(user.createdAt);
            });
        });
      });

      it('works when indexes are created via indexes array', function() {
        const User = this.sequelize.define('User', {
          username: new DataTypes.STRING(),
          email: new DataTypes.STRING(),
          city: new DataTypes.STRING()
        }, {
          indexes: [{
            unique: true,
            fields: ['username']
          }, {
            unique: true,
            fields: ['email']
          }]
        });

        return User.sync({ force: true }).then(() => {
          return User.upsert({ username: 'user1', email: 'user1@domain.ext', city: 'City' })
            .then(created => {
              if (dialect === 'sqlite') {
                expect(created).to.be.undefined;
              } else {
                expect(created).to.be.ok;
              }
              return User.upsert({ username: 'user1', email: 'user1@domain.ext', city: 'New City' });
            }).then(created => {
              if (dialect === 'sqlite') {
                expect(created).to.be.undefined;
              } else {
                expect(created).not.to.be.ok;
              }
              return User.findOne({ where: { username: 'user1', email: 'user1@domain.ext' }});
            })
            .then(user => {
              expect(user.createdAt).to.be.ok;
              expect(user.city).to.equal('New City');
            });
        });
      });

      it('works when composite indexes are created via indexes array', () => {
        const User = current.define('User', {
          name: new DataTypes.STRING(),
          address: new DataTypes.STRING(),
          city: new DataTypes.STRING()
        }, {
          indexes: [{
            unique: 'users_name_address',
            fields: ['name', 'address']
          }]
        });

        return User.sync({ force: true }).then(() => {
          return User.upsert({ name: 'user1', address: 'address', city: 'City' })
            .then(created => {
              if (dialect === 'sqlite') {
                expect(created).to.be.undefined;
              } else {
                expect(created).to.be.ok;
              }
              return User.upsert({ name: 'user1', address: 'address', city: 'New City' });
            }).then(created => {
              if (dialect === 'sqlite') {
                expect(created).to.be.undefined;
              } else {
                expect(created).not.to.be.ok;
              }
              return User.findOne({ where: { name: 'user1', address: 'address' }});
            })
            .then(user => {
              expect(user.createdAt).to.be.ok;
              expect(user.city).to.equal('New City');
            });
        });
      });

      if (dialect === 'mssql') {
        it('Should throw foreignKey violation for MERGE statement as ForeignKeyConstraintError', function() {
          const User = this.sequelize.define('User', {
            username: {
              type: new DataTypes.STRING(),
              primaryKey: true
            }
          });
          const Posts = this.sequelize.define('Posts', {
            title: {
              type: new DataTypes.STRING(),
              primaryKey: true
            },
            username: new DataTypes.STRING()
          });
          Posts.belongsTo(User, { foreignKey: 'username' });
          return this.sequelize.sync({ force: true })
            .then(() => User.create({ username: 'user1' }))
            .then(() => {
              return expect(Posts.upsert({ title: 'Title', username: 'user2' })).to.eventually.be.rejectedWith(Sequelize.ForeignKeyConstraintError);
            });
        });
      }

      if (dialect.match(/^postgres/)) {
        it('works when deletedAt is Infinity and part of primary key', function() {
          const User = this.sequelize.define('User', {
            name: {
              type: new DataTypes.STRING(),
              primaryKey: true
            },
            address: new DataTypes.STRING(),
            deletedAt: {
              type: new DataTypes.DATE(),
              primaryKey: true,
              allowNull: false,
              defaultValue: Infinity
            }
          }, {
            paranoid: true
          });

          return User.sync({ force: true }).then(() => {
            return Promise.all([
              User.create({ name: 'user1' }),
              User.create({ name: 'user2', deletedAt: Infinity }),

              // this record is soft deleted
              User.create({ name: 'user3', deletedAt: -Infinity })])
              .then(() => {
                return User.upsert({ name: 'user1', address: 'address' });
              }).then(() => {
                return User.findAll({
                  where: { address: null }
                });
              }).then(users => {
                expect(users).to.have.lengthOf(2);
              }
            );
          });
        });
      }
    });
  }
});
