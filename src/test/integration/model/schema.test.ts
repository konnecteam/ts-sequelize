'use strict';

import * as chai from 'chai';
import { Model } from '../../..';
import DataTypes from '../../../lib/data-types';
import { ItestAttribute, ItestInstance } from '../../dummy/dummy-data-set';
import Support from '../support';
const expect = chai.expect;
const current = Support.sequelize;
const Promise = current.Promise;
const SCHEMA_ONE = 'schema_one';
const SCHEMA_TWO = 'schema_two';

let locationId;

describe(Support.getTestDialectTeaser('Model'), () => {
  let Employee : Model<ItestInstance, ItestAttribute>;
  let EmployeeOne : Model<ItestInstance, ItestAttribute>;
  let Restaurant : Model<ItestInstance, ItestAttribute>;
  let RestaurantOne : Model<ItestInstance, ItestAttribute>;
  let RestaurantTwo : Model<ItestInstance, ItestAttribute>;
  let Location : Model<ItestInstance, ItestAttribute>;
  let LocationOne : Model<ItestInstance, ItestAttribute>;
  let LocationTwo : Model<ItestInstance, ItestAttribute>;
  if (current.dialect.supports.schemas) {

    describe('global schema', () => {
      before(function() {
        current.options.schema = null;
        RestaurantOne = current.define<ItestInstance, ItestAttribute>('restaurant', {
          foo: new DataTypes.STRING(),
          bar: new DataTypes.STRING()
        });
        LocationOne = current.define<ItestInstance, ItestAttribute>('location', {
          name: new DataTypes.STRING()
        });
        RestaurantOne.belongsTo(LocationOne,
          {
            foreignKey: 'location_id',
            constraints: false
          });
        current.options.schema = SCHEMA_TWO;
        RestaurantTwo = current.define<ItestInstance, ItestAttribute>('restaurant', {
          foo: new DataTypes.STRING(),
          bar: new DataTypes.STRING()
        });
        LocationTwo = current.define<ItestInstance, ItestAttribute>('location', {
          name: new DataTypes.STRING()
        });
        RestaurantTwo.belongsTo(LocationTwo,
          {
            foreignKey: 'location_id',
            constraints: false
          });
        current.options.schema = null;
      });

      beforeEach('build restaurant tables', function() {
        return current.createSchema(SCHEMA_TWO)
          .then(() => {
            return Promise.all([
              RestaurantOne.sync({force: true}),
              RestaurantTwo.sync({force: true}),
            ]);
          });
      });

      afterEach('drop schemas', () => {
        return current.dropSchema(SCHEMA_TWO);
      });

      describe('Add data via model.create, retrieve via model.findOne', () => {
        it('should be able to sync model without schema option', function() {
          expect(RestaurantOne._schema).to.be.null;
          expect(RestaurantTwo._schema).to.equal(SCHEMA_TWO);
        });

        it('should be able to insert data into default table using create', function() {
          return RestaurantOne.create({
            foo: 'one'
          }).then(() => {
            return RestaurantOne.findOne({
              where: {foo: 'one'}
            });
          }).then(obj => {
            expect(obj).to.not.be.null;
            expect(obj.foo).to.equal('one');
            return RestaurantTwo.findOne({
              where: {foo: 'one'}
            });
          }).then(obj => {
            expect(obj).to.be.null;
          });
        });

        it('should be able to insert data into schema table using create', function() {
          return RestaurantTwo.create({
            foo: 'two'
          }).then(() => {
            return RestaurantTwo.findOne({
              where: {foo: 'two'}
            });
          }).then(obj => {
            expect(obj).to.not.be.null;
            expect(obj.foo).to.equal('two');
            return RestaurantOne.findOne({
              where: {foo: 'two'}
            });
          }).then(obj => {
            expect(obj).to.be.null;
          });
        });
      });

      describe('Get associated data in public schema via include', () => {
        beforeEach(function() {
          return Promise.all([
            LocationOne.sync({force: true}),
            LocationTwo.sync({force: true}),
          ]).then(() => {
            return LocationTwo.create({name: 'HQ'});
          }).then(() => {
            return LocationTwo.findOne({where: {name: 'HQ'}});
          }).then(obj => {
            expect(obj).to.not.be.null;
            expect(obj.name).to.equal('HQ');
            locationId = obj.id;
            return LocationOne.findOne({where: {name: 'HQ'}});
          }).then(obj => {
            expect(obj).to.be.null;
          });
        });

        it('should be able to insert and retrieve associated data into the table in schema_two', function() {
          return RestaurantTwo.create({
            foo: 'two',
            location_id: locationId
          }).then(() => {
            return RestaurantTwo.findOne({
              where: {foo: 'two'}, include: [{
                model: LocationTwo, as: 'location'
              }]
            });
          }).then(obj => {
            expect(obj).to.not.be.null;
            expect(obj.foo).to.equal('two');
            expect(obj.location).to.not.be.null;
            expect(obj.location.name).to.equal('HQ');
            return RestaurantOne.findOne({where: {foo: 'two'}});
          }).then(obj => {
            expect(obj).to.be.null;
          });
        });
      });
    });

    describe('schemas', () => {
      before(function() {
        Restaurant = current.define<ItestInstance, ItestAttribute>('restaurant', {
          foo: new DataTypes.STRING(),
          bar: new DataTypes.STRING()
        },
        {tableName: 'restaurants'});
        Location = current.define<ItestInstance, ItestAttribute>('location', {
          name: new DataTypes.STRING()
        },
        {tableName: 'locations'});
        Employee = current.define<ItestInstance, ItestAttribute>('employee', {
          first_name: new DataTypes.STRING(),
          last_name: new DataTypes.STRING()
        },
        {tableName: 'employees'});
        EmployeeOne = Employee.schema(SCHEMA_ONE);
        Restaurant.belongsTo(Location,
          {
            foreignKey: 'location_id',
            constraints: false
          });
        Employee.belongsTo(Restaurant,
          {
            foreignKey: 'restaurant_id',
            constraints: false
          });
        Restaurant.hasMany(Employee, {
          foreignKey: 'restaurant_id',
          constraints: false
        });
        RestaurantOne = Restaurant.schema(SCHEMA_ONE);
        RestaurantTwo = Restaurant.schema(SCHEMA_TWO);
      });


      beforeEach('build restaurant tables', function() {
        return Promise.all([
          current.createSchema('schema_one'),
          current.createSchema('schema_two'),
        ]).then(() => {
          return Promise.all([
            RestaurantOne.sync({force: true}),
            RestaurantTwo.sync({force: true}),
          ]);
        });
      });

      afterEach('drop schemas', () => {
        return Promise.all([
          current.dropSchema('schema_one'),
          current.dropSchema('schema_two'),
        ]);
      });

      describe('Add data via model.create, retrieve via model.findOne', () => {
        it('should be able to insert data into the table in schema_one using create', function() {
          let restaurantId;

          return RestaurantOne.create({
            foo: 'one',
            location_id: locationId
          }).then(() => {
            return RestaurantOne.findOne({
              where: {foo: 'one'}
            });
          }).then(obj => {
            expect(obj).to.not.be.null;
            expect(obj.foo).to.equal('one');
            restaurantId = obj.id;
            return RestaurantOne.findById(restaurantId);
          }).then(obj => {
            expect(obj).to.not.be.null;
            expect(obj.foo).to.equal('one');
            return RestaurantTwo.findOne({where: {foo: 'one'}}).then(RestaurantObj => {
              expect(RestaurantObj).to.be.null;
            });
          });
        });

        it('should be able to insert data into the table in schema_two using create', function() {
          let restaurantId;

          return RestaurantTwo.create({
            foo: 'two',
            location_id: locationId
          }).then(() => {
            return RestaurantTwo.findOne({
              where: {foo: 'two'}
            });
          }).then(obj => {
            expect(obj).to.not.be.null;
            expect(obj.foo).to.equal('two');
            restaurantId = obj.id;
            return RestaurantTwo.findById(restaurantId);
          }).then(obj => {
            expect(obj).to.not.be.null;
            expect(obj.foo).to.equal('two');
            return RestaurantOne.findOne({where: {foo: 'two'}}).then(RestaurantObj => {
              expect(RestaurantObj).to.be.null;
            });
          });
        });
      });

      describe('Persist and retrieve data', () => {
        it('should be able to insert data into both schemas using instance.save and retrieve/count it', function() {

          //building and saving in random order to make sure calling
          // .schema doesn't impact model prototype
          let restaurauntModel = RestaurantOne.build({bar: 'one.1'});

          return restaurauntModel.save()
            .then(() => {
              restaurauntModel = RestaurantTwo.build({bar: 'two.1'});
              return restaurauntModel.save();
            }).then(() => {
              restaurauntModel = RestaurantOne.build({bar: 'one.2'});
              return restaurauntModel.save();
            }).then(() => {
              restaurauntModel = RestaurantTwo.build({bar: 'two.2'});
              return restaurauntModel.save();
            }).then(() => {
              restaurauntModel = RestaurantTwo.build({bar: 'two.3'});
              return restaurauntModel.save();
            }).then(() => {
              return RestaurantOne.findAll();
            }).then(restaurantsOne => {
              expect(restaurantsOne).to.not.be.null;
              expect(restaurantsOne.length).to.equal(2);
              restaurantsOne.forEach(restaurant => {
                expect(restaurant.bar).to.contain('one');
              });
              return RestaurantOne.findAndCountAll();
            }).then(restaurantsOne => {
              expect(restaurantsOne).to.not.be.null;
              expect(restaurantsOne.rows.length).to.equal(2);
              expect(restaurantsOne.count).to.equal(2);
              restaurantsOne.rows.forEach(restaurant => {
                expect(restaurant.bar).to.contain('one');
              });
              return RestaurantOne.findAll({
                where: {bar: {$like: '%.1'}}
              });
            }).then(restaurantsOne => {
              expect(restaurantsOne).to.not.be.null;
              expect(restaurantsOne.length).to.equal(1);
              restaurantsOne.forEach(restaurant => {
                expect(restaurant.bar).to.contain('one');
              });
              return RestaurantOne.count();
            }).then(count => {
              expect(count).to.not.be.null;
              expect(count).to.equal(2);
              return RestaurantTwo.findAll();
            }).then(restaurantsTwo => {
              expect(restaurantsTwo).to.not.be.null;
              expect(restaurantsTwo.length).to.equal(3);
              restaurantsTwo.forEach(restaurant => {
                expect(restaurant.bar).to.contain('two');
              });
              return RestaurantTwo.findAndCountAll();
            }).then(restaurantsTwo => {
              expect(restaurantsTwo).to.not.be.null;
              expect(restaurantsTwo.rows.length).to.equal(3);
              expect(restaurantsTwo.count).to.equal(3);
              restaurantsTwo.rows.forEach(restaurant => {
                expect(restaurant.bar).to.contain('two');
              });
              return RestaurantTwo.findAll({
                where: {bar: {$like: '%.3'}}
              });
            }).then(restaurantsTwo => {
              expect(restaurantsTwo).to.not.be.null;
              expect(restaurantsTwo.length).to.equal(1);
              restaurantsTwo.forEach(restaurant => {
                expect(restaurant.bar).to.contain('two');
              });
              return RestaurantTwo.count();
            }).then(count => {
              expect(count).to.not.be.null;
              expect(count).to.equal(3);
            });
        });
      });

      describe('Get associated data in public schema via include', () => {
        beforeEach(function() {

          return Location.sync({force: true})
            .then(() => {
              return Location.create({name: 'HQ'}).then(() => {
                return Location.findOne({where: {name: 'HQ'}}).then(obj => {
                  expect(obj).to.not.be.null;
                  expect(obj.name).to.equal('HQ');
                  locationId = obj.id;
                });
              });
            })
            .catch(err => {
              expect(err).to.be.null;
            });
        });

        it('should be able to insert and retrieve associated data into the table in schema_one', function() {

          return RestaurantOne.create({
            foo: 'one',
            location_id: locationId
          }).then(() => {
            return RestaurantOne.findOne({
              where: {foo: 'one'}, include: [{
                model: Location, as: 'location'
              }]
            });
          }).then(obj => {
            expect(obj).to.not.be.null;
            expect(obj.foo).to.equal('one');
            expect(obj.location).to.not.be.null;
            expect(obj.location.name).to.equal('HQ');
          });
        });
      });


      describe('Get schema specific associated data via include', () => {
        let Employee1 : Model<ItestInstance, ItestAttribute>;
        let Employee2 : Model<ItestInstance, ItestAttribute>;
        beforeEach(function() {
          return Promise.all([
            Employee.schema(SCHEMA_ONE).sync({force: true}),
            Employee.schema(SCHEMA_TWO).sync({force: true}),
          ]).then(Employees => {
            Employee1 = Employees[0];
            Employee2 = Employees[1];
          });
        });

        it('should be able to insert and retrieve associated data into the table in schema_one', function() {
          let restaurantId;

          return RestaurantOne.create({
            foo: 'one'
          }).then(() => {
            return RestaurantOne.findOne({
              where: {foo: 'one'}
            });
          }).then(obj => {
            expect(obj).to.not.be.null;
            expect(obj.foo).to.equal('one');
            restaurantId = obj.id;
            return EmployeeOne.create({
              first_name: 'Restaurant',
              last_name: 'one',
              restaurant_id: restaurantId
            });
          }).then(() => {
            return RestaurantOne.findOne({
              where: {foo: 'one'}, include: [{
                model: EmployeeOne, as: 'employees'
              }]
            });
          }).then(obj => {
            expect(obj).to.not.be.null;
            expect(obj.employees).to.not.be.null;
            expect(obj.employees.length).to.equal(1);
            expect(obj.employees[0].last_name).to.equal('one');
            return obj.getManyLinkedData<ItestInstance, ItestAttribute>(Employee1, {schema: SCHEMA_ONE});
          }).then(employees => {
            expect(employees.length).to.equal(1);
            expect(employees[0].last_name).to.equal('one');
            return EmployeeOne.findOne({
              where: {last_name: 'one'}, include: [{
                model: RestaurantOne, as: 'restaurant'
              }]
            });
          }).then(obj => {
            expect(obj).to.not.be.null;
            expect(obj.restaurant).to.not.be.null;
            expect(obj.restaurant.foo).to.equal('one');
            return obj.getLinkedData<ItestInstance, ItestAttribute>(RestaurantOne, {schema: SCHEMA_ONE});
          }).then(restaurant => {
            expect(restaurant).to.not.be.null;
            expect(restaurant.foo).to.equal('one');
          });
        });


        it('should be able to insert and retrieve associated data into the table in schema_two', function() {
          let restaurantId;

          return RestaurantTwo.create({
            foo: 'two'
          }).then(() => {
            return RestaurantTwo.findOne({
              where: {foo: 'two'}
            });
          }).then(obj => {
            expect(obj).to.not.be.null;
            expect(obj.foo).to.equal('two');
            restaurantId = obj.id;
            return Employee.schema(SCHEMA_TWO).create({
              first_name: 'Restaurant',
              last_name: 'two',
              restaurant_id: restaurantId
            });
          }).then(() => {
            return RestaurantTwo.findOne({
              where: {foo: 'two'}, include: [{
                model: Employee.schema(SCHEMA_TWO), as: 'employees'
              }]
            });
          }).then(obj => {
            expect(obj).to.not.be.null;
            expect(obj.employees).to.not.be.null;
            expect(obj.employees.length).to.equal(1);
            expect(obj.employees[0].last_name).to.equal('two');
            return obj.getManyLinkedData<ItestInstance, ItestAttribute>(Employee2, {schema: SCHEMA_TWO});
          }).then(employees => {
            expect(employees.length).to.equal(1);
            expect(employees[0].last_name).to.equal('two');
            return Employee.schema(SCHEMA_TWO).findOne({
              where: {last_name: 'two'}, include: [{
                model: RestaurantTwo, as: 'restaurant'
              }]
            });
          }).then(obj => {
            expect(obj).to.not.be.null;
            expect(obj.restaurant).to.not.be.null;
            expect(obj.restaurant.foo).to.equal('two');
            return obj.getLinkedData<ItestInstance, ItestAttribute>(RestaurantTwo, {schema: SCHEMA_TWO});
          }).then(restaurant => {
            expect(restaurant).to.not.be.null;
            expect(restaurant.foo).to.equal('two');
          });
        });
      });

      describe('concurency tests', () => {
        it('should build and persist instances to 2 schemas concurrently in any order', function() {

          let restaurauntModelSchema1 = Restaurant.schema(SCHEMA_ONE).build({bar: 'one.1'});
          const restaurauntModelSchema2 = Restaurant.schema(SCHEMA_TWO).build({bar: 'two.1'});

          return restaurauntModelSchema1.save()
            .then(() => {
              restaurauntModelSchema1 = Restaurant.schema(SCHEMA_ONE).build({bar: 'one.2'});
              return restaurauntModelSchema2.save();
            }).then(() => {
              return restaurauntModelSchema1.save();
            }).then(() => {
              return Restaurant.schema(SCHEMA_ONE).findAll();
            }).then(restaurantsOne => {
              expect(restaurantsOne).to.not.be.null;
              expect(restaurantsOne.length).to.equal(2);
              restaurantsOne.forEach(restaurant => {
                expect(restaurant.bar).to.contain('one');
              });
              return Restaurant.schema(SCHEMA_TWO).findAll();
            }).then(restaurantsTwo => {
              expect(restaurantsTwo).to.not.be.null;
              expect(restaurantsTwo.length).to.equal(1);
              restaurantsTwo.forEach(restaurant => {
                expect(restaurant.bar).to.contain('two');
              });
            });
        });
      });
    });
  }
});
