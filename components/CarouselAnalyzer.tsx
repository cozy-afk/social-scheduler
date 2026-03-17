'use client';

import { useState } from 'react';
import { Asset } from '@/types/models';
import { analyzeCarouselOrder } from '@/lib/carousel-analyzer';
import type { CarouselAnalysis } from '@/types/utils';
import { Sparkles, TrendingUp, AlertCircle, ArrowRight } from 'lucide-react';

interface CarouselAnalyzerProps {
  assets: Asset[];
  platform: 'instagram' | 'tiktok';
  caption?: string;
  onReorder?: (newOrder: number[]) => void;
}

export default function CarouselAnalyzer({
  assets,
  platform,
  caption,
  onReorder,
}: CarouselAnalyzerProps) {
  const [analysis, setAnalysis] = useState<CarouselAnalysis | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);

  const handleAnalyze = async () => {
    setIsAnalyzing(true);
    try {
      const result = await analyzeCarouselOrder(assets, platform, caption);
      setAnalysis(result);
    } catch (error) {
      console.error('Analysis failed:', error);
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleApplyRecommendation = () => {
    if (analysis && onReorder) {
      onReorder(analysis.recommendedOrder);
    }
  };

  const getScoreColor = (score: number) => {
    if (score >= 85) return 'text-green-600';
    if (score >= 70) return 'text-yellow-600';
    return 'text-red-600';
  };

  const getScoreBgColor = (score: number) => {
    if (score >= 85) return 'bg-green-50 border-green-200';
    if (score >= 70) return 'bg-yellow-50 border-yellow-200';
    return 'bg-red-50 border-red-200';
  };

  return (
    <div className="space-y-4">
      {/* Analyze Button */}
      {!analysis && (
        <button
          onClick={handleAnalyze}
          disabled={isAnalyzing || assets.length < 2}
          className="flex items-center gap-2 bg-purple-600 text-white px-4 py-2 rounded-lg hover:bg-purple-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <Sparkles className="w-4 h-4" />
          {isAnalyzing ? 'Analyzing Carousel...' : '🤖 AI Analyze Carousel Order'}
        </button>
      )}

      {/* Analysis Results */}
      {analysis && (
        <div className="space-y-4">
          {/* Overall Score */}
          <div className={`border rounded-lg p-4 ${getScoreBgColor(analysis.overallScore)}`}>
            <div className="flex items-center justify-between">
              <div>
                <h4 className="font-semibold text-gray-900 mb-1">Carousel Viral Score</h4>
                <p className="text-sm text-gray-600">{analysis.reasoning}</p>
              </div>
              <div className="text-right">
                <div className={`text-4xl font-bold ${getScoreColor(analysis.overallScore)}`}>
                  {analysis.overallScore}
                </div>
                <div className="text-xs text-gray-500">out of 100</div>
              </div>
            </div>
          </div>

          {/* Recommended Order */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <div className="flex items-start justify-between mb-3">
              <div>
                <h4 className="font-semibold text-blue-900 mb-1 flex items-center gap-2">
                  <TrendingUp className="w-4 h-4" />
                  Recommended Order
                </h4>
                <p className="text-sm text-blue-700">
                  Reorder for maximum engagement
                </p>
              </div>
              <button
                onClick={handleApplyRecommendation}
                className="bg-blue-600 text-white text-sm px-3 py-1.5 rounded-lg hover:bg-blue-700 transition-colors"
              >
                Apply Order
              </button>
            </div>

            <div className="flex items-center gap-2 overflow-x-auto pb-2">
              {analysis.recommendedOrder.map((originalIndex, newPosition) => (
                <div key={originalIndex} className="flex-shrink-0">
                  <div className="text-center">
                    <div className="bg-white border-2 border-blue-300 rounded-lg p-2 w-20 h-20 flex items-center justify-center mb-1">
                      <div className="text-2xl">🖼️</div>
                    </div>
                    <div className="text-xs font-medium text-blue-900">
                      #{newPosition + 1}
                    </div>
                    {originalIndex !== newPosition && (
                      <div className="text-xs text-blue-600">
                        (was #{originalIndex + 1})
                      </div>
                    )}
                  </div>
                  {newPosition < analysis.recommendedOrder.length - 1 && (
                    <ArrowRight className="w-4 h-4 text-blue-400 mx-1 inline" />
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Individual Image Scores */}
          <div className="space-y-3">
            <h4 className="font-semibold text-gray-900">Individual Image Analysis</h4>
            
            {analysis.imageScores.map((imgScore, idx) => (
              <div
                key={idx}
                className="bg-white border border-gray-200 rounded-lg p-4"
              >
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-semibold text-gray-900">Image #{idx + 1}</span>
                      <span className={`text-sm font-medium ${getScoreColor(imgScore.score)}`}>
                        {imgScore.score}/100
                      </span>
                    </div>
                    <div className="text-sm text-gray-600">
                      Hook Potential: <span className="font-medium">{imgScore.hookPotential}/100</span>
                    </div>
                  </div>
                </div>

                {/* Viral Factors */}
                <div className="grid grid-cols-5 gap-2 mb-3">
                  {(Object.entries(imgScore.viralFactors) as [string, number][]).map(([factor, score]) => (
                    <div key={factor} className="text-center">
                      <div className="text-xs text-gray-500 mb-1 capitalize">
                        {factor.replace(/([A-Z])/g, ' $1').trim()}
                      </div>
                      <div className="h-1.5 bg-gray-200 rounded-full overflow-hidden">
                        <div
                          className={`h-full ${
                            score >= 80 ? 'bg-green-500' : score >= 60 ? 'bg-yellow-500' : 'bg-red-500'
                          }`}
                          style={{ width: `${score}%` }}
                        />
                      </div>
                      <div className="text-xs font-medium text-gray-700 mt-1">{score}</div>
                    </div>
                  ))}
                </div>

                {/* Strengths & Weaknesses */}
                <div className="grid grid-cols-2 gap-4 text-sm">
                  {imgScore.strengths.length > 0 && (
                    <div>
                      <div className="text-green-700 font-medium mb-1">✓ Strengths:</div>
                      <ul className="text-green-600 space-y-0.5">
                        {imgScore.strengths.map((strength, i) => (
                          <li key={i}>• {strength}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                  {imgScore.weaknesses.length > 0 && (
                    <div>
                      <div className="text-orange-700 font-medium mb-1">
                        <AlertCircle className="w-3 h-3 inline mr-1" />
                        Could Improve:
                      </div>
                      <ul className="text-orange-600 space-y-0.5">
                        {imgScore.weaknesses.map((weakness, i) => (
                          <li key={i}>• {weakness}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>

          {/* Reanalyze Button */}
          <button
            onClick={handleAnalyze}
            disabled={isAnalyzing}
            className="w-full border-2 border-dashed border-gray-300 text-gray-600 px-4 py-2 rounded-lg hover:border-gray-400 hover:text-gray-700 transition-colors"
          >
            🔄 Reanalyze
          </button>
        </div>
      )}
    </div>
  );
}
