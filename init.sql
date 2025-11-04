-- Erstellung der Tabelle 'mandanten' mit Pfad-Referenz anstelle von JSONB-Feldern
CREATE TABLE IF NOT EXISTS mandanten (
    id VARCHAR(255) PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    status VARCHAR(50) NOT NULL,
    stammdaten_pfad TEXT
);

-- Erstellung der Tabelle 'gegner' mit Pfad-Referenz anstelle von JSONB-Feldern
CREATE TABLE IF NOT EXISTS gegner (
    id VARCHAR(255) PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    akten_id VARCHAR(255),
    stammdaten_pfad TEXT
);

-- Erstellung der Tabelle 'akten' mit Pfad-Referenz anstelle von JSONB-Feldern
CREATE TABLE IF NOT EXISTS akten (
    id VARCHAR(255) PRIMARY KEY,
    aktenzeichen VARCHAR(255) NOT NULL,
    status VARCHAR(50) NOT NULL,
    mandanten_id VARCHAR(255),
    dokumente_pfad TEXT
);

-- Erstellung der Tabelle 'dokumente' für die Speicherung von Dokumentinformationen
CREATE TABLE IF NOT EXISTS dokumente (
    id VARCHAR(255) PRIMARY KEY,
    akte_id VARCHAR(255),
    dateiname VARCHAR(255) NOT NULL,
    pfad TEXT NOT NULL,
    hochgeladen_am TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
-- Erstellung der Tabelle 'notizen'
CREATE TABLE IF NOT EXISTS notizen (
    id UUID PRIMARY KEY,
    akte_id VARCHAR(255),
    titel VARCHAR(255),
    inhalt TEXT,
    typ VARCHAR(50),
    betrag_soll NUMERIC,
    betrag_haben NUMERIC,
    autor VARCHAR(255),
    erstellungsdatum TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    aktualisierungsdatum TIMESTAMP,
    erledigt BOOLEAN DEFAULT FALSE
);