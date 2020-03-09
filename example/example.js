'use strict';

var CFI = require('../index.js');

var testCFI = "epubcfi(/6/4[chap01ref]!/4[body01]/10[para05]/3:10)";
var testCFI2 = "epubcfi(/6/4[chap01ref]!/4[body01]/10[para05]/3:9[;s=a])";

var ex1 = "epubcfi(/6/14[chap05ref]!/4[body01]/10/2/1:3[2^[1^]])";
var ex2 = "epubcfi(/6/14[chap05ref]!/4[body01]/10/2/1:5:3[don't panic;s=b]~3.4@1:2)";
var ex3 = "epubcfi(/6/14[chap05ref]!/4[body01]/10/2/1:5:3[;s=a]~3.4@1:2)";

var ex4 = "epubcfi(/6/14[chap05ref]!/4[body01]/10/2/1[foo]:5:3[don't panic;s=b]~3.4@1:2)";

var ex4 = "epubcfi(/6/14[cha!/p05ref]!/4[bo!/dy01]/10/2/1[foo]:5:3[don't!/ panic;s=b]~3.4@1:2)";

var ex5 = "epubcfi(/6/14[chap05ref]!/4[body01]/10/2/1[foo])";

const opf1 = `<?xml version="1.0"?>

<package version="2.0" 
         unique-identifier="bookid" 
         xmlns="http://www.idpf.org/2007/opf"
         xmlns:dc="http://purl.org/dc/elements/1.1/" 
         xmlns:opf="http://www.idpf.org/2007/opf">

    <metadata>
    	<dc:title>…</dc:title>
    	<dc:identifier id="bookid">…</dc:identifier>
    	<dc:creator>…</dc:creator>
      <dc:language>en</dc:language>
    </metadata>

    <manifest>
        <item id="toc"
              properties="nav"
              href="toc.xhtml" 
              media-type="application/xhtml+xml"/>
        <item id="titlepage" 
              href="titlepage.xhtml" 
              media-type="application/xhtml+xml"/>
        <item id="chapter01" 
              href="chapter01.xhtml" 
              media-type="application/xhtml+xml"/>
        <item id="chapter02" 
              href="chapter02.xhtml" 
              media-type="application/xhtml+xml"/>
        <item id="chapter03" 
              href="chapter03.xhtml" 
              media-type="application/xhtml+xml"/>
        <item id="chapter04" 
              href="chapter04.xhtml" 
              media-type="application/xhtml+xml"/>
    </manifest>

    <spine>
        <itemref id="titleref"  idref="titlepage"/>
        <itemref id="chap01ref" idref="chapter01"/>
        <itemref id="chap02ref" idref="chapter02"/>
        <itemref id="chap03ref" idref="chapter03"/>
        <itemref id="chap04ref" idref="chapter04"/>
    </spine>
</package>`;

const chap1 = `
<html xmlns="http://www.w3.org/1999/xhtml">
    <head>
    	<title>…</title>
    </head>

    <body id="body01">
    	<p>…</p>
    	<p>…</p>
    	<p>…</p>
    	<p>…</p>
        <p id="para05">xxx<em>yyy</em>0123456789</p>
    	<p>…</p>
    	<p>…</p>
    	<img id="svgimg" src="foo.svg" alt="…"/>
    	<p>…</p>
    	<p>…</p>
    </body>
</html>`;

/*
var cfi = new CFI(ex4);
for(let part of cfi.parts) {
  console.log("part:");
  for(let subpart of part) {
    console.log("  subpart:", subpart);
  }
}
*/


var cfi = new CFI(testCFI2);


var parser = new DOMParser();
var opfDOM = parser.parseFromString(opf1, 'text/xml');

var uri = cfi.resolveURI(0, opfDOM, {
  ignoreIDs: false
});

console.log("uri:", uri);

var chap1DOM = parser.parseFromString(chap1, 'application/xhtml+xml');

var bookmark = cfi.resolve(chap1DOM, {
  ignoreIDs: true
});

console.log("bookmark:", bookmark);
