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
var nwDocs = require('../test_data/no_whitespace.js');
var badDoc = require('../test_data/bad.js');

const opfDOM = parseDOM(docs.opf, 'application/xhtml+xml');
const htmlDOM = parseDOM(docs.html, 'application/xhtml+xml');

const nwOpfDOM = parseDOM(nwDocs.opf, 'application/xhtml+xml');
const nwHtmlDOM = parseDOM(nwDocs.html, 'application/xhtml+xml');

const badDOM = parseDOM(badDoc, 'application/xhtml+xml');

function generateAndCompare(t, dom, node, offset, cfi) {

  var c = CFI.generate(node, offset);
  
  t.equal(c, cfi);
         
  var cfi = new CFI(c);
  
  var bookmark = cfi.resolveLast(dom);

  t.equal(bookmark.node, node);
  t.equal(bookmark.offset, offset);
  
  bookmark = cfi.resolveLast(dom, {
    ignoreIDs: true
  });

  t.equal(bookmark.node, node);
  t.equal(bookmark.offset, offset);
}

tape('Generator', function(t) {

  t.plan(16);

  var cfiStr = 'epubcfi(/2/4[body01]/10[para05]/3:5)';
  
  var node = htmlDOM.querySelector('#para05').lastChild;
  
  generateAndCompare(t, htmlDOM, node, 5, cfiStr)

  node = nwHtmlDOM.querySelector('#para05').lastChild;
  
  generateAndCompare(t, nwHtmlDOM, node, 5, cfiStr)

  cfiStr = 'epubcfi(/2/4/2[!/^[^]^,^;]/2/4[!/foo^^^[^]]/1:10)';

  node = badDOM.getElementById('!/foo^[]').lastChild;
  
  generateAndCompare(t, badDOM, node, 1, cfiStr);
  
  cfiStr = 'epubcfi(/6/4[chap01ref]!/2/4[body01]/16[svgimg]:1)';
  var cfi = new CFI(cfiStr);
  var a = [
    { node: opfDOM.getElementById('chap01ref')},
    { node: htmlDOM.getElementById('svgimg'), offset: 1}
  ];
  var c = CFI.generate(a);
  
  t.equal(c, cfiStr, "Calling generator with array");
 
});
