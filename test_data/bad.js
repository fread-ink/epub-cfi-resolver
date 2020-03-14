module.exports = `
<!DOCTYPE html>
<html>
  <head>
    <title></title>
  </head>

  <body>
   <div id="!/[],;">&160;<![CDATA[01!/23]]>&nbsp;<![CDATA[4567]]><div><!-- foo -->
     <span></span><!-- foo --><![CDATA[4567]]><span id="!/foo^[]"><![CDATA[4567]]>hello<!-- foo --> test

    end</span>
   </div></div>
  </body>
</html>`;
