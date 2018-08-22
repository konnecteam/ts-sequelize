interface IHooks {

  /**
   * Add a hook to the model
   *
   * @param hookType
   * @param name Provide a name for the hook function. It can be used to remove the hook later or to order
   *     hooks based on some sort of priority system in the future.
   * @param fn The hook function
   *
   * @alias hook
   */
  addHook(hookType : string, name : string, fn : any) : IHooks;
  addHook(hookType : string, fn : any) : IHooks;
  hook(hookType : string, name : string, fn : any) : IHooks;
  hook(hookType : string, fn : any) : IHooks;

  /**
   * Remove hook from the model
   *
   * @param hookType
   * @param name
   */
  removeHook(hookType : string, name : string) : IHooks;

  /**
   * Check whether the mode has any hooks of this type
   *
   * @param hookType
   *
   * @alias hasIHooks
   */
  hasHook(hookType : string) : boolean;

  /**
   * A hook that is run before validation
   *
   * @param name
   * @param fn A callback function that is called with instance, options
   */
  beforeValidate(name : string,
      fn : any) : void;
  beforeValidate(fn : any) : void;

  /**
   * A hook that is run after validation
   *
   * @param name
   * @param fn A callback function that is called with instance, options
   */
  afterValidate(name : string,
      fn : any) : void;
  afterValidate(fn : any) : void;

  /**
   * A hook that is run before creating a single instance
   *
   * @param name
   * @param fn A callback function that is called with attributes, options
   */
  beforeCreate(name : string,
      fn : any) : void;
  beforeCreate(fn : any) : void;

  /**
   * A hook that is run after creating a single instance
   *
   * @param name
   * @param fn A callback function that is called with attributes, options
   */
  afterCreate(name : string,
      fn : any) : void;
  afterCreate(fn : any) : void;

  /**
   * A hook that is run before destroying a single instance
   *
   * @param name
   * @param fn A callback function that is called with instance, options
   * @alias beforeDelete
   */
  beforeDestroy(name : string,
      fn : any) : void;
  beforeDestroy(fn : any) : void;
  beforeDelete(name : string,
      fn : any) : void;
  beforeDelete(fn : any) : void;

  /**
   * A hook that is run after destroying a single instance
   *
   * @param name
   * @param fn A callback function that is called with instance, options
   * @alias afterDelete
   */
  afterDestroy(name : string,
      fn : any) : void;
  afterDestroy(fn : any) : void;
  afterDelete(name : string, fn : any) : void;
  afterDelete(fn : any) : void;

  /**
   * A hook that is run before updating a single instance
   *
   * @param name
   * @param fn A callback function that is called with instance, options
   */
  beforeUpdate(name : string,
      fn : any) : void;
  beforeUpdate(fn : any) : void;

  /**
   * A hook that is run after updating a single instance
   *
   * @param name
   * @param fn A callback function that is called with instance, options
   */
  afterUpdate(name : string, fn : any) : void;
  afterUpdate(fn : any) : void;

  /**
   * A hook that is run before creating instances in bulk
   *
   * @param name
   * @param fn A callback function that is called with instances, options
   */
  beforeBulkCreate(name : string,
      fn : any) : void;
  beforeBulkCreate(fn : any) : void;

  /**
   * A hook that is run after creating instances in bulk
   *
   * @param name
   * @param fn A callback function that is called with instances, options
   * @name afterBulkCreate
   */
  afterBulkCreate(name : string,
      fn : any) : void;
  afterBulkCreate(fn : any) : void;

  /**
   * A hook that is run before destroying instances in bulk
   *
   * @param name
   * @param fn   A callback function that is called with options
   *
   * @alias beforeBulkDelete
   */
  beforeBulkDestroy(name : string, fn : any) : void;
  beforeBulkDestroy(fn : any) : void;
  beforeBulkDelete(name : string, fn : any) : void;
  beforeBulkDelete(fn : any) : void;

  /**
   * A hook that is run after destroying instances in bulk
   *
   * @param name
   * @param fn   A callback function that is called with options
   *
   * @alias afterBulkDelete
   */
  afterBulkDestroy(name : string, fn : any) : void;
  afterBulkDestroy(fn : any) : void;
  afterBulkDelete(name : string, fn : any) : void;
  afterBulkDelete(fn : any) : void;

  /**
   * A hook that is run after updating instances in bulk
   *
   * @param name
   * @param fn   A callback function that is called with options
   */
  beforeBulkUpdate(name : string, fn : any) : void;
  beforeBulkUpdate(fn : any) : void;

  /**
   * A hook that is run after updating instances in bulk
   *
   * @param name
   * @param fn   A callback function that is called with options
   */
  afterBulkUpdate(name : string, fn : any) : void;
  afterBulkUpdate(fn : any) : void;

  /**
   * A hook that is run before a find (select) query
   *
   * @param name
   * @param fn   A callback function that is called with options
   */
  beforeFind(name : string, fn : any) : void;
  beforeFind(fn : any) : void;

  /**
   * A hook that is run before a find (select) query, after any { include : {all : ...} } options are expanded
   *
   * @param name
   * @param fn   A callback function that is called with options
   */
  beforeFindAfterExpandIncludeAll(name : string,
      fn : any) : void;
  beforeFindAfterExpandIncludeAll(fn : any) : void;

  /**
   * A hook that is run before a find (select) query, after all option parsing is complete
   *
   * @param name
   * @param fn   A callback function that is called with options
   */
  beforeFindAfterOptions(name : string, fn : any) : void;
  beforeFindAfterOptions(fn : any) : void;

  /**
   * A hook that is run after a find (select) query
   *
   * @param name
   * @param fn   A callback function that is called with instance(s), options
   */
  afterFind(name : string,
      fn : any) : void;
  afterFind(fn : any) : void;

  /**
   * A hook that is run before a define call
   *
   * @param name
   * @param fn   A callback function that is called with attributes, options
   */
  beforeDefine(name : string, fn : any) : void;
  beforeDefine(fn : any) : void;

  /**
   * A hook that is run after a define call
   *
   * @param name
   * @param fn   A callback function that is called with factory
   */
  afterDefine(name : string, fn : any) : void;
  afterDefine(fn : any) : void;

  /**
   * A hook that is run before Sequelize() call
   *
   * @param name
   * @param fn   A callback function that is called with config, options
   */
  beforeInit(name : string, fn : any) : void;
  beforeInit(fn : any) : void;

  /**
   * A hook that is run after Sequelize() call
   *
   * @param name
   * @param fn   A callback function that is called with sequelize
   */
  afterInit(name : string, fn : any) : void;
  afterInit(fn : any) : void;

  /**
   * A hook that is run before Model.sync call
   *
   * @param name
   * @param fn   	A callback function that is called with options passed to Model.sync
   */
  beforeSync(name : string, fn : any) : void;
  beforeSync(fn : any) : void;

  /**
   * A hook that is run after Model.sync call
   *
   * @param name
   * @param fn   	A callback function that is called with options passed to Model.sync
   */
  afterSync(name : string, fn : any) : void;
  afterSync(fn : any) : void;

  /**
   * A hook that is run before sequelize.sync call
   *
   * @param name
   * @param fn    A callback function that is called with options passed to sequelize.sync
   */
  beforeBulkSync(name : string, fn : any) : void;
  beforeBulkSync(fn : any) : void;

  /**
   * A hook that is run after sequelize.sync call
   *
   * @param name
   * @param fn   A callback function that is called with options passed to sequelize.sync
   */
  afterBulkSync(name : string, fn : any) : void;
  afterBulkSync(fn : any) : void;
}
