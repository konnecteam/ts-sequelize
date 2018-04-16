'use strict';

import * as chai from 'chai';
const expect = chai.expect;
import Support from './support';
import Promise from '../../lib/promise';
import * as Transaction from '../../lib/transaction';
import * as sinon from 'sinon';
import DataTypes from '../../lib/data-types';
const current = Support.sequelize;

if (current.dialect.supports.transactions) {

  describe(Support.getTestDialectTeaser('Sequelize#transaction'), () => {
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
          return Support.prepareTransactionTest(this.sequelize).bind(this).then(function(sequelize) {
            this.sequelize = sequelize;

            this.User = sequelize.define('User', {
              name: DataTypes.STRING
            }, { timestamps: false });

            return sequelize.sync({ force: true });
          }).then(function() {
            return this.sequelize.transaction();
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

            return this.sequelize.query(query, { transaction: t }).bind(this).then(function() {
              return this.User.create({ name: 'foo' });
            }).then(function() {
              return this.sequelize.query(query, { transaction: t });
            }).then(() => {
              return t.commit();
            });
          }).then(function() {
            return this.User.all();
          }).then(users => {
            expect(users.length).to.equal(1);
            expect(users[0].name).to.equal('foo');
          });
        });
      }
    });

    describe('complex long running example', () => {
      it('works with promise syntax', function() {
        return Support.prepareTransactionTest(this.sequelize).then(sequelize => {
          const Test = sequelize.define('Test', {
            id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true},
            name: { type: DataTypes.STRING }
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
                      .then(() => { return Test.count(); })
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
          const self = this;

          return Support.prepareTransactionTest(this.sequelize).then(sequelize => {
            self.sequelize = sequelize;

            self.Model = sequelize.define('Model', {
              name: { type: DataTypes.STRING, unique: true }
            }, {
              timestamps: false
            });

            return self.Model.sync({ force: true });
          });
        });

        it('triggers the error event for the second transactions', function() {
          const self = this;

          return this.sequelize.transaction().then(t1 => {
            return self.sequelize.transaction().then(t2 => {
              return self.Model.create({ name: 'omnom' }, { transaction: t1 }).then(() => {
                return Promise.all([
                  self.Model.create({ name: 'omnom' }, { transaction: t2 }).catch(err => {
                    expect(err).to.be.ok;
                    return t2.rollback();
                  }),
                  Promise.delay(100).then(() => {
                    return t1.commit();
                  })
                ]);
              });
            });
          });
        });
      });
    });
  });

}
