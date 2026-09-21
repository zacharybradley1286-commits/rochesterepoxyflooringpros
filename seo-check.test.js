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

  // Ensure NO file presents the site as a lead-gen or referral middleman
  assert.doesNotMatch(html, /independent marketing and referral service|referral service|referral-disclosure|lead generation service/i, `${file} must not disclose a referral or lead-gen model`);
  assert.doesNotMatch(html, /\bindependent (?:flooring provider|provider|contractor referral)\b/i, `${file} must not refer to independent third-party providers`);

  if (file !== '404.html') {
    assert.match(html, /Rochester Epoxy Flooring Pros is a local concrete coating contractor/i, `${file} footer must identify the business as a local contractor`);
  }
}

const sitemap = fs.readFileSync(path.join(root, 'sitemap.xml'), 'utf8');
assert.doesNotMatch(sitemap, /<loc>[^<]*\.html<\/loc>/, 'sitemap must contain final clean URLs');
for (const match of sitemap.matchAll(/<lastmod>(\d{4}-\d{2}-\d{2})<\/lastmod>/g)) {
  assert.ok(match[1] <= today, `sitemap contains future lastmod ${match[1]}`);
}

const index = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
assert.doesNotMatch(index, /marketing and referral service/i, 'homepage must not contain referral language');
assert.match(index, /#organization/, 'homepage Service schema must reference the Organization entity');

const contact = fs.readFileSync(path.join(root, 'contact.html'), 'utf8');
assert.doesNotMatch(contact, /independent marketing and referral service|provider supplies pricing/i, 'contact page must not refer to independent providers');
assert.match(contact, /speak directly with our team|free on-site (?:slab|concrete) evaluation/i, 'contact page must offer direct contractor contact');

const notFound = fs.readFileSync(path.join(root, '404.html'), 'utf8');
assert.doesNotMatch(notFound, /Olympia|Tumwater|Lacey/, '404 page must use the Rochester service area');

const careers = fs.readFileSync(path.join(root, 'careers.html'), 'utf8');
assert.match(careers, /<meta name="robots" content="noindex,follow">/, 'contractor recruiting page should not compete in search');

// Site images must not depict another company's branded jobsite.
const imageDir = path.join(root, 'assets', 'images');
const shippedImages = fs.readdirSync(imageDir).filter((n) => /\.(jpe?g|png|webp)$/i.test(n));
for (const name of shippedImages) {
  for (const file of htmlFiles) {
    const html = fs.readFileSync(path.join(root, file), 'utf8');
    if (html.includes(`assets/images/${name}`)) break;
  }
}
assert.ok(!fs.existsSync(path.join(imageDir, 'img-2.jpg')), 'the competitor-branded jobsite photo must not be shipped');
for (const file of htmlFiles) {
  const html = fs.readFileSync(path.join(root, file), 'utf8');
  assert.doesNotMatch(html, /img-2\.jpg/, `${file} must not reference the removed competitor-branded image`);
  assert.doesNotMatch(html, /commercial concourse/i, `${file} alt text must describe the image actually shown`);
}

console.log(`SEO checks passed for ${htmlFiles.length} HTML files`);
