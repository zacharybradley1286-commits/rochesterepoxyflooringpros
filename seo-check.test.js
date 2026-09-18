const assert = require('node:assert/strict');
const crypto = require('node:crypto');
const fs = require('node:fs');
const path = require('node:path');

const root = __dirname;
const domain = 'https://rochesterepoxyflooringpros.com';
const today = '2026-09-18';

const htmlFiles = fs.readdirSync(root)
  .filter((name) => name.endsWith('.html'))
  .map((name) => name)
  .concat(fs.existsSync(path.join(root, 'blog'))
    ? fs.readdirSync(path.join(root, 'blog')).filter((name) => name.endsWith('.html')).map((name) => `blog/${name}`)
    : []);

function cleanUrl(file) {
  if (file === 'index.html') return `${domain}/`;
  if (file === 'blog/index.html') return `${domain}/blog/`;
  return `${domain}/${file.replace(/\.html$/, '')}`;
}

for (const file of htmlFiles) {
  const html = fs.readFileSync(path.join(root, file), 'utf8');
  const canonical = html.match(/<link rel="canonical" href="([^"]+)"/);
  if (canonical) assert.equal(canonical[1], cleanUrl(file), `${file} canonical must use the final clean URL`);

  const ogUrl = html.match(/<meta property="og:url" content="([^"]+)"/);
  if (ogUrl) assert.equal(ogUrl[1], cleanUrl(file), `${file} og:url must use the final clean URL`);

  assert.doesNotMatch(html, /(?:href=|location\.href\s*=\s*)["'][^"'#?]+\.html(?:[#?][^"']*)?["']/, `${file} must not use redirected .html URLs`);

  assert.doesNotMatch(html, /"@type": "LocalBusiness"|#localbusiness/, `${file} must describe the referral site as an Organization`);
  assert.doesNotMatch(html, /"sameAs": "https:\/\/en\.wikipedia\.org\//, `${file} must not use Wikipedia as business or service entity grounding`);

  const robots = html.match(/<meta name="robots" content="([^"]+)"/);
  const published = html.match(/"datePublished": "(\d{4}-\d{2}-\d{2})"/);
  if (published && published[1] > today) {
    assert.match(robots?.[1] || '', /noindex/, `${file} is future-dated and must stay out of the index`);
  }

  for (const date of html.matchAll(/2026-\d{2}-\d{2}/g)) {
    assert.ok(date[0] <= today, `${file} publicly exposes future date ${date[0]}`);
  }

  if (!/noindex/.test(robots?.[1] || '')) {
    assert.doesNotMatch(html, /href="(?:\.\.\/)?blog\/[^"]+"/, `${file} must not promote unpublished articles`);
  }

  if (file !== '404.html') {
    assert.match(html, /independent marketing and referral service/i, `${file} footer must disclose the referral model`);
  }
}

const sitemap = fs.readFileSync(path.join(root, 'sitemap.xml'), 'utf8');
assert.doesNotMatch(sitemap, /<loc>[^<]*\.html<\/loc>/, 'sitemap must contain final clean URLs');
for (const match of sitemap.matchAll(/<lastmod>(\d{4}-\d{2}-\d{2})<\/lastmod>/g)) {
  assert.ok(match[1] <= today, `sitemap contains future lastmod ${match[1]}`);
}

const index = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
assert.match(index, /marketing and referral service/i, 'homepage must clearly disclose the referral model');
assert.match(index, /#organization/, 'homepage Service schema must reference the Organization entity');
assert.doesNotMatch(index, /our local Rochester crew|our certified technicians/i, 'homepage must not imply an in-house installation crew');

for (const file of htmlFiles.filter((name) => !name.startsWith('blog/'))) {
  const html = fs.readFileSync(path.join(root, file), 'utf8');
  assert.doesNotMatch(html, /\bwe install\b|why choose us|guarantee lifelong adhesion|local dispatch desk/i, `${file} must not make unsupported in-house contractor claims`);
}

for (const file of htmlFiles.filter((name) => name.startsWith('blog/') && name !== 'blog/index.html')) {
  const html = fs.readFileSync(path.join(root, file), 'utf8');
  assert.doesNotMatch(html, /\bwe (?:use|apply|install|customize|utilize|finish|perform|achieve|can)\b|\bour (?:systems|machines|rapid-cure|high-build|professionally)/i, `${file} must not present the referral site as the installer`);
}

const contact = fs.readFileSync(path.join(root, 'contact.html'), 'utf8');
assert.match(contact, /independent marketing and referral service[\s\S]*provider supplies pricing/i, 'contact page must disclose the referral model beside the lead form');

for (const file of ['index.html', 'contact.html', 'grand-mound-epoxy-flooring.html', 'centralia-epoxy-flooring.html', 'chehalis-epoxy-flooring.html', 'tenino-epoxy-flooring.html']) {
  const head = fs.readFileSync(path.join(root, file), 'utf8').split('</head>')[0];
  assert.doesNotMatch(head, /free moisture testing|free epoxy flooring estimate|same-week response|professional garage floor epoxy/i, `${file} metadata must not promise unverified provider offers`);
}

const notFound = fs.readFileSync(path.join(root, '404.html'), 'utf8');
assert.doesNotMatch(notFound, /Olympia|Tumwater|Lacey/, '404 page must use the Rochester service area');

const careers = fs.readFileSync(path.join(root, 'careers.html'), 'utf8');
assert.match(careers, /<meta name="robots" content="noindex,follow">/, 'contractor recruiting page should not compete in search');

const digest = (file) => crypto.createHash('sha256').update(fs.readFileSync(path.join(root, file))).digest('hex');
assert.equal(digest('assets/images/hero.jpg'), digest('assets/images/img-2.jpg'), 'hero must use the relevant floor-preparation image');
assert.doesNotMatch(index, /commercial concourse/i, 'hero alt text must describe the floor-preparation image');

console.log(`SEO checks passed for ${htmlFiles.length} HTML files`);
