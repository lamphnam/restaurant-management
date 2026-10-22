export function requireWriteApproval(script, environment = process.env) {
  if (environment.PHASE1_QA_ALLOW_WRITES !== 'main') {
    throw new Error(`${script} writes QA data to Neon main. Set PHASE1_QA_ALLOW_WRITES=main explicitly for this run. Session checks occupy tables until a reset; no cleanup/reset runs automatically.`)
  }
}
