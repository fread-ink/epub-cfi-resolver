A simple parser, resolver and generator for the [EPUB-CFI](http://idpf.org/epub/linking/cfi/epub-cfi.html) format.

# Usage

To install:

```
npm install epub-cfi-resolver
```

Then:

```
var CFI = require('epub-cfi-resolver');

var testCFI = "epubcfi(/6/4[chap01ref]!/4[body01]/10[para05]/3:5)";

// Parse the CFI
cfi = new CFI(testCFI);

// Resolve the CFI
var bookmark = await cfi.resolve('test.xml');

// bookmark now contains:
{
  node: <reference to Node>,
  offset: 5 // integer offset into text
}
```

You can then use e.g. `scrollTo()` like so:

```
var range = document.createRange(node);
range.setStart(bookmark.node, bookmark.offset);
range.setEnd(bookmark.node, bookmark.offset + 1);

var bookmarkY = range.getBoundingClientRect().top + window.scrollY;
scrollTo(0, bookmarkY);
```

# API

## new CFI(uri, opts)

Parse the CFI string contained in `uri` and create a CFI object. An error will be thrown if parsing failes.

If `uri` contains URI Escape Sequences then it should be unescaped using e.g. `decodeURIComponent()` before being handed to the constructor. 

Opts:

* flattenRange: If true and CFI is a range, pretend it isn't by parsing only the start of the range and ignoring the end. Default is `false`. 

## .get()

Return a copy of the parsed data.

Given this CFI:

```
epubcfi(/2/4[node-id]!/6/7:5[pre,post;s=b])
```

The parser will output:

```
[
  [ // first part of CFI
    {
      "nodeIndex": 2
    },
    {
      "nodeIndex": 4,
      "nodeID": "node-id"
    }
  ],
  [ // part after first '!'
    {
      "nodeIndex": 6
    },
    {
      "nodeIndex": 7,
      "offset": 5,
      "textLocationAssertion": {
        "pre": "pre",
        "post": "post"
      }
      "sideBias": "before"
    }
  ]
]
```

Or an example with temporal and spatial coordinates:

```
epubcfi(/2/4~3.14@4:2)
```

outputs:

```
[
  [
    {
      "nodeIndex": 2
    },
    {
      "nodeIndex": 4,
      "temporal": 3.14,
      "spatial": {
        "x": 4,
        "y": 2
      }
    }
  ]
]
```

If the CFI is a Range then it will output:

```
{
  from: ...
  to: ...
  isRange: true
}
```

Where `from` and `to` each are objects with `nodeIndex` etc. like the one shown above.

If the CFI is a Range and `flattenRange: true` is given to the constructor then the output will be the location of the beginning of the range as normal non-range output.

## .resolveURI(index, doc)

Locate the node referenced by the specified part of the CFI where `index` refers to the part index from zero, e.g for the CFI `/2!/4!/6` an `index` of 1 refers to the `/4` part of the CFI.

`doc` is a `Document` or `XMLDocument` object. I the browser this could be `window.document`.

If the node pointed to by the specified part of the CFI refers to a URI in one of the ways allowed by the EPUB-CFI standard then that URI will be returned. If no URI is found then an error is thrown.

## .resolveLast(doc, opts)

Assuming that `doc` is a `Document` or `XMLDocument` object for the URI referenced by the last part of the CFI (e.g. for `/2!/4!/6` the last part is `/6), return an object referencing the node (or an 

If the CFI is not a range, the resolver will output an object like:

```
{
  node: <reference to node>,
  offset: <positive integer>
  ...
}
```
including any additional properties from the parser relevant to position _within_ the node, e.g. `.sideBias`. See section on `.get()`.

Note that the returned `offset` may be adjusted from the one given in the CFI. This is because the CFI standard specifies that adjacents text and CDATA nodes should be treated as single nodes and the resolver translates from the CFI way of counting to the one used by the DOM standard.

In addition, the property `.relativeToNode` will be present if the CFI location was _before_ or _after_ a node (rather than _at_ or _inside_ a node). `.relativeToNode` can have the values "before" or "after".

If the CFI is a range then the output will be:

```
{
  from: {
    node: ...
    offset: ...
    ...
  },
  to: {
    node: ...
    offset: ...
    ...
  },
  isRange: true
}
```

unless the option `range: true` is given, in which case the output will be a proper [Range](https://developer.mozilla.org/en-US/docs/Web/API/Range) object.

## async .resolve(uriOrDoc, [fetchCB], [opts])

Resolve an entire CFI, fetching and parsing URIs as they are encountered. If successful returns an object as documented for the `.resolveLast()` API call.

`uriOrDoc` is the initial URI or Document/XMLDocument object where parsing should begin.

`fetchCB` is an optional async function that takes a URI as its sole argument, retrieves the HTML/XHTML/XML at that URI, parses it into a Document/XMLDocument object and returns it. 

If `fetchCB` is not supplied, then a built in function will be used which relies on XMLHttpRequest. Note that this will not work if XMLHttpRequest is not available (e.g. in node.js) and instead an exception will be thrown.

## CFI.generate(node, offset, extra)

Static function to generate a CFI string for a `node` reference and optional `offset` into a text node. The offset will be adjusted to conform to the CFI specification if needed. If present the `extra` string will be appended at the end of the CFI before the closing bracket.

Also see alternate calling convention below

## CFI.generate(<array>, extra)

Same as CFI.generate(node, offset, extra) except takes an array of objects containing `{node: <nodeRef>, offset: <number>}` pairs and outputs a CFI that includes `!` indirection steps, assuming the array has more than one entry.

## CFI.sort(<array of CFI objects>)

Sort-in-place an array of CFI objects based on when they appear in the document.

Based on `CFI.compare()`. Note that this is based on parsing the CFI strings only. No resolving is done by `.sort()`.

## CFI.compare(a, b)

Static function that compares two CFI objects, e.g:

```
const a = new CFI("epubcfi(/2/4!/6)");
const b = new CFI("epubcfi(/2/4!/7)");

const diff = CFI.compare(a, b);
```

* If `a` comes first in the document then a value < 0 is returned
* If `b` comes first in the document then a value > 0 is returned
* If they are equal then 0 is returned

If only one CFI is a range only the beginning of the range is used for comparison. If both CFIs are ranges then first the beginnings are compared and if they are equal then the ends are compared.

## CFI.compareParts(a, b)

Static function that takes two parsed path parts and compares them, e.g:

```
const a = new CFI("epubcfi(/2/4/4~5)").get()[0];
const b = new CFI("epubcfi(/2/2/4~2.3)").get()[0];

const diff = CFI.compareParts(a, b);
```

Return values same as for `CFI.compare()`

# Example

To build the example:

```
npm run build
```

Then open `example/example.html` in a browser. It should be loaded through a web server, not from the filesystem.

# Using with node.js

For use with node.js, instead of using `DOMParser` and `.parseFromString()` you can use the [jsdom](https://www.npmjs.com/package/jsdom) library like so:

```
var JSDOM = require('jsdom').JSDOM;

var jsdom = new JSDOM(str, {
  contentType: mimetype
});

var doc = jsdom.window.document;
```

Where `mimetype` is one of 'application/xhtml+xml' (for XHTML and XML data) or 'text/html' (for HTML data). Note that 'text/xml' and 'application/xml' are not supported, just use 'application/xhtml+xml' instead which works for XML data.

The `doc` variable will contain a `Document` equivalent to the output from the browser's DOMParser `.parseFromString()` function.

# Unit tests

Run using: `npm run test`

# About EPUB-CFI

A [CFI](http://idpf.org/epub/linking/cfi/epub-cfi.html), or Canonical Fragment Identifier, is like a more complicated `#anchor` as used in HTML `href=` attributes. Think of them as ebook bookmarks. You'd encounter them like so:

```
<a href="some/uri#epubcfi(/6/7:42)">a link</a>
```

CFIs allow specifying a precise location or range inside any XML/XHTML/HTML document by specifying how to traverse the document tree, e.g:

```
epubcfi(/6/7:42)
```

The above CFI specifies the 42nd character of the 7th child node of the 6th child node of the root node. It's important to note that CFI doesn't count nodes in the same way as the DOM standard: Elements always have even numbers, Text and CDATA nodes always have odd numbers, adjacent text/CDATA nodes are combined and have the same number, two adjacent elements are assumed to have a text node of zero length between them and the node index 0 means "before the first node".

The above CFI can be embellished with additional info e.g:

```
epubcfi(/6[foo]/7:42[don't panic])
```

This lets us know that the `id=` of the 6th child node is "foo" and the text at the 42nd character is "don't panic".

Additionally, CFIs can traverse multiple documents, e.g:

```
epubcfi(/2/4!/6[foo]/7:42[don't panic])
```

The `!` marks the beginning of a new document so this CFI tells us to go to the 2nd child node of the 4th child node of the current document, then look for an attribute in that node that references another document (e.g. `href=`) and continue resolving the rest of the CFI in the referenced document.

CFIs can specify ranges using commas:

```
epubcfi(<common base path>,<from>,<to>)
```

which is useful for specifying highlighted text in an ebook.

# ToDo

* Add option for generator to generate Text Location Assertions
* Implement options (e.g. spatial and temporal) for generator
* Add unit tests for expected-to-fail data for resolver

# Other similar projects

## [readium-cfi-js](https://github.com/readium/readium-cfi-js)

Pros of using this project over readium-cfi-js:

* ~27 kB vs. ~400 kB dist file (both numbers are for un-minified js)
* Documented API and example code vs. no API nor usage docs
* No dependencies vs. depends on jquery and lodash
* Works with node.js vs. requires browser

Pros of using readium-cfi-js over this project:

* Older more mature project vs. newer unproven codebase
* Has more unit tests

Other differences. This project vs. readium-cfi-js:

* AGPLv3 vs. BSD-3-Clause
* Hand-written state machine vs. uses a parser generator (pegjs)
* Not so strict parsing/resolving vs. strict parsing/resolving

## [epubcfi from epub.js](https://github.com/futurepress/epub.js/blob/master/src/epubcfi.js)

Just from a quick glance at the code it's clear that this implementation will fail in several likely real world scenarios since it uses simple `.split()` calls on characters that can have several meanings depending on where they appear, e.g. '!' and '/' can appear in element `id=` attributes as well as Text Location Assertions but this is not taken into account.

# License and copyright

* Copyright 2020 Marc Juul Christoffersen 
* License: AGPLv3

See the `LICENSE` file for full license.


