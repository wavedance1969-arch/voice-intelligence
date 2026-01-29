// lib/assetEngine.ts
import assetKnowledge from './asset_knowledge.json'

type Bias = 'bullish' | 'moderate' | 'weak' | 'neutral'

interface SideData {
  bias: Bias
  confidence: number
  max_drawdown: number
  comment: string
}

interface AssetData {
  long: SideData
  short: SideData
}

type AssetKnowledge = Record<string, AssetData>

export interface AssetAnalysisResult {
  asset: string
  dominantSide: 'LONG' | 'SHORT' | 'NEUTRAL'
  confidence: number
  risk: number
  summary: string
}

// Lokale Analyse als Fallback
export function analyzeAsset(assetSymbol: string): AssetAnalysisResult | null {
  const data = (assetKnowledge as AssetKnowledge)[assetSymbol]
  if (!data) return null

  const longScore = data.long.confidence
  const shortScore = data.short.confidence

  let dominantSide: 'LONG' | 'SHORT' | 'NEUTRAL' = 'NEUTRAL'
  let selected: SideData | null = null

  if (longScore > shortScore && longScore > 0.1) {
    dominantSide = 'LONG'
    selected = data.long
  } else if (shortScore > longScore && shortScore > 0.1) {
    dominantSide = 'SHORT'
    selected = data.short
  }

  if (!selected) {
    return {
      asset: assetSymbol,
      dominantSide: 'NEUTRAL',
      confidence: 0,
      risk: 0,
      summary: `Keine dominante Tendenz für ${assetSymbol}.`
    }
  }

  return {
    asset: assetSymbol,
    dominantSide,
    confidence: selected.confidence,
    risk: Math.abs(selected.max_drawdown),
    summary: selected.comment
  }
}

export function getAllAssets(): string[] {
  return Object.keys(assetKnowledge as AssetKnowledge)
}

export async function fetchLiveAssets(): Promise<AssetAnalysisResult[]> {
  try {
    // 1. VERSUCH: Echte Live-Daten von sockentick.de
    const response = await fetch('https://sockentick.de/get_bot_intelligence.php', {
      cache: 'no-store' 
    });
    
    if (!response.ok) throw new Error('Netzwerk-Antwort war nicht ok');
    
    const rawData = await response.json();
    
    // Da dein JSON ein Objekt ist (mit Keys wie LTCUSDT_LONG), 
    // wandeln wir es in das Format für das Dashboard um:
    const results: AssetAnalysisResult[] = [];

    Object.keys(rawData).forEach(key => {
      // Wir ignorieren den global-Key und nehmen nur die Assets
      if (key !== 'global' && (key.includes('LONG') || key.includes('SHORT'))) {
        const data = rawData[key];
        
        // Extrahiere den Namen (z.B. "LTC" aus "LTCUSDT_LONG")
        const assetName = key.replace('USDT_LONG', '').replace('USDT_SHORT', '');
        const side = key.includes('LONG') ? 'LONG' : 'SHORT';

        results.push({
          asset: assetName,
          dominantSide: side as 'LONG' | 'SHORT',
          // Wir nutzen die Exits als Vertrauens-Level (Confidence)
          confidence: data.counts || 0, 
          // Der Drawdown aus deiner DB
          risk: data.max_dd ? Math.abs(data.max_dd) : 0,
          // Eine kurze Zusammenfassung für das UI
          summary: `Exits: ${data.total_exits || 0} | Press: ${data.avg_exit_press?.toFixed(2) || '0'}`
        });
      }
    });

    // Falls wir Daten gefunden haben, geben wir sie zurück, sonst leeres Array
    return results.length > 0 ? results : [];

  } catch (e) {
    // 2. FALLBACK: Wenn der Server offline ist oder das JSON klemmt
    console.log("Nutze Fallback-Daten aus asset_knowledge.json");
    const symbols = getAllAssets();
    return symbols.map(s => analyzeAsset(s)!).filter(Boolean);
  }
}