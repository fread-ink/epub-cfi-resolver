'use strict';

const debug = false; // Enable debug output?

var tape = require('tape');

var CFI = require('../index.js');

// Allow these tests to run outside of the browser
var JSDOM = require('jsdom').JSDOM;
function parseDOM(str, mimetype) {
  return new JSDOM(str, {
    contentType: mimetype
  }).window.document;
}

var docs = require('../test_data/from_spec.js');
  
const opfDOM = parseDOM(docs.opf, 'application/xhtml+xml');
const htmlDOM = parseDOM(docs.html, 'application/xhtml+xml');

tape('Odd and bad data', function(t) {
  
  t.plan(10);
  
  var cfi, data;

  cfi = new CFI("epubcfi()");
  data = cfi.get();
  t.deepEqual(data, [], "Empty CFI");

  t.throws(function() {new CFI("epcfi()")}, "Invalid CFI header");

  t.throws(function() {new CFI("")}, "Empty string CFI");

  t.throws(function() {new CFI(42)}, "Non-string CFI");
  
  t.throws(function() {new CFI()}, "No CFI");

  t.throws(function() {new CFI("epubcfi(foobar)")}, "Invalid CFI");
  
  t.throws(function() {new CFI("epubcfi(/foo/bar)")}, "Invalid CFI");

  t.throws(function() {new CFI("epubcfi(/2/f)")}, "Invalid CFI");

  t.throws(function() {new CFI("epubcfi(/2/4!6)")}, "Invalid CFI");
  
  cfi = new CFI("epubcfi(/^3/^2)");
  data = cfi.get();
  t.deepEqual(data, [[{nodeIndex: 3}, {nodeIndex: 2}]], "Escaping the non-escapable");
  

});
