import {
  SerializedLexicalNode,
  SerializedParagraphNode,
  SerializedTextNode,
} from 'lexical'

import { Template } from './types'

/**
 * Convert a plain text string (e.g. the content of a markdown file) into the
 * Lexical serialized node structure used to store template content.
 *
 * The text is stored as a single paragraph where every line break in the
 * source text becomes a Lexical linebreak node. This keeps the conversion
 * loss-free: running the result back through {@link templateContentToPlainText}
 * reproduces the original text exactly, which is what change detection relies
 * on.
 */
export function plainTextToTemplateContent(text: string): Template['content'] {
  const lines = text.split('\n')
  const children: SerializedLexicalNode[] = []

  lines.forEach((line, index) => {
    if (index > 0) {
      children.push({ type: 'linebreak', version: 1 })
    }
    const textNode: SerializedTextNode = {
      detail: 0,
      format: 0,
      mode: 'normal',
      style: '',
      text: line,
      type: 'text',
      version: 1,
    }
    children.push(textNode)
  })

  const paragraph: SerializedParagraphNode = {
    children,
    direction: 'ltr',
    format: '',
    indent: 0,
    type: 'paragraph',
    version: 1,
    textFormat: 0,
    textStyle: '',
  }

  return { nodes: [paragraph] }
}

/**
 * Extract the plain text representation of stored template content. Used to
 * compare an existing template against the current content of a markdown file.
 */
export function templateContentToPlainText(
  content: Template['content'],
): string {
  return content.nodes.map(serializedNodeToPlainText).join('')
}

/**
 * Remove a leading YAML frontmatter block (`---\n ... \n---`) from a markdown
 * string, if present. The frontmatter holds note metadata (type, tags, ...) and
 * should not become part of the prompt text that is sent to the model.
 */
export function stripFrontmatter(text: string): string {
  const normalized = text.replace(/\r\n/g, '\n')
  const match = normalized.match(/^---\n[\s\S]*?\n---[ \t]*(?:\n|$)/)
  return match ? normalized.slice(match[0].length) : normalized
}

/**
 * Return the text of the first top-level markdown heading (`# Title`), or null
 * if the text does not start a line with a single `#` heading. Used to derive a
 * human-friendly template name from a prompt file.
 */
export function extractTitle(text: string): string | null {
  const match = text.match(/^#[ \t]+(.+?)[ \t]*$/m)
  return match ? match[1].trim() : null
}

function serializedNodeToPlainText(node: SerializedLexicalNode): string {
  if ('children' in node) {
    return (node as { children: SerializedLexicalNode[] }).children
      .map(serializedNodeToPlainText)
      .join('')
  }
  if (node.type === 'linebreak') {
    return '\n'
  }
  if ('text' in node && typeof (node as SerializedTextNode).text === 'string') {
    return (node as SerializedTextNode).text
  }
  return ''
}
