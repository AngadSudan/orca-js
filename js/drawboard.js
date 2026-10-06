import { ProjectStore } from './project-store.js';
import { ProviderCatalog } from './provider-catalog.js';
import { CanvasController } from './canvas-controller.js';
import { ExportService } from './export-service.js';
import { escapeHtml, projectId } from './ui-utils.js';

class DrawboardApp {
	constructor() {
		this.store = new ProjectStore();
		this.catalog = new ProviderCatalog();
		this.exporter = new ExportService('../js/export-worker.js');
		this.project = null;
		this.editorMode = 'markdown';
		this.selectedNode = null;
	}

	async start() {
		const requestedId = new URLSearchParams(window.location.search).get('projectId');
		if (!requestedId) throw new Error('Missing project id');
		await this.store.open();
		this.project = await this.store.get(projectId(requestedId));
		if (!this.project) throw new Error('Project not found');
		this.project.nodes ||= [];
		this.project.edges ||= [];
		this.project.viewport ||= { scale: 1, x: 0, y: 0 };
		await this.catalog.load();
		this.renderProjectHeader();
		this.bindEditor();
		this.bindSettings();
		this.canvas = new CanvasController({ project: this.project, catalog: this.catalog, onChange: () => this.save() });
		this.canvas.initialize();
		this.canvas.recoverOffscreenViewport();
		this.bindCanvasCommands();
	}

	renderProjectHeader() {
		document.querySelector('#project-title').textContent = this.project.name;
		document.title = `ORCA | ${this.project.name}`;
		const input = document.querySelector('#editor-input');
		input.value = this.project.editorContent || '';
		this.editorMode = this.project.editorMode || 'markdown';
		document.querySelectorAll('.editor-tab').forEach((tab) => tab.classList.toggle('active', tab.dataset.mode === this.editorMode));
		this.renderPreview();
	}

	renderPreview() {
		const input = document.querySelector('#editor-input');
		const source = input.value;
		const html = this.editorMode === 'html' ? source : escapeHtml(source).replace(/^### (.*)$/gm, '<h3>$1</h3>').replace(/^## (.*)$/gm, '<h2>$1</h2>').replace(/^# (.*)$/gm, '<h1>$1</h1>').replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>').replace(/`(.*?)`/g, '<code>$1</code>').replace(/\n/g, '<br>');
		document.querySelector('#editor-preview').innerHTML = html || '<span class="preview-placeholder">Your rendered brief will appear here.</span>';
	}

	bindEditor() {
		const input = document.querySelector('#editor-input');
		document.querySelectorAll('.editor-tab').forEach((tab) => tab.addEventListener('click', () => { this.editorMode = tab.dataset.mode; document.querySelectorAll('.editor-tab').forEach((item) => item.classList.toggle('active', item === tab)); input.placeholder = this.editorMode === 'html' ? 'Write HTML for the system brief...' : 'Write a brief about the system...'; this.renderPreview(); this.save(); }));
		input.addEventListener('input', () => { this.renderPreview(); clearTimeout(input.saveTimer); input.saveTimer = setTimeout(() => this.save(), 400); });
	}

	bindSettings() {
		const dialog = document.querySelector('#node-settings-dialog');
		document.querySelector('#close-node-settings').addEventListener('click', () => dialog.close());
		document.querySelector('#cancel-node-settings').addEventListener('click', () => dialog.close());
		document.querySelector('#node-settings-form').addEventListener('submit', (event) => { event.preventDefault(); const values = {}; event.currentTarget.querySelectorAll('[data-env-key]').forEach((field) => { field.setCustomValidity(''); const type = field.dataset.envType; if (type === 'boolean') values[field.dataset.envKey] = field.checked; else if (type === 'number') values[field.dataset.envKey] = field.value === '' ? null : Number(field.value); else if (type === 'array' || type === 'object') { try { values[field.dataset.envKey] = JSON.parse(field.value || (type === 'array' ? '[]' : '{}')); } catch { field.setCustomValidity('Enter valid JSON'); } } else values[field.dataset.envKey] = field.value; }); if (!event.currentTarget.reportValidity()) return; this.selectedNode.environmentValues = values; this.save(); dialog.close(); });
	}

	openSettings(node) {
		this.selectedNode = node;
		const definitions = node.environmentVariables || this.catalog.find(node)?.environmentVariables || {};
		document.querySelector('#node-settings-title').textContent = node.label;
		document.querySelector('#node-fields').innerHTML = Object.entries(definitions).map(([key, definition]) => { const value = node.environmentValues?.[key] ?? definition.default ?? (definition.type === 'boolean' ? false : definition.type === 'array' ? [] : definition.type === 'object' ? {} : ''); const id = `env-${key.replace(/[^a-z0-9_-]/gi, '-')}`; if (definition.type === 'boolean') return `<label class="boolean-field" for="${id}"><input id="${id}" data-env-key="${key}" data-env-type="boolean" type="checkbox" ${value ? 'checked' : ''}><span><strong>${escapeHtml(definition.label || key)}</strong><small>${escapeHtml(definition.description || '')}</small></span></label>`; const structured = definition.type === 'array' || definition.type === 'object'; const content = structured ? `<textarea id="${id}" data-env-key="${key}" data-env-type="${definition.type}" rows="4">${escapeHtml(JSON.stringify(value, null, 2))}</textarea>` : `<input id="${id}" data-env-key="${key}" data-env-type="${definition.type || 'string'}" type="${definition.type === 'number' ? 'number' : definition.type === 'password' ? 'password' : 'text'}" value="${escapeHtml(value)}" ${definition.required ? 'required' : ''}>`; return `<label class="environment-field" for="${id}"><span><strong>${escapeHtml(definition.label || key)}</strong><small>${escapeHtml(definition.description || '')}</small></span>${content}</label>`; }).join('') || '<p class="no-fields">This component has no configurable environment variables.</p>';
		document.querySelector('#node-settings-dialog').showModal();
	}

	bindCanvasCommands() {
		document.addEventListener('keydown', (event) => { if (event.key !== '/' || document.activeElement === document.querySelector('#editor-input')) return; event.preventDefault(); this.showSlashMenu(''); });
		document.querySelector('#slash-menu').addEventListener('click', (event) => { const button = event.target.closest('[data-provider-index]'); if (!button) return; document.querySelector('#slash-menu').hidden = true; this.canvas.addNode(this.catalog.items[button.dataset.providerIndex]); });
		document.querySelector('#node-layer').addEventListener('click', (event) => { const node = event.target.closest('.canvas-node'); if (!node || event.target.closest('button')) return; if (!this.canvas.connectMode) this.openSettings(this.project.nodes.find((item) => item.id === node.dataset.nodeId)); });
		document.querySelector('#export-config').addEventListener('click', async () => { try { await this.exporter.export(this.project, this.catalog); document.querySelector('#save-status').textContent = 'Config exported'; } catch { document.querySelector('#save-status').textContent = 'Export failed'; } });
	}

	showSlashMenu(query) { const menu = document.querySelector('#slash-menu'); menu.innerHTML = this.catalog.search(query).map((item) => `<button type="button" data-provider-index="${this.catalog.items.indexOf(item)}"><img src="${escapeHtml(item.iconUrl || '')}" alt=""><span><strong>${escapeHtml(item.label)}</strong><small>${escapeHtml(item.provider)} / ${escapeHtml(item.key)}</small></span></button>`).join('') || '<p>No components found.</p>'; menu.hidden = false; }

	save() { this.project.editorContent = document.querySelector('#editor-input').value; this.project.editorMode = this.editorMode; this.project.viewport = this.canvas?.viewport || this.project.viewport; document.querySelector('#save-status').textContent = 'Saving...'; this.store.put(this.project).then(() => { document.querySelector('#save-status').textContent = 'Saved locally'; }); }
}

document.addEventListener('DOMContentLoaded', () => new DrawboardApp().start().catch(() => { document.querySelector('#project-title').textContent = 'Project not found'; document.querySelector('#save-status').textContent = 'Unable to load project'; }));
