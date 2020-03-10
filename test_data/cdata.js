'use strict';

// These documents are from:
// http://idpf.org/epub/linking/cfi/epub-cfi.html

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

    <![CDATA[
      foo
    ]]>

    <![CDATA[
      bar
    ]]>

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
        <p id="para05">xxx<em>yyy</em><![CDATA[0123]]>456789</p>
    	<p>…</p>
    	<p>…</p>
    	<img id="svgimg" src="foo.svg" alt="…"/>
    	<p>…</p>
    	<p>…</p>
    </body>
</html>`;

module.exports = {
  opf: opf1,
  html: chap1
};
