import { NextFunction, Request, Response, RequestHandler } from 'express'
import { loadDocument, DataTemplateContext } from './core'

export function dataTemplate(options: {
  templateDir: string
  minify?: boolean
}): DataTemplateHandler {
  let { templateDir, minify } = options
  return {
    handle(render) {
      return async (req: Request, res: Response, next: NextFunction) => {
        try {
          let document = loadDocument(templateDir, req.path)
          let context = { templateDir, document }
          await render(context, req, next)
          res.setHeader('Content-Type', 'text/html; charset=utf-8')
          if (minify) {
            res.end(document.minifiedOuterHTML)
          } else {
            res.end(document.outerHTML)
          }
        } catch (error) {
          next(error)
        }
      }
    },
  }
}

export interface DataTemplateHandler {
  handle: (render: RenderFn) => RequestHandler
}

export type RenderFn = (
  context: DataTemplateContext,
  req: Request,
  next: NextFunction,
) => void | Promise<void>
