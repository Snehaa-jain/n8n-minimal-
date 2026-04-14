# 🔄 Minimal n8n — Visual AI Workflow Builder

A lightweight, browser-based workflow automation tool inspired by [n8n](https://n8n.io), built with **Next.js 16**, **React Flow**, and **Groq AI**. Drag, drop, and connect nodes to build powerful automations — no backend infrastructure required.

---

## 📌 Table of Contents

- [Overview](#overview)
- [Tech Stack](#tech-stack)
- [Project Structure](#project-structure)
- [Core Features](#core-features)
- [Node Types](#node-types)
- [Architecture & Data Flow](#architecture--data-flow)
- [Key Files Explained](#key-files-explained)
- [API Routes](#api-routes)
- [State Management](#state-management)
- [Template Variables](#template-variables)
- [Getting Started](#getting-started)
- [Environment Variables](#environment-variables)
- [Interview Q&A Guide](#interview-qa-guide)

---

## Overview

**Minimal n8n** is a visual workflow automation builder that lets users:

1. **Drag nodes** from a sidebar onto an infinite canvas
2. **Connect nodes** by drawing edges between them
3. **Configure each node** via a slide-in panel (double-click a node)
4. **Execute the workflow** by clicking "Execute" — nodes run sequentially following edge connections

It supports **Trigger**, **AI**, **Action**, and **Logic** node categories, with AI nodes powered by the **Groq API** (using `llama-3.3-70b-versatile`).

---

## Tech Stack

| Layer | Technology | Purpose |
|---|---|---|
| Framework | Next.js 16 (App Router) | Full-stack React framework |
| Language | TypeScript 5 | Type safety throughout |
| Canvas | React Flow 11 | Node-based graph UI |
| State | Zustand 5 | Global workflow state |
| AI | Groq SDK + `llama-3.3-70b-versatile` | AI node execution |
| Styling | Tailwind CSS 4 | Utility-first styling |
| UI Components | Radix UI primitives | Accessible, unstyled components |
| Icons | Lucide React | Consistent icon set |

---

## Project Structure

```
n8n-minimal/
├── app/
│   ├── page.tsx                  # Main canvas page — entry point
│   ├── layout.tsx                # Root layout with metadata
│   ├── globals.css               # Global CSS + Tailwind base
│   └── api/
│       ├── ai/execute/route.ts   # API route: runs AI nodes via Groq
│       └── http-proxy/route.ts   # API route: proxies HTTP requests (CORS fix)
│
├── components/
│   ├── CustomNode.tsx            # Visual representation of each node on canvas
│   ├── NodeConfigPanel.tsx       # Slide-in config panel (double-click a node)
│   └── Sidebar.tsx               # Left sidebar: node palette + Execute button
│   └── ui/                       # Radix-based reusable UI primitives
│       ├── button.tsx
│       ├── input.tsx
│       ├── label.tsx
│       ├── select.tsx
│       └── textarea.tsx
│
├── lib/
│   ├── types.ts                  # All TypeScript interfaces and types
│   ├── store.ts                  # Zustand global state store
│   ├── node-definitions.ts       # Registry of all node types + config schemas
│   ├── executor.ts               # Client-side workflow execution engine
│   └── utils.ts                  # Utility helpers (cn for class names)
│
├── public/                       # Static assets
├── package.json
├── next.config.ts
└── tsconfig.json
```

---

## Core Features

### 🖱️ Drag-and-Drop Canvas
Nodes are draggable from the sidebar onto the React Flow canvas. Position is determined using `reactFlowInstance.screenToFlowPosition()` which converts screen coordinates to canvas coordinates.

### 🔗 Edge Connections
Nodes connect via handles (left = input, right = output). Edges are animated `smoothstep` type and stored in Zustand state. Trigger nodes have no input handle since they start the chain.

### ⚙️ Node Configuration
Double-clicking any node opens `NodeConfigPanel` — a right-side drawer that dynamically renders form fields based on the node's `configFields` definition. Supports `text`, `number`, `textarea`, and `select` field types.

### ▶️ Sequential Execution
Execution starts from **trigger nodes** (nodes with no incoming edges) and traverses the graph depth-first via `executeNodeChain`. Each node receives the previous node's output as its `input`.

### 🧠 AI Integration
AI nodes call the `/api/ai/execute` backend route, which uses the **Groq SDK** to run `llama-3.3-70b-versatile`. The server-side route keeps the API key secure and out of the browser.

### 🌐 HTTP Proxy
The `/api/http-proxy` route solves CORS issues by making external HTTP requests server-side and returning the response to the client.

---

## Node Types

### 🟦 Trigger Nodes
These start a workflow. They have no input handle.

| Node | Type Key | Description |
|---|---|---|
| Webhook Trigger | `webhook` | Simulates receiving an HTTP webhook. Outputs trigger metadata. |
| Schedule Trigger | `schedule` | Simulates a time-based trigger. Configurable interval and unit. |

### 🟣 AI Nodes
These call the Groq API via the backend route.

| Node | Type Key | Description |
|---|---|---|
| AI Text Generator | `aiTextGenerator` | Generates text from a prompt. Configurable temperature and max tokens. |
| AI Content Analyzer | `aiAnalyzer` | Sentiment analysis, keyword extraction, or summarization. |
| AI Chatbot | `aiChatbot` | Generates chat responses with a system prompt and personality. |
| AI Data Extractor | `aiDataExtractor` | Extracts structured JSON from unstructured text using a schema. |

### 🟢 Action Nodes
These perform real-world actions (or simulations).

| Node | Type Key | Description |
|---|---|---|
| HTTP Request | `httpRequest` | Makes GET/POST/PUT/DELETE requests via the proxy. Supports template vars. |
| Data Transform | `dataTransform` | Runs arbitrary JavaScript to transform data. Uses `new Function()`. |
| Send Email | `sendEmail` | Simulates sending an email. Returns a mock sent confirmation object. |

### 🔵 Logic Nodes
These control workflow branching and timing.

| Node | Type Key | Description |
|---|---|---|
| If/Else | `ifElse` | Evaluates a JavaScript expression and outputs branch: `"true"` or `"false"`. |
| Delay | `delay` | Waits for a set duration (ms or seconds) before passing data through. |

---

## Architecture & Data Flow

```
User Interaction
      │
      ▼
  page.tsx (React Flow canvas)
      │
      ├── Drag node from Sidebar ──► addNode() ──► Zustand store
      │
      ├── Connect nodes ──────────► addEdge() ──► Zustand store
      │
      ├── Double-click node ──────► NodeConfigPanel (updateNode config)
      │
      └── Click "Execute" ─────────────────────────────────────────────────►
                                                                            │
                                                          WorkflowExecutor.executeNode()
                                                                            │
                                    ┌─────────────────────────────────────┤
                                    │                                      │
                              trigger nodes                          other nodes
                                    │                                      │
                                    ▼                                      ▼
                              pass-through                    fetch("/api/ai/execute")
                              output object                  fetch("/api/http-proxy")
                                                             new Function(code)(input)
                                                             setTimeout(ms)
                                    │
                                    └──► updateNode() ──► Zustand ──► CustomNode re-renders
```

---

## Key Files Explained

### `lib/types.ts`
Defines the core data model:
- **`NodeData`** — what's stored inside each node: `label`, `type`, `config`, `output`, `isExecuting`, `error`
- **`WorkflowNode`** — extends React Flow's `Node` with typed `data`
- **`NodeExecutionContext`** — what the executor receives: `nodeId`, `input`, `config`, `previousNodes`
- **`WorkflowState`** — the Zustand store interface

### `lib/node-definitions.ts`
Acts as a **registry** for all node types. Each definition contains:
- `type` — unique key used throughout the app
- `category` — controls how the executor routes execution
- `icon` — Lucide icon component
- `color` — Tailwind class for the node header
- `defaultConfig` — pre-filled values when a node is first dropped
- `configFields` — schema for the config panel form (field name, type, options, placeholder)

> **Why this pattern?** Centralizing node definitions means adding a new node type only requires adding one entry here. The sidebar, canvas, config panel, and executor all derive behavior from this single source of truth.

### `lib/store.ts`
Zustand store holding the entire workflow state. Key methods:
- `addNode` / `deleteNode` — manage node list
- `updateNode` — partial update a node's data (used by executor for output/error/isExecuting)
- `addEdge` / `deleteEdge` — manage connections
- `setNodes` / `setEdges` — used by React Flow change handlers
- `clearWorkflow` — reset canvas

### `lib/executor.ts`
The client-side execution engine. Routes each node to its handler based on `category`:
- `trigger` → `executeTriggerNode` (pass-through)
- `ai` → `executeAINodeType` (calls `/api/ai/execute`)
- `action` → `executeActionNode` (HTTP, transform, email)
- `logic` → `executeLogicNode` (if/else, delay)

Also contains `replaceTemplateVariables()` — parses `{{input}}` and `{{input.fieldName}}` patterns in config strings before execution.

### `components/CustomNode.tsx`
Memoized React Flow node component. Renders:
- Colored header with icon and label
- Input handle (left) — hidden for trigger nodes
- Output handle (right) — always visible
- Status indicators: spinning loader, green checkmark, red error badge
- Config summary badge and output confirmation

### `components/Sidebar.tsx`
Left panel with:
- Execute + Clear buttons
- Nodes grouped by category (trigger, ai, action, logic)
- Each node card is `draggable`, sets `dataTransfer` data on drag start

### `components/NodeConfigPanel.tsx`
Right-side slide-in drawer that:
- Looks up the node's definition to find `configFields`
- Dynamically renders the appropriate input type per field
- On save, calls `updateNode(nodeId, { config })`
- Displays `Last Output` as formatted JSON if node has been executed

---

## API Routes

### `POST /api/ai/execute`
**Purpose:** Server-side AI execution (keeps API key secret)

**Request body:**
```json
{ "type": "aiTextGenerator", "config": { "prompt": "...", "temperature": "0.7" }, "input": {} }
```

**Supported types:** `aiTextGenerator`, `aiAnalyzer`, `aiChatbot`, `aiDataExtractor`

**Groq model used:** `llama-3.3-70b-versatile`

Each AI type constructs appropriate system/user messages:
- **Text Generator** — simple completion with configurable temperature/tokens
- **Analyzer** — system prompt varies by `analysisType` (sentiment/keywords/summary)
- **Chatbot** — system prompt + personality modifier + user message
- **Data Extractor** — instructs model to return only JSON matching a schema; parses result

---

### `POST /api/http-proxy`
**Purpose:** Proxy external HTTP requests to avoid browser CORS restrictions

**Request body:**
```json
{ "url": "https://api.example.com", "method": "GET", "headers": "{}", "body": "{}" }
```

**Response:** `{ status, statusText, headers, data }` — auto-detects JSON vs text response body.

---

## State Management

Zustand was chosen over Redux/Context for:
- **Zero boilerplate** — no actions, reducers, or providers needed
- **Direct mutations** — `set()` replaces slices of state
- **Outside-component access** — `useWorkflowStore.getState()` used in `handleNodesChange` to avoid stale closures

The store is used across `page.tsx`, `Sidebar.tsx`, `NodeConfigPanel.tsx`, and `CustomNode.tsx`.

---

## Template Variables

A custom template system allows node configs to reference previous node output:

| Syntax | Resolves to |
|---|---|
| `{{input}}` | Entire previous node output (JSON stringified if object) |
| `{{input.fieldName}}` | Specific field from previous output |
| `{{input.nested.field}}` | Deep nested field access |

Example: In an HTTP Request URL field: `https://api.example.com/users/{{input.userId}}`

The same `replaceTemplateVariables()` function is implemented in both `lib/executor.ts` (client, for non-AI nodes) and `app/api/ai/execute/route.ts` (server, for AI node prompts).

---

## Getting Started

### Prerequisites
- Node.js 18+
- A free [Groq API key](https://console.groq.com)

### Installation

```bash
# Clone the repo
git clone https://github.com/your-username/n8n-minimal.git
cd n8n-minimal

# Install dependencies
npm install

# Set up environment variables
cp .env.example .env.local
# Add your GROQ_API_KEY to .env.local

# Start development server
npm run dev
```

Open [http://localhost:3000](http://localhost:3000)

### Usage
1. Drag a **Trigger** node from the sidebar onto the canvas
2. Drag an **AI** or **Action** node and connect it to the trigger
3. Double-click any node to configure it
4. Click **Execute** to run the workflow

---

## Environment Variables

Create a `.env.local` file in the project root:

```env
GROQ_API_KEY=your_groq_api_key_here
```

> ⚠️ Never commit `.env.local` to version control. It is listed in `.gitignore`.

---

## Interview Q&A Guide

### Q: Why Next.js instead of plain React?
**A:** Next.js provides the App Router for file-based routing, and critically, **API Routes** — which allow server-side code (the Groq API calls and HTTP proxy) to run in the same project. This avoids CORS issues and keeps secrets server-side without needing a separate backend.

### Q: Why Zustand over Redux or Context?
**A:** Zustand offers the simplest API for global state with no boilerplate. The workflow state (nodes and edges) is shared across many components and needs to be updated from within the executor — Zustand's `getState()` allows synchronous reads outside React's render cycle, which is important for the execution loop.

### Q: How does execution order work?
**A:** The executor identifies trigger nodes (nodes with no incoming edges). It then runs `executeNodeChain` recursively — each node's output becomes the input to all connected downstream nodes via DFS traversal of `edges`. `executedNodes` is a Set that prevents re-execution of already-visited nodes.

### Q: Why use a proxy API route for HTTP requests?
**A:** Browsers block cross-origin requests unless the target server sets CORS headers. Since users can target any API URL, routing through `/api/http-proxy` (a server-side Next.js route) bypasses this restriction entirely.

### Q: How is the `DataTransform` node implemented? Is it safe?
**A:** It uses `new Function("input", code)` to execute user-provided JavaScript. This is a deliberate trade-off for flexibility in a developer-facing tool. In production, a sandboxed VM (like `vm2` or a WebAssembly-based sandbox) would be more appropriate.

### Q: What does `memo()` do on `CustomNode`?
**A:** `React.memo` prevents re-rendering a node unless its props change. Since React Flow renders many nodes and updates them frequently during execution, memoization is critical for performance.

### Q: How are configFields used?
**A:** Each node definition in `node-definitions.ts` includes a `configFields` array. `NodeConfigPanel` iterates this array and renders the correct input component (`Input`, `Textarea`, `Select`) for each field — making the config panel fully data-driven with no hard-coded field rendering.

### Q: What is `screenToFlowPosition` used for?
**A:** When a node is dropped on the canvas, the browser gives screen coordinates (pixels from the viewport edge). React Flow's `screenToFlowPosition()` converts these to the canvas's internal coordinate space, accounting for pan and zoom, so nodes appear exactly where they are dropped.

---

## License

MIT — Free to use and modify.
