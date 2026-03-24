/**
 * Column-major order must match HEALTH_CHECK_URLS in .env (comma/newline list).
 * Single source of truth for grouping — GET /endpointHealth returns `groups` built from this + parsed URLs.
 */
const GROUPS = [
  { title: 'Astera Cloud', count: 4 },
  { title: 'QA', count: 4 },
  { title: 'Docspire', count: 4 },
  { title: 'Docspire-Test', count: 4 },
  { title: 'Dataprep QA', count: 4 },
  { title: 'Dataprep Production', count: 4 },
  { title: 'SupportAgentPortal Production', count: 5 },
  { title: 'SupportAgentPortal QA', count: 5 }
];

function expectedUrlCount() {
  return GROUPS.reduce(function(s, g) {
    return s + g.count;
  }, 0);
}

module.exports = {
  GROUPS,
  expectedUrlCount
};
