'use strict';

import * as _ from 'lodash';

export class Range {
  /**
   * @hidden
   */
  private static stringifyRangeBound(bound : any) : string {
    if (bound === null) {
      return '' ;
    } else if (bound === Infinity || bound === -Infinity) {
      return bound.toString().toLowerCase();
    } else {
      return JSON.stringify(bound);
    }
  }

  /**
   * @hidden
   */
  private static parseRangeBound(bound : string, parseType : any) : any {
    if (!bound) {
      return null;
    } else if (bound === 'infinity') {
      return Infinity;
    } else if (bound === '-infinity') {
      return -Infinity;
    } else {
      return parseType(bound);
    }
  }

  public static stringify(data? : any) : string {
    if (data === null) {
      return null;
    }

    if (!_.isArray(data)) {
      throw new Error('range must be an array');
    }
    if (!data.length) {
      return 'empty';
    }
    if (data.length !== 2) {
      throw new Error('range array length must be 0 (empty) or 2 (lower and upper bounds)');
    }
    if (data.hasOwnProperty('inclusive')) {
      if ((data as any).inclusive === false) {
        (data as any).inclusive = [false, false];
      } else if (!(data as any).inclusive) {
        (data as any).inclusive = [true, false];
      } else if ((data as any).inclusive === true) {
        (data as any).inclusive = [true, true];
      }
    } else {
      (data as any).inclusive = [true, false];
    }

    Object.keys(data).forEach(index => {
      const value = data[index];
      if (_.isObject(value)) {
        if (value.hasOwnProperty('inclusive')) {
          (data as any).inclusive[index] = !!value.inclusive;
        }
        if (value.hasOwnProperty('value')) {
          data[index] = value.value;
        }
      }
    });

    const lowerBound = Range.stringifyRangeBound(data[0]);
    const upperBound = Range.stringifyRangeBound(data[1]);

    return ((data as any).inclusive[0] ? '[' : '(') + lowerBound + ',' + upperBound + ((data as any).inclusive[1] ? ']' : ')');
  }

  public static parse(value? : string, parser? : any) : any {
    if (value === null) {
      return null;
    }
    if (value === 'empty') {
      const empty = [];
      (empty as any).inclusive = [];
      return empty;
    }

    let result = value
      .substring(1, value.length - 1)
      .split(',', 2);

    if (result.length !== 2) {
      return value;
    }

    result = result.map(mapValue => Range.parseRangeBound(mapValue, parser));

    (result as any).inclusive = [value[0] === '[', value[value.length - 1] === ']'];

    return result;
  }

}
