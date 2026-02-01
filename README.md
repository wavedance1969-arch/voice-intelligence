# 🐍 Darkflow Crypto Commander (2026)
**Intelligente Sprachsteuerung für das moderne Asset-Management**

## 🚀 Die Vision & Das Problem
In der heutigen Zeit liegt viel Firmenkapital ungenutzt auf Bankkonten und verliert durch die Inflation an Wert. Kryptowährungen bieten trotz ihrer Volatilität enorme Chancen, doch der Einstieg ist oft durch komplizierte Interfaces und Datenflut blockiert. 

Meine Vision für den **Crypto Commander** war es, diese Barriere einzureißen. Ich wollte ein Tool schaffen, das so intuitiv ist wie ein Gespräch: Man spricht seine Gedanken aus, und die KI übernimmt die komplexe Analyse und den Abgleich mit dem Markt.

## 🏗️ Funktionsweise (Einfach erklärt)
Die App fungiert als intelligentes Cockpit, das unstrukturierte Sprache in präzise Handelsstrategien verwandelt:
* **Audio-to-Data:** Die Spracheingabe wird in Echtzeit transkribiert und von einer KI (Llama-3.1) auf Investment-relevante Daten (Budget, Assets, Risiko) untersucht.
* **Live-Markt-Abgleich:** Die App erkennt erwähnte Assets sofort und koppelt sie mit den Live-Daten der "Snake Engine" (sockentick.de).
* **Smart Dashboard:** Ergebnisse werden nicht einfach nur aufgelistet, sondern grafisch hervorgehoben („Target Locked“), um sofortige Entscheidungen zu ermöglichen.

## 🎨 Design-Entscheidungen
* **Kognitive Klarheit (Dark Mode):** Das dunkle "Cyber-Grid" Design wurde gewählt, um die Augen bei längerer Nutzung zu schonen. Wichtige Signale (grünes Leuchten bei Übereinstimmung) stechen so sofort hervor.
* **Zero-Click Workflow:** Die gesamte Bedienung erfolgt über die Leertaste (Hotkey). Keine unnötigen Mauswege – der Fokus bleibt zu 100 % auf der Analyse.
* **Minimalismus:** Informationen erscheinen nur dann, wenn sie durch das Gespräch relevant werden. Das verhindert "Information Overload".

## 🚧 Herausforderungen & Learning
Die größte technische Schwierigkeit lag darin, die Brücke zwischen lokaler Hardware (Mikrofon/Windows-App) und der Cloud-KI so stabil zu bauen, dass keine Verzögerungen entstehen. Besonders die Entwicklung einer robusten Fehlerbehandlung für die installierte `.exe`-Version (Permissions & Netzwerk) war ein intensiver Lernprozess, um eine reibungslose User Experience zu garantieren.

## 🛠️ Tech-Stack
* **Framework:** Next.js (React) & Tauri (Desktop-Bridge)
* **KI-Engine:** Groq SDK (Whisper-v3 & Llama-3.1)
* **Datenquelle:** Live-API von sockentick.de
* **Styling:** Tailwind CSS (Cyber-Grid Layout)

## 🚀 Installation & Setup
1. **Repository klonen:** `git clone [URL]`
2. **Abhängigkeiten installieren:** `npm install`
3. **API-Key:** Hinterlegen Sie Ihren eigenen Groq-Key in der `page.tsx` (direkt nach den Imports).
4. **Starten:**
   * Entwicklung: `npm run dev`
   * Desktop-Build: `npx tauri build`

## 💡 Quick-Start: So interagieren Sie mit dem Commander
Um die besten Ergebnisse zu erzielen, drücken Sie die **Leertaste** und sprechen Sie ganz natürlich. Hier sind zwei bewährte Beispiele:

1. **Für den langfristigen Aufbau:**
   > "Ich möchte mir ein Krypto-Depot für 5.000 € aufbauen, was empfiehlst du mir?"
   *Der Commander erkennt das Budget, analysiert die Sicherheit der Assets und erstellt eine diversifizierte Strategie.*

2. **Für kurzfristige Chancen:**
   > "Ich möchte 1.000 Dollar kurzfristig in Krypto investieren. Welche Coins haben aktuell das größte Potenzial?"
   *Die KI gleicht Ihren Wunsch mit den Breakout-Targets und den Volt-Commander-Tendenzen ab.*

### 🔑 Test-Hinweis für die Jury
Um Ihnen einen reibungslosen Test der Anwendung zu ermöglichen, ersetzen Sie den **GROQ API-Key** mit Ihren eigenen Key. 
* Bitte beachten Sie, dass  die Anbindung an die Daten-Schnittstellen nach Abschluss des Bewerbungsverfahrens von mir deaktiviert werden.

*Hinweis: Der Commander reagiert dynamisch auf Zeiträume (langfristig vs. kurzfristig) und passt die Risiko-Einschätzung in den Detail-Kacheln sofort an.*

---

*Entwickelt von Uwe | Innovation Project 2026*
