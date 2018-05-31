'use strict';

import * as _ from 'lodash';
import * as util from 'util';
import { Utils } from '../utils';

export class ParameterValidator {

  /**
   * @hidden
   */
  private static validateDeprecation(value : any, expectation : any, options : {
    deprecated? : any,
    deprecationWarning? : any,
    index? : any,
    method? : any,
    optional? : boolean,
  }) : boolean {
    if (!options.deprecated) {
      return;
    }

    const valid = value instanceof options.deprecated || Object.prototype.toString.call(value) === Object.prototype.toString.call(options.deprecated.call());

    if (valid) {
      const message = `${util.inspect(value)} should not be of type "${options.deprecated.name}"`;
      Utils.deprecate(options.deprecationWarning || message);
    }

    return valid;
  }

  /**
   * @hidden
   */
  private static validate(value : any, expectation : any) : boolean {
    // the second part of this check is a workaround to deal with an issue that occurs in node-webkit when
    // using object literals.  https://github.com/sequelize/sequelize/issues/2685
    if (value instanceof expectation || Object.prototype.toString.call(value) === Object.prototype.toString.call(expectation.call())) {
      return true;
    }

    throw new Error(`The parameter (value: ${value}) is no ${expectation.name}`);
  }

  // @unused + test
  public static check(value?, expectation?, options?) {
    options = _.extend({
      deprecated: false,
      index: null,
      method: null,
      optional: false
    }, options || {});

    if (!value && options.optional) {
      return true;
    }

    if (value === undefined) {
      throw new Error('No value has been passed.');
    }

    if (expectation === undefined) {
      throw new Error('No expectation has been passed.');
    }

    return false
      || ParameterValidator.validateDeprecation(value, expectation, options)
      || ParameterValidator.validate(value, expectation);
  }
}
