'use strict';

import * as chai from 'chai';
import * as _ from 'lodash';
import {Sequelize} from '../../../index';
import DataTypes from '../../../lib/data-types';
import { ItestAttribute, ItestInstance } from '../../dummy/dummy-data-set';
import Support from '../support';
const expect = chai.expect;
const Promise = Sequelize.Promise;
const current = Support.sequelize;

describe(Support.getTestDialectTeaser('Self'), () => {
  it('supports freezeTableName', function() {
    const Group = current.define<ItestInstance, ItestAttribute>('Group', {}, {
      tableName: 'user_group',
      timestamps: false,
      underscored: true,
      freezeTableName: true
    });

    Group.belongsTo(Group, { as: 'Parent', foreignKey: 'parent_id' });
    return Group.sync({force: true}).then(() => {
      return Group.findAll({
        include: [{
          model: Group,
          as: 'Parent'
        }]
      });
    });
  });

  it('can handle 1:m associations', function() {
    const Person = current.define<ItestInstance, ItestAttribute>('Person', { name: new DataTypes.STRING() });

    Person.hasMany(Person, { as: 'Children', foreignKey: 'parent_id'});

    expect(Person.rawAttributes.parent_id).to.be.ok;

    return current.sync({force: true}).then(() => {
      return Promise.all([
        Person.create({ name: 'Mary' }),
        Person.create({ name: 'John' }),
        Person.create({ name: 'Chris' }),
      ]);
    }).spread((mary, john, chris) => {
      return mary.setLinkedData({ model : 'Person', associationAlias : 'Children' }, [john, chris]);
    });
  });

  it('can handle n:m associations', function() {

    const Person = current.define<ItestInstance, ItestAttribute>('Person', { name: new DataTypes.STRING() });

    Person.belongsToMany(Person, { as: 'Parents', through: 'Family', foreignKey: 'ChildId', otherKey: 'PersonId' });
    Person.belongsToMany(Person, { as: 'Childs', through: 'Family', foreignKey: 'PersonId', otherKey: 'ChildId' });

    const foreignIdentifiers = _.map(_.values(Person.associations), 'foreignIdentifier');
    const rawAttributes = _.keys(current.models.Family.rawAttributes);

    expect(foreignIdentifiers.length).to.equal(2);
    expect(rawAttributes.length).to.equal(4);

    expect(foreignIdentifiers).to.have.members(['PersonId', 'ChildId']);
    expect(rawAttributes).to.have.members(['createdAt', 'updatedAt', 'PersonId', 'ChildId']);

    return current.sync({ force: true }).then(() => {
      return current.Promise.all([
        Person.create({ name: 'Mary' }),
        Person.create({ name: 'John' }),
        Person.create({ name: 'Chris' }),
      ]).spread((mary, john, chris) => {
        return mary.setLinkedData({ model : 'Person', associationAlias : 'Parents' }, [john]).then(() => {
          return chris.addLinkedData({ model : 'Person', associationAlias : 'Parents' }, john);
        }).then(() => {
          return john.getManyLinkedData<ItestInstance, ItestAttribute>({ model : 'Person', associationAlias : 'Childs' });
        }).then(children => {
          expect(_.map(children, 'id')).to.have.members([mary.id, chris.id]);
        });
      });
    });
  });

  it('can handle n:m associations with pre-defined through table', function() {
    const Person = current.define<ItestInstance, ItestAttribute>('Person', { name: new DataTypes.STRING() });
    const Family = current.define<ItestInstance, ItestAttribute>('Family', {
      preexisting_child: {
        type: new DataTypes.INTEGER(),
        primaryKey: true
      },
      preexisting_parent: {
        type: new DataTypes.INTEGER(),
        primaryKey: true
      }
    }, { timestamps: false });

    Person.belongsToMany(Person, { as: 'Parents', through: Family, foreignKey: 'preexisting_child', otherKey: 'preexisting_parent' });
    Person.belongsToMany(Person, { as: 'Children', through: Family, foreignKey: 'preexisting_parent', otherKey: 'preexisting_child' });

    let mary : ItestInstance;
    let john : ItestInstance;
    let chris : ItestInstance;

    const foreignIdentifiers = _.map(_.values(Person.associations), 'foreignIdentifier');
    const rawAttributes = _.keys(Family.rawAttributes);

    expect(foreignIdentifiers.length).to.equal(2);
    expect(rawAttributes.length).to.equal(2);

    expect(foreignIdentifiers).to.have.members(['preexisting_parent', 'preexisting_child']);
    expect(rawAttributes).to.have.members(['preexisting_parent', 'preexisting_child']);

    let count = 0;
    return current.sync({ force: true }).bind(this).then(() => {
      return Promise.all([
        Person.create({ name: 'Mary' }),
        Person.create({ name: 'John' }),
        Person.create({ name: 'Chris' }),
      ]);
    }).spread(function(_mary, _john, _chris) {
      mary = _mary;
      chris = _chris;
      john = _john;
      return mary.setLinkedData({ model : 'Person', associationAlias : 'Parents' }, [john], {
        logging(sql) {
          if (sql.match(/INSERT/)) {
            count++;
            expect(sql).to.have.string('preexisting_child');
            expect(sql).to.have.string('preexisting_parent');
          }
        }
      });
    }).then(function() {
      return mary.addLinkedData({ model : 'Person', associationAlias : 'Parents' }, chris, {
        logging(sql) {
          if (sql.match(/INSERT/)) {
            count++;
            expect(sql).to.have.string('preexisting_child');
            expect(sql).to.have.string('preexisting_parent');
          }
        }
      });
    }).then(function() {
      return john.getManyLinkedData<ItestInstance, ItestAttribute>({ model : 'Person', associationAlias : 'Children' }, {
        logging(sql) {
          count++;
          const whereClause = sql.split('FROM')[1]; // look only in the whereClause
          expect(whereClause).to.have.string('preexisting_child');
          expect(whereClause).to.have.string('preexisting_parent');
        }
      });
    }).then(function(children) {
      expect(count).to.be.equal(3);
      expect(_.map(children, 'id')).to.have.members([mary.id]);
    });
  });
});
