'use strict';

import * as Promise from 'bluebird';
import * as chai from 'chai';
import * as semver from 'semver';
import * as sinon from 'sinon';
import { Sequelize } from '../..';
import { QueryTypes } from '../../lib/query-types';
import { Transaction } from '../../lib/transaction';
import { ItestAttribute, ItestInstance } from '../dummy/dummy-data-set';
import Support from './support';
const expect = chai.expect;
const dialect = Support.getTestDialect();
const current = Support.sequelize;
const DataTypes = Support.Sequelize.DataTypes;

//Function adding the from dual clause for Oracle requests
const formatQuery = (qry, force = null) => {
  if (dialect === 'oracle' && ((qry.indexOf('FROM') === -1) || force !== undefined && force)) {
    if (qry.charAt(qry.length - 1) === ';') {
      qry = qry.substr(0, qry.length - 1);
    }
    return qry + ' FROM DUAL';
  }
  return qry;
};

if (current.dialect.supports.transactions) {

  describe(Support.getTestDialectTeaser('Transaction'), () => {
    beforeEach(function() {
      this.sinon = sinon.sandbox.create();
    });

    afterEach(function() {
      this.sinon.restore();
    });

    describe('constructor', () => {
      it('stores options', function() {
        const transaction = new Transaction(current);
        expect(transaction.options).to.be.an.instanceOf(Object);
      });

      it('generates an identifier', function() {
        const transaction = new Transaction(current);
        expect(transaction.id).to.exist;
      });

      it('should call dialect specific generateTransactionId method', function() {
        const transaction = new Transaction(current);
        expect(transaction.id).to.exist;
        if (dialect === 'mssql') {
          expect(transaction.id).to.have.lengthOf(20);
        }
      });
    });

    describe('commit', () => {
      it('is a commit method available', () => {
        expect(Transaction).to.respondTo('commit');
      });
    });

    describe('rollback', () => {
      it('is a rollback method available', () => {
        expect(Transaction).to.respondTo('rollback');
      });
    });

    describe('autoCallback', () => {
      it('supports automatically committing', function() {
        return current.transaction(() => {
          return Promise.resolve();
        });
      });

      it('supports automatically rolling back with a thrown error', function() {
        let t;
        return expect(current.transaction(transaction => {
          t = transaction;
          throw new Error('Yolo');
        })).to.eventually.be.rejected.then(() => {
          expect(t.finished).to.be.equal('rollback');
        });
      });

      it('supports automatically rolling back with a rejection', function() {
        let t;
        return expect(current.transaction(transaction => {
          t = transaction;
          return Promise.reject(new Error('Swag'));
        })).to.eventually.be.rejected.then(() => {
          expect(t.finished).to.be.equal('rollback');
        });
      });

      it('supports running hooks when a transaction is commited', function() {
        const hook = sinon.spy();
        let transaction;
        const sql = dialect === 'oracle' ? 'SELECT 1+1 FROM DUAL' : 'SELECT 1+1';
        return expect(current.transaction(t => {
          transaction = t;
          transaction.afterCommit(hook);
          return current.query(sql, {transaction, type: QueryTypes.SELECT});
        }).then(() => {
          expect(hook).to.have.been.calledOnce;
          expect(hook).to.have.been.calledWith(transaction);
        })
        ).to.eventually.be.fulfilled;
      });

      it('does not run hooks when a transaction is rolled back', function() {
        const hook = sinon.spy();
        return expect(current.transaction(transaction => {
          transaction.afterCommit(hook);
          return Promise.reject(new Error('Rollback'));
        })
        ).to.eventually.be.rejected.then(() => {
          expect(hook).to.not.have.been.called;
        });
      });

      //Promise rejection test is specifc to postgres
      if (dialect === 'postgres') {
        it('do not rollback if already committed', function() {
          const SumSumSum = current.define<ItestInstance, ItestAttribute>('transaction', {
            value: {
              type: new DataTypes.DECIMAL(10, 3),
              field: 'value'
            }
          });
          const transTest = function(val) {
            return current.transaction({isolationLevel: 'SERIALIZABLE'}, t => {
              return SumSumSum.sum('value', {transaction: t}).then(() => {
                return SumSumSum.create({value: -val}, {transaction: t});
              });
            });
          };
          // Attention: this test is a bit racy. If you find a nicer way to test this: go ahead
          return SumSumSum.sync({force: true}).then(() => {
            return expect(Promise.join(transTest(80), transTest(80), transTest(80))).to.eventually.be.rejectedWith('could not serialize access due to read/write dependencies among transactions');
          }).delay(100).then(() => {
            if (current.test.$runningQueries !== 0) {
              return current.Promise.delay(200);
            }
            return void 0;
          }).then(() => {
            if (current.test.$runningQueries !== 0) {
              return current.Promise.delay(500);
            }
          });
        });
      }

    });

    it('does not allow queries after commit', function() {
      return current.transaction().then(t => {
        return current.query(formatQuery('SELECT 1+1'), {transaction: t, raw: true}).then(() => {
          return t.commit();
        }).then(() => {
          return current.query(formatQuery('SELECT 1+1'), {transaction: t, raw: true});
        });
      }).throw(new Error('Expected error not thrown')).catch (err => {
        expect (err.message).to.match(/commit has been called on this transaction\([^)]+\), you can no longer use it\. \(The rejected query is attached as the 'sql' property of this error\)/);
        expect (err.sql).to.equal(formatQuery('SELECT 1+1'));
      });
    });

    it('does not allow queries immediatly after commit call', function() {
      return expect(
        current.transaction().then(t => {
          return current.query(formatQuery('SELECT 1+1'), {transaction: t, raw: true}).then(() => {
            return Promise.join(
              expect(t.commit()).to.eventually.be.fulfilled,
              current.query(formatQuery('SELECT 1+1'), {transaction: t, raw: true}).throw(new Error('Expected error not thrown')).catch (err => {
                expect (err.message).to.match(/commit has been called on this transaction\([^)]+\), you can no longer use it\. \(The rejected query is attached as the 'sql' property of this error\)/);
                expect (err.sql).to.equal(formatQuery('SELECT 1+1'));
              })
            );
          });
        })
      ).to.be.eventually.fulfilled;
    });

    it('does not allow queries after rollback', function() {
      return expect(
        current.transaction().then(t => {
          return current.query(formatQuery('SELECT 1+1'), {transaction: t, raw: true}).then(() => {
            return t.rollback();
          }).then(() => {
            return current.query(formatQuery('SELECT 1+1'), {transaction: t, raw: true});
          });
        })
      ).to.eventually.be.rejected;
    });

    it('does not allow queries immediatly after rollback call', function() {
      return expect(current.transaction().then(t => {
        return Promise.join(
          expect(t.rollback()).to.eventually.be.fulfilled,
          current.query(formatQuery('SELECT 1+1'), {transaction: t, raw: true}).throw(new Error('Expected error not thrown'))
            .catch (err => {
              expect (err.message).to.match(/rollback has been called on this transaction\([^)]+\), you can no longer use it\. \(The rejected query is attached as the 'sql' property of this error\)/);
              expect (err.sql).to.equal(formatQuery('SELECT 1+1'));
            })
        );
      })
      ).to.eventually.be.fulfilled;
    });

    it('does not allow commits after commit', function() {
      return expect(
        current.transaction().then(t => {
          return t.commit().then(() => {
            return t.commit();
          });
        })
      ).to.be.rejectedWith('Transaction cannot be committed because it has been finished with state: commit');
    });

    it('should run hooks if a non-auto callback transaction is committed', function() {
      const hook = sinon.spy();
      let transaction;
      return expect(
        current.transaction().then(t => {
          transaction = t;
          transaction.afterCommit(hook);
          return t.commit().then(() => {
            expect(hook).to.have.been.calledOnce;
            expect(hook).to.have.been.calledWith(t);
          });
        }).catch(err => {
          // Cleanup this transaction so other tests don't
          // fail due to an open transaction
          if (!transaction.finished) {
            return transaction.rollback().then(() => {
              throw err;
            });
          }
          throw err;
        })
      ).to.eventually.be.fulfilled;
    });

    it('should not run hooks if a non-auto callback transaction is rolled back', function() {
      const hook = sinon.spy();
      return expect(
        current.transaction().then(t => {
          t.afterCommit(hook);
          return t.rollback().then(() => {
            expect(hook).to.not.have.been.called;
          });
        })
      ).to.eventually.be.fulfilled;
    });

    it('should throw an error if null is passed to afterCommit', function() {
      const hook = null;
      let transaction;
      return expect(
        current.transaction().then(t => {
          transaction = t;
          transaction.afterCommit(hook);
          return t.commit();
        }).catch(err => {
          // Cleanup this transaction so other tests don't
          // fail due to an open transaction
          if (!transaction.finished) {
            return transaction.rollback().then(() => {
              throw err;
            });
          }
          throw err;
        })
      ).to.eventually.be.rejectedWith('"fn" must be a function');
    });

    it('should throw an error if undefined is passed to afterCommit', function() {
      const hook = undefined;
      let transaction;
      return expect(
        current.transaction().then(t => {
          transaction = t;
          transaction.afterCommit(hook);
          return t.commit();
        }).catch(err => {
          // Cleanup this transaction so other tests don't
          // fail due to an open transaction
          if (!transaction.finished) {
            return transaction.rollback().then(() => {
              throw err;
            });
          }
          throw err;
        })
      ).to.eventually.be.rejectedWith('"fn" must be a function');
    });

    it('should throw an error if an object is passed to afterCommit', function() {
      const hook = {};
      let transaction;
      return expect(
        current.transaction().then(t => {
          transaction = t;
          transaction.afterCommit(hook);
          return t.commit();
        }).catch(err => {
          // Cleanup this transaction so other tests don't
          // fail due to an open transaction
          if (!transaction.finished) {
            return transaction.rollback().then(() => {
              throw err;
            });
          }
          throw err;
        })
      ).to.eventually.be.rejectedWith('"fn" must be a function');
    });

    it('does not allow commits after rollback', function() {
      return expect(current.transaction().then(t => {
        return t.rollback().then(() => {
          return t.commit();
        });
      })).to.be.rejectedWith('Transaction cannot be committed because it has been finished with state: rollback');
    });

    it('does not allow rollbacks after commit', function() {
      return expect(current.transaction().then(t => {
        return t.commit().then(() => {
          return t.rollback();
        });
      })).to.be.rejectedWith('Transaction cannot be rolled back because it has been finished with state: commit');
    });

    it('does not allow rollbacks after rollback', function() {
      return expect(current.transaction().then(t => {
        return t.rollback().then(() => {
          return t.rollback();
        });
      })).to.be.rejectedWith('Transaction cannot be rolled back because it has been finished with state: rollback');
    });

    it('works even if a transaction: null option is passed', function() {
      this.sinon.spy(current, 'query');

      return current.transaction({
        transaction: null
      }).bind(this).then(function(t) {
        return t.commit().bind(this).then(function() {
          expect((current.query as any).callCount).to.be.greaterThan(0);

          for (let i = 0; i < (current.query as any).callCount; i++) {
            expect((current.query as any).getCall(i).args[1].transaction).to.equal(t);
          }
        });
      });
    });

    it('works even if a transaction: undefined option is passed', function() {
      this.sinon.spy(current, 'query');

      return current.transaction({
        transaction: undefined
      }).bind(this).then(function(t) {
        return t.commit().bind(this).then(function() {
          expect((current.query as any).callCount).to.be.greaterThan(0);

          for (let i = 0; i < (current.query as any).callCount; i++) {
            expect((current.query as any).getCall(i).args[1].transaction).to.equal(t);
          }
        });
      });
    });

    if (dialect === 'sqlite') {
      it('provides persistent transactions', () => {
        const sequelize = new Support.Sequelize('database', 'username', 'password', {dialect: 'sqlite'});
        const User = sequelize.define<ItestInstance, ItestAttribute>('user', {
          username: new DataTypes.STRING(),
          awesome: new DataTypes.BOOLEAN()
        });
        let persistentTransaction;

        return sequelize.transaction().then(t => {
          return sequelize.sync({ transaction: t }).then(( ) => {
            return t;
          });
        }).then(t => {
          return User.create({}, {transaction: t}).then(( ) => {
            return t.commit();
          });
        }).then(() => {
          return sequelize.transaction().then(t => {
            persistentTransaction = t;
          });
        }).then(() => {
          return User.findAll({transaction: persistentTransaction}).then(users => {
            expect(users.length).to.equal(1);
            return persistentTransaction.commit();
          });
        });
      });
    }

    if (current.dialect.supports.transactionOptions.type) {
      describe('transaction types', () => {
        it('should support default transaction type DEFERRED', function() {
          return current.transaction({
          }).bind(this).then(function(t) {
            return t.rollback().bind(this).then(() => {
              expect(t.options.type).to.equal('DEFERRED');
            });
          });
        });

        Object.keys(Transaction.TYPES).forEach(key => {
          it('should allow specification of ' + key + ' type', function() {
            return current.transaction({
              type: key
            }).bind(this).then(function(t) {
              return t.rollback().bind(this).then(() => {
                expect(t.options.type).to.equal(Transaction.TYPES[key]);
              });
            });
          });
        });

      });

    }

    if (dialect === 'sqlite') {
      it('automatically retries on SQLITE_BUSY failure', function() {
        return Support.prepareTransactionTest(current).bind({}).then(sequelize => {
          const User = (sequelize as Sequelize).define<ItestInstance, ItestAttribute>('User', { username: new DataTypes.STRING() });
          return User.sync({ force: true }).then(() => {
            const newTransactionFunc = function() {
              return sequelize.transaction({type: Support.Sequelize.Transaction.TYPES.EXCLUSIVE}).then(t => {
                return User.create({}, {transaction: t}).then(( ) => {
                  return t.commit();
                });
              });
            };
            return Promise.join(newTransactionFunc(), newTransactionFunc()).then(() => {
              return User.findAll().then(users => {
                expect(users.length).to.equal(2);
              });
            });
          });
        });
      });

      it('fails with SQLITE_BUSY when retry.match is changed', function() {
        return Support.prepareTransactionTest(current).bind({}).then(sequelize => {
          const User = (sequelize as Sequelize).define<ItestInstance, ItestAttribute>('User', { id: {type: new DataTypes.INTEGER(), primaryKey: true}, username: new DataTypes.STRING() });
          return User.sync({ force: true }).then(() => {
            const newTransactionFunc = function() {
              return sequelize.transaction({type: Support.sequelize.Transaction.TYPES.EXCLUSIVE, retry: {match: ['NO_MATCH']}}).then(t => {
              // introduce delay to force the busy state race condition to fail
                return Promise.delay(1000).then(() => {
                  return User.create({id: null, username: 'test ' + t.id}, {transaction: t}).then(() => {
                    return t.commit();
                  });
                });
              });
            };
            return expect(Promise.join(newTransactionFunc(), newTransactionFunc())).to.be.rejectedWith('SQLITE_BUSY: database is locked');
          });
        });
      });

    }

    if (current.dialect.supports.lock) {
      describe('row locking', () => {
        it('supports for update', function() {
          const User = current.define<ItestInstance, ItestAttribute>('user', {
            username: new DataTypes.STRING(),
            awesome: new DataTypes.BOOLEAN()
          });
          const t1Spy = sinon.spy();
          const t2Spy = sinon.spy();

          return current.sync({ force: true }).then(() => {
            return User.create({ username: 'jan'});
          }).then(() => {
            return current.transaction().then(t1 => {
              return User.find({
                where: {
                  username: 'jan'
                },
                lock: t1.LOCK.UPDATE,
                transaction: t1
              }).then(t1Jan => {
                return current.transaction({
                  isolationLevel: Transaction.ISOLATION_LEVELS.READ_COMMITTED
                }).then(t2 => {
                  return Promise.join(
                    User.find({
                      where: {
                        username: 'jan'
                      },
                      lock: t2.LOCK.UPDATE,
                      transaction: t2
                    }).then(() => {
                      t2Spy();
                      return t2.commit().then(() => {
                        expect(t2Spy).to.have.been.calledAfter(t1Spy); // Find should not succeed before t1 has comitted
                      });
                    }),

                    t1Jan.updateAttributes({
                      awesome: true
                    }, {
                      transaction: t1
                    }).then(() => {
                      t1Spy();
                      return Promise.delay(2000).then(() => {
                        return t1.commit();
                      });
                    })
                  );
                });
              });
            });
          });
        });

        if (current.dialect.supports.skipLocked) {
          it('supports for update with skip locked', function() {
            if (dialect !== 'postgres' || semver.gte(current.options.databaseVersion, '9.5.0')) {
              const User = current.define<ItestInstance, ItestAttribute>('user', {
                username: new DataTypes.STRING(),
                awesome: new DataTypes.BOOLEAN()
              });

              return current.sync({ force: true }).then(() => {
                return Promise.all([
                  User.create(
                    { username: 'jan'}
                  ),
                  User.create(
                    { username: 'joe'}
                  )]);
              }).then(() => {
                return current.transaction().then(t1 => {
                  return User.findAll({
                    limit: 1,
                    lock: true,
                    transaction: t1
                  }).then(results => {
                    const firstUserId = results[0].id;
                    return current.transaction().then(t2 => {
                      return User.findAll({
                        limit: 1,
                        lock: true,
                        skipLocked: true,
                        transaction: t2
                      }).then(secondResults => {
                        expect(secondResults[0].id).to.not.equal(firstUserId);
                        return Promise.all([
                          t1.commit(),
                          t2.commit()]);
                      });
                    });
                  });
                });
              });
            }
          });
        }

        it('fail locking with outer joins', function() {
          const User = current.define<ItestInstance, ItestAttribute>('User', { username: new DataTypes.STRING() });
          const Task = current.define<ItestInstance, ItestAttribute>('Task', { title: new DataTypes.STRING(), active: new DataTypes.BOOLEAN() });

          User.belongsToMany(Task, { through: 'UserTasks' });
          Task.belongsToMany(User, { through: 'UserTasks' });

          return current.sync({ force: true }).then(() => {
            return Promise.join(
              User.create({ username: 'John'}),
              Task.create({ title: 'Get rich', active: false}),
              (john, task1) => {
                return john.setLinkedData('Task', [task1]);
              })
              .then(() => {
                return current.transaction(t1 => {

                  if (current.dialect.supports.lockOuterJoinFailure) {

                    return expect(User.find({
                      where: {
                        username: 'John'
                      },
                      include: [Task],
                      lock: t1.LOCK.UPDATE,
                      transaction: t1
                    })).to.be.rejectedWith('FOR UPDATE cannot be applied to the nullable side of an outer join');

                  } else {

                    return User.find({
                      where: {
                        username: 'John'
                      },
                      include: [Task],
                      lock: t1.LOCK.UPDATE,
                      transaction: t1
                    });
                  }
                });
              });
          });
        });

        if (current.dialect.supports.lockOf) {
          it('supports for update of table', function() {
            const User = current.define<ItestInstance, ItestAttribute>('User', { username: new DataTypes.STRING() }, { tableName: 'Person' });
            const Task = current.define<ItestInstance, ItestAttribute>('Task', { title: new DataTypes.STRING(), active: new DataTypes.BOOLEAN() });

            User.belongsToMany(Task, { through: 'UserTasks' });
            Task.belongsToMany(User, { through: 'UserTasks' });

            return current.sync({ force: true }).then(() => {
              return Promise.join(
                User.create({ username: 'John'}),
                Task.create({ title: 'Get rich', active: false}),
                Task.create({ title: 'Die trying', active: false}),
                (john, task1) => {
                  return john.setLinkedData('Task', [task1]);
                })
                .then(() => {
                  return current.transaction(t1 => {
                    return User.find({
                      where: {
                        username: 'John'
                      },
                      include: [Task],
                      lock: {
                        level: t1.LOCK.UPDATE,
                        of: User
                      },
                      transaction: t1
                    }).then(t1John => {
                    // should not be blocked by the lock of the other transaction
                      return current.transaction(t2 => {
                        return Task.update({
                          active: true
                        }, {
                          where: {
                            active: false
                          },
                          transaction: t2
                        });
                      }).then(() => {
                        return t1John.save({
                          transaction: t1
                        });
                      });
                    });
                  });
                });
            });
          });
        }

        if (current.dialect.supports.lockKey) {
          it('supports for key share', function() {
            const User = current.define<ItestInstance, ItestAttribute>('user', {
              username: new DataTypes.STRING(),
              awesome: new DataTypes.BOOLEAN()
            });
            const t1Spy = sinon.spy();
            const t2Spy = sinon.spy();

            return current.sync({ force: true }).then(() => {
              return User.create({ username: 'jan'});
            }).then(() => {
              return current.transaction().then(t1 => {
                return User.find({
                  where: {
                    username: 'jan'
                  },
                  lock: t1.LOCK.NO_KEY_UPDATE,
                  transaction: t1
                }).then(t1Jan => {
                  return current.transaction().then(t2 => {
                    return Promise.join(
                      User.find({
                        where: {
                          username: 'jan'
                        },
                        lock: t2.LOCK.KEY_SHARE,
                        transaction: t2
                      }).then(() => {
                        t2Spy();
                        return t2.commit();
                      }),
                      t1Jan.update({
                        awesome: true
                      }, {
                        transaction: t1
                      }).then(() => {
                        return Promise.delay(2000).then(() => {
                          t1Spy();
                          expect(t1Spy).to.have.been.calledAfter(t2Spy);
                          return t1.commit();
                        });
                      })
                    );
                  });
                });
              });
            });
          });
        }

        it('supports for share', function() {
          const User = current.define<ItestInstance, ItestAttribute>('user', {
            username: new DataTypes.STRING(),
            awesome: new DataTypes.BOOLEAN()
          });
          const t1Spy = sinon.spy();
          const t2FindSpy = sinon.spy();
          const t2UpdateSpy = sinon.spy();

          return current.sync({ force: true }).then(() => {
            return User.create({ username: 'jan'});
          }).then(() => {
            return current.transaction().then(t1 => {
              return User.find({
                where: {
                  username: 'jan'
                },
                lock: t1.LOCK.SHARE,
                transaction: t1
              }).then(t1Jan => {
                return current.transaction({
                  isolationLevel: Transaction.ISOLATION_LEVELS.READ_COMMITTED
                }).then(t2 => {
                  return Promise.join(
                    User.find({
                      where: {
                        username: 'jan'
                      },
                      transaction: t2
                    }).then(t2Jan => {
                      t2FindSpy();
                      return t2Jan.updateAttributes({
                        awesome: false
                      }, {
                        transaction: t2
                      }).then(() => {
                        t2UpdateSpy();
                        return t2.commit().then(() => {
                          expect(t2FindSpy).to.have.been.calledBefore(t1Spy); // The find call should have returned
                          expect(t2UpdateSpy).to.have.been.calledAfter(t1Spy); // But the update call should not happen before the first transaction has committed
                        });
                      });
                    }),

                    t1Jan.updateAttributes({
                      awesome: true
                    }, {
                      transaction: t1
                    }).then(() => {
                      return Promise.delay(2000).then(() => {
                        t1Spy();
                        return t1.commit();
                      });
                    })
                  );
                });
              });
            });
          });
        });
      });
    }
  });

}
