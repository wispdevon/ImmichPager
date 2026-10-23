import { execFileSync } from 'node:child_process';
// Read-only report: compare like-for-like successful required jobs, including setup.
const pipelines = process.argv.slice(2);
if (!pipelines.length || pipelines.some((id) => !/^\d+$/.test(id))) {
  throw Error('Usage: node scripts/ci/report.mjs PIPELINE_ID [PIPELINE_ID...]');
}
for (const id of pipelines) {
  const jobs = JSON.parse(
    execFileSync(
      'glab',
      ['api', `projects/87842908/pipelines/${id}/jobs?per_page=100`],
      { encoding: 'utf8' },
    ),
  ).filter(
    (job) =>
      ['verify', 'quality', 'build', 'docker_smoke'].includes(job.name) ||
      /^browser[ :]/.test(job.name),
  );
  if (!jobs.length || jobs.some((job) => job.status !== 'success'))
    throw Error(`Pipeline ${id}: required jobs have not all passed`);
  const elapsed =
    (Math.max(...jobs.map((job) => Date.parse(job.finished_at))) -
      Math.min(...jobs.map((job) => Date.parse(job.started_at)))) /
    1000;
  const runner = jobs.reduce((total, job) => total + job.duration, 0);
  console.log(
    JSON.stringify({
      pipeline: id,
      elapsedSeconds: Math.round(elapsed),
      runnerSeconds: Math.round(runner),
      jobs: jobs.map(({ name, duration }) => ({
        name,
        seconds: Math.round(duration),
      })),
    }),
  );
}
