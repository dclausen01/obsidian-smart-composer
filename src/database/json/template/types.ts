import { SerializedLexicalNode } from 'lexical'

export const TEMPLATE_SCHEMA_VERSION = 1

export type Template = {
  id: string
  name: string
  content: { nodes: SerializedLexicalNode[] }
  createdAt: number
  updatedAt: number
  schemaVersion: number
  // Vault path of the markdown file this template was imported from, when it
  // originates from the "Prompts" folder sync. Absent for manually created
  // templates, which are never touched by the folder sync/cleanup.
  sourcePath?: string
}

export type TemplateMetadata = {
  id: string
  name: string
  schemaVersion: number
}
