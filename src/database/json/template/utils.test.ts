import {
  extractTitle,
  plainTextToTemplateContent,
  stripFrontmatter,
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

describe('stripFrontmatter', () => {
  it('removes a leading YAML frontmatter block', () => {
    const input = `---\ntype: prompt\ntags: [a, b]\n---\n\n# Title\n\nBody`
    expect(stripFrontmatter(input)).toBe('\n# Title\n\nBody')
  })

  it('leaves content without frontmatter untouched', () => {
    const input = '# Title\n\nBody text'
    expect(stripFrontmatter(input)).toBe(input)
  })

  it('does not treat a horizontal rule as frontmatter', () => {
    const input = 'Some intro\n\n---\n\nMore text'
    expect(stripFrontmatter(input)).toBe(input)
  })

  it('normalizes CRLF line endings', () => {
    const input = '---\r\ntype: prompt\r\n---\r\nBody'
    expect(stripFrontmatter(input)).toBe('Body')
  })
})

describe('extractTitle', () => {
  it('returns the first level-1 heading', () => {
    expect(extractTitle('# Klausurerstellung Philosophie\n\nBody')).toBe(
      'Klausurerstellung Philosophie',
    )
  })

  it('ignores level-2 and deeper headings', () => {
    expect(extractTitle('## Beschreibung\n\nBody')).toBeNull()
  })

  it('returns null when there is no heading', () => {
    expect(extractTitle('Just some text')).toBeNull()
  })
})
