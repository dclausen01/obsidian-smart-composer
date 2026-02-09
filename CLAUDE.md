# CLAUDE.md - Smart Composer Plugin

## Project Overview

Smart Composer is an Obsidian plugin that integrates AI capabilities into note-taking. Key features:
- AI chat with vault content as context (RAG)
- AI-assisted edits with one-click application
- Semantic search across vault notes
- MCP (Model Context Protocol) server support for external tool integration
- Multiple AI providers (OpenAI, Anthropic, Gemini, Groq, Ollama, xAI, Mistral, Perplexity, DeepSeek, OpenRouter, LM Studio, Azure OpenAI, and OpenAI-compatible endpoints)
- OAuth-based plan connections (Anthropic Claude Code, OpenAI Codex, Google Gemini)
- Multimedia processing (images, PDFs, DOCX, XLSX, YouTube, web content, OCR via Tesseract.js)

## Tech Stack

- **Language**: TypeScript 5.6
- **UI**: React 18 with Lexical editor
- **Database**: PGLite (PostgreSQL in WebAssembly) + Drizzle ORM
- **Vector Search**: pgvector extension with HNSW indexing (per-dimension indexes)
- **Build**: esbuild (CommonJS output)
- **Testing**: Jest with ts-jest
- **State Management**: React Context (9 providers) + TanStack React Query
- **Validation**: Zod schemas with versioned migrations

## Commands

```bash
npm run dev              # Watch mode development build
npm run build            # Production build with type checking (tsc -noEmit && esbuild)
npm run lint:check       # Check linting & formatting (Prettier then ESLint)
npm run lint:fix         # Auto-fix linting & formatting
npm run type:check       # TypeScript type check only
npm test                 # Run Jest tests
npm run migrate:compile  # Compile Drizzle migrations to JSON
```

## Project Structure

```
src/
├── main.ts                 # Plugin entry point, commands, lifecycle
├── ChatView.tsx            # Chat sidebar (React root, context nesting)
├── ApplyView.tsx           # Edit suggestion view
├── constants.ts            # Provider metadata, default models, pricing, OAuth endpoints
├── components/
│   ├── chat-view/          # Chat UI components
│   │   ├── Chat.tsx        # Main chat controller
│   │   ├── AssistantMessage*.tsx  # Message rendering (content, annotations, reasoning)
│   │   ├── ToolMessage.tsx        # Tool call display
│   │   ├── QueryProgress.tsx      # RAG indexing progress
│   │   ├── useChatStreamManager.ts # Streaming response management
│   │   └── chat-input/    # Lexical editor & input controls
│   │       ├── ChatUserInput.tsx   # Main input component
│   │       ├── ModelSelect.tsx     # Model picker dropdown
│   │       ├── plugins/           # Lexical plugins (mention, template, image, etc.)
│   │       └── utils/             # Editor utilities
│   ├── apply-view/         # Edit application UI
│   ├── common/             # Reusable UI primitives (ObsidianButton, ReactModal, etc.)
│   ├── modals/             # Dialog components (Confirm, Error, MCP, Template)
│   └── settings/           # Settings UI
│       ├── SettingsTabRoot.tsx
│       ├── modals/         # Provider/model configuration modals
│       └── sections/       # Settings tab sections (Chat, RAG, MCP, Models, Providers)
├── contexts/               # React Context providers (9 total)
│   ├── app-context.tsx
│   ├── chat-view-context.tsx
│   ├── dark-mode-context.tsx
│   ├── database-context.tsx
│   ├── dialog-container-context.tsx
│   ├── mcp-context.tsx
│   ├── plugin-context.tsx
│   ├── rag-context.tsx
│   └── settings-context.tsx
├── core/
│   ├── llm/                # LLM provider implementations (31 files)
│   │   ├── base.ts         # Abstract BaseLLMProvider<P> class
│   │   ├── manager.ts      # Provider factory (getProviderClient, getChatModelClient)
│   │   ├── exception.ts    # LLM exceptions
│   │   ├── openai.ts, anthropic.ts, gemini.ts, ollama.ts  # Core providers
│   │   ├── xaiProvider.ts, mistralProvider.ts, perplexityProvider.ts  # Additional providers
│   │   ├── deepseekStudioProvider.ts, openRouterProvider.ts, lmStudioProvider.ts
│   │   ├── azureOpenaiProvider.ts, openaiCompatibleProvider.ts
│   │   ├── openaiCodexProvider.ts, geminiPlanProvider.ts, anthropicClaudeCodeProvider.ts  # OAuth plan providers
│   │   ├── *MessageAdapter.ts  # Message format adapters per provider
│   │   ├── *Auth.ts        # OAuth authentication helpers
│   │   └── NoStainlessOpenAI.ts  # Non-Stainless OpenAI client variant
│   ├── mcp/                # Model Context Protocol
│   │   ├── mcpManager.ts   # Server lifecycle, tool execution, abort support
│   │   ├── tool-name-utils.ts  # Tool name parsing (delimiter: __)
│   │   └── exception.ts    # McpNotAvailableException, InvalidToolNameException
│   └── rag/                # RAG engine & embeddings
│       ├── ragEngine.ts    # Vector indexing & semantic search orchestration
│       └── embedding.ts    # Embedding model client factory
├── database/
│   ├── DatabaseManager.ts  # PGLite orchestration (static create(), WeakMap caching)
│   ├── schema.ts           # Drizzle schema (embeddingTable, templateTable)
│   ├── exception.ts        # Database exceptions
│   ├── migrations.json     # Compiled Drizzle migrations
│   ├── modules/
│   │   ├── vector/         # VectorManager + VectorRepository
│   │   └── template/       # TemplateManager + TemplateRepository
│   └── json/               # JSON fallback storage
│       ├── base.ts, constants.ts, exception.ts
│       ├── migrateToJsonDatabase.ts
│       ├── chat/           # ChatManager (JSON-backed chat history)
│       └── template/       # TemplateManager (JSON-backed templates)
├── settings/
│   ├── SettingTab.tsx       # Obsidian settings tab
│   └── schema/
│       ├── setting.types.ts     # Zod schema (version 16)
│       ├── settings.ts          # Settings load/save logic
│       └── migrations/          # 16 version migrations (0→1, 1→2, ..., 15→16)
│           ├── index.ts         # SETTINGS_SCHEMA_VERSION = 16, migration registry
│           └── migrationUtils.ts
├── types/                  # TypeScript definitions
│   ├── chat.ts             # Chat message types
│   ├── chat-model.types.ts # Chat model configuration (Zod schema)
│   ├── embedding.ts        # Embedding types
│   ├── embedding-model.types.ts  # Embedding model config (Zod schema)
│   ├── mentionable.ts      # Mentionable item types
│   ├── mcp.types.ts        # MCP server/tool types (Zod schema)
│   ├── provider.types.ts   # LLMProvider discriminated union (Zod)
│   ├── prompt-level.types.ts
│   ├── tool-call.types.ts  # Tool call types
│   └── llm/
│       ├── request.ts      # LLM request types
│       └── response.ts     # LLM response types
├── utils/
│   ├── chat/               # Chat utilities
│   │   ├── promptGenerator.ts    # Prompt compilation with context
│   │   ├── responseGenerator.ts  # Response generation
│   │   ├── apply.ts              # Apply edit suggestions to files
│   │   ├── diff.ts               # Diff computation
│   │   ├── chatHistoryManager.ts # Chat history management
│   │   ├── mentionable.ts        # Mentionable item handling
│   │   ├── message-groups.ts     # Message grouping
│   │   ├── parse-tag-content.ts  # XML tag parsing
│   │   ├── fetch-annotation-titles.ts
│   │   └── youtube-transcript.ts # YouTube transcript extraction
│   ├── llm/                # LLM utilities
│   │   ├── httpTransport.ts      # HTTP transport layer
│   │   ├── sse.ts                # Server-Sent Events handling
│   │   ├── request.ts            # Request formatting
│   │   ├── image.ts              # Image handling
│   │   ├── price-calculator.ts   # Token cost calculation
│   │   └── token.ts              # Token utilities
│   ├── common/             # General utilities (chunk-array, classnames)
│   ├── document-processing.ts    # Document processing coordinator
│   ├── pdf-processor.ts, docx-processor.ts, xlsx-processor.ts
│   ├── fuzzy-search.ts, glob-utils.ts, fetch-utils.ts
│   └── obsidian.ts         # Obsidian API helpers
└── hooks/
    ├── useChatHistory.ts   # Chat history React hook
    └── useJsonManagers.ts  # JSON manager initialization hook
```

## Key Patterns

### LLM Provider Pattern
All providers extend `BaseLLMProvider<P>` with methods:
- `generateResponse()` - Non-streaming response
- `streamResponse()` - Streaming via `AsyncIterable<LLMResponseStreaming>`
- `getEmbedding()` - Embedding generation

The factory in `manager.ts` uses `getProviderClient()` with a switch on provider type (discriminated union). `getChatModelClient()` composes the provider with chat model metadata.

### Provider Type System
Provider types use Zod discriminated unions (`z.discriminatedUnion('type', [...])`):
- **API-key providers**: anthropic, openai, gemini, xai, deepseek, mistral, perplexity, groq, openrouter, ollama, lm-studio, openai-compatible
- **OAuth plan providers**: anthropic-plan, openai-plan, gemini-plan (include `oauth` object with tokens)
- **Azure**: Requires `deployment` and `apiVersion` in `additionalSettings`

### Context Providers (nested in order in ChatView.tsx)
ChatViewProvider → PluginProvider → AppProvider → SettingsProvider → DarkModeProvider → DatabaseProvider → RAGProvider → McpProvider → QueryClientProvider → DialogContainerProvider

### Lazy Initialization
`getDbManager()`, `getRAGEngine()`, `getMcpManager()` use Promise caching for single initialization. Pattern:
```typescript
if (!this.initPromise) {
  this.initPromise = (async () => { /* init */ })()
}
return this.initPromise
```
Error handling resets the promise on failure to allow retry.

### Settings Schema (Zod)
Settings use Zod validation with version-based migrations in `settings/schema/migrations/`. Current version: **16**. Schema fields use `.catch()` for safe defaults. Each migration exports `migrateFromXToY(data): Record<string, unknown>`.

### MCP Tool Naming
Tool names use `__` (double underscore) delimiter: `{serverName}__{toolName}`. Server names must match `/^[a-zA-Z0-9_-]+$/`.

### Database Architecture
- PGLite runs PostgreSQL in WebAssembly with pgvector for similarity search
- HNSW indexes are created per supported dimension (128, 256, 384, 512, 768, 1024, 1280, 1536, 1792) with `vector_cosine_ops`
- Managers cached via WeakMap on DatabaseManager instance
- JSON fallback storage when PGLite fails

## Code Conventions

- **Naming**: PascalCase (components/classes), camelCase (functions/vars)
- **Type definitions**: Use `type` keyword, not `interface` (ESLint: `consistent-type-definitions: ['warn', 'type']`)
- **Imports**: Grouped with newlines between groups, alphabetized (ESLint `import/order` enforced)
- **Unused vars**: Prefix with underscore (`_unused`) — applies to args, vars, and caught errors
- **Formatting**: Prettier — 2 spaces, no semicolons, single quotes, trailing commas
- **JSX**: No React import needed (react-jsx transform)
- **Zod schemas**: Use `.catch()` for default values instead of `.default()`

## Testing

Tests are colocated with source files using `.test.ts` suffix (23 test files total):
- `settings/schema/migrations/*.test.ts` - Settings migration tests (16 files, one per migration)
- `settings/schema/settings.test.ts` - Settings manager tests
- `database/json/chat/ChatManager.test.ts` - JSON chat manager
- `database/json/template/TemplateManager.test.ts` - JSON template manager
- `components/chat-view/chat-input/utils/editor-state-to-plain-text.test.ts` - Editor utilities
- `utils/chat/parse-tag-content.test.ts` - Tag parsing
- `utils/common/chunk-array.test.ts` - Array chunking
- `utils/obsidian.test.ts` - Obsidian utility tests

Test config: Jest with ts-jest, node test environment.

## Common Development Tasks

### Adding a New LLM Provider
1. Create provider class in `src/core/llm/` extending `BaseLLMProvider`
2. Create message adapter if the provider uses non-OpenAI message format
3. Add provider type to `src/types/provider.types.ts` (Zod discriminated union variant)
4. Add provider metadata to `PROVIDER_TYPES_INFO` in `src/constants.ts`
5. Add default provider config to `DEFAULT_PROVIDERS` in `src/constants.ts`
6. Add switch case in `src/core/llm/manager.ts` (`getProviderClient`)
7. Add pricing data to `src/constants.ts` if applicable
8. Create settings migration to bump version

### Database Schema Changes
1. Modify `src/database/schema.ts`
2. Run `npx drizzle-kit generate --name <migration-name>`
3. Run `npm run migrate:compile`
4. Test migration

### Settings Schema Changes
1. Update `src/settings/schema/setting.types.ts`
2. Bump `SETTINGS_SCHEMA_VERSION` in `src/settings/schema/migrations/index.ts`
3. Create migration file `X_to_Y.ts` in `settings/schema/migrations/`
4. Register migration in `SETTING_MIGRATIONS` array in `index.ts`
5. Add test file `X_to_Y.test.ts` for the migration
6. Run `npm test` to verify

### Adding a Settings Section
1. Create section component in `src/components/settings/sections/`
2. Add to `SettingsTabRoot.tsx`
3. Add any new modals to `src/components/settings/modals/`

## Build Notes

- **Output**: `main.js` (CommonJS bundle)
- **External** (not bundled): `obsidian`, `electron`, `@codemirror/*`, `@lezer/*`, `@lexical/clipboard`, Node.js builtins
- **PGLite Shim**: Custom esbuild plugin injects `const process = {}` before pglite files (prevents Node.js detection in browser)
- **import.meta.url**: Shimmed via `import-meta-url-shim.js` for ESM modules in CommonJS context
- **Definitions**: `process.env.NODE_ENV` set per mode, `global` → `globalThis`
- **Sourcemaps**: Inline in dev, none in production

## Database

- **Location**: `.smtcmp_vector_db.tar.gz` in vault root
- **Tables**: `embeddingTable` (vectors with pgvector), `templateTable` (chat templates)
- **HNSW Indexes**: One per supported embedding dimension (128-1792), using cosine similarity
- **Fallback**: JSON storage in vault if PGLite initialization fails
- **Lifecycle**: Static `DatabaseManager.create()` factory, `vacuum()` for cleanup

## Key Files Reference

| File | Purpose |
|------|---------|
| `main.ts` | Plugin lifecycle, commands (open-chat, add-selection, rebuild/update-index) |
| `ChatView.tsx` | React root with context provider nesting |
| `Chat.tsx` | Main chat component logic |
| `ChatUserInput.tsx` | Lexical editor for chat input |
| `constants.ts` | Provider info, default models, pricing, OAuth config |
| `core/llm/manager.ts` | LLM provider factory |
| `core/llm/base.ts` | Abstract base LLM provider class |
| `core/rag/ragEngine.ts` | Vector search & indexing orchestration |
| `core/mcp/mcpManager.ts` | MCP server lifecycle & tool execution |
| `utils/chat/promptGenerator.ts` | Prompt compilation with context |
| `utils/chat/responseGenerator.ts` | Response generation pipeline |
| `settings/schema/setting.types.ts` | Zod settings schema (v16) |
| `database/schema.ts` | Drizzle database schema |
| `database/DatabaseManager.ts` | PGLite orchestration |
| `types/provider.types.ts` | LLM provider type definitions (Zod discriminated union) |
