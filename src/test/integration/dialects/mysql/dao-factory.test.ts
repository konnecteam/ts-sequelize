'use strict';

import * as chai from 'chai';
import DataTypes from '../../../../lib/data-types';
import config from '../../../config/config';
import { ItestAttribute, ItestInstance } from '../../../dummy/dummy-data-set';
import Support from '../../support';
const expect = chai.expect;
const dialect = Support.getTestDialect();
const current = Support.sequelize;

if (dialect === 'mysql') {
  describe('[MYSQL Specific] DAOFactory', () => {
    describe('constructor', () => {
      it('handles extended attributes (unique)', function() {
        const User = current.define<ItestInstance, ItestAttribute>('User' + config.rand(), {
          username: { type: new DataTypes.STRING(), unique: true }
        }, { timestamps: false });

        expect(current.getQueryInterface().QueryGenerator.attributesToSQL(User.rawAttributes)).to.deep.equal({username: 'VARCHAR(255) UNIQUE', id: 'INTEGER NOT NULL auto_increment PRIMARY KEY'});
      });

      it('handles extended attributes (default)', function() {
        const User = current.define<ItestInstance, ItestAttribute>('User' + config.rand(), {
          username: {type: new DataTypes.STRING(), defaultValue: 'foo'}
        }, { timestamps: false });
        expect(current.getQueryInterface().QueryGenerator.attributesToSQL(User.rawAttributes)).to.deep.equal({username: "VARCHAR(255) DEFAULT 'foo'", id: 'INTEGER NOT NULL auto_increment PRIMARY KEY'});
      });

      it('handles extended attributes (null)', function() {
        const User = current.define<ItestInstance, ItestAttribute>('User' + config.rand(), {
          username: {type: new DataTypes.STRING(), allowNull: false}
        }, { timestamps: false });
        expect(current.getQueryInterface().QueryGenerator.attributesToSQL(User.rawAttributes)).to.deep.equal({username: 'VARCHAR(255) NOT NULL', id: 'INTEGER NOT NULL auto_increment PRIMARY KEY'});
      });

      it('handles extended attributes (primaryKey)', function() {
        const User = current.define<ItestInstance, ItestAttribute>('User' + config.rand(), {
          username: {type: new DataTypes.STRING(), primaryKey: true}
        }, { timestamps: false });
        expect(current.getQueryInterface().QueryGenerator.attributesToSQL(User.rawAttributes)).to.deep.equal({username: 'VARCHAR(255) PRIMARY KEY'});
      });

      it('adds timestamps', function() {
        const User1 = current.define<ItestInstance, ItestAttribute>('User' + config.rand(), {});
        const User2 = current.define<ItestInstance, ItestAttribute>('User' + config.rand(), {}, { timestamps: true });

        expect(current.getQueryInterface().QueryGenerator.attributesToSQL(User1.rawAttributes)).to.deep.equal({id: 'INTEGER NOT NULL auto_increment PRIMARY KEY', updatedAt: 'DATETIME NOT NULL', createdAt: 'DATETIME NOT NULL'});
        expect(current.getQueryInterface().QueryGenerator.attributesToSQL(User2.rawAttributes)).to.deep.equal({id: 'INTEGER NOT NULL auto_increment PRIMARY KEY', updatedAt: 'DATETIME NOT NULL', createdAt: 'DATETIME NOT NULL'});
      });

      it('adds deletedAt if paranoid', function() {
        const User = current.define<ItestInstance, ItestAttribute>('User' + config.rand(), {}, { paranoid: true });
        expect(current.getQueryInterface().QueryGenerator.attributesToSQL(User.rawAttributes)).to.deep.equal({id: 'INTEGER NOT NULL auto_increment PRIMARY KEY',
          deletedAt: 'DATETIME', updatedAt: 'DATETIME NOT NULL', createdAt: 'DATETIME NOT NULL'});
      });

      it('underscores timestamps if underscored', function() {
        const User = current.define<ItestInstance, ItestAttribute>('User' + config.rand(), {}, { paranoid: true, underscored: true });
        expect(current.getQueryInterface().QueryGenerator.attributesToSQL(User.rawAttributes)).to.deep.equal({id: 'INTEGER NOT NULL auto_increment PRIMARY KEY',
          deleted_at: 'DATETIME', updated_at: 'DATETIME NOT NULL', created_at: 'DATETIME NOT NULL'});
      });

      it('omits text fields with defaultValues', function() {
        const User = current.define<ItestInstance, ItestAttribute>('User' + config.rand(), {name: {type: new DataTypes.TEXT(), defaultValue: 'helloworld'}});
        expect(User.rawAttributes.name.type.toString()).to.equal('TEXT');
      });

      it('omits blobs fields with defaultValues', function() {
        const User = current.define<ItestInstance, ItestAttribute>('User' + config.rand(), {name: {type: new DataTypes.STRING().BINARY, defaultValue: 'helloworld'}});
        expect(User.rawAttributes.name.type.toString()).to.equal('VARCHAR(255) BINARY');
      });
    });

    describe('primaryKeys', () => {
      it('determines the correct primaryKeys', function() {
        const User = current.define<ItestInstance, ItestAttribute>('User' + config.rand(), {
          foo: {type: new DataTypes.STRING(), primaryKey: true},
          bar: new DataTypes.STRING()
        });
        expect(current.getQueryInterface().QueryGenerator.attributesToSQL(User.primaryKeys)).to.deep.equal({foo: 'VARCHAR(255) PRIMARY KEY'});
      });
    });
  });
}
