import fuzzysort from 'fuzzysort'
import { App, TFile, TFolder } from 'obsidian'

import {
  MentionableFile,
  MentionableFolder,
  MentionableVault,
  MentionableDocument,
} from '../types/mentionable'

import { calculateFileDistance, getOpenFiles } from './obsidian'

export type SearchableMentionable =
  | MentionableFile
  | MentionableFolder
  | MentionableVault
  | MentionableDocument

type VaultSearchItem = {
  type: 'vault'
  path: string
}

type FileWithMetadata = {
  type: 'file'
  path: string
  name: string
  file: TFile
  opened: boolean
  distance: number | null
  daysSinceLastModified: number
}

type FolderWithMetadata = {
  type: 'folder'
  path: string
  name: string
  folder: TFolder
  distance: number | null
}

type DocumentWithMetadata = {
  type: 'document'
  path: string
  name: string
  file: TFile
  distance: number | null
  daysSinceLastModified: number
}

type SearchItem = FolderWithMetadata | FileWithMetadata | VaultSearchItem | DocumentWithMetadata

function scoreFnWithBoost({
  searchItem,
  pathScore,
  nameScore,
}: {
  searchItem: SearchItem
  pathScore: number
  nameScore: number
}): number {
  const score = Math.max(pathScore, nameScore)

  let boost = 1
  switch (searchItem.type) {
    case 'file': {
      const { opened, distance, daysSinceLastModified } = searchItem

      // Boost for open files
      if (opened) boost = Math.max(boost, 3)

      // Boost for recently modified files
      if (daysSinceLastModified < 30) {
        const recentBoost = 1 + 2 / (daysSinceLastModified + 2)
        boost = Math.max(boost, recentBoost)
      }

      // Boost for nearby files
      if (distance !== null && distance > 0 && distance <= 5) {
        const nearbyBoost = 1 + 0.5 / Math.max(distance - 1, 1)
        boost = Math.max(boost, nearbyBoost)
      }

      break
    }
    case 'folder': {
      const { distance } = searchItem

      // Boost for nearby folders
      if (distance !== null && distance > 0 && distance <= 5) {
        const nearbyBoost = 1 + 0.5 / Math.max(distance - 1, 1)
        boost = Math.max(boost, nearbyBoost)
      }

      break
    }
    case 'document': {
      const { distance, daysSinceLastModified } = searchItem

      // Boost for recently modified documents
      if (daysSinceLastModified < 30) {
        const recentBoost = 1 + 2 / (daysSinceLastModified + 2)
        boost = Math.max(boost, recentBoost)
      }

      // Boost for nearby documents
      if (distance !== null && distance > 0 && distance <= 5) {
        const nearbyBoost = 1 + 0.5 / Math.max(distance - 1, 1)
        boost = Math.max(boost, nearbyBoost)
      }

      break
    }
    case 'vault': {
      if (score === 1) {
        boost = 3
      }

      break
    }
  }

  // Normalize the boost
  const normalizedScore =
    boost > 1 ? Math.log(boost * score + 1) / Math.log(boost + 1) : score
  return normalizedScore
}

function getEmptyQueryResult(
  searchItems: SearchItem[],
  limit: number,
): SearchableMentionable[] {
  // Sort files based on a custom scoring function
  const sortedFiles = searchItems.sort((a, b) => {
    const scoreA = scoreFnWithBoost({
      searchItem: a,
      pathScore: 0.5, // Use 0.5 as a base score
      nameScore: 0.5,
    })
    const scoreB = scoreFnWithBoost({
      searchItem: b,
      pathScore: 0.5,
      nameScore: 0.5,
    })
    return scoreB - scoreA // Sort in descending order
  })

  // Return only the top 'limit' files
  return sortedFiles
    .slice(0, limit)
    .map((item) => searchItemToMentionable(item))
}

export function fuzzySearch(app: App, query: string): SearchableMentionable[] {
  const currentFile = app.workspace.getActiveFile()
  const openFiles = getOpenFiles(app)

  // Support markdown, office documents, PDFs, and other common file types
  const allSupportedFiles = app.vault.getFiles().filter((file) => {
    const extension = file.extension.toLowerCase()
    return ['md', 'pdf', 'docx', 'doc', 'xlsx', 'xls', 'txt', 'csv'].includes(extension)
  })

  const allFilesWithMetadata: SearchItem[] = allSupportedFiles.map((file) => {
    const extension = file.extension.toLowerCase()
    const isDocumentType = ['pdf', 'docx', 'doc', 'xlsx', 'xls'].includes(extension)
    
    if (isDocumentType) {
      return {
        type: 'document' as const,
        path: file.path,
        name: file.name,
        file,
        distance: currentFile
          ? currentFile === file
            ? null
            : calculateFileDistance(currentFile, file)
          : null,
        daysSinceLastModified:
          (Date.now() - file.stat.mtime) / (1000 * 60 * 60 * 24),
      }
    } else {
      return {
        type: 'file' as const,
        path: file.path,
        name: file.name,
        file,
        opened: openFiles.some((f) => f.path === file.path),
        distance: currentFile
          ? currentFile === file
            ? null
            : calculateFileDistance(currentFile, file)
          : null,
        daysSinceLastModified:
          (Date.now() - file.stat.mtime) / (1000 * 60 * 60 * 24),
      }
    }
  })

  const allFolders = app.vault.getAllFolders()
  const allFoldersWithMetadata: SearchItem[] = allFolders.map((folder) => ({
    type: 'folder' as const,
    path: folder.path,
    name: folder.name,
    folder,
    distance: currentFile ? calculateFileDistance(currentFile, folder) : null,
  }))

  const vaultItem: VaultSearchItem = {
    type: 'vault',
    path: 'vault',
  }

  const searchItems: SearchItem[] = [
    ...allFilesWithMetadata,
    ...allFoldersWithMetadata,
    vaultItem,
  ]

  if (!query) {
    return getEmptyQueryResult(searchItems, 20)
  }

  const results = fuzzysort.go(query, searchItems, {
    keys: ['path', 'name'],
    threshold: 0.2,
    limit: 20,
    all: true,
    scoreFn: (result) =>
      scoreFnWithBoost({
        searchItem: result.obj,
        pathScore: result[0].score,
        nameScore: result[1].score,
      }),
  })

  return results.map((result) => searchItemToMentionable(result.obj))
}

function searchItemToMentionable(item: SearchItem): SearchableMentionable {
  switch (item.type) {
    case 'file':
      return {
        type: 'file',
        file: item.file,
      }
    case 'folder':
      return {
        type: 'folder',
        folder: item.folder,
      }
    case 'vault':
      return {
        type: 'vault',
      }
    case 'document':
      return {
        type: 'document',
        name: item.file.name,
        mimeType: getMimeTypeForFile(item.file),
        content: '', // Will be populated when user selects
        originalFileName: item.file.name,
        processingStatus: 'pending' as const,
        sourceFile: item.file,
      }
  }
}

function getMimeTypeForFile(file: TFile): string {
  const extension = file.extension.toLowerCase()
  switch (extension) {
    case 'pdf':
      return 'application/pdf'
    case 'doc':
    case 'docx':
      return 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
    case 'xls':
    case 'xlsx':
      return 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    case 'txt':
      return 'text/plain'
    case 'csv':
      return 'text/csv'
    case 'md':
    default:
      return 'text/markdown'
  }
}
