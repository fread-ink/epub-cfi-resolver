'use strict';

class CFI {

  constructor(str) {
    this.cfi = str;
    const isCFI = new RegExp(/^epubcfi\((.*)\)$/);
    
    str = str.trim();
    var m = str.match(isCFI);
    if(!m) throw new Error("Not a valid CFI");
    if(m.length < 2) return; // Empty CFI

    str = m[1];
    
    this.parts = [];


    var parsed, offset, newDoc;
    var subParts = [];
    
    while(str.length) {
      ({parsed, offset, newDoc} = this.parse(str));
      if(offset === null) throw new Error("Parsing failed");
      
      subParts.push(parsed);
      
      if(newDoc || str.length - offset <= 0) {
        this.parts.push(subParts);
        subParts = [];
      }
      
      str = str.slice(offset);
    }
  }
    
  parseSideBias(o, loc) {
    if(!loc) return;
    const m = loc.trim().match(/^(.*);s=([ba])$/);
    if(!m || m.length < 3) {
      o.location = loc;
      return;
    }
    if(m[1]) {
      o.location = m[1];
    }
    
    if(m[2] === 'a') {
      o.sideBias = 'after';
    } else {
      o.sideBias = 'before';
    }
  }
  
  parseSpatialRange(range) {
    if(!range) return undefined;
    const m = range.trim().match(/^([\d\.]+):([\d\.]+)$/);
    if(!m || m.length < 3) return undefined;
    const o = {
      from: parseInt(m[1]),
      to: parseInt(m[2]),
    };
    if(typeof o.from !== 'number' || typeof o.to !== 'number') {
      return undefined;
    }
    return o;
  }
  
  // Parse a field that specifies a location within a node
  // using e.g. :42 for offset or :42[don't panic]
  // Parses spatial and temporal offset as well (though we don't use them)
  // TODO parse Side Bias, e.g: :42[;s=b] or :42[foobar;s=a]
  parse(loc) {
    var o = {};
    const isNumber = new RegExp(/[\d]/);
    var f;
    var state;
    var prevState;
    var cur, escape;
    var seenColon;
    var seenSlash = false;
    var i;
    for(i=0; i <= loc.length; i++) {
      if(i < loc.length) {
        cur = loc[i];
      } else {
        cur = '';
      }
      if(cur === '^' && !escape) {
        escape = true;
        continue;
      }

      if(state === '/') {
        if(cur.match(isNumber)) {
          if(!f) {
            f = cur;
          } else {
            f += cur;
          }
          escape = false;
          continue;
        } else {
          if(f) {
            o.nodeIndex = parseInt(f);
            f = null;
          }
          prevState = state;
          state = null;
        }
      }
      
      if(state === ':') {
        if(cur.match(isNumber)) {
          if(!f) {
            f = cur;
          } else {
            f += cur;
          }
          escape = false;
          continue;
        } else {
          if(f) {
            o.offset = parseInt(f);
            f = null;
          }
          prevState = state;
          state = null;
        }
      }

      // ignore spatial offsets
      if(state === '@') {
        let done = false;
        if(cur.match(isNumber) || cur === '.' || cur === ':') {
          if(cur === ':') {
            if(!seenColon) {
              seenColon = true;
            } else {
              done = true;
            }
          }
        } else {
          done = true;
        }
        if(!done) {
          if(!f) {
            f = cur;
          } else {
            f += cur;
          }
          escape = false;
          continue;
        } else {
          prevState = state;
          state = null;
          if(f && seenColon) o.spatial = this.parseSpatialRange(f);
          f = null;
        }
      }
      
      // ignore temporal offsets
      if(state === '~' ) {
        if(cur.match(isNumber) || cur === '.') {
          if(!f) {
            f = cur;
          } else {
            f += cur;
          }
          escape = false;
          continue;
        } else {
          if(f) {
            o.temporal = parseFloat(f);
          }
          prevState = state;
          state = null;
          f = null;
        }
      }
      
      if(!state) {
        if(cur === '!') {
          i++;
          state = cur;
          break;
        }
        
        if(cur === '/') {
          if(seenSlash) {
            break;
          } else {
            seenSlash = true;
            prevState = state;
            state = cur;
            escape = false;
            continue;
          }
        }
        
        if(cur === ':' || cur === '~' || cur === '@') {
          prevState = state;
          state = cur;
          escape = false;
          seenColon = false; // only relevant for '@'
          continue;
        }        

        if(cur === '[' && !escape && prevState === ':') {
          prevState = state;
          state = '[';
          escape = false;
          continue;
        }

        if(cur === '[' && !escape && prevState === '/') {
          prevState = state;
          state = 'nodeID';
          escape = false;
          continue;
        }
      }

      if(state === '[') {
        if(cur === ']' && !escape) {
          prevState = state;
          state = null;
          this.parseSideBias(o, f);
          f = null;
        } else {
          if(!f) {
            f = cur;
          } else {
            f += cur;
          }
        }
        escape = false;
        continue;
      }

      if(state === 'nodeID') {
        if(cur === ']' && !escape) {
          prevState = state;
          state = null;
          o.nodeID = f;
          f = null;
        } else {
          if(!f) {
            f = cur;
          } else {
            f += cur;
          }
        }
        escape = false;
        continue;
      }
      
      escape = false;
    }
    
    if(!o.nodeIndex) throw new Error("Missing child node index in CFI");
    
    return {parsed: o, offset: i, newDoc: (state === '!')};
  }

  resolveNode(index, dom, opts) {
    opts = opts || {};
    if(!dom) throw new Error("Missing DOM argument");

    const subparts = this.parts[index];
    if(!subparts) throw new Error("Missing CFI part for index: " + index);
    
    // Traverse backwards until a subpart with a valid ID is found
    // or the first subpart is reached
    var node;
    if(index === 0) {
      node = dom.querySelector('package');
    } else {
      for(let n of dom.childNodes) {
        if(n.nodeType === Node.ELEMENT_NODE) {
          node = n;
          break;
        }
      }
    }
    if(!node) throw new Error("Document incompatible with CFIs");
    
    var startFrom = 0;
    var i, subpart;
    for(i=subparts.length-1; i >=0; i--) {
      subpart = subparts[i];
      if(!opts.ignoreIDs && subpart.nodeID && (node = dom.getElementById(subpart.nodeID))) {
        startFrom = i + 1;
        break;
      }
    }
    var nodeIndex;
    
    for(i=startFrom; i < subparts.length; i++) {
      subpart = subparts[i];
      nodeIndex = subpart.nodeIndex - 1;
      if(nodeIndex < 0) {
        nodeIndex = 0;
      } else if(nodeIndex > node.childNodes.length - 1) {
        nodeIndex = node.childNodes.length - 1;
      }
      node = node.childNodes[nodeIndex];
      
      if(!node) throw new Error("CFI did not match any nodes in this document");
    }
    return node;
  }
  
  // Each part of a CFI (as separated by '!')
  // references a separate HTML/XHTML/XML document.
  // This function takes an index specifying the part
  // of the CFI and the appropriate Document or XMLDocument
  // that is referenced by the specified part of the CFI
  // and returns the URI for the document referenced by
  // the next part of the CFI
  // If the opt `ignoreIDs` is true then IDs
  // will not be used while resolving
  resolveURI(index, dom, opts) {
    opts = opts || {};
    if(index < 0 || index > this.parts.length - 2) {
      throw new Error("index is out of bounds");
    }

    var node = this.resolveNode(index, dom, opts);

    const tagName = node.tagName.toLowerCase();
    if(tagName === 'itemref'
       && node.parentNode.tagName.toLowerCase() === 'spine') {
      const idref = node.getAttribute('idref');
      if(!idref) throw new Error("Referenced node had not 'idref' attribute");
      node = dom.getElementById(idref);
      if(!node) throw new Error("Specified node is missing from manifest");
      const href = node.getAttribute('href');
      if(!href) throw new Error("Manifest item is missing href attribute");
      
      return href;
    }

    if(tagName === 'iframe' || tagName === 'embed') {
      const src = node.getAttribute('src');
      if(!src) throw new Error(tagName + " element is missing 'src' attribute");
      return src;
    }

    if(tagName === 'object') {
      const data = node.getAttribute('data');
      if(!data) throw new Error(tagName + " element is missing 'data' attribute");
      return data;
    }

    if(tagName === 'image'|| tagName === 'use') {
      const href = node.getAttribute('xlink:href');
      if(!href) throw new Error(tagName + " element is missing 'xlink:href' attribute");
      return href;
    }
    
  }

  // Takes the Document or XMLDocument for the final
  // document referenced by the CFI
  // and returns the node and offset into that node
  resolve(dom, opts) {
    var o = {};
    const index = this.parts.length - 1;
    const subparts = this.parts[index];
    var node = this.resolveNode(index, dom, opts);
    o.node = node;
    const lastpart = subparts[subparts.length - 1];

    if(lastpart.offset) {
      o.offset = lastpart.offset;
    }

    if(lastpart.sideBias) {
      o.sideBias = lastpart.sideBias;
    }
    return o;
  }
}

module.exports = CFI;


