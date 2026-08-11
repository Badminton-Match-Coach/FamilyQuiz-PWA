import React, { useEffect, useRef } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { Question, Location } from '../types';

export function calculateDistanceMeters(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371e3; // metres
  const φ1 = (lat1 * Math.PI) / 180;
  const φ2 = (lat2 * Math.PI) / 180;
  const Δφ = ((lat2 - lat1) * Math.PI) / 180;
  const Δλ = ((lon2 - lon1) * Math.PI) / 180;

  const a =
    Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
    Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return Math.round(R * c);
}

export function formatDistance(meters: number): string {
  if (meters < 1000) {
    return `${meters} m`;
  }
  return `${(meters / 1000).toFixed(1)} km`;
}

// Custom DivIcons for crisp modern rendering without missing asset png bugs
const createCustomIcon = (type: 'user' | 'unanswered-barn' | 'unanswered-vuxen' | 'answered', label?: string) => {
  let bgColor = '#4f46e5'; // indigo
  let border = '#ffffff';
  let content = label || '';

  if (type === 'user') {
    return L.divIcon({
      className: 'custom-map-pin',
      html: `
        <div style="
          position: relative;
          width: 30px;
          height: 30px;
          background: #2563eb;
          border: 3px solid #ffffff;
          border-radius: 50%;
          box-shadow: 0 0 20px rgba(37, 99, 235, 0.9);
          display: flex;
          align-items: center;
          justify-content: center;
          color: white;
          font-weight: 900;
          font-size: 10px;
        ">
          DU
          <div style="
            position: absolute;
            top: -6px; left: -6px; right: -6px; bottom: -6px;
            border: 3px solid #60a5fa;
            border-radius: 50%;
            animation: pulse 1.5s infinite;
            opacity: 0.8;
          "></div>
        </div>
      `,
      iconSize: [30, 30],
      iconAnchor: [15, 15],
    });
  }

  if (type === 'answered') {
    bgColor = '#10b981'; // green
  } else if (type === 'unanswered-barn') {
    bgColor = '#f59e0b'; // amber
  } else if (type === 'unanswered-vuxen') {
    bgColor = '#ec4899'; // pink
  }

  return L.divIcon({
    className: 'custom-map-pin',
    html: `
      <div style="
        background: ${bgColor};
        color: white;
        width: 34px;
        height: 34px;
        border-radius: 50% 50% 50% 0;
        transform: rotate(-45deg);
        display: flex;
        align-items: center;
        justify-content: center;
        border: 2.5px solid ${border};
        box-shadow: 0 4px 12px rgba(0,0,0,0.3);
        font-weight: 900;
        font-size: 13px;
      ">
        <span style="transform: rotate(45deg); display: block;">${content}</span>
      </div>
    `,
    iconSize: [34, 34],
    iconAnchor: [17, 34],
    popupAnchor: [0, -34],
  });
};

interface AdminMapPickerProps {
  initialLocation?: Location;
  fallbackCenter?: Location | null;
  onSelectLocation: (loc: Location) => void;
  questionsWithLocations?: { q: Question; index: number; type: 'barn' | 'vuxen' }[];
  activeQuestionId?: string;
}

export const AdminMapPicker: React.FC<AdminMapPickerProps> = ({
  initialLocation,
  fallbackCenter,
  onSelectLocation,
  questionsWithLocations = [],
  activeQuestionId,
}) => {
  const mapRef = useRef<HTMLDivElement>(null);
  const leafletMap = useRef<L.Map | null>(null);
  const selectedMarker = useRef<L.Marker | null>(null);

  // Default center: initialLocation > fallbackCenter > Stockholm
  const defaultCenter: [number, number] = initialLocation
    ? [initialLocation.lat, initialLocation.lng]
    : fallbackCenter
    ? [fallbackCenter.lat, fallbackCenter.lng]
    : [59.3293, 18.0686];

  useEffect(() => {
    if (!mapRef.current) return;

    if (!leafletMap.current) {
      const map = L.map(mapRef.current).setView(defaultCenter, initialLocation || fallbackCenter ? 15 : 12);
      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; OpenStreetMap contributors',
        maxZoom: 19,
      }).addTo(map);

      leafletMap.current = map;

      // Click event to place/move marker
      map.on('click', (e: L.LeafletMouseEvent) => {
        const { lat, lng } = e.latlng;
        onSelectLocation({ lat, lng });
      });
    }

    return () => {
      if (leafletMap.current) {
        leafletMap.current.remove();
        leafletMap.current = null;
      }
    };
  }, []);

  // Update selected location marker
  useEffect(() => {
    const map = leafletMap.current;
    if (!map) return;

    if (initialLocation) {
      const latlng: [number, number] = [initialLocation.lat, initialLocation.lng];
      if (selectedMarker.current) {
        selectedMarker.current.setLatLng(latlng);
      } else {
        selectedMarker.current = L.marker(latlng, {
          icon: createCustomIcon('unanswered-barn', '🎯'),
          draggable: true,
        }).addTo(map);

        selectedMarker.current.on('dragend', (e) => {
          const marker = e.target;
          const pos = marker.getLatLng();
          onSelectLocation({ lat: pos.lat, lng: pos.lng });
        });
      }
      map.panTo(latlng);
    } else {
      if (selectedMarker.current) {
        selectedMarker.current.remove();
        selectedMarker.current = null;
      }
      if (fallbackCenter) {
        map.panTo([fallbackCenter.lat, fallbackCenter.lng]);
      }
    }
  }, [initialLocation, fallbackCenter]);

  // Display other questions on map as context
  useEffect(() => {
    const map = leafletMap.current;
    if (!map) return;

    const existingMarkers: L.Marker[] = [];

    questionsWithLocations.forEach(({ q, index, type }) => {
      if (q.id === activeQuestionId || !q.location) return;

      const icon = createCustomIcon(
        type === 'barn' ? 'unanswered-barn' : 'unanswered-vuxen',
        `${index + 1}`
      );

      const m = L.marker([q.location.lat, q.location.lng], { icon })
        .addTo(map)
        .bindPopup(`<b>${type === 'barn' ? 'Barn' : 'Vuxen'} #${index + 1}</b><br/>${q.text}`);

      existingMarkers.push(m);
    });

    return () => {
      existingMarkers.forEach((m) => m.remove());
    };
  }, [questionsWithLocations, activeQuestionId]);

  return (
    <div className="relative w-full h-64 sm:h-80 rounded-2xl overflow-hidden border-2 border-indigo-200 shadow-md">
      <div ref={mapRef} className="w-full h-full z-0" />
      <div className="absolute top-2 right-2 z-[1000] bg-white/90 backdrop-blur-md px-3 py-1.5 rounded-xl text-[10px] font-bold text-slate-700 shadow border border-slate-200">
        💡 Klicka på kartan för att placera nålen
      </div>
    </div>
  );
};

interface ParticipantMapProps {
  questions: { q: Question; index: number; isAnswered: boolean; isCorrect?: boolean }[];
  userType: 'barn' | 'vuxen';
  userLocation: Location | null;
  onSelectQuestion: (index: number) => void;
}

export const ParticipantMap: React.FC<ParticipantMapProps> = ({
  questions,
  userType,
  userLocation,
  onSelectQuestion,
}) => {
  const mapRef = useRef<HTMLDivElement>(null);
  const leafletMap = useRef<L.Map | null>(null);
  const userMarkerRef = useRef<L.Marker | null>(null);

  const geotagged = questions.filter((item) => item.q.location);

  // Function to fit bounds over all markers (user + stations)
  const fitAllBounds = () => {
    const map = leafletMap.current;
    if (!map) return;

    const allCoords: [number, number][] = [];
    if (userLocation) {
      allCoords.push([userLocation.lat, userLocation.lng]);
    }
    geotagged.forEach(({ q }) => {
      if (q.location) {
        allCoords.push([q.location.lat, q.location.lng]);
      }
    });

    if (allCoords.length === 1) {
      map.setView(allCoords[0], 16);
    } else if (allCoords.length > 1) {
      const bounds = L.latLngBounds(allCoords);
      if (bounds.isValid()) {
        map.fitBounds(bounds, { padding: [45, 45], maxZoom: 16 });
      }
    }
  };

  // Initialize Map
  useEffect(() => {
    if (!mapRef.current) return;

    if (!leafletMap.current) {
      const defaultLat = userLocation?.lat || geotagged[0]?.q.location?.lat || 59.3293;
      const defaultLng = userLocation?.lng || geotagged[0]?.q.location?.lng || 18.0686;

      const map = L.map(mapRef.current).setView([defaultLat, defaultLng], 15);

      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; OpenStreetMap',
        maxZoom: 19,
      }).addTo(map);

      leafletMap.current = map;

      // Invalidate size after layout completes
      setTimeout(() => {
        map.invalidateSize();
        fitAllBounds();
      }, 200);
    }

    return () => {
      if (leafletMap.current) {
        leafletMap.current.remove();
        leafletMap.current = null;
        userMarkerRef.current = null;
      }
    };
  }, []);

  // Update user position marker & invalidate size when container updates
  useEffect(() => {
    const map = leafletMap.current;
    if (!map) return;

    map.invalidateSize();

    if (userLocation) {
      const userLatLng: [number, number] = [userLocation.lat, userLocation.lng];
      if (userMarkerRef.current) {
        userMarkerRef.current.setLatLng(userLatLng);
      } else {
        userMarkerRef.current = L.marker(userLatLng, {
          icon: createCustomIcon('user'),
          zIndexOffset: 1000,
        })
          .addTo(map)
          .bindPopup('<b>Du är här! 📍</b>');
      }
    } else if (userMarkerRef.current) {
      userMarkerRef.current.remove();
      userMarkerRef.current = null;
    }
  }, [userLocation]);

  // Render question pins & calculate viewport bounds
  useEffect(() => {
    const map = leafletMap.current;
    if (!map) return;

    const markers: L.Marker[] = [];
    const MAX_UNLOCK_DISTANCE = 35; // meters

    geotagged.forEach(({ q, index, isAnswered }) => {
      if (!q.location) return;

      const latlng: [number, number] = [q.location.lat, q.location.lng];

      let dist: number | null = null;
      if (userLocation) {
        dist = calculateDistanceMeters(
          userLocation.lat,
          userLocation.lng,
          q.location.lat,
          q.location.lng
        );
      }

      const isUnlocked = isAnswered || (dist !== null && dist <= MAX_UNLOCK_DISTANCE);

      const typeKey = isAnswered
        ? 'answered'
        : userType === 'barn'
        ? 'unanswered-barn'
        : 'unanswered-vuxen';

      const icon = createCustomIcon(typeKey, isAnswered ? '✓' : `${index + 1}`);

      const marker = L.marker(latlng, { icon }).addTo(map);

      let statusHtml = '';
      let distHtml = '';

      if (isAnswered) {
        statusHtml = `<span style="color:#10b981; font-weight:bold;">Besvarad ✓</span>`;
      } else if (isUnlocked) {
        statusHtml = `<span style="color:#10b981; font-weight:bold;">🟢 Upplåst - Du är nära!</span>`;
      } else if (!userLocation) {
        statusHtml = `<span style="color:#ef4444; font-weight:bold;">🔒 Låst (Slå på GPS)</span>`;
      } else {
        statusHtml = `<span style="color:#ef4444; font-weight:bold;">🔒 För långt bort</span>`;
      }

      if (dist !== null) {
        const colorClass = isUnlocked ? '#10b981' : '#ef4444';
        distHtml = `<div style="font-size:11px; color:${colorClass}; font-weight:bold; margin-bottom:6px;">📍 ${formatDistance(dist)} från dig ${isUnlocked ? '(Inom räckhåll)' : '(Gå inom 35m)'}</div>`;
      } else {
        distHtml = `<div style="font-size:11px; color:#ef4444; font-weight:bold; margin-bottom:6px;">📍 Kräver GPS-position</div>`;
      }

      const popupContent = document.createElement('div');
      popupContent.className = 'text-center p-1';
      popupContent.innerHTML = `
        <div style="font-size:11px; margin-bottom:2px;">${statusHtml}</div>
        <div style="font-weight:bold; font-size:13px; margin-bottom:4px; line-height:1.2;">Fråga ${index + 1}: ${q.text}</div>
        ${distHtml}
      `;

      const btn = document.createElement('button');
      if (isAnswered) {
        btn.className = 'px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-lg w-full shadow';
        btn.innerText = 'Visa fråga ✓';
      } else if (isUnlocked) {
        btn.className = 'px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs rounded-lg w-full shadow';
        btn.innerText = 'Svara på fråga 🎯';
      } else {
        btn.className = 'px-3 py-1.5 bg-amber-500 hover:bg-amber-600 text-white font-bold text-xs rounded-lg w-full shadow flex items-center justify-center gap-1';
        btn.innerText = '🔒 Gå närmare för att öppna';
      }

      btn.onclick = () => {
        onSelectQuestion(index);
      };
      popupContent.appendChild(btn);

      marker.bindPopup(popupContent);
      markers.push(marker);
    });

    fitAllBounds();

    return () => {
      markers.forEach((m) => m.remove());
    };
  }, [questions, userType, userLocation]);

  return (
    <div className="relative w-full h-80 sm:h-96 rounded-3xl overflow-hidden border-4 border-white shadow-xl">
      <div ref={mapRef} className="w-full h-full z-0" />
      
      {/* Control buttons top right */}
      <div className="absolute top-3 right-3 z-[1000] flex flex-col gap-2">
        <button
          onClick={fitAllBounds}
          className="bg-white/95 hover:bg-white text-indigo-700 px-3 py-1.5 rounded-xl text-xs font-black shadow-lg border border-indigo-100 flex items-center gap-1.5 active:scale-95 transition-all"
        >
          🗺️ Visa alla stationer
        </button>
        {userLocation && (
          <button
            onClick={() => {
              if (leafletMap.current && userLocation) {
                leafletMap.current.setView([userLocation.lat, userLocation.lng], 17);
              }
            }}
            className="bg-white/95 hover:bg-white text-indigo-600 px-3 py-1.5 rounded-xl text-xs font-black shadow-lg border border-indigo-100 flex items-center gap-1.5 active:scale-95 transition-all"
          >
            📍 Min position
          </button>
        )}
      </div>

      {/* Legend overlay */}
      <div className="absolute bottom-3 left-3 right-3 z-[1000] bg-white/95 backdrop-blur-md p-2.5 rounded-2xl shadow-lg border border-slate-100 flex items-center justify-around text-[10px] font-black text-slate-600">
        <div className="flex items-center gap-1.5">
          <span className="w-3.5 h-3.5 rounded-full bg-blue-600 border-2 border-white ring-2 ring-blue-300 animate-pulse flex items-center justify-center text-[7px] text-white font-black">
            DU
          </span>
          <span>Min position</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className={`w-3 h-3 rounded-full ${userType === 'barn' ? 'bg-amber-500' : 'bg-pink-500'}`} />
          <span>Ej svarad</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="w-3 h-3 rounded-full bg-emerald-500" />
          <span>Svarad ✓</span>
        </div>
      </div>
    </div>
  );
};
