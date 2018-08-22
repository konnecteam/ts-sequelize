'use strict';

import * as chai from 'chai';
import * as semver from 'semver';
import { Model } from '../../..';
import DataTypes from '../../../lib/data-types';
import { ItestAttribute, ItestInstance } from '../../dummy/dummy-data-set';
import Support from '../support';

const expect = chai.expect;
const dialect = Support.getTestDialect();
const current = Support.sequelize;

describe(Support.getTestDialectTeaser('Model'), () => {
  if (current.dialect.supports.GEOMETRY) {
    let User : Model<ItestInstance, ItestAttribute>;
    describe('GEOMETRY', () => {
      beforeEach(function() {
        User = current.define<ItestInstance, ItestAttribute>('User', {
          username: new DataTypes.STRING(),
          geometry: new DataTypes.GEOMETRY()
        });

        return User.sync({ force: true });
      });

      it('works with aliases fields', function() {
        const Pub = current.define<ItestInstance, ItestAttribute>('Pub', {
          location: {field: 'coordinates', type: new DataTypes.GEOMETRY()}
        });
        const point = {type: 'Point', coordinates: [39.807222, -76.984722]};

        return Pub.sync({ force: true }).then(() => {
          return Pub.create({location: point});
        }).then(pub => {
          expect(pub).not.to.be.null;
          expect(pub.location).to.be.deep.equal(point);
        });
      });

      it('should create a geometry object', function() {
        const point = { type: 'Point', coordinates: [39.807222, -76.984722]};

        return User.create({username: 'username', geometry: point }).then(newUser => {
          expect(newUser).not.to.be.null;
          expect(newUser.geometry).to.be.deep.equal(point);
        });
      });

      it('should update a geometry object', function() {
        const point1 = { type: 'Point', coordinates: [39.807222, -76.984722]};
        const point2 = { type: 'Point', coordinates: [49.807222, -86.984722]};
        const props = {username: 'username', geometry: point1};

        return User.create(props).then(() => {
          return User.update({geometry: point2}, {where: {username: props.username}});
        }).then(() => {
          return User.findOne({where: {username: props.username}});
        }).then(user => {
          expect(user.geometry).to.be.deep.equal(point2);
        });
      });
    });

    describe('GEOMETRY(POINT)', () => {
      beforeEach(function() {
        User = current.define<ItestInstance, ItestAttribute>('User', {
          username: new DataTypes.STRING(),
          geometry: new DataTypes.GEOMETRY('POINT')
        });

        return User.sync({ force: true });
      });

      it('should create a geometry object', function() {
        const point = { type: 'Point', coordinates: [39.807222, -76.984722]};

        return User.create({username: 'username', geometry: point }).then(newUser => {
          expect(newUser).not.to.be.null;
          expect(newUser.geometry).to.be.deep.equal(point);
        });
      });

      it('should update a geometry object', function() {
        const point1 = { type: 'Point', coordinates: [39.807222, -76.984722]};
        const point2 = { type: 'Point', coordinates: [49.807222, -86.984722]};
        const props = {username: 'username', geometry: point1};

        return User.create(props).then(() => {
          return User.update({geometry: point2}, {where: {username: props.username}});
        }).then(() => {
          return User.findOne({where: {username: props.username}});
        }).then(user => {
          expect(user.geometry).to.be.deep.equal(point2);
        });
      });
    });

    describe('GEOMETRY(LINESTRING)', () => {
      beforeEach(function() {
        User = current.define<ItestInstance, ItestAttribute>('User', {
          username: new DataTypes.STRING(),
          geometry: new DataTypes.GEOMETRY('LINESTRING')
        });

        return User.sync({ force: true });
      });

      it('should create a geometry object', function() {
        const point = { type: 'LineString', coordinates: [[100.0, 0.0], [101.0, 1.0]] };

        return User.create({username: 'username', geometry: point }).then(newUser => {
          expect(newUser).not.to.be.null;
          expect(newUser.geometry).to.be.deep.equal(point);
        });
      });

      it('should update a geometry object', function() {
        const point1 = { type: 'LineString', coordinates: [[100.0, 0.0], [101.0, 1.0]] };
        const point2 = { type: 'LineString', coordinates: [[101.0, 0.0], [102.0, 1.0]] };
        const props = {username: 'username', geometry: point1};

        return User.create(props).then(() => {
          return User.update({geometry: point2}, {where: {username: props.username}});
        }).then(() => {
          return User.findOne({where: {username: props.username}});
        }).then(user => {
          expect(user.geometry).to.be.deep.equal(point2);
        });
      });
    });

    describe('GEOMETRY(POLYGON)', () => {
      beforeEach(function() {
        User = current.define<ItestInstance, ItestAttribute>('User', {
          username: new DataTypes.STRING(),
          geometry: new DataTypes.GEOMETRY('POLYGON')
        });

        return User.sync({ force: true });
      });

      it('should create a geometry object', function() {
        const point = { type: 'Polygon', coordinates: [
          [[100.0, 0.0], [101.0, 0.0], [101.0, 1.0],
            [100.0, 1.0], [100.0, 0.0]],
        ]};

        return User.create({username: 'username', geometry: point }).then(newUser => {
          expect(newUser).not.to.be.null;
          expect(newUser.geometry).to.be.deep.equal(point);
        });
      });

      it('should update a geometry object', function() {
        const polygon1 = { type: 'Polygon', coordinates: [
          [[100.0, 0.0], [101.0, 0.0], [101.0, 1.0], [100.0, 1.0], [100.0, 0.0]],
        ]};
        const polygon2 = { type: 'Polygon', coordinates: [
          [[100.0, 0.0], [102.0, 0.0], [102.0, 1.0],
            [100.0, 1.0], [100.0, 0.0]],
        ]};
        const props = {username: 'username', geometry: polygon1};

        return User.create(props).then(() => {
          return User.update({geometry: polygon2}, {where: {username: props.username}});
        }).then(() => {
          return User.findOne({where: {username: props.username}});
        }).then(user => {
          expect(user.geometry).to.be.deep.equal(polygon2);
        });
      });
    });

    describe('sql injection attacks', () => {
      let _Model : Model<ItestInstance, ItestAttribute>;
      beforeEach(function() {
        _Model = current.define<ItestInstance, ItestAttribute>('Model', {
          location: new DataTypes.GEOMETRY()
        });
        return current.sync({ force: true });
      });

      it('should properly escape the single quotes', function() {
        return _Model.create({
          location: {
            type: 'Point',
            properties: {
              exploit: "'); DELETE YOLO INJECTIONS; -- "
            },
            coordinates: [39.807222, -76.984722]
          }
        });
      });

      it('should properly escape the single quotes in coordinates', function() {

        // MySQL 5.7, those guys finally fixed this
        if (dialect === 'mysql' && semver.gte(current.options.databaseVersion, '5.7.0')) {
          return;
        }

        return _Model.create({
          location: {
            type: 'Point',
            properties: {
              exploit: "'); DELETE YOLO INJECTIONS; -- "
            },
            coordinates: [39.807222, "'); DELETE YOLO INJECTIONS; --"]
          }
        });
      });
    });
  }
});
