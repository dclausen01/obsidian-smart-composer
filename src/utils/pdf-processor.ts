import { extractText, getDocumentProxy } from 'unpdf'

export interface PDFProcessorOptions {
  onProgress?: (status: string) => void
}

export class PDFProcessor {
  /**
   * Extract text content from a PDF file
   */
  static async extractText(
    arrayBuffer: ArrayBuffer,
    options: PDFProcessorOptions = {},
  ): Promise<{ content: string; pageCount: number }> {
    const { onProgress } = options

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
