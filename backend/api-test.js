const { exec } = require('child_process');

const jsonData = JSON.stringify({
  name: "John Doe",
  status: "aktiv",
  email: "john.doe@example.com",
  strasse: "Musterweg 1",
  stadt: "Musterstadt"
});

// Verwende explizit IPv4 und den korrekten Port
const command = `curl -X POST -H "Content-Type: application/json" -d '${jsonData}' http://127.0.0.1:3001/api/mandanten`;

exec(command, (error, stdout, stderr) => {
  if (error) {
    console.error(`exec error: ${error}`);
    return;
  }
  if (stderr) {
    console.error(`stderr: ${stderr}`);
  }
  console.log(`stdout: ${stdout}`);
});