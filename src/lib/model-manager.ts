'use strict';

import * as _ from 'lodash';
import * as Toposort from 'toposort-class';
import { Sequelize } from '..';
import { Model } from './model';

export class ModelManager {
  public models : any[];
  public sequelize : Sequelize;
  constructor(sequelize : Sequelize) {
    this.models = [];
    this.sequelize = sequelize;
  }

  /**
   * Add a Model to the Model manager
   */
  public addModel(model : typeof Model) {
    this.models.push(model);
    this.sequelize.models[model.name] = model;

    return model;
  }

  /**
   * remove a Model to the Model manager
   */
  public removeModel(modelToRemove : typeof Model) {
    this.models = this.models.filter(model => model.name !== modelToRemove.name);

    delete this.sequelize.models[modelToRemove.name];
  }

  /**
   * get a Model of the Model manager
   * @param against attributes of the desired model
   * @param options
   */
  public getModel(against : {}, options? : { attribute? }) : typeof Model {
    options = _.defaults(options || {}, {
      attribute: 'name'
    });

    const model = this.models.filter(filterModel => filterModel[options.attribute] === against);

    return model ? model[0] : null;
  }

  /**
   * get all Models of the Model manager
   */
  get all() {
    return this.models;
  }

  /**
   * Iterate over Models in an order suitable for e.g. creating tables. Will
   * take foreign key constraints into account so that dependencies are visited
   * before dependents.
   */
  public forEachModel(iterator : any, options? : { reverse? }) {
    const models = {};
    const sorter = new Toposort();
    let sorted;
    let dep;

    options = _.defaults(options || {}, {
      reverse: true
    });

    for (const model of this.models) {
      let deps = [];
      let tableName = model.getTableName();

      if (_.isObject(tableName)) {
        tableName = tableName.schema + '.' + tableName.tableName;
      }

      models[tableName] = model;
      Object.keys(model.rawAttributes).forEach(attrName => {
        const attribute = model.rawAttributes[attrName];

        if (attribute.references) {
          dep = attribute.references.model;

          if (_.isObject(dep)) {
            dep = dep.schema + '.' + dep.tableName;
          }

          deps.push(dep);
        }
      });

      deps = deps.filter(filterDep => tableName !== filterDep);

      sorter.add(tableName, deps);
    }

    sorted = sorter.sort();
    if (options.reverse) {
      sorted = sorted.reverse();
    }
    for (const name of sorted) {
      iterator(models[name], name);
    }
  }
}
