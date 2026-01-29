export function enrichTranscript(transcript: string) {
  return {
    gespraechszusammenfassung:
      "Der Kunde zeigt klares Interesse an einer KI-Lösung, hat jedoch noch Bedenken.",
    kundentyp: "KMU",
    entscheidungslage: "heiß",
    budget_einschaetzung_eur: 8000,
    zeitrahmen: "diese Woche",
    einwaende: ["Integration", "Datenschutz"],
    empfohlene_naechste_aktion: {
      aktion: "Follow-up Call",
      zeitfenster: "innerhalb von 48 Stunden",
      begruendung: "Hohe Kaufabsicht bei noch offenen Einwänden"
    },
    follow_up_nachricht:
      "Hallo Herr Müller, vielen Dank für das Gespräch. Gerne würde ich die offenen Punkte zur Integration und zum Datenschutz kurz klären.",
    abschlusswahrscheinlichkeit: 0.76
  };
}
