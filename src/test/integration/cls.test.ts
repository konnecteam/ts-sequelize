'use strict';

import * as chai from 'chai';
import * as cls from 'continuation-local-storage';
import { Model } from '../..';
import DataTypes from '../../lib/data-types';
import { ItestAttribute, ItestInstance } from '../dummy/dummy-data-set';
import Support from './support';
const expect = chai.expect;
const dialect = Support.getTestDialect();
const Sequelize = Support.Sequelize;
const Promise = Sequelize.Promise;
let current = Support.sequelize;

if (current.dialect.supports.transactions) {
  describe(Support.getTestDialectTeaser('Continuation local storage'), () => {
    let User : Model<ItestInstance, ItestAttribute>;
    before(function() {
      this.thenOriginal = Promise.prototype.then;
      Sequelize.useCLS(cls.createNamespace('sequelize'));
    });

    after(() => {
      delete Sequelize._cls;
    });

    beforeEach(function() {
      return Support.prepareTransactionTest(current).bind(this).then(function(sequelize) {
        current = sequelize;

        this.ns = cls.getNamespace('sequelize');

        User = current.define<ItestInstance, ItestAttribute>('user', {
          name: new DataTypes.STRING()
        });
        return current.sync({ force: true });
      });
    });

    describe('context', () => {
      it('does not use continuation storage on manually managed transactions', function() {
        return Sequelize._clsRun(() => {
          return current.transaction().then(transaction => {
            expect(this.ns.get('transaction')).to.be.undefined;
            return transaction.rollback();
          });
        });
      });

      it('supports several concurrent transactions', function() {
        let t1id;
        let t2id;

        return Promise.join(
          current.transaction(() => {
            t1id = this.ns.get('transaction').id;

            return Promise.resolve();
          }),
          current.transaction(() => {
            t2id = this.ns.get('transaction').id;

            return Promise.resolve();
          }),
          () => {
            expect(t1id).to.be.ok;
            expect(t2id).to.be.ok;
            expect(t1id).not.to.equal(t2id);
          }
        );
      });

      it('supports nested promise chains', function() {
        return current.transaction(() => {
          const tid = this.ns.get('transaction').id;

          return User.findAll().then(() => {
            expect(this.ns.get('transaction').id).to.be.ok;
            expect(this.ns.get('transaction').id).to.equal(tid);
          });
        });
      });

      //GG - a transaction is kept open for too long, so we skip this test which has no interests
      it.skip('does not leak variables to the outer scope', function() {
        // This is a little tricky. We want to check the values in the outer scope, when the transaction has been successfully set up, but before it has been comitted.
        // We can't just call another function from inside that transaction, since that would transfer the context to that function - exactly what we are trying to prevent;

        let transactionSetup = false;
        let transactionEnded = false;

        current.transaction(() => {
          transactionSetup = true;

          return Promise.delay(500).then(() => {
            expect(this.ns.get('transaction')).to.be.ok;
            transactionEnded = true;
          });
        });

        return new Promise(resolve => {
          // Wait for the transaction to be setup
          const interval = setInterval(() => {
            if (transactionSetup) {
              clearInterval(interval);
              resolve();
            }
          }, 200);
        }).bind(this).then(function() {
          expect(transactionEnded).not.to.be.ok;

          expect(this.ns.get('transaction')).not.to.be.ok;

          // Just to make sure it didn't change between our last check and the assertion
          expect(transactionEnded).not.to.be.ok;
        });
      });

      it('does not leak variables to the following promise chain', function() {
        return current.transaction(() => {
          return Promise.resolve();
        }).bind(this).then(function() {
          expect(this.ns.get('transaction')).not.to.be.ok;
        });
      });

      it('does not leak outside findOrCreate', function() {
        return User.findOrCreate({
          where: {
            name: 'Kafka'
          },
          logging(sql) {
            if (/default/.test(sql)) {
              throw new Error('The transaction was not properly assigned');
            }
          }
        }).then(() => {
          return User.findAll();
        });
      });
    });

    describe('sequelize.query integration', () => {
      it('automagically uses the transaction in all calls', function() {
        return current.transaction(() => {
          return User.create({ name: 'bob' }).then(() => {
            return Promise.all([
              expect(User.findAll({ transaction: null })).to.eventually.have.length(0),
              expect(User.findAll({})).to.eventually.have.length(1),
            ]);
          });
        });
      });
    });

    it('bluebird patch is applied', function() {
      expect(Promise.prototype.then).to.be.a('function');
      expect(this.thenOriginal).to.be.a('function');
      expect(Promise.prototype.then).not.to.equal(this.thenOriginal);
    });

    it('CLS namespace is stored in Sequelize._cls', function() {
      expect(Sequelize._cls).to.equal(this.ns);
    });

    it('promises returned by sequelize.query are correctly patched', function() {
      const sql = dialect === 'oracle' ? 'select 1 from dual' : 'select 1';
      return current.transaction(t =>
        current.query(sql, {type: Sequelize.QueryTypes.SELECT})
          .then(() => expect(this.ns.get('transaction')).to.equal(t))
      );
    });
  });
}
