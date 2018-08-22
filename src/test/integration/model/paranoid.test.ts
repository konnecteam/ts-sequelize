'use strict';

import * as chai from 'chai';
import { Model } from '../../..';
import DataTypes from '../../../lib/data-types';
import { ItestAttribute, ItestInstance } from '../../dummy/dummy-data-set';
import Support from '../support';
const expect = chai.expect;
const current = Support.sequelize;

describe(Support.getTestDialectTeaser('Model'), () => {
  describe('paranoid', () => {
    it('should be able to soft delete with timestamps', function() {
      const Account = current.define<ItestInstance, ItestAttribute>('Account', {
        ownerId: {
          type: new DataTypes.INTEGER(),
          allowNull: false,
          field: 'owner_id'
        },
        name: {
          type: new DataTypes.STRING()
        }
      }, {
        paranoid: true,
        timestamps: true
      });

      return Account.sync({force: true})
        .then(() => Account.create({ ownerId: 12 }))
        .then(() => Account.count())
        .then(count => {
          expect(count).to.be.equal(1);
          return Account.destroy({ where: { ownerId: 12 }})
            .then(result => {
              expect(result).to.be.equal(1);
            });
        })
        .then(() => Account.count())
        .then(count => {
          expect(count).to.be.equal(0);
          return Account.count({ paranoid: false });
        })
        .then(count => {
          expect(count).to.be.equal(1);
          return Account.restore({ where: { ownerId: 12 }});
        })
        .then(() => Account.count())
        .then(count => {
          expect(count).to.be.equal(1);
        });
    });

    it('should be able to soft delete without timestamps', function() {
      const Account = current.define<ItestInstance, ItestAttribute>('Account', {
        ownerId: {
          type: new DataTypes.INTEGER(),
          allowNull: false,
          field: 'owner_id'
        },
        name: {
          type: new DataTypes.STRING()
        },
        deletedAt: {
          type: new DataTypes.DATE(),
          allowNull: true,
          field: 'deleted_at'
        }
      }, {
        paranoid: true,
        timestamps: true,
        deletedAt: 'deletedAt',
        createdAt: false,
        updatedAt: false
      });

      return Account.sync({force: true})
        .then(() => Account.create({ ownerId: 12 }))
        .then(() => Account.count())
        .then(count => {
          expect(count).to.be.equal(1);
          return Account.destroy({ where: { ownerId: 12 }});
        })
        .then(() => Account.count())
        .then(count => {
          expect(count).to.be.equal(0);
          return Account.count({ paranoid: false });
        })
        .then(count => {
          expect(count).to.be.equal(1);
          return Account.restore({ where: { ownerId: 12 }});
        })
        .then(() => Account.count())
        .then(count => {
          expect(count).to.be.equal(1);
        });
    });

    if (current.dialect.supports.JSON) {
      describe('JSON', () => {
        let _Model : Model<ItestInstance, ItestAttribute>;
        before(function() {
          _Model = current.define<ItestInstance, ItestAttribute>('Model', {
            name: {
              type: new DataTypes.STRING()
            },
            data: {
              type: new DataTypes.JSON()
            },
            deletedAt: {
              type: new DataTypes.DATE(),
              allowNull: true,
              field: 'deleted_at'
            }
          }, {
            paranoid: true,
            timestamps: true,
            deletedAt: 'deletedAt'
          });
        });

        beforeEach(function() {
          return _Model.sync({ force: true });
        });

        it('should soft delete with JSON condition', function() {
          return _Model.bulkCreate([{
            name: 'One',
            data: {
              field: {
                deep: true
              }
            }
          }, {
            name: 'Two',
            data: {
              field: {
                deep: false
              }
            }
          }]).then(() => _Model.destroy({
            where: {
              data: {
                field: {
                  deep: true
                }
              }
            }
          })).then(() => _Model.findAll()).then(records => {
            expect(records.length).to.equal(1);
            expect(records[0].get('name')).to.equal('Two');
          });
        });
      });
    }
  });
});
