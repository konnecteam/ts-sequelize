'use strict';

import * as chai from 'chai';
import { Model } from '../../..';
import DataTypes from '../../../lib/data-types';
import { ItestAttribute, ItestInstance } from '../../dummy/dummy-data-set';
import Support from '../support';
const expect = chai.expect;
const current = Support.sequelize;

describe(Support.getTestDialectTeaser('Instance'), () => {
  let User : Model<ItestInstance, ItestAttribute>;
  let Project : Model<ItestInstance, ItestAttribute>;
  describe('toJSON', () => {
    beforeEach(function() {
      User = current.define<ItestInstance, ItestAttribute>('User', {
        username: { type: new DataTypes.STRING() },
        age: new DataTypes.INTEGER(),
        level: { type: new DataTypes.INTEGER() },
        isUser: {
          type: new DataTypes.BOOLEAN(),
          defaultValue: false
        },
        isAdmin: { type: new DataTypes.BOOLEAN() }
      }, {
        timestamps: false
      });

      Project = current.define<ItestInstance, ItestAttribute>('NiceProject', { title: new DataTypes.STRING() }, { timestamps: false });

      User.hasMany(Project, { as: 'Projects', foreignKey: 'lovelyUserId' });
      Project.belongsTo(User, { as: 'LovelyUser', foreignKey: 'lovelyUserId' });

      return User.sync({ force: true }).then(() => {
        return Project.sync({ force: true });
      });
    });

    it("dont return instance that isn't defined", function() {
      return Project.create({ lovelyUserId: null })
        .then(project => {
          return Project.findOne({
            where: {
              id: project.id
            },
            include: [
              { model: User, as: 'LovelyUser' },
            ]
          });
        })
        .then(project => {
          const json = project.toJSON();
          expect(json.LovelyUser).to.be.equal(null);
        });
    });

    it("dont return instances that aren't defined", function() {
      return User.create({ username: 'cuss' })
        .then(user => {
          return User.findOne({
            where: {
              id: user.id
            },
            include: [
              { model: Project, as: 'Projects' },
            ]
          });
        })
        .then(user => {
          expect(user.Projects).to.be.instanceof(Array);
          expect(user.Projects).to.be.length(0);
        });
    });

    describe('build', () => {
      it('returns an object containing all values', function() {
        const user = User.build({
          username: 'Adam',
          age: 22,
          level: -1,
          isUser: false,
          isAdmin: true
        });

        expect(user.toJSON()).to.deep.equal({
          id: null,
          username: 'Adam',
          age: 22,
          level: -1,
          isUser: false,
          isAdmin: true
        });
      });

      it('returns a response that can be stringified', function() {
        const user = User.build({
          username: 'test.user',
          age: 99,
          isAdmin: true,
          isUser: false
        });
        expect(JSON.stringify(user)).to.deep.equal('{"id":null,"username":"test.user","age":99,"isAdmin":true,"isUser":false}');
      });

      it('returns a response that can be stringified and then parsed', function() {
        const user = User.build({ username: 'test.user', age: 99, isAdmin: true });
        expect(JSON.parse(JSON.stringify(user))).to.deep.equal({ username: 'test.user', age: 99, isAdmin: true, isUser: false, id: null });
      });
    });

    describe('create', () => {
      it('returns an object containing all values', function() {
        return User.create({
          username: 'Adam',
          age: 22,
          level: -1,
          isUser: false,
          isAdmin: true
        }).then(user => {
          expect(user.toJSON()).to.deep.equal({
            id: user.get('id'),
            username: 'Adam',
            age: 22,
            isUser: false,
            isAdmin: true,
            level: -1
          });
        });
      });

      it('returns a response that can be stringified', function() {
        return User.create({
          username: 'test.user',
          age: 99,
          isAdmin: true,
          isUser: false,
          level: null
        }).then(user => {
          expect(JSON.stringify(user)).to.deep.equal(`{"id":${user.get('id')},"username":"test.user","age":99,"isAdmin":true,"isUser":false,"level":null}`);
        });
      });

      it('returns a response that can be stringified and then parsed', function() {
        return User.create({
          username: 'test.user',
          age: 99,
          isAdmin: true,
          level: null
        }).then(user => {
          expect(JSON.parse(JSON.stringify(user))).to.deep.equal({
            age: 99,
            id: user.get('id'),
            isAdmin: true,
            isUser: false,
            level: null,
            username: 'test.user'
          });
        });
      });
    });

    describe('find', () => {
      it('returns an object containing all values', function() {
        return User.create({
          username: 'Adam',
          age: 22,
          level: -1,
          isUser: false,
          isAdmin: true
        }).then(user => User.findById(user.get('id'))).then(user => {
          expect(user.toJSON()).to.deep.equal({
            id: user.get('id'),
            username: 'Adam',
            age: 22,
            level: -1,
            isUser: false,
            isAdmin: true
          });
        });
      });

      it('returns a response that can be stringified', function() {
        return User.create({
          username: 'test.user',
          age: 99,
          isAdmin: true,
          isUser: false
        }).then(user => User.findById(user.get('id'))).then(user => {
          expect(JSON.stringify(user)).to.deep.equal(`{"id":${user.get('id')},"username":"test.user","age":99,"level":null,"isUser":false,"isAdmin":true}`);
        });
      });

      it('returns a response that can be stringified and then parsed', function() {
        return User.create({
          username: 'test.user',
          age: 99,
          isAdmin: true
        }).then(user => User.findById(user.get('id'))).then(user => {
          expect(JSON.parse(JSON.stringify(user))).to.deep.equal({
            id: user.get('id'),
            username: 'test.user',
            age: 99,
            isAdmin: true,
            isUser: false,
            level: null
          });
        });
      });
    });

    it('includes the eagerly loaded associations', function() {
      return User.create({ username: 'fnord', age: 1, isAdmin: true }).then(user => {
        return Project.create({ title: 'fnord' }).then(project => {
          return user.setLinkedData({ model : 'NiceProject', associationAlias : 'Projects' }, [project]).then(() => {
            return User.findAll({include: [{ model: Project, as: 'Projects' }]}).then(users => {
              const _user = users[0];

              expect(_user.Projects).to.exist;
              expect(JSON.parse(JSON.stringify(_user)).Projects).to.exist;

              return Project.findAll({include: [{ model: User, as: 'LovelyUser' }]}).then(projects => {
                const _project = projects[0];

                expect(_project.LovelyUser).to.exist;
                expect(JSON.parse(JSON.stringify(_project)).LovelyUser).to.exist;
              });
            });
          });
        });
      });
    });
  });
});
