import { useQuery } from '@tanstack/react-query'
import { $nodesOfType, LexicalEditor, SerializedEditorState } from 'lexical'
import {
  forwardRef,
  useCallback,
  useEffect,
  useImperativeHandle,
  useMemo,
  useRef,
  useState,
} from 'react'
import { Notice } from 'obsidian'

import { useApp } from '../../../contexts/app-context'
import {
  Mentionable,
  MentionableImage,
  MentionableDocument,
  SerializedMentionable,
} from '../../../types/mentionable'
import {
  deserializeMentionable,
  getMentionableKey,
  serializeMentionable,
} from '../../../utils/chat/mentionable'
import {
  createDocumentMentionable,
  documentProcessorManager,
} from '../../../utils/document-processing'
import { fileToMentionableImage } from '../../../utils/llm/image'
import { openMarkdownFile, readTFileContent } from '../../../utils/obsidian'
import { ObsidianMarkdown } from '../ObsidianMarkdown'

import { DocumentUploadButton } from './DocumentUploadButton'
import { ImageUploadButton } from './ImageUploadButton'
import LexicalContentEditable from './LexicalContentEditable'
import MentionableBadge from './MentionableBadge'
import { ModelSelect } from './ModelSelect'
import { MentionNode } from './plugins/mention/MentionNode'
import { NodeMutations } from './plugins/on-mutation/OnMutationPlugin'
import { SubmitButton } from './SubmitButton'
import ToolBadge from './ToolBadge'
import { VaultChatButton } from './VaultChatButton'

export type ChatUserInputRef = {
  focus: () => void
}

export type ChatUserInputProps = {
  initialSerializedEditorState: SerializedEditorState | null
  onChange: (content: SerializedEditorState) => void
  onSubmit: (content: SerializedEditorState, useVaultSearch?: boolean) => void
  onFocus: () => void
  mentionables: Mentionable[]
  setMentionables: (mentionables: Mentionable[]) => void
  autoFocus?: boolean
  addedBlockKey?: string | null
}

const ChatUserInput = forwardRef<ChatUserInputRef, ChatUserInputProps>(
  (
    {
      initialSerializedEditorState,
      onChange,
      onSubmit,
      onFocus,
      mentionables,
      setMentionables,
      autoFocus = false,
      addedBlockKey,
    },
    ref,
  ) => {
    const app = useApp()

    const editorRef = useRef<LexicalEditor | null>(null)
    const contentEditableRef = useRef<HTMLDivElement>(null)
    const containerRef = useRef<HTMLDivElement>(null)

    const [displayedMentionableKey, setDisplayedMentionableKey] = useState<
      string | null
    >(addedBlockKey ?? null)

    useEffect(() => {
      if (addedBlockKey) {
        setDisplayedMentionableKey(addedBlockKey)
      }
    }, [addedBlockKey])

    useImperativeHandle(ref, () => ({
      focus: () => {
        contentEditableRef.current?.focus()
      },
    }))

    const handleMentionNodeMutation = async (
      mutations: NodeMutations<MentionNode>,
    ) => {
      const destroyedMentionableKeys: string[] = []
      const addedMentionables: SerializedMentionable[] = []
      mutations.forEach((mutation) => {
        const mentionable = mutation.node.getMentionable()
        const mentionableKey = getMentionableKey(mentionable)

        if (mutation.mutation === 'destroyed') {
          const nodeWithSameMentionable = editorRef.current?.read(() =>
            $nodesOfType(MentionNode).find(
              (node) =>
                getMentionableKey(node.getMentionable()) === mentionableKey,
            ),
          )

          if (!nodeWithSameMentionable) {
            // remove mentionable only if it's not present in the editor state
            destroyedMentionableKeys.push(mentionableKey)
          }
        } else if (mutation.mutation === 'created') {
          if (
            mentionables.some(
              (m) =>
                getMentionableKey(serializeMentionable(m)) === mentionableKey,
            ) ||
            addedMentionables.some(
              (m) => getMentionableKey(m) === mentionableKey,
            )
          ) {
            // do nothing if mentionable is already added
            return
          }

          addedMentionables.push(mentionable)
        }
      })

      // Process document mentionables to extract their content
      const processedMentionables = await Promise.all(
        addedMentionables.map(async (m) => {
          const deserialized = deserializeMentionable(m, app)
          if (!deserialized) return null

          console.log('Processing mentionable:', deserialized.type, deserialized)

          // If it's a file mention with a supported document format, convert to document
          if (deserialized.type === 'file') {
            const supportedTypes = documentProcessorManager.getSupportedMimeTypes()
            // Get MIME type from file extension
            const ext = deserialized.file.extension.toLowerCase()
            const mimeTypeMap: Record<string, string> = {
              'pdf': 'application/pdf',
              'docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
              'doc': 'application/msword',
              'xlsx': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
              'xls': 'application/vnd.ms-excel',
            }
            const mimeType = mimeTypeMap[ext]
            
            if (mimeType && supportedTypes.includes(mimeType)) {
              try {
                // Read file and process it
                const arrayBuffer = await app.vault.adapter.readBinary(
                  deserialized.file.path,
                )
                const blob = new Blob([arrayBuffer])
                const file = new File([blob], deserialized.file.name, {
                  type: mimeType,
                })

                // Process the document to extract content
                const processed = await createDocumentMentionable(file)
                return processed
              } catch (error) {
                console.error('Failed to process document:', error)
                new Notice(
                  `Failed to process ${deserialized.file.name}: ${error instanceof Error ? error.message : 'Unknown error'}`,
                )
                // Return document with failed status
                return {
                  type: 'document' as const,
                  name: deserialized.file.name,
                  mimeType,
                  content: '',
                  originalFileName: deserialized.file.name,
                  processingStatus: 'failed' as const,
                  sourceFile: deserialized.file,
                }
              }
            }
          }

          // If it's a document with pending status and has a sourceFile, process it
          if (
            deserialized.type === 'document' &&
            deserialized.processingStatus === 'pending' &&
            deserialized.sourceFile
          ) {
            try {
              // Read file and process it
              const arrayBuffer = await app.vault.adapter.readBinary(
                deserialized.sourceFile.path,
              )
              const blob = new Blob([arrayBuffer])
              const file = new File([blob], deserialized.sourceFile.name, {
                type: deserialized.mimeType,
              })

              // Process the document to extract content
              const processed = await createDocumentMentionable(file)
              return processed
            } catch (error) {
              console.error('Failed to process document:', error)
              new Notice(
                `Failed to process ${deserialized.name}: ${error instanceof Error ? error.message : 'Unknown error'}`,
              )
              // Return document with failed status
              return {
                ...deserialized,
                processingStatus: 'failed' as const,
              }
            }
          }

          return deserialized
        }),
      )

      setMentionables(
        mentionables
          .filter(
            (m) =>
              !destroyedMentionableKeys.includes(
                getMentionableKey(serializeMentionable(m)),
              ),
          )
          .concat(processedMentionables.filter((v) => !!v)),
      )
      if (addedMentionables.length > 0) {
        setDisplayedMentionableKey(
          getMentionableKey(addedMentionables[addedMentionables.length - 1]),
        )
      }
    }

    const handleCreateImageMentionables = useCallback(
      (mentionableImages: MentionableImage[]) => {
        const newMentionableImages = mentionableImages.filter(
          (m) =>
            !mentionables.some(
              (mentionable) =>
                getMentionableKey(serializeMentionable(mentionable)) ===
                getMentionableKey(serializeMentionable(m)),
            ),
        )
        if (newMentionableImages.length === 0) return
        setMentionables([...mentionables, ...newMentionableImages])
        setDisplayedMentionableKey(
          getMentionableKey(
            serializeMentionable(
              newMentionableImages[newMentionableImages.length - 1],
            ),
          ),
        )
      },
      [mentionables, setMentionables],
    )

    const handleCreateDocumentMentionables = useCallback(
      (mentionableDocuments: MentionableDocument[]) => {
        const newMentionableDocuments = mentionableDocuments.filter(
          (m) =>
            !mentionables.some(
              (mentionable) =>
                getMentionableKey(serializeMentionable(mentionable)) ===
                getMentionableKey(serializeMentionable(m)),
            ),
        )
        if (newMentionableDocuments.length === 0) return
        setMentionables([...mentionables, ...newMentionableDocuments])
        setDisplayedMentionableKey(
          getMentionableKey(
            serializeMentionable(
              newMentionableDocuments[newMentionableDocuments.length - 1],
            ),
          ),
        )
      },
      [mentionables, setMentionables],
    )

    const handleMentionableDelete = (mentionable: Mentionable) => {
      const mentionableKey = getMentionableKey(
        serializeMentionable(mentionable),
      )
      setMentionables(
        mentionables.filter(
          (m) => getMentionableKey(serializeMentionable(m)) !== mentionableKey,
        ),
      )

      editorRef.current?.update(() => {
        $nodesOfType(MentionNode).forEach((node) => {
          if (getMentionableKey(node.getMentionable()) === mentionableKey) {
            node.remove()
          }
        })
      })
    }

    const handleUploadImages = async (images: File[]) => {
      const mentionableImages = await Promise.all(
        images.map((image) => fileToMentionableImage(image)),
      )
      handleCreateImageMentionables(mentionableImages)
    }

    const handleUploadDocuments = async (documents: File[]) => {
      try {
        const results = await Promise.all(
          documents.map(async (doc) => {
            try {
              return await createDocumentMentionable(doc)
            } catch (error) {
              const message =
                error instanceof Error ? error.message : 'Unknown error'
              new Notice(`Failed to process ${doc.name}: ${message}`)
              return null
            }
          }),
        )

        const successfulDocuments = results.filter(
          (doc): doc is MentionableDocument => doc !== null,
        )

        if (successfulDocuments.length > 0) {
          handleCreateDocumentMentionables(successfulDocuments)
        }

        if (successfulDocuments.length < documents.length) {
          new Notice(
            `${documents.length - successfulDocuments.length} document(s) failed to process`,
          )
        }
      } catch (error) {
        new Notice(
          'Failed to process documents: ' +
            (error instanceof Error ? error.message : 'Unknown error'),
        )
      }
    }

    const handleSubmit = (options: { useVaultSearch?: boolean } = {}) => {
      const content = editorRef.current?.getEditorState()?.toJSON()
      content && onSubmit(content, options.useVaultSearch)
    }

    return (
      <div className="smtcmp-chat-user-input-container" ref={containerRef}>
        <div className="smtcmp-chat-user-input-files">
          <ToolBadge />
          {mentionables.map((m) => (
            <MentionableBadge
              key={getMentionableKey(serializeMentionable(m))}
              mentionable={m}
              onDelete={() => handleMentionableDelete(m)}
              onClick={() => {
                const mentionableKey = getMentionableKey(
                  serializeMentionable(m),
                )
                if (
                  (m.type === 'current-file' ||
                    m.type === 'file' ||
                    m.type === 'block') &&
                  m.file &&
                  mentionableKey === displayedMentionableKey
                ) {
                  // open file on click again
                  openMarkdownFile(
                    app,
                    m.file.path,
                    m.type === 'block' ? m.startLine : undefined,
                  )
                } else {
                  setDisplayedMentionableKey(mentionableKey)
                }
              }}
              isFocused={
                getMentionableKey(serializeMentionable(m)) ===
                displayedMentionableKey
              }
            />
          ))}
        </div>

        <MentionableContentPreview
          displayedMentionableKey={displayedMentionableKey}
          mentionables={mentionables}
        />

        <LexicalContentEditable
          initialEditorState={(editor) => {
            if (initialSerializedEditorState) {
              editor.setEditorState(
                editor.parseEditorState(initialSerializedEditorState),
              )
            }
          }}
          editorRef={editorRef}
          contentEditableRef={contentEditableRef}
          onChange={onChange}
          onEnter={() => handleSubmit({ useVaultSearch: false })}
          onFocus={onFocus}
          onMentionNodeMutation={handleMentionNodeMutation}
          onCreateImageMentionables={handleCreateImageMentionables}
          autoFocus={autoFocus}
          plugins={{
            onEnter: {
              onVaultChat: () => {
                handleSubmit({ useVaultSearch: true })
              },
            },
            templatePopover: {
              anchorElement: containerRef.current,
            },
          }}
        />

        <div className="smtcmp-chat-user-input-controls">
          <div className="smtcmp-chat-user-input-controls__model-select-container">
            <ModelSelect />
          </div>
          <div className="smtcmp-chat-user-input-controls__buttons">
            <ImageUploadButton onUpload={handleUploadImages} />
            <DocumentUploadButton onUpload={handleUploadDocuments} />
            <SubmitButton onClick={() => handleSubmit()} />
            <VaultChatButton
              onClick={() => {
                handleSubmit({ useVaultSearch: true })
              }}
            />
          </div>
        </div>
      </div>
    )
  },
)

function MentionableContentPreview({
  displayedMentionableKey,
  mentionables,
}: {
  displayedMentionableKey: string | null
  mentionables: Mentionable[]
}) {
  const app = useApp()

  const displayedMentionable: Mentionable | null = useMemo(() => {
    return (
      mentionables.find(
        (m) =>
          getMentionableKey(serializeMentionable(m)) ===
          displayedMentionableKey,
      ) ?? null
    )
  }, [displayedMentionableKey, mentionables])

  const { data: displayFileContent } = useQuery({
    enabled:
      !!displayedMentionable &&
      ['file', 'current-file', 'block'].includes(displayedMentionable.type),
    queryKey: [
      'file',
      displayedMentionableKey,
      mentionables.map((m) => getMentionableKey(serializeMentionable(m))), // should be updated when mentionables change (especially on delete)
    ],
    queryFn: async () => {
      if (!displayedMentionable) return null
      if (
        displayedMentionable.type === 'file' ||
        displayedMentionable.type === 'current-file'
      ) {
        if (!displayedMentionable.file) return null
        return await readTFileContent(displayedMentionable.file, app.vault)
      } else if (displayedMentionable.type === 'block') {
        const fileContent = await readTFileContent(
          displayedMentionable.file,
          app.vault,
        )

        return fileContent
          .split('\n')
          .slice(
            displayedMentionable.startLine - 1,
            displayedMentionable.endLine,
          )
          .join('\n')
      }

      return null
    },
  })

  const displayImage: MentionableImage | null = useMemo(() => {
    return displayedMentionable?.type === 'image' ? displayedMentionable : null
  }, [displayedMentionable])

  const displayDocument: MentionableDocument | null = useMemo(() => {
    return displayedMentionable?.type === 'document' ? displayedMentionable : null
  }, [displayedMentionable])

  return displayFileContent ? (
    <div className="smtcmp-chat-user-input-file-content-preview">
      <ObsidianMarkdown content={displayFileContent} scale="xs" />
    </div>
  ) : displayImage ? (
    <div className="smtcmp-chat-user-input-file-content-preview">
      <img src={displayImage.data} alt={displayImage.name} />
    </div>
  ) : displayDocument ? (
    <div className="smtcmp-chat-user-input-file-content-preview">
      <div className="smtcmp-document-preview">
        <h4>📄 {displayDocument.name}</h4>
        <p className="smtcmp-document-preview-status">
          Status: {displayDocument.processingStatus}
        </p>
        <div className="smtcmp-document-preview-content">
          <ObsidianMarkdown content={displayDocument.content} scale="xs" />
        </div>
      </div>
    </div>
  ) : null
}

ChatUserInput.displayName = 'ChatUserInput'

export default ChatUserInput
