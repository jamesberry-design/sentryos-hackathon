# AGENTS.md - SentryOS Desktop Emulator

A Next.js 16 browser-based desktop environment ("SentryOS") where AI-powered agents run as windowed applications. Users double-click icons on the desktop to open apps. Agents live inside the "Agents" folder on the desktop.

---

## How This Project Works

The desktop is a single-page React app. Everything the user sees — windows, icons, the taskbar — is rendered by components under `src/components/desktop/`. Applications (including agents) are React components that render inside draggable, resizable windows managed by `WindowManager.tsx`.

AI agents call the **Claude Agent SDK** (`@anthropic-ai/claude-agent-sdk`) through Next.js API routes. Responses stream back to the browser via **Server-Sent Events (SSE)**. The frontend never calls Claude directly.

---

## Building a New Agent

Every agent has exactly **three parts**: an API route, a React component, and a registration entry in `Desktop.tsx`.

### 1. API Route

Create `src/app/api/<your-agent>/route.ts`. This is where the Claude Agent SDK runs.

The route should:
- Export a `POST` handler that accepts `{ messages, model? }` in the request body
- Define a `SYSTEM_PROMPT` that gives the agent its personality and task boundaries
- Call `query()` from the SDK with streaming enabled
- Emit SSE events the frontend understands (see event table below)

**SDK call shape:**
```typescript
import { query } from '@anthropic-ai/claude-agent-sdk'

for await (const message of query({
  prompt: fullPrompt,
  options: {
    maxTurns: 10,
    model: model || 'claude-sonnet-4-5-20250929',
    tools: { type: 'preset', preset: 'claude_code' },
    permissionMode: 'bypassPermissions',
    allowDangerouslySkipPermissions: true,
    includePartialMessages: true,
    cwd: process.cwd(),
  }
})) {
  // handle message events...
}
```

**SSE events to emit:**

| Event | Shape | When |
|-------|-------|------|
| `text_delta` | `{ type: 'text_delta', text: string }` | Streaming text from the model |
| `tool_start` | `{ type: 'tool_start', tool: string }` | Agent invokes a tool (WebSearch, Read, etc.) |
| `tool_progress` | `{ type: 'tool_progress', tool: string, elapsed: number }` | Tool still running |
| `done` | `{ type: 'done' }` | Agent finished successfully |
| `error` | `{ type: 'error', message: string }` | Something failed |
| `[DONE]` | Raw string (not JSON) | Final signal — stream is over |

**Message type handling:** Iterate over messages from `query()` and check `message.type`:
- `'stream_event'` with `event.type === 'content_block_delta'` → emit `text_delta`
- `'assistant'` with `tool_use` content blocks → emit `tool_start`
- `'tool_progress'` → emit `tool_progress`
- `'result'` with `subtype === 'success'` → emit `done`
- `'result'` with other subtypes → emit `error`

The response must use these headers:
```typescript
{ 'Content-Type': 'text/event-stream', 'Cache-Control': 'no-cache', 'Connection': 'keep-alive' }
```

Read `src/app/api/chat/route.ts` for the working implementation of this pattern.

### 2. React Component

Create `src/components/desktop/apps/<YourAgent>.tsx`. This is the UI that appears inside the window.

The component should:
- Use the `'use client'` directive
- Fill its container with `className="h-full flex flex-col bg-[#1e1a2a]"`
- Follow a three-section layout: header bar, scrollable content area, bottom bar
- `fetch()` the API route with `POST` and consume the SSE stream
- Render streamed markdown with `ReactMarkdown` + `remarkGfm`
- Show tool activity indicators while the agent is working

**Component layout skeleton:**
```tsx
<div className="h-full flex flex-col bg-[#1e1a2a]">
  {/* Header */}
  <div className="flex items-center gap-2 px-3 py-2 border-b border-[#362552] bg-[#2a2438]">
    ...
  </div>

  {/* Scrollable content */}
  <div className="flex-1 overflow-auto p-4">
    ...
  </div>

  {/* Bottom bar / input */}
  <div className="border-t border-[#362552] bg-[#2a2438]">
    ...
  </div>
</div>
```

**SSE consumption pattern:**
```typescript
const response = await fetch('/api/your-agent', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ messages: [...], model }),
})

const reader = response.body?.getReader()
const decoder = new TextDecoder()
let content = ''

while (true) {
  const { done, value } = await reader.read()
  if (done) break
  for (const line of decoder.decode(value).split('\n')) {
    if (!line.startsWith('data: ')) continue
    const data = line.slice(6)
    if (data === '[DONE]') continue
    const parsed = JSON.parse(data)
    if (parsed.type === 'text_delta') {
      content += parsed.text
      // update state with new content
    }
    // handle tool_start, tool_progress, done, error...
  }
}
```

Read `src/components/desktop/apps/Chat.tsx` for a working implementation of streaming, tool indicators, and markdown rendering.

### 3. Desktop Registration

Wire the agent into `src/components/desktop/Desktop.tsx` with three changes:

**Import** the component at the top of the file:
```typescript
import { YourAgent } from './apps/YourAgent'
```

**Create an opener function** inside `DesktopContent()`:
```typescript
const openYourAgent = () => {
  openWindow({
    id: 'your-agent',
    title: 'Your Agent Name',
    icon: '🤖',
    x: 180, y: 60,
    width: 650, height: 550,
    minWidth: 450, minHeight: 400,
    isMinimized: false,
    isMaximized: false,
    content: <YourAgent />
  })
}
```

**Add an entry** to the `agentsFolderItems` array inside `openAgentsFolder()`:
```typescript
{
  id: 'your-agent',
  name: 'Your Agent Name',
  type: 'app',
  icon: 'chat',
  onOpen: openYourAgent,
}
```

The agent will appear inside the Agents folder. Users double-click to open it.

---

## Do's and Don'ts

**Do:**
- Stream all AI responses via SSE — never return blocking JSON
- Put AI logic in API routes, UI logic in components
- Use `ReactMarkdown` with `remarkGfm` for any markdown output
- Use `react-syntax-highlighter` with `oneDark` for code blocks
- Use `lucide-react` for all icons
- Follow the color palette below — dark mode only
- Mark every component `'use client'`

**Don't:**
- Call the Claude SDK from client components
- Install new packages without asking — the project has everything needed
- Use light backgrounds or white text-on-white anywhere
- Use CSS modules, styled-components, or inline style objects — Tailwind only
- Create class components — functional components with hooks only

---

## Colors

| Token | Value | Usage |
|-------|-------|-------|
| Primary | `#7553ff` | Buttons, links, active states, tool indicators |
| Accent | `#ff45a8` | Secondary actions, user-side UI, highlights |
| Window BG | `#1e1a2a` | Component root backgrounds |
| Header BG | `#2a2438` | Title bars, input areas, bottom bars |
| Border | `#362552` | All borders and dividers |
| Text | `#e8e4f0` | Primary text |
| Muted | `#9086a3` | Timestamps, labels, secondary text |
| Hover | `#c4b5fd` | Link/text hover states |

---

## Tool Display Names

When showing which tools the agent is using, map SDK tool names to friendly labels:

| SDK Name | Display Name | Icon (lucide-react) |
|----------|-------------|---------------------|
| `WebSearch` | Web Search | `Search` |
| `WebFetch` | Fetching URL | `Globe` |
| `Read` | Reading File | `FileText` |
| `Write` | Writing File | `FileText` |
| `Edit` | Editing File | `FileText` |
| `Glob` | Finding Files | `FileText` |
| `Grep` | Searching Content | `Search` |
| `Bash` | Running Command | `Terminal` |
| `Task` | Running Task | `Wrench` |

---

## Model IDs

If the agent supports model selection, use these:

| Label | Model ID |
|-------|----------|
| Sonnet 4.5 | `claude-sonnet-4-5-20250929` |
| Opus 4.6 | `claude-opus-4-6` |
| Haiku 4.5 | `claude-haiku-4-5-20251001` |

---

## Interfaces

**WindowState** — passed to `openWindow()`:
```typescript
interface WindowState {
  id: string              // Unique, kebab-case
  title: string           // Window title bar text
  icon: string            // Emoji
  x: number; y: number
  width: number; height: number
  minWidth: number; minHeight: number
  isMinimized: boolean    // false on open
  isMaximized: boolean    // false on open
  content: React.ReactNode
}
```

**FolderItem** — entries in the Agents folder:
```typescript
interface FolderItem {
  id: string
  name: string
  type: 'folder' | 'file' | 'app'   // Use 'app' for agents
  icon?: 'folder' | 'document' | 'chat'
  onOpen?: () => void
}
```

---

## Naming Conventions

| What | Style | Example |
|------|-------|---------|
| Component files | PascalCase | `MyAgent.tsx` |
| API route dirs | kebab-case | `my-agent/route.ts` |
| Window/folder IDs | kebab-case | `'my-agent'` |
| Functions | camelCase | `openMyAgent` |

---

## Commands

```bash
npm run dev       # Dev server
npm run build     # Production build
npm run lint      # ESLint
```

---

## Key Files

| Purpose | Location |
|---------|----------|
| Desktop shell + agent registration | `src/components/desktop/Desktop.tsx` |
| Window management context | `src/components/desktop/WindowManager.tsx` |
| Agents folder UI + FolderItem type | `src/components/desktop/apps/FolderView.tsx` |
| WindowState type | `src/components/desktop/types.ts` |
| Existing chat agent (component) | `src/components/desktop/apps/Chat.tsx` |
| Existing chat agent (API route) | `src/app/api/chat/route.ts` |
| Shared utilities (`cn()`) | `src/lib/utils.ts` |
| shadcn/ui components | `src/components/ui/` |
