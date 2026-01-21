
export type AppState = 'ONBOARDING' | 'CAMERA' | 'PROCESSING' | 'RESULT' | 'HISTORY' | 'PAYWALL' | 'SETTINGS' | 'PRIVACY' | 'TERMS';

export interface NutritionData {
  foodName: string;
  calories: number;
  protein: number;
  carbs: number;
  fats: number;
  fiber: number;
  sugar: number;
  sodium: number;
  healthScore: number;
  satietyLevel: 'Baixo' | 'Médio' | 'Alto';
  ingredients: string[];
  summary: string;
}

export interface HistoryEntry {
  id: string;
  date: string;
  image: string;
  data: NutritionData;
}

export type Language = 'pt' | 'en' | 'es';

export interface CameraResult {
  base64: string;
  mimeType: string;
}
