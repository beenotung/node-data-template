import express from 'express'
import { print } from 'listening-on'
import { scanTemplates } from 'node-data-template/core'
import { dataTemplate } from 'node-data-template/express'

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

let templates = dataTemplate({
  templateDir: 'public',
  minify: true,
})

app.get(
  '/',
  templates.handle((context, req, next) => {
    scanTemplates(context, context.document, { articles })
  }),
)

app.use(express.static('public'))

let port = +process.env.PORT! || 8100
app.listen(port, () => {
  print(port)
})
