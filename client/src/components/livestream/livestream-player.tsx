import { useState, useRef, useEffect } from 'react';
import { MonitorPlay, ExternalLink } from 'lucide-react';
import { CelestialButton } from '@/components/ui/celestial-button';

/**
 * WebRTC Recording player component for ended livestreams
 * 
 * This component can play video recordings if they are available
 */
export function WebRTCRecordingPlayer({ recordingUrl, thumbnail }: { recordingUrl?: string; thumbnail?: string }) {
  // Check if there's a recording URL
  const hasRecording = Boolean(recordingUrl);
  
  return (
    <div className="w-full rounded-lg overflow-hidden bg-black relative">
      {hasRecording ? (
        <div className="w-full min-h-[300px]">
          <video
            src={recordingUrl}
            controls
            poster={thumbnail || '/images/livestream-placeholder.jpg'}
            className="w-full h-full object-cover"
          />
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center h-[300px] bg-muted/30 p-6">
          <ExternalLink className="h-12 w-12 text-muted-foreground mb-4" />
          <h3 className="text-xl font-semibold mb-2">Recording Unavailable</h3>
          <p className="text-center text-muted-foreground">
            This livestream recording is no longer available or has not been processed yet.
          </p>
        </div>
      )}
    </div>
  );
}

// For backward compatibility with existing code
export const LiveKitRecordingPlayer = WebRTCRecordingPlayer;
export const LiveKitPlayer = ({ roomName, token }: { roomName: string; token: string }) => {
  console.warn('LiveKitPlayer is deprecated. Use WebRTCLivestream instead.');
  return (
    <div className="w-full rounded-lg overflow-hidden bg-black relative">
      <div className="flex flex-col items-center justify-center h-[300px] bg-muted/30 p-6">
        <MonitorPlay className="h-12 w-12 text-muted-foreground mb-4" />
        <h3 className="text-xl font-semibold mb-2">Legacy Player</h3>
        <p className="text-center text-muted-foreground">
          This component is deprecated and will be removed soon.
        </p>
      </div>
    </div>
  );
}