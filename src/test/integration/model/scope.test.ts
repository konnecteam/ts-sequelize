'use strict';

import * as chai from 'chai';
import {Sequelize} from '../../../index';
import DataTypes from '../../../lib/data-types';
import Support from '../support';
const expect = chai.expect;

describe(Support.getTestDialectTeaser('Model'), () => {
  describe('scope', () => {
    beforeEach(function() {
      this.ScopeMe = this.sequelize.define('ScopeMe', {
        username: new DataTypes.STRING(),
        email: new DataTypes.STRING(),
        access_level: new DataTypes.INTEGER(),
        other_value: new DataTypes.INTEGER()
      }, {
        scopes: {
          lowAccess: {
            attributes: ['other_value', 'access_level'],
            where: {
              access_level: {
                lte: 5
              }
            }
          },
          withName: {
            attributes: ['username']
          },
          highAccess: {
            where: {
              [Sequelize.Op.or]: [
                { access_level: { [Sequelize.Op.gte]: 5 } },
                { access_level: { [Sequelize.Op.eq]: 10 } },
              ]
            }
          }
        }
      });

      return this.sequelize.sync({force: true}).then(() => {
        const records = [
          {username: 'tony', email: 'tony@sequelizejs.com', access_level: 3, other_value: 7},
          {username: 'tobi', email: 'tobi@fakeemail.com', access_level: 10, other_value: 11},
          {username: 'dan', email: 'dan@sequelizejs.com', access_level: 5, other_value: 10},
          {username: 'fred', email: 'fred@foobar.com', access_level: 3, other_value: 7},
        ];
        return this.ScopeMe.bulkCreate(records);
      });
    });

    it('should be able to merge attributes as array', function() {
      return this.ScopeMe.scope('lowAccess', 'withName').findOne()
        .then(record => {
          expect(record.other_value).to.exist;
          expect(record.username).to.exist;
          expect(record.access_level).to.exist;
        });
    });

    it('should work with Symbol operators', function() {
      return this.ScopeMe.scope('highAccess').findOne()
        .then(record => {
          expect(record.username).to.equal('tobi');
        });
    });
  });
});
