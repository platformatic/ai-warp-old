#!/usr/bin/env node
import stackable from '../index'
import { start } from '@platformatic/service'
import { printAndExitLoadConfigError } from '@platformatic/config'

start(stackable, process.argv.splice(2)).catch(printAndExitLoadConfigError)
