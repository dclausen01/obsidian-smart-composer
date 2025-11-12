import { MentionableDocument } from '../types/mentionable'
import { SmartComposerSettings } from '../settings/schema/setting.types'

import { DOCXProcessor as DOCXLib } from './docx-processor'
import { PDFProcessor as PDFLib } from './pdf-processor'
import { XLSXProcessor as XLSXLib } from './xlsx-processor'

export interface DocumentProcessingResult {
  success: boolean
  content?: string
  error?: string
  metadata?: {
    pageCount?: number
    wordCount?: number
    sheetCount?: number
    hasImages?: boolean
    extractedAt: number
  }
}

export interface DocumentProcessor {
  processFile(
    file: File, 
    onProgress?: (progress: number) => void,
    settings?: SmartComposerSettings
  ): Promise<DocumentProcessingResult>
  getSupportedMimeTypes(): string[]
  getDisplayName(): string
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
      
      // Read file as ArrayBuffer
      const arrayBuffer = await file.arrayBuffer()
      onProgress?.(30)
      
      // Extract text
      const content = await DOCXLib.extractText(arrayBuffer, {
        onProgress: (status) => {
          if (status.includes('Reading')) onProgress?.(40)
          else if (status.includes('Extracting')) onProgress?.(60)
          else if (status.includes('Complete')) onProgress?.(90)
        }
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
      console.error('DOCX processing error:', error)
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred during DOCX processing'
      }
    }
  }
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

  async processFile(
    file: File, 
    onProgress?: (progress: number) => void,
    settings?: SmartComposerSettings
  ): Promise<DocumentProcessingResult> {
    try {
      onProgress?.(10)
      
      // Read file as ArrayBuffer
      const arrayBuffer = await file.arrayBuffer()
      onProgress?.(30)
      
      // Extract text and get page count in one go
      const { content, pageCount } = await PDFLib.extractText(arrayBuffer, {
        enableOCR: settings?.ocrOptions.enabled ?? true,
        ocrLanguage: settings?.ocrOptions.language ?? 'eng',
        onProgress: (status) => {
          if (status.includes('Reading')) onProgress?.(40)
          else if (status.includes('Loading')) onProgress?.(60)
          else if (status.includes('Extracting')) onProgress?.(70)
          else if (status.includes('Low text detected')) onProgress?.(75)
          else if (status.includes('OCR:')) {
            // Extract page numbers for progress calculation
            const match = status.match(/OCR: Processing page (\d+)\/(\d+)/)
            if (match) {
              const current = parseInt(match[1])
              const total = parseInt(match[2])
              const ocrProgress = 75 + Math.floor((current / total) * 20) // 75-95% range
              onProgress?.(ocrProgress)
            } else {
              onProgress?.(80)
            }
          }
          else if (status.includes('Complete')) onProgress?.(100)
        }
      })
      
      onProgress?.(100)
      
      return {
        success: true,
        content,
        metadata: {
          pageCount,
          extractedAt: Date.now()
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

export class XLSXProcessor implements DocumentProcessor {
  private static instance: XLSXProcessor | null = null

  static getInstance(): XLSXProcessor {
    if (!XLSXProcessor.instance) {
      XLSXProcessor.instance = new XLSXProcessor()
    }
    return XLSXProcessor.instance
  }

  getDisplayName(): string {
    return 'XLSX Processor'
  }

  getSupportedMimeTypes(): string[] {
    return [
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'application/vnd.ms-excel'
    ]
  }

  async processFile(file: File, onProgress?: (progress: number) => void): Promise<DocumentProcessingResult> {
    try {
      onProgress?.(10)
      
      // Read file as ArrayBuffer
      const arrayBuffer = await file.arrayBuffer()
      onProgress?.(30)
      
      // Extract text
      const content = await XLSXLib.extractText(arrayBuffer, {
        onProgress: (status) => {
          if (status.includes('Reading')) onProgress?.(40)
          else if (status.includes('Extracting')) onProgress?.(60)
          else if (status.includes('Complete')) onProgress?.(90)
        }
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
      console.error('XLSX processing error:', error)
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred during XLSX processing'
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
    this.registerProcessor(XLSXProcessor.getInstance())
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
  onProgress?: (progress: number) => void,
  settings?: SmartComposerSettings
): Promise<MentionableDocument> {
  const processor = documentProcessorManager.getProcessorForFile(file)
  
  if (!processor) {
    throw new Error(`Unsupported file type: ${file.type}`)
  }

  const result = await processor.processFile(file, onProgress, settings)
  
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
