import * as api from '../api';

/**
 * Service-Klasse für Akten-bezogene Operationen
 * Trennt die Geschäftslogik vom Frontend
 */
export class AkteService {
  /**
   * Führt die Aggregation der Zahlungsdaten für eine Akte durch
   * @param {string} akteId - Die ID der Akte
   * @returns {Promise} - Die aktualisierte Akte mit aggregierten Daten
   */
  static async aggregateAkte(akteId) {
    try {
      return await api.aggregateRecord(akteId);
    } catch (error) {
      console.error('Fehler bei der Aggregation der Akte:', error);
      throw error;
    }
  }

  /**
   * Berechnet den Netto-Saldo basierend auf den aggregierten Werten
   * @param {object} akte - Die Akte mit Metadaten
   * @returns {number} - Der Netto-Saldo (Haben - Soll)
   */
  static calculateNetBalance(akte) {
    if (akte?.metadata) {
      const gesamt_zahlung_haben = parseFloat(akte.metadata.gesamt_zahlung_haben) || 0;
      const gesamt_forderung_soll = parseFloat(akte.metadata.gesamt_forderung_soll) || 0;
      return gesamt_zahlung_haben - gesamt_forderung_soll;
    }
    return 0;
  }

  /**
   * Ermittelt den Status der Akte basierend auf den aggregierten Werten
   * @param {object} akte - Die Akte mit Metadaten
   * @returns {string} - Status ('Gedeckt', 'Differenz', 'Keine Zahlungen')
   */
  static getAkteStatus(akte) {
    if (!akte?.metadata) {
      return 'Keine Zahlungen';
    }

    const gesamt_zahlung_haben = parseFloat(akte.metadata.gesamt_zahlung_haben) || 0;
    const gesamt_forderung_soll = parseFloat(akte.metadata.gesamt_forderung_soll) || 0;
    const hat_zahlungseingang = akte.metadata.hat_zahlungseingang;

    if (!hat_zahlungseingang) {
      return 'Keine Zahlungen';
    }

    const differenz = gesamt_zahlung_haben - gesamt_forderung_soll;
    
    if (Math.abs(differenz) < 0.01) { // Toleranz für Rundungsfehler
      return 'Gedeckt';
    } else {
      return differenz > 0 ? 'Überschuss' : 'Differenz';
    }
 }

  /**
   * Berechnet die Differenz zwischen Soll und Haben
   * @param {object} akte - Die Akte mit Metadaten
   * @returns {number} - Die Differenz (Soll - Haben)
   */
  static calculateDifferenz(akte) {
    if (akte?.metadata) {
      const gesamt_zahlung_haben = parseFloat(akte.metadata.gesamt_zahlung_haben) || 0;
      const gesamt_forderung_soll = parseFloat(akte.metadata.gesamt_forderung_soll) || 0;
      return gesamt_forderung_soll - gesamt_zahlung_haben;
    }
    return 0;
  }
}