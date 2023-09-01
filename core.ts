import { Request, Response, RequestHandler } from 'express'
import { readFile } from 'fs/promises'
import { join } from 'path'

// TODO write tests for exported functions

function readFileString(dir: string, filename: string): Promise<string> {
  let file = join(dir, filename)
  return readFile(file).then(bin => bin.toString())
}

export async function responseDataTemplateFile(
  res: Response,
  dir: string,
  filename: string,
  bindings: object,
): Promise<void> {
  let html = await renderDataTemplateFile(dir, filename, bindings)
  res.contentType('text/html')
  res.end(html)
}

export async function renderDataTemplateFile(
  dir: string,
  filename: string,
  bindings: object,
): Promise<string> {
  return readFileString(dir, filename).then(html =>
    renderDataTemplate(dir, html, bindings),
  )
}

async function readTemplateFile(dir: string, filename: string) {
  let html = await readFileString(dir, filename)
  return html
}

function escapeHTML(value: unknown): string {
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
}

function escapeAttributeValue(value: unknown): string {
  return JSON.stringify(value)
}

function renderDataText(html: string, json: object): string {
  let acc = ''
  let remain = html
  for (; remain.length > 0; ) {
    let tagMatch = remain.match(/<([\w-]+)/)
    if (!tagMatch) break
    let tagName = tagMatch[1]
    let before = remain.substring(0, tagMatch.index)
    let openTagEndIndex = remain.indexOf('>', tagMatch.index)
    let openTag = remain.substring(tagMatch.index!, openTagEndIndex + 1)
    let attrMatch = openTag.match(/data-text="(.+?)"/)
    if (!attrMatch) {
      acc += before + openTag
      remain = remain.substring(openTagEndIndex + 1)
      continue
    }
    let name = attrMatch[1] as keyof typeof json
    let innerHTML = escapeHTML(json[name])
    let closeTag = `</${tagName}>`
    let closeTagStartIndex = remain.indexOf(
      closeTag,
      tagMatch.index! + openTag.length,
    )
    let after = remain.substring(closeTagStartIndex + closeTag.length)
    acc += before + openTag + innerHTML + closeTag
    remain = after
  }
  return acc + remain
}

let valueAttrs = [
  'class',
  'id',
  'title',
  'href',
  'src',
  'alt',
  'value',
  'action',
]
let boolAttrs = [
  'hidden',
  'checked',
  'selected',
  'disabled',
  'readonly',
  'open',
]

function renderInlineDataAttributes(html: string, json: object): string {
  let acc = ''
  let remain = html
  for (; remain.length > 0; ) {
    let tagMatch = remain.match(/<([\w-]+)/)
    if (!tagMatch) break
    let before = remain.substring(0, tagMatch.index)
    let openTagEndIndex = remain.indexOf('>', tagMatch.index)
    let openTag = remain.substring(tagMatch.index!, openTagEndIndex + 1)
    let apply = (
      attr: string,
      render: (value: unknown, name: string) => string,
    ) => {
      let attrMatch = openTag.match(
        new RegExp(String.raw`data-${attr}="(.+?)"`),
      )
      if (!attrMatch) return
      let name = attrMatch[1] as keyof typeof json
      let value = json[name]
      let mid = render(value, name)
      if (!mid) return
      let midIndex = attrMatch.index! + attrMatch[0].length
      let before = openTag.substring(0, midIndex)
      let after = openTag.substring(midIndex)
      openTag = `${before}${mid}${after}`
    }
    for (let attr of valueAttrs)
      apply(attr, value =>
        value ? ` ${attr}=${escapeAttributeValue(value)}` : '',
      )
    for (let attr of boolAttrs) apply(attr, value => (value ? ` ${attr}` : ''))
    apply('show', value => (value ? '' : ' hidden'))
    acc += before + openTag
    remain = remain.substring(openTagEndIndex + 1)
  }
  return acc + remain
}

function renderDataAttributes(html: string, values: object): string {
  if (Array.isArray(values)) {
    return values.map(item => renderDataAttributes(html, item)).join('')
  }
  html = renderDataText(html, values)
  html = renderInlineDataAttributes(html, values)
  return html
}

// data-name -> innerHTML
type TemplateDict = Record<string, string>

function parseTemplateElements(html: string) {
  let templateDict: TemplateDict = {}
  let remain = html
  for (; remain.length > 0; ) {
    let match = remain.match(
      /<template (.|\n)*?data-name="(.+?)"(.|\n)*?>(.|\n)*?<\/template>/,
    )
    if (!match) break
    let name = match[2]
    let outerHTML = match[0]
    let startIndex = outerHTML.indexOf('>')
    let end = '</template>'
    let endIndex = outerHTML.length - end.length
    let innerHTML = outerHTML.substring(startIndex + 1, endIndex)
    templateDict[name] = innerHTML
    remain = remain.substring(match.index! + outerHTML.length)
  }
  return templateDict
}

export async function renderDataTemplate(
  dir: string,
  html: string,
  bindings: object,
): Promise<string> {
  let templateDict = parseTemplateElements(html)
  let acc = ''
  let remain = html
  for (; remain.length > 0; ) {
    let match = remain.match(/ data-template="(.+?)"/)
    if (!match) {
      // console.debug('no data-template on html file')
      break
    }
    let templateName = match[1]

    let startIndex = remain.lastIndexOf('<', match.index)
    if (startIndex == -1) {
      console.debug('failed to find start of host element')
      break
    }
    let tagName = remain
      .substring(startIndex + 1, match.index)
      .match(/[\w-]+/)?.[0]
    if (!tagName) {
      console.debug('failed to find tag name of host element')
      break
    }
    // TODO some elements don't have closing tags
    let suffix = `></${tagName}>`
    let endIndex = remain.indexOf(suffix, match.index! + match[0].length)
    if (endIndex == -1) {
      console.debug('failed to find end of host element')
      break
    }
    let hostStart = remain.substring(startIndex, endIndex + 1)
    let hostEnd = remain.substring(endIndex + 1, endIndex + suffix.length)

    let templateHTML: string
    if (templateName.endsWith('.html')) {
      // TODO to render recursively?
      templateHTML = await readTemplateFile(dir, templateName)
    } else {
      let bind = hostStart.match(
        / data-bind="(.+?)"/,
      )?.[1] as keyof typeof bindings
      if (!(templateName in templateDict)) {
        console.debug(
          'failed to find template by data-name attribute:',
          templateName,
        )
        break
      }
      let templateInnerHTML = templateDict[templateName]
      let data = bindings[bind] || {}
      templateHTML = renderDataAttributes(templateInnerHTML, data)
    }

    let host = hostStart + templateHTML + hostEnd
    let before = remain.substring(0, startIndex)
    let after = remain.substring(endIndex + suffix.length)
    acc += before + host
    remain = after
  }
  return acc + remain
}

export function staticDataTemplateHandler(
  dir: string,
  filename: string,
  resolveBindings: (req: Request) => object | Promise<object>,
): RequestHandler {
  return async (req, res, next) => {
    try {
      let bindings = await resolveBindings(req)
      responseDataTemplateFile(res, dir, filename, bindings)
    } catch (error) {
      next(error)
    }
  }
}

export type DynamicDataTemplateHandlerResult = {
  dir: string
  filename: string
  bindings: object
}

export function dynamicDataTemplateHandler(
  resolve: (
    req: Request,
  ) =>
    | DynamicDataTemplateHandlerResult
    | Promise<DynamicDataTemplateHandlerResult>,
): RequestHandler {
  return async (req, res, next) => {
    try {
      let { dir, filename, bindings } = await resolve(req)
      responseDataTemplateFile(res, dir, filename, bindings)
    } catch (error) {
      next(error)
    }
  }
}

export let dataTemplate = {
  responseFile: responseDataTemplateFile,
  renderFile: renderDataTemplateFile,
  render: renderDataTemplate,
  static: staticDataTemplateHandler,
  dynamic: dynamicDataTemplateHandler,
}

export default dataTemplate
