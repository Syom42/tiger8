const { getSessionFromReq } = require('../_lib/auth');

module.exports = async function handler(req, res) {
  const session = await getSessionFromReq(req);
  if (!session) return res.status(401).json({ error: 'unauthorized' });
  return res.status(200).json({ email: session.email });
};
