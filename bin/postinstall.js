#!/usr/bin/env node
// Post-install hint — prints a short message, never fails
const b = "\x1b[1m", r = "\x1b[0m", d = "\x1b[2m", m = "\x1b[35m", c = "\x1b[36m";
console.log(`
  ${b}${m}@axiestudio/tool${r} installed ${d}(zero dependencies)${r}

  ${b}Get started:${r}
    ${c}npx axie-tool${r}          Interactive setup wizard
    ${c}npx axie-tool --help${r}   Show all commands

  ${b}Or import directly:${r}
    ${d}import { invoke } from '@axiestudio/tool/context7';${r}
    ${d}import { invoke } from '@axiestudio/tool/npm';${r}
    ${d}import { invoke } from '@axiestudio/tool/github';${r}
`);
