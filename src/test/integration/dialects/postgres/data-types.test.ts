'use strict';

import * as chai from 'chai';
const expect = chai.expect;
import Support from '../../support';
const dialect = Support.getTestDialect();
import DataTypes from '../../../../lib/data-types';

if (dialect === 'postgres') {
  describe('[POSTGRES Specific] Data Types', () => {
    describe('DATE/DATEONLY Validate and Stringify', () => {
      const now = new Date();
      const nowString = now.toISOString();

      it('DATE should validate a Date as normal', () => {
        expect((DataTypes[dialect] as any).DATE().validate(now)).to.equal(true);
        expect((DataTypes[dialect] as any).DATE().validate(nowString)).to.equal(true);
      });

      it('DATE should validate Infinity/-Infinity as true', () => {
        expect((DataTypes[dialect] as any).DATE().validate(Infinity)).to.equal(true);
        expect((DataTypes[dialect] as any).DATE().validate(-Infinity)).to.equal(true);
      });

      it('DATE should stringify Infinity/-Infinity to infinity/-infinity', () => {
        expect((DataTypes[dialect] as any).DATE().stringify(Infinity)).to.equal('Infinity');
        expect((DataTypes[dialect] as any).DATE().stringify(-Infinity)).to.equal('-Infinity');
      });

      it('DATEONLY should stringify Infinity/-Infinity to infinity/-infinity', () => {
        expect((DataTypes[dialect] as any).DATEONLY().stringify(Infinity)).to.equal('Infinity');
        expect((DataTypes[dialect] as any).DATEONLY().stringify(-Infinity)).to.equal('-Infinity');
      });
    });

    describe('DATE/DATEONLY Sanitize', () => {
      const now = new Date();
      const nowString = now.toISOString();
      const nowDateOnly = nowString.substr(0, 10);

      it('DATE should sanitize a Date as normal', () => {
        const d = DataTypes;
        expect((DataTypes[dialect] as any).DATE()._sanitize(now)).to.equalTime(now);
        expect((DataTypes[dialect] as any).DATE()._sanitize(nowString)).to.equalTime(now);
      });

      it('DATE should sanitize Infinity/-Infinity as Infinity/-Infinity', () => {
        expect((DataTypes[dialect] as any).DATE()._sanitize(Infinity)).to.equal(Infinity);
        expect((DataTypes[dialect] as any).DATE()._sanitize(-Infinity)).to.equal(-Infinity);
      });

      it('DATE should sanitize "Infinity"/"-Infinity" as Infinity/-Infinity', () => {
        expect((DataTypes[dialect] as any).DATE()._sanitize('Infinity')).to.equal(Infinity);
        expect((DataTypes[dialect] as any).DATE()._sanitize('-Infinity')).to.equal(-Infinity);
      });

      it('DATEONLY should sanitize a Date as normal', () => {
        expect((DataTypes[dialect] as any).DATEONLY()._sanitize(now)).to.equal(nowDateOnly);
        expect((DataTypes[dialect] as any).DATEONLY()._sanitize(nowString)).to.equal(nowDateOnly);
      });

      it('DATEONLY should sanitize Infinity/-Infinity as Infinity/-Infinity', () => {
        expect((DataTypes[dialect] as any).DATEONLY()._sanitize(Infinity)).to.equal(Infinity);
        expect((DataTypes[dialect] as any).DATEONLY()._sanitize(-Infinity)).to.equal(-Infinity);
      });

      it('DATEONLY should sanitize "Infinity"/"-Infinity" as Infinity/-Infinity', () => {
        expect((DataTypes[dialect] as any).DATEONLY()._sanitize('Infinity')).to.equal(Infinity);
        expect((DataTypes[dialect] as any).DATEONLY()._sanitize('-Infinity')).to.equal(-Infinity);
      });
    });

    describe('DATE SQL', () => {
      // create dummy user
      it('should be able to create and update records with Infinity/-Infinity', function() {
        this.sequelize.options.typeValidation = true;

        const date = new Date();
        const User = this.sequelize.define('User', {
          username: this.sequelize.Sequelize.STRING,
          beforeTime: {
            type: this.sequelize.Sequelize.DATE,
            defaultValue: -Infinity
          },
          sometime: {
            type: this.sequelize.Sequelize.DATE,
            defaultValue: this.sequelize.fn('NOW')
          },
          anotherTime: {
            type: this.sequelize.Sequelize.DATE
          },
          afterTime: {
            type: this.sequelize.Sequelize.DATE,
            defaultValue: Infinity
          }
        }, {
          timestamps: true
        });

        return User.sync({
          force: true
        }).then(() => {
          return User.create({
            username: 'bob',
            anotherTime: Infinity
          }, {
            validate: true
          });
        }).then(user => {
          expect(user.username).to.equal('bob');
          expect(user.beforeTime).to.equal(-Infinity);
          expect(user.sometime).to.be.withinTime(date, new Date());
          expect(user.anotherTime).to.equal(Infinity);
          expect(user.afterTime).to.equal(Infinity);

          return user.update({
            sometime: Infinity
          }, {
            returning: true
          });
        }).then(user => {
          expect(user.sometime).to.equal(Infinity);

          return user.update({
            sometime: Infinity
          });
        }).then(user => {
          expect(user.sometime).to.equal(Infinity);

          return user.update({
            sometime: this.sequelize.fn('NOW')
          }, {
            returning: true
          });
        }).then(user => {
          expect(user.sometime).to.be.withinTime(date, new Date());

          // find
          return User.findAll();
        }).then(users => {
          expect(users[0].beforeTime).to.equal(-Infinity);
          expect(users[0].sometime).to.not.equal(Infinity);
          expect(users[0].afterTime).to.equal(Infinity);

          return users[0].update({
            sometime: date
          });
        }).then(user => {
          expect(user.sometime).to.equalTime(date);

          return user.update({
            sometime: date
          });
        }).then(user => {
          expect(user.sometime).to.equalTime(date);
        });
      });
    });

    describe('DATEONLY SQL', () => {
      // create dummy user
      it('should be able to create and update records with Infinity/-Infinity', function() {
        this.sequelize.options.typeValidation = true;

        const date = new Date();
        const User = this.sequelize.define('User', {
          username: this.sequelize.Sequelize.STRING,
          beforeTime: {
            type: this.sequelize.Sequelize.DATEONLY,
            defaultValue: -Infinity
          },
          sometime: {
            type: this.sequelize.Sequelize.DATEONLY,
            defaultValue: this.sequelize.fn('NOW')
          },
          anotherTime: {
            type: this.sequelize.Sequelize.DATEONLY
          },
          afterTime: {
            type: this.sequelize.Sequelize.DATEONLY,
            defaultValue: Infinity
          }
        }, {
          timestamps: true
        });

        return User.sync({
          force: true
        }).then(() => {
          return User.create({
            username: 'bob',
            anotherTime: Infinity
          }, {
            validate: true
          });
        }).then(user => {
          expect(user.username).to.equal('bob');
          expect(user.beforeTime).to.equal(-Infinity);
          expect(new Date(user.sometime)).to.be.withinDate(date, new Date());
          expect(user.anotherTime).to.equal(Infinity);
          expect(user.afterTime).to.equal(Infinity);

          return user.update({
            sometime: Infinity
          }, {
            returning: true
          });
        }).then(user => {
          expect(user.sometime).to.equal(Infinity);

          return user.update({
            sometime: Infinity
          });
        }).then(user => {
          expect(user.sometime).to.equal(Infinity);

          return user.update({
            sometime: this.sequelize.fn('NOW')
          }, {
            returning: true
          });
        }).then(user => {
          expect(user.sometime).to.not.equal(Infinity);
          expect(new Date(user.sometime)).to.be.withinDate(date, new Date());

          // find
          return User.findAll();
        }).then(users => {
          expect(users[0].beforeTime).to.equal(-Infinity);
          expect(users[0].sometime).to.not.equal(Infinity);
          expect(users[0].afterTime).to.equal(Infinity);

          return users[0].update({
            sometime: '1969-07-20'
          });
        }).then(user => {
          expect(user.sometime).to.equal('1969-07-20');

          return user.update({
            sometime: '1969-07-20'
          });
        }).then(user => {
          expect(user.sometime).to.equal('1969-07-20');
        });
      });
    });

  });
}
