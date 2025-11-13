import { FileText } from 'lucide-react'

import { documentProcessorManager } from '../../../utils/document-processing'

export function DocumentUploadButton({
  onUpload,
}: {
  onUpload: (files: File[]) => void
}) {
  const supportedTypes = documentProcessorManager.getSupportedMimeTypes()
  
  // Create a string of accepted file types for the accept attribute
  const acceptAttribute = supportedTypes.join(',')
  
  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files ?? [])
    if (files.length > 0) {
      onUpload(files)
    }
    // Clear the input so the same file can be selected again
    event.target.value = ''
  }

  return (
    <label className="smtcmp-chat-user-input-submit-button">
      <input
        type="file"
        accept={acceptAttribute}
        multiple
        onChange={handleFileChange}
        style={{ display: 'none' }}
      />
      <div className="smtcmp-chat-user-input-submit-button-icons">
        <FileText size={12} />
      </div>
      <div>Docs</div>
    </label>
  )
}
