import { App } from 'obsidian'

import { TemplateManager } from './TemplateManager'
import { TEMPLATE_SCHEMA_VERSION, Template } from './types'
import { plainTextToTemplateContent } from './utils'

const mockAdapter = {
  exists: jest.fn().mockResolvedValue(true),
  mkdir: jest.fn().mockResolvedValue(undefined),
  read: jest.fn().mockResolvedValue(''),
  write: jest.fn().mockResolvedValue(undefined),
  remove: jest.fn().mockResolvedValue(undefined),
  list: jest.fn().mockResolvedValue({ files: [], folders: [] }),
}

const mockVault = {
  adapter: mockAdapter,
}

const mockApp = {
  vault: mockVault,
} as unknown as App

describe('TemplateManager', () => {
  let templateManager: TemplateManager

  beforeEach(() => {
    templateManager = new TemplateManager(mockApp)
  })

  describe('filename generation and parsing roundtrip', () => {
    const testNames = [
      'Simple Name',
      'Special & Characters! #$%^',
      'Unicode 中文 日本語 한국어',
      'Extremely long name that might cause issues with file systems',
      'Name with trailing spaces   ',
      '   Name with leading spaces',
      'Name with _ underscores_and_special_chars',
      'Name with.dots.and-dashes',
      'Name with / slashes \\ and \\ backslashes',
      'Name with "quotes" and \'apostrophes\'',
      'Name with <html> tags',
      'Name with newlines\nand\ttabs',
      '🔥 Name with emojis 🚀',
      ' ',
      'Name-with-123e4567-e89b-12d3-a456-426614174000-uuid-like-substring',
      '_Name_starting_with_underscore',
      'Name+with+plus+signs',
      'Name%20with%20encoded%20characters',
      'Name ending with .json',
      'v1_Name_starting_like_a_versioned_file',
      '..Name with leading dots',
      'Name with trailing dots..',
    ]

    test.each(testNames)('should correctly roundtrip name: %s', (name) => {
      const template: Template = {
        id: '123e4567-e89b-12d3-a456-426614174000',
        name,
        content: { nodes: [] },
        createdAt: 1620000000000,
        updatedAt: 1620000000000,
        schemaVersion: TEMPLATE_SCHEMA_VERSION,
      }

      const fileName = (
        templateManager as unknown as {
          generateFileName: (template: Template) => string
        }
      ).generateFileName(template)
      const metadata = (
        templateManager as unknown as {
          parseFileName: (
            fileName: string,
          ) => { id: string; name: string; schemaVersion: number } | null
        }
      ).parseFileName(fileName)

      expect(metadata).not.toBeNull()
      if (metadata) {
        expect(metadata.id).toBe(template.id)
        expect(metadata.name).toBe(template.name)
        expect(metadata.schemaVersion).toBe(template.schemaVersion)
      }
    })
  })

  describe('syncTemplatesFromFolder', () => {
    const makeFile = (path: string, basename: string) => ({ path, basename })

    const buildManager = (
      files: { path: string; basename: string }[],
      fileContents: Record<string, string>,
    ) => {
      const app = {
        vault: {
          adapter: mockAdapter,
          getMarkdownFiles: jest.fn().mockReturnValue(files),
          cachedRead: jest
            .fn()
            .mockImplementation((file: { path: string }) =>
              Promise.resolve(fileContents[file.path]),
            ),
        },
      } as unknown as App
      return new TemplateManager(app)
    }

    it('creates templates for new prompt files only inside the folder', async () => {
      const manager = buildManager(
        [
          makeFile('Prompts/sub/My Prompt.md', 'My Prompt'),
          makeFile('Other/Ignored.md', 'Ignored'),
        ],
        { 'Prompts/sub/My Prompt.md': 'Prompt body' },
      )
      const findByName = jest
        .spyOn(manager, 'findByName')
        .mockResolvedValue(null)
      const createTemplate = jest
        .spyOn(manager, 'createTemplate')
        .mockResolvedValue({} as Template)
      const updateTemplate = jest.spyOn(manager, 'updateTemplate')

      const result = await manager.syncTemplatesFromFolder('Prompts')

      expect(findByName).toHaveBeenCalledTimes(1)
      expect(findByName).toHaveBeenCalledWith('My Prompt')
      expect(createTemplate).toHaveBeenCalledWith({
        name: 'My Prompt',
        content: plainTextToTemplateContent('Prompt body'),
      })
      expect(updateTemplate).not.toHaveBeenCalled()
      expect(result).toEqual({
        created: 1,
        updated: 0,
        unchanged: 0,
        failed: 0,
      })
    })

    it('strips frontmatter and uses the H1 heading as the template name', async () => {
      const fileBody = [
        '---',
        'type: prompt',
        'category: Analyse',
        'tags: [Zusammenfassung]',
        '---',
        '',
        '# Fasse zusammen',
        '',
        'Bitte fasse den Text zusammen.',
      ].join('\n')

      const manager = buildManager(
        [makeFile('Prompts/Analyse/Fasse_zusammen.md', 'Fasse_zusammen')],
        { 'Prompts/Analyse/Fasse_zusammen.md': fileBody },
      )
      jest.spyOn(manager, 'findByName').mockResolvedValue(null)
      const createTemplate = jest
        .spyOn(manager, 'createTemplate')
        .mockResolvedValue({} as Template)

      await manager.syncTemplatesFromFolder('Prompts')

      expect(createTemplate).toHaveBeenCalledWith({
        name: 'Fasse zusammen',
        content: plainTextToTemplateContent(
          '# Fasse zusammen\n\nBitte fasse den Text zusammen.',
        ),
      })
    })

    it('updates a template when the file content changed', async () => {
      const manager = buildManager(
        [makeFile('Prompts/Existing.md', 'Existing')],
        { 'Prompts/Existing.md': 'New content' },
      )
      jest.spyOn(manager, 'findByName').mockResolvedValue({
        id: 'existing-id',
        name: 'Existing',
        content: plainTextToTemplateContent('Old content'),
        createdAt: 0,
        updatedAt: 0,
        schemaVersion: TEMPLATE_SCHEMA_VERSION,
      })
      const createTemplate = jest.spyOn(manager, 'createTemplate')
      const updateTemplate = jest
        .spyOn(manager, 'updateTemplate')
        .mockResolvedValue({} as Template)

      const result = await manager.syncTemplatesFromFolder('Prompts')

      expect(createTemplate).not.toHaveBeenCalled()
      expect(updateTemplate).toHaveBeenCalledWith('existing-id', {
        content: plainTextToTemplateContent('New content'),
      })
      expect(result.updated).toBe(1)
    })

    it('leaves unchanged templates untouched', async () => {
      const manager = buildManager([makeFile('Prompts/Same.md', 'Same')], {
        'Prompts/Same.md': 'Identical content',
      })
      jest.spyOn(manager, 'findByName').mockResolvedValue({
        id: 'same-id',
        name: 'Same',
        content: plainTextToTemplateContent('Identical content'),
        createdAt: 0,
        updatedAt: 0,
        schemaVersion: TEMPLATE_SCHEMA_VERSION,
      })
      const createTemplate = jest.spyOn(manager, 'createTemplate')
      const updateTemplate = jest.spyOn(manager, 'updateTemplate')

      const result = await manager.syncTemplatesFromFolder('Prompts')

      expect(createTemplate).not.toHaveBeenCalled()
      expect(updateTemplate).not.toHaveBeenCalled()
      expect(result.unchanged).toBe(1)
    })

    it('counts a failure without aborting the rest of the sync', async () => {
      const manager = buildManager(
        [
          makeFile('Prompts/Bad.md', 'Bad'),
          makeFile('Prompts/Good.md', 'Good'),
        ],
        { 'Prompts/Bad.md': 'x', 'Prompts/Good.md': 'y' },
      )
      jest.spyOn(manager, 'findByName').mockResolvedValue(null)
      jest
        .spyOn(manager, 'createTemplate')
        .mockRejectedValueOnce(new Error('boom'))
        .mockResolvedValueOnce({} as Template)

      const result = await manager.syncTemplatesFromFolder('Prompts')

      expect(result).toEqual({
        created: 1,
        updated: 0,
        unchanged: 0,
        failed: 1,
      })
    })
  })
})
