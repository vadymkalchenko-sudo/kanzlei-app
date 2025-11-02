const http = require('http');

const postData = JSON.stringify({
  "name": "John Doe",
  "status": "aktiv",
  "email": "john.doe@example.com",
  "strasse": "Musterweg 1",
  "stadt": "Musterstadt"
});

const options = {
  hostname: 'localhost',
  port: 3001,
  path: '/api/mandanten',
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Content-Length': Buffer.byteLength(postData)
  }
};

const req = http.request(options, (res) => {
  console.log(`STATUS: ${res.statusCode}`);
  res.setEncoding('utf8');
  res.on('data', (chunk) => {
    console.log(`BODY: ${chunk}`);
  });
  res.on('end', () => {
    console.log('No more data in response.');
  });
});

req.on('error', (e) => {
  console.error(`problem with request: ${e.message}`);
});

// write data to request body
req.write(postData);
req.end();