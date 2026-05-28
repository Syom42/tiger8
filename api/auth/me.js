const { requireSession } = require('../_lib/auth');

module.exports = async function handler(req, res) {
  const session = await requireSession(req, res);
  if (!session) return;
  return res.status(200).json({ email: session.email });
};
