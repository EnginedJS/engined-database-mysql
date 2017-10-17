const { Service } = require('engined');
const Database = require('engined-database');
const Agent = require('./lib/agent');

module.exports = (opts = {}) => class extends Database() {

	constructor(context) {
		super(context);

		this.opts = {
			agentName: opts.agentName || 'mysql',
			modelPaths: opts.modelPaths || [],
			autoCreateTable: opts.autoCreateTable || false,
			host: opts.host || 'localhost',
			port: opts.port || 3306,
			username: opts.username || '',
			password: opts.password || '',
			database: opts.database || '',
			options: Object.assign({
				operatorsAliases: false
			}, opts.options)
		};
	}

	async start() {

		await super.start();

		let agentManager = this.getContext().get('Database');
		let agent = new Agent(this.opts);

		await agent.initialize();

		if (!(await agent.testConnection())) {
			throw new Error('Unable to connect to the database');
		}

		agentManager.register(this.opts.agentName, agent);
		
	}

	async stop() {

		let agentManager = this.getContext().get('Database');

		agentManager.unregister(this.opts.agentName);

		await super.stop();
	}
}
