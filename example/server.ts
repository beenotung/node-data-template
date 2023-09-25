import express, { NextFunction, Request, Response } from 'express'
import { print } from 'listening-on'
import dataTemplate from '../core'
import dataTemplate2 from '../core2'

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
let context = dataTemplate2('public')
app.use(
  dataTemplate2.ssr('public', '/index.html', ctx => {
    context.renderTemplate('index.html', { articles })
  }),
)
let index = async (req: Request, res: Response, next: NextFunction) => {
  try {
    let html = await context.renderTemplate('index.html', { articles })
    res.header('Content-Type', 'text/html')
    res.end(html)
  } catch (error) {
    next(error)
  }
}
app.get('/', index)
app.get('/index.html', index)

app.use(express.static('public'))

let port = +process.env.PORT! || 8100
app.listen(port, () => {
  print(port)
})
