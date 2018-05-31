'use strict';

import * as chai from 'chai';
import * as sinon from 'sinon';
import DataTypes from '../../../lib/data-types';
import Support from '../support';
const expect = chai.expect;
const current = Support.sequelize;

describe(Support.getTestDialectTeaser('Model'), () => {
  describe('paranoid', () => {
    before(function() {
      this.clock = sinon.useFakeTimers();
    });

    after(function() {
      this.clock.restore();
    });

    it('should be able to soft delete with timestamps', function() {
      const Account = this.sequelize.define('Account', {
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
      const Account = this.sequelize.define('Account', {
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
        before(function() {
          this.Model = this.sequelize.define('Model', {
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
          return this.Model.sync({ force: true });
        });

        it('should soft delete with JSON condition', function() {
          return this.Model.bulkCreate([{
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
          }]).then(() => this.Model.destroy({
            where: {
              data: {
                field: {
                  deep: true
                }
              }
            }
          })).then(() => this.Model.findAll()).then(records => {
            expect(records.length).to.equal(1);
            expect(records[0].get('name')).to.equal('Two');
          });
        });
      });
    }
  });
});
