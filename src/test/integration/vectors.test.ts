'use strict';

import * as chai from 'chai';
import DataTypes from '../../lib/data-types';
import Support from './support';
const expect = chai.expect;

chai.should();

describe(Support.getTestDialectTeaser('Vectors'), () => {
  it('should not allow insert backslash', function() {
    const Student = this.sequelize.define('student', {
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
