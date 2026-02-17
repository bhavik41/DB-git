const axios = require('axios');
const pkg = require('../package.json');
const chalk = require('chalk');

async function checkUpdate() {
    try {
        // Fetch latest version from NPM registry
        const { data } = await axios.get(`https://registry.npmjs.org/${pkg.name}/latest`, { timeout: 2000 });
        const latestVersion = data.version;

        if (latestVersion !== pkg.version) {
            console.log('\n' + chalk.yellow('╔' + '═'.repeat(50) + '╗'));
            console.log(chalk.yellow('║') + ' '.repeat(50) + chalk.yellow('║'));
            console.log(chalk.yellow('║') + chalk.bold('  Update available! ') + chalk.dim(pkg.version) + ' → ' + chalk.green(latestVersion).padEnd(25) + chalk.yellow('║'));
            console.log(chalk.yellow('║') + chalk.dim(`  Run: npm install -g ${pkg.name}`) + ' '.repeat(50 - `  Run: npm install -g ${pkg.name}`.length - 1) + chalk.yellow('║'));
            console.log(chalk.yellow('║') + ' '.repeat(50) + chalk.yellow('║'));
            console.log(chalk.yellow('╚' + '═'.repeat(50) + '╝') + '\n');
        }
    } catch (error) {
        // Silently fail if network is down or package not published yet
    }
}

module.exports = checkUpdate;
