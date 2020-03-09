'use strict';

var CFI = require('../index.js');
var docs = require('../test_data/from_spec.js');

var testCFI2 = "epubcfi(/6/4[chap01ref]!/4[body01]/10[para05]/3:9[;s=a])";

var preTest = "epubcfi(/1/2:3[pre,post)";

var cfi = new CFI(testCFI2);
for(let part of cfi.parts) {
  console.log("part:");
  for(let subpart of part) {
    console.log("  subpart:", subpart);
  }
}


function parseDOM(str, mimetype) {
  var parser = new DOMParser();
  return parser.parseFromString(str, mimetype);
}


var cfi = new CFI(testCFI2);

var opfDOM = parseDOM(docs.opf, 'text/xml');

var uri = cfi.resolveURI(0, opfDOM, {
  ignoreIDs: false
});

console.log("uri:", uri);

var chap1DOM = parseDOM(docs.html, 'application/xhtml+xml');

var bookmark = cfi.resolve(chap1DOM, {
  ignoreIDs: true
});

console.log("bookmark:", bookmark);
console.log("text:", bookmark.node.textContent.slice(bookmark.offset));

