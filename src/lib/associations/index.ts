'use strict';

import * as Base from './base';
import { BelongsTo } from './belongs-to';
import { BelongsToMany } from './belongs-to-many';
import { HasMany } from './has-many';
import { HasOne } from './has-one';


const Association = {
  Base,
  BelongsTo,
  HasOne,
  HasMany,
  BelongsToMany
};

export default Association;
