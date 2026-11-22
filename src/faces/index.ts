import { agent } from './agent';
import { ci } from './ci';
import type { Face } from './common';
import { vscode } from './vscode';

export type FaceId = 'terminal' | 'vscode' | 'ci' | 'agent';

export const FACES: Record<Exclude<FaceId, 'terminal'>, Face> = { vscode, ci, agent };
