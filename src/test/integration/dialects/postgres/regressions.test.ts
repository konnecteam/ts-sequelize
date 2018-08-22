'use strict';

import * as chai from 'chai';
import { ItestAttribute, ItestInstance } from '../../../dummy/dummy-data-set';
import Support from '../../support';
const expect = chai.expect;
const DataTypes = Support.Sequelize.DataTypes;
const dialect = Support.getTestDialect();
const current = Support.sequelize;

if (dialect.match(/^postgres/)) {
  describe('[POSTGRES Specific] Regressions', () => {
    it('properly fetch OIDs after sync, #8749', function() {
      const User = current.define<ItestInstance, ItestAttribute>('User', {
        active: new DataTypes.BOOLEAN()
      });

      /**
       * This Model is important, sync will try to fetch OIDs after each ENUM model sync
       * Having ENUM in this model will force OIDs re-fetch
       * We are testing that OID refresh keep base type intact
       */
      const Media = current.define<ItestInstance, ItestAttribute>('Media', {
        type: new DataTypes.ENUM([
          'image', 'video', 'audio',
        ])
      });

      User.hasMany(Media);
      Media.belongsTo(User);

      return current
        .sync({ force: true })
        .then(() => User.create({ active: true }))
        .then(user => {
          expect(user.active).to.be.true;
          expect(user.get('active')).to.be.true;

          return User.findOne();
        })
        .then(user => {
          expect(user.active).to.be.true;
          expect(user.get('active')).to.be.true;

          return User.findOne({ raw: true });
        })
        .then(user => {
          expect(user.active).to.be.true;
        });
    });
  });
}
