# Anleitung zum Zurücksetzen der Datenbank

Führen Sie die folgenden Schritte aus, um das alte, möglicherweise fehlerhafte Docker-Volume zu entfernen und die Datenbank mit der korrekten Konfiguration neu zu starten.

## 1. Docker-Container anhalten

Stoppen und entfernen Sie alle laufenden Container, die in Ihrer `docker-compose.yml` definiert sind.

```bash
docker compose down
```

## 2. Altes Volume identifizieren und löschen

Listen Sie alle Docker-Volumes auf, um den Namen des alten, benannten Volumes zu finden, das von `postgres` verwendet wurde. Suchen Sie nach einem Volume, das wahrscheinlich einen Namen wie `kanzlei-app_postgres_data` trägt (der Präfix `kanzlei-app_` wird vom Verzeichnisnamen abgeleitet).

```bash
docker volume ls
```

Löschen Sie das identifizierte Volume. Ersetzen Sie `VOLUME_NAME` durch den tatsächlichen Namen des Volumes aus der Liste.

```bash
docker volume rm VOLUME_NAME
```

**Wichtiger Hinweis:** Dieser Schritt löscht alle Daten, die in diesem Volume gespeichert waren. Stellen Sie sicher, dass Sie das richtige Volume löschen.

## 3. Datenbank neu starten

Starten Sie die Dienste neu. Der `--build`-Flag stellt sicher, dass alle Images neu gebaut werden, und `-d` startet die Container im Hintergrund (detached mode).

```bash
docker compose up --build -d
```

Der `postgres`-Dienst wird nun den in der `docker-compose.yml` konfigurierten Bind-Mount verwenden und die Datenbankdateien im Verzeichnis `\\wsl.localhost\Ubuntu\home\vadim\App-Entwicklung\Test_DB\postgres_data` ablegen.