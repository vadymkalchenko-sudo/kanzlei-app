const crypto = require('crypto');

const testSchreibzugriff = async (pool) => {
  try {
    console.log('Führe Test-Schreibzugriff aus...');
    const testMandant = {
      id: crypto.randomUUID(),
      anrede: 'Herr',
      name: 'Test Testperson',
      street: 'Testweg 1',
      zipCode: '12345',
      city: 'Teststadt',
      email: 'test@test.de',
      kontakte: JSON.stringify([]),
      historie: JSON.stringify([])
    };

    const columns = Object.keys(testMandant).map(key => `"${key}"`).join(', ');
    const values = Object.values(testMandant);
    const placeholders = values.map((_, i) => `$${i + 1}`).join(', ');

    const query = `INSERT INTO mandanten (${columns}) VALUES (${placeholders}) RETURNING id`;

    // Use the pool directly as it manages clients internally
    const result = await pool.query(query, values);

    if (result.rows && result.rows.length > 0) {
      console.log(`SUCCESS: Test-Mandant erfolgreich mit ID ${result.rows[0].id} in die Datenbank geschrieben.`);
      // Clean up the test entry
      await pool.query('DELETE FROM mandanten WHERE id = $1', [result.rows[0].id]);
      console.log(`INFO: Test-Mandant mit ID ${result.rows[0].id} wurde wieder aus der Datenbank gelöscht.`);
    } else {
      console.error('FEHLER: Der Test-Schreibzugriff hat keine ID zurückgegeben. Das Einfügen ist fehlgeschlagen.', result);
    }
  } catch (error) {
    console.error('FATALER FEHLER beim Test-Schreibzugriff:', error.message);
    console.error('Stack:', error.stack);
    console.error('Fehlercode:', error.code);
    console.error('Detail:', error.detail);
  }
};

module.exports = { testSchreibzugriff };