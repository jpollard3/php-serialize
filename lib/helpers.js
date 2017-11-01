'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.getClass = getClass;
exports.getIncompleteClass = getIncompleteClass;
exports.getByteLength = getByteLength;

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

/* eslint-disable camelcase */

var __PHP_Incomplete_Class = function __PHP_Incomplete_Class(name) {
  _classCallCheck(this, __PHP_Incomplete_Class);

  this.__PHP_Incomplete_Class_Name = name;
};

function getClass(prototype) {
  function Container() {}
  Container.prototype = prototype;
  return Container;
}

function getIncompleteClass(name) {
  return new __PHP_Incomplete_Class(name);
}

function getByteLength(contents) {
  if (typeof Buffer !== 'undefined') {
    return Buffer.byteLength(contents, 'utf8');
  }
  return encodeURIComponent(contents).replace(/%[A-F\d]{2}/g, 'U').length;
}