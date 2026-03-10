import http from 'http';

const data = JSON.stringify({
  favorite: 1,
  wants: 1,
  personal_rating: 8
});

console.log('Sending data:', data);

const options = {
  hostname: 'localhost',
  port: 7401,
  path: '/api/books/108',
  method: 'PUT',
  headers: {
    'Content-Type': 'application/json',
    'Content-Length': data.length
  }
};

const req = http.request(options, (res) => {
  let body = '';
  res.on('data', (chunk) => body += chunk);
  res.on('end', () => {
    console.log('Status:', res.statusCode);
    const result = JSON.parse(body);
    console.log('Response favorite:', result.favorite);
    console.log('Response wants:', result.wants);
    console.log('Response personal_rating:', result.personal_rating);
  });
});

req.on('error', (e) => console.error('Error:', e));
req.write(data);
req.end();
