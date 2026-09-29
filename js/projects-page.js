const databaseName = 'orca-projects';
const databaseVersion = 1;
const storeName = 'projects';
let database;
let projects = [];

function openDatabase() {
	return new Promise((resolve, reject) => {
		const request = indexedDB.open(databaseName, databaseVersion);
		request.onupgradeneeded = () => {
			const store = request.result.createObjectStore(storeName, { keyPath: 'id', autoIncrement: true });
			store.createIndex('status', 'status');
		};
		request.onsuccess = () => resolve(request.result);
		request.onerror = () => reject(request.error);
	});
}

function readProjects() {
	return new Promise((resolve, reject) => {
		const request = database.transaction(storeName, 'readonly').objectStore(storeName).getAll();
		request.onsuccess = () => resolve(request.result.sort((first, second) => second.updatedAt - first.updatedAt));
		request.onerror = () => reject(request.error);
	});
}

function saveProject(project) {
	return new Promise((resolve, reject) => {
		const request = database.transaction(storeName, 'readwrite').objectStore(storeName).add(project);
		request.onsuccess = () => resolve();
		request.onerror = () => reject(request.error);
	});
}

function removeProject(id) {
	return new Promise((resolve, reject) => {
		const key = Number.isNaN(Number(id)) ? id : Number(id);
		const request = database.transaction(storeName, 'readwrite').objectStore(storeName).delete(key);
		request.onsuccess = () => resolve();
		request.onerror = () => reject(request.error);
	});
}

function typeTitle(element, text) {
	let character = 0;
	const typeNext = () => {
		element.textContent = text.slice(0, character);
		character += 1;
		if (character <= text.length) window.setTimeout(typeNext, 70);
	};
	typeNext();
}

function renderProjects() {
	const query = document.querySelector('#project-search').value.trim().toLowerCase();
	const status = document.querySelector('#project-filter').value;
	const visibleProjects = projects.filter((project) => {
		const matchesQuery = `${project.name} ${project.description}`.toLowerCase().includes(query);
		return matchesQuery && (status === 'all' || project.status === status);
	});
	const list = document.querySelector('#project-list');
	list.innerHTML = visibleProjects.map((project) => `
		<article class="project-card" data-project-id="${project.id}" tabindex="0" role="link" aria-label="Open ${escapeHtml(project.name)}">
			<div>
				<div class="card-meta"><span class="status">${project.status}</span><span>${new Date(project.updatedAt).toLocaleDateString()}</span></div>
				<h3>${escapeHtml(project.name)}</h3>
				<p>${escapeHtml(project.description || 'No description yet.')}</p>
			</div>
			<div class="card-meta"><span>Project board</span><button class="delete-button" data-delete-id="${project.id}" type="button">Delete</button></div>
		</article>`).join('');
	document.querySelector('#project-count').textContent = `${visibleProjects.length} ${visibleProjects.length === 1 ? 'project' : 'projects'}`;
	document.querySelector('#empty-state').hidden = visibleProjects.length > 0;
}

function escapeHtml(value) {
	return value.replace(/[&<>'"]/g, (character) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' })[character]);
}

async function loadData() {
	database = await openDatabase();
	projects = await readProjects();
	renderProjects();
}

document.addEventListener('DOMContentLoaded', () => {
	typeTitle(document.querySelector('#page-title'), document.querySelector('#page-title').dataset.typingText);
	document.querySelector('#project-search').addEventListener('input', renderProjects);
	document.querySelector('#project-filter').addEventListener('change', renderProjects);

	const dialog = document.querySelector('#project-dialog');
	document.querySelector('#add-project').addEventListener('click', () => dialog.showModal());
	document.querySelector('#close-dialog').addEventListener('click', () => dialog.close());
	document.querySelector('#cancel-dialog').addEventListener('click', () => dialog.close());
	document.querySelector('#project-form').addEventListener('submit', async (event) => {
		event.preventDefault();
		const formElement = event.currentTarget;
		const form = new FormData(formElement);
		await saveProject({ id: crypto.randomUUID(), name: form.get('name').trim(), description: form.get('description').trim(), status: 'active', updatedAt: Date.now() });
		projects = await readProjects();
		renderProjects();
		formElement.reset();
		dialog.close();
	});
	document.querySelector('#project-list').addEventListener('click', async (event) => {
		const button = event.target.closest('[data-delete-id]');
		if (button) {
			await removeProject(button.dataset.deleteId);
			projects = await readProjects();
			renderProjects();
			return;
		}
		const card = event.target.closest('[data-project-id]');
		if (card) window.location.href = `../html/drawboard.html?projectId=${encodeURIComponent(card.dataset.projectId)}`;
	});
	document.querySelector('#project-list').addEventListener('keydown', (event) => {
		if (event.key !== 'Enter' && event.key !== ' ') return;
		const card = event.target.closest('[data-project-id]');
		if (!card) return;
		event.preventDefault();
		window.location.href = `../html/drawboard.html?projectId=${encodeURIComponent(card.dataset.projectId)}`;
	});
	loadData().catch(() => {
		document.querySelector('#project-list').innerHTML = '<p class="empty-state">This browser does not support local project storage.</p>';
	});
});