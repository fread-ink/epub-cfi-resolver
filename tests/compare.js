'use strict';

const debug = false; // Enable debug output?

var tape = require('tape');
var CFI = require('../index.js');

// Allow these tests to run outside of the browser
var JSDOM = require('jsdom').JSDOM;

const toCompare = [
  {
    a: "epubcfi(/2)",
    b: "epubcfi(/6)",
    result: -1
  },
  {
    a: "epubcfi(/2/4!/6)",
    b: "epubcfi(/2/4!/7)",
    result: -1
  },
  {
    a: "epubcfi(/2/4!/8)",
    b: "epubcfi(/2/4!/7)",
    result: 1
  },
  {
    a: "epubcfi(/2/4!/6[foo]/42!/12:100[lol])",
    b: "epubcfi(/2/4!/6[bar]/44!/12:100[cat])",
    result: -1
  },
  { // test that node IDs and Text Location Assertions have no influence
    a: "epubcfi(/2/4!/6[foo]/44!/12:100[lol])",
    b: "epubcfi(/2/4!/6[bar]/44!/12:100[cat])",
    result: 0
  },
  {
    a: "epubcfi(/2/4!/6[bar]/44!/12:100[cat])",
    b: "epubcfi(/2/4!/6[bar]/44!/12:100[cat])",
    result: 0
  },
  {
    a: "epubcfi(/2/4!/6[bar]/44!/12:100[hah])",
    b: "epubcfi(/2/4!/6[bar]/44!/12:200[cat])",
    result: -1
  },
  { // Temporal and spatial should be ignored on character (text/cdata) nodes 
    a: "epubcfi(/2/4!/6[bar]/44!/3~1.11@1:1)",
    b: "epubcfi(/2/4!/6[bar]/44!/3~2.22@2:2)",
    result: 0
  },
  { // Test spatial+temporal comparison
    a: "epubcfi(/2/4!/6[bar]/44!/4~1.11@1:1)",
    b: "epubcfi(/2/4!/6[bar]/44!/4~2.22@2:2)",
    result: -1
  },
  { // Test that spatial has precedence over temporal
    a: "epubcfi(/2/4!/6[bar]/44!/4~2.22@1:1)",
    b: "epubcfi(/2/4!/6[bar]/44!/4~1.11@2:2)",
    result: 1
  },
  { // Compare two identical ranges
    a: "epubcfi(/2/4,/6/8,/10/12)",
    b: "epubcfi(/2/4,/6/8,/10/12)",
    result: 0
  },
  { // Compare range with only beginning differing
    a: "epubcfi(/2/4,/6/7,/10/11)",
    b: "epubcfi(/2/4,/6/8,/10/12)",
    result: -1
  },
  { // Compare range with only first part differing
    a: "epubcfi(/2/2,/6/8,/10/12)",
    b: "epubcfi(/2/4,/6/8,/10/12)",
    result: -1
  },
  { // Compare range with only end differing
    a: "epubcfi(/2/4,/6/8,/10/13)",
    b: "epubcfi(/2/4,/6/8,/10/12)",
    result: 1
  },
  { // Compare range against non-range
    a: "epubcfi(/2/4,/6/8,/10/13)",
    b: "epubcfi(/2/4/6/7)",
    result: 1
  },
  { // Compare range against non-range
    a: "epubcfi(/2/4,/6/8,/10/13)",
    b: "epubcfi(/2/4/6/8)",
    result: 0
  }
];

tape('Compare', function(t) {

  t.plan(toCompare.length + 4);

  var i, test, res;
  for(i=0; i < toCompare.length; i++) {
    test = toCompare[i];

    if(debug) {
      console.log('Test:', i, JSON.stringify(test, null, 2));
    }

    res = CFI.compare(
      new CFI(test.a),
      new CFI(test.b)
    );
    if(res < 0) res = -1;
    if(res > 0) res = 1;
    
    t.equal(res, test.result, "Testing comparison of " + test.a + " and " + test.b);
  }

  const no0 = new CFI("epubcfi(/1)");
  const no1 = new CFI("epubcfi(/2/4!/6[bar]/44!/4:~1.11@1:1)");
  const no2 = new CFI("epubcfi(/2/4!/6[bar]/44!/4:~2.22@2:2)")
  const no3 = new CFI("epubcfi(/2/4/99)");
  
  var a = [no2, no1, no3, no0];

  CFI.sort(a);

  t.equal(a[0].cfi, no0.cfi, "Testing .sort() 0");
  t.equal(a[1].cfi, no1.cfi, "Testing .sort() 1");
  t.equal(a[2].cfi, no2.cfi, "Testing .sort() 2");
  t.equal(a[3].cfi, no3.cfi, "Testing .sort() 3");
 
});
