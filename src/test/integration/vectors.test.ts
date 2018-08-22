'use strict';

import * as chai from 'chai';
import DataTypes from '../../lib/data-types';
import { ItestAttribute, ItestInstance } from '../dummy/dummy-data-set';
import Support from './support';
const expect = chai.expect;
const current = Support.sequelize;

chai.should();

describe(Support.getTestDialectTeaser('Vectors'), () => {
  it('should not allow insert backslash', function() {
    const Student = current.define<ItestInstance, ItestAttribute>('student', {
      name: new DataTypes.STRING()
    }, {
      tableName: 'student'
    });

    return Student.sync({force: true}).then(() => {
      return Student.create({
        name: 'Robert\\\'); DROP TABLE "students"; --'
      }).then(result => {
        expect(result.get('name')).to.equal('Robert\\\'); DROP TABLE "students"; --');
        return Student.findAll();
      }).then(result => {
        expect(result[0].name).to.equal('Robert\\\'); DROP TABLE "students"; --');
      });
    });
  });
});
