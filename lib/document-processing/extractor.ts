import * as pdfParse from 'pdf-parse'
import mammoth from 'mammoth'
import { createWorker } from 'tesseract.js'

export interface ProcessedDocument {
  text: string
  pageCount?: number
  wordCount: number
  hasScannedPages: boolean
  metadata?: Record<string, any>
}

export interface ClauseStructure {
  clause_number?: string
  clause_type: string
  heading?: string
  content: string
  start_char: number
  end_char: number
  page_number?: number
  order_index: number
}

/**
 * Extract text from PDF file
 */
export async function extractTextFromPDF(buffer: Buffer): Promise<ProcessedDocument> {
  try {
    const data = await (pdfParse as any).default(buffer)
    
    const text = data.text
    const wordCount = text.split(/\s+/).filter((word: string) => word.length > 0).length
    
    // Simple heuristic: if text is very sparse relative to page count, likely scanned
    const avgWordsPerPage = wordCount / data.numpages
    const hasScannedPages = avgWordsPerPage < 50 // Threshold: less than 50 words per page

    return {
      text,
      pageCount: data.numpages,
      wordCount,
      hasScannedPages,
      metadata: data.info,
    }
  } catch (error) {
    console.error('PDF extraction error:', error)
    throw new Error('Failed to extract text from PDF')
  }
}

/**
 * Extract text from DOCX file
 */
export async function extractTextFromDOCX(buffer: Buffer): Promise<ProcessedDocument> {
  try {
    const result = await mammoth.extractRawText({ buffer })
    const text = result.value
    const wordCount = text.split(/\s+/).filter((word: string) => word.length > 0).length

    return {
      text,
      wordCount,
      hasScannedPages: false, // DOCX files are native text
    }
  } catch (error) {
    console.error('DOCX extraction error:', error)
    throw new Error('Failed to extract text from DOCX')
  }
}

/**
 * Perform OCR on scanned PDF (simplified for MVP)
 */
export async function performOCR(buffer: Buffer): Promise<string> {
  try {
    const worker = await createWorker('eng')
    
    // In production, you'd convert PDF pages to images first
    // For MVP, we'll return a placeholder
    // This is a complex process requiring pdf-to-image conversion
    
    await worker.terminate()
    
    return 'OCR functionality will be implemented in full version. For now, please upload native PDF or DOCX files.'
  } catch (error) {
    console.error('OCR error:', error)
    throw new Error('OCR processing failed')
  }
}

/**
 * Parse document structure into clauses
 * Detects headings, numbered sections, and paragraphs
 */
export function parseDocumentStructure(text: string): ClauseStructure[] {
  const clauses: ClauseStructure[] = []
  const lines = text.split('\n')
  
  let currentPosition = 0
  let clauseIndex = 0

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim()
    if (!line) {
      currentPosition += lines[i].length + 1
      continue
    }

    // Detect numbered clauses (e.g., "1.", "1.1", "Art. 5", "Article 10")
    const numberedMatch = line.match(/^(\d+\.(?:\d+\.)*|\bArt(?:icle)?\.?\s*\d+)/i)
    
    // Detect headings (all caps, or short lines with specific patterns)
    const isHeading = line.length < 100 && (
      line === line.toUpperCase() ||
      /^[A-Z][A-Z\s]+$/.test(line)
    )

    let clauseType = 'paragraph'
    let clauseNumber = undefined
    let heading = undefined

    if (numberedMatch) {
      clauseNumber = numberedMatch[1]
      clauseType = 'article'
      heading = line.replace(numberedMatch[0], '').trim()
    } else if (isHeading) {
      clauseType = 'heading'
      heading = line
    }

    // Gather content for this clause (current line + following non-heading lines)
    let content = line
    let j = i + 1
    while (j < lines.length && lines[j].trim() && !lines[j].match(/^(\d+\.|\bArt)/i)) {
      content += '\n' + lines[j].trim()
      j++
    }

    const startChar = currentPosition
    const endChar = startChar + content.length

    clauses.push({
      clause_number: clauseNumber,
      clause_type: clauseType,
      heading: heading,
      content: content,
      start_char: startChar,
      end_char: endChar,
      order_index: clauseIndex++,
    })

    currentPosition = endChar + 1
    i = j - 1 // Move past processed lines
  }

  return clauses
}

/**
 * Detect contract type from content
 */
export function detectContractType(text: string): string {
  const lowerText = text.toLowerCase()

  if (lowerText.includes('employment') || lowerText.includes('angajare')) {
    return 'employment'
  }
  if (lowerText.includes('nda') || lowerText.includes('confidentiality') || lowerText.includes('confidențialitate')) {
    return 'nda'
  }
  if (lowerText.includes('license') || lowerText.includes('licență')) {
    return 'license'
  }
  if (lowerText.includes('software development') || lowerText.includes('dezvoltare software')) {
    return 'software_development'
  }
  if (lowerText.includes('lease') || lowerText.includes('închiriere')) {
    return 'lease'
  }
  if (lowerText.includes('purchase') || lowerText.includes('vânzare-cumpărare')) {
    return 'purchase_agreement'
  }
  if (lowerText.includes('partnership') || lowerText.includes('parteneriat')) {
    return 'partnership'
  }
  if (lowerText.includes('loan') || lowerText.includes('credit')) {
    return 'loan'
  }

  // Check for B2B vs B2C indicators
  if (lowerText.includes('consumer') || lowerText.includes('consumator')) {
    return 'b2c'
  }
  if (lowerText.includes('services') || lowerText.includes('servicii')) {
    return 'b2b_services'
  }

  return 'other'
}
