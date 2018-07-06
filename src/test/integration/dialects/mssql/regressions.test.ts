'use strict';

import * as chai from 'chai';
import Support from '../../support';
const expect = chai.expect;
const dialect = Support.getTestDialect();
const Sequelize = Support.Sequelize;
const Op = Sequelize.Op;

if (dialect.match(/^mssql/)) {
  describe('[MSSQL Specific] Regressions', () => {
    it('does not duplicate columns in ORDER BY statement, #9008', function() {
      const LoginLog = this.sequelize.define('LoginLog', {
        ID: {
          field: 'id',
          type: new Sequelize.INTEGER(),
          primaryKey: true,
          autoIncrement: true
        },
        UserID: {
          field: 'userid',
          type: new Sequelize.UUID(),
          allowNull: false
        }
      });

      const User = this.sequelize.define('User', {
        UserID: {
          field: 'userid',
          type: new Sequelize.UUID(),
          defaultValue: new Sequelize.UUIDV4(),
          primaryKey: true
        },
        UserName: {
          field: 'username',
          type: new Sequelize.STRING(50),
          allowNull: false
        }
      });

      LoginLog.belongsTo(User, {
        foreignKey: 'UserID'
      });
      User.hasMany(LoginLog, {
        foreignKey: 'UserID'
      });

      return this.sequelize.sync({ force: true })
        .then(() => User.bulkCreate([
          { UserName: 'Vayom' },
          { UserName: 'Shaktimaan' },
          { UserName: 'Nikita' },
          { UserName: 'Aryamaan' }], { returning: true }))
        .spread((vyom, shakti, nikita, arya) => {
          return Sequelize.Promise.all([
            vyom.createLoginLog(),
            shakti.createLoginLog(),
            nikita.createLoginLog(),
            arya.createLoginLog()]);
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
