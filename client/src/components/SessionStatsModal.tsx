import { AnalyticsData } from '../types/gameState';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogClose } from '@/components/ui/dialog';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { X } from 'lucide-react';

interface SessionStatsModalProps {
  isOpen: boolean;
  onClose: () => void;
  analytics: AnalyticsData;
}

export function SessionStatsModal({ isOpen, onClose, analytics }: SessionStatsModalProps) {
  const mockSessionData = {
    overview: {
      totalBets: analytics.totalBets,
      winRate: analytics.winRate,
      totalProfit: analytics.totalProfit,
      largestWin: 0.80
    },
    performance: {
      accuracy: analytics.accuracy,
      precision: 0.891,
      recall: 0.856,
      f1Score: 0.873
    },
    risk: {
      maxDrawdown: -0.45,
      sharpeRatio: 2.14,
      riskScore: 'Medium',
      kellyPercent: 15.2
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto bg-card-bg border-gray-600">
        <DialogHeader>
          <div className="flex justify-between items-center">
            <DialogTitle className="text-2xl font-bold text-crypto-green">
              Session Statistics
            </DialogTitle>
            <DialogClose onClick={onClose}>
              <X className="h-6 w-6 text-gray-400 hover:text-white" />
            </DialogClose>
          </div>
        </DialogHeader>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {/* Session Overview */}
          <Card className="bg-dark-bg border-gray-600">
            <CardHeader>
              <CardTitle className="text-crypto-green">Session Overview</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div className="flex justify-between">
                  <span className="text-gray-400">Total Bets:</span>
                  <span className="font-mono">{mockSessionData.overview.totalBets}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">Win Rate:</span>
                  <span className="font-mono text-crypto-green">
                    {(mockSessionData.overview.winRate * 100).toFixed(1)}%
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">Total Profit:</span>
                  <span className={`font-mono ${
                    mockSessionData.overview.totalProfit > 0 ? 'text-crypto-green' : 'text-alert-red'
                  }`}>
                    {mockSessionData.overview.totalProfit > 0 ? '+' : ''}
                    {mockSessionData.overview.totalProfit.toFixed(2)} SOL
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">Largest Win:</span>
                  <span className="font-mono text-crypto-green">
                    +{mockSessionData.overview.largestWin.toFixed(2)} SOL
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>
          
          {/* Model Performance */}
          <Card className="bg-dark-bg border-gray-600">
            <CardHeader>
              <CardTitle className="text-crypto-green">Model Performance</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div className="flex justify-between">
                  <span className="text-gray-400">Accuracy:</span>
                  <span className="font-mono text-crypto-green">
                    {(mockSessionData.performance.accuracy * 100).toFixed(1)}%
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">Precision:</span>
                  <span className="font-mono text-accent-blue">
                    {(mockSessionData.performance.precision * 100).toFixed(1)}%
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">Recall:</span>
                  <span className="font-mono text-accent-blue">
                    {(mockSessionData.performance.recall * 100).toFixed(1)}%
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">F1 Score:</span>
                  <span className="font-mono text-accent-blue">
                    {(mockSessionData.performance.f1Score * 100).toFixed(1)}%
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>
          
          {/* Risk Management */}
          <Card className="bg-dark-bg border-gray-600">
            <CardHeader>
              <CardTitle className="text-crypto-green">Risk Management</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div className="flex justify-between">
                  <span className="text-gray-400">Max Drawdown:</span>
                  <span className="font-mono text-alert-red">
                    {mockSessionData.risk.maxDrawdown.toFixed(2)} SOL
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">Sharpe Ratio:</span>
                  <span className="font-mono text-crypto-green">
                    {mockSessionData.risk.sharpeRatio.toFixed(2)}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">Risk Score:</span>
                  <span className="font-mono text-yellow-500">
                    {mockSessionData.risk.riskScore}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">Kelly %:</span>
                  <span className="font-mono text-accent-blue">
                    {mockSessionData.risk.kellyPercent.toFixed(1)}%
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </DialogContent>
    </Dialog>
  );
}
