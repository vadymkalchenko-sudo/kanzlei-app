const http = require('http');

const performRequest = (options, postData = null) => {
  return new Promise((resolve, reject) => {
    const req = http.request(options, (res) => {
      let body = '';
      res.setEncoding('utf8');
      res.on('data', (chunk) => {
        body += chunk;
      });
      res.on('end', () => {
        resolve({ statusCode: res.statusCode, body: JSON.parse(body) });
      });
    });

    req.on('error', (e) => {
      reject(e);
    });

    if (postData) {
      req.write(postData);
    }
    req.end();
  });
};

const login = async () => {
  const postData = JSON.stringify({ username: 'admin', password: 'admin' });
  const options = {
    hostname: 'localhost',
    port: 3001,
    path: '/api/login',
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Content-Length': Buffer.byteLength(postData),
    },
  };
  console.log('1. Führe Login aus...');
  const { statusCode, body } = await performRequest(options, postData);
  if (statusCode !== 200) {
    throw new Error(`Login fehlgeschlagen mit Status ${statusCode}`);
  }
  console.log('   -> Login erfolgreich. Token erhalten.');
  return body.token;
};

const createMandant = async (token) => {
  const postData = JSON.stringify({
    name: "Max Mustermann",
    status: "aktiv",
    email: "max.mustermann@example.com",
    strasse: "Musterstraße 1",
    stadt: "Musterstadt"
  });
  const options = {
    hostname: 'localhost',
    port: 3001,
    path: '/api/mandanten',
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
      'Content-Length': Buffer.byteLength(postData),
    },
  };
  console.log('2. Erstelle neuen Mandanten...');
  const { statusCode, body } = await performRequest(options, postData);
    if (statusCode !== 201) {
    throw new Error(`Mandantenerstellung fehlgeschlagen mit Status ${statusCode}`);
  }
  console.log(`   -> Mandant erfolgreich erstellt mit ID: ${body.id}`);
  return body.id;
};

const createAkte = async (token, mandantId) => {
    const postData = JSON.stringify({
    aktenzeichen: `AZ-${Date.now()}`,
    status: 'offen',
    mandanten_id: mandantId,
    beschreibung: 'Testakte für den Funktionstest'
  });
    const options = {
    hostname: 'localhost',
    port: 3001,
    path: '/api/records',
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
      'Content-Length': Buffer.byteLength(postData),
    },
  };
  console.log('3. Erstelle neue Akte...');
  const { statusCode, body } = await performRequest(options, postData);
    if (statusCode !== 201) {
    throw new Error(`Aktenerstellung fehlgeschlagen mit Status ${statusCode}`);
  }
  console.log(`   -> Akte erfolgreich erstellt mit ID: ${body.id}`);
  return body.id;
};

const createNotiz = async (token, akteId) => {
    const postData = JSON.stringify({
    titel: 'Wichtige Notiz',
    inhalt: 'Dies ist eine Testnotiz, die während des Funktionstests erstellt wurde.'
  });
    const options = {
    hostname: 'localhost',
    port: 3001,
    path: `/api/records/${akteId}/notes`,
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
      'Content-Length': Buffer.byteLength(postData),
    },
  };
  console.log('4. Füge Notiz zur Akte hinzu...');
  const { statusCode, body } = await performRequest(options, postData);
    if (statusCode !== 201) {
    throw new Error(`Notizerstellung fehlgeschlagen mit Status ${statusCode}`);
  }
  console.log(`   -> Notiz erfolgreich erstellt.`);
};


const runTests = async () => {
  try {
    const token = await login();
    const mandantId = await createMandant(token);
    const akteId = await createAkte(token, mandantId);
    await createNotiz(token, akteId);
    console.log('\nAlle Funktionstests erfolgreich abgeschlossen!');
  } catch (error) {
    console.error('\nFehler während der Funktionstests:', error.message);
  }
};

runTests();