# Contributing to draw.ai

Thank you for your interest in contributing to draw.ai! This document provides guidelines and instructions for contributing.

## Getting Started

1. Fork the repository
2. Clone your fork: `git clone https://github.com/YOUR_USERNAME/draw.ai.git`
3. Install dependencies: `pnpm install`
4. Create a `.env.local` file with your OpenAI API key (see `.env.example`)
5. Start the dev server: `pnpm dev`

## Development Workflow

### Running the Project

```bash
# Development server
pnpm dev

# Build for production
pnpm build

# Run tests
pnpm test

# Lint code
pnpm lint
```

### Project Structure

- `app/` - Next.js App Router pages and API routes
- `components/` - React components
- `lib/` - Core business logic, utilities, and data models
- `tests/` - Test files

### Key Concepts

#### 1. Diff-Based Changes
All state modifications should go through the diff system:
- Create a `Diff` object with operations
- Apply using `applyDiffWithHistory()` in the store
- This ensures undo/redo works correctly

#### 2. Type Safety
- Use TypeScript for all code
- Validate external data with Zod schemas
- Prefer pure functions for business logic

#### 3. Component Structure
- Keep components small and focused
- Separate UI from business logic
- Use custom hooks for complex state logic

## Making Changes

### Adding a New Feature

1. Create a feature branch: `git checkout -b feature/my-feature`
2. Implement your feature:
   - Add types to `lib/model/` if needed
   - Create components in `components/`
   - Add tests in `tests/`
3. Test your changes: `pnpm test`
4. Build to verify: `pnpm build`
5. Commit your changes: `git commit -m "Add: my feature"`
6. Push and create a pull request

### Adding a New Node Type

1. Add the type to `NodeSchema` in `lib/model/diagram.ts`
2. Update `renderNodeShape()` in `components/Canvas.tsx`
3. Add icon to `ShapePalette.tsx`
4. Update SVG export in `lib/export/svg.ts`
5. Add tests

### Adding a New Diff Operation

1. Create schema in `lib/model/diff.ts`
2. Implement in `applyDiff()`
3. Implement in `invertDiff()`
4. Add validation in `validateDiff()`
5. Add comprehensive tests

### Improving AI Capabilities

The AI agent is in `app/api/chat/route.ts`. When improving:
- Keep prompts clear and specific
- Always validate returned data with Zod
- Test with various inputs
- Handle errors gracefully

## Code Style

### TypeScript
- Use explicit types for function parameters and return values
- Avoid `any` - use `unknown` and type guards if needed
- Use const assertions where appropriate

### React
- Use functional components with hooks
- Extract complex logic into custom hooks
- Use meaningful prop names

### Naming
- Components: PascalCase (`Canvas.tsx`)
- Functions: camelCase (`applyDiff`)
- Types: PascalCase (`Diagram`, `Node`)
- Constants: UPPER_SNAKE_CASE (if truly constant)

## Testing

### Writing Tests
- Test pure functions thoroughly (especially diff operations)
- Test edge cases and error conditions
- Use descriptive test names

### Running Tests
```bash
# Run all tests
pnpm test

# Run specific test file
pnpm test diff.test.ts

# Run tests in watch mode
pnpm test -- --watch
```

## Pull Request Process

1. **Update documentation** - If you add features, update README.md
2. **Add tests** - New features should have tests
3. **Ensure builds pass** - Run `pnpm build` and `pnpm test`
4. **Write clear commit messages** - Explain what and why, not how
5. **Keep PRs focused** - One feature or fix per PR

### Commit Message Format
```
Type: Brief description

Longer explanation if needed.
```

Types:
- `Add:` - New feature
- `Fix:` - Bug fix
- `Update:` - Improvements to existing features
- `Refactor:` - Code refactoring
- `Docs:` - Documentation changes
- `Test:` - Test additions or fixes

## Areas for Contribution

### High Priority
- [ ] ELKJS integration for better layouts
- [ ] Bezier curve edges with control points
- [ ] PNG export implementation
- [ ] Mermaid import/export
- [ ] Keyboard shortcuts panel
- [ ] Touch/mobile support

### Medium Priority
- [ ] Alignment guides
- [ ] Distribution tools (align, distribute)
- [ ] Node templates library
- [ ] Custom node shapes
- [ ] Zoom controls UI
- [ ] Minimap

### Nice to Have
- [ ] Collaborative editing
- [ ] Version history
- [ ] Comments and annotations
- [ ] Diagram templates
- [ ] Export to other formats (PDF, PNG)

## Questions?

- Open an issue for bugs or feature requests
- Start a discussion for questions or ideas
- Check existing issues before creating new ones

## Code of Conduct

- Be respectful and inclusive
- Provide constructive feedback
- Focus on what's best for the project
- Help others learn and grow

Thank you for contributing to draw.ai!
