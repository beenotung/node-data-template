import {
  Attributes,
  Document,
  HTMLElement,
  Node,
  Text,
  parseHtmlDocument,
  walkNode,
} from 'html-parser.ts'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'

function bindTemplate(host: HTMLElement, template: Node, values: object) {
  let node = template.clone()
  let container = new HTMLElement()
  container.tagName = 'div'
  container.childNodes = [node]
  renderData(container, values)
  if (host.childNodes) {
    host.childNodes.push(...node.childNodes!)
  } else {
    host.childNodes = node.childNodes
  }
}

export type Context = {
  document: Document
  templateDir: string
}

let cache: Record<string, Document | undefined> = Object.create(null)

export function loadDocument(templateDir: string, filename: string) {
  if (filename === '/') {
    filename = '/index.html'
  }
  let file = join(templateDir, filename)
  let document = cache[file]
  if (!document) {
    let html = readFileSync(file).toString()
    document = parseHtmlDocument(html)
    cache[file] = document
  }
  return document.clone()
}

export function renderTemplate(
  context: Context,
  host: HTMLElement,
  binds = {},
) {
  let name = host.attributes!.getValue('data-template')!
  let values = (binds as any)[host.attributes!.getValue('data-bind')!] || binds
  let template: HTMLElement
  host.childNodes = []
  if (name?.endsWith('.html')) {
    template = new HTMLElement()
    template.tagName = 'div'
    template.childNodes = [loadDocument(context.templateDir, name)]
    next()
  } else {
    walkNode(context.document, node => {
      if (
        node instanceof HTMLElement &&
        node.isTagName('template') &&
        node.attributes?.getValue('data-name') == name
      ) {
        template = node
        next()
        return 'skip_child'
      }
    })
  }
  function next() {
    Array.isArray(values)
      ? values.forEach(values => bindTemplate(host, template, values))
      : bindTemplate(host, template, values)
  }
}

export function scanTemplates(
  context: Context,
  root: Document = context.document,
  binds = {},
) {
  walkNode(root, host => {
    if (
      host instanceof HTMLElement &&
      host.attributes?.hasName('data-template')
    ) {
      renderTemplate(context, host, binds)
      return 'skip_child'
    }
  })
}

export function fillForm(form: HTMLElement, o: object) {
  let fields: Record<string, HTMLElement[]> = {}
  walkNode(form, e => {
    if (e instanceof HTMLElement) {
      let name = e.attributes?.getValue('name')
      if (name) {
        let field = fields[name]
        if (!field) {
          fields[name] = [e]
        } else {
          field.push(e)
        }
        return 'skip_child'
      }
    }
  })
  for (let k in o) {
    let value = (o as any)[k]
    let field = fields[k]
    if (!field || field.length == 0)
      throw new Error(`form field not found, name = "${k}"`)
    let input = field[0]
    /* radio */
    if (
      input.isTagName('input') &&
      input.attributes?.getValue('type') == 'radio'
    ) {
      for (let input of field) {
        if (input.attributes!.getValue('value') == value) {
          addAttr(input, 'checked')
        } else {
          removeAttr(input, 'checked')
        }
      }
      continue
    }
    /* checkbox */
    if (
      input.isTagName('input') &&
      input.attributes?.getValue('type') == 'checkbox'
    ) {
      if (Array.isArray(value)) {
        /* multiple choice */
        for (let input of field) {
          if (value.includes(input.attributes?.getValue('value'))) {
            addAttr(input, 'checked')
          } else {
            removeAttr(input, 'checked')
          }
        }
      } else {
        /* single choice */
        for (let input of field) {
          if (value) {
            addAttr(input, 'checked')
          } else {
            removeAttr(input, 'checked')
          }
        }
      }
      continue
    }
    /* select */
    if (input.isTagName('select')) {
      if (input.childNodes) {
        if (Array.isArray(value)) {
          /* multiple choice */
          for (let option of input.childNodes) {
            if (option instanceof HTMLElement && option.isTagName('option')) {
              if (value.includes(option.attributes?.getValue('value'))) {
                addAttr(input, 'checked')
              } else {
                removeAttr(input, 'checked')
              }
            }
          }
        } else {
          /* single choice */
          for (let option of input.childNodes) {
            if (option instanceof HTMLElement && option.isTagName('option')) {
              if (option.attributes?.getValue('value') == value) {
                addAttr(input, 'checked')
              } else {
                removeAttr(input, 'checked')
              }
            }
          }
        }
      }
      continue
    }
    for (let input of field) {
      if (input instanceof HTMLInputElement) {
        setAttr(input, 'value', value)
      }
    }
  }
}

export function d2(x: number): string | number {
  return x < 10 ? '0' + x : x
}

export function toInputDate(date: string | number | Date): string {
  let d = new Date(date)
  return d.getFullYear() + '-' + d2(d.getMonth() + 1) + '-' + d2(d.getDate())
}

export function toInputTime(date: string | number | Date): string {
  let d = new Date(date)
  return d2(d.getHours()) + ':' + d2(d.getMinutes())
}

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
  for (let attr of [
    'open',
    'checked',
    'disabled',
    'selected',
    'hidden',
    'readonly',
  ])
    apply(attr, (e, v) => (v ? addAttr(e, attr) : removeAttr(e, attr)))
  for (let attr of [
    'id',
    'title',
    'href',
    'src',
    'alt',
    'value',
    'action',
    'onsubmit',
    'onclick',
  ])
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
