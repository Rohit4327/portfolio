// Chromium here would route loopback through the egress proxy, so pages load from a
// local server with no browser proxy, and external requests (CDN scripts, Google
// Fonts) are fetched with curl, which trusts the proxy CA, then cached on disk.
const path = require('path'), fs = require('fs'), os = require('os');
const { execFileSync } = require('child_process');
const cacheDir = path.join(os.tmpdir(), 'film-cdn-cache');
fs.mkdirSync(cacheDir, { recursive: true });
async function routeExternal(page) {
  await page.route(/^https:\/\//, async (route) => {
    const url = route.request().url();
    const key = path.join(cacheDir, Buffer.from(url).toString('base64url').slice(0, 200));
    try {
      if (!fs.existsSync(key)) {
        const out = execFileSync('curl', ['-sS', '-L', '-D', key + '.h', '-A', 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0 Safari/537.36', url], { maxBuffer: 64 << 20 });
        fs.writeFileSync(key, out);
      }
      const hdr = fs.readFileSync(key + '.h', 'utf8');
      const ct = (hdr.match(/content-type:\s*([^\r\n]+)/gi) || []).pop();
      await route.fulfill({ status: 200, body: fs.readFileSync(key), headers: { 'content-type': ct ? ct.split(/:\s*/)[1] : 'application/octet-stream', 'access-control-allow-origin': '*' } });
    } catch (e) { await route.abort(); }
  });
}
module.exports = { routeExternal };
