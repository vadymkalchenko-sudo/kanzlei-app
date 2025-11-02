# Datenhoheit & Persistenz-Regelwerk (DR-Fähigkeit).md
Hintergrund & Zentrale Anforderung (Mission Critical)

Zentrale Anforderung: Die Anwendung muss das Szenario eines kompletten VSB-Server-Ausfalls (z.B. Stromausfall) und den daraus resultierenden Neubau aller Docker-Container ohne jeglichen Datenverlust überstehen.
Datenhoheit & Persistenz-Regelwerk (DR-Fähigkeit)

Dieses Regelwerk ist ab sofort bindend für alle Code-Änderungen und Infrastruktur-Entscheidungen.

Ziel: Nach einem Neustart der Infrastruktur müssen alle Mandanten-, Gegner- und Dokumentendaten sofort wieder verfügbar und mit der Datenbank synchronisiert sein, ohne manuelle Wiederherstellung oder Daten-Importe. Die Persistenz muss auf Host-Ebene garantiert werden.

1. Das Prinzip der Externen Speicherung (Single Source of Truth)

Regel 1: PostgreSQL ist ein reiner Index-Dienst.
PostgreSQL darf KEINE anwendungsrelevanten Daten (wie Dokumenteninhalte, Adressdetails, IBANs, Notizen) mehr in internen Containern oder JSONB-Feldern speichern.

Die Datenbank speichert ausschließlich IDs, Status, und den relativen Pfad zur physischen Datei auf dem Host-Dateisystem.

Aktion: Alle JSONB-Felder (wie in mandanten, gegner, akten vorhanden) müssen in den folgenden Schritten in einfache TEXT-Felder für die Pfad-Referenz umgewandelt werden.

2. Speicherorte und Ablageformate

Regel 2: Stammdaten-Details (Mandanten/Gegner) – JSON-Dateien

Alle detaillierten Stammdaten (Name, Adresse, IBAN, dynamische Felder) werden als separate JSON-Dateien gespeichert.

Speicherort (Container-Mount): /app/master_data

DB-Referenz: Die PostgreSQL-Tabellen (mandanten, gegner) speichern den relativen Pfad zu dieser JSON-Datei (z.B. mandanten/m12345.json).

Regel 3: Physische Dokumente – Aktenzeichen-Ordnerstruktur

Physische Dokumente (PDFs, Verträge) werden in einer logischen Ordnerstruktur abgelegt.

Speicherort (Container-Mount): /app/documents

Ablagestruktur: /app/documents/<Aktenzeichen>/<Dateiname.ext>

DB-Referenz: Die Dokumententabelle speichert den relativen Pfad (z.B. 1.25.awr/Vertrag_1.pdf).

3. Infrastruktur & Konsistenz

Regel 4: Universelle Zugriffsrechte (chmod 777)

Alle Bind-Mounts auf dem Host-Dateisystem müssen beim Start der jeweiligen Container (postgres, backend) mit dem Befehl chmod -R 777 versehen werden.

Ziel: Dies garantiert, dass der Host-Benutzer (zur manuellen Bereinigung/Backup) und alle KI-Agenten vollen Lese- und Schreibzugriff haben, selbst wenn die Container-UIDs wechseln.

Regel 5: Konsistente Zwei-Phasen-Löschung

Jeder Löschvorgang für Stammdaten oder Dokumente im Backend muss eine atomare Zwei-Phasen-Operation sein:

Die physische Datei (JSON oder Dokument) vom Host-Mount löschen.

Die entsprechende Pfad-Referenz in der PostgreSQL-Datenbank löschen.

Ziel: Verhinderung von "Zombie-Einträgen" (DB-Link existiert, aber physische Datei fehlt).