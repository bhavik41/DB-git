const inquirer = require('inquirer').default;
const chalk = require('chalk');
const configManager = require('../utils/config');
const apiService = require('../services/api');
const { getSchemaSnapshot } = require('../core/introspection');
const { diffSchemas } = require('../core/diff');

module.exports = async function commit(options) {
    configManager.ensureExists();
    const config = configManager.getConfig();
    await apiService.init();

    try {
        console.log(chalk.blue('🔍 Introspecting target database...'));
        const currentSnapshot = await getSchemaSnapshot(config.targetDbUrl);

        console.log(chalk.blue('📡 Fetching remote head...'));
        const latestRes = await apiService.getLatestCommit(config.projectName);
        const prevSnapshot = latestRes.data.commit ? latestRes.data.commit.snapshot : { tables: {} };
        const prevCommitId = latestRes.data.commit ? latestRes.data.commit.id : null;

        console.log(chalk.blue('⚖️  Calculating differences...'));
        const changes = diffSchemas(prevSnapshot, currentSnapshot);

        if (changes.length === 0) {
            console.log(chalk.yellow('Everything up-to-date. No changes detected.'));
            return;
        }

        console.log(chalk.yellow('\nSummarizing changes:'));
        changes.forEach(c => {
            const type = c.type.replace('_', ' ');
            console.log(`  ${chalk.green('+')} ${type}: ${chalk.bold(c.tableName)} ${c.columnName || ''}`);
        });

        let message = options.message;
        if (!message) {
            const answers = await inquirer.prompt([{
                type: 'input',
                name: 'message',
                message: '\nCommit message:',
                validate: (v) => v.length > 0
            }]);
            message = answers.message;
        }

        console.log(chalk.blue('\n🚀 Pushing commit to remote...'));
        const commitRes = await apiService.pushCommit(config.projectName, {
            message,
            snapshot: currentSnapshot,
            diff: changes,
            prevCommitId,
            branchName: 'main'
        });

        if (commitRes.data.success) {
            console.log(chalk.green(`\n✓ Commit [${commitRes.data.commitId.substring(0, 8)}] created successfully!`));
        }

    } catch (error) {
        console.error(chalk.red('\n✖ Commit failed.'));
        console.error(chalk.red(error.response?.data?.error || error.message));
    }
};
