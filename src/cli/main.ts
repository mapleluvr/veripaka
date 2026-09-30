#!/usr/bin/env node
import { parseArgs } from 'node:util';
import { realpath } from 'node:fs/promises';
import { z } from 'zod';
import { init, newRecipe, recipes, find } from '../catalog/index.js';
import { apply } from '../planning/index.js';
import { cancel, run } from '../execution/index.js';
import { collect, finalize, verdictExitCode } from '../evidence/index.js';
import { safePath, VError } from '../files.js';

async function main(): Promise<void> {
  let command = 'unknown';
  try {
    const { values, positionals } = parseArgs({ allowPositionals: true, options: {
      project: { type: 'string' }, input: { type: 'string' }, json: { type: 'boolean' },
      help: { type: 'boolean', short: 'h' }, 'capture-only': { type: 'boolean' },
    } });
    const root = await realpath(values.project ?? process.cwd());
    const [verb, sub, id] = positionals;
    command = verb ?? 'help';
    let data: unknown;
    let code = 0;
    const requireValue = (value: string | undefined, label: string): string => {
      if (!value) throw new VError('MISSING_ARGUMENT', label);
      return value;
    };
    if (values['capture-only'] && (verb !== 'run' || sub === 'finalize' || sub === 'collect' || sub === 'cancel')) throw new VError('INVALID_OPTION', '--capture-only applies only to run <id>');
    if (values.help || !verb || verb === 'help') {
      data = { commands: ['init', 'recipe new <id>', 'recipe list', 'recipe show <id>', 'recipe lint [id]', 'find <query>', 'apply <recipe-or-profile> --input <file>', 'run <run-id>', 'run <run-id> --capture-only', 'run cancel <run-id>', 'run collect <run-id> --input <file>', 'run finalize <run-id>'], supported: 'Node 24; local checkout; command; verification; executable node:test top-level checks', nextAction: 'Read the project verification README before selecting methods.' };
    } else if (verb === 'init' && positionals.length === 1) data = await init(root);
    else if (verb === 'find') data = await find(root, positionals.slice(1).join(' '));
    else if (verb === 'recipe') {
      if (sub === 'new' && positionals.length === 3) data = await newRecipe(root, requireValue(id, 'recipe id'));
      else if (sub === 'list' && positionals.length === 2) data = (await recipes(root)).map(e => ({ id: e.recipe.id, title: e.recipe.title, status: e.recipe.status }));
      else if (sub === 'show' && positionals.length === 3) {
        const entry = (await recipes(root)).find(e => e.recipe.id === id);
        if (!entry) throw new VError('NOT_FOUND', `No recipe ${id}`);
        data = entry;
      } else if (sub === 'lint' && positionals.length <= 3) {
        const all = await recipes(root);
        const selected = id ? all.filter(e => e.recipe.id === id) : all;
        if (id && selected.length === 0) throw new VError('NOT_FOUND', `No recipe ${id}`);
        for (const entry of selected) for (const claim of entry.recipe.claims) {
          await safePath(root, claim.source); await safePath(root, claim.check.file);
        }
        data = { recipes: selected.map(e => ({ id: e.recipe.id, shapeValid: true, qualificationVerified: false, requiredClaims: e.recipe.claims.filter(c => c.required).length })), meaning: 'Static structure and references only; not product verification.' };
      } else throw new VError('INVALID_COMMAND', 'Use recipe new/list/show/lint');
    } else if (verb === 'apply' && positionals.length === 2) data = await apply(root, requireValue(sub, 'selector'), requireValue(values.input, '--input'));
    else if (verb === 'run') {
      if (sub === 'cancel' && positionals.length === 3) { data = await cancel(root, requireValue(id, 'run id')); code = 3; }
      else if (sub === 'collect' && positionals.length === 3) data = await collect(root, requireValue(id, 'run id'), requireValue(values.input, '--input'));
      else if (sub === 'finalize' && positionals.length === 3) { const result = await finalize(root, requireValue(id, 'run id')); data = result; code = verdictExitCode(result); }
      else if (positionals.length === 2) {
        const result = await run(root, requireValue(sub, 'run id'), values['capture-only']);
        data = result; code = 'verdict' in result ? verdictExitCode(result) : 3;
      } else throw new VError('INVALID_COMMAND', 'Use run <id>, run cancel <id>, run collect <id>, or run finalize <id>');
    } else throw new VError('UNSUPPORTED_COMMAND', `${positionals.join(' ')} is not supported in S1`);
    process.stdout.write(`${JSON.stringify({ schema: 'veripaka.cli/v0', ok: code === 0, command, data })}\n`);
    process.exitCode = code;
  } catch (error) {
    const code = error instanceof VError ? error.code : error instanceof z.ZodError ? 'INVALID_SCHEMA' : (error as NodeJS.ErrnoException).code ?? 'INTERNAL_ERROR';
    const exitCode = error instanceof VError ? error.exitCode : error instanceof z.ZodError ? 2 : 3;
    process.stdout.write(`${JSON.stringify({ schema: 'veripaka.cli/v0', ok: false, command, error: { code, message: error instanceof Error ? error.message : String(error), nextAction: 'Resolve the reported prerequisite; do not invent a successful result.' } })}\n`);
    process.exitCode = exitCode;
  }
}
await main();
