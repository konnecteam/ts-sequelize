import { Association } from '../associations/base';
import { Model } from '../model';

/**
 * @param  model The model you want to eagerly load
 * @param  as The alias of the relation, in case the model you want to eagerly load is aliased. For `hasOne` / `belongsTo`,
 * this should be the singular name, and for `hasMany`, it should be the plural
 * @param  association The association you want to eagerly load. (This can be used instead of providing a model/as pair)
 * @param  where Where clauses to apply to the child models. Note that this converts the eager load to an inner join, unless you explicitly set `required: false`
 * @param  or=false Whether to bind the ON and WHERE clause together by OR instead of AND.
 * @param  on Supply your own ON condition for the join.
 * @param  attributes A list of attributes to select from the child model
 * @param  required If true, converts to an inner join, which means that the parent model will only be loaded if it has any matching children.
 * True if `include.where` is set, false otherwise.
 * @param  separate If true, runs a separate query to fetch the associated instances, only supported for hasMany associations
 * @param  limit Limit the joined rows, only supported with include.separate=true
 * @param  through.where Filter on the join model for belongsToMany relations
 * @param  through.attributes A list of attributes to select from the join model for belongsToMany relations
 * @param  include Load further nested related models
 */
export interface IInclude {
  all? : any;
  /** : string | {}, assocation alias */
  as? : string;
  association? : Association<any, any, any, any>;
  /** Array<String>|Object, A list of the attributes that you want to select, or an object with `include` and `exclude` keys. */
  attributes? : any;
  duplicating? : boolean;
  hasDuplicating? : boolean;
  hasIncludeRequired? : boolean;
  hasIncludeWhere? : boolean;
  hasMultiAssociation? : boolean;
  hasParentWhere? : boolean;
  hasParentRequired? : boolean;
  hasRequired? : boolean;
  hasSingleAssociation? : boolean;
  hasWhere? : boolean;
  include? : IInclude[];
  inSubQuery? : boolean;
  /** The maximum count you want to get. */
  limit? : number;
  mismatch? : any;
  model? : Model<any, any>;
  myOption? : string;
  on? : any;
  or? : boolean;
  order? : string[][];
  parent? : any;
  required? : boolean;
  /** Separate requests if multiple left outer */
  separate? : boolean;
  /** Passes by sub-query ? */
  subQuery? : boolean;
  subQueryFilter? : boolean;
  /** Additional attributes for the join table */
  through? : {
    as? : any,
    attributes? : any,
    model? : Model<any, any>,
    where? : {}
  };
  /** A hash of search attributes. */
  where? : {};
}
