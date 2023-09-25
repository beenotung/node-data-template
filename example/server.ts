import express, { NextFunction, Request, Response } from 'express'
import { access, accessSync, existsSync } from 'fs'
import { print } from 'listening-on'
import { join } from 'path'
import { chromium } from 'playwright'
// import dataTemplate from 'node-data-template'
import dataTemplate from '../core'

let app = express()

let articles = [
  {
    id: 1,
    title: 'Apple',
    desc: 'Apple is a red fruit',
    href: '/article.html?id=1',
    node_id: 'article-1',
    node_class: 'article first-article',
    node_style: 'font-weight: bold',
    is_first: true,
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

app.get('/articles', (req, res) => res.json({ articles }))
// app.get(
//   '/',
//   dataTemplate.static('public', 'index.html', () => ({ articles })),
// )
app.use(ssr('public'))

/* used 550 - 580ms */
function ssr(dir: string) {
  let existPaths = new Set<string>()
  let notExistPaths = new Set<string>()
  function checkPath({ path }: Request): boolean {
    if (path == '/') return true
    if (!path.endsWith('.html')) return false
    if (existPaths.has(path)) return true
    if (notExistPaths.has(path)) return false
    if (existsSync(join(dir, path))) {
      existPaths.add(path)
      return true
    } else {
      notExistPaths.add(path)
      return false
    }
  }
  let browserP = chromium.launch({ headless: true })
  let contextP = browserP.then(browser =>
    browser.newContext({
      userAgent: 'ssr',
    }),
  )
  return async function ssrRoute(
    req: Request,
    res: Response,
    next: NextFunction,
  ) {
    try {
      if (req.headers['user-agent'] == 'ssr' || !checkPath(req)) {
        next()
        return
      }
      let url = origin + req.url
      console.log('[ssr]', url)
      let start = Date.now()
      let context = await contextP
      let page = await context.newPage()
      await page.goto(url, { waitUntil: 'domcontentloaded' })
      let networkIdle = page.waitForLoadState('networkidle')
      await page.evaluate(() => {
        var initRender: any
        if (typeof initRender == 'function') {
          initRender()
        }
      })
      await networkIdle
      let html = await page.content()
      res.header('Content-Type', 'text/html')
      res.end(html)
      let end = Date.now()
      console.log('[ssr]', url, 'used', end - start, 'ms')
      await page.close()
    } catch (error) {
      next(error)
    }
  }
}

app.use(express.static('public'))

let port = 8100
let origin = 'http://localhost:' + port
app.listen(port, () => {
  print(port)
})
