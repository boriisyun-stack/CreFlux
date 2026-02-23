import https from 'https';

function fetchVqdAndCookie() {
  return new Promise((resolve, reject) => {
    https.get('https://duckduckgo.com/?q=translate+hello+to+korean', {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7 AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.5',
      }
    }, (res) => {
      let data = '';
      const cookies = res.headers['set-cookie'] || [];
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        const match = data.match(/vqd="([^"]+)"/);
        if (match) resolve({ vqd: match[1], cookies: cookies.map(c => c.split(';')[0]).join('; ') });
        else reject(new Error("No vqd found"));
      });
    }).on('error', reject);
  });
}

async function run() {
  try {
    const {vqd, cookies} = await fetchVqdAndCookie();
    console.log("Got vqd:", vqd, "Cookies:", cookies);
    
    const postData = `vqd=${encodeURIComponent(vqd)}&query=${encodeURIComponent('translate hello to korean')}`;
    
    const req = https.request({
      hostname: 'duckduckgo.com',
      path: '/translation.js',
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Content-Length': Buffer.byteLength(postData),
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7 AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'application/json, text/javascript, */*; q=0.01',
        'Origin': 'https://duckduckgo.com',
        'Referer': 'https://duckduckgo.com/?q=translate+hello+to+korean',
        'Cookie': cookies
      }
    }, res => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => console.log("Response:", data));
    });
    req.write(postData);
    req.end();
  } catch (e) {
    console.error(e);
  }
}
run();
