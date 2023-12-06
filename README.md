# node-data-template

[![npm Package Version](https://img.shields.io/npm/v/node-data-template)](https://www.npmjs.com/package/node-data-template)

Fast, SEO-friendly server-side rendering (SSR) [data-template](https://github.com/beenotung/data-template) for smoother user experiences.

node-data-template is framework agnostic (with express support).

## Motivation

Server-side rendering (SSR) pages with data-template into plain HTML to deliver information as soon as possible. Directly delivery content over the wire (without running any javascript and ajax on the client side) enhances user experience by presenting readable content immediately upon request, reducing wait times and potential user frustration.

The benefits of SSR extend beyond speed; it also improves Search Engine Optimization (SEO). Search engine crawlers often have lower priority to run and index JavaScript-rendered content, but they can readily understand and index server-rendered HTML. This means your website's content is more likely to appear in search results, driving more organic traffic to your site.

In summary, server-side rendering is a effective strategy for boosting both the speed and SEO performance of a website.

## Installation

```bash
npm install node-data-template
```

You can also install it with [pnpm](https://pnpm.io), [yarn](https://yarnpkg.com), or [slnpm](https://github.com/beenotung/slnpm)

## Usage Examples

A complete example can be found in [example/server.ts](./example/server.ts)

```typescript
import express from 'express'
import { dataTemplate, scanTemplates } from 'node-data-template'

let templates = dataTemplate({
  templateDir: 'public',
  minify: true,
})

let app = express()

let articles = [
  /*...*/
]

app.get('/articles', (req, res) => res.json({ articles }))

app.get(
  '/',
  templates.handle((context, req, next) => {
    scanTemplates(context, context.document, { articles })
  }),
)

app.use(express.static('public'))

app.listen(8100, () => {
  console.log('Server started and listening at http://localhost:8100')
})
```

## API Types

**Express Middleware Creator**:

```typescript
function dataTemplate(options: {
  templateDir: string
  minify?: boolean
}): DataTemplateHandler

interface DataTemplateHandler {
  // to be used in express route handler
  handle: (render: RenderFn) => RequestHandler
}

type RenderFn = (
  context: DataTemplateContext,
  req: Request,
  next: NextFunction,
) => void | Promise<void>
```

**Core Functions**:

```typescript
type DataTemplateContext = {
  document: Document
  templateDir: string
}
function loadDocument(templateDir: string, filename: string): Document
function renderTemplate(
  context: DataTemplateContext,
  host: HTMLElement,
  binds?: {},
): void
function scanTemplates(
  context: DataTemplateContext,
  root?: Document,
  binds?: {},
): void
function fillForm(form: HTMLElement, o: object): void
function d2(x: number): string | number
function toInputDate(date: string | number | Date): string
function toInputTime(date: string | number | Date): string
function renderData(container: Node, values: object): void
```

Where the `Document` is a shim from the lightweight library `html-parser.ts` with `outerHTML` and `minifiedOuterHTML`.

## License

This project is licensed with [BSD-2-Clause](./LICENSE)

This is free, libre, and open-source software. It comes down to four essential freedoms [[ref]](https://seirdy.one/2021/01/27/whatsapp-and-the-domestication-of-users.html#fnref:2):

- The freedom to run the program as you wish, for any purpose
- The freedom to study how the program works, and change it so it does your computing as you wish
- The freedom to redistribute copies so you can help others
- The freedom to distribute copies of your modified versions to others
