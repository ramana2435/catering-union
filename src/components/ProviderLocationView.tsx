import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { getJobLocationSessions } from '../lib/database';

interface LocationSession {
  id: string;
  worker_id: string;
  latitude: number | null;
  longitude: number | null;
  last_updated_at: string;
  worker_profiles: {
    full_name: string;
    phone_number: string | null;
  } | null;
}

interface ProviderLocationViewProps {
  jobId: string;
  jobLocation?: {
    address?: string;
    latitude?: number;
    longitude?: number;
  };
}

export function ProviderLocationView({ jobId, jobLocation }: ProviderLocationViewProps) {
  const [sessions, setSessions] = useState<LocationSession[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadLocationSessions();

    // Subscribe to real-time updates
    const channel = supabase
      .channel(`location-sessions-${jobId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'location_sharing_sessions',
          filter: `job_id=eq.${jobId}`
        },
        () => {
          loadLocationSessions();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [jobId]);

  async function loadLocationSessions() {
    try {
      setLoading(true);
      setError(null);

      const data = await getJobLocationSessions(jobId);
      
      setSessions(data || []);
    } catch (err: any) {
      console.error('Error loading location sessions:', err);
      setError(err.message || 'Failed to load worker locations');
    } finally {
      setLoading(false);
    }
  }

  function getGoogleMapsUrl(lat: number, lng: number): string {
    return `https://www.google.com/maps?q=${lat},${lng}`;
  }

  function getDirectionsUrl(destLat: number, destLng: number): string {
    return `https://www.google.com/maps/dir/?api=1&destination=${destLat},${destLng}`;
  }

  function getJobLocationMapsUrl(): string | null {
    if (jobLocation?.latitude && jobLocation?.longitude) {
      return getGoogleMapsUrl(jobLocation.latitude, jobLocation.longitude);
    }
    if (jobLocation?.address) {
      return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(jobLocation.address)}`;
    }
    return null;
  }

  function formatTimeAgo(dateString: string): string {
    const date = new Date(dateString);
    const now = new Date();
    const seconds = Math.floor((now.getTime() - date.getTime()) / 1000);

    if (seconds < 60) return 'Just now';
    if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
    if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
    return `${Math.floor(seconds / 86400)}d ago`;
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-4 bg-red-50 rounded-lg">
        <p className="text-sm text-red-700">{error}</p>
      </div>
    );
  }

  const jobMapsUrl = getJobLocationMapsUrl();

  return (
    <div className="space-y-4">
      {/* Job Location */}
      {jobMapsUrl && (
        <div className="p-4 bg-blue-50 rounded-lg">
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <h3 className="text-sm font-medium text-gray-900 mb-1">
                Job Location
              </h3>
              {jobLocation?.address && (
                <p className="text-sm text-gray-600 mb-2">
                  {jobLocation.address}
                </p>
              )}
            </div>
            <a
              href={jobMapsUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center space-x-1 px-3 py-1.5 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700 transition-colors"
            >
              <span>📍 Open</span>
              <span>🔗</span>
            </a>
          </div>
        </div>
      )}

      {/* Worker Locations */}
      <div>
        <h3 className="text-sm font-medium text-gray-900 mb-3">
          Worker Locations
          {sessions.length > 0 && (
            <span className="ml-2 text-xs text-gray-500">
              ({sessions.length} sharing)
            </span>
          )}
        </h3>

        {sessions.length === 0 ? (
          <div className="p-6 bg-gray-50 rounded-lg text-center">
            <span className="text-4xl">📍</span>
            <p className="text-sm text-gray-600 mt-2">
              No workers are currently sharing their location
            </p>
            <p className="text-xs text-gray-500 mt-1">
              Workers can enable location sharing from their job details page
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {sessions.map((session) => {
              // Skip if no coordinates
              if (!session.latitude || !session.longitude) return null;

              return (
              <div
                key={session.worker_id}
                className="p-4 bg-white border border-gray-200 rounded-lg hover:border-blue-300 transition-colors"
              >
                <div className="flex items-start justify-between mb-3">
                  <div className="flex-1">
                    <h4 className="font-medium text-gray-900">
                      {session.worker_profiles?.full_name || 'Unknown Worker'}
                    </h4>
                    {session.worker_profiles?.phone_number && (
                      <p className="text-sm text-gray-500 mt-0.5">
                        {session.worker_profiles.phone_number}
                      </p>
                    )}
                  </div>
                  
                  <div className="flex items-center space-x-1 text-xs text-gray-500">
                    <span>🕐</span>
                    <span>{formatTimeAgo(session.last_updated_at)}</span>
                  </div>
                </div>

                <div className="flex items-center space-x-2">
                  <a
                    href={getGoogleMapsUrl(session.latitude, session.longitude)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex-1 flex items-center justify-center space-x-1 px-3 py-2 bg-gray-100 text-gray-700 text-sm rounded-lg hover:bg-gray-200 transition-colors"
                  >
                    <span>🗺️ View on Map</span>
                  </a>
                  
                  <a
                    href={getDirectionsUrl(session.latitude, session.longitude)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex-1 flex items-center justify-center space-x-1 px-3 py-2 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700 transition-colors"
                  >
                    <span>🧭 Directions</span>
                  </a>
                </div>

                <div className="mt-2 text-xs text-gray-400">
                  📍 {session.latitude.toFixed(6)}, {session.longitude.toFixed(6)}
                </div>
              </div>
            )
            })}
          </div>
        )}
      </div>

      <div className="p-3 bg-gray-50 rounded-lg">
        <p className="text-xs text-gray-600">
          💡 <strong>Tip:</strong> Click "Directions" to navigate to a worker's current location.
          Location updates in real-time while workers have sharing enabled.
        </p>
      </div>
    </div>
  );
}
