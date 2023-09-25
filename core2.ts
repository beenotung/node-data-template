import { NextFunction, Request, Response, Router } from 'express'
import { readFileSync } from 'fs'
import { readFile } from 'fs/promises'
import {
  Document,
  HTMLElement,
  parseHtmlDocument,
  walkNode,
  Node,
} from 'html-parser.ts'
import { join } from 'path'

// TODO extract into html-parser.ts
export function findElementById<E extends HTMLElement>(
  doc: Document,
  tagName: string,
  id: string,
): E {
  try {
    walkNode(doc, node => {
      if (
        node instanceof HTMLElement &&
        node.isTagName(tagName) &&
        node.attributes?.getValue('id') == id
      ) {
        throw node
      }
    })
  } catch (node) {
    return node as E
  }
  throw new Error('element not found')
}

export function fillForm(doc: Document, formId: string, o: object): void {
  let form = findElementById(doc, 'form', formId)
  for (let k in o) {
    let v = o[k as keyof typeof o]
    walkNode(form, (node, parent) => {
      if (
        node instanceof HTMLElement &&
        node.attributes?.getValue('name') == k
      ) {
        let found = node.attributes.attrs.some(attr => {
          if (typeof attr == 'object' && attr.name == 'value') {
            attr.value = v
            return true
          }
        })
        if (!found) {
          node.attributes.attrs.push({ name: k, value: v })
        }
        return 'skip_child'
      }
    })
  }
}

export function d2(x: number): string | number {
  return x < 10 ? '0' + x : x
}

export function toInputDate(date: number | string | Date): string {
  let d = new Date(date)
  return d.getFullYear() + '-' + d2(d.getMonth() + 1) + '-' + d2(d.getDate())
}

export function toInputTime(date: number | string | Date): string {
  let d = new Date(date)
  return d2(d.getHours()) + ':' + d2(d.getMinutes())
}

export function readFileString(dir: string, filename: string): Promise<string> {
  let file = join(dir, filename)
  return readFile(file).then(bin => bin.toString())
}

// data-name -> template element
type TemplateDict = Record<string, HTMLElement>

function collectTemplateElements(doc: Document) {
  let templateDict: TemplateDict = {}
  walkNode(doc, node => {
    if (node instanceof HTMLElement && node.isTagName('template')) {
      let name = node.attributes?.getValue('data-name')
      if (name) {
        templateDict[name] = node
      }
      return 'skip_child'
    }
  })
  return templateDict
}

function context(dir: string) {
  function bindTemplate(
    host: HTMLElement,
    template: Document | HTMLElement,
    values: object,
  ) {
    let container = template.clone()
    context.renderData(container, values)
    host.childNodes = container.childNodes
  }
  let context = {
    readTemplateFile(filename: string): Promise<Document> {
      return readFileString(dir, filename).then(html => parseHtmlDocument(html))
    },
    renderTemplate(doc: Document, binds: object = {}): Promise<Document> {
      let templateDict = collectTemplateElements(doc)
      walkNode(doc, node => {
        if (node instanceof HTMLElement) {
          const host = node
          let templateName = host.attributes?.getValue('data-template')
          if (!templateName) return
          let bindName = host.attributes?.getValue(
            'data-bind',
          ) as keyof typeof binds
          let values: object = binds[bindName] || binds
          host.childNodes = []
          if (templateName.endsWith('.html')) {
            this.readTemplateFile(templateName).then(next)
          } else {
            next(templateDict[templateName])
          }
          function next(template: Document | HTMLElement) {
            Array.isArray(values)
              ? values.forEach(values => bindTemplate(host, template, values))
              : bindTemplate(host, template, values)
          }
        }
      })
    },
    renderData(container: Document | HTMLElement, values: object) {
      // TODO
    },
  }
  return context
}

export type Context = ReturnType<typeof context>

export function ssr(
  dir: string,
  path: string,
  resolve: (ctx: Context) => void | Promise<void>,
) {
  let router = Router()

  let doc = loadDataTemplateFile(join(dir, path))

  function renderData(selector: string, values: object): void {
    // TODO
  }
  function renderTemplate(selector: string, binds?: object): void {
    // TODO
  }
  function scanTemplates(selector?: string, binds?: object): void {
    // TODO
  }

  let routeHandler = async (
    req: Request,
    res: Response,
    next: NextFunction,
  ) => {
    try {
      let context: Context = {
        req,
        renderData,
        renderTemplate,
        scanTemplates,
      }
      let data = await resolve(context)
      res.setHeader('Content-Type', 'text/html')
      // res.end(doc.minifiedOuterHTML)
      res.end(doc.outerHTML)
    } catch (error) {
      next(error)
    }
  }

  router.get(path, routeHandler)

  if (path.endsWith('index.html')) {
    let shortPath = path.slice(0, path.length - 'index.html'.length)
    router.get(shortPath, routeHandler)
  }

  return router
}

function loadDataTemplateFile(file: string) {
  let html = readFileSync(file).toString()
  let doc = parseHtmlDocument(html)
  return doc
}

let lib = {
  ssr,
  fillForm,
  d2,
  toInputDate,
  toInputTime,
}

export default Object.assign(context, lib)
