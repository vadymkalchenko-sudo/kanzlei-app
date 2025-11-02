const fetch = require('node-fetch');

const API_BASE_URL = 'http://backend:3001/api';

async function runTest() {
    console.log('Starte API-Test...');
    let token = null;

    try {
        // 0. Einloggen
        console.log('\n--- Logge ein ---');
        const loginResponse = await fetch(`${API_BASE_URL}/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username: 'admin', password: 'admin' })
        });
        if (!loginResponse.ok) {
            throw new Error('Login fehlgeschlagen');
        }
        const { token: authToken } = await loginResponse.json();
        token = authToken;
        console.log('Login erfolgreich, Token erhalten.');

        const authHeader = { 'Authorization': `Bearer ${token}` };

        // 1. Mandant erstellen
        console.log('\n--- Erstelle Mandant ---');
        const mandantData = {
            vorname: 'Max',
            nachname: 'Mustermann',
            strasse: 'Musterstraße 1',
            plz: '12345',
            stadt: 'Musterstadt'
        };
        const createMandantResponse = await fetch(`${API_BASE_URL}/mandanten`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', ...authHeader },
            body: JSON.stringify(mandantData)
        });

        if (!createMandantResponse.ok) {
            const error = await createMandantResponse.json();
            throw new Error(`Fehler beim Erstellen des Mandanten: ${error.message}`);
        }
        const createdMandant = await createMandantResponse.json();
        console.log('Mandant erfolgreich erstellt:', createdMandant);

        // 2. Akte erstellen
        console.log('\n--- Erstelle Akte ---');
        const akteData = {
            aktenzeichen: `AZ-${Date.now()}`,
            mandanten_id: createdMandant.id
        };
        const createAkteResponse = await fetch(`${API_BASE_URL}/records`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', ...authHeader },
            body: JSON.stringify(akteData)
        });
        if (!createAkteResponse.ok) {
            const error = await createAkteResponse.json();
            throw new Error(`Fehler beim Erstellen der Akte: ${error.message}`);
        }
        const createdAkte = await createAkteResponse.json();
        console.log('Akte erfolgreich erstellt:', createdAkte);


        // 3. Drittbeteiligten erstellen
        console.log('\n--- Erstelle Drittbeteiligten ---');
        const dritteData = {
            name: 'Versicherung AG',
            vorname: 'Kontakt',
            nachname: 'Person'
        };
        const createDritteResponse = await fetch(`${API_BASE_URL}/dritte-beteiligte`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', ...authHeader },
            body: JSON.stringify(dritteData)
        });
        if (!createDritteResponse.ok) {
            const error = await createDritteResponse.json();
            throw new Error(`Fehler beim Erstellen des Drittbeteiligten: ${error.message}`);
        }
        const createdDritte = await createDritteResponse.json();
        console.log('Drittbeteiligter erfolgreich erstellt:', createdDritte);


        // 4. Daten abrufen und verifizieren
        console.log('\n--- Verifiziere Daten ---');
        const getMandantenResponse = await fetch(`${API_BASE_URL}/mandanten`, { headers: authHeader });
        const mandanten = await getMandantenResponse.json();
        console.log(`Abgerufene Mandanten (${mandanten.length}):`, mandanten.find(m => m.id === createdMandant.id));

        const getAktenResponse = await fetch(`${API_BASE_URL}/records`, { headers: authHeader });
        const akten = await getAktenResponse.json();
        console.log(`Abgerufene Akten (${akten.length}):`, akten.find(a => a.id === createdAkte.id));

        const getDritteResponse = await fetch(`${API_BASE_URL}/dritte-beteiligte`, { headers: authHeader });
        const dritte = await getDritteResponse.json();
        console.log(`Abgerufene Drittbeteiligte (${dritte.length}):`, dritte.find(d => d.id === createdDritte.id));


        console.log('\nAPI-Test erfolgreich abgeschlossen!');

    } catch (error) {
        console.error('\nAPI-Test fehlgeschlagen:', error.message);
    }
}

runTest();