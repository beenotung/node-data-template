import { NextFunction, Request, Response } from 'express'
import { loadDocument, Context } from './core3'

export function dataTemplate(options: { templateDir: string }) {
  let { templateDir } = options
  function handle(
    render: (
      context: Context,
      req: Request,
      next: NextFunction,
    ) => void | Promise<void>,
  ) {
    return async (req: Request, res: Response, next: NextFunction) => {
      try {
        let document = loadDocument(templateDir, req.path)
        let context = { templateDir, document }
        await render(context, req, next)
        res.setHeader('Content-Type', 'text/html; charset=utf-8')
        res.end(document.outerHTML)
      } catch (error) {
        next(error)
      }
    }
  }
  return { handle }
}
