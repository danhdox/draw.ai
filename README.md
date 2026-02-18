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
  - Four node types: Rectangle, Ellipse, Diamond, Text
- ✅ **Edge Operations**:
  - Connect nodes with directed edges
  - Select edges
  - Automatic arrow markers
- ✅ **Edit Operations**:
  - Delete selected items
  - Copy/Paste nodes and edges
  - Undo/Redo with full history stack
  - Z-order management (basic)
- ✅ **Styling**:
  - Customize fill color, stroke color, stroke width
  - Font size control
  - Per-node style configuration

#### AI Agent
- ✅ **Generate Diagrams**: Describe a diagram in natural language and the AI creates it
- ✅ **Clean Up Layout**: Automatically organize nodes using hierarchical layout
- ✅ **Explain Diagrams**: Get an AI-generated explanation of what your diagram represents
- ✅ **Diff-based Changes**: All AI modifications use a validated diff system
- ✅ **Preview & Accept/Reject**: Review AI changes before applying them
- ✅ **Undo AI Changes**: AI operations are fully integrated with undo/redo

#### File Operations
- ✅ **Save/Load JSON**: Export and import diagrams as JSON
- ✅ **Export SVG**: Generate SVG files for use in other applications

#### Architecture
- ✅ **Canonical Data Model**: Clean separation between data and UI
- ✅ **Diff System**: All changes represented as validated operations
- ✅ **Command Pattern**: Undo/redo via inverse diffs
- ✅ **Type Safety**: Full TypeScript + Zod validation
- ✅ **Zustand Store**: Lightweight, performant state management

### 📋 TODO Features (Future Enhancements)

#### Advanced Editor Features
- [ ] Grouping nodes (basic implementation exists, needs UI)
- [ ] Bezier curve edges with custom control points
- [ ] Alignment guides and distribution tools
- [ ] Multiple canvas pages/tabs
- [ ] Layers panel
- [ ] Node templates/library
- [ ] Custom node shapes

#### Enhanced AI Capabilities
- [ ] Iterative refinement ("make it bigger", "add more nodes")
- [ ] Style transfer ("make it look like a UML diagram")
- [ ] Auto-complete as you draw
- [ ] Diagram templates from descriptions
- [ ] Export to Mermaid syntax
- [ ] Import from Mermaid syntax

#### Export & Integration
- [ ] Export PNG (via canvas rendering)
- [ ] Export PDF
- [ ] Mermaid import/export
- [ ] Integration with Excalidraw format
- [ ] Embed mode for use in other apps

#### Layout Improvements
- [ ] ELKJS integration for sophisticated auto-layout
- [ ] Force-directed layout
- [ ] Circular layout
- [ ] Tree layout with customization

#### Collaboration
- [ ] Real-time collaboration (multiplayer)
- [ ] Comments and annotations
- [ ] Version history
- [ ] Share links

## Getting Started

### Prerequisites
- Node.js 18+ 
- pnpm (or npm/yarn)

### Installation

1. Clone the repository:
```bash
git clone https://github.com/danhdox/draw.ai.git
cd draw.ai
```

2. Install dependencies:
```bash
pnpm install
```

3. Set up environment variables:
Create a `.env.local` file in the root directory:
```env
# Required for AI features
OPENAI_API_KEY=your_openai_api_key_here
```

4. Run the development server:
```bash
pnpm dev
```

5. Open [http://localhost:3000](http://localhost:3000) in your browser.

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
5. **Connect Nodes**: Use the arrow tool to draw edges between nodes
6. **Delete**: Select items and press Delete or use the toolbar button
7. **Undo/Redo**: Use Ctrl+Z / Ctrl+Shift+Z or toolbar buttons

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
- **New**: File → New (clears the canvas)
- **Save**: File → Save (downloads JSON file)
- **Open**: File → Open (load JSON file)
- **Export SVG**: File → Export SVG

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

#### 4. AI Agent (`app/api/agent/route.ts`)
Server route that:
1. Receives action (generate/cleanup/explain) + context
2. Calls OpenAI with structured prompts
3. Validates returned diff against schema
4. Returns diff or explanation to client

Client (`components/AIPanel.tsx`):
1. Sends request to `/api/agent`
2. Shows preview of diff
3. User accepts → apply to store
4. User rejects → discard

### Tech Stack

- **Framework**: Next.js 15 (App Router)
- **Language**: TypeScript
- **Styling**: Tailwind CSS
- **Components**: shadcn/ui + lucide-react
- **State**: Zustand
- **Validation**: Zod
- **AI**: Vercel AI SDK + OpenAI
- **Layout**: Custom hierarchical layout (ELKJS integration pending)
- **Testing**: Vitest

### Project Structure

```
draw.ai/
├── app/
│   ├── api/agent/route.ts      # AI agent endpoint
│   ├── layout.tsx              # Root layout with theme provider
│   ├── page.tsx                # Main editor page
│   └── globals.css             # Global styles + Tailwind
├── components/
│   ├── ui/                     # shadcn/ui components
│   ├── AIPanel.tsx             # AI interaction panel
│   ├── Canvas.tsx              # SVG canvas with editing
│   ├── EditorShell.tsx         # Main layout container
│   ├── InspectorTabs.tsx       # Right sidebar tabs
│   ├── ShapePalette.tsx        # Left shape picker
│   └── theme-provider.tsx      # Theme context
├── lib/
│   ├── model/
│   │   ├── diagram.ts          # Data model + schemas
│   │   └── diff.ts             # Diff operations
│   ├── store/
│   │   └── useDiagramStore.ts  # Zustand store
│   ├── layout/
│   │   └── layout.ts           # Layout algorithms
│   ├── export/
│   │   └── svg.ts              # SVG export
│   └── utils.ts                # Utility functions
├── tests/
│   ├── diff.test.ts            # Diff operation tests
│   └── schema.test.ts          # Schema validation tests
├── package.json
├── tsconfig.json
├── tailwind.config.ts
└── next.config.js
```

## Development

### Running Tests

```bash
pnpm test
```

Tests cover:
- Diff operations (apply, invert, validate)
- Schema validation
- Undo/redo correctness

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

**Note**: This is an MVP. Some features are marked as TODO and will be implemented in future versions. The AI agent requires an OpenAI API key to function.
