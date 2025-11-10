// eslint-disable-next-line @typescript-eslint/no-var-requires
const pdfParse = require('pdf-parse')

export interface PDFProcessorOptions {
  maxPages?: number
  onProgress?: (current: number, total: number) => void
}

export class PDFProcessor {
  /**
   * Extract text content from a PDF file
   */
  static async extractText(
    arrayBuffer: ArrayBuffer,
    options: PDFProcessorOptions = {},
  ): Promise<string> {
    const { onProgress } = options

    try {
      onProgress?.(0, 100)
      
      // Convert ArrayBuffer to Uint8Array for pdf-parse
      const uint8Array = new Uint8Array(arrayBuffer)
      
      onProgress?.(30, 100)
      
      // Parse PDF
      const data = await pdfParse(uint8Array)
      
      onProgress?.(100, 100)
      
      return data.text
    } catch (error) {
      throw new Error(
        `Failed to extract text from PDF: ${error instanceof Error ? error.message : 'Unknown error'}`,
      )
    }
  }

  /**
   * Get metadata from a PDF file
   */
  static async getMetadata(arrayBuffer: ArrayBuffer): Promise<{
    numPages: number
    title?: string
    author?: string
    subject?: string
    creator?: string
  }> {
    try {
      // Convert ArrayBuffer to Uint8Array for pdf-parse
      const uint8Array = new Uint8Array(arrayBuffer)
      
      // Parse PDF
      const data = await pdfParse(uint8Array)
      
      return {
        numPages: data.numpages,
        title: data.info?.Title,
        author: data.info?.Author,
        subject: data.info?.Subject,
        creator: data.info?.Creator,
      }
    } catch (error) {
      throw new Error(
        `Failed to get PDF metadata: ${error instanceof Error ? error.message : 'Unknown error'}`,
      )
    }
  }
}
