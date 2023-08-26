import express from 'express'
import { readFile } from 'fs/promises'
import { print } from 'listening-on'
import { join } from 'path'

let app = express()

function readFileString(file: string) {
  return readFile(file).then(bin => bin.toString())
}

async function readTemplateFile(filename: string) {
  let file = join('public', filename)
  let html = await readFileString(file)
  return html
}

function escapeHTML(data: any): string {
  return String(data)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
}

function escapeAttributeValue(data: any): string {
  return JSON.stringify(data)
}

function renderDataText(html: string, json: any): string {
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
    let name = attrMatch[1]
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

function renderInlineDataAttributes(html: string, json: any): string {
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
      render: (value: string, name: string) => string,
    ) => {
      let attrMatch = openTag.match(
        new RegExp(String.raw`data-${attr}="(.+?)"`),
      )
      if (!attrMatch) return
      let name = attrMatch[1]
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
    acc += before + openTag
    remain = remain.substring(openTagEndIndex + 1)
  }
  return acc + remain
}

function renderDataAttributes(html: string, json: any): string {
  if (Array.isArray(json)) {
    return json.map(item => renderDataAttributes(html, item)).join('')
  }
  html = renderDataText(html, json)
  html = renderInlineDataAttributes(html, json)
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

async function expandDataTemplate(html: string, json: any) {
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
      templateHTML = await readTemplateFile(templateName)
    } else {
      let bind = hostStart.match(/ data-bind="(.+?)"/)?.[1]
      if (!(templateName in templateDict)) {
        console.debug(
          'failed to find template by data-name attribute:',
          templateName,
        )
        break
      }
      let templateInnerHTML = templateDict[templateName]
      let data = json[bind!] || {}
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

app.get('/articles', (req, res) => res.json({ articles }))
app.get('/', async (req, res, next) => {
  try {
    let html = await readFileString('public/index.html')
    html = await expandDataTemplate(html, { articles })
    res.contentType('text/html')
    res.end(html)
  } catch (error) {
    next(error)
  }
})

let articles = [
  {
    id: 1,
    title: 'Apple',
    desc: 'Apple is a red fruit',
    href: '/article.html?id=1',
    node_id: 'article-1',
    node_class: 'article first-article',
    node_style: 'font-weight: bold',
  },
  {
    id: 2,
    title: 'Banana',
    desc: 'Banana is a yellow fruit',
    href: '/article.html?id=2',
    node_id: 'article-2',
    node_class: 'article second-article',
    node_style: 'font-weight: italic',
  },
  {
    id: 3,
    title: 'Cherry',
    desc: 'Cherry is a purple fruit',
    href: '/article.html?id=3',
    readonly: true,
  },
]

async function test() {
  let html = await readFileString('public/index.html')
  html = await expandDataTemplate(html, { articles })
  console.log(html) // TODO
}
test()

app.use(express.static('public'))
app.use(express.json())
app.use(express.urlencoded({ extended: false }))

let port = 8100
app.listen(port, () => {
  print(port)
})
