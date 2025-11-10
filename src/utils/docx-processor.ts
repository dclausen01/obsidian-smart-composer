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

      // mammoth expects an arrayBuffer property
      const result = await mammoth.extractRawText({ arrayBuffer })

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
      onProgress?.('Converting to HTML...')

      // mammoth expects an arrayBuffer property
      const result = await mammoth.convertToHtml({ arrayBuffer })

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
