const axios = require('axios');
const configManager = require('../utils/config');

class ApiService {
    constructor() {
        this.client = axios.create();
    }

    async init() {
        const config = configManager.getConfig();
        if (config) {
            if (config.apiUrl) {
                this.client.defaults.baseURL = config.apiUrl;
            }
            if (config.token) {
                this.client.defaults.headers.common['Authorization'] = `Bearer ${config.token}`;
            }
        }
    }

    async createProject(name, description) {
        return this.client.post('/projects', { name, description });
    }

    async getLatestCommit(projectName, branch = 'main') {
        return this.client.get(`/projects/${projectName}/commits/latest`, { params: { branch } });
    }

    async pushCommit(projectName, payload) {
        return this.client.post(`/projects/${projectName}/commits`, payload);
    }

    async getLog(projectName) {
        return this.client.get(`/projects/${projectName}/log`);
    }

    async getCommit(projectName, commitId) {
        return this.client.get(`/projects/${projectName}/commits/${commitId}`);
    }
}

module.exports = new ApiService();
