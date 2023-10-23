import {
  Attributes,
  Document,
  HTMLElement,
  Node,
  Text,
  walkNode,
} from 'html-parser.ts'

export function renderData(container: Node, values: object) {
  let apply = (
    attr: string,
    f: (e: HTMLElement, v: any, k: string) => void,
  ) => {
    let attrName = 'data-' + attr
    walkNode(container, e => {
      if (e instanceof HTMLElement && e.attributes) {
        let key = e.attributes.getValue(attrName)
        if (!key) return
        let value = (values as any)[key]
        if (!Array.isArray(value)) return f(e, value, key)
        value.forEach(value => {})
      }
    })
  }
  apply('text', (e, v) => (e.childNodes = [Text.parse(String(v)).data]))
  apply('class', (e, v, k) => (v == true ? addClass(e, k) : addClass(e, v)))
  apply('show', (e, v) =>
    v == true ? removeAttr(e, 'hidden') : addAttr(e, 'hidden'),
  )
  apply('if', (e, v) => v || removeElement(e))
  for (let attr of ['hidden'])
    apply(attr, (e, v) => (v ? addAttr(e, attr) : removeAttr(e, attr)))
  for (let attr of ['id', 'title', 'href', 'src', 'alt'])
    apply(attr, (e, v) => v && setAttr(e, attr, v))
}

function removeElement(e: HTMLElement) {
  if (e.parentElement && e.parentElement.childNodes) {
    let index = e.parentElement.childNodes.indexOf(e)
    if (index != -1) {
      e.parentElement.childNodes.splice(index, 1)
    }
  }
}

function removeAttr(e: HTMLElement, name: string) {
  if (!e.attributes) return
  let attrs = e.attributes.attrs
  for (let i = 0; i < attrs.length; i++) {
    let attr = attrs[i]
    if (typeof attr == 'object' && attr.name == name) {
      if (attrs[i - 1] == ' ') {
        attrs.splice(i - 1, 2)
      } else if (attrs[i + 1] == ' ') {
        attrs.splice(i, 2)
      } else {
        attrs.splice(i, 1)
      }
      return
    }
  }
}

function addAttr(e: HTMLElement, name: string) {
  if (!e.attributes) {
    e.attributes = new Attributes()
    e.attributes.attrs.push({ name })
    return
  }
  for (let attr of e.attributes.attrs) {
    if (typeof attr == 'object' && attr.name == name) {
      'value' in attr && delete attr.value
      return
    }
  }
  if (e.attributes.attrs.length > 0) {
    e.attributes.attrs.push(' ')
  }
  e.attributes.attrs.push({ name })
}

function setAttr(e: HTMLElement, name: string, value: string) {
  if (!e.attributes) {
    e.attributes = new Attributes()
    e.attributes.attrs.push({ name, value: `"${value}"` })
    return
  }
  for (let attr of e.attributes.attrs) {
    if (typeof attr == 'object' && attr.name == name) {
      attr.value = `"${value}"`
      return
    }
  }
  if (e.attributes.attrs.length > 0) {
    e.attributes.attrs.push(' ')
  }
  e.attributes.attrs.push({ name, value: `"${value}"` })
}

function addClass(e: HTMLElement, className: string) {
  if (!e.attributes) {
    e.attributes = Attributes.parse(`class="${className}"`).data
    return
  }
  for (let attr of e.attributes.attrs) {
    if (typeof attr == 'object' && attr.name == 'class') {
      attr.value = concatClasses(attr.value, className)
      return
    }
  }
  if (e.attributes.attrs.length > 0) {
    e.attributes.attrs.push(' ')
  }
  e.attributes.attrs.push({ name: 'class', value: `"${className}"` })
}

function concatClasses(original: string | undefined, extra: string): string {
  if (!original) return `"${extra}"`
  if (original[0] == '"' || original[0] == "'") {
    original = original.slice(1, -1)
  }
  return `"${original} ${extra}"`
}
