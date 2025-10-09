# Kanzlei-Agent: Aktenverwaltung für Verkehrsrecht

## 1. Projektübersicht

**Kurzbeschreibung:**
Dieses Programm dient der Aktenverwaltung für eine kleine Kanzlei mit einem klaren Fokus auf das Verkehrsrecht. Es soll die tägliche Arbeit durch eine stabile und intuitive Oberfläche erleichtern.

**Zielgruppe:**
Die Anwendung ist für eine kleine Anzahl von Benutzern (ca. 2 primäre Anwälte) ausgelegt. Die erwartete Last ist gering, weshalb der Fokus auf Stabilität, Datenintegrität und Nachvollziehbarkeit liegt.

## 2. Technische Architektur

**Hosting:**
Die Anwendung wird auf einem **VPS-Server (ionos)** betrieben.

**Technologie-Stack:**
*   **Frontend & Backend:** Die Anwendung ist aktuell als monolithische **React**-Anwendung strukturiert, die einen **Node.js/Express**-Server für API-Anfragen nutzt.
*   **Datenbank:** Es wird ein physischer **PostgreSQL-Server** eingesetzt, der lokal an die Anwendung angebunden ist.
*   **Deployment:** Zukünftig ist ein Deployment in getrennten **Containern** für Frontend und Backend geplant, um die Skalierbarkeit und Wartbarkeit zu verbessern.

**Besondere Infrastruktur-Anforderung:**
*   **DB-Zugangsverwaltung:** Es müssen zwei separate Konfigurationsdateien für die Datenbankzugänge verwaltet werden: eine für die Entwicklung (`dev`) und eine für die Produktion (`prod`).
*   **Authentifizierung:** Der direkte Datenbankzugriff aus dem Frontend ist eine temporäre Lösung. Zukünftig soll die gesamte Kommunikation über eine gesicherte API mit **User-Authentifizierung** erfolgen.

## 3. Kern-Funktionalitäten

Die folgenden Kernfunktionen sind bereits implementiert:
*   **Akten-Management:** Anlegen, Suchen und Anzeigen einer detaillierten Historie für jede Akte.
*   **Zentrale Stammdatenverwaltung:** Ein "Stammbaum" zur zentralen Verwaltung von Mandanten, Gegnern und Dritten (wie z.B. Werkstätten oder Versicherungen).
*   **Automatische Aktennummernvergabe:** Gewährleistet eindeutige und nachvollziehbare Aktenkennungen.
*   **Fristen- und Notizen-Management:** Wichtige Termine und Anmerkungen können direkt in der Akte erfasst werden.
*   **Kollisionsprüfung:** Das System prüft bei der Anlage von Stammdaten, ob bereits ein Datensatz existiert, um Dubletten zu vermeiden.

## 4. Kritische Geschäftsregeln (Business Logic)

Diese Regeln sind für die Datenkonsistenz und den Betrieb von entscheidender Bedeutung:
*   **Physische Dateiverwaltung:** Alle zu einer Akte gehörenden Dokumente (PDFs, Bilder, Word-Dateien) werden nicht in der Datenbank, sondern physisch auf dem Datenbank-Server gespeichert. Die Ablage erfolgt in einer lesbaren Ordnerstruktur, die sich an der Aktennummer orientiert.
*   **Archivierungsregel (JSONB):** Sobald eine Akte den Status "geschlossen" erhält, muss der **aktuelle Zustand des zugehörigen Mandanten** als JSON-Datei exportiert und im physischen Aktenordner archiviert werden. Diese Regel stellt sicher, dass der zum Zeitpunkt des Abschlusses gültige Mandantenzustand für immer nachvollziehbar bleibt, selbst wenn sich die Stammdaten des Mandanten später ändern.

## 5. Aktueller Entwicklungsstatus & Nächste Schritte

**Status:**
Die Grundfunktionen sind stabil und einsatzbereit. Die aktuelle Priorität liegt auf der Bereinigung der Entwicklungsumgebung und der Behebung kritischer Fehler.

**Bekannte Probleme (Prio 1):**
1.  **DB-Schreibfehler:** Während die Verbindung zur Datenbank hergestellt werden kann (Lesezugriff funktioniert), schlagen alle Schreiboperationen (z.B. das Anlegen neuer Akten oder Mandanten) fehl.
2.  **Fehlende Anmeldestruktur:** Es gibt noch keine Benutzerauthentifizierung oder Rechtevergabe. Dies ist ein kritisches Sicherheitsrisiko und muss vor dem produktiven Einsatz implementiert werden.

**Zukünftige Erweiterbarkeit:**
Der Kern der Anwendung soll stabil und schlank bleiben. Zukünftige Module (z.B. Dokumentenvorlagen, eine einfache Buchhaltung oder KI-gestützte Funktionen) sollen über klar definierte **API-Schnittstellen** und ein **Event-System** angebunden werden, um die Kernlogik nicht zu beeinträchtigen.