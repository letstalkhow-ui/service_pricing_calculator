const fs = require('fs');
const path = require('path');

module.exports = function handler(req, res) {
  try {
    const filePath = path.join(process.cwd(), 'index.html');
    let html = fs.readFileSync(filePath, 'utf8');

    // Render the updated first-time-user welcome state before the browser paints.
    // This prevents the previous welcome copy from flashing briefly before JS enhancement runs.
    html = html
      .replace('GUIDED CALCULATION', 'RECOMMENDED FOR FIRST-TIME USERS')
      .replace('<h2>New to service pricing?</h2>', '<h2>Not sure what to enter? <span class="keep-together">Start here.</span></h2>')
      .replace('We can guide you through the calculator step by step and explain what to enter in simple English. You do not need accounting knowledge.', 'Use the guided calculation and we will take you through each section step by step, in simple English. You can still change any number as you go.')
      .replace('Start guided calculation', 'Guide me step by step')
      .replace('See an example', 'Show me an example first')
      .replace('I’ll calculate on my own', 'I know my numbers, calculate on my own');

    html = html.replace('</head>', `<style>
      .welcome-card{position:relative;overflow:hidden;border:2px solid #111}
      .welcome-card:before{content:'';position:absolute;left:0;right:0;top:0;height:8px;background:var(--yellow)}
      .welcome-mark{background:#111!important;color:var(--yellow)!important;letter-spacing:.8px}
      .welcome-card h2{max-width:560px}
      .welcome-card h2 .keep-together{white-space:nowrap}
      .welcome-card p{max-width:610px}
      .welcome-actions{align-items:stretch;display:grid!important;grid-template-columns:1.15fr 1fr 1.35fr}
      .welcome-actions button{width:100%;min-width:0;white-space:normal!important;line-height:1.25;text-align:center}
      .welcome-actions .guide-primary{background:var(--yellow)!important;color:#111!important;border:2px solid #111!important;box-shadow:0 5px 0 #111;font-size:14px}
      .welcome-actions .guide-example{background:#fff!important;border:1px solid #cfc9bc!important}
      .welcome-actions .guide-secondary{background:#fff!important;color:#333!important;border:1px solid #e3ded4!important;font-size:14px}
      @media(max-width:760px){.welcome-actions{grid-template-columns:1fr}}
      @media(max-width:560px){
        .guide-welcome{padding:14px;align-items:center}
        .welcome-card{padding:28px 22px 22px;border-radius:18px}
        .welcome-mark{font-size:10px;line-height:1.25;text-align:center}
        .welcome-card h2{font-size:27px;line-height:1.08;margin:16px 0 10px}
        .welcome-card p{font-size:15px;line-height:1.55}
        .welcome-actions{gap:10px;margin-top:20px}
        .welcome-actions button{min-height:50px}
        .welcome-actions .guide-primary{font-size:16px;min-height:56px}
        .welcome-actions .guide-secondary{font-size:14px;color:#333;background:transparent!important;border-style:dashed!important}
      }
    </style></head>`);

    html = html.replace('</body>', '<script src="/lead-capture.js"></script><script src="/interpretation-card.js"></script><script src="/guided-mode-polish.js"></script><script src="/trial-feedback-section3.js"></script><script src="/trial-feedback-guide-entry.js"></script><script src="/trial-feedback-cost-helper.js"></script><script src="/cost-estimator-transfer.js"></script></body>');
    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    res.setHeader('Cache-Control', 'no-store');
    res.status(200).send(html);
  } catch (error) {
    console.error('Preview page error', error);
    res.status(500).send('Preview unavailable.');
  }
};
