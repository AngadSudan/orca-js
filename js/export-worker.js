const defaultVpc = {
	name: 'vpc',
	resource: 'aws_vpc',
	variables: { cidr_block: '10.10.10.10/16' },
	dependencies: [],
	output: ['aws_vpc.id'],
	terraform: {
		'aws_vpc/main.tf': 'resource "aws_vpc" "aws_vpc" {\n  cidr_block = var.cidr_block\n}',
		'aws_vpc/outputs.tf': 'output "id" {\n  value = aws_vpc.aws_vpc.id\n}',
		'aws_vpc/variables.tf': 'variable "cidr_block" {\n  type = string\n}'
	},
	contains: []
};

function identifier(value) {
	const result = String(value || 'resource').toLowerCase().replace(/[^a-z0-9_]+/g, '_').replace(/^_+|_+$/g, '');
	return result || 'resource';
}

function terraformResource(node) {
	const key = identifier(node.key || node.label);
	const knownResources = {
		app_elb: 'aws_lb',
		asg: 'aws_autoscaling_group',
		ec2: 'aws_instance',
		lambda: 'aws_lambda_function',
		rds: 'aws_db_instance',
		s3: 'aws_s3_bucket',
		sqs: 'aws_sqs_queue',
		dynamo_db: 'aws_dynamodb_table',
		kinesis: 'aws_kinesis_stream',
		iam_role: 'aws_iam_role',
		vpc: 'aws_vpc'
	};
	return knownResources[key] || (node.providerId === 'aws' ? `aws_${key}` : key);
}

function variablesFor(node, provider) {
	if (node.environmentValues) return node.environmentValues;
	if (node.environmentVariables) return Object.fromEntries(Object.entries(node.environmentVariables).map(([key, definition]) => [key, definition.default ?? '']));
	const resource = provider?.resources?.[node.key];
	return Object.fromEntries(Object.entries(resource?.environmentVariables || {}).map(([key, definition]) => [key, definition.default ?? '']));
}

function terraformFiles(node, resource, variables) {
	const name = identifier(node.key || node.label);
	const args = Object.keys(variables).slice(0, 4).map((key) => `  ${key} = var.${key}`).join('\n');
	return {
		[`${name}/main.tf`]: `resource "${resource}" "${name}" {\n${args || '  # Add resource arguments here'}\n}`,
		[`${name}/outputs.tf`]: `output "id" {\n  value = ${resource}.${name}.id\n}`,
		[`${name}/variables.tf`]: Object.keys(variables).map((key) => `variable "${key}" {\n  type = any\n}`).join('\n\n') || ''
	};
}

function buildNode(node, providerById, dependencies) {
	const name = identifier(node.key || node.label);
	const provider = providerById[node.providerId] || providerById.aws;
	const variables = variablesFor(node, provider);
	const resource = terraformResource(node);
	return {
		name,
		resource,
		variables,
		dependencies,
		output: [`${name}.id`],
		terraform: terraformFiles(node, resource, variables),
		contains: []
	};
}

function quote(value) {
	if (typeof value !== 'string') return JSON.stringify(value, null, 2);
	return `\`${value.replace(/`/g, '\\`')}\``;
}

function serialize(value, level = 0) {
	const indent = '  '.repeat(level);
	const childIndent = '  '.repeat(level + 1);
	if (Array.isArray(value)) return `[${value.map((item) => serialize(item, level + 1)).join(', ')}]`;
	if (value && typeof value === 'object') {
		return `{\n${Object.entries(value).map(([key, item]) => `${childIndent}${objectKey(key)}: ${serialize(item, level + 1)}`).join(',\n')}\n${indent}}`;
	}
	return quote(value);
}

function objectKey(value) {
	return /^[a-zA-Z_$][\w$]*$/.test(value) ? value : JSON.stringify(value);
}

function generateConfig({ project, providers }) {
	const nodes = project.nodes || [];
	const nodeById = Object.fromEntries(nodes.map((node) => [node.id, node]));
	const children = nodes.map((node) => {
		const dependencies = (project.edges || []).filter((edge) => edge.to === node.id).map((edge) => identifier(nodeById[edge.from]?.key || nodeById[edge.from]?.label));
		const providerResource = providers.find((provider) => provider.key === node.key || provider.label === node.label);
		const normalizedNode = {
			...node,
			key: node.key || providerResource?.key,
			providerId: node.providerId || providerResource?.providerId,
			environmentVariables: node.environmentVariables || providerResource?.environmentVariables
		};
		return buildNode(normalizedNode, {}, dependencies);
	});
	return `const config: ResourceGraph = ${serialize({ vpc: { ...defaultVpc, contains: children } })};\n`;
}

self.addEventListener('message', (event) => {
	self.postMessage({ content: generateConfig(event.data) });
});
