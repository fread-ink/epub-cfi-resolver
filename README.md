A simple parser and resolver for the [EPUB-CFI](http://idpf.org/epub/linking/cfi/epub-cfi.html) format.

This is meant to run in the browser but should work anywhere `DOMParser` is present.

# Usage

To install:

```
npm install epub-cfi-resolver
```

Remember to unescape the URI first, then:

```
var CFI = require('CFI');

var cfi = new CFI('epubcfi(/1/2!/1/2/3:4'); // parsing
console.log(cfi.parts); // print parsed data
```

To resolve the CFI, assuming `doc` contains a `Document` or `XMLDocument` object for the starting document:

```
// Use first part of CFI to resolve URI for the second part
var uri = cfi.resolveURI(0, doc);

// Call some function to fetch document for second part of CFI then parse it
var data = fetch(uri);

var parser = new DOMParser();
var doc2 = parser.parseFromString(data, 'text/html');

// Resolve final part of CFI to a bookmark
var bookmark = cfi.resolve(doc2);

// bookmark contains:
{
  node: <reference to html node in doc2>,
  offset: 4
}
```

You can then use e.g. `bookmark.node.scrollTo()` or some other method to show the location referenced by the CFI.

## Parser output

Given this CFI:

```
epubcfi(/1/2[node-id]!/3/4:5[pre,post;s=b]~3.14@4:2)
```

The parser will output:

```
[
  [
    {
      "nodeIndex": 1
    },
    {
      "nodeIndex": 2,
      "nodeID": "node-id"
    }
  ],
  [
    {
      "nodeIndex": 3
    },
    {
      "nodeIndex": 4,
      "offset": 5,
      "textLocationAssertion": {
        "pre": "pre",
        "post": "post"
      }
      "sideBias": "before",
      "temporal": 3.14,
      "spatial": {
        "from": 4,
        "to": 2
      }
    }
  ]
]
```

# Resolver output

The resolve will output an object with a `.node` containing a reference to the node pointed to by the CFI and any additional properties from the parser relevant to position _within_ the node, e.g. `.offset`. See previous section for all possible properties.

Lastly, the property `.relativeToNode` will be present if the CFI location was _before_ or _after_ a node (rather than _at_ or _inside_ a node). `.relativeToNode` can have the values "before" or "after".

# Example

To build the example:

```
npm run build
```

Then open `example/example.html` in a browser.

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

# Supported features

## Parser

Supported:

* Step Reference to Child Element or Character Data (/)
* XML ID Assertion ([)
* Step Indirection (!)
* Character Offset (:)
* Temporal Offset (~)
* Spatial Offset (@)
* Temporal-Spatial Offset (~ + @)
* Text Location Assertion ([)
* Side Bias ([ + ;s=)

Not supported:

* XML/HTML entitites
* Simple Ranges
* Sorting CFIs

Current XML/HTML entitites are not decoded. This can result in the offset into text nodes being offset by some amount in some rare edge cases.

Simple Ranges are not fully supported. They are parsed as the beginning location of the range. That is, for triples like <prefix>,<range-start>,<range-end> they are parsed as <prefix><range-start>.

Sorting CFIs, which is the same as computing their relative locations, is defined by the official spec but does not seem like a terribly useful feature. When do you ever have the need to sort a set of links by how deeply into a target document they link?

## Resolver

The resolver only finds the relevant node and hands off any relevant information from the parser (e.g. offset into a text node). Currently the resolver prefers node ID over child index number when locating nodes (if both are present) and completely ignores Text Location Assertions in favor of the offset number. Honestly it seems unclear what to do if Text Location Assertion fails. Should we scan forward and backward through the text to find matching text? If so, how far? What if the assertion isn't a unique occurrence in the text? The only simple action to take is to throw an error, but that would mean that the user clicks a link and either nothing happens or they get an error. Isn't it better that the link takes them somewhere that's probably close to where they expect to go?

# About EPUB-CFI

A [CFI](http://idpf.org/epub/linking/cfi/epub-cfi.html), or Canonical Fragment Identifier, is like a more complicated `#anchor` as used in HTML `href=` attributes. Think of them as ebook bookmarks.

CFIs allow specifying a precise location or range inside any XML/XHTML/HTML document by specifying how to traverse the document tree, e.g:

```
epubcfi(/6/7:42)
```

The above CFI specifies the 42nd character of the 7th child node of the 6th child node of the root node. These can be embellished with additional info e.g:

```
epubcfi(/6[foo]/7:42[don't panic])
```

This lets us know that the `id=` of the 6th child is "foo" and the text at the 42nd character is "don't panic".

Additionally, CFIs can traverse multiple documents, e.g:

```
epubcfi(/1/2!/6[foo]/7:42[don't panic])
```

The `!` marks the beginning of a new document so this CFI tells us to go to the 2nd child node of the 1st child node of the current document, then look for an attribute in that node that references another document (e.g. `href=`) and continue resolving the rest of the CFI in the referenced document.

# ToDo

* Implement proper parsing of Simple Ranges
* Correct offsets using Text Location Assertions when possible
* Support built-in entitry replacement, e.g. using [this npm module](https://www.npmjs.com/package/entities)
* Support [custom entity replacement](https://www.w3.org/TR/2008/REC-xml-20081126/#intern-replacement)
* Implement CFI generator
* Unit tests for bad data / stuff that should fail

# Other similar projects

## [readium-cfi-js](https://github.com/readium/readium-cfi-js)

Pros of using this project over readium-cfi-js:

* ~13 kB vs. ~400 kB dist file (both numbers for un-minified js)
* Documented usage and example code vs. no documentation on usage
* No dependencies vs. depends on jquery and lodash
* Works with node.js vs. requires browser

Pros of using readium-cfi-js over this project:

* Supports all features fully vs. supports most features
* Older more mature project vs. newer unproven codebase
* Includes ability to generate CFIs from node references and offsets
* Has more unit tests

Other differences. This project vs. readium-cfi-js:

* AGPLv3 vs. BSD-3-Clause
* Hand-written state machine vs. uses a parser generator (pegjs)
* Not so strict parsing/resolving vs. strict parsing/resolving

# [epubcfi from epub.js](https://github.com/futurepress/epub.js/blob/master/src/epubcfi.js)

Just from a quick glance at the code it's clear that this implementation will fail in several likely real work scenarios since it uses simple `.split()` calls on characters that can have several meanings depending on where they appear, e.g. '!' and '/' can appear in element `id=` attributes as well as Text Location Assertions but this is not taken into account, neither is the '^' escape character handled at all.

# License and copyright

*License: AGPLv3
*Copyright 2020 Marc Juul Christoffersen 


