export class ProviderCatalog {
	constructor(url = '../assets/provider.json') {
		this.url = url;
		this.items = [];
	}

	async load() {
		const response = await fetch(this.url);
		if (!response.ok) throw new Error(`Unable to load provider catalog: ${response.status}`);
		const data = await response.json();
		this.items = Object.values(data).flatMap((provider) => Object.entries(provider.resources || {}).map(([key, resource]) => ({
			key,
			provider: provider.name,
			providerId: provider.id,
			label: resource.label,
			iconUrl: resource.icon_url,
			environmentVariables: resource.environmentVariables || {}
		})));
		return this;
	}

	find(node) {
		return this.items.find((item) => item.key === node.key || item.label === node.label);
	}

	search(query = '') {
		const normalized = query.toLowerCase();
		return this.items.filter((item) => `${item.label} ${item.key} ${item.provider}`.toLowerCase().includes(normalized));
	}
}
