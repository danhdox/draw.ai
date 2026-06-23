# draw.ai

**draw.ai** is a fast, web-based diagram editor inspired by [draw.io](https://draw.io), enhanced with an AI copilot that can build flowcharts, clean up layouts, and explain diagrams from natural language.

## Features

### ✅ MVP Features (Implemented)

#### Diagram Editor Core
- ✅ **Pan & Zoom**: Navigate the canvas with mouse drag and scroll wheel
- ✅ **Grid & Snap**: Configurable grid with snap-to-grid functionality
- ✅ **Node Operations**:
  - Select single or multiple nodes (shift-click for multi-select)
  - Drag nodes to reposition
  - Resize nodes with corner handles
  - Edit text by double-clicking nodes
  - Honest shape library: rectangle, rounded, ellipse, square/circle, diamond,
    parallelogram, hexagon, triangle, trapezoid, chevron, cylinder, cloud,
    document, note, and text. Each palette item renders the same shape on the
    canvas and in exports (driven by `shapeKind`, with the legacy `type` kept
    for backward compatibility).
- ✅ **Edge / Connector Operations**:
  - Manual connectors: pick the connector tool (toolbar or palette) and click a
    source then a target node, or drag from a node's green connection handle
  - Border-clipped routing (straight / orthogonal / curved) with start/end
    arrowheads and dashed styling
  - Select, style, label, copy, delete, and undo/redo edges
  - Self-connections are rejected; endpoints are validated
- ✅ **Edit Operations**:
  - Delete / Backspace removes the selection
  - Copy/Paste, Duplicate (⌘D), Select all (⌘A)
  - Undo/Redo with full history stack
  - Z-order: Bring to front / Send to back
- ✅ **Styling (Inspector)**:
  - Nodes: text, x/y, width/height, fill, stroke, stroke width, font size,
    font family, opacity — with multi-select mixed values and batch edits
  - Edges: stroke, width, label, arrowheads, route type, dashed

#### AI Agent (`/api/chat`)
- ✅ **Generate Diagrams**: Describe a diagram in natural language (works offline
  with a local fallback when no `OPENAI_API_KEY` is set)
- ✅ **Clean Up Layout**: Organizes nodes with the local ELK layout — no API key required
- ✅ **Explain Diagrams**: Get an explanation of what your diagram represents
- ✅ **Diff-based Changes**: All AI modifications use a validated diff system
- ✅ **Preview & Accept/Reject**: Review AI changes before applying them, with
  loading / error / applied / rejected states
- ✅ **Undo AI Changes**: AI operations are fully integrated with undo/redo

#### File Operations
- ✅ **Save/Load JSON**: Export and import diagrams as JSON
- ✅ **Export SVG**: Vector export with XML-escaped labels
- ✅ **Export PNG**: Rendered bitmap sized to the diagram bounds
- ✅ **Mermaid Import/Export**: Flowchart nodes, shapes, edges, and labels
  (`flowchart TD/LR`); imports run layout automatically

#### Architecture
- ✅ **Canonical Data Model**: Clean separation between data and UI
- ✅ **Diff System**: All changes represented as validated operations
- ✅ **Command Pattern**: Undo/redo via inverse diffs
- ✅ **Type Safety**: Full TypeScript + Zod validation
- ✅ **Zustand Store**: Lightweight, performant state management

### 📋 TODO Features (Future Enhancements)

#### Advanced Editor Features
- [ ] Group/ungroup UI affordances (store actions + ⌘G/⇧⌘G shortcuts exist)
- [ ] Bezier curve edges with custom control points
- [ ] Alignment guides and distribution tools
- [ ] Multiple canvas pages/tabs
- [ ] Full layers panel (z-order Bring-to-front / Send-to-back exists)
- [ ] Node templates/library

#### Enhanced AI Capabilities
- [ ] Iterative refinement ("make it bigger", "add more nodes")
- [ ] Style transfer ("make it look like a UML diagram")
- [ ] Auto-complete as you draw
- [ ] Diagram templates from descriptions

#### Export & Integration
- [ ] Export PDF
- [ ] Integration with Excalidraw format
- [ ] Embed mode for use in other apps

#### Layout Improvements
- [x] ELKJS integration for hierarchical auto-layout
- [ ] Force-directed layout
- [ ] Circular / tree layout customization

#### Collaboration
- [ ] Real-time collaboration (multiplayer)
- [ ] Comments and annotations
- [ ] Version history
- [ ] Share links

## Getting Started

### Prerequisites
- Node.js 18+
- pnpm 9.15.9 (pinned via `packageManager`; run through `corepack pnpm@9.15.9` for reproducible installs)

### Installation

1. Clone the repository:
```bash
git clone https://github.com/danhdox/draw.ai.git
cd draw.ai
```

2. Install dependencies:
```bash
corepack pnpm@9.15.9 install --frozen-lockfile
```

3. (Optional) Set up environment variables for live AI generation/explanation.
The AI panel works offline with a local fallback; an OpenAI key only enriches
Generate/Explain. Cleanup Layout never needs a key. Create `.env.local`:
```env
OPENAI_API_KEY=your_openai_api_key_here
# Optional: override the model (default gpt-4o-mini)
OPENAI_MODEL=gpt-4o-mini
```

4. Run the development server:
```bash
pnpm dev
```

5. Open [http://localhost:3000](http://localhost:3000) in your browser.

### Tests

```bash
pnpm test -- --run   # unit/integration (Vitest)
pnpm build           # production build + type check
pnpm lint            # ESLint (flat config)
pnpm test:e2e        # Playwright smoke suite (run pnpm build first)
```

### Building for Production

```bash
pnpm build
pnpm start
```

## Usage

### Basic Editing
1. **Add Shapes**: Click shape buttons in the left palette
2. **Move Nodes**: Click and drag nodes
3. **Resize**: Select a node and drag corner handles
4. **Edit Text**: Double-click a node
5. **Connect Nodes**: Click the connector tool in the bottom toolbar (or the
   Connector palette item), then click a source node and a target node. You can
   also drag from a selected node's green handle. Press Esc to exit connect mode.
6. **Delete**: Select items and press Delete/Backspace or use the toolbar button
7. **Undo/Redo**: Use ⌘/Ctrl+Z / ⇧⌘/Ctrl+Shift+Z or toolbar buttons

### AI Features
1. **Generate Diagram**:
   - Open the AI panel (right sidebar)
   - Describe your diagram (e.g., "Create a login flow with username, password, and submit button")
   - Click "Generate Diagram"
   - Review the preview and click Accept or Reject

2. **Clean Up Layout**:
   - Create a messy diagram
   - Click "Clean Up Layout" in the AI panel
   - The AI will reorganize nodes hierarchically

3. **Explain Diagram**:
   - Create a diagram
   - Click "Explain Diagram"
   - Read the AI-generated explanation

### File Operations
- **New**: clears the canvas
- **Save**: downloads a JSON file
- **Open ▾**: Open JSON, or Import Mermaid
- **Export ▾**: Export SVG, PNG, or Mermaid

## Architecture

### Data Flow

```
User Action → Store Action → Diff Generation → applyDiff → New State
                                ↓
                         Store Inverse Diff (for undo)
```

### Core Concepts

#### 1. Canonical Data Model (`lib/model/diagram.ts`)
The diagram is represented as:
- **Nodes**: Array of shape objects with position, size, type, text, and style
- **Edges**: Array of connections between nodes
- **Groups**: Array of grouped node IDs
- **Meta**: Canvas settings (grid size, snap, theme)

All data is validated using Zod schemas.

#### 2. Diff System (`lib/model/diff.ts`)
Changes are represented as operation lists:
- `addNode`, `updateNode`, `removeNode`
- `addEdge`, `updateEdge`, `removeEdge`
- `group`, `ungroup`
- `setMeta`

Functions:
- `applyDiff(diagram, diff)`: Apply operations to a diagram
- `invertDiff(diagramBefore, diff)`: Create inverse for undo
- `validateDiff(diagram, diff)`: Check if operations are valid

#### 3. State Management (`lib/store/useDiagramStore.ts`)
Zustand store manages:
- Current diagram state
- Selection state
- History stack for undo/redo
- Clipboard for copy/paste

All mutations go through `applyDiffWithHistory()` to ensure undo/redo works.

#### 4. AI Agent (`app/api/chat/route.ts`)
A single streaming route (`/api/chat`) that:
1. Receives action (generate/cleanup/explain) + diagram context
2. `cleanup` runs the local ELK layout (no OpenAI); `generate`/`explain` call
   OpenAI when a key is present and otherwise use a local fallback
3. Validates returned diffs against the schema and streams a diff preview

Client (`components/AIPanel.tsx`):
1. Sends a request to `/api/chat` with the chosen action
2. Shows a diff preview with loading / error / applied / rejected states
3. User accepts → apply to store; rejects → discard

> The earlier `app/api/agent/route.ts` (non-streaming) has been removed; the
> streaming `/api/chat` route is the single AI path.

### Tech Stack

- **Framework**: Next.js 15 (App Router)
- **Language**: TypeScript
- **Styling**: Tailwind CSS
- **Components**: shadcn/ui + lucide-react
- **State**: Zustand
- **Validation**: Zod
- **AI**: Vercel AI SDK + OpenAI (with offline fallback)
- **Layout**: ELK (`elkjs`) hierarchical layout, with a deterministic grid fallback
- **Testing**: Vitest (unit/integration) + Playwright (e2e smoke)

### Project Structure

```
draw.ai/
├── app/
│   ├── api/chat/route.ts       # Streaming AI endpoint (generate/cleanup/explain)
│   ├── layout.tsx              # Root layout with theme provider
│   ├── page.tsx                # Main editor page
│   └── globals.css             # Global styles + Tailwind
├── components/
│   ├── ui/                     # shadcn/ui components
│   ├── AIPanel.tsx             # AI interaction panel
│   ├── Canvas.tsx              # SVG canvas with editing + connectors
│   ├── EditorShell.tsx         # Main layout, toolbar, menus, shortcuts
│   ├── InspectorTabs.tsx       # Node + edge inspector
│   ├── ShapePalette.tsx        # Left shape picker
│   └── Toaster.tsx             # Toast notifications
├── lib/
│   ├── model/                  # diagram.ts (schemas), diff.ts (operations)
│   ├── store/                  # useDiagramStore, useAgentStore, useToastStore
│   ├── render/                 # shapes.ts, edges.ts (shared canvas/export geometry)
│   ├── layout/                 # layout.ts (grid/hierarchical), elk.ts (ELK)
│   ├── export/                 # svg.ts, png.ts, mermaid.ts, download.ts
│   ├── import/                 # mermaid.ts
│   └── agent/                  # diagramAgent.ts, types.ts
├── tests/                      # Vitest unit/integration + tests/e2e (Playwright)
├── playwright.config.ts
├── eslint.config.mjs
└── next.config.js
```

## Development

### Running Tests

```bash
pnpm test -- --run
```

Tests cover:
- Diff operations (apply, invert, validate) and undo/redo
- Schema validation
- Store actions: connectors, self-connect guard, duplicate, group, z-order, nudge
- Export: SVG escaping/bounds, PNG happy path + failure
- Mermaid export, import, round-trip, and invalid-input errors
- Layout: grid/hierarchical and ELK (empty, disconnected, cycle, selected subset)
- AI route (`/api/chat`): cleanup, generate fallback, explain — all without an OpenAI key
- E2E smoke (`pnpm test:e2e`): add shape, connect nodes, delete+undo, mobile

### Linting

```bash
pnpm lint
```

### Code Style
- Use TypeScript for all new code
- Validate all external data with Zod
- Prefer pure functions for business logic
- Keep components small and focused
- Use the diff system for all state changes

## Contributing

Contributions are welcome! Please:
1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests for new functionality
5. Submit a pull request

## License

MIT License - see LICENSE file for details

## Acknowledgments

- Inspired by [draw.io](https://draw.io)
- Built with [Next.js](https://nextjs.org)
- AI powered by [OpenAI](https://openai.com)
- UI components from [shadcn/ui](https://ui.shadcn.com)

---

**Note**: Local-first, no database. The AI panel works without an OpenAI key
(local fallback for Generate, real ELK layout for Cleanup); a key only enables
live LLM Generate/Explain. Remaining TODO items are listed above.
