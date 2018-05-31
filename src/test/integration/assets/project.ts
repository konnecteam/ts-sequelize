'use strict';

export default function(sequelize, DataTypes) {
  return sequelize.define('Project' + Math.floor(Math.random() * 9999999999999999), {
    name: new DataTypes.STRING()
  });
}
