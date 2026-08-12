import React, { useEffect, useRef, useState } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { Question, Location, UserType } from '../types';
import { Language, t } from '../i18n';
import { MapPin, Undo2, Trash2, Check, X, Navigation } from 'lucide-react';

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
    <div className="relative isolate z-0 w-full h-64 sm:h-80 rounded-2xl overflow-hidden border-2 border-indigo-200 shadow-md">
      <div ref={mapRef} className="w-full h-full z-0" />
      <div className="absolute top-2 right-2 z-10 bg-white/90 backdrop-blur-md px-3 py-1.5 rounded-xl text-[10px] font-bold text-slate-700 shadow border border-slate-200">
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
    <div className="relative isolate z-0 w-full h-80 sm:h-96 rounded-3xl overflow-hidden border-4 border-white shadow-xl">
      <div ref={mapRef} className="w-full h-full z-0" />
      
      {/* Control buttons top right */}
      <div className="absolute top-3 right-3 z-10 flex flex-col gap-2">
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
      <div className="absolute bottom-3 left-3 right-3 z-10 bg-white/95 backdrop-blur-md p-2.5 rounded-2xl shadow-lg border border-slate-100 flex items-center justify-around text-[10px] font-black text-slate-600">
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

export interface InterpolatedPoint {
  lat: number;
  lng: number;
  index: number;
  distanceFromStartMeters: number;
}

export function interpolatePointsAlongPolyline(
  waypoints: Location[],
  count: number
): InterpolatedPoint[] {
  if (count <= 0 || waypoints.length === 0) return [];

  if (waypoints.length === 1) {
    return Array.from({ length: count }, (_, i) => ({
      lat: waypoints[0].lat,
      lng: waypoints[0].lng,
      index: i,
      distanceFromStartMeters: 0,
    }));
  }

  const segmentDistances: number[] = [];
  let totalDistance = 0;
  for (let k = 0; k < waypoints.length - 1; k++) {
    const d = calculateDistanceMeters(
      waypoints[k].lat,
      waypoints[k].lng,
      waypoints[k + 1].lat,
      waypoints[k + 1].lng
    );
    segmentDistances.push(d);
    totalDistance += d;
  }

  if (totalDistance === 0 || count === 1) {
    return Array.from({ length: count }, (_, i) => ({
      lat: waypoints[0].lat,
      lng: waypoints[0].lng,
      index: i,
      distanceFromStartMeters: 0,
    }));
  }

  const cumulativeDistances: number[] = [0];
  for (let k = 0; k < segmentDistances.length; k++) {
    cumulativeDistances.push(cumulativeDistances[k] + segmentDistances[k]);
  }

  const result: InterpolatedPoint[] = [];
  const step = totalDistance / (count - 1);

  for (let i = 0; i < count; i++) {
    const targetDist = i * step;

    let segIdx = 0;
    for (let k = 0; k < segmentDistances.length; k++) {
      if (
        targetDist >= cumulativeDistances[k] &&
        (targetDist <= cumulativeDistances[k + 1] || k === segmentDistances.length - 1)
      ) {
        segIdx = k;
        break;
      }
    }

    const segLen = segmentDistances[segIdx];
    const segStartDist = cumulativeDistances[segIdx];
    const fraction = segLen === 0 ? 0 : Math.min(1, Math.max(0, (targetDist - segStartDist) / segLen));

    const pStart = waypoints[segIdx];
    const pEnd = waypoints[segIdx + 1];

    const lat = pStart.lat + fraction * (pEnd.lat - pStart.lat);
    const lng = pStart.lng + fraction * (pEnd.lng - pStart.lng);

    result.push({
      lat,
      lng,
      index: i,
      distanceFromStartMeters: Math.round(targetDist),
    });
  }

  return result;
}

interface RouteGeoTagModalProps {
  isOpen: boolean;
  onClose: () => void;
  barnQuestions: Question[];
  vuxenQuestions: Question[];
  initialCategory?: UserType | 'both';
  userLocation: Location | null;
  lang: Language;
  onApplyGeoTags: (category: UserType | 'both', locations: Location[]) => void;
}

export const RouteGeoTagModal: React.FC<RouteGeoTagModalProps> = ({
  isOpen,
  onClose,
  barnQuestions,
  vuxenQuestions,
  initialCategory = 'barn',
  userLocation,
  lang,
  onApplyGeoTags,
}) => {
  const [selectedCategory, setSelectedCategory] = useState<UserType | 'both'>(initialCategory);
  const [waypoints, setWaypoints] = useState<Location[]>([]);

  const mapRef = useRef<HTMLDivElement>(null);
  const leafletMap = useRef<L.Map | null>(null);
  const polylineRef = useRef<L.Polyline | null>(null);
  const waypointMarkersRef = useRef<L.Marker[]>([]);
  const stationMarkersRef = useRef<L.Marker[]>([]);

  // Get active question list based on category
  const activeQuestions =
    selectedCategory === 'both'
      ? barnQuestions.length >= vuxenQuestions.length
        ? barnQuestions
        : vuxenQuestions
      : selectedCategory === 'barn'
      ? barnQuestions
      : vuxenQuestions;

  const questionsCount = activeQuestions.length;

  // Initialize waypoints from existing geotags if available and waypoints empty
  useEffect(() => {
    if (!isOpen) return;
    if (waypoints.length > 0) return;

    const existingLocations = activeQuestions
      .filter((q) => q.location)
      .map((q) => q.location!);

    if (existingLocations.length >= 2) {
      setWaypoints(existingLocations);
    }
  }, [isOpen, selectedCategory]);

  // Compute total trail distance
  let totalDistance = 0;
  for (let k = 0; k < waypoints.length - 1; k++) {
    totalDistance += calculateDistanceMeters(
      waypoints[k].lat,
      waypoints[k].lng,
      waypoints[k + 1].lat,
      waypoints[k + 1].lng
    );
  }

  const stepDistance = questionsCount > 1 && totalDistance > 0 ? Math.round(totalDistance / (questionsCount - 1)) : 0;

  // Custom icon for waypoints
  const waypointIcon = L.divIcon({
    className: 'custom-waypoint-pin',
    html: `<div style="
      width: 20px;
      height: 20px;
      background: #4f46e5;
      border: 3.5px solid #ffffff;
      border-radius: 50%;
      box-shadow: 0 0 12px rgba(79, 70, 229, 0.8);
      cursor: grab;
    "></div>`,
    iconSize: [20, 20],
    iconAnchor: [10, 10],
  });

  // Map Setup & Event Bindings
  useEffect(() => {
    if (!isOpen || !mapRef.current) return;

    if (!leafletMap.current) {
      const defaultCenter: [number, number] = userLocation
        ? [userLocation.lat, userLocation.lng]
        : waypoints[0]
        ? [waypoints[0].lat, waypoints[0].lng]
        : [59.3293, 18.0686];

      const map = L.map(mapRef.current).setView(defaultCenter, 15);

      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; OpenStreetMap',
        maxZoom: 19,
      }).addTo(map);

      leafletMap.current = map;

      // Click to add waypoint
      map.on('click', (e: L.LeafletMouseEvent) => {
        const { lat, lng } = e.latlng;
        setWaypoints((prev) => [...prev, { lat, lng }]);
      });

      setTimeout(() => {
        map.invalidateSize();
      }, 200);
    }

    return () => {
      if (leafletMap.current) {
        leafletMap.current.remove();
        leafletMap.current = null;
        polylineRef.current = null;
        waypointMarkersRef.current = [];
        stationMarkersRef.current = [];
      }
    };
  }, [isOpen]);

  // Redraw Polyline, Waypoint Markers & Interpolated Station Markers whenever waypoints or questions change
  useEffect(() => {
    const map = leafletMap.current;
    if (!map) return;

    // Remove existing items
    if (polylineRef.current) {
      polylineRef.current.remove();
      polylineRef.current = null;
    }
    waypointMarkersRef.current.forEach((m) => m.remove());
    waypointMarkersRef.current = [];

    stationMarkersRef.current.forEach((m) => m.remove());
    stationMarkersRef.current = [];

    if (waypoints.length === 0) return;

    // Draw Polyline
    const coords: [number, number][] = waypoints.map((w) => [w.lat, w.lng]);
    if (coords.length >= 2) {
      polylineRef.current = L.polyline(coords, {
        color: '#6366f1',
        weight: 6,
        opacity: 0.9,
        dashArray: '8, 8',
      }).addTo(map);
    }

    // Draw Waypoint Draggable Markers
    waypoints.forEach((wp, idx) => {
      const marker = L.marker([wp.lat, wp.lng], {
        icon: waypointIcon,
        draggable: true,
        zIndexOffset: 500,
      }).addTo(map);

      marker.on('drag', (e) => {
        const pos = e.target.getLatLng();
        setWaypoints((prev) => {
          const updated = [...prev];
          updated[idx] = { lat: pos.lat, lng: pos.lng };
          return updated;
        });
      });

      waypointMarkersRef.current.push(marker);
    });

    // Interpolate & Draw Station Markers
    if (waypoints.length >= 2 && questionsCount > 0) {
      const interpolated = interpolatePointsAlongPolyline(waypoints, questionsCount);

      interpolated.forEach((pt, idx) => {
        const q = activeQuestions[idx];
        const pinType =
          selectedCategory === 'both'
            ? 'unanswered-vuxen'
            : selectedCategory === 'barn'
            ? 'unanswered-barn'
            : 'unanswered-vuxen';

        const icon = createCustomIcon(pinType, `${idx + 1}`);

        const m = L.marker([pt.lat, pt.lng], { icon, zIndexOffset: 1000 }).addTo(map);

        const popupDiv = document.createElement('div');
        popupDiv.className = 'p-1 text-center';
        popupDiv.innerHTML = `
          <div style="font-weight:900; font-size:13px; color:#1e293b; margin-bottom:2px;">Station ${idx + 1}</div>
          <div style="font-size:12px; font-weight:600; color:#475569; margin-bottom:4px;">${q ? q.text : ''}</div>
          <div style="font-size:10px; color:#6366f1; font-weight:800;">📍 ${formatDistance(pt.distanceFromStartMeters)} från start</div>
        `;

        m.bindPopup(popupDiv);
        stationMarkersRef.current.push(m);
      });
    }
  }, [waypoints, selectedCategory, questionsCount]);

  if (!isOpen) return null;

  const handleApply = () => {
    if (waypoints.length < 2 || questionsCount === 0) return;

    const interpolated = interpolatePointsAlongPolyline(waypoints, questionsCount);
    const locations: Location[] = interpolated.map((pt, idx) => ({
      lat: pt.lat,
      lng: pt.lng,
      name: `Station ${idx + 1}`,
    }));

    onApplyGeoTags(selectedCategory, locations);
    onClose();
  };

  const handleUndo = () => {
    setWaypoints((prev) => prev.slice(0, prev.length - 1));
  };

  const handleClear = () => {
    setWaypoints([]);
  };

  const handleUseLocation = () => {
    if (userLocation) {
      setWaypoints((prev) => [...prev, { lat: userLocation.lat, lng: userLocation.lng }]);
      if (leafletMap.current) {
        leafletMap.current.setView([userLocation.lat, userLocation.lng], 16);
      }
    }
  };

  return (
    <div className="fixed inset-0 z-[9999] bg-slate-950 flex flex-col font-sans text-white animate-in fade-in duration-200">
      {/* Top Header Controls */}
      <div className="bg-slate-900 border-b border-slate-800 p-3 sm:p-4 flex flex-wrap items-center justify-between gap-3 shadow-xl">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white shadow-lg shadow-indigo-500/30">
            <MapPin className="w-5 h-5 text-yellow-300" />
          </div>
          <div>
            <h2 className="text-base sm:text-lg font-black tracking-tight flex items-center gap-2">
              <span>{t(lang, 'drawRouteTitle')}</span>
            </h2>
            <p className="text-[11px] text-slate-400 font-medium">
              {t(lang, 'drawHintStart')}
            </p>
          </div>
        </div>

        {/* Category Pill Switcher */}
        <div className="flex items-center gap-1.5 bg-slate-800/90 p-1 rounded-2xl border border-slate-700">
          <button
            onClick={() => setSelectedCategory('barn')}
            className={`px-3 py-1.5 rounded-xl text-xs font-black transition-all ${
              selectedCategory === 'barn'
                ? 'bg-amber-400 text-slate-950 shadow-md'
                : 'text-slate-300 hover:text-white'
            }`}
          >
            🧒 Barn ({barnQuestions.length})
          </button>
          <button
            onClick={() => setSelectedCategory('vuxen')}
            className={`px-3 py-1.5 rounded-xl text-xs font-black transition-all ${
              selectedCategory === 'vuxen'
                ? 'bg-pink-500 text-white shadow-md'
                : 'text-slate-300 hover:text-white'
            }`}
          >
            🧔 Vuxen ({vuxenQuestions.length})
          </button>
          <button
            onClick={() => setSelectedCategory('both')}
            className={`px-3 py-1.5 rounded-xl text-xs font-black transition-all ${
              selectedCategory === 'both'
                ? 'bg-indigo-600 text-white shadow-md'
                : 'text-slate-300 hover:text-white'
            }`}
          >
            👥 {t(lang, 'bothCategories')}
          </button>
        </div>

        {/* Close Modal */}
        <button
          onClick={onClose}
          className="w-9 h-9 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white flex items-center justify-center transition-all border border-slate-700 active:scale-95"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      {/* Sub-bar Stats & Quick Actions */}
      <div className="bg-slate-900/90 border-b border-slate-800/80 px-4 py-2.5 flex flex-wrap items-center justify-between gap-3 text-xs">
        {/* Live Trail Stats */}
        <div className="flex flex-wrap items-center gap-2 font-extrabold text-slate-300">
          <span className="bg-slate-800 px-2.5 py-1 rounded-lg border border-slate-700/60 flex items-center gap-1.5">
            📍 {t(lang, 'waypointsLabel')}: <strong className="text-white">{waypoints.length}</strong>
          </span>
          <span className="bg-slate-800 px-2.5 py-1 rounded-lg border border-slate-700/60 flex items-center gap-1.5">
            📏 {t(lang, 'trailLength')}: <strong className="text-indigo-400">{formatDistance(totalDistance)}</strong>
          </span>
          {waypoints.length >= 2 && stepDistance > 0 && (
            <span className="bg-slate-800 px-2.5 py-1 rounded-lg border border-slate-700/60 flex items-center gap-1.5">
              📐 {t(lang, 'stationDistance')}: <strong className="text-emerald-400">~{formatDistance(stepDistance)}</strong>
            </span>
          )}
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-2">
          {userLocation && (
            <button
              onClick={handleUseLocation}
              className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-indigo-300 font-extrabold rounded-xl border border-indigo-500/30 flex items-center gap-1.5 transition-all active:scale-95"
            >
              <Navigation className="w-3.5 h-3.5 text-indigo-400" />
              <span>{t(lang, 'useMyPositionBtn')}</span>
            </button>
          )}

          <button
            onClick={handleUndo}
            disabled={waypoints.length === 0}
            className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 disabled:opacity-40 text-slate-200 font-extrabold rounded-xl border border-slate-700 flex items-center gap-1.5 transition-all active:scale-95"
          >
            <Undo2 className="w-3.5 h-3.5" />
            <span>{t(lang, 'undoPointBtn')}</span>
          </button>

          <button
            onClick={handleClear}
            disabled={waypoints.length === 0}
            className="px-3 py-1.5 bg-slate-800 hover:bg-rose-950/80 hover:text-rose-300 disabled:opacity-40 text-slate-300 font-extrabold rounded-xl border border-slate-700 flex items-center gap-1.5 transition-all active:scale-95"
          >
            <Trash2 className="w-3.5 h-3.5" />
            <span>{t(lang, 'clearLineBtn')}</span>
          </button>

          <button
            onClick={handleApply}
            disabled={waypoints.length < 2 || questionsCount === 0}
            className="px-4 py-1.5 bg-emerald-500 hover:bg-emerald-400 disabled:opacity-40 text-slate-950 font-black rounded-xl shadow-lg shadow-emerald-500/20 flex items-center gap-2 transition-all active:scale-95 cursor-pointer"
          >
            <Check className="w-4 h-4" />
            <span>{t(lang, 'applyGeoTagsBtn', { count: questionsCount.toString() })}</span>
          </button>
        </div>
      </div>

      {/* Map Canvas */}
      <div className="relative isolate z-0 flex-1 w-full h-full">
        <div ref={mapRef} className="w-full h-full z-0 cursor-crosshair" />

        {/* Floating Instruction Banner */}
        <div className="absolute bottom-6 left-1/2 -translate-x-1/2 z-10 max-w-lg w-11/12 bg-slate-900/95 text-white px-5 py-3 rounded-2xl shadow-2xl border border-indigo-500/40 backdrop-blur-md text-xs font-extrabold text-center flex items-center justify-center gap-2">
          {waypoints.length < 2 ? (
            <span className="text-yellow-300 flex items-center gap-2">
              💡 {t(lang, 'drawHintStart')}
            </span>
          ) : (
            <span className="text-emerald-400 flex items-center gap-2">
              ✨ {t(lang, 'drawHintSuccess', { count: questionsCount.toString() })}
            </span>
          )}
        </div>
      </div>
    </div>
  );
};
