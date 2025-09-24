const fs = require('fs');
const path = require('path');

const basePath = process.env.STORAGE_PATH || path.join(__dirname, 'kanzlei-data');

const loadData = () => {
  const initialDataPath = path.join(__dirname, 'initial-data');
  
  const directories = ['records', 'mandanten', 'dritte-beteiligte'];
  directories.forEach(dir => {
    const fullPath = path.join(basePath, dir);
    if (!fs.existsSync(fullPath)) {
      fs.mkdirSync(fullPath, { recursive: true });
    }
  });
  
  fs.copyFileSync(path.join(initialDataPath, 'mandant1.json'), path.join(basePath, 'mandanten', 'mandant-1.json'));
  fs.copyFileSync(path.join(initialDataPath, 'gegner1.json'), path.join(basePath, 'dritte-beteiligte', 'gegner-1.json'));

  fs.copyFileSync(path.join(initialDataPath, 'akte1.json'), path.join(basePath, 'records', 'akte-1.json'));
  fs.copyFileSync(path.join(initialDataPath, 'akte2.json'), path.join(basePath, 'records', 'akte-2.json'));
  fs.copyFileSync(path.join(initialDataPath, 'akte3.json'), path.join(basePath, 'records', 'akte-3.json'));
  
  console.log('Musterdaten erfolgreich in das Dateisystem geladen.');
};

loadData();