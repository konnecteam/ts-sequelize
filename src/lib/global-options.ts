
/**
 * Classe permettant de stocker des paramètres globaux en singleton
 */
export class GlobalOptions {

  private static instance : GlobalOptions = null;

  /**
   * Options spécifiques au dialect
   */
  public dialectOptions : any = {};

  constructor() { }

  public static get Instance() {
    if (GlobalOptions.instance == null) {
      GlobalOptions.instance = new GlobalOptions();
    }
    return GlobalOptions.instance;
  }

}
