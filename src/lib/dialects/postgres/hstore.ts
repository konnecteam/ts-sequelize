'use strict';

import * as pghstore from 'pg-hstore';
const hstore = pghstore({sanitize: true});

export class Hstore {
  public static stringify(data : {}) : string {
    if (data === null) {
      return null;
    }
    return hstore.stringify(data);
  }

  public static parse(value : string) : {} {
    if (value === null) {
      return null;
    }
    return hstore.parse(value);
  }
}
