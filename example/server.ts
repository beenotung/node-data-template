import express from 'express'
import { print } from 'listening-on'
import {
  renderDataTemplateFile,
  responseDataTemplateFile,
} from 'node-data-template'

let app = express()

app.get('/articles', (req, res) => res.json({ articles }))
app.get('/', async (req, res, next) => {
  try {
    await responseDataTemplateFile(res, 'public/index.html', { articles })
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

async function test() {
  let html = await renderDataTemplateFile('public/index.html', { articles })
  console.log(html)
}
// test()

app.use(express.static('public'))
app.use(express.json())
app.use(express.urlencoded({ extended: false }))

let port = 8100
app.listen(port, () => {
  print(port)
})
