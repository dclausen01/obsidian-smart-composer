import {
  plainTextToTemplateContent,
  templateContentToPlainText,
} from './utils'

describe('template content conversion', () => {
  const texts = [
    'Hello, world!',
    '',
    'Line one\nLine two\nLine three',
    'Trailing newline\n',
    '\nLeading newline',
    'Multiple\n\n\nblank lines',
    'Prompt with **markdown** _formatting_ and `code`',
    'Unicode 中文 日本語 한국어 🔥🚀',
    '- bullet one\n- bullet two\n  - nested',
    '# Heading\n\nParagraph text with a [link](https://example.com).',
  ]

  test.each(texts)('round-trips text losslessly: %j', (text) => {
    const content = plainTextToTemplateContent(text)
    expect(templateContentToPlainText(content)).toBe(text)
  })

  it('stores content as a single paragraph with linebreak nodes', () => {
    const content = plainTextToTemplateContent('a\nb')
    expect(content.nodes).toHaveLength(1)
    const paragraph = content.nodes[0] as unknown as {
      type: string
      children: unknown[]
    }
    expect(paragraph.type).toBe('paragraph')
    expect(paragraph.children).toHaveLength(3) // text, linebreak, text
  })
})
