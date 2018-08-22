'use strict';

import * as Promise from 'bluebird';
import * as chai from 'chai';
import * as sinon from 'sinon';
import { Model, Sequelize } from '../..';
import DataTypes from '../../lib/data-types';
import { Transaction } from '../../lib/transaction';
import { ItestAttribute, ItestInstance } from '../dummy/dummy-data-set';
import Support from './support';
const expect = chai.expect;
const current = Support.sequelize;

if (current.dialect.supports.transactions) {

  describe(Support.getTestDialectTeaser('Sequelize#transaction'), () => {
    let _Model : Model<ItestInstance, ItestAttribute>;
    let _sequelize : Sequelize;
    beforeEach(function() {
      this.sinon = sinon.sandbox.create();
    });

    afterEach(function() {
      this.sinon.restore();
    });

    describe('then', () => {
      it('gets triggered once a transaction has been successfully committed', function() {
        let called = false;
        return this
          .sequelize
          .transaction().then(t => {
            return t.commit().then(() => {
              called = true;
            });
          })
          .then(() => {
            expect(called).to.be.ok;
          });
      });

      it('gets triggered once a transaction has been successfully rolled back', function() {
        let called = false;
        return this
          .sequelize
          .transaction().then(t => {
            return t.rollback().then(() => {
              called = true;
            });
          })
          .then(() => {
            expect(called).to.be.ok;
          });
      });

      if (Support.getTestDialect() !== 'sqlite') {
        it('works for long running transactions', function() {
          let User : Model<ItestInstance, ItestAttribute>;
          return Support.prepareTransactionTest(current).bind(this).then(function(sequelize) {
            _sequelize = sequelize;

            User = (sequelize as Sequelize).define<ItestInstance, ItestAttribute>('User', {
              name: new DataTypes.STRING()
            }, { timestamps: false });

            return sequelize.sync({ force: true });
          }).then(function() {
            return _sequelize.transaction();
          }).then(function(t) {
            let query = 'select sleep(2);';

            switch (Support.getTestDialect()) {
              case 'postgres':
                query = 'select pg_sleep(2);';
                break;
              case 'sqlite':
                query = 'select sqlite3_sleep(2000);';
                break;
              case 'mssql':
                query = 'WAITFOR DELAY \'00:00:02\';';
                break;
              case 'oracle':
                query = 'BEGIN DBMS_LOCK.sleep(2); END;';
                break;
              default:
                break;
            }

            return current.query(query, { transaction: t }).bind(this).then(function() {
              return User.create({ name: 'foo' });
            }).then(function() {
              return current.query(query, { transaction: t });
            }).then(() => {
              return t.commit();
            });
          }).then(function() {
            return User.all();
          }).then(users => {
            expect(users.length).to.equal(1);
            expect(users[0].name).to.equal('foo');
          });
        });
      }
    });

    describe('complex long running example', () => {
      it('works with promise syntax', function() {
        return Support.prepareTransactionTest(current).then(sequelize => {
          const Test = (sequelize as Sequelize).define<ItestInstance, ItestAttribute>('Test', {
            id: { type: new DataTypes.INTEGER(), primaryKey: true, autoIncrement: true},
            name: { type: new DataTypes.STRING() }
          });

          return sequelize.sync({ force: true }).then(() => {
            return sequelize.transaction().then(transaction => {
              expect(transaction).to.be.instanceOf(Transaction);

              return Test
                .create({ name: 'Peter' }, { transaction })
                .then(() => {
                  return Promise.delay(1000).then(() => {
                    return transaction
                      .commit()
                      .then(() => Test.count())
                      .then(count => {
                        expect(count).to.equal(1);
                      });
                  });
                });
            });
          });
        });
      });
    });

    describe('concurrency', () => {
      describe('having tables with uniqueness constraints', () => {
        beforeEach(function() {
          return Support.prepareTransactionTest(current).then(sequelize => {
            _sequelize = sequelize;

            _Model = (sequelize as Sequelize).define<ItestInstance, ItestAttribute>('Model', {
              name: { type: new DataTypes.STRING(), unique: true }
            }, {
              timestamps: false
            });

            return _Model.sync({ force: true });
          });
        });

        it('triggers the error event for the second transactions', function() {
          return _sequelize.transaction().then(t1 => {
            return _sequelize.transaction().then(t2 => {
              return _Model.create({ name: 'omnom' }, { transaction: t1 }).then(() => {
                return Promise.all([
                  _Model.create({ name: 'omnom' }, { transaction: t2 }).catch(err => {
                    expect(err).to.be.ok;
                    return t2.rollback();
                  }),
                  Promise.delay(100).then(() => {
                    return t1.commit();
                  }),
                ]);
              });
            });
          });
        });
      });
    });
  });

}
