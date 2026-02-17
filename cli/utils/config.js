const fs = require('fs');
const path = require('path');
const chalk = require('chalk');

const CONFIG_DIR = path.join(process.cwd(), '.dbv');
const CONFIG_FILE = path.join(CONFIG_DIR, 'config.json');

class ConfigManager {
    getConfig() {
        if (!fs.existsSync(CONFIG_FILE)) {
            return null;
        }
        try {
            return JSON.parse(fs.readFileSync(CONFIG_FILE, 'utf8'));
        } catch (e) {
            return null;
        }
    }

    saveConfig(config) {
        if (!fs.existsSync(CONFIG_DIR)) {
            fs.mkdirSync(CONFIG_DIR, { recursive: true });
        }
        fs.writeFileSync(CONFIG_FILE, JSON.stringify(config, null, 2));
    }

    exists() {
        return fs.existsSync(CONFIG_FILE);
    }

    ensureExists() {
        if (!this.exists()) {
            console.error(chalk.red('Error: Not a DB-Git repository. Run "dbv init" first.'));
            process.exit(1);
        }
    }
}

module.exports = new ConfigManager();
