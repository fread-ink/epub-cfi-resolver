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
    cfi: "epubcfi(/6/14[cha!/p05ref]!/4[bo!/dy01]/10/2/1[foo]:5:3[don't!/ panic;s=b]~3.4@1:2)",
    parsed: [
      [
        {
          "nodeIndex": 6
        },
        {
          "nodeIndex": 14,
          "nodeID": "cha!/p05ref"
        }
      ],
      [
        {
          "nodeIndex": 4,
          "nodeID": "bo!/dy01"
        },
        {
          "nodeIndex": 10
        },
        {
          "nodeIndex": 2
        },
        {
          "nodeIndex": 1,
          "nodeID": "foo",
          "offset": 3,
          "location": "don't!/ panic",
          "sideBias": "before",
          "temporal": 3.4,
          "spatial": {
            "from": 1,
            "to": 2
          }
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
  }, {
    cfi: "epubcfi(/6/4[chap01ref]!/4[body01]/10[para05]/3:5)",
    resolvedURI: "chapter01.xhtml",
    resolved: {
      "node": "0123456789",
      "offset": 5
    },
    opts: {
      ignoreIDs: true
    }
  }
];

var testCount = 0;
for(let test of tests) {
  if(test.parsed) testCount++;
  if(test.resolvedURI) testCount++;
  if(test.resolved) testCount++;
}
console.log("COUNT:", testCount);
  
const opfDOM = parseDOM(docs.opf, 'application/xhtml+xml');
const htmlDOM = parseDOM(docs.html, 'application/xhtml+xml');

tape('Simple tests', function(t) {
  
  t.plan(testCount);

  var uri, bookmark;
  for(let test of tests) {

    try {
      var cfi = new CFI(test.cfi);
      
      if(debug) console.log("parsed:", JSON.stringify(cfi.parts, null, 2));

      if(test.parsed) {
        t.deepEqual(cfi.parts, test.parsed);
      }

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
