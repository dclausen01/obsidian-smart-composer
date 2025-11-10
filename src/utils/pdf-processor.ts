import * as pdfjsLib from 'pdfjs-dist'

// Configure PDF.js to work without worker for Obsidian compatibility
// This avoids CSP issues while maintaining functionality
pdfjsLib.GlobalWorkerOptions.workerPort = null

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
    const { maxPages, onProgress } = options

    try {
      // Load the PDF document
      const loadingTask = pdfjsLib.getDocument({
        data: arrayBuffer,
        useSystemFonts: true,
      })
      const pdf = await loadingTask.promise

      const numPages = maxPages ? Math.min(pdf.numPages, maxPages) : pdf.numPages
      const textContents: string[] = []

      // Extract text from each page
      for (let pageNum = 1; pageNum <= numPages; pageNum++) {
        onProgress?.(pageNum, numPages)

        const page = await pdf.getPage(pageNum)
        const textContent = await page.getTextContent()

        // Combine text items into a single string for this page
        const pageText = textContent.items
          .map((item) => {
            if ('str' in item) {
              return item.str
            }
            return ''
          })
          .join(' ')

        textContents.push(`--- Page ${pageNum} ---\n${pageText}`)
      }

      return textContents.join('\n\n')
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
      const loadingTask = pdfjsLib.getDocument({
        data: arrayBuffer,
      })
      const pdf = await loadingTask.promise
      const metadata = await pdf.getMetadata()

      // Type assertion for metadata.info
      const info = metadata.info as Record<string, unknown> | null

      return {
        numPages: pdf.numPages,
        title: info?.Title as string | undefined,
        author: info?.Author as string | undefined,
        subject: info?.Subject as string | undefined,
        creator: info?.Creator as string | undefined,
      }
    } catch (error) {
      throw new Error(
        `Failed to get PDF metadata: ${error instanceof Error ? error.message : 'Unknown error'}`,
      )
    }
  }
}
