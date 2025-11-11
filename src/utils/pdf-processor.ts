import { extractText, getDocumentProxy, renderPageAsImage } from 'unpdf'
import Tesseract from 'tesseract.js'

export interface PDFProcessorOptions {
  onProgress?: (status: string) => void
  enableOCR?: boolean
  ocrLanguage?: string
}

export class PDFProcessor {
  // Threshold for considering a PDF as "text-light" (characters per page)
  private static readonly TEXT_THRESHOLD_PER_PAGE = 100

  /**
   * Extract text content from a PDF file with hybrid OCR support
   */
  static async extractText(
    arrayBuffer: ArrayBuffer,
    options: PDFProcessorOptions = {},
  ): Promise<{ content: string; pageCount: number }> {
    const { onProgress, enableOCR = true, ocrLanguage = 'eng' } = options

    try {
      onProgress?.('Reading PDF file...')

      // Convert ArrayBuffer to Uint8Array
      const uint8Array = new Uint8Array(arrayBuffer)

      onProgress?.('Loading PDF document...')

      // Get PDF document proxy
      const pdf = await getDocumentProxy(uint8Array)

      onProgress?.('Extracting text...')

      // Extract text with merged pages
      const { text } = await extractText(pdf, {
        mergePages: true,
      })

      // Check if we have enough text or if OCR is needed
      const textPerPage = text.length / pdf.numPages
      const needsOCR = enableOCR && textPerPage < this.TEXT_THRESHOLD_PER_PAGE

      if (needsOCR) {
        onProgress?.('Low text detected, applying OCR...')
        
        // Perform OCR on all pages
        const ocrText = await this.performOCR(uint8Array, pdf.numPages, ocrLanguage, onProgress)
        
        // Combine original text with OCR text
        const combinedText = text.trim() ? `${text}\n\n${ocrText}` : ocrText
        
        onProgress?.('Complete')
        
        return {
          content: combinedText,
          pageCount: pdf.numPages,
        }
      }

      onProgress?.('Complete')

      return {
        content: text,
        pageCount: pdf.numPages,
      }
    } catch (error) {
      throw new Error(
        `Failed to extract text from PDF: ${error instanceof Error ? error.message : 'Unknown error'}`,
      )
    }
  }

  /**
   * Perform OCR on all pages of a PDF
   */
  private static async performOCR(
    pdfData: Uint8Array,
    pageCount: number,
    language: string,
    onProgress?: (status: string) => void,
  ): Promise<string> {
    const ocrResults: string[] = []

    for (let pageNum = 1; pageNum <= pageCount; pageNum++) {
      onProgress?.(`OCR: Processing page ${pageNum}/${pageCount}...`)

      try {
        // Render page as image
        const imageBuffer = await renderPageAsImage(pdfData, pageNum, {
          scale: 2, // Higher resolution for better OCR
        })

        // Convert ArrayBuffer to base64 for Tesseract
        const base64Image = this.arrayBufferToBase64(imageBuffer)
        const dataUrl = `data:image/png;base64,${base64Image}`

        // Perform OCR
        const result = await Tesseract.recognize(dataUrl, language, {
          logger: () => {}, // Suppress Tesseract logs
        })

        if (result.data.text.trim()) {
          ocrResults.push(`--- Page ${pageNum} ---\n${result.data.text.trim()}`)
        }
      } catch (error) {
        console.warn(`OCR failed for page ${pageNum}:`, error)
        ocrResults.push(`--- Page ${pageNum} ---\n[OCR failed for this page]`)
      }
    }

    return ocrResults.join('\n\n')
  }

  /**
   * Convert ArrayBuffer to base64 string
   */
  private static arrayBufferToBase64(buffer: ArrayBuffer): string {
    const bytes = new Uint8Array(buffer)
    let binary = ''
    for (let i = 0; i < bytes.byteLength; i++) {
      binary += String.fromCharCode(bytes[i])
    }
    return btoa(binary)
  }

  /**
   * Get PDF metadata (page count, etc.)
   */
  static async getMetadata(
    arrayBuffer: ArrayBuffer,
  ): Promise<{ numPages: number }> {
    try {
      const uint8Array = new Uint8Array(arrayBuffer)
      const pdf = await getDocumentProxy(uint8Array)
      return { numPages: pdf.numPages }
    } catch (error) {
      throw new Error(
        `Failed to get PDF metadata: ${error instanceof Error ? error.message : 'Unknown error'}`,
      )
    }
  }
}
