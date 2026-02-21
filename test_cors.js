const http = require('http');
http.get('http://localhost:8080/test_cors.html', (res) => {
  let data = '';
  res.on('data', chunk => data += chunk);
  res.on('end', () => console.log("HTML:", data));
});
