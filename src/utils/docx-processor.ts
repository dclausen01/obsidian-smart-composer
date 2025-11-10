import mammoth from 'mammoth'

export interface DOCXProcessorOptions {
  onProgress?: (status: string) => void
}

export class DOCXProcessor {
  /**
   * Extract text content from a DOCX file
   */
  static async extractText(
    arrayBuffer: ArrayBuffer,
    options: DOCXProcessorOptions = {},
  ): Promise<string> {
    const { onProgress } = options

    try {
      onProgress?.('Reading DOCX file...')

      // Convert ArrayBuffer to Buffer for mammoth
      const buffer = Buffer.from(arrayBuffer)

      onProgress?.('Extracting text...')

      // Extract text from DOCX
      const result = await mammoth.extractRawText({ buffer })

      if (result.messages.length > 0) {
        console.warn('DOCX extraction warnings:', result.messages)
      }

      onProgress?.('Complete')

      return result.value
    } catch (error) {
      throw new Error(
        `Failed to extract text from DOCX: ${error instanceof Error ? error.message : 'Unknown error'}`,
      )
    }
  }

  /**
   * Extract text with HTML formatting from a DOCX file
   */
  static async extractHTML(
    arrayBuffer: ArrayBuffer,
    options: DOCXProcessorOptions = {},
  ): Promise<string> {
    const { onProgress } = options

    try {
      onProgress?.('Reading DOCX file...')

      // Convert ArrayBuffer to Buffer for mammoth
      const buffer = Buffer.from(arrayBuffer)

      onProgress?.('Converting to HTML...')

      // Convert DOCX to HTML
      const result = await mammoth.convertToHtml({ buffer })

      if (result.messages.length > 0) {
        console.warn('DOCX conversion warnings:', result.messages)
      }

      onProgress?.('Complete')

      return result.value
    } catch (error) {
      throw new Error(
        `Failed to convert DOCX to HTML: ${error instanceof Error ? error.message : 'Unknown error'}`,
      )
    }
  }
}
