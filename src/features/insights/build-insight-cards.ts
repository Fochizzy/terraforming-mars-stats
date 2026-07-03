export function buildInsightCard(params: {
  sentence: string;
  sampleSize: number;
  confidence: 'low' | 'medium' | 'high';
}) {
  return {
    title: 'Insight',
    body: params.sentence,
    sampleSize: params.sampleSize,
    confidence: params.confidence,
  };
}
