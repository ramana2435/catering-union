import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { startLocationSharing, updateWorkerLocation, stopLocationSharing } from '../lib/database';

interface LocationSharingToggleProps {
  jobId: string;
  workerId: string;
  onError?: (error: string) => void;
}

export function LocationSharingToggle({ jobId, workerId, onError }: LocationSharingToggleProps) {
  const [isSharing, setIsSharing] = useState(false);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [watchId, setWatchId] = useState<number | null>(null);
  const [showConsentDialog, setShowConsentDialog] = useState(false);
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null);

  // Check current sharing status
  useEffect(() => {
    checkSharingStatus();
  }, [jobId, workerId]);

  // Cleanup watch on unmount
  useEffect(() => {
    return () => {
      if (watchId !== null) {
        navigator.geolocation.clearWatch(watchId);
      }
    };
  }, [watchId]);

  async function checkSharingStatus() {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('location_sharing_sessions')
        .select('id, sharing_enabled, expires_at')
        .eq('job_id', jobId)
        .eq('worker_id', workerId)
        .maybeSingle();

      if (error) throw error;

      if (data && data.sharing_enabled && data.expires_at) {
        const expiresAt = new Date(data.expires_at);
        if (expiresAt > new Date()) {
          setIsSharing(true);
          setSessionId(data.id);
          // Re-start the watch if we're still within valid session
          startGeolocationWatch(data.id);
        }
      }
    } catch (err) {
      console.error('Error checking sharing status:', err);
    } finally {
      setLoading(false);
    }
  }

  function handleToggleClick() {
    if (isSharing) {
      handleStopSharing();
    } else {
      setShowConsentDialog(true);
    }
  }

  async function handleStartSharing() {
    setShowConsentDialog(false);

    if (!navigator.geolocation) {
      const errorMsg = 'Geolocation is not supported by your browser';
      setError(errorMsg);
      onError?.(errorMsg);
      return;
    }

    try {
      setLoading(true);
      setError(null);

      // Create session in database (2 hour expiry)
      const session = await startLocationSharing(jobId, workerId, 120);
      if (!session) throw new Error('Failed to create location sharing session');

      setSessionId(session.id);

      // Start browser geolocation watch
      startGeolocationWatch(session.id);
      setIsSharing(true);
    } catch (err: any) {
      const errorMsg = err.message || 'Failed to start location sharing';
      setError(errorMsg);
      onError?.(errorMsg);
      setIsSharing(false);
    } finally {
      setLoading(false);
    }
  }

  function startGeolocationWatch(sessionIdToUse: string) {
    if (watchId !== null) {
      navigator.geolocation.clearWatch(watchId);
    }

    const id = navigator.geolocation.watchPosition(
      async (position) => {
        const { latitude, longitude } = position.coords;
        
        try {
          const updated = await updateWorkerLocation(sessionIdToUse, latitude, longitude);
          if (!updated) {
            console.error('Failed to update location');
          } else {
            setLastUpdate(new Date());
          }
        } catch (err) {
          console.error('Location update error:', err);
        }
      },
      (err) => {
        console.error('Geolocation error:', err);
        let errorMsg = 'Location error: ';
        
        switch (err.code) {
          case err.PERMISSION_DENIED:
            errorMsg += 'Location permission denied';
            break;
          case err.POSITION_UNAVAILABLE:
            errorMsg += 'Location unavailable';
            break;
          case err.TIMEOUT:
            errorMsg += 'Location request timed out';
            break;
          default:
            errorMsg += 'Unknown error';
        }
        
        setError(errorMsg);
        onError?.(errorMsg);
        handleStopSharing();
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 0
      }
    );

    setWatchId(id);
  }

  async function handleStopSharing() {
    if (!sessionId) return;

    try {
      setLoading(true);
      setError(null);

      // Stop geolocation watch
      if (watchId !== null) {
        navigator.geolocation.clearWatch(watchId);
        setWatchId(null);
      }

      // Stop session in database
      const success = await stopLocationSharing(sessionId);
      if (!success) throw new Error('Failed to stop location sharing');

      setIsSharing(false);
      setSessionId(null);
      setLastUpdate(null);
    } catch (err: any) {
      const errorMsg = err.message || 'Failed to stop location sharing';
      setError(errorMsg);
      onError?.(errorMsg);
    } finally {
      setLoading(false);
    }
  }

  if (loading && !isSharing) {
    return (
      <div className="flex items-center justify-center p-4">
        <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <span className="text-xl">
            {isSharing ? '📍' : '📍'}
          </span>
          <span className="text-sm font-medium text-gray-700">
            Location Sharing
          </span>
        </div>
        
        <button
          onClick={handleToggleClick}
          disabled={loading}
          className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
            isSharing
              ? 'bg-red-100 text-red-700 hover:bg-red-200'
              : 'bg-green-100 text-green-700 hover:bg-green-200'
          } disabled:opacity-50 disabled:cursor-not-allowed`}
        >
          {loading ? 'Processing...' : isSharing ? 'Stop Sharing' : 'Start Sharing'}
        </button>
      </div>

      {isSharing && lastUpdate && (
        <p className="text-xs text-gray-500">
          Last updated: {lastUpdate.toLocaleTimeString()}
        </p>
      )}

      {error && (
        <div className="flex items-start space-x-2 p-3 bg-red-50 rounded-lg">
          <span className="text-red-600">⚠️</span>
          <p className="text-sm text-red-700">{error}</p>
        </div>
      )}

      {isSharing && (
        <div className="p-3 bg-blue-50 rounded-lg">
          <p className="text-xs text-blue-700">
            📍 Your location is being shared with the provider while this screen is open.
            Close the app or stop sharing to end tracking.
          </p>
        </div>
      )}

      {/* Consent Dialog */}
      {showConsentDialog && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-md w-full p-6 space-y-4">
            <h3 className="text-lg font-semibold text-gray-900">
              Share Your Location?
            </h3>
            
            <div className="space-y-3 text-sm text-gray-600">
              <p>
                <strong>What happens when you share:</strong>
              </p>
              <ul className="list-disc list-inside space-y-1 ml-2">
                <li>Your browser will ask for location permission</li>
                <li>Your GPS location will be sent to the provider in real-time</li>
                <li>Sharing works only while this app is open</li>
                <li>You can stop sharing at any time</li>
                <li>Sharing automatically expires after 2 hours</li>
              </ul>
              
              <p className="pt-2">
                <strong>Privacy:</strong> We do not track your location in the background
                or store location history. Only the latest location is visible to the provider.
              </p>
            </div>

            <div className="flex space-x-3">
              <button
                onClick={() => setShowConsentDialog(false)}
                className="flex-1 px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={handleStartSharing}
                className="flex-1 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
              >
                Start Sharing
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
