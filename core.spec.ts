import { parseHtmlDocument } from 'html-parser.ts'
import assert from 'node:assert'
import { describe, test } from 'node:test'
import { renderData } from './core3'

// setTimeout(() => {}, 2 ** 31 - 1)

function t(input: {
  values: object
  templateHTML: string
  expectedHTML: string
  message: string
}) {
  let doc = parseHtmlDocument(input.templateHTML)
  renderData(doc, input.values)
  let actualHTML = doc.outerHTML
  assert.equal(actualHTML, input.expectedHTML, input.message)
}

describe('base assumption', () => {
  test('noop', () => {
    t({
      values: {},
      templateHTML: '<div>demo text</div>',
      expectedHTML: '<div>demo text</div>',
      message: 'the html should be unchanged',
    })
  })
})

describe('general', () => {
  test('text', () => {
    t({
      values: { message: 'hello world' },
      templateHTML: '<div data-text="message"></div>',
      expectedHTML: '<div data-text="message">hello world</div>',
      message: 'should set innerText',
    })
  })
  test('class', () => {
    t({
      values: { category: 'cat' },
      templateHTML: '<div data-class="category">sample text</div>',
      expectedHTML: '<div data-class="category" class="cat">sample text</div>',
      message: 'should set new class attribute',
    })
    t({
      values: { category: 'cat' },
      templateHTML:
        '<div data-class="category" class="animal">sample text</div>',
      expectedHTML:
        '<div data-class="category" class="animal cat">sample text</div>',
      message: 'should append to existing class attribute',
    })
  })
  test('id', () => {
    t({
      values: { slug: 'cat-1' },
      templateHTML: '<div data-id="slug">sample text</div>',
      expectedHTML: '<div data-id="slug" id="cat-1">sample text</div>',
      message: 'should set id attribute',
    })
  })
  test('title', () => {
    t({
      values: { desc: 'A lovely cat' },
      templateHTML: '<div data-title="desc">sample text</div>',
      expectedHTML:
        '<div data-title="desc" title="A lovely cat">sample text</div>',
      message: 'should set title attribute',
    })
  })
})

describe('link', () => {
  test('href', () => {
    t({
      values: { link: '#about' },
      templateHTML: '<a data-href="link">sample text</a>',
      expectedHTML: '<a data-href="link" href="#about">sample text</a>',
      message: 'should set href attribute',
    })
  })
})

describe('media', () => {
  test('src', () => {
    t({
      values: { icon: '1.jpg' },
      templateHTML: '<img data-src="icon">',
      expectedHTML: '<img data-src="icon" src="1.jpg">',
      message: 'should set src attribute',
    })
  })
  test('alt', () => {
    t({
      values: { desc: 'A lovely cat' },
      templateHTML: '<img data-alt="desc">',
      expectedHTML: '<img data-alt="desc" alt="A lovely cat">',
      message: 'should set alt attribute',
    })
  })
})

describe('display', () => {
  test('hidden', () => {
    t({
      values: { remains: 2 },
      templateHTML: '<img data-hidden="remains" src="out-of-stock.jpg">',
      expectedHTML: '<img data-hidden="remains" src="out-of-stock.jpg" hidden>',
      message: 'should add hidden attribute',
    })
    t({
      values: { remains: 0 },
      templateHTML: '<img data-hidden="remains" src="out-of-stock.jpg" hidden>',
      expectedHTML: '<img data-hidden="remains" src="out-of-stock.jpg">',
      message: 'should remove hidden attribute',
    })
  })
  test('show', () => {
    t({
      values: { has_discount: true },
      templateHTML: '<img data-show="has_discount" src="discount.jpg" hidden>',
      expectedHTML: '<img data-show="has_discount" src="discount.jpg">',
      message: 'should remove hidden attribute',
    })
    t({
      values: { has_discount: false },
      templateHTML: '<img data-show="has_discount" src="discount.jpg">',
      expectedHTML: '<img data-show="has_discount" src="discount.jpg" hidden>',
      message: 'should add hidden attribute',
    })
  })
  test('if', () => {
    t({
      values: { has_discount: true },
      templateHTML:
        '<div><img data-if="has_discount" src="discount.jpg"></div>',
      expectedHTML:
        '<div><img data-if="has_discount" src="discount.jpg"></div>',
      message: 'should preserve img element',
    })
    t({
      values: { has_discount: false },
      templateHTML:
        '<div><img data-if="has_discount" src="discount.jpg"></div>',
      expectedHTML: '<div></div>',
      message: 'should remove img element',
    })
  })
})

describe('input', () => {
  test('value', () => {
    t({
      values: { name: 'alice' },
      templateHTML: '<input data-value="name">',
      expectedHTML: '<input data-value="name" value="alice">',
      message: 'should set input value',
    })
  })
  test('checked', () => {
    t({
      values: { active: true },
      templateHTML: '<input type="checkbox" data-checked="active">',
      expectedHTML: '<input type="checkbox" data-checked="active" checked>',
      message: 'should set checked attribute',
    })
    t({
      values: { active: false },
      templateHTML: '<input type="checkbox" data-checked="active" checked>',
      expectedHTML: '<input type="checkbox" data-checked="active">',
      message: 'should remove checked attribute',
    })
  })
  test('selected', () => {
    t({
      values: { red: true },
      templateHTML: `<select>
  <option data-selected="red">red</option>
  <option data-selected="green">green</option>
</select>`,
      expectedHTML: `<select>
  <option data-selected="red" selected>red</option>
  <option data-selected="green">green</option>
</select>`,
      message: 'should set checked attribute',
    })
    t({
      values: { green: true },
      templateHTML: `<select>
  <option data-selected="red" selected>red</option>
  <option data-selected="green">green</option>
</select>`,
      expectedHTML: `<select>
  <option data-selected="red">red</option>
  <option data-selected="green" selected>green</option>
</select>`,
      message: 'should remove checked attribute',
    })
  })
  test('disabled', () => {
    t({
      values: { expired: true },
      templateHTML: '<input data-disabled="expired">',
      expectedHTML: '<input data-disabled="expired" disabled>',
      message: 'should set disabled attribute',
    })
    t({
      values: { expired: false },
      templateHTML: '<input data-disabled="expired" disabled>',
      expectedHTML: '<input data-disabled="expired">',
      message: 'should remove disabled attribute',
    })
  })
  test('readonly', () => {
    t({
      values: { confirmed: true },
      templateHTML: '<input data-readonly="confirmed">',
      expectedHTML: '<input data-readonly="confirmed" readonly>',
      message: 'should set readonly attribute',
    })
    t({
      values: { confirmed: false },
      templateHTML: '<input data-readonly="confirmed" readonly>',
      expectedHTML: '<input data-readonly="confirmed">',
      message: 'should remove readonly attribute',
    })
  })
})

describe('dialog', () => {
  test('open', () => {
    t({
      values: { showImage: true },
      templateHTML: '<dialog data-open="showImage">sample text</dialog>',
      expectedHTML: '<dialog data-open="showImage" open>sample text</dialog>',
      message: 'should add open attribute',
    })
    t({
      values: { showImage: true },
      templateHTML: '<dialog data-open="showImage" open>sample text</dialog>',
      expectedHTML: '<dialog data-open="showImage" open>sample text</dialog>',
      message: 'should keep existing open attribute',
    })
    t({
      values: { showImage: false },
      templateHTML: '<dialog data-open="showImage" open>sample text</dialog>',
      expectedHTML: '<dialog data-open="showImage">sample text</dialog>',
      message: 'should remove open attribute',
    })
  })
})

describe('form', () => {
  test('action', () => {
    t({
      values: { url: '/categories/1/products' },
      templateHTML: `<form method="POST" data-action="url">
  <input name="product">
  <input name="price">
</form>`,
      expectedHTML: `<form method="POST" data-action="url" action="/categories/1/products">
  <input name="product">
  <input name="price">
</form>`,
      message: 'should add action attribute',
    })
    t({
      values: { url: '/categories/1/products' },
      templateHTML: `<form method="POST" data-action="url" action="/products">
  <input name="product">
  <input name="price">
</form>`,
      expectedHTML: `<form method="POST" data-action="url" action="/categories/1/products">
  <input name="product">
  <input name="price">
</form>`,
      message: 'should update action attribute',
    })
  })
})
