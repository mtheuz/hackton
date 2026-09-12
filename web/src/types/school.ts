export type SchoolMetric = 'mood_avg' | 'trocas_impulso' | 'modo_aula_respostas';

export interface SchoolDailySignal {
  day: string;
  metric: SchoolMetric;
  value: number;
  sampleSize: number;
}
