'use strict';


export class ParserStore {

  private _dialect : string = '';
  private _stores : Map<any, any>  = new Map();

  constructor(dialect : string) {
    this._dialect = dialect;
    if (!this._stores.has(dialect)) {
      this._stores.set(dialect, new Map());
    }
  }

  /**
   * clear the store
   */
  public clear() {
    this._stores.get(this._dialect).clear();
  }

  /**
   * refresh the parser of a dataType
   */
  public refresh(dataType : any) {
    for (const type of dataType.types[this._dialect]) {
      this._stores.get(this._dialect).set(type, dataType.parse);
    }
  }

  /**
   * get the parser of a type
   */
  public get(type : string) {
    return this._stores.get(this._dialect).get(type);
  }
}
