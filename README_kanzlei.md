# Kanzlei-App

## WICHTIGER HINWEIS ZUR BERECHTIGUNG

**Achtung:** Bevor Sie die Docker-Container zum ersten Mal starten, müssen die Berechtigungen für das Host-Verzeichnis korrekt gesetzt werden.

Führen Sie als Benutzer `vadim` den folgenden Befehl aus, um sicherzustellen, dass die Container die notwendigen Schreib- und Leserechte auf die gemounteten Volumes haben:

```bash
chown -R vadim:vadim /home/vadim/entwiklung/Devlopment/Test_DB_2
```

Dieser Schritt ist entscheidend, um Datenverlust und Startfehler der Datenbank zu vermeiden.