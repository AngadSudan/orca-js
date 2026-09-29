export class ProjectStore {
	constructor(databaseName = 'orca-projects', storeName = 'projects') {
		this.databaseName = databaseName;
		this.storeName = storeName;
		this.database = null;
	}

	open() {
		return new Promise((resolve, reject) => {
			const request = indexedDB.open(this.databaseName, 1);
			request.onsuccess = () => { this.database = request.result; resolve(this); };
			request.onerror = () => reject(request.error);
		});
	}

	get(id) {
		return this.request('readonly', (store) => store.get(id));
	}

	put(project) {
		return this.request('readwrite', (store) => store.put(project));
	}

	request(mode, operation) {
		return new Promise((resolve, reject) => {
			const request = operation(this.database.transaction(this.storeName, mode).objectStore(this.storeName));
			request.onsuccess = () => resolve(request.result);
			request.onerror = () => reject(request.error);
		});
	}
}
