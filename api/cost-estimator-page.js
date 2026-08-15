const fs = require('fs');
const path = require('path');

module.exports = function handler(req, res) {
  try {
    const filePath = path.join(process.cwd(), 'tools', 'cost-estimator.html');
    let html = fs.readFileSync(filePath, 'utf8');
    html = html.replace('</body>', '<script src="/cost-estimator-polish.js"></script></body>');
    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    res.setHeader('Cache-Control', 'no-store');
    res.status(200).send(html);
  } catch (error) {
    console.error('Cost estimator page error', error);
    res.status(500).send('Cost estimator unavailable.');
  }
};
