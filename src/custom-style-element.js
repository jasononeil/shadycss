/**
@license
Copyright (c) 2016 The Polymer Project Authors. All rights reserved.
This code may only be used under the BSD style license found at http://polymer.github.io/LICENSE.txt
The complete set of authors may be found at http://polymer.github.io/AUTHORS.txt
The complete set of contributors may be found at http://polymer.github.io/CONTRIBUTORS.txt
Code distributed by Google as part of the polymer project is also
subject to an additional IP rights grant found at http://polymer.github.io/PATENTS.txt
*/

/*
Wrapper over <style> elements to co-operate with ShadyCSS

Example:
<custom-style>
  <style>
  ...
  </style>
</custom-style>
*/

'use strict';

let ShadyCSS = window.ShadyCSS;

let enqueued = false;

let alwaysUpdate = false;

let customStyles = [];

let hookFn = null;

let registered = false;

let readying = false;

/*
If a page only has <custom-style> elements, it will flash unstyled content,
as all the instances will boot asynchronously after page load.

Calling ShadyCSS.updateStyles() will force the work to happen synchronously
*/
function enqueueDocumentValidation() {
  if (enqueued) {
    return;
  }
  enqueued = true;
  if (window.HTMLImports) {
    window.HTMLImports.whenReady(validateDocument);
  } else if (document.readyState === 'complete') {
   validateDocument();
  } else if (!readying) {
    readying = true;
    document.addEventListener('readystatechange', () => {
      if (document.readyState === 'complete') {
        validateDocument();
      }
    });
  }
}

function validateDocument() {
  requestAnimationFrame(() => {
    if (enqueued || alwaysUpdate) {
      ShadyCSS.updateStyles();
    }
    enqueued = false;
    alwaysUpdate = true;
  });
}

class CustomStyle extends HTMLElement {
  static get registered() {
    return registered;
  }
  static get _customStyles() {
    return customStyles;
  }
  static get processHook() {
    return hookFn;
  }
  static set processHook(fn) {
    hookFn = fn;
    return fn
  }
  static get _documentDirty() {
    return enqueued;
  }
  static findStyles() {
    for (let i = 0; i < customStyles.length; i++) {
      customStyles[i]._findStyle();
    }
  }
  static _revalidateApplyShim() {
    for (let i = 0; i < customStyles.length; i++) {
      let s = customStyles[i];
      if (s._style) {
        ShadyCSS._revalidateApplyShim(s._style);
      }
    }
  }
  static applyStyles() {
    for (let i = 0; i < customStyles.length; i++) {
      customStyles[i]._applyStyle();
    }
    enqueued = false;
  }
  constructor() {
    super();
    customStyles.push(this);
    enqueueDocumentValidation();
  }
  _findStyle() {
    if (!this._style) {
      let style = this.querySelector('style');
      if (!style) {
        return;
      }
      // HTMLImports polyfill may have cloned the style into the main document,
      // which is referenced with __appliedElement.
      // Also, we must copy over the attributes.
      if (style.__appliedElement) {
        for (let i = 0; i < style.attributes.length; i++) {
          let attr = style.attributes[i];
          style.__appliedElement.setAttribute(attr.name, attr.value);
        }
      }
      this._style = style.__appliedElement || style;
      if (hookFn) {
        hookFn(this._style);
      }
      ShadyCSS._transformCustomStyleForDocument(this._style);
    }
  }
  _applyStyle() {
    if (this._style) {
      ShadyCSS._applyCustomStyleToDocument(this._style);
    }
  }
}
window['CustomStyle'] = CustomStyle;
window.customElements.define('custom-style', CustomStyle);