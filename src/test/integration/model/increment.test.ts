'use strict';

import * as chai from 'chai';
import * as moment from 'moment';
import { Model } from '../../..';
import DataTypes from '../../../lib/data-types';
import { ItestAttribute, ItestInstance } from '../../dummy/dummy-data-set';
import Support from '../../support';
const dialect = Support.getTestDialect();
const expect = chai.expect;
const Promise = Support.sequelize.Promise;
const current = Support.sequelize;

describe(Support.getTestDialectTeaser('Model'), () => {
  let User : Model<ItestInstance, ItestAttribute>;
  beforeEach(function() {
    User = current.define<ItestInstance, ItestAttribute>('User', {
      id: { type: DataTypes.INTEGER, primaryKey: true },
      aNumber: { type: DataTypes.INTEGER },
      bNumber: { type: DataTypes.INTEGER },
      cNumber: { type: DataTypes.INTEGER, field: 'c_number'}
    });

    return User.sync({ force: true }).then(() => {
      return User.bulkCreate([{
        id: 1,
        aNumber: 0,
        bNumber: 0
      }, {
        id: 2,
        aNumber: 0,
        bNumber: 0
      }, {
        id: 3,
        aNumber: 0,
        bNumber: 0
      }, {
        id: 4,
        aNumber: 0,
        bNumber: 0,
        cNumber: 0
      }]);
    });
  });

  [
    'increment',
    'decrement']
  .forEach(method => {
    describe(method, () => {
      before(function() {
        this.assert = (increment, decrement) => {
          return method === 'increment'  ? increment : decrement;
        };
      });

      it('supports where conditions', function() {
        return User.findById(1).then(() => {
          return User[method](['aNumber'], { by: 2, where: { id: 1 } }).then(() => {
            return User.findById(2).then(user3 => {
              expect(user3.aNumber).to.be.equal(this.assert(0, 0));
            });
          });
        });
      });

      it('uses correct column names for where conditions', function() {
        return User[method](['aNumber'], {by: 2, where: {cNumber: 0}}).then(() => {
          return User.findById(4).then(user4 => {
            expect(user4.aNumber).to.be.equal(this.assert(2, -2));
          });
        });
      });

      it('should still work right with other concurrent increments', function() {
        return User.findAll().then(aUsers => {
          return current.Promise.all([
            User[method](['aNumber'], { by: 2, where: {} }),
            User[method](['aNumber'], { by: 2, where: {} }),
            User[method](['aNumber'], { by: 2, where: {} })])
          .then(() => {
            return User.findAll().then(bUsers => {
              for (let i = 0; i < bUsers.length; i++) {
                expect(bUsers[i].aNumber).to.equal(this.assert(aUsers[i].aNumber + 6, aUsers[i].aNumber - 6));
              }
            });
          });
        });
      });

      it('with array', function() {
        return User.findAll().then(aUsers => {
          return User[method](['aNumber'], { by: 2, where: {} }).then(() => {
            return User.findAll().then(bUsers => {
              for (let i = 0; i < bUsers.length; i++) {
                expect(bUsers[i].aNumber).to.equal(this.assert(aUsers[i].aNumber + 2, aUsers[i].aNumber - 2));
              }
            });
          });
        });
      });

      it('with single field', function() {
        return User.findAll().then(aUsers => {
          return User[method]('aNumber', { by: 2, where: {} }).then(() => {
            return User.findAll().then(bUsers => {
              for (let i = 0; i < bUsers.length; i++) {
                expect(bUsers[i].aNumber).to.equal(this.assert(aUsers[i].aNumber + 2, aUsers[i].aNumber - 2));
              }
            });
          });
        });
      });

      it('with single field and no value', function() {
        return User.findAll().then(aUsers => {
          return User[method]('aNumber', { where: {}}).then(() => {
            return User.findAll().then(bUsers => {
              for (let i = 0; i < bUsers.length; i++) {
                expect(bUsers[i].aNumber).to.equal(this.assert(aUsers[i].aNumber + 1, aUsers[i].aNumber - 1));
              }
            });
          });
        });
      });

      it('with key value pair', function() {
        return User.findAll().then(aUsers => {
          return User[method]({ aNumber: 1, bNumber: 2 }, { where: { }}).then(() => {
            return User.findAll().then(bUsers => {
              for (let i = 0; i < bUsers.length; i++) {
                expect(bUsers[i].aNumber).to.equal(this.assert(aUsers[i].aNumber + 1, aUsers[i].aNumber - 1));
                expect(bUsers[i].bNumber).to.equal(this.assert(aUsers[i].bNumber + 2, aUsers[i].bNumber - 2));
              }
            });
          });
        });
      });

      it('should still work right with other concurrent updates', function() {
        return User.findAll().then(aUsers => {
          return User.update({ aNumber: 2 }, { where: {} }).then(() => {
            return User[method](['aNumber'], { by: 2, where: {} }).then(() => {
              return User.findAll().then(bUsers => {
                for (let i = 0; i < bUsers.length; i++) {
                  // for decrement 2 - 2 = 0
                  expect(bUsers[i].aNumber).to.equal(this.assert(aUsers[i].aNumber + 4, aUsers[i].aNumber));
                }
              });
            });
          });
        });
      });

      it('with timestamps set to true', function() {
        User = current.define<ItestInstance, ItestAttribute>('IncrementUser', {
          aNumber: DataTypes.INTEGER
        }, { timestamps: true });

        return User.sync({ force: true }).bind(this).then(() => {
          return User.create({aNumber: 1});
        }).then(function(user) {
          const oldDate = user.updatedAt;

          return Promise.delay(1000).then(() => {
            return User[method]('aNumber', {by: 1, where: {}});
          }).then(() => {
            return expect(User.findById(1)).to.eventually.have.property('updatedAt').afterTime(oldDate);
          });
        });
      });

      it('with timestamps set to true and options.silent set to true', function() {
        User = current.define<ItestInstance, ItestAttribute>('IncrementUser', {
          aNumber: DataTypes.INTEGER
        }, { timestamps: true });

        return User.sync({ force: true }).bind(this).then(() => {
          return User.create({aNumber: 1});
        }).then(user => {
          //Mysql don't support milliseconds
          const oldDate = dialect === 'mysql' ? new Date(moment(user.updatedAt).milliseconds(0).toISOString()) : user.updatedAt;
          return Promise.delay(1000).then(() => {
            return User[method]('aNumber', {by: 1, silent: true, where: { }});
          }).then(() => {
            return expect(User.findById(1)).to.eventually.have.property('updatedAt').equalTime(oldDate);
          });
        });
      });

      it('should work with scopes', function() {
        User = current.define<ItestInstance, ItestAttribute>('User', {
          aNumber: DataTypes.INTEGER,
          name: DataTypes.STRING
        }, {
          scopes: {
            jeff: {
              where: {
                name: 'Jeff'
              }
            }
          }
        });

        return User.sync({ force: true }).then(() => {
          return User.bulkCreate([
            {
              aNumber: 1,
              name: 'Jeff'
            },
            {
              aNumber: 3,
              name: 'Not Jeff'
            }]);
        }).then(() => {
          return User.scope('jeff')[method]('aNumber', {});
        }).then(() => {
          return User.scope('jeff').findOne();
        }).then(jeff => {
          expect(jeff.aNumber).to.equal(this.assert(2, 0));
        }).then(() => {
          return User.findOne({
            where: {
              name: 'Not Jeff'
            }
          });
        }).then(notJeff => {
          expect(notJeff.aNumber).to.equal(this.assert(3, 3));
        });
      });
    });
  });
});
