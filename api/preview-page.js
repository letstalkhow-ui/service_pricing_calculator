const fs = require('fs');
const path = require('path');

module.exports = function handler(req, res) {
  try {
    const filePath = path.join(process.cwd(), 'index.html');
    let html = fs.readFileSync(filePath, 'utf8');
    html = html.replace('</body>', '<script src="/lead-capture.js"></script><script src="/interpretation-card.js"></script><script src="/guided-mode-polish.js"></script><script src="/trial-feedback-section3.js"></script></body>');
    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    res.setHeader('Cache-Control', 'no-store');
    res.status(200).send(html);
  } catch (error) {
    console.error('Preview page error', error);
    res.status(500).send('Preview unavailable.');
  }
};
