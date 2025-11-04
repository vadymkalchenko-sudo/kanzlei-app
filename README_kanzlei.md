# Kanzlei-App

## WICHTIGER HINWEIS ZUR BERECHTIGUNG

**Achtung:** Bevor Sie die Docker-Container zum ersten Mal starten, müssen die Berechtigungen für das Host-Verzeichnis korrekt gesetzt werden.

Führen Sie als Benutzer `vadim` den folgenden Befehl aus, um sicherzustellen, dass die Container die notwendigen Schreib- und Leserechte auf die gemounteten Volumes haben:

```bash
chown -R vadim:vadim /home/vadim/entwiklung/Devlopment/Test_DB_2
```

Dieser Schritt ist entscheidend, um Datenverlust und Startfehler der Datenbank zu vermeiden.

## Benutzerverwaltung und Berechtigungen

Die Anwendung unterstützt ein umfassendes Berechtigungssystem mit folgenden Funktionen:

### Rollen
- **admin**: Vollzugriff auf alle Funktionen und Daten
- **power_user**: Erweiterte Zugriffsrechte, z.B. CRUD für Akten, Mandanten, Gegner
- **user**: Standard-Zugriffsrechte, z.B. Lesen von Akten, Erstellen von Notizen, Hochladen und Lesen von Dokumenten
- **extern**: Eingeschränkter Zugriff, z.B. nur eigene Akten einsehen

### Berechtigungen
Die Berechtigungen sind in folgende Kategorien unterteilt:
- **Benutzerverwaltung**: users:manage (Benutzer erstellen, bearbeiten, löschen)
- **Rollenverwaltung**: roles:manage (Rollen und Berechtigungen verwalten)
- **Mandanten**: mandanten:read, mandanten:create, mandanten:update, mandanten:delete
- **Akten**: akten:read, akten:create, akten:update, akten:delete
- **Gegner**: gegner:read, gegner:create, gegner:update, gegner:delete
- **Dokumente**: documents:upload, documents:read, documents:delete
- **Notizen**: notes:create, notes:update, notes:delete

### Berechtigungen pro Rolle

#### admin
- Vollzugriff auf alle Funktionen und Daten

#### power_user
- Alle Berechtigungen von user plus:
  - Mandanten: create, update, delete
  - Akten: create, update, delete
  - Gegner: create, update, delete

#### user
- **Lesen und Schreiben von Akten**: akten:read, akten:create, akten:update
- **Lesen und Schreiben von Mandanten**: mandanten:read, mandanten:create, mandanten:update
- **Lesen und Schreiben von Gegner**: gegner:read, gegner:create, gegner:update
- **Dokumente hochladen und lesen**: documents:upload, documents:read
- **Keine Löschrechte** auf Akten, Mandanten, Gegner oder Dokumente

#### extern
- Eingeschränkter Zugriff, z.B. nur eigene Akten einsehen

### Zugriff auf Benutzerverwaltung
Die Benutzerverwaltung ist über das Admin-Panel verfügbar:
1. Melden Sie sich mit einem Benutzer mit Administratorrechten an (admin oder power_user)
2. Klicken Sie im Header auf das Einstellungssymbol (Zahnrad)
3. Wählen Sie "Admin Panel" aus dem Dropdown-Menü
4. Im Admin-Panel müssen Sie sich mit einem zweiten Passwort authentifizieren:
   - **Admin-Passwort**: adminpass
5. Im Admin-Panel können Sie Benutzer verwalten, neue Benutzer anlegen, Bearbeiten und Löschen durchführen

### Standardbenutzer
Beim ersten Start wird automatisch ein Admin-Benutzer mit folgenden Credentials angelegt:
- **Benutzername**: admin
- **Passwort**: admin (wird in der docker-compose.yml konfiguriert)

### Anmeldung
Um sich anzumelden, verwenden Sie folgende Anmeldedaten:
- **Benutzername**: admin
- **Passwort**: admin

Diese Standardanmeldedaten können Sie nach der ersten Anmeldung in der Benutzerverwaltung ändern.

### Admin-Panel Zugriff
Das Admin-Panel verwendet ein separates Passwort für die Authentifizierung:
- **Admin-Passwort**: adminpass

### Bekannte Probleme und Lösungen
Wenn die Funktionen "Neuen Benutzer anlegen", "Passwort zurücksetzen" oder "Löschen" nicht funktionieren:

1. Stellen Sie sicher, dass Sie sich mit einem Benutzer mit Administratorrechten (admin oder power_user) angemeldet haben
2. Überprüfen Sie, ob die CORS-Einstellungen korrekt sind (dies ist ein bekanntes Problem bei Docker-Umgebungen)
3. Prüfen Sie die Browser-Konsole auf Fehlermeldungen
4. Stellen Sie sicher, dass die Backend-Anwendung vollständig gestartet ist

Die API-Endpunkte für die Benutzerverwaltung sind:
- GET /api/users - Abrufen aller Benutzer
- POST /api/users - Erstellen eines neuen Benutzers
- PUT /api/users/:id - Aktualisieren eines Benutzers
- DELETE /api/users/:id - Löschen eines Benutzers

### Fehlerbehebung
Wenn Sie Probleme mit der Benutzerverwaltung haben:
1. Öffnen Sie die Browser-Konsole (F12)
2. Prüfen Sie, ob Fehlermeldungen auftreten
3. Versuchen Sie, die API-Endpunkte direkt mit curl zu testen:
   ```bash
   curl -X GET http://localhost:3001/api/users -H "Authorization: Bearer YOUR_TOKEN_HERE"
   ```
4. Überprüfen Sie, ob die Benutzerberechtigungen korrekt sind