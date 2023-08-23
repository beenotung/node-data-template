import express from 'express'
import { readFile } from 'fs/promises'
import { print } from 'listening-on'
import { join } from 'path'

let app = express()

function readFileString(file: string) {
  return readFile(file).then(bin => bin.toString())
}

app.get('/', async (req, res, next) => {
  try {
    let html = await readFileString('public/index.html')
    for (;;) {
      let match = html.match(/ data-template="(.+)\.html"/)
      if (!match) {
        console.debug('no data-template on html file')
        break
      }
      console.log(match)
      let startIndex = html.lastIndexOf('<', match.index)
      if (startIndex == -1) {
        console.debug('failed to find start of host element')
        break
      }
      let hostHTML = html.substring(startIndex, match.index)
      let tagName = hostHTML.match(/[\w-]+/)?.[0]
      if (!tagName) {
        console.debug('failed to find tag name of host element')
        break
      }
      let suffix = `></${tagName}>`
      let endIndex = html.indexOf(suffix)
      if (endIndex == -1) {
        console.debug('failed to find end of host element')
        break
      }
      let hostStart = html.substring(startIndex, endIndex + 1)
      let hostEnd = html.substring(endIndex + 1, endIndex + suffix.length)
      let filename = match[1] + '.html'
      let file = join('public', filename)
      let templateHTML = await readFileString(file)
      let host = hostStart + templateHTML + hostEnd
      console.log({ before: hostStart, after: hostEnd, templateHTML })
      let before = html.substring(0, startIndex)
      let after = html.substring(endIndex + suffix.length)
      html = before + host + after
      break
    }
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
