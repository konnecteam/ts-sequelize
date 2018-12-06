'use strict';

import * as chai from 'chai';
import * as sinon from 'sinon';
import DataTypes from '../../../../lib/data-types';
import { Sequelize } from '../../../../lib/sequelize';
import Support from '../../../../test/support';
const expect = chai.expect;
const Promise = Sequelize.Promise;
const dialect = Support.getTestDialect();

const baseCLOBContent = 'thisisaverylongcontentthatwillbeconcatenedmultipletimestocreateastringwithalengthsuperiorto4000chars';

if (dialect === 'oracle') {
  describe(Support.getTestDialectTeaser('CLOB'), () => {

    it('should retrieve the CLOB content with only one request', function() {
      const User = this.sequelize.define('User', {text : DataTypes.TEXT});
      const sqlSpy = sinon.spy();

      //We create a very long string to insert into CLOB
      let veryLongString = '';
      for (let i = 0; i < 401; i++) {
        veryLongString += baseCLOBContent;
      }

      return this.sequelize.sync({force: true}).then(() => {
        return Promise.join(
          User.create({
            id: 1,
            text : veryLongString
          }),
          User.create({
            id: 2,
            text : veryLongString
          })
        ).then(() => {
          return User.findAll({
            attributes : ['id', 'text'],
            offset : 0,
            limit : 15,
            order: [
              ['id', 'ASC'],
            ],
            logging: sqlSpy
          });
        }).then(users => {
          expect(sqlSpy).to.have.been.calledOnce;

          expect(users[0]).to.be.ok;
          expect(users[0].text).to.be.ok;
          expect(users[0].text.length).to.equal(veryLongString.length);
          expect(users[0].text).to.equal(veryLongString);

          expect(users[1]).to.be.ok;
          expect(users[1].text).to.be.ok;
          expect(users[1].text.length).to.equal(veryLongString.length);
          expect(users[1].text).to.equal(veryLongString);

          const secondCall = sqlSpy.getCall(0);
          expect(secondCall.lastArg.attributes.length).to.equal(2);
          expect('include' in secondCall.lastArg).to.equal(false);
        });
      });
    });

    it('should retrieve the CLOB content with two requests', function() {
      const User = this.sequelize.define('User', {text : DataTypes.TEXT});
      const sqlSpy = sinon.spy();

      //We create a very long string to insert into CLOB
      let veryLongString = '';
      for (let i = 0; i < 401; i++) {
        veryLongString += baseCLOBContent;
      }

      return this.sequelize.sync({force: true}).then(() => {
        return Promise.join(
          User.create({
            id: 1,
            text : veryLongString
          }),
          User.create({
            id: 2,
            text : veryLongString
          })
        ).then(() => {
          return User.findAll({
            attributes : ['id', 'text'],
            offset : 0,
            limit : 15,
            order: [
              ['id', 'ASC'],
            ],
            logging: sqlSpy,
            shouldTreatTextColumns : true
          });
        }).then(users => {
          expect(sqlSpy).to.have.been.calledTwice;

          expect(users[0]).to.be.ok;
          expect(users[0].text).to.be.ok;
          expect(users[0].text.length).to.equal(veryLongString.length);
          expect(users[0].text).to.equal(veryLongString);

          expect(users[1]).to.be.ok;
          expect(users[1].text).to.be.ok;
          expect(users[1].text.length).to.equal(veryLongString.length);
          expect(users[1].text).to.equal(veryLongString);

          const secondCall = sqlSpy.getCall(1);
          expect(secondCall.lastArg.attributes.length).to.equal(2);
          expect('include' in secondCall.lastArg).to.equal(false);
        });
      });
    });

    it('should run two requests to retrieve the CLOB content', function() {
      const User = this.sequelize.define('User', {text : DataTypes.TEXT});
      const Task = this.sequelize.define('Task', {});
      const sqlSpy = sinon.spy();

      User.Tasks = User.hasMany(Task, {as: 'tasks'});

      //We create a very long string to insert into CLOB
      let veryLongString = '';
      for (let i = 0; i < 401; i++) {
        veryLongString += baseCLOBContent;
      }

      return this.sequelize.sync({force: true}).then(() => {
        return Promise.join(
          User.create({
            id: 1,
            text : veryLongString,
            tasks: [
              {},
              {},
              {},
            ]
          }, {
            include: [User.Tasks]
          }),
          User.create({
            id: 2,
            text : veryLongString,
            tasks: [
              {},
            ]
          }, {
            include: [User.Tasks]
          })
        ).then(() => {
          return User.findAll({
            attributes : ['id', 'text'],
            offset : 0,
            limit : 15,
            include: [
              {association: User.Tasks},
            ],
            order: [
              ['id', 'ASC'],
            ],
            logging: sqlSpy
          });
        }).then(users => {
          expect(sqlSpy).to.have.been.calledTwice;

          expect(users[0]).to.be.ok;
          expect(users[0].text).to.be.ok;
          expect(users[0].text.length).to.equal(veryLongString.length);
          expect(users[0].text).to.equal(veryLongString);

          expect(users[1]).to.be.ok;
          expect(users[1].text).to.be.ok;
          expect(users[1].text.length).to.equal(veryLongString.length);
          expect(users[1].text).to.equal(veryLongString);

          const secondCall = sqlSpy.getCall(1);
          expect(secondCall.lastArg.attributes.length).to.equal(2);
          expect('include' in secondCall.lastArg).to.equal(false);
        });
      });
    });

    it('should run two requests to retrieve the CLOB content inside the include', function() {
      const User = this.sequelize.define('User', {});
      const Task = this.sequelize.define('Task', {text : DataTypes.TEXT});
      const sqlSpy = sinon.spy();

      User.Tasks = User.hasMany(Task, {as: 'tasks'});

      //We create a very long string to insert into CLOB
      let veryLongString = '';
      for (let i = 0; i < 401; i++) {
        veryLongString += baseCLOBContent;
      }

      return this.sequelize.sync({force: true}).then(() => {
        return Promise.join(
          User.create({
            id: 1,
            tasks: [
              {text : veryLongString},
              {text : veryLongString},
              {text : veryLongString},
            ]
          }, {
            include: [User.Tasks]
          }),
          User.create({
            id: 2,
            tasks: [
              {text : veryLongString},
            ]
          }, {
            include: [User.Tasks]
          })
        ).then(() => {
          return User.findAll({
            offset : 0,
            limit : 15,
            include: [
              {association: User.Tasks, attributes : ['id', 'text']},
            ],
            order: [
              ['id', 'ASC'],
            ],
            logging: sqlSpy
          });
        }).then(users => {
          expect(sqlSpy).to.have.been.calledTwice;

          expect(users[0]).to.be.ok;
          expect(users[0].tasks).to.be.ok;
          expect(users[0].tasks.length).to.equal(3);
          expect(users[0].tasks[0].text).to.equal(veryLongString);
          expect(users[0].tasks[0].text.length).to.equal(veryLongString.length);

          expect(users[1]).to.be.ok;
          expect(users[1].tasks).to.be.ok;
          expect(users[1].tasks.length).to.equal(1);
          expect(users[1].tasks[0].text).to.equal(veryLongString);
          expect(users[1].tasks[0].text.length).to.equal(veryLongString.length);

          const secondCall = sqlSpy.getCall(1);
          //Two attributes asked for the include, but 3 were really asked to be able to map the include to the main model
          expect(secondCall.lastArg.attributes.length).to.equal(3);
          expect('include' in secondCall.lastArg).to.equal(false);
        });
      });
    });

  });
}
