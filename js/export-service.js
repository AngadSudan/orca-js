export class ExportService {
	constructor(workerUrl = '../js/export-worker.js') {
		this.worker = new Worker(workerUrl);
	}

	export(project, providers) {
		return new Promise((resolve, reject) => {
			const onMessage = (event) => {
				this.worker.removeEventListener('message', onMessage);
				this.worker.removeEventListener('error', onError);
				const blob = new Blob([event.data.content], { type: 'text/typescript' });
				const url = URL.createObjectURL(blob);
				const link = document.createElement('a');
				link.href = url;
				link.download = `${project.name.toLowerCase().replace(/[^a-z0-9]+/g, '-') || 'orca-architecture'}-config.ts`;
				link.click();
				URL.revokeObjectURL(url);
				resolve();
			};
			const onError = (error) => {
				this.worker.removeEventListener('message', onMessage);
				this.worker.removeEventListener('error', onError);
				reject(error);
			};
			this.worker.addEventListener('message', onMessage);
			this.worker.addEventListener('error', onError);
			this.worker.postMessage({ project, providers: providers.items });
		});
	}
}
