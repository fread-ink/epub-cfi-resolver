'use strict';

const debug = false; // Enable debug output?

var tape = require('tape');

var CFI = require('../index.js');

// Allow these tests to run outside of browser
var JSDOM = require('jsdom').JSDOM;
function parseDOM(str, mimetype) {
  return new JSDOM(str, {
    contentType: mimetype
  }).window.document;
}

var docs = require('../test_data/from_spec.js');

var tests = [
  {
    cfi: "epubcfi(/1/2)",
    parsed: [
      [
        {
          "nodeIndex": 1
        },
        {
          "nodeIndex": 2
        }
      ]
    ]
  }, {
    cfi: "epubcfi(/6/4[chap01ref]!/4[body01]/10[para05]/3:5)",
    parsed: [
      [
        {
          "nodeIndex": 6
        },
        {
          "nodeIndex": 4,
          "nodeID": "chap01ref"
        }
      ],
      [
        {
          "nodeIndex": 4,
          "nodeID": "body01"
        },
        {
          "nodeIndex": 10,
          "nodeID": "para05"
        },
        {
          "nodeIndex": 3,
          "offset": 5
        }
      ]
    ],
    resolvedURI: "chapter01.xhtml",
    resolved: {
      "node": "0123456789",
      "offset": 5
    },
    opts: {}
  }
];

var testCount = 0;
for(let test of tests) {
  if(test.parsed) testCount++;
  if(test.resolvedURI) testCount++;
  if(test.resolved) testCount++;
}

const opfDOM = parseDOM(docs.opf, 'application/xhtml+xml');
const htmlDOM = parseDOM(docs.html, 'application/xhtml+xml');

tape('Simple tests', function(t) {
  
  t.plan(testCount);

  var uri, bookmark;
  for(let test of tests) {
    if(!test.parsed) continue;

    try {
      var cfi = new CFI(test.cfi);
      
      if(debug) console.log("parsed:", JSON.stringify(cfi.parts, null, 2));
      
      t.deepEqual(cfi.parts, test.parsed);

      if(test.resolvedURI) {

        uri = cfi.resolveURI(0, opfDOM);
        if(debug) console.log("resolvedURI:", uri);
        t.equal(uri, test.resolvedURI);
      }
      
      if(test.resolved) {

        bookmark = cfi.resolve(htmlDOM, test.opts);
        bookmark.node = bookmark.node.outerHTML || bookmark.node.textContent;
        if(debug) console.log("resolved:", JSON.stringify(bookmark, null, 2));
        t.deepEqual(bookmark, test.resolved);
      }

    } catch(err) {
      t.error(err);
    }

  }

});
