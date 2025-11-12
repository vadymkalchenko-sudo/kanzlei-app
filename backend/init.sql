-- Erstellt die notwendige Erweiterung für UUIDs
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. MANDANTEN-Tabelle (Hybrid: JSONB und NOT NULL)
CREATE TABLE IF NOT EXISTS mandanten (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    status VARCHAR(50) NOT NULL DEFAULT 'Aktiv',
    master_data JSONB NOT NULL DEFAULT '{}'
);

-- 2. AKTEN-Tabelle (Hybrid: JSONB und NOT NULL)
CREATE TABLE IF NOT EXISTS akten (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    mandanten_id UUID NOT NULL REFERENCES mandanten(id) ON DELETE CASCADE,
    file_number VARCHAR(50) UNIQUE NOT NULL,
    status VARCHAR(50) NOT NULL DEFAULT 'Offen',
    metadata JSONB NOT NULL DEFAULT '{"gesamt_forderung_soll": 0, "gesamt_zahlung_haben": 0, "hat_zahlungseingang": false}'
);

-- 3. GEGNER-Tabelle (Hybrid: JSONB und NOT NULL)
CREATE TABLE IF NOT EXISTS gegner (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    akten_id UUID NOT NULL REFERENCES akten(id) ON DELETE CASCADE,
    master_data JSONB NOT NULL DEFAULT '{}'
);
