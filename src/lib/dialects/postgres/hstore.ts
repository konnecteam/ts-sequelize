'use strict';

import * as pghstore from 'pg-hstore';
const hstore = pghstore({sanitize: true});

export function stringify(data) {
  if (data === null) return null;
  return hstore.stringify(data);
}

export function parse(value) {
  if (value === null) return null;
  return hstore.parse(value);
}
