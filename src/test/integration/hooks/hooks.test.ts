'use strict';

import * as Promise from 'bluebird';
import * as chai from 'chai';
import * as sinon from 'sinon';
import { Model, Sequelize as Seq } from '../../..';
import DataTypes from '../../../lib/data-types';
import { ItestAttribute, ItestInstance } from '../../dummy/dummy-data-set';
import Support from '../support';
const expect = chai.expect;
const Sequelize = Support.Sequelize;
const dialect = Support.getTestDialect();
const current = Support.sequelize;

describe(Support.getTestDialectTeaser('Hooks'), () => {
  let User : Model<ItestInstance, ItestAttribute>;
  let model : Model<ItestInstance, ItestAttribute>;
  let seq : Seq;
  beforeEach(function() {
    User = current.define<ItestInstance, ItestAttribute>('User', {
      username: {
        type: new DataTypes.STRING(),
        allowNull: false
      },
      mood: {
        type: new DataTypes.ENUM(),
        values: ['happy', 'sad', 'neutral']
      }
    });

    current.define<ItestInstance, ItestAttribute>('ParanoidUser', {
      username: new DataTypes.STRING(),
      mood: {
        type: new DataTypes.ENUM(),
        values: ['happy', 'sad', 'neutral']
      }
    }, {
      paranoid: true
    });

    return current.sync({ force: true });
  });

  describe('#define', () => {
    before(function() {
      current.addHook('beforeDefine', (attributes, options) => {
        options.modelName = 'bar';
        options.name.plural = 'barrs';
        attributes.type = new DataTypes.STRING();
      });

      current.addHook('afterDefine', factory => {
        factory.options.name.singular = 'barr';
      });

      model = current.define<ItestInstance, ItestAttribute>('foo', {name: new DataTypes.STRING()});
    });

    it('beforeDefine hook can change model name', function() {
      expect(model.name).to.equal('bar');
    });

    it('beforeDefine hook can alter options', function() {
      expect(model.options.name.plural).to.equal('barrs');
    });

    it('beforeDefine hook can alter attributes', function() {
      expect(model.rawAttributes.type).to.be.ok;
    });

    it('afterDefine hook can alter options', function() {
      expect(model.options.name.singular).to.equal('barr');
    });

    after(function() {
      current.options.hooks = {};
      current.modelManager.removeModel(model);
    });
  });

  describe('#init', () => {
    before(function() {
      Sequelize.addHook('beforeInit', (config, options) => {
        config.database = 'db2';
        options.host = 'server9';
      });

      Sequelize.addHook('afterInit', sequelize => {
        sequelize.options.protocol = 'udp';
      });

      seq = new Sequelize('db', 'user', 'pass', { dialect });
    });

    it('beforeInit hook can alter config', function() {
      expect(seq.config.database).to.equal('db2');
    });

    it('beforeInit hook can alter options', function() {
      expect(seq.options.host).to.equal('server9');
    });

    it('afterInit hook can alter options', function() {
      expect(seq.options.protocol).to.equal('udp');
    });

    after(() => {
      Sequelize.options.hooks = {};
    });
  });

  describe('passing DAO instances', () => {
    describe('beforeValidate / afterValidate', () => {
      it('should pass a DAO instance to the hook', function() {
        let beforeHooked = false;
        let afterHooked = false;
        User = current.define<ItestInstance, ItestAttribute>('User', {
          username: new DataTypes.STRING()
        }, {
          hooks: {
            beforeValidate(user) {
              expect(user.model).to.equal(User);
              beforeHooked = true;
              return Promise.resolve();
            },
            afterValidate(user) {
              expect(user.model).to.equal(User);
              afterHooked = true;
              return Promise.resolve();
            }
          }
        });

        return User.sync({ force: true }).then(() => {
          return User.create({ username: 'bob' }).then(() => {
            expect(beforeHooked).to.be.true;
            expect(afterHooked).to.be.true;
          });
        });
      });
    });

    describe('beforeCreate / afterCreate', () => {
      it('should pass a DAO instance to the hook', function() {
        let beforeHooked = false;
        let afterHooked = false;
        User = current.define<ItestInstance, ItestAttribute>('User', {
          username: new DataTypes.STRING()
        }, {
          hooks: {
            beforeCreate(user) {
              expect(user.model).to.equal(User);
              beforeHooked = true;
              return Promise.resolve();
            },
            afterCreate(user) {
              expect(user.model).to.equal(User);
              afterHooked = true;
              return Promise.resolve();
            }
          }
        });

        return User.sync({ force: true }).then(() => {
          return User.create({ username: 'bob' }).then(() => {
            expect(beforeHooked).to.be.true;
            expect(afterHooked).to.be.true;
          });
        });
      });
    });

    describe('beforeDestroy / afterDestroy', () => {
      it('should pass a DAO instance to the hook', function() {
        let beforeHooked = false;
        let afterHooked = false;
        User = current.define<ItestInstance, ItestAttribute>('User', {
          username: new DataTypes.STRING()
        }, {
          hooks: {
            beforeDestroy(user) {
              expect(user.model).to.equal(User);
              beforeHooked = true;
              return Promise.resolve();
            },
            afterDestroy(user) {
              expect(user.model).to.equal(User);
              afterHooked = true;
              return Promise.resolve();
            }
          }
        });

        return User.sync({ force: true }).then(() => {
          return User.create({ username: 'bob' }).then(user => {
            return user.destroy().then(() => {
              expect(beforeHooked).to.be.true;
              expect(afterHooked).to.be.true;
            });
          });
        });
      });
    });

    describe('beforeDelete / afterDelete', () => {
      it('should pass a DAO instance to the hook', function() {
        let beforeHooked = false;
        let afterHooked = false;
        User = current.define<ItestInstance, ItestAttribute>('User', {
          username: new DataTypes.STRING()
        }, {
          hooks: {
            beforeDelete(user) {
              expect(user.model).to.equal(User);
              beforeHooked = true;
              return Promise.resolve();
            },
            afterDelete(user) {
              expect(user.model).to.equal(User);
              afterHooked = true;
              return Promise.resolve();
            }
          }
        });

        return User.sync({ force: true }).then(() => {
          return User.create({ username: 'bob' }).then(user => {
            return user.destroy().then(() => {
              expect(beforeHooked).to.be.true;
              expect(afterHooked).to.be.true;
            });
          });
        });
      });
    });

    describe('beforeUpdate / afterUpdate', () => {
      it('should pass a DAO instance to the hook', function() {
        let beforeHooked = false;
        let afterHooked = false;
        User = current.define<ItestInstance, ItestAttribute>('User', {
          username: new DataTypes.STRING()
        }, {
          hooks: {
            beforeUpdate(user) {
              expect(user.model).to.equal(User);
              beforeHooked = true;
              return Promise.resolve();
            },
            afterUpdate(user) {
              expect(user.model).to.equal(User);
              afterHooked = true;
              return Promise.resolve();
            }
          }
        });

        return User.sync({ force: true }).then(() => {
          return User.create({ username: 'bob' }).then(user => {
            user.username = 'bawb';
            return user.save({ fields: ['username'] }).then(() => {
              expect(beforeHooked).to.be.true;
              expect(afterHooked).to.be.true;
            });
          });
        });
      });
    });
  });

  describe('Model#sync', () => {
    describe('on success', () => {
      it('should run hooks', function() {
        const beforeHook = sinon.spy();
        const afterHook = sinon.spy();

        User.beforeSync(beforeHook);
        User.afterSync(afterHook);

        return User.sync().then(() => {
          expect(beforeHook).to.have.been.calledOnce;
          expect(afterHook).to.have.been.calledOnce;
        });
      });

      it('should not run hooks when "hooks = false" option passed', function() {
        const beforeHook = sinon.spy();
        const afterHook = sinon.spy();

        User.beforeSync(beforeHook);
        User.afterSync(afterHook);

        return User.sync({ hooks: false }).then(() => {
          expect(beforeHook).to.not.have.been.called;
          expect(afterHook).to.not.have.been.called;
        });
      });

    });

    describe('on error', () => {
      it('should return an error from before', function() {
        const beforeHook = sinon.spy();
        const afterHook = sinon.spy();

        User.beforeSync(() => {
          beforeHook();
          throw new Error('Whoops!');
        });
        User.afterSync(afterHook);

        return expect(User.sync()).to.be.rejected.then(() => {
          expect(beforeHook).to.have.been.calledOnce;
          expect(afterHook).not.to.have.been.called;
        });
      });

      it('should return an error from after', function() {
        const beforeHook = sinon.spy();
        const afterHook = sinon.spy();

        User.beforeSync(beforeHook);
        User.afterSync(() => {
          afterHook();
          throw new Error('Whoops!');
        });

        return expect(User.sync()).to.be.rejected.then(() => {
          expect(beforeHook).to.have.been.calledOnce;
          expect(afterHook).to.have.been.calledOnce;
        });
      });
    });
  });

  describe('sequelize#sync', () => {
    describe('on success', () => {
      it('should run hooks', function() {
        const beforeHook = sinon.spy();
        const afterHook = sinon.spy();
        const modelBeforeHook = sinon.spy();
        const modelAfterHook = sinon.spy();

        current.beforeBulkSync(beforeHook);
        User.beforeSync(modelBeforeHook);
        User.afterSync(modelAfterHook);
        current.afterBulkSync(afterHook);

        return current.sync().then(() => {
          expect(beforeHook).to.have.been.calledOnce;
          expect(modelBeforeHook).to.have.been.calledOnce;
          expect(modelAfterHook).to.have.been.calledOnce;
          expect(afterHook).to.have.been.calledOnce;
        });
      });

      it('should not run hooks if "hooks = false" option passed', function() {
        const beforeHook = sinon.spy();
        const afterHook = sinon.spy();
        const modelBeforeHook = sinon.spy();
        const modelAfterHook = sinon.spy();

        current.beforeBulkSync(beforeHook);
        User.beforeSync(modelBeforeHook);
        User.afterSync(modelAfterHook);
        current.afterBulkSync(afterHook);

        return current.sync({ hooks: false }).then(() => {
          expect(beforeHook).to.not.have.been.called;
          expect(modelBeforeHook).to.not.have.been.called;
          expect(modelAfterHook).to.not.have.been.called;
          expect(afterHook).to.not.have.been.called;
        });
      });

      afterEach(function() {
        current.options.hooks = {};
      });

    });

    describe('on error', () => {

      it('should return an error from before', function() {
        const beforeHook = sinon.spy();
        const afterHook = sinon.spy();
        current.beforeBulkSync(() => {
          beforeHook();
          throw new Error('Whoops!');
        });
        current.afterBulkSync(afterHook);

        return expect(current.sync()).to.be.rejected.then(() => {
          expect(beforeHook).to.have.been.calledOnce;
          expect(afterHook).not.to.have.been.called;
        });
      });

      it('should return an error from after', function() {
        const beforeHook = sinon.spy();
        const afterHook = sinon.spy();

        current.beforeBulkSync(beforeHook);
        current.afterBulkSync(() => {
          afterHook();
          throw new Error('Whoops!');
        });

        return expect(current.sync()).to.be.rejected.then(() => {
          expect(beforeHook).to.have.been.calledOnce;
          expect(afterHook).to.have.been.calledOnce;
        });
      });

      afterEach(function() {
        current.options.hooks = {};
      });

    });
  });

  describe('#removal', () => {
    it('should be able to remove by name', function() {
      const sasukeHook = sinon.spy();
      const narutoHook = sinon.spy();

      User.hook('beforeCreate', 'sasuke', sasukeHook);
      User.hook('beforeCreate', 'naruto', narutoHook);

      return User.create({ username: 'makunouchi'}).then(() => {
        expect(sasukeHook).to.have.been.calledOnce;
        expect(narutoHook).to.have.been.calledOnce;
        User.removeHook('beforeCreate', 'sasuke');
        return User.create({ username: 'sendo'});
      }).then(() => {
        expect(sasukeHook).to.have.been.calledOnce;
        expect(narutoHook).to.have.been.calledTwice;
      });
    });

    it('should be able to remove by reference', function() {
      const sasukeHook = sinon.spy();
      const narutoHook = sinon.spy();

      User.hook('beforeCreate', sasukeHook);
      User.hook('beforeCreate', narutoHook);

      return User.create({ username: 'makunouchi'}).then(() => {
        expect(sasukeHook).to.have.been.calledOnce;
        expect(narutoHook).to.have.been.calledOnce;
        User.removeHook('beforeCreate', sasukeHook);
        return User.create({ username: 'sendo'});
      }).then(() => {
        expect(sasukeHook).to.have.been.calledOnce;
        expect(narutoHook).to.have.been.calledTwice;
      });
    });

    it('should be able to remove proxies', function() {
      const sasukeHook = sinon.spy();
      const narutoHook = sinon.spy();

      User.hook('beforeSave', sasukeHook);
      User.hook('beforeSave', narutoHook);

      return User.create({ username: 'makunouchi'}).then(user => {
        expect(sasukeHook).to.have.been.calledOnce;
        expect(narutoHook).to.have.been.calledOnce;
        User.removeHook('beforeSave', sasukeHook);
        return user.updateAttributes({ username: 'sendo'});
      }).then(() => {
        expect(sasukeHook).to.have.been.calledOnce;
        expect(narutoHook).to.have.been.calledTwice;
      });
    });
  });
});
