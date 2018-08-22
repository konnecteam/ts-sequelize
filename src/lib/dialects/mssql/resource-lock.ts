'use strict';

import * as Promise from 'bluebird';

export class ResourceLock {

  private resource;
  private previous;

  constructor(resource) {
    this.resource = resource;
    this.previous = Promise.resolve(resource);
  }

  public unwrap() {
    return this.resource;
  }

  public lock() {
    const lock = this.previous;
    let resolve;

    this.previous = new Promise(r => {
      resolve = r;
    });

    return lock.disposer(resolve);
  }
}
