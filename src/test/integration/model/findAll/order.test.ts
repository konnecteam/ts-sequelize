'use strict';

import * as chai from 'chai';
import DataTypes from '../../../../lib/data-types';
import { Model } from '../../../../lib/model';
import { ItestAttribute, ItestInstance } from '../../../dummy/dummy-data-set';
import Support from '../../support';
const expect = chai.expect;
const current = Support.sequelize;

describe(Support.getTestDialectTeaser('Model'), () => {
  describe('findAll', () => {
    describe('order', () => {
      let User : Model<ItestInstance, ItestAttribute>;
      let Group : Model<ItestInstance, ItestAttribute>;
      describe('Sequelize.literal()', () => {
        beforeEach(function() {
          User = current.define<ItestInstance, ItestAttribute>('User', {
            email: new DataTypes.STRING()
          });

          return User.sync({force: true}).bind(this).then(function() {
            return User.create({
              email: 'test@sequelizejs.com'
            });
          });
        });

        if (current.dialect.name !== 'mssql' && current.dialect.name !== 'oracle') {
          it('should work with order: literal()', function() {
            return User.findAll({
              order: current.literal('email = ' + current.escape('test@sequelizejs.com'))
            }).then(users => {
              expect(users.length).to.equal(1);
              users.forEach(user => {
                expect(user.get('email')).to.be.ok;
              });
            });
          });

          it('should work with order: [literal()]', function() {
            return User.findAll({
              order: [current.literal('email = ' + current.escape('test@sequelizejs.com'))]
            }).then(users => {
              expect(users.length).to.equal(1);
              users.forEach(user => {
                expect(user.get('email')).to.be.ok;
              });
            });
          });

          it('should work with order: [[literal()]]', function() {
            return User.findAll({
              order: [
                [current.literal('email = ' + current.escape('test@sequelizejs.com'))]]
            }).then(users => {
              expect(users.length).to.equal(1);
              users.forEach(user => {
                expect(user.get('email')).to.be.ok;
              });
            });
          });
        }
      });

      describe('injections', () => {
        beforeEach(function() {
          User = current.define<ItestInstance, ItestAttribute>('user', {
            name: new DataTypes.STRING()
          });
          Group = current.define<ItestInstance, ItestAttribute>('group', {

          });
          User.belongsTo(Group);
          return current.sync({force: true});
        });

        if (current.dialect.supports['ORDER NULLS']) {
          it('should not throw with on NULLS LAST/NULLS FIRST', function() {
            return User.findAll({
              include: [Group],
              order: [
                ['id', 'ASC NULLS LAST'],
                [Group, 'id', 'DESC NULLS FIRST']]
            });
          });
        }

        //Oracle doesn't suport if ASC is stuck to the identifier
        if (current.dialect.name !== 'oracle') {
          it('should not throw on a literal', function() {
            return User.findAll({
              order: [
                ['id', current.literal('ASC, name DESC')],
              ]
            });
          });
        }

        it('should not throw with include when last order argument is a field', function() {
          return User.findAll({
            include: [Group],
            order: [
              [Group, 'id'],
            ]
          });
        });
      });
    });
  });
});
