import {
  FileIcon,
  FolderClosedIcon,
  FoldersIcon,
  ImageIcon,
  LinkIcon,
  FileText,
  Table,
} from 'lucide-react'

import { Mentionable } from '../../../../types/mentionable'

export const getMentionableIcon = (mentionable: Mentionable) => {
  switch (mentionable.type) {
    case 'file':
      return FileIcon
    case 'folder':
      return FolderClosedIcon
    case 'vault':
      return FoldersIcon
    case 'current-file':
      return FileIcon
    case 'block':
      return FileIcon
    case 'url':
      return LinkIcon
    case 'image':
      return ImageIcon
    case 'document':
      if (mentionable.mimeType.includes('word')) {
        return FileText
      } else if (mentionable.mimeType.includes('sheet') || mentionable.mimeType.includes('excel')) {
        return Table
      } else {
        return FileIcon
      }
    default:
      return null
  }
}
