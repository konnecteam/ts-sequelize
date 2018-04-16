'use strict';

import * as util from 'util';
import * as _ from 'lodash';

/**
 * like util.inherits, but also copies over static properties
 * @private
 */
export default function inherits(constructor, superConstructor) {
  util.inherits(constructor, superConstructor); // Instance (prototype) methods
  _.extend(constructor, superConstructor); // Static methods
}
