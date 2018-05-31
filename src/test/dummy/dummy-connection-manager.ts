import { Sequelize } from '../..';
import { AbstractConnectionManager } from '../../lib/dialects/abstract/abstract-connection-manager';

export class DummyConnectionManager extends AbstractConnectionManager {

  /**
   * Only for override purpose from tests
   */
  constructor(dialect : any, sequelize : Sequelize) {
    super(dialect, sequelize);
  }

  /**
   * Declaration void as main class is abstract
   */
  public connect(connection?) {}
  public disconnect(connection?) {}
  public validate(connection?) {}
}
