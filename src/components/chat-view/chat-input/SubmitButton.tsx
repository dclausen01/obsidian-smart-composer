import { CornerDownLeftIcon } from 'lucide-react'

export function SubmitButton({ 
  onClick, 
  disabled = false 
}: { 
  onClick: () => void
  disabled?: boolean
}) {
  return (
    <div 
      className={`smtcmp-chat-user-input-submit-button ${disabled ? 'smtcmp-disabled' : ''}`}
      onClick={disabled ? undefined : onClick}
      style={{ 
        opacity: disabled ? 0.5 : 1, 
        cursor: disabled ? 'not-allowed' : 'pointer' 
      }}
    >
      <div className="smtcmp-chat-user-input-submit-button-icons">
        <CornerDownLeftIcon size={12} />
      </div>
      <div>Chat</div>
    </div>
  )
}
