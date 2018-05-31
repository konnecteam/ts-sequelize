'use strict';

import * as _ from 'lodash';
import * as moment from 'moment';
import * as valid from 'validator';

export const validator = _.cloneDeep(valid);

const extensions = {
  extend(name : string, fn) {
    this[name] = fn;

    return this;
  },
  notEmpty(str : string) {
    return !str.match(/^[\s\t\r\n]*$/);
  },
  len(str : string, min : number, max : number) {
    return this.isLength(str, min, max);
  },
  isUrl(str : string) {
    return this.isURL(str);
  },
  isIPv6(str : string) {
    return this.isIP(str, 6);
  },
  isIPv4(str : string) {
    return this.isIP(str, 4);
  },
  notIn(str : string, values : any) {
    return !this.isIn(str, values);
  },
  regex(str : string, pattern, modifiers) {
    str += '';
    if (Object.prototype.toString.call(pattern).slice(8, -1) !== 'RegExp') {
      pattern = new RegExp(pattern, modifiers);
    }
    return str.match(pattern);
  },
  notRegex(str : string, pattern, modifiers) {
    return !this.regex(str, pattern, modifiers);
  },
  isDecimal(str : string) {
    return str !== '' && !!str.match(/^(?:-?(?:[0-9]+))?(?:\.[0-9]*)?(?:[eE][\+\-]?(?:[0-9]+))?$/);
  },
  min(str : string, val : any) {
    const number = parseFloat(str);
    return isNaN(number) || number >= val;
  },
  max(str : string, val : any) {
    const number = parseFloat(str);
    return isNaN(number) || number <= val;
  },
  not(str : string, pattern, modifiers) {
    return this.notRegex(str, pattern, modifiers);
  },
  contains(str : string, elem) {
    return str.indexOf(elem) >= 0 && !!elem;
  },
  notContains(str : string, elem) {
    return !this.contains(str, elem);
  },
  is(str : string, pattern, modifiers) {
    return this.regex(str, pattern, modifiers);
  }
};


export function extendModelValidations(modelInstance) {
  const modelValidationsExtensions = {
    isImmutable(str, param, field) {
      return modelInstance.isNewRecord || modelInstance.dataValues[field] === modelInstance._previousDataValues[field];
    }
  };

  _.forEach(modelValidationsExtensions, (extend, key) => {
    validator[key] = extend;
  });
}

// Deprecate this.
validator.notNull = function() {
  throw new Error('Warning "notNull" validation has been deprecated in favor of Schema based "allowNull"');
};

// https://github.com/chriso/validator.js/blob/6.2.0/validator.js
_.forEach(extensions, (extend, key) => {
  validator[key] = extend;
});

// map isNull to isEmpty
// https://github.com/chriso/validator.js/commit/e33d38a26ee2f9666b319adb67c7fc0d3dea7125
validator.isNull = validator.isEmpty;

// isDate removed in 7.0.0
// https://github.com/chriso/validator.js/commit/095509fc707a4dc0e99f85131df1176ad6389fc9
validator.isDate = function(dateString) {
  // avoid http://momentjs.com/guides/#/warnings/js-date/
  // by doing a preliminary check on `dateString`
  const parsed = Date.parse(dateString);
  if (isNaN(parsed)) {
    // fail if we can't parse it
    return false;
  } else {
    // otherwise convert to ISO 8601 as moment prefers
    // http://momentjs.com/docs/#/parsing/string/
    const date = new Date(parsed);
    return moment(date.toISOString()).isValid();
  }
};