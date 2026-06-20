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
