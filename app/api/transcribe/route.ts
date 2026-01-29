import { NextRequest, NextResponse } from 'next/server';
import Groq from "groq-sdk";

const groq = new Groq({
  apiKey: process.env.GROQ_API_KEY,
});

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const file = formData.get('file') as File;
    const priceContext = formData.get('priceContext') as string || "";

    if (!file) {
      return NextResponse.json({ error: 'No audio file' }, { status: 400 });
    }

    // 1. SCHRITT: LIVE-DATEN VON SOCKENTICK HOLEN (Für Volt Commander Logik)
    const botResponse = await fetch('https://sockentick.de/get_bot_intelligence.php'); // Deine Bot-URL anpassen
    const botData = await botResponse.json();

    // Marktdruck berechnen (Snake Engine Logik aus PHP)
    const activeTrades = botData.reb_active_trades || {};
    const tradeCount = Object.keys(activeTrades).length;
    const currentPressure = (tradeCount * 6.25).toFixed(2);
    const pressureMode = Number(currentPressure) > 15 ? "ATTACKER" : Number(currentPressure) > 5 ? "SPY" : "DEFENDER";

    // Volt Commander Context für die KI zusammenbauen
    // Wir sagen der KI, wie der Markt für die erwähnten Assets gerade steht
    let voltContext = "";
    Object.keys(botData.asset_memory || {}).forEach(key => {
      if (key.endsWith("_LONG")) {
        const asset = key.replace("_LONG", "");
        const l = botData.asset_memory[`${asset}_LONG`]?.counts || 0;
        const s = botData.asset_memory[`${asset}_SHORT`]?.counts || 0;
        const diff = Math.abs(l - s);
        let status = diff > 10 ? (l > s ? "INSTITUTIONAL BUY" : "INSTITUTIONAL SELL") : "SIDEWAYS";
        voltContext += `${asset}: Status ${status} (L:${l}/S:${s}), `;
      }
    });

// 2. SCHRITT: Sprache zu Text (Whisper)
    const transcription = await groq.audio.transcriptions.create({
      file: file,
      model: "whisper-large-v3",
    });

    const userText = transcription.text;

// 3. SCHRITT: KI-Analyse mit Volt-Commander-Wissen & Asset-Eingrenzung
    const chatCompletion = await groq.chat.completions.create({
      model: "llama-3.1-8b-instant",
      messages: [
        {
          role: "system",
          content: `Du bist der Darkflow Krypto-Berater (Jahr 2026). User: Uwe.
          
          WICHTIGE LIVE-DATEN:
          Marktdruck: ${currentPressure}% | Modus: ${pressureMode}
          Volt-Status: ${voltContext}
          REFERENZ-KURSE: ${priceContext || "LTC: 85.00, DOT: 7.50, NEAR: 4.20, ADA: 0.36, SOL: 150.00"}

          STRIKTE REGELN:
          1. ERLAUBTE ASSETS: Nutze NUR Ticker aus dieser Liste: [BTC, ETH, BNB, SOL, XRP, ADA, LINK, DOT, LTC, AVAX, SUI, OP, ARB, INJ, NEAR, FIL]. 
             Nenne NIEMALS Assets wie DOGE oder PEPE. Wenn du DOT meinst, schreibe DOT.
          2. BUDGET: Schreibe den Betrag (z.B. 2000) zwingend in 'budget_einschaetzung_eur' UND 'budget_eur'. (Doppelt hält besser für das Dashboard).
          3. KEIN JSON IN FELDERN: 'breakout_target' darf nur Text sein (z.B. "LTC: 95€, DOT: 8.50€").
          4. TEXT: Sei ausführlich. "Hallo Uwe, bei einem Marktdruck von ${currentPressure}% empfehle ich folgende Aufteilung..." Erkläre die Volt-Insights.

          BEISPIEL FÜR DEINE ANTWORT:
          {
            "summary": "Strategische Anlage für Uwe",
            "customer_type": "Privater Investor",
            "decision_state": "Empfehlung",
            "budget_einschaetzung_eur": 2000,
            "budget_eur": 2000,
            "timeframe": "Mittelfristig",
            "objections": "Keine",
            "next_action": "Kauf ausführen",
            "follow_up": "In 24h prüfen",
            "probability": 0.85,
            "mentioned_assets": ["LTC", "DOT"],
            "risk_profile": "Ausgewogen",
            "position_size_units": "10.5 LTC und 140 DOT",
            "breakout_target": "LTC: 95€, DOT: 8.50€",
            "recommendation_text": "Hallo Uwe, basierend auf dem INSTITUTIONAL BUY Signal bei LTC habe ich dein Budget von 2000€ aufgeteilt..."
          }

          ERFORDERLICHE JSON KEYS (EXAKT): 
          summary, customer_type, decision_state, budget_einschaetzung_eur, budget_eur, timeframe, objections, next_action, follow_up, probability, mentioned_assets, risk_profile, position_size_units, breakout_target, recommendation_text.`
        },
        {
          role: "user",
          content: userText,
        }, 
      ],
      response_format: { type: "json_object" },
    });

    const content = chatCompletion.choices[0].message.content;
    if (!content) throw new Error("Keine Antwort von der KI erhalten");

    const aiAnalysis = JSON.parse(content);

    // ERGEBNIS AN FRONTEND SENDEN
    return NextResponse.json({
      text: userText,
      ...aiAnalysis,
      marketPressure: currentPressure,
      pressureMode: pressureMode,
      rawBotData: {
        asset_memory: botData.asset_memory
      }
    });

  } catch (error: any) {
    console.error("Groq Error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}