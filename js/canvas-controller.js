import { escapeHtml } from './ui-utils.js';

export class CanvasController {
	constructor({ project, catalog, onChange }) {
		this.project = project;
		this.catalog = catalog;
		this.onChange = onChange;
		this.viewport = project.viewport || { scale: 1, x: 0, y: 0 };
		this.connectMode = false;
		this.connectionStart = null;
		this.connectionDragging = false;
		this.dragState = null;
		this.panState = null;
	}

	initialize() {
		this.board = document.querySelector('#canvas-board');
		this.canvas = document.querySelector('#board-canvas');
		this.edgeLayer = document.querySelector('#edge-layer');
		this.nodeLayer = document.querySelector('#node-layer');
		this.bindEvents();
		this.render();
	}

	render() { this.drawGrid(); this.renderNodes(); this.applyViewport(); }

	drawGrid() {
		const context = this.canvas.getContext('2d');
		const scale = window.devicePixelRatio || 1;
		this.canvas.width = this.board.clientWidth * scale;
		this.canvas.height = this.board.clientHeight * scale;
		context.setTransform(scale, 0, 0, scale, 0, 0);
		context.fillStyle = '#fbfcf8';
		context.fillRect(0, 0, this.board.clientWidth, this.board.clientHeight);
		context.strokeStyle = '#e2e8e1';
		const size = 32 * this.viewport.scale;
		const firstX = ((this.viewport.x % size) + size) % size;
		const firstY = ((this.viewport.y % size) + size) % size;
		for (let x = firstX; x < this.board.clientWidth; x += size) { context.beginPath(); context.moveTo(x, 0); context.lineTo(x, this.board.clientHeight); context.stroke(); }
		for (let y = firstY; y < this.board.clientHeight; y += size) { context.beginPath(); context.moveTo(0, y); context.lineTo(this.board.clientWidth, y); context.stroke(); }
	}

	applyViewport() {
		const transform = `translate(${this.viewport.x}px, ${this.viewport.y}px) scale(${this.viewport.scale})`;
		this.nodeLayer.style.transform = transform;
		this.edgeLayer.style.transform = transform;
		document.querySelector('#zoom-level').textContent = `${Math.round(this.viewport.scale * 100)}%`;
		this.drawGrid();
	}

	zoom(nextScale, centerX = this.board.clientWidth / 2, centerY = this.board.clientHeight / 2) {
		const scale = Math.max(.25, Math.min(2.5, nextScale));
		const worldX = (centerX - this.viewport.x) / this.viewport.scale;
		const worldY = (centerY - this.viewport.y) / this.viewport.scale;
		this.viewport = { scale, x: centerX - worldX * scale, y: centerY - worldY * scale };
		this.applyViewport();
		this.onChange();
	}

	fit() {
		if (!this.project.nodes.length) return;
		const bounds = this.project.nodes.reduce((current, node) => ({ left: Math.min(current.left, node.x), top: Math.min(current.top, node.y), right: Math.max(current.right, node.x + 190), bottom: Math.max(current.bottom, node.y + 72) }), { left: Infinity, top: Infinity, right: -Infinity, bottom: -Infinity });
		const scale = Math.max(.25, Math.min(1.5, Math.min((this.board.clientWidth - 80) / (bounds.right - bounds.left), (this.board.clientHeight - 120) / (bounds.bottom - bounds.top))));
		this.viewport = { scale, x: 40 - bounds.left * scale, y: 60 - bounds.top * scale };
		this.applyViewport();
		this.onChange();
	}

	recoverOffscreenViewport() {
		if (!this.project.nodes.length) return;
		const visible = this.project.nodes.some((node) => {
			const left = node.x * this.viewport.scale + this.viewport.x;
			const top = node.y * this.viewport.scale + this.viewport.y;
			return left < this.board.clientWidth && left + 190 * this.viewport.scale > 0 && top < this.board.clientHeight && top + 72 * this.viewport.scale > 0;
		});
		if (!visible) this.fit();
	}

	renderNodes() {
		this.nodeLayer.innerHTML = this.project.nodes.map((node) => `<article class="canvas-node" data-node-id="${node.id}" style="left:${node.x}px;top:${node.y}px"><button class="node-connect" type="button" aria-label="Select ${escapeHtml(node.label)} for connection">+</button><button class="node-delete" type="button" aria-label="Delete ${escapeHtml(node.label)}">x</button><img src="${escapeHtml(node.iconUrl || '')}" alt=""><div><span>${escapeHtml(node.provider)}</span><h3>${escapeHtml(node.label)}</h3></div></article>`).join('');
		document.querySelector('#canvas-empty').hidden = this.project.nodes.length > 0;
		document.querySelector('#node-count').textContent = `${this.project.nodes.length} ${this.project.nodes.length === 1 ? 'component' : 'components'}`;
		this.renderEdges();
	}

	renderEdges() {
		this.edgeLayer.setAttribute('viewBox', `0 0 ${this.board.clientWidth} ${this.board.clientHeight}`);
		const paths = this.project.edges.map((edge, index) => {
			const from = document.querySelector(`[data-node-id="${edge.from}"]`);
			const to = document.querySelector(`[data-node-id="${edge.to}"]`);
			if (!from || !to) return '';
			const x1 = from.offsetLeft + from.offsetWidth;
			const y1 = from.offsetTop + from.offsetHeight / 2;
			const x2 = to.offsetLeft;
			const y2 = to.offsetTop + to.offsetHeight / 2;
			const path = edge.style === 'straight' ? `M ${x1} ${y1} L ${x2} ${y2}` : `M ${x1} ${y1} Q ${(x1 + x2) / 2} ${(y1 + y2) / 2 + Math.max(32, Math.min(110, Math.abs(x2 - x1) * .22)) * (y2 >= y1 ? 1 : -1)}, ${x2} ${y2}`;
			const className = edge.style === 'straight' ? 'edge-path straight-edge' : 'edge-path';
			return `<path d="${path}" class="${className}" marker-end="url(#arrow)"></path><path d="${path}" class="edge-hit" data-edge-index="${index}" tabindex="0" aria-label="Delete connection" role="button"></path>`;
		}).join('');
		this.edgeLayer.innerHTML = `<defs><marker id="arrow" markerWidth="8" markerHeight="8" refX="7" refY="4" orient="auto"><path d="M 0 0 L 8 4 L 0 8 z" fill="#657818"></path></marker></defs>${paths}`;
	}

	addNode(component) {
		this.project.nodes.push({ id: crypto.randomUUID(), label: component.label, key: component.key, provider: component.provider, providerId: component.providerId, iconUrl: component.iconUrl, environmentVariables: component.environmentVariables, x: 44 + (this.project.nodes.length % 3) * 220, y: 44 + Math.floor(this.project.nodes.length / 3) * 130 });
		this.renderNodes();
		this.onChange();
	}

	bindEvents() {
		document.querySelector('#connect-toggle').addEventListener('click', (event) => { this.connectMode = !this.connectMode; this.connectionStart = null; event.currentTarget.classList.toggle('active', this.connectMode); event.currentTarget.textContent = this.connectMode ? 'Click two nodes' : 'Connect nodes'; });
		document.querySelector('#zoom-in').addEventListener('click', () => this.zoom(this.viewport.scale + .1));
		document.querySelector('#zoom-out').addEventListener('click', () => this.zoom(this.viewport.scale - .1));
		document.querySelector('#zoom-fit').addEventListener('click', () => this.fit());
		document.querySelector('#zoom-reset').addEventListener('click', () => { this.viewport = { scale: 1, x: 0, y: 0 }; this.applyViewport(); this.onChange(); });
		document.querySelector('#edge-style').addEventListener('change', () => {});
		this.board.addEventListener('wheel', (event) => { event.preventDefault(); const box = this.board.getBoundingClientRect(); this.zoom(this.viewport.scale + (event.deltaY < 0 ? .1 : -.1), event.clientX - box.left, event.clientY - box.top); }, { passive: false });
		this.board.addEventListener('pointerdown', (event) => { if (event.target.closest('.canvas-node, .slash-menu, .edge-hit, button')) return; this.panState = { startX: event.clientX, startY: event.clientY, originX: this.viewport.x, originY: this.viewport.y }; this.board.setPointerCapture(event.pointerId); });
		this.board.addEventListener('pointermove', (event) => { if (!this.panState) return; this.viewport.x = this.panState.originX + event.clientX - this.panState.startX; this.viewport.y = this.panState.originY + event.clientY - this.panState.startY; this.applyViewport(); });
		this.board.addEventListener('pointerup', () => { if (this.panState) { this.panState = null; this.onChange(); } });
		this.edgeLayer.addEventListener('click', (event) => { const edge = event.target.closest('.edge-hit'); if (!edge) return; this.project.edges.splice(Number(edge.dataset.edgeIndex), 1); this.renderEdges(); this.onChange(); });
		this.nodeLayer.addEventListener('click', (event) => this.handleNodeClick(event));
		this.nodeLayer.addEventListener('pointerdown', (event) => this.handleNodePointerDown(event));
		this.nodeLayer.addEventListener('pointermove', (event) => this.handleNodePointerMove(event));
		this.nodeLayer.addEventListener('pointerup', (event) => this.handleNodePointerUp(event));
		window.addEventListener('resize', () => { this.drawGrid(); this.renderEdges(); });
	}

	handleNodeClick(event) {
		const nodeElement = event.target.closest('.canvas-node');
		if (!nodeElement) return;
		const nodeId = nodeElement.dataset.nodeId;
		if (event.target.closest('.node-delete')) { this.project.nodes = this.project.nodes.filter((node) => node.id !== nodeId); this.project.edges = this.project.edges.filter((edge) => edge.from !== nodeId && edge.to !== nodeId); this.render(); this.onChange(); return; }
		if (!this.connectMode || event.target.closest('.node-connect') || this.connectionDragging) return;
		if (!this.connectionStart) { this.connectionStart = nodeId; nodeElement.classList.add('connection-source'); return; }
		if (this.connectionStart !== nodeId) this.project.edges.push({ from: this.connectionStart, to: nodeId, style: document.querySelector('#edge-style').value });
		document.querySelectorAll('.connection-source').forEach((node) => node.classList.remove('connection-source')); this.connectionStart = null; this.renderEdges(); this.onChange();
	}

	handleNodePointerDown(event) {
		const node = event.target.closest('.canvas-node'); if (!node) return;
		if (event.target.closest('.node-connect')) { this.connectionDragging = true; this.connectionStart = node.dataset.nodeId; node.classList.add('connection-source'); event.preventDefault(); return; }
		if (this.connectMode) return;
		const box = this.board.getBoundingClientRect(); this.dragState = { node, offsetX: (event.clientX - box.left - this.viewport.x) / this.viewport.scale - node.offsetLeft, offsetY: (event.clientY - box.top - this.viewport.y) / this.viewport.scale - node.offsetTop }; node.setPointerCapture(event.pointerId);
	}

	handleNodePointerMove(event) { if (!this.dragState) return; const box = this.board.getBoundingClientRect(); this.dragState.node.style.left = `${Math.max(12, (event.clientX - box.left - this.viewport.x) / this.viewport.scale - this.dragState.offsetX)}px`; this.dragState.node.style.top = `${Math.max(12, (event.clientY - box.top - this.viewport.y) / this.viewport.scale - this.dragState.offsetY)}px`; this.renderEdges(); }

	handleNodePointerUp(event) { if (this.connectionDragging) { const target = event.target.closest('.canvas-node'); if (target && target.dataset.nodeId !== this.connectionStart) this.project.edges.push({ from: this.connectionStart, to: target.dataset.nodeId, style: document.querySelector('#edge-style').value }); document.querySelectorAll('.connection-source').forEach((node) => node.classList.remove('connection-source')); this.connectionStart = null; this.connectionDragging = false; this.renderEdges(); this.onChange(); return; } if (!this.dragState) return; const node = this.project.nodes.find((item) => item.id === this.dragState.node.dataset.nodeId); node.x = parseInt(this.dragState.node.style.left, 10); node.y = parseInt(this.dragState.node.style.top, 10); this.dragState = null; this.onChange(); }
}
