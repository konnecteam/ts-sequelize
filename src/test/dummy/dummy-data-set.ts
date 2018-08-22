import { DataSet } from '../../lib/data-set';


export interface ItestAttribute {
  [key : string] : any;
}
export interface ItestInstance extends DataSet<ItestAttribute>, ItestAttribute { }
