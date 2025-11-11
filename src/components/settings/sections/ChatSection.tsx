import {
  RECOMMENDED_MODELS_FOR_APPLY,
  RECOMMENDED_MODELS_FOR_CHAT,
} from '../../../constants'
import { useSettings } from '../../../contexts/settings-context'
import { ObsidianDropdown } from '../../common/ObsidianDropdown'
import { ObsidianSetting } from '../../common/ObsidianSetting'
import { ObsidianTextArea } from '../../common/ObsidianTextArea'
import { ObsidianTextInput } from '../../common/ObsidianTextInput'
import { ObsidianToggle } from '../../common/ObsidianToggle'

export function ChatSection() {
  const { settings, setSettings } = useSettings()

  return (
    <div className="smtcmp-settings-section">
      <div className="smtcmp-settings-header">Chat</div>

      <ObsidianSetting
        name="Chat model"
        desc="Choose the model you want to use for chat."
      >
        <ObsidianDropdown
          value={settings.chatModelId}
          options={Object.fromEntries(
            settings.chatModels
              .filter(({ enable }) => enable ?? true)
              .map((chatModel) => [
                chatModel.id,
                `${chatModel.id}${RECOMMENDED_MODELS_FOR_CHAT.includes(chatModel.id) ? ' (Recommended)' : ''}`,
              ]),
          )}
          onChange={async (value) => {
            await setSettings({
              ...settings,
              chatModelId: value,
            })
          }}
        />
      </ObsidianSetting>

      <ObsidianSetting
        name="Apply model"
        desc="Choose the model you want to use for apply feature."
      >
        <ObsidianDropdown
          value={settings.applyModelId}
          options={Object.fromEntries(
            settings.chatModels
              .filter(({ enable }) => enable ?? true)
              .map((chatModel) => [
                chatModel.id,
                `${chatModel.id}${RECOMMENDED_MODELS_FOR_APPLY.includes(chatModel.id) ? ' (Recommended)' : ''}`,
              ]),
          )}
          onChange={async (value) => {
            await setSettings({
              ...settings,
              applyModelId: value,
            })
          }}
        />
      </ObsidianSetting>

      <ObsidianSetting
        name="System prompt"
        desc="This prompt will be added to the beginning of every chat."
        className="smtcmp-settings-textarea-header"
      />

      <ObsidianSetting className="smtcmp-settings-textarea">
        <ObsidianTextArea
          value={settings.systemPrompt}
          onChange={async (value: string) => {
            await setSettings({
              ...settings,
              systemPrompt: value,
            })
          }}
        />
      </ObsidianSetting>

      <ObsidianSetting
        name="Include current file"
        desc="Automatically include the content of your current file in chats."
      >
        <ObsidianToggle
          value={settings.chatOptions.includeCurrentFileContent}
          onChange={async (value) => {
            await setSettings({
              ...settings,
              chatOptions: {
                ...settings.chatOptions,
                includeCurrentFileContent: value,
              },
            })
          }}
        />
      </ObsidianSetting>

      <ObsidianSetting
        name="Enable tools"
        desc="Allow the AI to use MCP tools."
      >
        <ObsidianToggle
          value={settings.chatOptions.enableTools}
          onChange={async (value) => {
            await setSettings({
              ...settings,
              chatOptions: {
                ...settings.chatOptions,
                enableTools: value,
              },
            })
          }}
        />
      </ObsidianSetting>

      <ObsidianSetting
        name="Max auto tool requests"
        desc="Maximum number of consecutive tool calls that can be made automatically without user confirmation. Higher values can significantly increase costs as each tool call consumes additional tokens."
      >
        <ObsidianTextInput
          value={settings.chatOptions.maxAutoIterations.toString()}
          onChange={async (value) => {
            const parsedValue = parseInt(value)
            if (isNaN(parsedValue) || parsedValue < 1) {
              return
            }
            await setSettings({
              ...settings,
              chatOptions: {
                ...settings.chatOptions,
                maxAutoIterations: parsedValue,
              },
            })
          }}
        />
      </ObsidianSetting>

      <div className="smtcmp-settings-header">PDF & OCR</div>

      <ObsidianSetting
        name="Enable OCR"
        desc="Automatically apply OCR (text recognition) to PDFs with little or no text. This helps extract text from scanned documents and images."
      >
        <ObsidianToggle
          value={settings.ocrOptions.enabled}
          onChange={async (value) => {
            await setSettings({
              ...settings,
              ocrOptions: {
                ...settings.ocrOptions,
                enabled: value,
              },
            })
          }}
        />
      </ObsidianSetting>

      <ObsidianSetting
        name="OCR language"
        desc="Language to use for OCR text recognition. Choose the primary language of your documents."
      >
        <ObsidianDropdown
          value={settings.ocrOptions.language}
          options={{
            'eng': 'English',
            'deu': 'German (Deutsch)',
            'fra': 'French (Français)',
            'spa': 'Spanish (Español)',
            'ita': 'Italian (Italiano)',
            'por': 'Portuguese (Português)',
            'nld': 'Dutch (Nederlands)',
            'pol': 'Polish (Polski)',
            'rus': 'Russian (Русский)',
            'jpn': 'Japanese (日本語)',
            'chi_sim': 'Chinese Simplified (简体中文)',
            'chi_tra': 'Chinese Traditional (繁體中文)',
            'kor': 'Korean (한국어)',
            'ara': 'Arabic (العربية)',
            'hin': 'Hindi (हिन्दी)',
          }}
          onChange={async (value) => {
            await setSettings({
              ...settings,
              ocrOptions: {
                ...settings.ocrOptions,
                language: value,
              },
            })
          }}
        />
      </ObsidianSetting>
    </div>
  )
}
