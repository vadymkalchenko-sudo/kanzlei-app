-- Erstellung der Tabelle 'mandanten' mit korrekten Constraints
CREATE TABLE IF NOT EXISTS mandanten (
    id VARCHAR(255) PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    status VARCHAR(50) NOT NULL DEFAULT 'Aktiv',
    stammdaten_pfad TEXT
);

-- Erstellung der Tabelle 'gegner'
CREATE TABLE IF NOT EXISTS gegner (
    id VARCHAR(255) PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    akten_id VARCHAR(255),
    stammdaten_pfad TEXT
);

-- Erstellung der Tabelle 'akten' mit korrekten Constraints
CREATE TABLE IF NOT EXISTS akten (
    id VARCHAR(255) PRIMARY KEY,
    aktenzeichen VARCHAR(255) NOT NULL,
    status VARCHAR(50) NOT NULL DEFAULT 'Offen',
    mandanten_id VARCHAR(255),
    dokumente_pfad TEXT
);

-- Erstellung der Tabelle 'dokumente'
CREATE TABLE IF NOT EXISTS dokumente (
    id VARCHAR(255) PRIMARY KEY,
    akte_id VARCHAR(255),
    dateiname VARCHAR(255) NOT NULL,
    pfad TEXT NOT NULL,
    hochgeladen_am TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Erstellung der Tabelle 'notizen'
CREATE TABLE IF NOT EXISTS notizen (
    id VARCHAR(255) PRIMARY KEY,
    akte_id VARCHAR(255) NOT NULL REFERENCES akten(id) ON DELETE CASCADE,
    titel TEXT,
    inhalt TEXT,
    typ VARCHAR(50),
    betrag_soll NUMERIC(10, 2),
    betrag_haben NUMERIC(10, 2),
    autor VARCHAR(100),
    erledigt BOOLEAN DEFAULT FALSE,
    erstelldatum TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    aktualisierungsdatum TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);