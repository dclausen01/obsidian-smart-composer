import * as XLSX from 'xlsx'

export interface XLSXProcessorOptions {
  onProgress?: (status: string) => void
}

export class XLSXProcessor {
  /**
   * Extract text content from an XLSX file
   */
  static async extractText(
    arrayBuffer: ArrayBuffer,
    options: XLSXProcessorOptions = {},
  ): Promise<string> {
    const { onProgress } = options

    try {
      onProgress?.('Reading XLSX file...')
      
      // Read the workbook
      const workbook = XLSX.read(arrayBuffer, { type: 'array' })
      
      onProgress?.('Extracting text...')
      
      const sheets: string[] = []
      
      // Extract text from each sheet
      workbook.SheetNames.forEach((sheetName) => {
        const worksheet = workbook.Sheets[sheetName]
        
        // Convert sheet to CSV format for text extraction
        const csv = XLSX.utils.sheet_to_csv(worksheet)
        
        if (csv.trim()) {
          sheets.push(`--- Sheet: ${sheetName} ---\n${csv}`)
        }
      })
      
      onProgress?.('Complete')
      
      return sheets.join('\n\n')
    } catch (error) {
      throw new Error(
        `Failed to extract text from XLSX: ${error instanceof Error ? error.message : 'Unknown error'}`,
      )
    }
  }
}
