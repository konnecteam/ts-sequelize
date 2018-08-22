'use strict';

import * as chai from 'chai';
import { ItestAttribute, ItestInstance } from '../../../dummy/dummy-data-set';
import Support from '../../support';
const expect = chai.expect;
const dialect = Support.getTestDialect();
const Sequelize = Support.Sequelize;
const DataTypes = Sequelize.DataTypes;
const Op = Sequelize.Op;
const current = Support.sequelize;

if (dialect.match(/^mssql/)) {
  describe('[MSSQL Specific] Regressions', () => {
    it('does not duplicate columns in ORDER BY statement, #9008', function() {
      const LoginLog = current.define<ItestInstance, ItestAttribute>('LoginLog', {
        ID: {
          field: 'id',
          type: new DataTypes.INTEGER(),
          primaryKey: true,
          autoIncrement: true
        },
        UserID: {
          field: 'userid',
          type: new DataTypes.UUID(),
          allowNull: false
        }
      });

      const User = current.define<ItestInstance, ItestAttribute>('User', {
        UserID: {
          field: 'userid',
          type: new DataTypes.UUID(),
          defaultValue: new DataTypes.UUIDV4(),
          primaryKey: true
        },
        UserName: {
          field: 'username',
          type: new DataTypes.STRING(50),
          allowNull: false
        }
      });

      LoginLog.belongsTo(User, {
        foreignKey: 'UserID'
      });
      User.hasMany(LoginLog, {
        foreignKey: 'UserID'
      });

      return current.sync({ force: true })
        .then(() => User.bulkCreate([
          { UserName: 'Vayom' },
          { UserName: 'Shaktimaan' },
          { UserName: 'Nikita' },
          { UserName: 'Aryamaan' }], { returning: true }))
        .spread((vyom, shakti, nikita, arya) => {
          return Sequelize.Promise.all([
            vyom.createLinkedData('LoginLog')  ,
            shakti.createLinkedData('LoginLog')  ,
            nikita.createLinkedData('LoginLog')  ,
            arya.createLinkedData('LoginLog')  ]);
        }).then(() => {
          return LoginLog.findAll({
            include: [
              {
                model: User,
                where: {
                  UserName: {
                    [Op.like]: '%maan%'
                  }
                }
              }],
            order: [[User, 'UserName', 'DESC']],
            offset: 0,
            limit: 10
          });
        }).then(logs => {
          expect(logs).to.have.length(2);
          expect(logs[0].User.get('UserName')).to.equal('Shaktimaan');
          expect(logs[1].User.get('UserName')).to.equal('Aryamaan');
        });
    });
  });
}
