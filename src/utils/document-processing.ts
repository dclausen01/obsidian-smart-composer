import { Notice } from 'obsidian'
import { MentionableDocument } from '../types/mentionable'

export interface DocumentProcessingResult {
  success: boolean
  content?: string
  error?: string
  metadata?: {
    pageCount?: number
    wordCount?: number
    hasImages?: boolean
    extractedAt: number
  }
}

export interface DocumentProcessor {
  processFile(file: File, onProgress?: (progress: number) => void): Promise<DocumentProcessingResult>
  getSupportedMimeTypes(): string[]
  getDisplayName(): string
}

export class PDFProcessor implements DocumentProcessor {
  private static instance: PDFProcessor | null = null

  static getInstance(): PDFProcessor {
    if (!PDFProcessor.instance) {
      PDFProcessor.instance = new PDFProcessor()
    }
    return PDFProcessor.instance
  }

  getDisplayName(): string {
    return 'PDF Processor'
  }

  getSupportedMimeTypes(): string[] {
    return ['application/pdf']
  }

  async processFile(file: File, onProgress?: (progress: number) => void): Promise<DocumentProcessingResult> {
    try {
      onProgress?.(10)
      
      // TODO: Implement actual PDF parsing
      // For now, return a placeholder that indicates PDF processing is not yet implemented
      await new Promise(resolve => setTimeout(resolve, 1000)) // Simulate processing time
      onProgress?.(50)
      
      // Placeholder implementation - will be replaced with actual PDF parsing
      const placeholderContent = `[PDF Content Placeholder]

File: ${file.name}
Size: ${(file.size / 1024).toFixed(2)} KB
Type: ${file.type}

Note: This is a placeholder. Full PDF text extraction will be implemented in the next version.
Please ensure the file contains selectable text (not scanned images).
For scanned documents, OCR functionality will be added in a future update.`

      onProgress?.(100)
      
      return {
        success: true,
        content: placeholderContent,
        metadata: {
          extractedAt: Date.now(),
          hasImages: false // TODO: Detect images in PDF
        }
      }
    } catch (error) {
      console.error('PDF processing error:', error)
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred during PDF processing'
      }
    }
  }
}

export class DOCXProcessor implements DocumentProcessor {
  private static instance: DOCXProcessor | null = null

  static getInstance(): DOCXProcessor {
    if (!DOCXProcessor.instance) {
      DOCXProcessor.instance = new DOCXProcessor()
    }
    return DOCXProcessor.instance
  }

  getDisplayName(): string {
    return 'DOCX Processor'
  }

  getSupportedMimeTypes(): string[] {
    return [
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'application/msword'
    ]
  }

  async processFile(file: File, onProgress?: (progress: number) => void): Promise<DocumentProcessingResult> {
    try {
      onProgress?.(10)
      
      // TODO: Implement actual DOCX parsing
      await new Promise(resolve => setTimeout(resolve, 800))
      onProgress?.(50)
      
      const placeholderContent = `[DOCX Content Placeholder]

File: ${file.name}
Size: ${(file.size / 1024).toFixed(2)} KB
Type: ${file.type}

Note: This is a placeholder. Full DOCX text extraction will be implemented in the next version.`

      onProgress?.(100)
      
      return {
        success: true,
        content: placeholderContent,
        metadata: {
          extractedAt: Date.now()
        }
      }
    } catch (error) {
      console.error('DOCX processing error:', error)
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred during DOCX processing'
      }
    }
  }
}

export class TextProcessor implements DocumentProcessor {
  private static instance: TextProcessor | null = null

  static getInstance(): TextProcessor {
    if (!TextProcessor.instance) {
      TextProcessor.instance = new TextProcessor()
    }
    return TextProcessor.instance
  }

  getDisplayName(): string {
    return 'Text Processor'
  }

  getSupportedMimeTypes(): string[] {
    return [
      'text/plain',
      'text/markdown',
      'text/csv',
      'text/tab-separated-values'
    ]
  }

  async processFile(file: File, onProgress?: (progress: number) => void): Promise<DocumentProcessingResult> {
    try {
      onProgress?.(20)
      
      const content = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader()
        reader.onload = (e) => {
          onProgress?.(80)
          resolve(e.target?.result as string || '')
        }
        reader.onerror = () => reject(new Error('Failed to read file'))
        reader.readAsText(file)
      })
      
      onProgress?.(100)
      
      const wordCount = content.split(/\s+/).filter(word => word.length > 0).length
      
      return {
        success: true,
        content,
        metadata: {
          wordCount,
          extractedAt: Date.now()
        }
      }
    } catch (error) {
      console.error('Text processing error:', error)
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred during text processing'
      }
    }
  }
}

export class DocumentProcessorManager {
  private processors: DocumentProcessor[] = []

  constructor() {
    this.registerProcessor(PDFProcessor.getInstance())
    this.registerProcessor(DOCXProcessor.getInstance())
    this.registerProcessor(TextProcessor.getInstance())
  }

  registerProcessor(processor: DocumentProcessor): void {
    this.processors.push(processor)
  }

  getProcessorForFile(file: File): DocumentProcessor | null {
    return this.processors.find(processor => 
      processor.getSupportedMimeTypes().includes(file.type)
    ) || null
  }

  getAllProcessors(): DocumentProcessor[] {
    return [...this.processors]
  }

  getSupportedMimeTypes(): string[] {
    return this.processors.flatMap(processor => processor.getSupportedMimeTypes())
  }

  async processDocument(file: File, onProgress?: (progress: number) => void): Promise<DocumentProcessingResult> {
    const processor = this.getProcessorForFile(file)
    
    if (!processor) {
      return {
        success: false,
        error: `File type ${file.type} is not supported`
      }
    }

    return processor.processFile(file, onProgress)
  }
}

// Global instance
export const documentProcessorManager = new DocumentProcessorManager()

// Utility function to create MentionableDocument from file
export async function createDocumentMentionable(
  file: File, 
  onProgress?: (progress: number) => void
): Promise<MentionableDocument> {
  const processor = documentProcessorManager.getProcessorForFile(file)
  
  if (!processor) {
    throw new Error(`Unsupported file type: ${file.type}`)
  }

  const result = await processor.processFile(file, onProgress)
  
  if (!result.success) {
    throw new Error(result.error || 'Document processing failed')
  }

  return {
    type: 'document',
    name: file.name,
    mimeType: file.type,
    content: result.content || '',
    originalFileName: file.name,
    processingStatus: 'completed'
  }
}
