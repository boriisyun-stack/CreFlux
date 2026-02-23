import https from 'https';

function fetchVqd() {
  return new Promise((resolve, reject) => {
    https.get('https://duckduckgo.com/?q=translate', {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)'
      }
    }, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        const match = data.match(/vqd="([^"]+)"/);
        if (match) resolve(match[1]);
        else reject(new Error("No vqd found"));
      });
    }).on('error', reject);
  });
}

async function run() {
  try {
    const vqd = await fetchVqd();
    console.log("Got vqd:", vqd);

    const postData = `vqd=${encodeURIComponent(vqd)}&query=${encodeURIComponent('translate hello to korean')}`;

    const req = https.request({
      hostname: 'duckduckgo.com',
      path: '/translation.js',
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Content-Length': Buffer.byteLength(postData),
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)',
        'Origin': 'https://duckduckgo.com',
        'Referer': 'https://duckduckgo.com/'
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
