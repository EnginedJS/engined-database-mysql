const fs = require('fs');
const path = require('path');
const Sequelize = require('sequelize');
const debug = require('debug')('service:database:mysql');

module.exports = class Agent {

	constructor(opts) {

		this.opts = opts;
		this.Sequelize = Sequelize;
		this.sequelize = new Sequelize(opts.database, opts.username, opts.password, Object.assign({
			host: opts.host,
			port: opts.port,
			dialect: 'mysql',
			define: {
				charset: 'utf8',
				collate: 'utf8_unicode_ci',
				timestamps: true
			}
			/*
			dialectOptions: {
				charset: 'utf8',
				collate: 'utf8_unicode_ci',
			}*/
		}, opts.options));
		this.models = {};

		if (this.opts.modelPaths instanceof String) {
			this.opts.modelPaths = [ this.opts.modelPaths ];
		}
	}

	async initialize() {

		debug('Initializing');

		// Scanning paths
		let paths = this.opts.modelPaths[Symbol.iterator]();

		for (let modelPath of paths) {
			await this.importModelPath(modelPath);
		}

		await this.sequelize.sync();

		// Initializing association
		Object.keys(this.models).forEach((modelName) => {
			if ('associate' in this.models[modelName]) {
				this.models[modelName].associate(this.models);
			}
		});

		if (this.opts.autoCreateTable) {

			let tasks = Object.entries(this.models).map(([ modelName, model ]) => {
				debug('Initializing table:', modelName);
				return model.sync();
			});

			await Promise.all(tasks);
		}
	}

	async testConnection() {

		try {
			debug('Testing connection');
			await this.sequelize.authenticate();
		} catch(e) {
			debug(e.message);
			return false;
		}

		return true;
	}

	importModelPath(modelPath) {

		return new Promise((resolve, reject) => {

			debug('Scanning model path:', modelPath);
			fs.readdir(modelPath, (err, files) => {

				if (err) {

					debug('Failed to open the directory:', modelPath);
					debug(err);

					return reject(err);
				}

				let models = files
					.filter((file) => {
						return (file.indexOf('.') !== 0) && (file !== 'index.js') && (path.extname(file) === '.js');
					})
					.reduce((models, file) => {

						let filePath = path.join(modelPath, file);

						debug('Loading model file:', filePath);

						let model = this.sequelize.import(filePath);

						models[model.name] = model;

						return models;
					}, {});

				// Append new models to list
				this.models = Object.assign(this.models, models);

				resolve();
			});
		});
	}

	model(modelName) {
		return this.models[modelName];
	}

	query(...args) {
		return this.sequelize.query.apply(this.sequelize, args);
	}
};
