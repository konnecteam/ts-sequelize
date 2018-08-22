'use strict';

import * as chai from 'chai';
import { Model as M } from '../../..';
import DataTypes from '../../../lib/data-types';
import { ItestAttribute, ItestInstance } from '../../dummy/dummy-data-set';
import Support from '../support';

const expect = chai.expect;
const current = Support.sequelize;

describe(Support.getTestDialectTeaser('Model'), () => {
  let User : M<ItestInstance, ItestAttribute>;
  let Model : M<ItestInstance, ItestAttribute>;
  if (current.dialect.supports.GEOGRAPHY) {
    describe('GEOGRAPHY', () => {
      beforeEach(function() {
        User = current.define<ItestInstance, ItestAttribute>('User', {
          username: new DataTypes.STRING(),
          geography: new DataTypes.GEOGRAPHY()
        });

        return User.sync({ force: true });
      });

      it('works with aliases fields', function() {
        const Pub = current.define<ItestInstance, ItestAttribute>('Pub', {
          location: {field: 'coordinates', type: new DataTypes.GEOGRAPHY()}
        });
        const point = {type: 'Point', coordinates: [39.807222, -76.984722]};

        return Pub.sync({ force: true }).then(() => {
          return Pub.create({location: point});
        }).then(pub => {
          expect(pub).not.to.be.null;
          expect(pub.location).to.be.deep.equal(point);
        });
      });

      it('should create a geography object', function() {
        User = User;
        const point = { type: 'Point', coordinates: [39.807222, -76.984722]};

        return User.create({username: 'username', geography: point }).then(newUser => {
          expect(newUser).not.to.be.null;
          expect(newUser.geography).to.be.deep.equal(point);
        });
      });

      it('should update a geography object', function() {
        User = User;
        const point1 = { type: 'Point', coordinates: [39.807222, -76.984722]};
        const point2 = { type: 'Point', coordinates: [49.807222, -86.984722]};
        const props = {username: 'username', geography: point1};

        return User.create(props).then(() => {
          return User.update({geography: point2}, {where: {username: props.username}});
        }).then(() => {
          return User.findOne({where: {username: props.username}});
        }).then(user => {
          expect(user.geography).to.be.deep.equal(point2);
        });
      });
    });

    describe('GEOGRAPHY(POINT)', () => {
      beforeEach(function() {
        User = current.define<ItestInstance, ItestAttribute>('User', {
          username: new DataTypes.STRING(),
          geography: new DataTypes.GEOGRAPHY('POINT')
        });

        return User.sync({ force: true });
      });

      it('should create a geography object', function() {
        User = User;
        const point = { type: 'Point', coordinates: [39.807222, -76.984722]};

        return User.create({username: 'username', geography: point }).then(newUser => {
          expect(newUser).not.to.be.null;
          expect(newUser.geography).to.be.deep.equal(point);
        });
      });

      it('should update a geography object', function() {
        User = User;
        const point1 = { type: 'Point', coordinates: [39.807222, -76.984722]};
        const point2 = { type: 'Point', coordinates: [49.807222, -86.984722]};
        const props = {username: 'username', geography: point1};

        return User.create(props).then(() => {
          return User.update({geography: point2}, {where: {username: props.username}});
        }).then(() => {
          return User.findOne({where: {username: props.username}});
        }).then(user => {
          expect(user.geography).to.be.deep.equal(point2);
        });
      });
    });

    describe('GEOGRAPHY(LINESTRING)', () => {
      beforeEach(function() {
        User = current.define<ItestInstance, ItestAttribute>('User', {
          username: new DataTypes.STRING(),
          geography: new DataTypes.GEOGRAPHY('LINESTRING')
        });

        return User.sync({ force: true });
      });

      it('should create a geography object', function() {
        User = User;
        const point = { type: 'LineString', coordinates: [[100.0, 0.0], [101.0, 1.0]] };

        return User.create({username: 'username', geography: point }).then(newUser => {
          expect(newUser).not.to.be.null;
          expect(newUser.geography).to.be.deep.equal(point);
        });
      });

      it('should update a geography object', function() {
        User = User;
        const point1 = { type: 'LineString', coordinates: [[100.0, 0.0], [101.0, 1.0]] };
        const point2 = { type: 'LineString', coordinates: [[101.0, 0.0], [102.0, 1.0]] };
        const props = {username: 'username', geography: point1};

        return User.create(props).then(() => {
          return User.update({geography: point2}, {where: {username: props.username}});
        }).then(() => {
          return User.findOne({where: {username: props.username}});
        }).then(user => {
          expect(user.geography).to.be.deep.equal(point2);
        });
      });
    });

    describe('GEOGRAPHY(POLYGON)', () => {
      beforeEach(function() {
        User = current.define<ItestInstance, ItestAttribute>('User', {
          username: new DataTypes.STRING(),
          geography: new DataTypes.GEOGRAPHY('POLYGON')
        });

        return User.sync({ force: true });
      });

      it('should create a geography object', function() {
        User = User;
        const point = { type: 'Polygon', coordinates: [
          [[100.0, 0.0], [101.0, 0.0], [101.0, 1.0],
            [100.0, 1.0], [100.0, 0.0]],
        ]};

        return User.create({username: 'username', geography: point }).then(newUser => {
          expect(newUser).not.to.be.null;
          expect(newUser.geography).to.be.deep.equal(point);
        });
      });

      it('should update a geography object', function() {
        User = User;
        const polygon1 = { type: 'Polygon', coordinates: [
          [[100.0, 0.0], [101.0, 0.0], [101.0, 1.0], [100.0, 1.0], [100.0, 0.0]],
        ]};
        const polygon2 = { type: 'Polygon', coordinates: [
          [[100.0, 0.0], [102.0, 0.0], [102.0, 1.0],
            [100.0, 1.0], [100.0, 0.0]],
        ]};
        const props = {username: 'username', geography: polygon1};

        return User.create(props).then(() => {
          return User.update({geography: polygon2}, {where: {username: props.username}});
        }).then(() => {
          return User.findOne({where: {username: props.username}});
        }).then(user => {
          expect(user.geography).to.be.deep.equal(polygon2);
        });
      });
    });

    if (current.dialect.name === 'postgres') {
      describe('GEOGRAPHY(POLYGON, SRID)', () => {
        beforeEach(function() {
          User = current.define<ItestInstance, ItestAttribute>('User', {
            username: new DataTypes.STRING(),
            geography: new DataTypes.GEOGRAPHY('POLYGON', 4326)
          });

          return User.sync({ force: true });
        });

        it('should create a geography object', function() {
          User = User;
          const point = { type: 'Polygon', coordinates: [
            [[100.0, 0.0], [101.0, 0.0], [101.0, 1.0],
              [100.0, 1.0], [100.0, 0.0]],
          ]};

          return User.create({username: 'username', geography: point }).then(newUser => {
            expect(newUser).not.to.be.null;
            expect(newUser.geography).to.be.deep.equal(point);
          });
        });

        it('should update a geography object', function() {
          User = User;
          const polygon1 = { type: 'Polygon', coordinates: [
            [[100.0, 0.0], [101.0, 0.0], [101.0, 1.0], [100.0, 1.0], [100.0, 0.0]],
          ]};
          const polygon2 = { type: 'Polygon', coordinates: [
            [[100.0, 0.0], [102.0, 0.0], [102.0, 1.0],
              [100.0, 1.0], [100.0, 0.0]],
          ]};
          const props = {username: 'username', geography: polygon1};

          return User.create(props).then(() => {
            return User.update({geography: polygon2}, {where: {username: props.username}});
          }).then(() => {
            return User.findOne({where: {username: props.username}});
          }).then(user => {
            expect(user.geography).to.be.deep.equal(polygon2);
          });
        });
      });
    }

    describe('sql injection attacks', () => {
      beforeEach(function() {
        Model = current.define<ItestInstance, ItestAttribute>('Model', {
          location: new DataTypes.GEOGRAPHY()
        });
        return current.sync({ force: true });
      });

      it('should properly escape the single quotes', function() {
        return Model.create({
          location: {
            type: 'Point',
            properties: {
              exploit: "'); DELETE YOLO INJECTIONS; -- "
            },
            coordinates: [39.807222, -76.984722]
          }
        });
      });
    });
  }
});
