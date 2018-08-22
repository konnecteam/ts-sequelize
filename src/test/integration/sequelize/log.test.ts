'use strict';

import * as chai from 'chai';
import * as sinon from 'sinon';
import Support from '../support';
const expect = chai.expect;
const dialect = Support.getTestDialect();
let current = Support.sequelize;

describe(Support.getTestDialectTeaser('Sequelize'), () => {
  describe('log', () => {
    beforeEach(function() {
      this.spy = sinon.spy(console, 'log');
    });

    afterEach(() => {
      (console.log as any).restore();
    });

    describe('with disabled logging', () => {
      beforeEach(function() {
        current = new Support.Sequelize('db', 'user', 'pw', { dialect, logging: false });
      });

      it('does not call the log method of the logger', function() {
        current.log();
        expect(this.spy.calledOnce).to.be.false;
      });
    });

    describe('with default logging options', () => {
      beforeEach(function() {
        current = new Support.Sequelize('db', 'user', 'pw', { dialect });
      });

      describe('called with no arguments', () => {
        it('calls the log method', function() {
          current.log();
          expect(this.spy.calledOnce).to.be.true;
        });

        it('logs an empty string as info event', function() {
          current.log('');
          expect(this.spy.calledOnce).to.be.true;
        });
      });

      describe('called with one argument', () => {
        it('logs the passed string as info event', function() {
          current.log('my message');
          expect(this.spy.withArgs('my message').calledOnce).to.be.true;
        });
      });

      describe('called with more than two arguments', () => {
        it('passes the arguments to the logger', function() {
          current.log('error', 'my message', 1, { a: 1 });
          expect(this.spy.withArgs('error', 'my message', 1, { a: 1 }).calledOnce).to.be.true;
        });
      });
    });

    describe('with a custom function for logging', () => {
      beforeEach(function() {
        this.spy = sinon.spy();
        current = new Support.Sequelize('db', 'user', 'pw', { dialect, logging: this.spy });
      });

      it('calls the custom logger method', function() {
        current.log('om nom');
        expect(this.spy.calledOnce).to.be.true;
      });

      it('calls the custom logger method with options', function() {
        const message = 'om nom';
        const timeTaken = 5;
        const options = {correlationId: 'ABC001'};
        current.log(message, timeTaken, options);
        expect(this.spy.withArgs(message, timeTaken, options).calledOnce).to.be.true;
      });

    });
  });
});
