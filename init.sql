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
    aktenzeichen VARCHAR(255) UNIQUE NOT NULL,
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
    erledigt BOOLEAN DEFAULT FALSE,
    faelligkeitsdatum DATE
);

-- Erstellung der Tabelle 'roles'
CREATE TABLE IF NOT EXISTS roles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(50) UNIQUE NOT NULL,
    description TEXT
);

-- Erstellung der Tabelle 'permissions'
CREATE TABLE IF NOT EXISTS permissions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(100) UNIQUE NOT NULL,
    description TEXT
);

-- Erstellung der Tabelle 'role_permissions' (Verknüpfungstabelle)
CREATE TABLE IF NOT EXISTS role_permissions (
    role_id UUID REFERENCES roles(id) ON DELETE CASCADE,
    permission_id UUID REFERENCES permissions(id) ON DELETE CASCADE,
    PRIMARY KEY (role_id, permission_id)
);

-- Initialrollen einfügen
INSERT INTO roles (id, name, description) VALUES
    ('a0000000-0000-0000-0000-000000000001', 'admin', 'Voller Zugriff auf alle Funktionen und Daten'),
    ('a0000000-0000-0000-0000-000000000002', 'power_user', 'Erweiterte Zugriffsrechte, z.B. CRUD für Akten, Mandanten, Gegner'),
    ('a0000000-0000-0000-0000-000000000003', 'user', 'Standard-Zugriffsrechte, z.B. Lesen von Akten, Erstellen von Notizen'),
    ('a0000000-0000-0000-0000-000000000004', 'extern', 'Eingeschränkter Zugriff, z.B. nur eigene Akten einsehen')
ON CONFLICT (name) DO NOTHING;

-- Initialberechtigungen einfügen
INSERT INTO permissions (id, name, description) VALUES
    ('b0000000-0000-0000-0000-000000000001', 'users:manage', 'Benutzer erstellen, bearbeiten, löschen'),
    ('b0000000-0000-0000-0000-000000000002', 'roles:manage', 'Rollen und Berechtigungen verwalten'),
    ('b0000000-0000-0000-0000-000000000003', 'mandanten:read', 'Mandanten lesen'),
    ('b0000000-0000-0000-0000-000000000004', 'mandanten:create', 'Mandanten erstellen'),
    ('b0000000-0000-0000-0000-000000000005', 'mandanten:update', 'Mandanten aktualisieren'),
    ('b0000000-0000-0000-0000-000000000006', 'mandanten:delete', 'Mandanten löschen'),
    ('b0000000-0000-0000-0000-000000000007', 'akten:read', 'Akten lesen'),
    ('b0000000-0000-0000-0000-000000000008', 'akten:create', 'Akten erstellen'),
    ('b0000000-0000-0000-0000-000000000009', 'akten:update', 'Akten aktualisieren'),
    ('b0000000-0000-0000-0000-000000000010', 'akten:delete', 'Akten löschen'),
    ('b0000000-0000-0000-0000-000000000011', 'gegner:read', 'Gegner lesen'),
    ('b0000000-0000-0000-0000-000000000012', 'gegner:create', 'Gegner erstellen'),
    ('b0000000-0000-0000-0000-000000000013', 'gegner:update', 'Gegner aktualisieren'),
    ('b0000000-0000-0000-0000-000000000014', 'gegner:delete', 'Gegner löschen'),
    ('b0000000-0000-0000-0000-000000000015', 'documents:upload', 'Dokumente hochladen'),
    ('b0000000-0000-0000-0000-000000000016', 'documents:read', 'Dokumente lesen'),
    ('b0000000-0000-0000-0000-000000000017', 'documents:delete', 'Dokumente löschen'),
    ('b0000000-0000-0000-0000-000000000018', 'notes:create', 'Notizen erstellen'),
    ('b0000000-0000-0000-0000-000000000019', 'notes:update', 'Notizen aktualisieren'),
    ('b0000000-0000-0000-0000-000000000020', 'notes:delete', 'Notizen löschen')
ON CONFLICT (name) DO NOTHING;

-- Rollen-Berechtigungen zuweisen
-- Admin-Rolle: Alle Berechtigungen
INSERT INTO role_permissions (role_id, permission_id)
SELECT
    (SELECT id FROM roles WHERE name = 'admin'),
    id
FROM permissions
ON CONFLICT DO NOTHING;

-- Power_User-Rolle: Vollzugriff auf alle Module
INSERT INTO role_permissions (role_id, permission_id)
SELECT
    (SELECT id FROM roles WHERE name = 'power_user'),
    id
FROM permissions
ON CONFLICT DO NOTHING;

-- User-Rolle: Zugriff auf Akten, Mandanten, Gegner mit Einschränkungen
INSERT INTO role_permissions (role_id, permission_id)
SELECT
    (SELECT id FROM roles WHERE name = 'user'),
    id
FROM permissions
WHERE name IN (
    'mandanten:read', 'mandanten:create', 'mandanten:update',
    'akten:read', 'akten:create', 'akten:update',
    'gegner:read', 'gegner:create', 'gegner:update'
)
ON CONFLICT DO NOTHING;

-- Extern-Rolle: Nur lesender Zugriff
INSERT INTO role_permissions (role_id, permission_id)
SELECT
    (SELECT id FROM roles WHERE name = 'extern'),
    id
FROM permissions
WHERE name IN (
    'mandanten:read', 'akten:read', 'gegner:read', 'documents:read'
)
ON CONFLICT DO NOTHING;
-- Tabelle für allgemeine Einstellungen
CREATE TABLE IF NOT EXISTS einstellungen (
    key VARCHAR(255) PRIMARY KEY,
    value TEXT
);

-- Standard-Startwert für Aktennummern, falls nicht vorhanden
INSERT INTO einstellungen (key, value) VALUES ('aktennummer_start', '1') ON CONFLICT (key) DO NOTHING;