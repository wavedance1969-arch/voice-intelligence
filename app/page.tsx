'use client'

import dynamic from 'next/dynamic';
import { useState, useEffect, useRef } from 'react'
import MicSelector from './components/MicSelector'
import { AssetAnalysisResult, fetchLiveAssets } from '../lib/assetEngine'
import Groq from "groq-sdk";

const groq = new Groq({
  apiKey: "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",
  dangerouslyAllowBrowser: true 
});

const assetEmojis: Record<string, string> = {
  BTC: '🟡', ETH: '🟣', USDT: '🔵', BNB: '🟠', ADA: '🔴', XRP: '💧',
  DOGE: '🐶', DOT: '⚫', SOL: '☀️', LTC: '🪙', LINK: '🔗', UNI: '🟢',
  MATIC: '🔷', AVAX: '❄️', SHIB: '🐕', FTM: '🔥'
}

// VOLT COMMANDER LOGIK - Direkt hier oben definieren
function getVoltCommanderInsight(learnedLong: number, learnedShort: number) {
  const diff = Math.abs(learnedLong - learnedShort);
  const isLong = learnedLong > learnedShort;
  
  if (diff <= 3) {
    return { text: "VOLATILE SIDEWAYS", color: "#f1c40f", direction: isLong ? "LONG" : "SHORT", glow: false };
  } else if (diff > 10) {
    return { text: isLong ? "INSTITUTIONAL BUY" : "INSTITUTIONAL SELL", color: isLong ? "#00ff88" : "#ff0044", direction: isLong ? "LONG" : "SHORT", glow: true };
  } else {
    return { text: isLong ? "PROBABLE LONG" : "PROBABLE SHORT", color: isLong ? "#4ecca3" : "#ff4b2b", direction: isLong ? "LONG" : "SHORT", glow: false };
  }
}

interface TranscriptResult {
  gespraechszusammenfassung: string
  kundentyp: string
  entscheidungslage: string
  budget_einschaetzung_eur: string
  zeitrahmen: string
  einwaende: string
  empfohlene_naechste_aktion: string
  follow_up_nachricht: string
  abschlusswahrscheinlichkeit: string
  mentioned_assets: string[]
  risk_profile: string
  position_size_units: string
  breakout_target: string
  recommendation_text: string
}

function Home() {
  const [selectedMic, setSelectedMic] = useState<string>('')
  const [mediaBlobUrl, setMediaBlobUrl] = useState<string | null>(null)
  const [recording, setRecording] = useState<MediaRecorder | null>(null)
  const [status, setStatus] = useState<string>('idle')


  // --- NEU: HARDWARE-REFERENZ FÜR HOTKEYS ---
  const micRef = useRef(''); 
  useEffect(() => {
    micRef.current = selectedMic;
  }, [selectedMic]);

  const [transcript, setTranscript] = useState<TranscriptResult>({
    gespraechszusammenfassung: '',
    kundentyp: '',
    entscheidungslage: '',
    budget_einschaetzung_eur: '',
    zeitrahmen: '',
    einwaende: '',
    empfohlene_naechste_aktion: '',
    follow_up_nachricht: '',
    abschlusswahrscheinlichkeit: '',
    mentioned_assets: [],
    risk_profile: '---',
    position_size_units: '---',
    breakout_target: '---',
    recommendation_text: ''
  })
  
  const [assetResults, setAssetResults] = useState<AssetAnalysisResult[]>([])

  // --- HOTKEY LOGIK (SPACE-BAR) ---
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      // Verhindert das Scrollen der Seite bei Leertaste
      if (event.code === 'Space' && (event.target as HTMLElement).tagName !== 'INPUT') {
        event.preventDefault();
      }

      const isCurrentlyRecording = status === 'recording';
      const isBusy = status === 'analyzing' || status === 'processing' || status === 'stopped';

      // Hotkey-Trigger
      if (event.code === 'Space' && !isCurrentlyRecording && !isBusy) {
        startRecording();
      } else if (event.code === 'Space' && isCurrentlyRecording) {
        stopRecording();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [status, recording]); 


  // 1. FILTER: Nur Assets laden, die LONG sind (EU Spot-Käufer)
  useEffect(() => {
    fetchLiveAssets().then(data => {
        const longs = data.filter(a => a.dominantSide === 'LONG');
        setAssetResults(longs);
    }).catch(e => console.error("Asset Fetch Error", e));
  }, []);


  // Hilfsvariable für den Chart - Sicherer Check
  const activeSignal = assetResults.find(res => 
    (transcript.mentioned_assets || []).some(m => 
      m && res.asset && m.toUpperCase() === res.asset.toUpperCase()
    )
  );

const startRecording = async () => {
    if (!micRef.current) return alert('Bitte Mikrofon auswählen!');
    
    // WICHTIG: Vorherigen Zustand komplett resetten
    if (mediaBlobUrl) URL.revokeObjectURL(mediaBlobUrl); 

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: { deviceId: { exact: micRef.current } } 
      });
      
      const recorder = new MediaRecorder(stream, { mimeType: 'audio/webm' });
      const localChunks: Blob[] = [];
      setRecording(recorder);
      setStatus('recording');

      recorder.ondataavailable = (e) => { 
        if (e.data.size > 0) localChunks.push(e.data); 
      };

      recorder.onstop = () => {
        // Hier stoppen wir alle Mikrofon-Tracks hardwareseitig!
        stream.getTracks().forEach(track => track.stop()); 

        const blob = new Blob(localChunks, { type: 'audio/webm' });
        const url = URL.createObjectURL(blob);
        setMediaBlobUrl(url);
        setStatus('stopped');

        handleAnalyze(url); 
      };

      recorder.start(1000); 
    } catch (err) {
      console.error(err);
      alert("Mikrofon-Zugriff verweigert.");
      setStatus('idle');
    }
  };

  const stopRecording = () => { 
    if (recording && recording.state !== "inactive") { 
      recording.stop(); 
      setStatus('processing'); 
    } 
  };

const handleAnalyze = async (passedUrl?: string) => {
  const urlToUse = passedUrl || mediaBlobUrl; 
  if (!urlToUse) return;

  setStatus('analyzing');
  try {
    // 1. Audio vorbereiten
    const audioBlob = await fetch(urlToUse).then(r => r.blob());
    const audioFile = new File([audioBlob], 'recording.wav', { type: 'audio/wav' });

    // 2. Preis-Kontext sammeln
    const priceContext = assetResults
      .map(a => `${a.asset}: ${(a as any).price || (a as any).entry || 0}€`)
      .join(', ');

    // 3. SCHRITT: Sprache zu Text (Whisper)
    const transcription = await groq.audio.transcriptions.create({
      file: audioFile,
      model: "whisper-large-v3",
    });

    const userText = transcription.text;

    // 4. SCHRITT: KI-Analyse (Direktaufruf statt API-Route)
    const chatCompletion = await groq.chat.completions.create({
      model: "llama-3.1-8b-instant",
      messages: [
        {
          role: "system",
          content: `Du bist der Darkflow Krypto-Berater (Jahr 2026). User: Uwe.
          GIB DEINE ANTWORT IMMER ALS JSON-OBJEKT AUS.

          REFERENZ-KURSE: ${priceContext || "LTC: 85.00, DOT: 7.50, NEAR: 4.20, ADA: 0.36, SOL: 150.00"}
          
          STRIKTE REGELN:
          1. ERLAUBTE ASSETS: [BTC, ETH, BNB, SOL, XRP, ADA, LINK, DOT, LTC, AVAX, SUI, OP, ARB, INJ, NEAR, FIL].
          2. BUDGET: Schreibe Betrag in 'budget_einschaetzung_eur' UND 'budget_eur'.
          3. TEXT: Sei ausführlich. Erkläre die Strategie basierend auf Uwe's Input.

          ERFORDERLICHE JSON KEYS: 
          summary, customer_type, decision_state, budget_einschaetzung_eur, budget_eur, timeframe, objections, next_action, follow_up, probability, mentioned_assets, risk_profile, position_size_units, breakout_target, recommendation_text.`
        },
        {
          role: "user",
          content: userText,
        },
      ],
      response_format: { type: "json_object" },
    });

    const data = JSON.parse(chatCompletion.choices[0].message.content || "{}");

    // 5. State aktualisieren (Exakt wie vorher)
    setTranscript({
      gespraechszusammenfassung: data.summary || 'Analyse fertig.',
      kundentyp: data.customer_type || 'Unbekannt',
      entscheidungslage: data.decision_state || 'In Prüfung',
      budget_einschaetzung_eur: data.budget_eur || '---',
      zeitrahmen: data.timeframe || '---',
      einwaende: data.objections || 'Keine',
      empfohlene_naechste_aktion: data.next_action || 'Follow-up',
      follow_up_nachricht: data.follow_up || '',
      abschlusswahrscheinlichkeit: data.probability || '50',
      mentioned_assets: data.mentioned_assets || [],
      risk_profile: data.risk_profile || 'Normal',
      position_size_units: data.position_size_units || '---',
      breakout_target: data.breakout_target || '---',
      recommendation_text: data.recommendation_text || ''
    });

    const liveData = await fetchLiveAssets();
    setAssetResults(liveData.filter(a => a.dominantSide === 'LONG'));
    setStatus('idle');

    } catch (error: any) {
        console.error("Fehler:", error);
        // Wir schreiben den Fehler direkt in die Zusammenfassung, damit du ihn in der EXE lesen kannst!
        setTranscript(prev => ({ 
          ...prev, 
          gespraechszusammenfassung: "FEHLER-DIAGNOSE: " + (error.message || "Unbekannter Fehler") 
        }));
        setStatus('error');
        setTimeout(() => setStatus('idle'), 6000); 
    }
  };

  return (
    <main className="min-h-screen bg-[#0f172a] text-[#f8fafc] flex items-center justify-center p-8 font-sans">
      <div className="bg-[#1e293b]/40 backdrop-blur-2xl p-10 rounded-[2.5rem] border border-white/10 shadow-2xl w-full max-w-6xl">
        
        {/* HEADER */}
        <div className="flex justify-between items-start mb-10">
          <div>
            <h1 className="text-3xl font-black tracking-tighter text-[#4ecca3] uppercase italic">
              Darkflow <span className="text-white font-light text-2xl">Crypto Commander</span>
            </h1>
            <p className="text-gray-500 text-[9px] uppercase tracking-[0.4em] mt-2 font-bold italic">Neural Asset Link v2.0</p>
          </div>
          <div className="flex items-center gap-2 bg-black/30 px-3 py-1.5 rounded-full border border-white/5">
            <div className={`w-2 h-2 rounded-full ${status === 'recording' ? 'bg-red-500 animate-pulse' : 'bg-[#4ecca3]'}`}></div>
            <span className="text-[10px] font-mono text-gray-400 uppercase tracking-widest">{status}</span>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          {/* LEFT: CONTROLS & TRADINGVIEW */}
          <div className="lg:col-span-4 space-y-6">
            <div className="bg-black/20 p-5 rounded-3xl border border-white/5 shadow-inner overflow-hidden">
              <label className="block text-[9px] uppercase tracking-[0.3em] text-gray-500 font-black mb-4">Signal Source</label>
              <MicSelector onSelect={setSelectedMic} />
            </div>

            <div className="grid grid-cols-2 gap-4">
            {/* START BUTTON MIT HOTKEY-HINWEIS */}
            <button 
              onClick={startRecording} 
              disabled={status === 'recording' || status === 'analyzing'}
              className={`group flex flex-col items-center justify-center gap-3 py-6 rounded-3xl transition-all border-b-4 ${
                status === 'recording' 
                ? 'bg-red-900/40 border-red-500 text-red-500 opacity-50' 
                : 'bg-[#4ecca3] border-[#3ba382] text-[#0f172a] hover:scale-[1.02]'
              }`}
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3Z"/><path d="M19 10v2a7 7 0 0 1-14 0v-2"/><line x1="12" x2="12" y1="19" y2="22"/></svg>
              <span className="text-[10px] font-black uppercase">Start Link <span className="opacity-50 text-[8px] ml-1">(SPACE)</span></span>
            </button>

            {/* STOP BUTTON MIT HOTKEY-HINWEIS */}
            <button 
              onClick={stopRecording} 
              disabled={status !== 'recording'}
              className={`group flex flex-col items-center justify-center gap-3 py-6 rounded-3xl transition-all border-b-4 ${
                status === 'recording'
                ? 'bg-white/10 border-white/40 text-white animate-pulse'
                : 'bg-white/5 border-transparent text-gray-500 opacity-30'
              }`}
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><rect width="18" height="18" x="3" y="3" rx="2"/></svg>
              <span className="text-[10px] font-black uppercase tracking-widest">Cut Signal <span className="opacity-50 text-[8px] ml-1">(SPACE)</span></span>
            </button>
          </div>

          {/* ANALYSE BEREICH MIT STATUS-FEEDBACK */}
          {mediaBlobUrl && (
            <div className="space-y-4 pt-4 border-t border-white/5">
              {/* Visualisierung der Aufnahme */}
              <audio src={mediaBlobUrl} controls className="w-full h-8 opacity-40" />
              
              <button 
                onClick={() => handleAnalyze()} 
                disabled={status === 'analyzing'}
                className={`w-full py-4 rounded-2xl font-black uppercase transition-all flex items-center justify-center gap-3 shadow-xl ${
                  status === 'analyzing'
                    ? 'bg-gray-700 text-gray-400 cursor-not-allowed'
                    : 'bg-white text-[#0f172a] hover:bg-[#4ecca3] active:scale-95'
                }`}
              >
                {status === 'analyzing' ? (
                  <>
                    <div className="w-4 h-4 border-2 border-black/20 border-t-black rounded-full animate-spin"></div>
                    Neural Syncing...
                  </>
                ) : (
                  <>
                    <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="m12 14 4-4-4-4"/><path d="M3 3.5a2 2 0 0 1 2-2h11.5L21 7v13.5a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><path d="M15 2v5h5"/></svg>
                    Sync Intelligence
                  </>
                )}
              </button>
            </div>
          )}

            {/* TRADINGVIEW HIGHLIGHT */}
            {activeSignal && (
              <div className="w-full h-64 bg-black rounded-3xl border border-[#4ecca3]/30 overflow-hidden shadow-2xl animate-in zoom-in duration-500">
                <iframe 
                  src={`https://s.tradingview.com/widgetembed/?frameElementId=tradingview_76d4d&symbol=BINANCE%3A${activeSignal.asset}USDT&interval=60&hidesidetoolbar=1&theme=dark&style=1&timezone=Europe%2FBerlin`}
                  className="w-full h-full border-none opacity-80"
                />
              </div>
            )}
          </div>

          {/* RIGHT: OUTPUT ANALYSIS */}
          <div className="lg:col-span-8 bg-black/40 rounded-[2rem] border border-white/5 p-8 flex flex-col">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-8 h-[2px] bg-[#4ecca3]"></div>
              <h2 className="text-[9px] uppercase tracking-[0.6em] font-black text-gray-500">Neural Crypto Commander</h2>
            </div>

            <div className="flex-1 space-y-6">
              {/* Zusammenfassung */}
              <div className="bg-[#4ecca3]/5 p-5 rounded-2xl border-l-4 border-[#4ecca3]">
                <p className="text-base text-gray-200 leading-relaxed font-medium italic">
                  {transcript.gespraechszusammenfassung || "Waiting for signal input..."}
                </p>
              </div>

              {/* Detail-Kacheln (Typ, Budget, Wahrscheinlichkeit) - ABSICHERUNG */}
              <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                {[
                  { 
                    label: 'Intelligence Type', 
                    val: transcript.kundentyp || (transcript as any).customer_type 
                  },
                  { 
                    label: 'Budget Cap', 
                    val: (transcript.budget_einschaetzung_eur || (transcript as any).budget_eur || '---') + ' €' 
                  },
                  { 
                    label: 'Neural Probability', 
                    val: (() => {
                      const prob = transcript.abschlusswahrscheinlichkeit || (transcript as any).probability;
                      if (!prob) return '---';
                      const num = parseFloat(prob.toString());
                      if (isNaN(num)) return prob; 
                      return num <= 1 ? (num * 100).toFixed(0) + '%' : num + '%';
                    })()
                  }
                ].map((item, i) => (
                  <div key={i} className="bg-white/5 p-3 rounded-xl border border-white/5">
                    <p className="text-[7px] uppercase text-gray-600 font-black mb-1 tracking-widest">{item.label}</p>
                    <p className={`text-[11px] font-mono font-bold ${item.label === 'Neural Probability' ? 'text-[#4ecca3]' : 'text-gray-300'}`}>
                      {item.val || '---'}
                    </p>
                  </div>
                ))}
              </div>

              {/* Haupt-Empfehlungstext mit Disclaimer */}
              <div className="bg-gradient-to-br from-[#4ecca3]/20 to-transparent p-6 rounded-[2rem] border border-[#4ecca3]/30">
                <p className="text-sm text-gray-200 italic">
                  {transcript.recommendation_text || "System bereit..."}
                </p>

                {/* Automatischer Disclaimer - erscheint nur, wenn Text da ist */}
                {transcript.recommendation_text && (
                  <div className="mt-6 pt-4 border-t border-white/10">
                    <p className="text-[9px] text-gray-500 leading-tight uppercase tracking-widest">
                      <strong className="text-[#4ecca3]/60">Risk Warning:</strong> KI-generierte Analyse (Darkflow Engine 2026). Keine Finanzberatung. Krypto-Assets sind hochvolatil. Handeln auf eigene Gefahr.
                    </p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

          {/* BOTTOM TICKER - PREIS FIX, OHNE DD, MIT DYNAMISCHEM TARGET */}
          <div className="mt-10 pt-8 border-t border-white/5">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-[10px] uppercase tracking-[0.4em] font-black text-[#4ecca3]">Live Bot Intelligence (Spot Only)</h3>
              <span className="text-[9px] text-gray-500 font-mono italic">Sync: sockentick.de</span>
            </div>
            
            {/* gap-y-8 für mehr vertikalen Abstand */}
            <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-x-3 gap-y-8">
            {assetResults.map((res, index) => {
            const isMentioned = (transcript.mentioned_assets || []).some(m => {
              if (!m || !res.asset) return false;
              const mention = m.toUpperCase();
              const assetName = res.asset.toUpperCase();
              return mention.includes(assetName) || assetName.includes(mention);
            });
                      
            // 1. Echten Preis oder Fallback bestimmen
            const rawPrice = Number((res as any).price || (res as any).entry || (res as any).currentPrice || 0);
            const currentBudget = transcript.budget_einschaetzung_eur !== '---' ? transcript.budget_einschaetzung_eur : (transcript as any).budget_eur;
            
            let displayPrice = "";
            if (rawPrice > 0.03) {
              displayPrice = rawPrice.toLocaleString('de-DE', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + ' €';
            } else if (isMentioned && currentBudget && currentBudget !== '---') {
              const fallbacks: Record<string, string> = { 
                BNB: "585.40 €", SOL: "145.20 €", DOT: "7.10 €", LTC: "88.30 €", ADA: "0.36 €", BTC: "92400 €", ETH: "2450 €" 
              };
              displayPrice = fallbacks[res.asset] || "SYNC...";
            } else {
              displayPrice = "SYNC...";
            }

            return (
              <div 
                key={`${res.asset}-${index}`} 
                className={`transition-all duration-500 p-3 rounded-2xl border ${
                  isMentioned 
                  ? 'bg-[#4ecca3]/30 border-[#4ecca3] scale-105 shadow-[0_0_20px_rgba(78,204,163,0.3)] z-10' 
                  : 'bg-[#1e293b]/50 border-white/5 opacity-40'
                }`}
              >
                <div className="flex justify-between items-center mb-1">
                  <span className="text-lg">{assetEmojis[res.asset] || '💰'}</span>
                  <span className="text-[7px] font-black px-1.5 py-0.5 rounded bg-green-500/20 text-green-400">SPOT</span>
                </div>

                {/* ASSET NAME & PREIS MIT RICHTUNGS-PFEIL */}
                <div className="flex flex-col mt-2">
                  <div className={`text-[10px] font-black ${isMentioned ? 'text-white' : 'text-gray-400'}`}>
                    {res.asset}
                  </div>
                  <div className={`text-[11px] font-mono font-bold flex items-center gap-1 ${isMentioned ? 'text-white' : 'text-[#4ecca3]'}`}>
                    {displayPrice}
                    {/* Pfeil-Logik: Up bei Long-Überhang, Down bei Short-Überhang */}
                    {Number((res as any).learnedLong || 0) >= Number((res as any).learnedShort || 0) ? (
                      <span className="text-green-500 text-[10px] animate-pulse">↑</span>
                    ) : (
                      <span className="text-red-500 text-[10px]">↓</span>
                    )}
                  </div>
                </div>

                {/* VOLT COMMANDER SIGNAL */}
                {(() => {
                  const l = Number((res as any).learnedLong || 0); 
                  const s = Number((res as any).learnedShort || 0);
                  const insight = getVoltCommanderInsight(l, s);
                  return (
                    <div className="mt-3 text-center">
                      <div className="text-lg font-black leading-none mb-1" style={{ color: insight.color }}>
                        {insight.direction}
                      </div>
                      <div 
                        className={`inline-block px-2 py-1 rounded text-[7px] font-black border uppercase tracking-tighter ${insight.glow ? 'animate-pulse' : ''}`}
                        style={{ backgroundColor: `${insight.color}22`, color: insight.color, borderColor: `${insight.color}44` }}
                      >
                        ● {insight.text}
                      </div>
                    </div>
                  );
                })()}

                {/* BREAKOUT & VISION BLOCK */}
                <div className="grid grid-cols-2 gap-1 mt-3">
                  <div className="bg-[#0f172a] p-1.5 rounded text-center">
                    <div className="text-[5px] text-gray-500 uppercase">Breakout (+10%)</div>
                    <div className="text-[8px] text-[#4ecca3] font-bold font-mono">
                      {(() => {
                        const p = parseFloat(displayPrice.replace(/[^\d.,]/g, '').replace(',', '.'));
                        return p > 0 ? `${(p * 1.1).toFixed(2)} €` : "0.00 €";
                      })()}
                    </div>
                  </div>
                  <div className="bg-[#0f172a] p-1.5 rounded text-center">
                    <div className="text-[5px] text-gray-500 uppercase">Vision</div>
                    <div className="text-[8px] text-[#f1c40f] font-bold font-mono">
                      {res.asset === "ADA" ? "1.97 €" : (res as any).vision || '---'} 
                    </div>
                  </div>
                </div>

                {/* DYNAMISCHES KI-TARGET */}
                {isMentioned && (
                  <div className="mt-2 pt-2 border-t border-white/10 space-y-1">
                    <div className="flex justify-between items-center">
                      <span className="text-[7px] text-white/40 uppercase font-black tracking-tighter">Target:</span>
                      <span className="text-[9px] text-[#4ecca3] font-mono font-bold">{transcript.breakout_target}</span>
                    </div>
                    <div className="text-[6px] text-[#4ecca3] font-black animate-pulse uppercase tracking-widest text-center">
                      Target Locked
                    </div>
                  </div>
                )}
              </div>
            )
          })}
          </div>
        </div>
      </div>
    </main>
  )
}


const DynamicHome = dynamic(() => Promise.resolve(Home), {
  ssr: false,
});

export default DynamicHome;