'use strict';

import * as chai from 'chai';
import DataTypes from '../../../lib/data-types';
import Support from '../../support';
const dialect = Support.getTestDialect();
const expect = chai.expect;

describe(Support.getTestDialectTeaser('Model'), () => {
  beforeEach(function() {
    this.User = this.sequelize.define('User', {
      username: new DataTypes.STRING(),
      age: new DataTypes.INTEGER()
    });
    this.Project = this.sequelize.define('Project', {
      name: new DataTypes.STRING()
    });

    this.User.hasMany(this.Project);
    this.Project.belongsTo(this.User);

    return this.sequelize.sync({force: true});
  });


  describe('findOrBuild', () => {
    it('initialize with includes', function() {
      return this.User.bulkCreate([
        { username: 'Mello', age: 10 },
        { username: 'Mello', age: 20 }],
      { returning: true }).spread((user1, user2) => {
        // oracle bulkCreate can't use returning so we don't know the id of the inserted rows, so we need to put it
        if (dialect === 'oracle') {
          user2.id = 2;
        }
        return this.Project.create({
          name: 'Investigate'
        }).then(project =>
          user2.setProjects([project])
        );
      }).then(() => {
        return this.User.findOrBuild({
          defaults: {
            username: 'Mello',
            age: 10
          },
          where: {
            age: 20
          },
          include: [{
            model: this.Project
          }]
        });
      }).spread((user, created) => {
        expect(created).to.be.false;
        expect(user.get('id')).to.be.ok;
        expect(user.get('username')).to.equal('Mello');
        expect(user.get('age')).to.equal(20);

        expect(user.Projects).to.have.length(1);
        expect(user.Projects[0].get('name')).to.equal('Investigate');
      });
    });
  });
});
