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

function renderDataAttributes(html: string, json: any): string {
  if (Array.isArray(json)) {
    return json.map(item => renderDataAttributes(html, item)).join('')
  }
  let acc = ''
  let remain = html
  for (; remain.length > 0; ) {
    let match = remain.match(
      /<(.+?) (.|\n)*?data-text="(.+?)"(.|\n)*?>(.|\n)*?<\//,
    )
    if (!match) break
    let tagName = match[1]
    let name = match[3]
    let startIndex = match[0].indexOf('>')
    let suffix = `</${tagName}>`
    let endIndex = match[0].indexOf(suffix, startIndex + 1)
    let before = remain.substring(0, match.index)
    let after = remain.substring(match.index! + endIndex + suffix.length)
    acc += before + json[name]
    remain = after
  }
  return acc + remain
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
  console.log({ templateDict })
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

app.get('/', async (req, res, next) => {
  try {
    let html = await readFileString('public/index.html')
    let articles = [
      { id: 1, title: 'Apple', desc: 'Apple is a red fruit' },
      { id: 2, title: 'Banana', desc: 'Banana is a yellow fruit' },
    ]
    html = await expandDataTemplate(html, { articles })
    res.contentType('text/html')
    res.end(html)
  } catch (error) {
    next(error)
  }
})

app.use(express.static('public'))
app.use(express.json())
app.use(express.urlencoded({ extended: false }))

let port = 8100
app.listen(port, () => {
  print(port)
})
