import type { MoodPerformanceBucket, MoodSnapshotBucket } from '../types/intercepta';

/**
 * Dado de exemplo pra demo, usado só quando a turma/aluno ainda não gerou
 * volume real suficiente (k-anonimato de 3 no caso da turma, mínimo de 2
 * respostas por faixa no Raio-X do aluno) — nunca substitui dado real
 * quando ele existe. Ver produto.md § "Raio-X privado (pré-populado na demo)".
 */
export const MOCK_CLASS_MOOD_BUCKETS: MoodSnapshotBucket[] = [
  { mood: 'muito_mal', count: 3 },
  { mood: 'mal', count: 4 },
  { mood: 'neutro', count: 8 },
  { mood: 'bem', count: 11 },
  { mood: 'muito_bem', count: 5 },
];

export const MOCK_MOOD_PERFORMANCE_BUCKETS: MoodPerformanceBucket[] = [
  { mood: 'muito_mal', accuracy: 42, sampleSize: 4 },
  { mood: 'mal', accuracy: 58, sampleSize: 5 },
  { mood: 'neutro', accuracy: 71, sampleSize: 6 },
  { mood: 'bem', accuracy: 83, sampleSize: 7 },
  { mood: 'muito_bem', accuracy: 90, sampleSize: 5 },
];
