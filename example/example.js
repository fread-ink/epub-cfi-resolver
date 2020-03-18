'use strict';

var CFI = require('../index.js');

var docs = require('../test_data/from_spec.js');
//var docs = require('../test_data/no_whitespace.js');
//var docs = require('../test_data/cdata.js');

var rangeCFI = "epubcfi(/6/4[chap01ref]!/4[body01]/10[para05],/3:2,/3:8)";

var preTest = "epubcfi(/1/2:3[pre,post)";

var cfi = new CFI(rangeCFI);
var parts = cfi.get();


for(let part of cfi.parts) {
  console.log("part:");
  for(let subpart of part) {
    console.log("  subpart:", subpart);
  }
}
if(cfi.from) {
  console.log("from part:");
  for(let subpart of cfi.from) {
    console.log("  subpart:", subpart);
  }
//  console.log(JSON.stringify(cfi.get().from, null, 2));
}

if(cfi.to) {
  console.log("to part:");
  for(let subpart of cfi.to) {
    console.log("  subpart:", subpart);
  }
//  console.log(JSON.stringify(cfi.get().to, null, 2));
}


function parseDOM(str, mimetype) {
  var parser = new DOMParser();
  return parser.parseFromString(str, mimetype);
}


var cfi = new CFI(rangeCFI);

var opfDOM = parseDOM(docs.opf, 'text/xml');

var uri = cfi.resolveURI(0, opfDOM, {
  ignoreIDs: false
});

console.log("uri:", uri);

var chap1DOM = parseDOM(docs.html, 'application/xhtml+xml');

var bookmark = cfi.resolveLast(chap1DOM, {
  ignoreIDs: true
});

console.log("bookmark:", bookmark);

var el = chap1DOM.querySelector('#para05').lastChild;

var c = CFI.generate(el, 0);
console.log("Generated:", c);

cfi = new CFI(c);

bookmark = cfi.resolveLast(chap1DOM, {
  ignoreIDs: true
});

console.log("Resolved from generated:", bookmark, bookmark.node, bookmark.node.previousSibling);

const a = new CFI("epubcfi(/1/4/4~5)").get()[0];
const b = new CFI("epubcfi(/1/2/4~2.3)").get()[0];

console.log("Diff:", CFI.compareParts(a, b));

async function testAutomaticParsing() {

  var testCFI = "epubcfi(/6/4[chap01ref]!/4[body01]/10[para05]/3:5[;s=a])";
  
  cfi = new CFI(testCFI);

  var loc = await cfi.resolve('test.opf');
  
  console.log("Resolved:", loc, loc.node, loc.node.textContent);

}

testAutomaticParsing()
