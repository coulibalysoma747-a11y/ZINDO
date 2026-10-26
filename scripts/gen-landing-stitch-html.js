const fs = require('fs');
const path = require('path');
const desktop = fs.readFileSync(path.join(__dirname, '..', 'public', 'landing-stitch.html'), 'utf8');
const mobile = fs.readFileSync(path.join(__dirname, '..', 'public', 'landing-stitch-mobile.html'), 'utf8');
const out = `// Auto-generated from public/landing-stitch*.html — do not edit by hand.
export const LANDING_STITCH_DESKTOP_HTML = ${JSON.stringify(desktop)};
export const LANDING_STITCH_MOBILE_HTML = ${JSON.stringify(mobile)};
`;
fs.writeFileSync(path.join(__dirname, '..', 'lib', 'landing-stitch-html.ts'), out, 'utf8');
console.log('written', out.length);