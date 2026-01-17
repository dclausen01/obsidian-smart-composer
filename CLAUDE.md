# CLAUDE.md - Smart Composer Plugin

## Project Overview

Smart Composer is an Obsidian plugin that integrates AI capabilities into note-taking. Key features:
- AI chat with vault content as context (RAG)
- AI-assisted edits with one-click application
- Semantic search across vault notes
- MCP (Model Context Protocol) server support
- Multiple AI providers (OpenAI, Anthropic, Gemini, Groq, Ollama, etc.)
- Multimedia processing (images, PDFs, DOCX, XLSX, YouTube, web content)

## Tech Stack

- **Language**: TypeScript 5.6
- **UI**: React 18 with Lexical editor
- **Database**: PGLite (PostgreSQL in WebAssembly) + Drizzle ORM
- **Vector Search**: pgvector extension with HNSW indexing
- **Build**: esbuild
- **Testing**: Jest with ts-jest

## Commands

```bash
npm run dev              # Watch mode development build
npm run build            # Production build with type checking
npm run lint:check       # Check linting & formatting
npm run lint:fix         # Auto-fix linting & formatting
npm run type:check       # TypeScript type check only
npm test                 # Run Jest tests
npm run migrate:compile  # Compile Drizzle migrations to JSON
```

## Project Structure

```
src/
├── main.ts                 # Plugin entry point
├── ChatView.tsx            # Chat sidebar (React root)
├── ApplyView.tsx           # Edit suggestion view
├── components/
│   ├── chat-view/          # Chat UI components
│   │   ├── Chat.tsx        # Main chat controller
│   │   ├── chat-input/     # Lexical editor & input controls
│   │   └── apply-view/     # Edit application UI
│   └── settings/           # Settings UI sections
├── contexts/               # React Context providers (9 total)
├── core/
│   ├── llm/                # LLM provider implementations
│   │   ├── manager.ts      # Provider factory
│   │   ├── base.ts         # Abstract base class
│   │   └── [providers]     # openai.ts, anthropic.ts, etc.
│   ├── mcp/                # Model Context Protocol
│   └── rag/                # RAG engine & embeddings
├── database/
│   ├── DatabaseManager.ts  # PGLite orchestration
│   ├── schema.ts           # Drizzle schema
│   ├── modules/            # vector/, template/
│   └── json/               # JSON backup storage
├── settings/
│   └── schema/
│       ├── setting.types.ts    # Zod schema
│       └── migrations/         # Version migrations
├── types/                  # TypeScript definitions
├── utils/                  # Utility functions
└── hooks/                  # React hooks
```

## Key Patterns

### LLM Provider Pattern
All providers extend `BaseLLMProvider<P>` with methods:
- `generateResponse()` - Non-streaming response
- `streamResponse()` - Streaming response
- `getEmbedding()` - Embedding generation

### Context Providers (nested in order)
ChatViewProvider → PluginProvider → AppProvider → SettingsProvider → DarkModeProvider → DatabaseProvider → RAGProvider → McpProvider → QueryClientProvider → DialogContainerProvider

### Lazy Initialization
`getDbManager()`, `getRAGEngine()`, `getMcpManager()` use Promise caching for single init.

### Settings Schema (Zod)
Settings use Zod validation with version-based migrations in `settings/schema/migrations/`.

## Code Conventions

- **Naming**: PascalCase (components/classes), camelCase (functions/vars)
- **Imports**: Grouped and sorted (ESLint enforced)
- **Unused vars**: Prefix with underscore (`_unused`)
- **Formatting**: Prettier (2 spaces, no semicolons, single quotes)
- **JSX**: No React import needed (react-jsx transform)

## Testing

Tests are colocated with source files using `.test.ts` suffix:
- `components/chat-view/chat-input/utils/*.test.ts` - Editor utilities
- `database/json/*.test.ts` - Database managers
- `settings/schema/migrations/*.test.ts` - Settings migrations
- `utils/common/*.test.ts` - Utility functions

## Common Development Tasks

### Adding a New LLM Provider
1. Create class in `src/core/llm/` extending `BaseLLMProvider`
2. Add provider type to `src/types/provider.types.ts`
3. Add to constants in `src/constants.ts`
4. Add switch case in `src/core/llm/manager.ts`
5. Create settings migration if needed

### Database Schema Changes
1. Modify `src/database/schema.ts`
2. Run `npx drizzle-kit generate --name <migration-name>`
3. Run `npm run migrate:compile`
4. Test migration

### Settings Schema Changes
1. Update `src/settings/schema/setting.types.ts`
2. Bump SETTINGS_SCHEMA_VERSION
3. Create migration in `settings/schema/migrations/`
4. Add test for migration

## Build Notes

- **Output**: `main.js` (CommonJS bundle)
- **External**: obsidian, electron, @codemirror/*, node builtins
- **PGLite Shim**: Custom esbuild plugin fakes `process` object for browser compatibility
- **import.meta.url**: Shimmed for ESM modules in CommonJS context

## Database

- **Location**: `.smtcmp_vector_db.tar.gz` in vault root
- **Tables**: `embeddingTable` (vectors), `templateTable` (chat templates)
- **Fallback**: JSON storage if PGLite fails

## Key Files Reference

| File | Purpose |
|------|---------|
| `main.ts:1-200` | Plugin lifecycle, commands, settings |
| `Chat.tsx` | Main chat component logic |
| `ChatUserInput.tsx` | Lexical editor for chat input |
| `manager.ts` | LLM provider factory |
| `ragEngine.ts` | Vector search & indexing |
| `promptGenerator.ts` | Prompt compilation with context |
| `setting.types.ts` | Zod settings schema |
| `schema.ts` | Drizzle database schema |
