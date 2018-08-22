'use strict';

import * as Promise from 'bluebird';
import * as chai from 'chai';
import * as sinon from 'sinon';
import { Model } from '../../..';
import DataTypes from '../../../lib/data-types';
import { ItestAttribute, ItestInstance } from '../../dummy/dummy-data-set';
import Support from '../../support';
const expect = chai.expect;
const current = Support.sequelize;

describe(Support.getTestDialectTeaser('Model'), () => {
  let User : Model<ItestInstance, ItestAttribute>;
  let Project : Model<ItestInstance, ItestAttribute>;
  describe('method count', () => {
    before(() => {
      this.oldFindAll = current.Model.prototype.findAll;
      this.oldAggregate = current.Model.prototype.aggregate;

      current.Model.prototype.findAll = sinon.stub().returns(Promise.resolve());

      User = current.define<ItestInstance, ItestAttribute>('User', {
        username: new DataTypes.STRING(),
        age: new DataTypes.INTEGER()
      });
      Project = current.define<ItestInstance, ItestAttribute>('Project', {
        name: new DataTypes.STRING()
      });

      User.hasMany(Project);
      Project.belongsTo(User);
    });

    after(() => {
      current.Model.prototype.findAll = this.oldFindAll;
      current.Model.prototype.aggregate = this.oldAggregate;
    });

    beforeEach(() => {
      this.stub = current.Model.prototype.aggregate = sinon.stub().returns(Promise.resolve());
    });

    describe('should pass the same options to model.aggregate as findAndCount', () => {
      it('with includes', () => {
        const queryObject = {
          include: [Project]
        };
        return User.count(queryObject)
          .then(() => User.findAndCount(queryObject))
          .then(() => {
            const count = this.stub.getCall(0).args;
            const findAndCount = this.stub.getCall(1).args;
            expect(count).to.eql(findAndCount);
          });
      });

      it('attributes should be stripped in case of findAndCount', () => {
        const queryObject = {
          attributes: ['username']
        };
        return User.count(queryObject)
          .then(() => User.findAndCount(queryObject))
          .then(() => {
            const count = this.stub.getCall(0).args;
            const findAndCount = this.stub.getCall(1).args;
            expect(count).not.to.eql(findAndCount);
            count[2].attributes = undefined;
            expect(count).to.eql(findAndCount);
          });
      });
    });

  });
});
