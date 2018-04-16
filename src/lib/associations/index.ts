'use strict';

import * as Base from './base';
import {BelongsTo} from './belongs-to';
import {HasOne} from './has-one';
import {HasMany} from './has-many';
import {BelongsToMany} from './belongs-to-many';


const Association = {
    Base : Base,
    BelongsTo : BelongsTo,
    HasOne : HasOne,
    HasMany : HasMany,
    BelongsToMany : BelongsToMany
};

export default Association;