import { mkdir, readFile, readdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { parse, stringify } from 'yaml';
import { z } from 'zod';
import { idSchema, projectSchema, recipeSchema, profileSchema, type Recipe } from '../contracts.js';
import { exists, safePath, VError, requireUnique } from '../files.js';

export async function corpus(root: string): Promise<string> {
  const config = await safePath(root, '.veripaka/config.json', false);
  if (!await exists(config)) return 'docs/verification';
  return z.strictObject({ corpusRoot: z.string().min(1) }).parse(JSON.parse(await readFile(config, 'utf8'))).corpusRoot;
}
export async function project(root: string) {
  const relative = `${await corpus(root)}/project.yaml`;
  return { config: projectSchema.parse(parse(await readFile(await safePath(root, relative), 'utf8'))), relative };
}
export interface RecipeEntry { recipe: Recipe; body: string; relative: string }
export async function recipes(root: string): Promise<RecipeEntry[]> {
  const base = `${await corpus(root)}/recipes`;
  const directory = await safePath(root, base, false);
  if (!await exists(directory)) return [];
  const entries: RecipeEntry[] = [];
  for (const item of (await readdir(directory, { withFileTypes: true })).sort((a, b) => a.name.localeCompare(b.name))) {
    if (item.isSymbolicLink()) throw new VError('UNSAFE_PATH', `Recipe link unsupported: ${item.name}`);
    if (!item.isDirectory()) continue;
    const relative = `${base}/${item.name}/RECIPE.md`;
    const text = await readFile(await safePath(root, relative), 'utf8');
    const match = /^---\r?\n([\s\S]*?)\r?\n---\r?\n([\s\S]*)$/.exec(text);
    if (!match) throw new VError('INVALID_RECIPE', `Missing frontmatter: ${relative}`);
    const recipe = recipeSchema.parse(parse(match[1]!));
    requireUnique(recipe.claims.map(c => c.id), `claims in ${recipe.id}`);
    entries.push({ recipe, body: match[2]!, relative });
  }
  requireUnique(entries.map(e => e.recipe.id), 'recipe IDs');
  return entries;
}
export async function select(root: string, selector: string) {
  idSchema.parse(selector);
  const all = await recipes(root);
  const recipe = all.find(e => e.recipe.id === selector);
  const profilePath = `${await corpus(root)}/profiles/${selector}.yaml`;
  const absolute = await safePath(root, profilePath, false);
  const hasProfile = await exists(absolute);
  if (recipe && hasProfile) throw new VError('AMBIGUOUS_SELECTOR', `Both recipe and profile named ${selector}`);
  if (recipe) return { entries: [recipe], profilePath: undefined };
  if (!hasProfile) throw new VError('NOT_FOUND', `No recipe or profile: ${selector}`);
  const profile = profileSchema.parse(parse(await readFile(absolute, 'utf8')));
  requireUnique(profile.recipes, 'profile recipe references');
  return {
    profilePath,
    entries: profile.recipes.map(id => {
      const found = all.find(e => e.recipe.id === id);
      if (!found) throw new VError('UNRESOLVED_RECIPE', `Missing recipe ${id}`);
      return found;
    }),
  };
}
async function createOnce(root: string, relative: string, text: string): Promise<boolean> {
  const file = await safePath(root, relative, false);
  await mkdir(path.dirname(file), { recursive: true });
  try { await writeFile(file, text, { flag: 'wx' }); return true; }
  catch (error) { if ((error as NodeJS.ErrnoException).code === 'EEXIST') return false; throw error; }
}
export async function init(root: string) {
  const base = await corpus(root);
  const created: string[] = [];
  const contents: Record<string, string> = {
    [`${base}/README.md`]: '# Project verification\n\nFind methods with `veripaka find <query> --json`. Read a recipe before applying it. Bind the subject and explicit question-to-claim mapping, then apply and run. Missing evidence is not a pass.\n\nRecipes are authoritative; this README is not a generated index.\n',
    [`${base}/project.yaml`]: stringify({ schema: 'veripaka.project/v0', subjects: {}, commands: {} }),
    '.veripaka/.gitignore': '*\n!config.json\n!.gitignore\n',
  };
  for (const [relative, content] of Object.entries(contents)) if (await createOnce(root, relative, content)) created.push(relative);
  return { created, corpusRoot: base, nextAction: 'Create a recipe, then explicitly configure a supported subject and command binding.' };
}
export async function newRecipe(root: string, id: string) {
  idSchema.parse(id);
  if ((await recipes(root)).some(e => e.recipe.id === id)) throw new VError('ALREADY_EXISTS', `Recipe ${id} exists`);
  const relative = `${await corpus(root)}/recipes/${id}/RECIPE.md`;
  const metadata: Recipe = {
    schema: 'veripaka.recipe/v0', id, title: id, summary: 'Describe the risk this method addresses.',
    kind: 'verification', status: 'draft', tags: [], applies: 'Specify when this method applies.', excludes: [],
    execution: { mode: 'command' }, claims: [],
  };
  if (!await createOnce(root, relative, `---\n${stringify(metadata)}---\n\n## Procedure\nDescribe actions, observations, cleanup and false-pass traps.\n\n## Qualification\nNo qualification evidence yet.\n`)) throw new VError('ALREADY_EXISTS', relative);
  return { path: relative, status: 'draft', nextAction: 'Complete claims, evidence and binding before applying.' };
}
export async function find(root: string, query: string) {
  const words = query.toLocaleLowerCase().split(/\s+/).filter(Boolean);
  const { config } = await project(root);
  return (await recipes(root)).map(({ recipe, body }) => {
    const text = [recipe.id, recipe.title, recipe.summary, recipe.applies, ...recipe.tags, body].join(' ').toLocaleLowerCase();
    const matches = words.filter(word => text.includes(word));
    const binding = recipe.execution.commandRef ? config.commands[recipe.execution.commandRef] : undefined;
    return { id: recipe.id, title: recipe.title, summary: recipe.summary, status: recipe.status, mode: recipe.execution.mode, matches, unavailable: !binding?.enabled ? 'command-not-enabled' : null };
  }).filter(item => words.length === 0 || item.matches.length > 0).sort((a, b) => b.matches.length - a.matches.length || a.id.localeCompare(b.id));
}
