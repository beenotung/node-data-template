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

async function expandTemplateReference(html: string) {}

async function expandDataTemplate(html: string) {
  let acc = ''
  let remain = html
  for (; remain.length > 0; ) {
    let match = remain.match(/ data-template="(.+)"/)
    if (!match) {
      console.debug('no data-template on html file')
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
      templateHTML = 'TODO'
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
    html = await expandDataTemplate(html)
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
