import { mkdir, readFile, rm } from 'node:fs/promises';
import path from 'node:path';
import { randomUUID } from 'node:crypto';
import { safePath, atomicJson, VError } from '../files.js';

export async function acquire(root: string): Promise<() => Promise<void>> {
  const directory = await safePath(root, '.veripaka/locks/execution', false);
  await mkdir(path.dirname(directory), { recursive: true });
  try { await mkdir(directory); }
  catch (error) {
    if ((error as NodeJS.ErrnoException).code !== 'EEXIST') throw error;
    throw new VError('PROJECT_BUSY', 'Project execution is locked. Do not steal a lock by age; inspect the owner and its process tree before manual recovery.', 3);
  }
  const token = randomUUID();
  try { await atomicJson(path.join(directory, 'owner.json'), { pid: process.pid, token, createdAt: new Date().toISOString() }); }
  catch (error) { await rm(directory, { recursive: true, force: true }); throw error; }
  return async () => {
    const owner = JSON.parse(await readFile(path.join(directory, 'owner.json'), 'utf8')) as { token?: string };
    if (owner.token !== token) throw new VError('LOCK_OWNER_CHANGED', 'Refusing to release another process lock', 3);
    await rm(directory, { recursive: true });
  };
}
