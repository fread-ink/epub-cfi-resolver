'use strict';

// If using node.js
if(typeof Node === 'undefined') {
  var ELEMENT_NODE = 1;
  var TEXT_NODE = 3;
  var CDATA_SECTION_NODE = 4;
} else { // In the browser
  var ELEMENT_NODE = Node.ELEMENT_NODE;
  var TEXT_NODE = Node.TEXT_NODE;
  var CDATA_SECTION_NODE = Node.CDATA_SECTION_NODE;
}

function cfiEscape(str) {
  // TODO implement
  return str;
}

class CFI {

  constructor(str, opts) {
    this.opts = Object.assign({
      // If CFI is a Simple Range, pretend it isn't
      // by parsing only the start of the range
      flattenRange: false 
    }, opts || {});
    
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
    var sawComma = 0;
    while(str.length) {
      ({parsed, offset, newDoc} = this.parse(str));
      if(!parsed || offset === null) throw new Error("Parsing failed");
      if(sawComma && newDoc) throw new Error("CFI is a range that spans multiple documents. This is not allowed");
      
      subParts.push(parsed);

      // Handle end of string
      if(newDoc || str.length - offset <= 0) {
        // Handle end if this was a range
        if(sawComma === 2) {
          this.to = subParts;
        } else { // not a range
          this.parts.push(subParts);
        }
        subParts = [];
      }
      
      str = str.slice(offset);
      
      // Handle Simple Ranges
      if(str[0] === ',') {
        if(sawComma === 0) {
          if(subParts.length) {
            this.parts.push(subParts);
          }
          subParts = [];
        } else if(sawComma === 1) {
          if(subParts.length) {
            this.from = subParts;
          }
          subParts = [];
        }
        str = str.slice(1);
        sawComma++;
      }
    }
    if(this.from && this.from.length) {
      if(this.opts.flattenRange || !this.to || !this.to.length) {
        this.parts = this.parts.concat(this.from);
        delete this.from;
        delete this.to;
        return;
      }
      this.isRange = true;
    }
  }
  
  // TODO complete this
  static generate(node, offset, extra) {

    var cfi = '';
    var id = node.id;
    var childCount = 1;
    while(true) {
      
      if(node.previousSibling) {
        // TODO fix counts so they follow the CFI standard
        node = node.previousSibling;
        childCount++;
      } else if(node.parentNode) {
        // TODO cfiEscape currently does nothing
        cfi = '/'+childCount+((id) ? '['+cfiEscape(id)+']' : '') + cfi;
        id = null;
        childCount = 1;
        node = node.parentNode;
      } else {
        break;
      }
    }
    // TODO recalculate offset to account for multiple adjacent text nodes
    if(offset) {
      cfi = cfi + ':'+offset;
    }
    if(extra) {
      cfi = cfi + extra;
    }
    
    return 'epubcfi('+cfi+')';
  }
  
  decodeEntities(dom, str) {
    try {
      const el = dom.createElement('textarea');
      el.innerHTML = str;
      return el.value
    } catch(err) {
      // TODO fall back to simpler decode?
      // e.g. regex match for stuff like &#160; and &nbsp;
      return str; 
    }
  }
  
  // decode HTML/XML entities and compute length
  trueLength(dom, str) {
    return this.decodeEntities(dom, str);
  }
  
  getFrom() {
    if(!this.isRange) throw new Error("Trying to get beginning of non-range CFI");
    if(!this.from) {
      return this.deepClone(this.parts);
    }
    const parts = this.deepClone(this.parts);
    parts[parts.length-1] = parts[parts.length-1].concat(this.from);
    return parts;
  }

  getTo()  {
    if(!this.isRange) throw new Error("Trying to get end of non-range CFI");
    const parts = this.deepClone(this.parts);
    parts[parts.length-1] = parts[parts.length-1].concat(this.to);
    return parts
  }
  
  get() {
    if(this.isRange) {
      return {
        from: this.getFrom(),
        to: this.getTo(),
        isRange: true
      };
    }
    return this.deepClone(this.parts);
  }
  
  parseSideBias(o, loc) {
    if(!loc) return;
    const m = loc.trim().match(/^(.*);s=([ba])$/);
    if(!m || m.length < 3) {
      if(typeof o.textLocationAssertion === 'object') {
        o.textLocationAssertion.post = loc;
      } else {
        o.textLocationAssertion = loc;
      }
      return;
    }
    if(m[1]) {
      if(typeof o.textLocationAssertion === 'object') {
        o.textLocationAssertion.post = m[1];
      } else {
        o.textLocationAssertion = m[1];
      }
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
  
  parse(cfi) {
    var o = {};
    const isNumber = new RegExp(/[\d]/);
    var f;
    var state;
    var prevState;
    var cur, escape;
    var seenColon = false;
    var seenSlash = false;
    var i;
    for(i=0; i <= cfi.length; i++) {
      if(i < cfi.length) {
        cur = cfi[i];
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

        if(cur === ',') {
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
        } else if(cur === ',' && !escape) {
          o.textLocationAssertion = {};
          if(f) {
            o.textLocationAssertion.pre = f;
          }
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
    
    if(!o.nodeIndex && o.nodeIndex !== 0) throw new Error("Missing child node index in CFI");
    
    return {parsed: o, offset: i, newDoc: (state === '!')};
  }

  // The CFI counts child nodes differently from the DOM
  getChildNodeByCFIIndex(dom, parentNode, index, offset) {
    const children = parentNode.childNodes;
    if(!children.length) return {node: parentNode, offset: 0};

    // index is pointing to the virtual node before the first node
    // as defined in the CFI spec
    if(index <= 0) {
      return {node: children[0], relativeToNode: 'before', offset: 0}
    }
      
    var cfiCount = 0;
    var lastChild;
    var i, child;
    for(i=0; i < children.length; i++) {
      child = children[i];
      switch(child.nodeType) {
      case ELEMENT_NODE:

        // If the previous node was also an element node
        // then we have to pretend there was a text node in between
        // the current and previous nodes (according to the CFI spec)
        // so we increment cfiCount by two
        if(cfiCount % 2 === 0) {
          cfiCount += 2;
          if(cfiCount >= index) {
            return {node: child, offset: 0}
          }
        } else { // Previous node was a text node
          cfiCount += 1;
          if(cfiCount === index) {
            return {node: child, offset: 0}

            // This happens when offset into the previous text node was greater
            // than the number of characters in that text node
            // So we return a position at the end of the previous text node
          } else if(cfiCount > index) {
            if(!lastChild) {
              return {node: parentNode, offset: 0};
            }
            return {node: lastChild, offset: this.trueLength(dom, lastChild.textContent)};
          }
        }
        lastChild = child;
        break;
      case TEXT_NODE:
      case CDATA_SECTION_NODE:
        // If this is the first node or the previous node was an element node
        if(cfiCount === 0 || cfiCount % 2 === 0) {
          cfiCount += 1;
        } else {
          // If previous node was a text node then they should be combined
          // so we count them as one, meaning we don't increment the count
        }

        if(cfiCount === index) {
          // If offset is greater than the length of the current text node
          // then we assume that the next node will also be a text node
          // and that we'll be combining them with the current node
          let trueLength = this.trueLength(dom, child.textContent);
          if(offset >= trueLength) {
            offset -= trueLength;
          } else {
            return {node: child, offset: offset}
          }
        }
        lastChild = child;
        break;
      default:
        continue
      }
    }

    // index is pointing to the virtual node after the last child
    // as defined in the CFI spec
    if(index > cfiCount) {
      var o = {relativeToNode: 'after', offset: 0};
      if(!lastChild) {
        o.node = parentNode;
      } else {
        o.node = lastChild;
      }
      if(this.isTextNode(o.node)) {
        o.offset = this.trueLength(dom, o.node.textContent.length);
      }
      return o;
    }  
  }

  isTextNode(node) {
    if(!node) return false;
    if(node.nodeType === TEXT_NODE || node.nodeType === CDATA_SECTION_NODE) {
      return true;
    }
    return false;
  }
    
  // Use a Text Location Assertion to correct and offset
  correctOffset(dom, node, offset, assertion) {
    var curNode = node;

    if(typeof assertion === 'string') {
      var matchStr = this.decodeEntities(dom, assertion);
    } else {
      assertion.pre = this.decodeEntities(dom, assertion.pre);
      assertion.post = this.decodeEntities(dom, assertion.post);
      var matchStr = assertion.pre + '.' + assertion.post;
    }

    if(!(this.isTextNode(node))) {
      return {node, offset: 0};
    }
    
    while(this.isTextNode(curNode.previousSibling)) {
      curNode = curNode.previousSibling;
    }

    const startNode = curNode;
    var str;
    const nodeLengths = [];
    var txt = '';
    var i = 0;
    while(this.isTextNode(curNode)) {

      str = this.decodeEntities(dom, curNode.textContent);
      nodeLengths[i] = str.length;
      txt += str;
      
      if(!curNode.nextSibling) break;
      curNode = curNode.nextSibling;
      i++;
    }

    const m = txt.match(new RegExp(matchStr));
    if(!m) return {node, offset};
    var newOffset = m.index;
    
    if(assertion.pre) {
      newOffset += assertion.pre.length;
    }
    if(curNode === node && newOffset === offset) {
      return {node, offset};
    }

    i = 0;
    curNode = startNode;
    while(newOffset >= nodeLengths[i]) {

      newOffset -= nodeLengths[i];
      if(newOffset < 0) return {node, offset}

      if(!curNode.nextSibling || i+1 >= nodeOffsets.length) return {node, offset}
      i++;
      curNode = curNode.nextSibling;
    }

    return {node: curNode, offset: newOffset};
  }
  
  resolveNode(index, subparts, dom, opts) {
    opts = Object.assign({}, opts || {});
    if(!dom) throw new Error("Missing DOM argument");
    
    // Traverse backwards until a subpart with a valid ID is found
    // or the first subpart is reached
    var startNode;
    if(index === 0) {
      startNode = dom.querySelector('package');
    }
    
    if(!startNode) {
      for(let n of dom.childNodes) {
        if(n.nodeType === ELEMENT_NODE) {
          startNode = n;
          break;
        }
      }
    }
    if(!startNode) throw new Error("Document incompatible with CFIs");

    var node = startNode;
    var startFrom = 0;
    var i, subpart;
    for(i=subparts.length-1; i >=0; i--) {
      subpart = subparts[i];
      if(!opts.ignoreIDs && subpart.nodeID && (node = dom.getElementById(subpart.nodeID))) {
        startFrom = i + 1;
        break;
      }
    }

    if(!node) {
      node = startNode;
    }
    
    var o = {node, offset: 0};
    
    var nodeIndex;
    for(i=startFrom; i < subparts.length; i++) {
      subpart = subparts[i];

      o = this.getChildNodeByCFIIndex(dom, o.node, subpart.nodeIndex, subpart.offset);

      if(subpart.textLocationAssertion) {
        o = this.correctOffset(dom, o.node, subpart.offset, subpart.textLocationAssertion);
      }
    }
    
    return o;
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

    const subparts = this.parts[index];
    if(!subparts) throw new Error("Missing CFI part for index: " + index);
    
    var o = this.resolveNode(index, subparts, dom, opts);
    var node = o.node;

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

    throw new Error("No URI found");
  }

  deepClone(o) {
    return JSON.parse(JSON.stringify(o));
  }

  resolveLocation(dom, parts) {
    const index = parts.length - 1;
    const subparts = parts[index];
    if(!subparts) throw new Error("Missing CFI part for index: " + index);

    var o = this.resolveNode(index, subparts, dom);
    
    var lastpart = this.deepClone(subparts[subparts.length - 1]);
    
    delete lastpart.nodeIndex;
    if(!lastpart.offset) delete o.offset;
    
    Object.assign(lastpart, o);
    
    return lastpart;    
  }
  
  // Takes the Document or XMLDocument for the final
  // document referenced by the CFI
  // and returns the node and offset into that node
  resolve(dom, opts) {
    opts = Object.assign({
      // If true, return a proper DOM Range object
      // TODO implement
      range: false
    }, opts || {});
    
    if(!this.isRange) {
      return this.resolveLocation(dom, this.parts);
    }

    if(opts.range) {
      const range = dom.createRange();
      const from = this.getFrom();
      if(from.relativeToNode === 'before') {
        range.setStartBefore(from.node, from.offset)
      } else if(from.relativeToNode === 'after') {
        range.setStartAfter(from.node, from.offset)
      } else {
        range.setStart(from.node, from.offset);
      }

      const to = this.getTo();
      if(to.relativeToNode === 'before') {
        range.setEndBefore(to.node, to.offset)
      } else if(to.relativeToNode === 'after') {
        range.setEndAfter(to.node, to.offset)
      } else {
        range.setEnd(to.node, to.offset);
      }

      return range;
    }
    
    return {
      from: this.resolveLocation(dom, this.getFrom()),
      to: this.resolveLocation(dom, this.getTo()),
      isRange: true
    };
  }
}

module.exports = CFI;


