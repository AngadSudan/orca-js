# ORCA

ORCA is a browser-based cloud architecture planning tool that lets you visually design cloud infrastructure as a project board. Users can create projects, add cloud resources such as VPCs, EC2 instances, load balancers, databases, queues, and other components, connect them to represent dependencies, configure resource parameters, and export the architecture as a TypeScript configuration structure.

The current implementation is a lightweight frontend application built with vanilla HTML, CSS, and modern JavaScript modules. Project data is stored locally in the browser using IndexedDB, so the application does not require a backend or database server to run.

## Features

- Create and manage cloud architecture projects
- Visual drag-and-drop style architecture board
- Add cloud resources from a provider catalog
- Represent relationships and dependencies between resources
- Configure resource-specific environment variables
- Support for AWS resources through the provider catalog
- Project search and status filtering
- Markdown/HTML system brief editor
- Automatic local project persistence using IndexedDB
- Export architecture configuration as a TypeScript file
- Web Worker-based configuration generation

## How ORCA Works

The application follows a simple browser-based workflow:

1. A user creates a project.
2. ORCA stores the project locally in IndexedDB.
3. The user opens the project architecture board.
4. Cloud resources are selected from the provider catalog and added to the board.
5. Resources can be connected to represent infrastructure relationships.
6. Each resource can be configured through its environment settings.
7. The project state is automatically saved locally.
8. ORCA generates a TypeScript configuration file from the architecture graph.

## Project Structure

```text
orca-js/
├── assets/
│   ├── logo.png
│   └── provider.json
├── css/
│   ├── drawboard.css
│   ├── homestyle.css
│   └── projects-page.css
├── html/
│   ├── drawboard.html
│   └── projects-page.html
├── js/
│   ├── canvas-controller.js
│   ├── drawboard.js
│   ├── export-service.js
│   ├── export-worker.js
│   ├── project-store.js
│   ├── projects-page.js
│   ├── provider-catalog.js
│   └── ui-utils.js
├── index.html
└── README.md
```

### Main Components

- `index.html` — ORCA landing page.
- `projects-page.html` — project creation, search, filtering, and management interface.
- `drawboard.html` — architecture design workspace.
- `provider.json` — cloud provider and resource catalog.
- `project-store.js` — IndexedDB persistence layer.
- `canvas-controller.js` — architecture canvas, nodes, edges, and viewport handling.
- `provider-catalog.js` — loads and searches available cloud resources.
- `export-service.js` — handles configuration export from the browser.
- `export-worker.js` — generates the exported infrastructure configuration in a Web Worker.

## Prerequisites

ORCA is a static web application, so there is no Node.js backend, database server, or package installation required.

You need:

- A modern web browser with support for:
  - ES Modules
  - IndexedDB
  - Web Workers
  - `crypto.randomUUID()`
- A local static HTTP server

A static HTTP server is recommended because ES modules and browser security policies can prevent the application from working correctly when opened directly with the `file://` protocol.

## Running the Application

### 1. Clone the repository

```bash
git clone <repository-url>
cd orca-js
```

Replace `<repository-url>` with the URL of your ORCA repository.

### 2. Start a local HTTP server

If you have Python installed:

```bash
python3 -m http.server 8000
```

### 3. Open ORCA

Open the following URL in your browser:

```text
http://localhost:8000
```

### 4. Create a project

From the ORCA home page:

1. Open **Projects**.
2. Create a new project.
3. Enter the project name and description.
4. Open the created project.

### 5. Design the architecture

Inside the project board:

1. Add cloud resources from the provider catalog.
2. Position resources on the canvas.
3. Connect resources to represent relationships.
4. Open resource settings to configure parameters.
5. Add a project brief using Markdown or HTML.

### 6. Export the configuration

Use the export functionality from the project board to generate the architecture configuration.

The generated file is downloaded to your browser as a TypeScript configuration file.

## Data Storage

ORCA currently uses the browser's IndexedDB API for local persistence.

The database is:

```text
orca-projects
```

The main object store is:

```text
projects
```

This means project data is stored locally in the browser rather than on a remote server.

Clearing the browser's site data can remove locally stored ORCA projects.

## Cloud Provider Catalog

Cloud resources are defined in:

```text
assets/provider.json
```

The catalog contains provider metadata, resource definitions, icons, environment variables, defaults, and additional customization/dependency information.

This design allows the resource catalog to be extended without changing the core canvas implementation.

## Export Model

ORCA represents an architecture as a graph of nodes and edges.

Conceptually:

```text
Project
├── Nodes
│   ├── Cloud Resource
│   ├── Configuration
│   └── Provider
└── Edges
    ├── Source Resource
    └── Target Resource
```

During export, the graph is converted into a resource configuration containing:

- Resource names
- Terraform-style resource identifiers
- Resource variables
- Resource dependencies
- Resource outputs
- Generated Terraform file structures

The export process runs inside a Web Worker so configuration generation does not block the main browser interface.

## Technology Stack

| Technology | Purpose |
|---|---|
| HTML5 | Application structure |
| CSS3 | UI styling and architecture board presentation |
| JavaScript ES Modules | Application logic |
| IndexedDB | Local project persistence |
| Web Workers | Background configuration generation |
| JSON | Cloud provider/resource catalog |
| Terraform-style configuration | Infrastructure representation |

## Current Scope

The current version focuses on the architecture design and configuration-generation workflow in the browser.

It does not currently require direct cloud credentials or automatically provision infrastructure into a cloud provider account.

The exported configuration can serve as an intermediate representation for a future infrastructure provisioning pipeline.

## License

This project is licensed under the MIT License.

MIT permits users to use, copy, modify, merge, publish, distribute, sublicense, and sell copies of the software, subject to the conditions of the license.

See the `LICENSE` file for the complete license text.

## MIT License

Copyright (c) 2026 ORCA Contributors

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
