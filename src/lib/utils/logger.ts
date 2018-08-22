'use strict';

/**
 * Sequelize module for debug and deprecation messages.
 * It require a `context` for which messages will be printed.
 *
 * @module logging
 */

import * as debug from 'debug';
import * as depd from 'depd';
import * as _ from 'lodash';
import { IConfig } from '../interfaces/iconfig';

export class Logger {
  public config;
  public depd;
  constructor(config : IConfig) {

    this.config = _.extend({
      context: 'sequelize',
      debug: true
    }, config || {});

    this.depd = depd(this.config.context);
    this.debug = debug(this.config.context);
  }

  /**
   * deprecate a message
   */
  public deprecate(message : string) {
    this.depd(message);
  }

  /**
   * debug a message
   */
  public debug(message : string) {
    if (this.config.debug) {
      this.debug(message);
    }
  }

  /**
   * write a warning massage in the console
   */
  public warn(message : string) {
    console.warn(`(${this.config.context}) Warning: ${message}`);
  }

  /**
   * debug a context
   */
  public debugContext(childContext : string) {
    if (!childContext) {
      throw new Error('No context supplied to debug');
    }
    return debug([this.config.context, childContext].join(':'));
  }
}
