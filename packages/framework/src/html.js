export class TemplateResult {
  constructor(strings, values) {
    this.strings = strings;
    this.values = values;
  }
}

export function html(strings, ...values) {
  return new TemplateResult(strings, values);
}

const cache = new WeakMap();

const ATTR_RE = /([^\s"'=<>/]+)\s*=\s*(["']?)([^"']*)$/;

function prepare(strings) {
  const hit = cache.get(strings);
  if (hit) return hit;

  let src = '';
  const kinds = [];

  for (let i = 0; i < strings.length; i++) {
    src += strings[i];
    if (i === strings.length - 1) break;

    const insideTag = src.lastIndexOf('<') > src.lastIndexOf('>');

    if (insideTag) {
      const m = ATTR_RE.exec(src);
      if (!m) throw new Error('Template алдаа: attribute-ийн нэр олдсонгүй');
      kinds[i] = { kind: 'attr', name: m[1] };
      src += m[2] ? `__b${i}__` : `"__b${i}__"`;
    } else {
      kinds[i] = { kind: 'node' };
      src += `<!--b${i}--><!--/b-->`;
    }
  }

  const template = document.createElement('template');
  template.innerHTML = src;

  const descriptors = [];
  const walker = document.createTreeWalker(
    template.content,
    NodeFilter.SHOW_ELEMENT | NodeFilter.SHOW_COMMENT
  );
  let nodeIndex = -1;

  while (walker.nextNode()) {
    nodeIndex++;
    const node = walker.currentNode;

    if (node.nodeType === Node.COMMENT_NODE) {
      const m = /^b(\d+)$/.exec(node.data);
      if (m) descriptors.push({ type: 'node', nodeIndex, index: Number(m[1]) });
      continue;
    }

    for (const attr of [...node.attributes]) {
      if (!attr.value.includes('__b')) continue;
      const statics = attr.value.split(/__b\d+__/);
      const indexes = [...attr.value.matchAll(/__b(\d+)__/g)].map((x) => Number(x[1]));
      const name = kinds[indexes[0]].name;
      node.removeAttribute(attr.name);

      const prefix = name[0];
      if (prefix === '@') descriptors.push({ type: 'event', nodeIndex, name: name.slice(1), index: indexes[0] });
      else if (prefix === '.') descriptors.push({ type: 'prop', nodeIndex, name: name.slice(1), index: indexes[0] });
      else if (prefix === '?') descriptors.push({ type: 'bool', nodeIndex, name: name.slice(1), index: indexes[0] });
      else descriptors.push({ type: 'attr', nodeIndex, name, statics, indexes });
    }
  }

  const prepared = { strings, template, descriptors };
  cache.set(strings, prepared);
  return prepared;
}

class AttrPart {
  constructor(el, d) {
    this.el = el;
    this.name = d.name;
    this.statics = d.statics;
    this.indexes = d.indexes;
    this.last = undefined;
  }
  set(values) {
    let result;
    if (this.indexes.length === 1 && this.statics[0] === '' && this.statics[1] === '') {
      const v = values[this.indexes[0]];
      result = v == null || v === false ? null : String(v);
    } else {
      result = this.statics[0];
      this.indexes.forEach((idx, i) => {
        const v = values[idx];
        result += (v == null || v === false ? '' : String(v)) + this.statics[i + 1];
      });
    }
    if (result === this.last) return;
    this.last = result;
    if (result === null) this.el.removeAttribute(this.name);
    else this.el.setAttribute(this.name, result);
  }
}

class BoolPart {
  constructor(el, d) {
    this.el = el;
    this.name = d.name;
    this.index = d.index;
  }
  set(values) {
    this.el.toggleAttribute(this.name, Boolean(values[this.index]));
  }
}

class PropPart {
  constructor(el, d) {
    this.el = el;
    this.name = d.name;
    this.index = d.index;
  }
  set(values) {
    const v = values[this.index];
    if (this.el[this.name] !== v) this.el[this.name] = v;
  }
}

class EventPart {
  constructor(el, d) {
    this.handler = null;
    this.index = d.index;
    el.addEventListener(d.name, (event) => {
      if (typeof this.handler === 'function') this.handler(event);
    });
  }
  set(values) {
    this.handler = values[this.index];
  }
}

export class NodePart {
  constructor(start, end, index = 0) {
    this.start = start;
    this.end = end;
    this.index = index;
    this.mode = 'empty';
    this.value = undefined;
    this.textNode = null;
    this.instance = null;
    this.items = null;
  }

  set(values) {
    this.setValue(values[this.index]);
  }

  clear() {
    let n = this.start.nextSibling;
    while (n && n !== this.end) {
      const next = n.nextSibling;
      n.parentNode.removeChild(n);
      n = next;
    }
    this.mode = 'empty';
    this.textNode = null;
    this.instance = null;
    this.items = null;
    this.value = undefined;
  }

  insert(node) {
    this.end.parentNode.insertBefore(node, this.end);
  }

  setValue(v) {
    if (v == null || v === false) {
      if (this.mode !== 'empty') this.clear();
      return;
    }

    if (v instanceof TemplateResult) {
      if (this.mode === 'template' && this.instance.prepared.strings === v.strings) {
        this.instance.update(v.values);
        return;
      }
      this.clear();
      const inst = new TemplateInstance(prepare(v.strings));
      inst.update(v.values);
      this.insert(inst.fragment);
      this.instance = inst;
      this.mode = 'template';
      return;
    }

    if (Array.isArray(v)) {
      if (this.mode !== 'array') {
        this.clear();
        this.items = [];
        this.mode = 'array';
      }
      const items = this.items;
      v.forEach((item, i) => {
        if (i >= items.length) {
          const s = document.createComment('');
          const e = document.createComment('');
          this.insert(s);
          this.insert(e);
          items.push(new NodePart(s, e));
        }
        items[i].setValue(item);
      });
      while (items.length > v.length) {
        const p = items.pop();
        p.clear();
        p.start.remove();
        p.end.remove();
      }
      return;
    }

    if (v instanceof Node) {
      if (this.mode === 'node' && this.value === v) return;
      this.clear();
      this.insert(v);
      this.mode = 'node';
      this.value = v;
      return;
    }

    const text = String(v);
    if (this.mode === 'text') {
      if (this.textNode.data !== text) this.textNode.data = text;
      return;
    }
    this.clear();
    this.textNode = document.createTextNode(text);
    this.insert(this.textNode);
    this.mode = 'text';
  }
}

class TemplateInstance {
  constructor(prepared) {
    this.prepared = prepared;
    this.fragment = document.importNode(prepared.template.content, true);
    this.parts = [];

    const walker = document.createTreeWalker(
      this.fragment,
      NodeFilter.SHOW_ELEMENT | NodeFilter.SHOW_COMMENT
    );
    const nodes = [];
    while (walker.nextNode()) nodes.push(walker.currentNode);

    for (const d of prepared.descriptors) {
      const node = nodes[d.nodeIndex];
      if (d.type === 'node') this.parts.push(new NodePart(node, node.nextSibling, d.index));
      else if (d.type === 'attr') this.parts.push(new AttrPart(node, d));
      else if (d.type === 'bool') this.parts.push(new BoolPart(node, d));
      else if (d.type === 'prop') this.parts.push(new PropPart(node, d));
      else if (d.type === 'event') this.parts.push(new EventPart(node, d));
    }
  }

  update(values) {
    for (const part of this.parts) part.set(values);
  }
}

export function render(result, container) {
  let part = container.__rootPart;
  if (!part) {
    const s = document.createComment('');
    const e = document.createComment('');
    container.append(s, e);
    part = new NodePart(s, e);
    container.__rootPart = part;
  }
  part.setValue(result);
}
