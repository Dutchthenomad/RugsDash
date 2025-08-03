import { ConnectionStatus as ConnectionStatusType } from '../types/gameState';
import { Badge } from '@/components/ui/badge';
import { Wifi, WifiOff, RefreshCw, AlertTriangle } from 'lucide-react';

interface ConnectionStatusProps {
  status: ConnectionStatusType;
  onReconnect?: () => void;
}

export function ConnectionStatus({ status, onReconnect }: ConnectionStatusProps) {
  const getStatusIcon = () => {
    switch (status.status) {
      case 'CONNECTED':
        return <Wifi className="h-3 w-3" />;
      case 'DISCONNECTED':
        return <WifiOff className="h-3 w-3" />;
      case 'RECONNECTING':
        return <RefreshCw className="h-3 w-3 animate-spin" />;
      case 'ERROR':
        return <AlertTriangle className="h-3 w-3" />;
      default:
        return <WifiOff className="h-3 w-3" />;
    }
  };

  const getStatusColor = () => {
    switch (status.status) {
      case 'CONNECTED':
        return 'bg-crypto-green';
      case 'DISCONNECTED':
        return 'bg-gray-500';
      case 'RECONNECTING':
        return 'bg-yellow-500';
      case 'ERROR':
        return 'bg-alert-red';
      default:
        return 'bg-gray-500';
    }
  };

  const getStatusText = () => {
    switch (status.status) {
      case 'CONNECTED':
        return 'CONNECTED';
      case 'DISCONNECTED':
        return 'DISCONNECTED';
      case 'RECONNECTING':
        return 'RECONNECTING';
      case 'ERROR':
        return 'ERROR';
      default:
        return 'UNKNOWN';
    }
  };

  return (
    <div className="flex items-center space-x-2">
      <div className={`h-3 w-3 rounded-full ${getStatusColor()} ${status.status === 'CONNECTED' ? 'animate-pulse' : ''}`} />
      <Badge variant="outline" className="border-gray-600 text-white font-mono text-xs">
        {getStatusIcon()}
        <span className="ml-1">{getStatusText()}</span>
      </Badge>
      {status.reconnectAttempts > 0 && (
        <span className="text-xs text-gray-400 font-mono">
          {status.reconnectAttempts} reconnects
        </span>
      )}
      {status.status === 'ERROR' && onReconnect && (
        <button
          onClick={onReconnect}
          className="text-xs text-crypto-green hover:text-green-400 font-mono underline"
        >
          Retry
        </button>
      )}
    </div>
  );
}
