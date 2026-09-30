import { createHash, randomUUID } from 'node:crypto';
import { lstat, mkdir, readFile, realpath, rename, writeFile, readdir, rm } from 'node:fs/promises';
import path from 'node:path';

export class VError extends Error {
  constructor(public code: string, message: string, public exitCode = 2, public details?: unknown) { super(message); }
}
export const digest = (data: string | Uint8Array): string => createHash('sha256').update(data).digest('hex');
export const fileDigest = async (file: string): Promise<string> => digest(await readFile(file));
export const slash = (p: string): string => p.replaceAll('\\', '/');
export async function exists(file: string): Promise<boolean> {
  try { await lstat(file); return true; } catch (error) { if ((error as NodeJS.ErrnoException).code === 'ENOENT') return false; throw error; }
}
export async function safePath(root: string, relative: string, requireExisting = true): Promise<string> {
  if (!relative || path.isAbsolute(relative) || /^[a-z]:/i.test(relative) || relative.split(/[\\/]/).some(p => !p || p === '.' || p === '..' || p.includes(':'))) {
    throw new VError('UNSAFE_PATH', `Unsafe relative path: ${relative}`);
  }
  const base = await realpath(root);
  let cursor = base;
  for (const part of relative.split(/[\\/]/)) {
    cursor = path.join(cursor, part);
    try {
      const stat = await lstat(cursor);
      if (stat.isSymbolicLink()) throw new VError('UNSAFE_PATH', `Symbolic links/reparse links are unsupported: ${relative}`);
      const actual = await realpath(cursor);
      const rel = path.relative(base, actual);
      if (rel.startsWith('..') || path.isAbsolute(rel)) throw new VError('UNSAFE_PATH', `Path escapes project: ${relative}`);
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === 'ENOENT' && !requireExisting) continue;
      throw error;
    }
  }
  return cursor;
}
export async function atomicJson(file: string, data: unknown): Promise<void> {
  await mkdir(path.dirname(file), { recursive: true });
  const temporary = `${file}.${randomUUID()}.tmp`;
  try {
    await writeFile(temporary, `${JSON.stringify(data, null, 2)}\n`, { flag: 'wx' });
    await rename(temporary, file);
  } finally { await rm(temporary, { force: true }); }
}
export async function readJson(file: string): Promise<unknown> { return JSON.parse(await readFile(file, 'utf8')); }
export async function writeSealed(file: string, data: unknown): Promise<void> {
  await atomicJson(file, data);
  await writeFile(`${file}.sha256`, `${await fileDigest(file)}\n`, { flag: 'wx' });
}
export async function readSealed<T>(file: string): Promise<T> {
  const bytes = await readFile(file);
  const expected = (await readFile(`${file}.sha256`, 'utf8')).trim();
  if (digest(bytes) !== expected) throw new VError('INTEGRITY_MISMATCH', `Changed record: ${path.basename(file)}`, 3);
  return JSON.parse(bytes.toString('utf8')) as T;
}
export async function walk(root: string, relative: string): Promise<string[]> {
  const target = await safePath(root, relative);
  const stat = await lstat(target);
  if (stat.isFile()) return [slash(relative)];
  if (!stat.isDirectory()) throw new VError('UNSUPPORTED_FILE', `Not a regular file or directory: ${relative}`);
  const files: string[] = [];
  for (const name of (await readdir(target)).sort()) files.push(...await walk(root, `${slash(relative)}/${name}`));
  return files;
}
export function requireUnique(values: string[], label: string): void {
  if (new Set(values).size !== values.length) throw new VError('DUPLICATE_ID', `Duplicate ${label}`);
}
