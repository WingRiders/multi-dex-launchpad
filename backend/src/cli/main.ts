import {Command} from 'commander'
import {buildAddNodeCommand} from './add-node'
import {buildInitLaunchCommand} from './init-launch'

const program = new Command()

program
  .name('launchpad-cli')
  .description('Multi-DEX Launchpad admin CLI')
  .version('0.1.0')

program.addCommand(buildInitLaunchCommand())
program.addCommand(buildAddNodeCommand())

program.parse(process.argv)
