// NEON_AUTH_BASE_URL format: https://api.stack-auth.com/api/v1/projects/{project_id}
// Project ID is embedded in the URL; publishable client key must be added separately.
const baseUrl = process.env.NEON_AUTH_BASE_URL || '';
const stackProjectId = baseUrl.split('/projects/')[1]?.split('/')[0] ?? '';

module.exports = function handler(req, res) {
  res.status(200).json({
    authBaseUrl: baseUrl,
    stackProjectId,
    stackPublishableClientKey: process.env.STACK_PUBLISHABLE_CLIENT_KEY || '',
  });
};
