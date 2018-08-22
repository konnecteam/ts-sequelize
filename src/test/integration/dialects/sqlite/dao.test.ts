'use strict';

import * as chai from 'chai';
import DataTypes from '../../../../lib/data-types';
import { Model } from '../../../../lib/model';
import { ItestAttribute, ItestInstance } from '../../../dummy/dummy-data-set';
import Support from '../../support';
const expect = chai.expect;
const Sequelize = Support.Sequelize;
const dialect = Support.getTestDialect();
const current = Support.sequelize;

if (dialect === 'sqlite') {
  describe('[SQLITE Specific] DAO', () => {
    let User : Model<ItestInstance, ItestAttribute>;
    let Project : Model<ItestInstance, ItestAttribute>;
    beforeEach(function() {
      User = current.define<ItestInstance, ItestAttribute>('User', {
        username: new DataTypes.STRING(),
        emergency_contact: new DataTypes.JSON(),
        emergencyContact: new DataTypes.JSON(),
        dateField: {
          type: new DataTypes.DATE(),
          field: 'date_field'
        }
      });
      Project = current.define<ItestInstance, ItestAttribute>('project', {
        dateField: {
          type: new DataTypes.DATE(),
          field: 'date_field'
        }
      });

      User.hasMany(Project);
      return current.sync({ force: true });
    });

    describe('findAll', () => {
      it('handles dates correctly', function() {
        const user = User.build({ username: 'user' });

        user.dataValues.createdAt = new Date(2011, 4, 4);

        return user.save().then(() => {
          return User.create({ username: 'new user' }).then(() => {
            return User.findAll({
              where: { createdAt: { $gt: new Date(2012, 1, 1) } }
            }).then(users => {
              expect(users).to.have.length(1);
            });
          });
        });
      });

      it('handles dates with aliasses correctly #3611', function() {
        return User.create({
          dateField: new Date(2010, 10, 10)
        }).then(() => {
          return User.findAll().get(0 as any);
        }).then(user => {
          expect(user.get('dateField')).to.be.an.instanceof(Date);
          expect(user.get('dateField')).to.equalTime(new Date(2010, 10, 10));
        });
      });

      it('handles dates in includes correctly #2644', function() {
        return User.create({
          projects: [
            { dateField: new Date(1990, 5, 5) },
          ]
        }, { include: [Project] }).then(() => {
          return User.findAll({
            include: [Project]
          }).get(0 as any);
        }).then(user => {
          expect(user.projects[0].get('dateField')).to.be.an.instanceof(Date);
          expect(user.projects[0].get('dateField')).to.equalTime(new Date(1990, 5, 5));
        });
      });
    });

    describe('json', () => {
      it('should be able to retrieve a row with json_extract function', function() {
        return current.Promise.all([
          User.create({ username: 'swen', emergency_contact: { name: 'kate' } }),
          User.create({ username: 'anna', emergency_contact: { name: 'joe' } }),
        ]).then(() => {
          return User.find({
            where: Sequelize.json('json_extract(emergency_contact, \'$.name\')', 'kate'),
            attributes: ['username', 'emergency_contact']
          });
        }).then(user => {
          expect(user.emergency_contact.name).to.equal('kate');
        });
      });

      it('should be able to retrieve a row by json_type function', function() {
        return current.Promise.all([
          User.create({ username: 'swen', emergency_contact: { name: 'kate' } }),
          User.create({ username: 'anna', emergency_contact: ['kate', 'joe'] }),
        ]).then(() => {
          return User.find({
            where: Sequelize.json('json_type(emergency_contact)', 'array'),
            attributes: ['username', 'emergency_contact']
          });
        }).then(user => {
          expect(user.username).to.equal('anna');
        });
      });
    });

    describe('regression tests', () => {
      it('do not crash while parsing unique constraint errors', function() {
        const Payments = current.define<ItestInstance, ItestAttribute>('payments', {});

        return Payments.sync({ force: true }).then(() => {
          return expect(Payments.bulkCreate([{ id: 1 }, { id: 1 }], { ignoreDuplicates: false })).to.eventually.be.rejected;
        });
      });
    });
  });
}
