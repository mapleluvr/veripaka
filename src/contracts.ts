import { z } from 'zod';

export const idSchema = z.string().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/);
const relativePath = z.string().min(1).refine(p => !/^(?:[a-z]:|[\\/])/i.test(p) && !p.split(/[\\/]/).some(s => s === '..' || s === '.' || s === ''), 'Use a relative path without dot segments');
const claimSchema = z.strictObject({
  id: idSchema,
  required: z.boolean().default(true),
  expected: z.string().min(1),
  source: relativePath,
  judge: z.enum(['executable', 'agent', 'human']),
  check: z.strictObject({ file: relativePath, name: z.string().min(1) }),
  evidence: z.array(z.literal('node-test-result')).min(1),
});
export const recipeSchema = z.strictObject({
  schema: z.literal('veripaka.recipe/v0'),
  id: idSchema,
  title: z.string().min(1),
  summary: z.string().min(1),
  kind: z.enum(['verification', 'investigation']),
  status: z.enum(['draft', 'trial', 'reusable', 'deprecated']),
  tags: z.array(z.string()).default([]),
  applies: z.string().min(1),
  excludes: z.array(z.string()).default([]),
  execution: z.strictObject({ mode: z.enum(['command', 'agent-guided']), commandRef: idSchema.optional() }),
  claims: z.array(claimSchema),
});
export type Recipe = z.infer<typeof recipeSchema>;
export const projectSchema = z.strictObject({
  schema: z.literal('veripaka.project/v0'),
  subjects: z.record(idSchema, z.strictObject({
    kind: z.enum(['checkout', 'build', 'deployment', 'endpoint-observation']),
    description: z.string().min(1),
    entrypoint: relativePath,
    sourceRoots: z.array(relativePath).min(1),
  })),
  commands: z.record(idSchema, z.strictObject({
    runner: z.literal('node-test'),
    enabled: z.boolean().default(false),
    subject: idSchema,
    testFiles: z.array(relativePath).min(1),
    timeoutMs: z.number().int().min(100).max(300_000).default(30_000),
    maxOutputBytes: z.number().int().min(1024).max(16_777_216).default(2_097_152),
  })),
});
export type Project = z.infer<typeof projectSchema>;
export type Binding = Project['commands'][string];
export const profileSchema = z.strictObject({
  schema: z.literal('veripaka.profile/v0'), id: idSchema, title: z.string().min(1), recipes: z.array(idSchema).min(1),
});
export const inputSchema = z.strictObject({
  subject: idSchema,
  goals: z.array(z.strictObject({
    id: idSchema,
    question: z.string().min(1),
    claims: z.array(z.string().regex(/^[a-z0-9-]+\/[a-z0-9-]+$/)),
    uncovered: z.string().min(1).optional(),
  }).refine(g => g.claims.length > 0 || !!g.uncovered, 'Unmapped goals require an uncovered reason')).min(1),
});
export type Input = z.infer<typeof inputSchema>;
export interface SnapshotFile { path: string; digest: string; size: number }
export interface FrozenCheck {
  key: string;
  recipeId: string;
  id: string;
  required: boolean;
  expected: string;
  source: string;
  file: string;
  name: string;
}
export interface Plan {
  schema: 'veripaka.plan/v0';
  runId: string;
  createdAt: string;
  projectRoot: string;
  corpusRoot: string;
  kind: 'verification';
  input: Input;
  subject: Project['subjects'][string];
  binding: Binding;
  commandRef: string;
  checks: FrozenCheck[];
  recipes: Recipe[];
  snapshot: SnapshotFile[];
  snapshotRoots: string[];
  runtime: { executable: string; nodeVersion: string; reporterPath: string; reporterDigest: string };
}
export interface Execution {
  schema: 'veripaka.execution/v0';
  runId: string;
  attemptId: string;
  invocationId: string;
  planDigest: string;
  startedAt: string;
  endedAt?: string;
  executable: string;
  argv: string[];
  cwd: string;
  pid?: number;
  exitCode: number | null;
  signal: string | null;
  status: 'running' | 'completed' | 'blocked' | 'interrupted' | 'indeterminate';
  reason?: string;
  cleanup: 'not-needed' | 'terminated' | 'unknown';
  artifacts?: { events: string; stdout: string; stderr: string };
  digests?: { events: string; stdout: string; stderr: string };
}
export interface CheckResult {
  key: string;
  required: boolean;
  expected: string;
  observed: string;
  status: 'pass' | 'fail' | 'inconclusive';
  evidence: string[];
}
export interface Result {
  schema: 'veripaka.result/v0';
  runId: string;
  kind: 'verification';
  verdict: 'scoped-pass' | 'fail' | 'blocked' | 'inconclusive';
  verdictBasis: 'executable';
  execution: Execution['status'] | 'not-started';
  reason?: string;
  subject: Plan['subject'];
  checks: CheckResult[];
  goals: Input['goals'];
  limits: string[];
  provenance: {
    producer: 'node:test' | 'none'; ingestion: 'managed-command' | 'none';
    verification: 'verified' | 'unknown' | 'mismatch'; judge: 'executable';
    invocationId?: string;
  };
  finalizedAt: string;
}
