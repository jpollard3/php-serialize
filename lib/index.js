'use strict';

var _typeof = typeof Symbol === "function" && typeof Symbol.iterator === "symbol" ? function (obj) { return typeof obj; } : function (obj) { return obj && typeof Symbol === "function" && obj.constructor === Symbol && obj !== Symbol.prototype ? "symbol" : typeof obj; };

var _assert = require('assert');

var _assert2 = _interopRequireDefault(_assert);

var _helpers = require('./helpers');

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

function serialize(item) {
  var type = typeof item === 'undefined' ? 'undefined' : _typeof(item);
  if (item === null) {
    return 'N;';
  }
  if (type === 'number') {
    if (item % 1 === 0) {
      return 'i:' + item + ';';
    }
    return 'd:' + item + ';';
  }
  if (type === 'string') {
    return 's:' + item.length + ':"' + item + '";';
  }
  if (type === 'boolean') {
    return 'b:' + (item ? '1' : '0') + ';';
  }
  if (type !== 'object') {
    throw new TypeError();
  }

  var isArray = Array.isArray(item);
  if (isArray || item.constructor.name === 'Object') {
    // Array or raw object
    var toReturn = [];
    var size = 0;
    for (var key in item) {
      if ({}.hasOwnProperty.call(item, key) && (key !== 'length' || isArray)) {
        size++;
        var _value = item[key];
        var saneKey = isArray ? parseInt(key, 10) : key;
        toReturn.push(serialize(saneKey), serialize(_value));
      }
    }
    toReturn.unshift('a:' + size + ':{');
    toReturn.push('}');
    return toReturn.join('');
  }
  if (typeof item.serialize === 'function') {
    var serialized = item.serialize();
    (0, _assert2.default)(typeof serialized === 'string', item.constructor.name + '.serialize should return a string');
    return 'C:' + item.constructor.name.length + ':"' + item.constructor.name + '":' + serialized.length + ':{' + serialized + '}';
  }
  var items = [];
  var constructorName = item.__PHP_Incomplete_Class_Name || item.constructor.name.length;
  for (var _key in item) {
    if ({}.hasOwnProperty.call(item, _key) && typeof item[_key] !== 'function') {
      var _value2 = item[_key];
      items.push(serialize(_key));
      items.push(serialize(_value2));
    }
  }
  return 'O:' + constructorName + ':"' + item.constructor.name + '":' + items.length / 2 + ':{' + items.join('') + '}';
}

function unserializeItem(item, startIndex, scope, options) {
  var currentIndex = startIndex;
  var type = item.toString('utf8', currentIndex, currentIndex + 1);
  // Increment for the type and colon (or semi-colon for null) characters
  currentIndex += 2;

  if (type === 'N') {
    // Null
    return { index: currentIndex, value: null };
  }
  if (type === 'i' || type === 'd') {
    // Integer or Double (aka float)
    var valueEnd = item.indexOf(';', currentIndex);
    var _value3 = item.toString('utf8', currentIndex, valueEnd);
    // +1 because of extra semi-colon at the end
    currentIndex += _value3.length + 1;
    return { index: currentIndex, value: type === 'i' ? parseInt(_value3, 10) : parseFloat(_value3) };
  }
  if (type === 'b') {
    // Boolean
    var _value4 = item.toString('utf8', currentIndex, currentIndex + 1);
    // +2 for 1 digital value and a semi-colon
    currentIndex += 2;
    return { index: currentIndex, value: _value4 === '1' };
  }
  if (type === 's') {
    // String
    var lengthEnd = item.indexOf(':', currentIndex);
    var length = parseInt(item.slice(currentIndex, lengthEnd), 10) || 0;
    // +2 because of colon and starting of inverted commas at start of string
    currentIndex = lengthEnd + 2;
    var _value5 = item.toString('utf8', currentIndex, currentIndex + length);
    // +2 because of closing of inverted commas at end of string, and extra semi-colon
    currentIndex += length + 2;

    return { index: currentIndex, value: _value5 };
  }
  if (type === 'C') {
    // Serializable class
    var classNameLengthEnd = item.indexOf(':', currentIndex);
    var classNameLength = parseInt(item.toString('utf8', currentIndex, classNameLengthEnd), 10) || 0;

    // +2 for : and start of inverted commas for class name
    currentIndex = classNameLengthEnd + 2;
    var className = item.toString('utf8', currentIndex, currentIndex + classNameLength);
    // +2 for end of inverted commas and colon before inner content length
    currentIndex += classNameLength + 2;

    var contentLengthEnd = item.indexOf(':', currentIndex);
    var contentLength = parseInt(item.toString('utf8', currentIndex, contentLengthEnd), 10) || 0;
    // +2 for : and { at start of inner content
    currentIndex = contentLengthEnd + 2;

    var classContent = item.toString('utf8', currentIndex, currentIndex + contentLength);
    // +1 for the } at end of inner content
    currentIndex += contentLength + 1;

    var container = getClassReference(className, scope, options.strict);
    if (container.constructor.name !== '__PHP_Incomplete_Class') {
      (0, _assert2.default)(typeof container.unserialize === 'function', container.constructor.name.toLowerCase() + '.unserialize is not a function');
      // console.log('classContent', classContent)
      container.unserialize(classContent);
    }
    return { index: currentIndex, value: container };
  }
  if (type === 'a') {
    // Array or Object
    var first = true;
    var _container = [];
    var _lengthEnd = item.indexOf(':', currentIndex);
    var _length = parseInt(item.toString('utf8', currentIndex, _lengthEnd), 10) || 0;

    // +2 for ":{" before the start of object
    currentIndex = _lengthEnd + 2;
    currentIndex = unserializeObject(item, currentIndex, _length, scope, function (key, value) {
      if (first) {
        _container = parseInt(key, 10) === 0 ? [] : {};
        first = false;
      }
      _container[key] = value;
    }, options);

    // +1 for the last } at the end of object
    currentIndex++;
    return { index: currentIndex, value: _container };
  }
  if (type === 'O') {
    // Non-Serializable Class
    var _classNameLengthEnd = item.indexOf(':', currentIndex);
    var _classNameLength = parseInt(item.toString('utf8', currentIndex, _classNameLengthEnd), 10) || 0;

    // +2 for : and start of inverted commas for class name
    currentIndex = _classNameLengthEnd + 2;
    var _className = item.toString('utf8', currentIndex, currentIndex + _classNameLength);
    // +2 for end of inverted commas and colon before inner content length
    currentIndex += _classNameLength + 2;

    var _contentLengthEnd = item.indexOf(':', currentIndex);
    var _contentLength = parseInt(item.toString('utf8', currentIndex, _contentLengthEnd), 10) || 0;
    // +2 for : and { at start of object
    currentIndex = _contentLengthEnd + 2;

    var _container2 = getClassReference(_className, scope, options.strict);
    currentIndex = unserializeObject(item, currentIndex, _contentLength, scope, function (key, value) {
      _container2[key] = value;
    }, options);
    // +1 for the last } at the end of object
    currentIndex += 1;
    return { index: currentIndex, value: _container2 };
  }
  throw new SyntaxError();
}

function getClassReference(className, scope, strict) {
  var container = void 0;
  var classReference = scope[className];
  if (!classReference) {
    if (strict) {
      (0, _assert2.default)(false, 'Class ' + className + ' not found in given scope');
    }
    container = (0, _helpers.getIncompleteClass)(className);
  } else {
    container = new ((0, _helpers.getClass)(scope[className].prototype))();
  }
  return container;
}

function unserializeObject(item, startIndex, length, scope, valueCallback, options) {
  var key = null;
  var currentIndex = startIndex;

  for (var i = 0; i < length * 2; ++i) {
    var entry = unserializeItem(item, currentIndex, scope, options);
    if (key !== null) {
      valueCallback(key, entry.value);
      key = null;
    } else {
      key = entry.value;
    }
    currentIndex = entry.index;
  }

  return currentIndex;
}

function unserialize(item) {
  var scope = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : {};
  var givenOptions = arguments.length > 2 && arguments[2] !== undefined ? arguments[2] : {};

  var options = Object.assign({}, givenOptions);
  if (typeof options.strict === 'undefined') {
    options.strict = true;
  }
  return unserializeItem(Buffer.from(item), 0, scope, options).value;
}

module.exports = { serialize: serialize, unserialize: unserialize };