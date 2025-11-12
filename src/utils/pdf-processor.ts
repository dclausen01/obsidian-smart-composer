import { loadPdfJs } from 'obsidian'

export interface PDFProcessorOptions {
  onProgress?: (status: string) => void
  enableOCR?: boolean
  ocrLanguage?: string
}

export class PDFProcessor {
  // Threshold for considering a PDF as "text-light" (characters per page)
  // Set to 2000 to detect scanned PDFs - typical text PDFs have 3000+ chars/page
  private static readonly TEXT_THRESHOLD_PER_PAGE = 2000
  private static tesseractModule: any = null

  /**
   * Lazy load tesseract.js module only when needed
   */
  private static async initializeTesseract(): Promise<void> {
    if (this.tesseractModule) return

    try {
      this.tesseractModule = await import('tesseract.js')
    } catch (error) {
      throw new Error(
        `Failed to load Tesseract module: ${error instanceof Error ? error.message : 'Unknown error'}`,
      )
    }
  }

  /**
   * Extract text content from a PDF file with hybrid OCR support
   */
  static async extractText(
    arrayBuffer: ArrayBuffer,
    options: PDFProcessorOptions = {},
  ): Promise<{ content: string; pageCount: number }> {
    const { onProgress, enableOCR = true, ocrLanguage = 'eng' } = options

    try {
      onProgress?.('Loading PDF.js...')
      
      // Load Obsidian's PDF.js
      const pdfjsLib = await loadPdfJs()
      
      onProgress?.('Reading PDF file...')

      // Convert ArrayBuffer to Uint8Array
      const uint8Array = new Uint8Array(arrayBuffer)

      onProgress?.('Loading PDF document...')

      // Load PDF document using PDF.js API
      const loadingTask = pdfjsLib.getDocument({ data: uint8Array })
      const pdf = await loadingTask.promise

      onProgress?.('Extracting text...')

      // Extract text from all pages
      let text = ''
      for (let i = 1; i <= pdf.numPages; i++) {
        const page = await pdf.getPage(i)
        const textContent = await page.getTextContent()
        const pageText = textContent.items
          .map((item: any) => item.str)
          .join(' ')
        text += pageText + '\n'
      }

      // Check if we have enough text or if OCR is needed
      const textPerPage = text.trim().length / pdf.numPages
      const needsOCR = enableOCR && textPerPage < this.TEXT_THRESHOLD_PER_PAGE
      
      // Debug information
      console.log(`PDF Text extraction: ${text.trim().length} chars total, ${textPerPage.toFixed(1)} per page, OCR needed: ${needsOCR}`)

      if (needsOCR) {
        onProgress?.('Low text detected, applying OCR...')
        
        // Perform OCR on all pages
        const ocrText = await this.performOCR(
          pdfjsLib,
          pdf,
          ocrLanguage,
          onProgress,
        )
        
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
    pdfjsLib: any,
    pdf: any,
    language: string,
    onProgress?: (status: string) => void,
  ): Promise<string> {
    // Initialize Tesseract
    await this.initializeTesseract()
    const Tesseract = this.tesseractModule.default || this.tesseractModule

    const ocrResults: string[] = []

    for (let pageNum = 1; pageNum <= pdf.numPages; pageNum++) {
      onProgress?.(`OCR: Processing page ${pageNum}/${pdf.numPages}...`)

      try {
        // Get the page
        const page = await pdf.getPage(pageNum)
        
        // Get viewport at scale 2 for better OCR quality
        const viewport = page.getViewport({ scale: 2 })
        
        // Create a canvas to render the page
        const canvas = document.createElement('canvas')
        const context = canvas.getContext('2d')
        
        if (!context) {
          throw new Error('Failed to get canvas context')
        }
        
        canvas.width = viewport.width
        canvas.height = viewport.height
        
        // Render page to canvas
        await page.render({
          canvasContext: context,
          viewport: viewport,
        }).promise
        
        // Convert canvas to data URL for Tesseract
        const dataUrl = canvas.toDataURL('image/png')

        // Perform OCR
        const result = await Tesseract.recognize(dataUrl, language, {
          logger: () => {}, // Suppress Tesseract logs
        })

        if (result.data.text.trim()) {
          ocrResults.push(`--- Page ${pageNum} ---\n${result.data.text.trim()}`)
        }

        // Allow browser to process other tasks
        await new Promise(resolve => setTimeout(resolve, 10))
      } catch (error) {
        console.warn(`OCR failed for page ${pageNum}:`, error)
        ocrResults.push(`--- Page ${pageNum} ---\n[OCR failed for this page]`)
      }
    }

    return ocrResults.join('\n\n')
  }

  /**
   * Get PDF metadata (page count, etc.)
   */
  static async getMetadata(
    arrayBuffer: ArrayBuffer,
  ): Promise<{ numPages: number }> {
    try {
      // Load Obsidian's PDF.js
      const pdfjsLib = await loadPdfJs()
      
      const uint8Array = new Uint8Array(arrayBuffer)
      const loadingTask = pdfjsLib.getDocument({ data: uint8Array })
      const pdf = await loadingTask.promise

      return { numPages: pdf.numPages }
    } catch (error) {
      throw new Error(
        `Failed to get PDF metadata: ${error instanceof Error ? error.message : 'Unknown error'}`,
      )
    }
  }
}
