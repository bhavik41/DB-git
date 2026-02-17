#!/usr/bin/env node

const { Command } = require('commander');
const chalk = require('chalk');
const figlet = require('figlet');

const initCommand = require('../commands/init');
const commitCommand = require('../commands/commit');
const logCommand = require('../commands/log');
const diffCommand = require('../commands/diff');
const loginCommand = require('../commands/login');
const checkUpdate = require('../utils/updater');

const program = new Command();

console.log(
    chalk.cyan(
        figlet.textSync('DB-Git', { horizontalLayout: 'full' })
    )
);

program
    .version('1.0.0')
    .description('Database Version Control System (CLI)');

program
    .command('init')
    .description('Initialize a new DB-Git repository')
    .argument('[name]', 'Project name')
    .option('-d, --database <url>', 'Target Database connection string')
    .option('-r, --remote <url>', 'DB-Git Remote Server URL')
    .action(initCommand);

program
    .command('commit')
    .description('Record changes to the repository')
    .option('-m, --message <msg>', 'Commit message')
    .action(commitCommand);

program
    .command('log')
    .description('Show commit logs')
    .action(logCommand);

program
    .command('remote')
    .description('Manage remote server connections')
    .option('--get-url', 'Show current remote URL')
    .option('--set-url <url>', 'Change remote URL')
    .action(require('../commands/remote'));

program
    .command('diff')
    .description('Show changes between commits or current state')
    .argument('[commit1]', 'Base commit')
    .argument('[commit2]', 'Target commit')
    .action(diffCommand);

program
    .command('login')
    .description('Login with GitHub')
    .action(loginCommand);

async function main() {
    await program.parseAsync(process.argv);

    if (!process.argv.slice(2).length) {
        program.outputHelp();
    }

    // Check for updates at the end
    await checkUpdate();
}

main();
