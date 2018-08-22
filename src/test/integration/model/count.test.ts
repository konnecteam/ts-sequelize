'use strict';

import * as chai from 'chai';
import { Model } from '../../..';
import DataTypes from '../../../lib/data-types';
import { ItestAttribute, ItestInstance } from '../../dummy/dummy-data-set';
import Support from '../support';
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

  describe('count', () => {
    beforeEach(function() {
      return User.bulkCreate([
        {username: 'boo'},
        {username: 'boo2'},
      ]).then(() => {
        return User.findOne();
      }).then(user => {
        return user.createLinkedData<ItestInstance, ItestAttribute>('Project', {
          name: 'project1'
        });
      });
    });

    it('should count rows', function() {
      return expect(User.count()).to.eventually.equal(2);
    });

    it('should support include', function() {
      return expect(User.count({
        include: [{
          model: Project,
          where: {
            name: 'project1'
          }
        }]
      })).to.eventually.equal(1);
    });

    it('should return attributes', function() {
      return User.create({
        username: 'valak',
        createdAt: (new Date()).setFullYear(2015)
      })
        .then(() =>
          User.count({
            attributes: ['createdAt'],
            group: ['createdAt']
          })
        )
        .then(users => {
          expect((users as any).length).to.be.eql(2);

          // have attributes
          if (current.dialect.name === 'oracle') {
            expect(users[0].createdat).to.exist;
            expect(users[1].createdat).to.exist;
          }  else {
            expect(users[0].createdAt).to.exist;
            expect(users[1].createdAt).to.exist;
          }
        });
    });

    it('should not return NaN', function() {
      return current.sync({ force: true })
        .then(() =>
          User.bulkCreate([
            { username: 'valak', age: 10},
            { username: 'conjuring', age: 20},
            { username: 'scary', age: 10},
          ])
        )
        .then(() =>
          User.count({
            where: { age: 10 },
            group: ['age'],
            order: ['age']
          })
        )
        .then(result => {
          expect(parseInt(result[0].count, 10)).to.be.eql(2);
          return User.count({
            where: { username: 'fire' }
          });
        })
        .then(count => {
          expect(count).to.be.eql(0);
          return User.count({
            where: { username: 'fire' },
            group: 'age'
          });
        })
        .then(count => {
          expect(count).to.be.eql([]);
        });
    });

    it('should be able to specify column for COUNT()', function() {
      return current.sync({ force: true })
        .then(() =>
          User.bulkCreate([
            { username: 'ember', age: 10},
            { username: 'angular', age: 20},
            { username: 'mithril', age: 10},
          ])
        )
        .then(() =>
          User.count({
            col: 'username'
          })
        )
        .then(count => {
          expect(count).to.be.eql(3);
          return User.count({
            col: 'age',
            distinct: true
          });
        })
        .then(count => {
          expect(count).to.be.eql(2);
        });
    });

    it('should be able to use where clause on included models', function() {
      const queryObject = {
        col: 'username',
        include: [Project],
        where: {
          '$Projects.name$': 'project1'
        }
      };
      return User.count(queryObject).then(count => {
        expect(count).to.be.eql(1);
        queryObject.where['$Projects.name$'] = 'project2';
        return User.count(queryObject);
      }).then(count => {
        expect(count).to.be.eql(0);
      });
    });

    it('should be able to specify column for COUNT() with includes', function() {
      return current.sync({ force: true }).then(() =>
        User.bulkCreate([
          { username: 'ember', age: 10},
          { username: 'angular', age: 20},
          { username: 'mithril', age: 10},
        ])
      ).then(() =>
        User.count({
          col: 'username',
          distinct: true,
          include: [Project]
        })
      ).then(count => {
        expect(count).to.be.eql(3);
        return User.count({
          col: 'age',
          distinct: true,
          include: [Project]
        });
      }).then(count => expect(count).to.be.eql(2));
    });

  });
});
