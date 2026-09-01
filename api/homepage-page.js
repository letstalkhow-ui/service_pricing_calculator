const fs = require('fs');
const path = require('path');

module.exports = function handler(req, res) {
  try {
    const filePath = path.join(process.cwd(), 'homepage.html');
    let html = fs.readFileSync(filePath, 'utf8');
    html = html.replace(
      /(<a class="brand" href="\/">\s*<img )src="[^"]+"/,
      '$1src="/assets/businessboosts-logo-transparent.png?v=1"'
    );

    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    res.setHeader('Cache-Control', 'no-store');
    res.status(200).send(html);
  } catch (error) {
    console.error('Homepage error', error);
    res.status(500).send('Homepage unavailable.');
  }
};
