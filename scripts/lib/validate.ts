import { SummitDataSchema, type SummitData } from '../../shared/schema';

export interface GateOptions {
  failUnder?: number;
  maxParseErrorRatio?: number;
}

/**
 * Sanity gates run before any write. These are both the correctness check and the
 * structure-drift canary: a failure throws (caller exits non-zero without writing), so a
 * broken scrape can never overwrite the last good data file.
 */
export function validateData(
  data: SummitData,
  totalNodes: number,
  failedNodes: number,
  opts: GateOptions = {},
): void {
  const failUnder = opts.failUnder ?? 250;
  const maxRatio = opts.maxParseErrorRatio ?? 0.05;

  const parsed = SummitDataSchema.safeParse(data);
  if (!parsed.success) {
    const issues = parsed.error.issues
      .slice(0, 6)
      .map((i) => `${i.path.join('.') || '(root)'}: ${i.message}`)
      .join('; ');
    throw new Error(`Schema validation failed: ${issues}`);
  }

  const n = data.events.length;
  if (n === 0) {
    throw new Error('Sanity gate: 0 events parsed — the source structure likely changed.');
  }
  if (n < failUnder) {
    throw new Error(`Sanity gate: only ${n} events parsed (< floor ${failUnder}).`);
  }
  if (totalNodes > 0) {
    const ratio = failedNodes / totalNodes;
    if (ratio >= maxRatio) {
      throw new Error(
        `Sanity gate: ${failedNodes}/${totalNodes} nodes failed (${(ratio * 100).toFixed(1)}% ≥ ${(
          maxRatio * 100
        ).toFixed(0)}%).`,
      );
    }
  }
}
