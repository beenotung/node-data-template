# node-data-template

Server Rendering [data-template](https://github.com/beenotung/data-template) (framework agnostic with express support)

[![npm Package Version](https://img.shields.io/npm/v/node-data-template)](https://www.npmjs.com/package/node-data-template)

## Installation

```bash
npm install node-data-template
```

You can also install it with [pnpm](https://pnpm.io), [yarn](https://yarnpkg.com), or [slnpm](https://github.com/beenotung/slnpm)

## Usage Examples

```typescript
import express from 'express'
import { print } from 'listening-on'
import dataTemplate from 'node-data-template'

let app = express()

let articles = [
  /*...*/
]

app.get('/articles', (req, res) => res.json({ articles }))
app.get(
  '/',
  dataTemplate.static('public', 'index.html', () => ({ articles })),
)

app.use(express.static('public'))

let port = 8100
app.listen(port, () => {
  print(port)
})
```

## API Types

```typescript
import { Request, Response, RequestHandler } from 'express'

// namespace object for the functions
export let dataTemplate = {
  renderFile: renderDataTemplateFile,
  render: renderDataTemplate,
  static: staticDataTemplateHandler,
  dynamic: dynamicDataTemplateHandler,
  responseFile: responseDataTemplateFile,
}

// you can use dataTemplate.static() similar to express.static()
export default dataTemplate

// you can also access the functions with named imports

// framework agnostic render function
export function renderDataTemplateFile(
  public_dir: string,
  filename: string,
  bindings: object,
): Promise<string>

// framework agnostic render function
export function renderDataTemplate(
  public_dir: string,
  html: string,
  bindings: object,
): Promise<string>

// create express middleware with error handling
export function staticDataTemplateHandler(
  public_dir: string,
  filename: string,
  resolveBindings: (req: Request) => object | Promise<object>,
): RequestHandler

// create express middleware with error handling
export declare function dynamicDataTemplateHandler(
  resolve: (
    req: Request,
  ) =>
    | DynamicDataTemplateHandlerResult
    | Promise<DynamicDataTemplateHandlerResult>,
): RequestHandler

export type DynamicDataTemplateHandlerResult = {
  dir: string
  filename: string
  bindings: object
}

// helper function to be used by express route handler (no error handling)
export function responseDataTemplateFile(
  res: Response,
  public_dir: string,
  filename: string,
  bindings: object,
): Promise<void>
```

## License

This project is licensed with [BSD-2-Clause](./LICENSE)

This is free, libre, and open-source software. It comes down to four essential freedoms [[ref]](https://seirdy.one/2021/01/27/whatsapp-and-the-domestication-of-users.html#fnref:2):

- The freedom to run the program as you wish, for any purpose
- The freedom to study how the program works, and change it so it does your computing as you wish
- The freedom to redistribute copies so you can help others
- The freedom to distribute copies of your modified versions to others
