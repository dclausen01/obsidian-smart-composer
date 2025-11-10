import * as pdfjsLib from 'pdfjs-dist'

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
      onProgress?.(0, 100)
      
      // Load PDF without worker to avoid CSP issues
      const loadingTask = pdfjsLib.getDocument({
        data: arrayBuffer,
        useSystemFonts: true,
        disableWorker: true, // Disable worker completely
      } as any)
      
      onProgress?.(20, 100)
      
      const pdf = await loadingTask.promise
      const numPages = maxPages ? Math.min(pdf.numPages, maxPages) : pdf.numPages
      const textContents: string[] = []

      // Extract text from each page
      for (let pageNum = 1; pageNum <= numPages; pageNum++) {
        const progress = 20 + (pageNum / numPages) * 70
        onProgress?.(Math.round(progress), 100)

        const page = await pdf.getPage(pageNum)
        const textContent = await page.getTextContent()

        // Combine text items into a single string for this page
        const pageText = textContent.items
          .map((item: any) => {
            if ('str' in item) {
              return item.str
            }
            return ''
          })
          .join(' ')

        textContents.push(`--- Page ${pageNum} ---\n${pageText}`)
      }

      onProgress?.(100, 100)
      
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
        disableWorker: true, // Disable worker completely
      } as any)
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
