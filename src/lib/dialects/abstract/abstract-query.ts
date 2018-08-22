'use strict';

import * as Dot from 'dottie';
import * as _ from 'lodash';
import { Sequelize } from '../../..';
import { Association } from '../../associations/base';
import { DataSet } from '../../data-set';
import { IInclude } from '../../interfaces/iinclude';
import { Model } from '../../model';
import { QueryTypes } from '../../query-types';
import { SqlString } from '../../sql-string';
import { Transaction } from '../../transaction';
import { Utils } from '../../utils';

export abstract class AbstractQuery {

  public options : {
    /** Array<String>|Object, A list of the attributes that you want to select, or an object with `include` and `exclude` keys. */
    attributes? : any,
    /** = false, Pass query execution time in milliseconds as second argument to logging function (options.logging). */
    benchmark? : boolean,
    bind? : boolean,
    describeModelAttributes? : any[],
    /** The dialect of the database you are connecting to. One of mysql, postgres, sqlite, oracle and mssql. */
    dialect? : string,
    fieldMap? : any,
    hasJoin? : boolean,
    hasMultiAssociation? : boolean,
    include? : IInclude[],
    /** Internal map of includes - auto-completed */
    includeMap? : {},
    /** Internal array of attributes - auto-completed */
    includeNames? : string[],
    inputParameters?,
    /** Set the default transaction isolation level */
    isolationLevel? : string,
    /** A function that logs sql queries, or false for no logging */
    logging? : boolean | any,
    model? : Model<any, any>,
    /**
     *  = false, If true, transforms objects with `.` separated property names into nested objects using [dottie.js](https://github.com/mickhansen/dottie.js).
     * For example { 'user.username': 'john' } becomes { user: { username: 'john' }}. When `nest` is true, the query type is assumed to be `'SELECT'`, unless otherwise specified
     */
    nest? : boolean,
    originalAttributes? : any,
    /** Specify if we want only one row without using an array */
    plain? : boolean,
    /** Return raw result. */
    raw? : boolean,
    returning? : boolean,
    /** = DEFAULT An optional parameter to specify the schema search_path (Postgres only) */
    searchPath? : string,
    showWarnings? : boolean;
    tableNames? : string[],
    /** Transaction to run query under */
    transaction? : Transaction,
    /**
     * The type of query you are executing. The query type affects how results are formatted before they are passed back.
     * The type is a string, but `Sequelize.QueryTypes` is provided as convenience shortcuts.
     */
    type? : any
  };
  public model : Model<any, any>;
  public sql : string;
  public instance : DataSet<any>;
  public connection : any;
  public sequelize : Sequelize;

  /**
   * rewrite query with parameters
   *
   * Examples:
   *   query.formatBindParameters('select $1 as foo', ['fooval']);
   *   query.formatBindParameters('select $foo as foo', { foo: 'fooval' });
   */
  public static formatBindParameters(sql : any, values : any, dialect : string, replacementFunc? : any, options? : {
    /** skip unescaping $$ */
    skipUnescape? : boolean,
    /** do not replace (but do unescape $$). Check correct syntax and if all values are available */
    skipValueReplace? : boolean
  }) : any[] {
    if (!values) {
      return [sql, []];
    }

    options = options || {};
    if (typeof replacementFunc !== 'function') {
      options = replacementFunc || {};
      replacementFunc = undefined;
    }

    if (!replacementFunc) {
      if (options.skipValueReplace) {
        replacementFunc = (match, key, replaceValues) => {
          if (replaceValues[key] !== undefined) {
            return match;
          }
          return undefined;
        };
      } else {
        replacementFunc = (match, key, replaceValues, replaceTimeZone, replaceDialect) => {
          if (replaceValues[key] !== undefined) {
            return SqlString.escape(replaceValues[key], replaceTimeZone, replaceDialect);
          }
          return undefined;
        };
      }
    } else {
      if (options.skipValueReplace) {
        const origReplacementFunc = replacementFunc;
        replacementFunc = (match, key, replaceValues, replaceTimeZone, replaceDialect, replaceOptions) => {
          if (origReplacementFunc(match, key, replaceValues, replaceTimeZone, replaceDialect, replaceOptions) !== undefined) {
            return match;
          }
          return undefined;
        };
      }
    }

    const timeZone = null;
    const list = Array.isArray(values);

    sql = sql.replace(/\$(\$|\w+)/g, (match, key) => {
      if ('$' === key) {
        return options.skipUnescape ? match : key;
      }

      let replVal;
      if (list) {
        if (key.match(/^[1-9]\d*$/)) {
          key = key - 1;
          replVal = replacementFunc(match, key, values, timeZone, dialect, options);
        }
      } else {
        if (!key.match(/^\d*$/)) {
          replVal = replacementFunc(match, key, values, timeZone, dialect, options);
        }
      }
      if (replVal === undefined) {
        throw new Error('Named bind parameter "' + match + '" has no value in the given object.');
      }
      return replVal;
    });
    return [sql, []];
  }

  /**
   * Execute the passed sql query.
   *
   * Examples:
   *     query.run('SELECT 1')
   * @param sql - The SQL query which should be executed.
   */
  public run(sql : string, paramters?) : void {
    throw new Error('The run method wasn\'t overwritten!');
  }

  /**
   * Check the logging option of the instance and print deprecation warnings.
   */
  protected checkLoggingOption() : void {
    if (this.options.logging === true) {
      Utils.deprecate('The logging-option should be either a function or false. Default: console.log');
      this.options.logging = console.log;
    }
  }

  /**
   * Get the attributes of an insert query, which contains the just inserted id.
   */
  protected getInsertIdField() : string {
    return 'insertId';
  }

  /**
   * Iterate over all known tables and search their names inside the sql query.
   * This method will also check association aliases ('as' option).
   *
   * @param attribute An attribute of a SQL query. (?)
   * @returns String,           The found tableName / alias.
   * @private unused
   */
  // @unused
  /*private findTableNameInAttribute(attribute) {
    if (!this.options.include) {
      return null;
    }
    if (!this.options.includeNames) {
      this.options.includeNames = this.options.include.map(include => include.as);
    }

    const tableNames = this.options.includeNames.filter(include => attribute.indexOf(include + '.') === 0);

    if (tableNames.length === 1) {
      return tableNames[0];
    } else {
      return null;
    }
  }*/

  /**
   * return an unique constraint error message
   */
  protected getUniqueConstraintErrorMessage(field : string) : string {
    let message = field + ' must be unique';

    if (this.model) {
      for (const key of Object.keys(this.model.uniqueKeys)) {
        if (this.model.uniqueKeys[key].fields.indexOf(field.replace(/"/g, '')) >= 0) {
          if (this.model.uniqueKeys[key].msg) {
            message = this.model.uniqueKeys[key].msg;
          }
        }
      }
    }
    return message;
  }

  /**
   * return true if the type is raw
   */
  public isRawQuery() : boolean {
    return this.options.type === QueryTypes.RAW;
  }

  /**
   * return true if the type is version
   */
  public isVersionQuery() : boolean {
    return this.options.type === QueryTypes.VERSION;
  }

  /**
   * return true if the type is upsert
   */
  public isUpsertQuery() : boolean {
    return this.options.type === QueryTypes.UPSERT;
  }

  /**
   * return true if the type is insert
   */
  public isInsertQuery(results? : any, metaData? : {}) : boolean {
    let result = true;

    if (this.options.type === QueryTypes.INSERT) {
      return true;
    }

    // is insert query if sql contains insert into
    result = result && this.sql.toLowerCase().indexOf('insert into') === 0;

    // is insert query if no results are passed or if the result has the inserted id
    result = result && (!results || results.hasOwnProperty(this.getInsertIdField()));

    // is insert query if no metadata are passed or if the metadata has the inserted id
    result = result && (!metaData || metaData.hasOwnProperty(this.getInsertIdField()));

    return result;
  }

  /**
   * handle insert query
   */
  public handleInsertQuery(results : any, metaData? : {}) {
    if (this.instance) {
      // add the inserted row id to the instance
      const autoIncrementAttribute = this.model.autoIncrementAttribute;
      let id = null;

      id = id || results && results[this.getInsertIdField()];
      id = id || metaData && metaData[this.getInsertIdField()];

      this.instance[autoIncrementAttribute] = id;
    }
  }

  /**
   * return true if the type is showTables
   */
  public isShowTablesQuery() : boolean {
    return this.options.type === QueryTypes.SHOWTABLES;
  }

  /**
   * handle show tables query
   */
  public handleShowTablesQuery(results) {
    return _.flatten(results.map(resultSet => _.values(resultSet)));
  }

  /**
   * return true if the type is show indexes
   */
  public isShowIndexesQuery() : boolean {
    return this.options.type === QueryTypes.SHOWINDEXES;
  }

  /**
   * return true if the type is show constraints
   */
  public isShowConstraintsQuery() : boolean {
    return this.options.type === QueryTypes.SHOWCONSTRAINTS;
  }

  /**
   * return true if the type is describe
   */
  public isDescribeQuery() : boolean {
    return this.options.type === QueryTypes.DESCRIBE;
  }

  /**
   * return true if the type is select
   */
  public isSelectQuery() : boolean {
    return this.options.type === QueryTypes.SELECT;
  }

  /**
   * return true if the type is bulk update
   */
  public isBulkUpdateQuery() : boolean {
    return this.options.type === QueryTypes.BULKUPDATE;
  }

  /**
   * return true if the type is buld delete
   */
  public isBulkDeleteQuery() : boolean {
    return this.options.type === QueryTypes.BULKDELETE;
  }

  /**
   * return true if the type is foreign keys
   */
  public isForeignKeysQuery() : boolean {
    return this.options.type === QueryTypes.FOREIGNKEYS;
  }

  /**
   * return true if the type is update
   */
  public isUpdateQuery() : boolean {
    return this.options.type === QueryTypes.UPDATE;
  }

  /**
   * handle select query
   */
  public handleSelectQuery(results : any) : {} {
    let mainResult = null;
    // Map raw fields to names if a mapping is provided
    if (this.options.fieldMap) {
      const fieldMap = this.options.fieldMap;
      results = _.map(results, result => _.reduce(fieldMap, (reduceResult, name, field) => {
        if (reduceResult[field] !== undefined) {
          reduceResult[name] = reduceResult[field];
          delete reduceResult[field];
        }
        return reduceResult;
      }, result));
    }
    // Raw queries
    if (this.options.raw) {
      mainResult = results.map(result => {
        let o = {};

        const resultKeys = Object.keys(result);
        resultKeys.forEach(key => {
          o[key] = result[key];
        });

        if (this.options.nest) {
          o = Dot.transform(o);
        }

        return o;
      });
    // Queries with include
    } else if (this.options.hasJoin === true) {
      results = AbstractQuery.groupJoinData(results, {
        model: this.model,
        includeMap: this.options.includeMap,
        includeNames: this.options.includeNames
      }, {
        checkExisting: this.options.hasMultiAssociation
      });

      mainResult = this.model.bulkBuild(results, {
        isNewRecord: false,
        include: this.options.include,
        includeNames: this.options.includeNames,
        includeMap: this.options.includeMap,
        includeValidated: true,
        attributes: this.options.originalAttributes || this.options.attributes,
        raw: true
      });
    // Regular queries
    } else {
      mainResult = this.model.bulkBuild(results, {
        isNewRecord: false,
        raw: true,
        attributes: this.options.attributes
      });
    }

    // return the first real model instance if options.plain is set (e.g. Model.find)
    if (this.options.plain) {
      mainResult = mainResult.length === 0 ? null : mainResult[0];
    }
    return mainResult;
  }

  public isShowOrDescribeQuery() : boolean {
    let result = false;

    result = result || this.sql.toLowerCase().indexOf('show') === 0;
    result = result || this.sql.toLowerCase().indexOf('describe') === 0;

    return result;
  }

  public isCallQuery() : boolean {
    return this.sql.toLowerCase().indexOf('call') === 0;
  }

  /**
   * The function takes the result of the query execution and groups
   * the associated data by the callee.
   *
   * Example:
   *   groupJoinData([
   *     {
   *       some: 'data',
   *       id: 1,
   *       association: { foo: 'bar', id: 1 }
   *     }, {
   *       some: 'data',
   *       id: 1,
   *       association: { foo: 'bar', id: 2 }
   *     }, {
   *       some: 'data',
   *       id: 1,
   *       association: { foo: 'bar', id: 3 }
   *     }
   *   ])
   *
   * Result:
   *   Something like this:
   *
   *   [
   *     {
   *       some: 'data',
   *       id: 1,
   *       association: [
   *         { foo: 'bar', id: 1 },
   *         { foo: 'bar', id: 2 },
   *         { foo: 'bar', id: 3 }
   *       ]
   *     }
   *   ]
   * @hidden
   */
  private static _groupJoinData(rows : any[], includeOptions : {
    association? : Association<any, any, any, any>;
    model? : Model<any, any>,
    /** Internal map of includes - auto-completed */
    includeMap? : {},
    /** Internal array of attributes - auto-completed */
    includeNames? : string[]
  }, options : { checkExisting? : boolean }) : any[] {

    const rowsLength = rows.length;
    if (!rowsLength) {
      return [];
    }

    const keys = Object.keys(rows[0]);
    const keysLength = keys.length;
    // prefix in string of each key (ex: a.b.id -> prefix = a.b)
    const keysPrefixString = [];
    // prefix in table of each key (ex: a.b.id -> [a,b])
    const keysPrefix = [];
    // key without the prefix (ex: a.b.id -> id)
    const keysWithoutPrefix = [];
    // primary key of each model
    const primaryKeys = {};
    const primaryKeysWithPrefix = {};
    const isSingleAssociations = {};

    for (let i = 0; i < keysLength; i++) {
      // On récupère le prefix de chaques clés, sous forme de chaine de caractère et de tableau
      const key = keys[i];
      const prefixString = keysPrefixString[i] = key.substr(0, key.lastIndexOf('.'));
      if (prefixString === '') {
        keysPrefix[i] = [];
        keysWithoutPrefix[i] = key;
      } else {
        keysPrefix[i] = prefixString.split('.');
        keysWithoutPrefix[i] = key.substring(key.lastIndexOf('.') + 1, key.length);
      }

      if (!primaryKeys[prefixString] || !isSingleAssociations[prefixString]) {
        // on cherche l'include correspondant au model du prefix de la clé en cours
        let currentInclude = includeOptions;
        for (let j = 0; j < keysPrefix[i].length; j++) {
          currentInclude = currentInclude.includeMap[keysPrefix[i][j]];
        }

        // On récupère les clés primaires et si les associations sont simples ou multiples
        primaryKeys[prefixString] = currentInclude.model.primaryKeyAttributes;

        if (prefixString !== '') {
          isSingleAssociations[prefixString] = currentInclude.association.isSingleAssociation;
          // On cherche aussi les clés primaires avec leur préfixes pour pouvoir les récupérer directement dans rows
          primaryKeysWithPrefix[prefixString] = [];
          for (let j = 0; j < primaryKeys[prefixString].length; j++) {
            primaryKeysWithPrefix[prefixString][j] = prefixString + '.' + primaryKeys[prefixString][j];
          }
        } else {
          primaryKeysWithPrefix[prefixString] = primaryKeys[prefixString];
        }
      }

    }

    const result = [];
    let values = {};

    //On boucle sur toutes les lignes
    for (let rowsI = 0; rowsI < rowsLength; rowsI++) {
      const row = rows[rowsI];

      //On boucle sur les clés
      for (let keyI = 0; keyI < keysLength; keyI++) {
        const key = keys[keyI];
        // On remplit l'objet à ajouter avec l'attribut correspondant à la clé dans la ligne actuel
        values[keysWithoutPrefix[keyI]] = row[key];
        // prefix de la clé qui suit (pour savoir si on à fini de récupérer tous les attributs de l'objet actuel)
        const nextKeyPrefixString = keysPrefixString[keyI + 1];
        // si le prefix suivant est différent, on ajoute l'objet values au bon endroit
        if ((!nextKeyPrefixString && nextKeyPrefixString !== '') || nextKeyPrefixString !== keysPrefixString[keyI]) {
          // objet ou tableau dans lequel on veut ajouter values, pour le trouver on part de result et on va chercher le bon objet en vérifiant les clés primaires
          let whereAdd = result;
          // le prefix correspondant à whereAdd (ex: si on veut ajouter a.b.id, au premier passage le prefix sera '' puis a puis a.b)
          let prefix = '';
          // tableau de prefix de la clé, c'est à dire de l'objet values que l'on veut ajouter
          const keyPrefix = keysPrefix[keyI];
          const keyPrefixLength = keyPrefix.length;
          let isAlreadyInResult;
          if (options.checkExisting || keyPrefixLength !== 0) {
            // On cherche le bon parent auquel ajouter values
            for (let i = 0; i < keyPrefixLength + 1; i++) {
              // On le met à faux pour le cas ou il n'y a rien dans le tableau, dans ce cas on l'ajoute directement
              isAlreadyInResult = false;
              for (let whereAddI = 0; whereAddI < whereAdd.length; whereAddI++) {
                isAlreadyInResult = true;
                // On vérifie si l'objet est déjà présent ou on cherche son parent si on n'est pas encore à son niveau
                // On va pour cela comparer les clés primaires de chacun des objets de chaque niveau jusqu'à arriver sur le dernier parent de values auquel on l'ajoute
                for (let j = 0; j < primaryKeys[prefix].length; j++) {
                  // On compare les clés primaires de la ligne auquel appartient row aux clés primaires des objets présents dans whereAdd
                  if (row[primaryKeysWithPrefix[prefix][j]] !== whereAdd[whereAddI][primaryKeys[prefix][j]]) {
                    isAlreadyInResult = false;
                  }
                }
                if (isAlreadyInResult) {
                  if (keyPrefixLength !== i) {
                    whereAdd = whereAdd[whereAddI];
                  }
                  break;
                }
              }
              // si un objet avec les clés primaires correspondant au prefix actuel est déjà présent alors :
              // si on est au niveau du prefix de values, values est déjà présent dans result
              // sinon on a trouvé un parent de values, on le met dans whereAdd et on réitère à nouveau jusqu'à arriver au niveau du prefix de values
              if (keyPrefixLength !== i) {
                // on ajoute la partie du préfix suivantes
                if (prefix !== '') {
                  prefix += '.';
                }
                prefix += keyPrefix[i];

                if (!isSingleAssociations[prefix] && !whereAdd[keyPrefix[i]]) {
                  // si c'est une association multiple et qu'il n'y a pas encore d'autres liaison avec l'objet actuel, on crée un tableau à l'attribut correspondant pour pouvoir y mettre values
                  whereAdd[keyPrefix[i]] = [];
                }
                // si il y a un attribut qui correspond à la partie du prefixe actuel alors whereAdd référence celle ci
                // c'est donc l'objet suivant si c'est une association simple sinon un tableau
                // On passe tout le temps sauf lorsqu'on est au niveau de l'endroit ou l'on va ajouter values pour un simple association
                if (whereAdd[keyPrefix[i]]) {
                  whereAdd = whereAdd[keyPrefix[i]];
                }
              }
            }
          }
          // si l'objet values n'est pas encore présent on l'ajoute
          if (!isAlreadyInResult) {
            if (isSingleAssociations[prefix]) {
              // si c'est une simple association on attribut directement l'objet à l'attribut correspondant
              whereAdd[keyPrefix[keyPrefixLength - 1]] = values;
            } else {
              // sinon on l'ajoute au tableau créer précédement
              whereAdd[whereAdd.length] = values;
            }
          }
          values = {};
        }
      }
    }
    return result;
  }

  /**
   * @internal
   * @hidden
   */
  public static groupJoinData(rows, includeOptions, options) {
    const result = this._groupJoinData(rows, includeOptions, options);
    return result;
  }
}
