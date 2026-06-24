import { App } from 'obsidian'
import { useState } from 'react'

import { ReactModal } from '../common/ReactModal'

export type OrphanedPromptTemplate = {
  id: string
  name: string
  sourcePath: string
}

export type PromptCleanupDecision = {
  idsToDelete: string[]
  idsToKeep: string[]
}

type PromptCleanupModalComponentProps = {
  templates: OrphanedPromptTemplate[]
  onResolve: (decision: PromptCleanupDecision) => void
  onClose: () => void
}

export class PromptCleanupModal extends ReactModal<PromptCleanupModalComponentProps> {
  constructor({
    app,
    templates,
    onResolve,
  }: {
    app: App
    templates: OrphanedPromptTemplate[]
    onResolve: (decision: PromptCleanupDecision) => void
  }) {
    super({
      app,
      Component: PromptCleanupModalComponent,
      props: { templates, onResolve },
      options: {
        title: 'Deleted prompt files',
      },
    })
  }
}

function PromptCleanupModalComponent({
  templates,
  onResolve,
  onClose,
}: PromptCleanupModalComponentProps) {
  // All orphaned templates are pre-selected for deletion.
  const [selectedIds, setSelectedIds] = useState<Set<string>>(
    () => new Set(templates.map((template) => template.id)),
  )

  const toggle = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev)
      if (next.has(id)) {
        next.delete(id)
      } else {
        next.add(id)
      }
      return next
    })
  }

  const handleDeleteSelected = () => {
    const idsToDelete = templates
      .map((template) => template.id)
      .filter((id) => selectedIds.has(id))
    const idsToKeep = templates
      .map((template) => template.id)
      .filter((id) => !selectedIds.has(id))
    onClose()
    onResolve({ idsToDelete, idsToKeep })
  }

  const handleKeepAll = () => {
    onClose()
    onResolve({
      idsToDelete: [],
      idsToKeep: templates.map((template) => template.id),
    })
  }

  return (
    <div>
      <div style={{ marginBottom: 'var(--size-4-3)' }}>
        The following prompts were removed from your <code>Prompts</code>{' '}
        folder. Select which library templates you want to delete. Unselected
        templates are kept and will no longer be linked to the folder.
      </div>

      <div
        style={{
          maxHeight: '40vh',
          overflowY: 'auto',
          marginBottom: 'var(--size-4-3)',
        }}
      >
        {templates.map((template) => (
          <label
            key={template.id}
            style={{
              display: 'flex',
              alignItems: 'flex-start',
              gap: 'var(--size-4-2)',
              padding: 'var(--size-2-2) 0',
              cursor: 'pointer',
            }}
          >
            <input
              type="checkbox"
              checked={selectedIds.has(template.id)}
              onChange={() => toggle(template.id)}
            />
            <div>
              <div>{template.name}</div>
              <div
                style={{
                  fontSize: 'var(--font-ui-smaller)',
                  color: 'var(--text-muted)',
                }}
              >
                {template.sourcePath}
              </div>
            </div>
          </label>
        ))}
      </div>

      <div className="modal-button-container">
        <button className="mod-warning" onClick={handleDeleteSelected}>
          Delete selected
        </button>
        <button className="mod-cancel" onClick={handleKeepAll}>
          Keep all
        </button>
      </div>
    </div>
  )
}
