'use strict';

import * as chai from 'chai';
import { Model } from '../../..';
import DataTypes from '../../../lib/data-types';
import { ItestAttribute, ItestInstance } from '../../dummy/dummy-data-set';
import Support from '../../support';
const dialect = Support.getTestDialect();
const expect = chai.expect;
const current = Support.sequelize;

describe(Support.getTestDialectTeaser('Model'), () => {
  let User : Model<ItestInstance, ItestAttribute>;
  let Project : Model<ItestInstance, ItestAttribute>;
  beforeEach(function() {
    User = current.define<ItestInstance, ItestAttribute>('User', {
      username: new DataTypes.STRING(),
      age: new DataTypes.INTEGER()
    });
    Project = current.define<ItestInstance, ItestAttribute>('Project', {
      name: new DataTypes.STRING()
    });

    User.hasMany(Project);
    Project.belongsTo(User);

    return current.sync({force: true});
  });


  describe('findOrBuild', () => {
    it('initialize with includes', function() {
      return User.bulkCreate([
        { username: 'Mello', age: 10 },
        { username: 'Mello', age: 20 }],
      { returning: true }).spread((user1, user2) => {
        // oracle bulkCreate can't use returning so we don't know the id of the inserted rows, so we need to put it
        if (dialect === 'oracle') {
          user2.id = 2;
        }
        return Project.create({
          name: 'Investigate'
        }).then(project =>
          user2.setLinkedData('Project', [project])
        );
      }).then(() => {
        return User.findOrBuild({
          defaults: {
            username: 'Mello',
            age: 10
          },
          where: {
            age: 20
          },
          include: [{
            model: Project
          }]
        });
      }).spread((user, created) => {
        expect(created).to.be.false;
        expect((user as ItestInstance).get('id')).to.be.ok;
        expect((user as ItestInstance).get('username')).to.equal('Mello');
        expect((user as ItestInstance).get('age')).to.equal(20);

        expect((user as ItestInstance).Projects).to.have.length(1);
        expect((user as ItestInstance).Projects[0].get('name')).to.equal('Investigate');
      });
    });
  });
});
