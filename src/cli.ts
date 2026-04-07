import { Command } from 'commander';
import { addCommand } from './commands/add.js';
import { listCommand } from './commands/list.js';
import { removeCommand } from './commands/remove.js';

const program = new Command();

program
  .name('zivo-skills')
  .description('ZIVO Skills CLI - manage AI agent skills')
  .version('0.1.0');

program
  .command('add [source]')
  .description('Install skills. Source can be: skill name, GitHub URL, or local path. If omitted with --skill, uses default registry.')
  .option('--skill <name>', 'Install specific skill')
  .option('--all', 'Install all skills')
  .option('-y, --yes', 'Skip all prompts')
  .option('-g, --global', 'Install globally')
  .option('--copy', 'Use copy instead of symlink')
  .option('--no-cache', 'Bypass cache')
  .option('--force', 'Force overwrite on conflicts')
  .option('--code <code>', 'Team authentication code')
  .action(addCommand);

program
  .command('list')
  .description('List installed skills')
  .option('-g, --global', 'List globally installed skills')
  .action(listCommand);

program
  .command('remove <name>')
  .description('Remove an installed skill by name')
  .option('-y, --yes', 'Skip confirmation prompt')
  .option('-g, --global', 'Remove from global install')
  .action(removeCommand);

program.parse(process.argv);
