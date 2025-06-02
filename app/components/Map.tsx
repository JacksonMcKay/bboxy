import { useCallback, useEffect, useRef, useState } from 'react';
import {
  Map as MapGL,
  MapMouseEvent,
  MapRef,
  MapTouchEvent,
} from 'react-map-gl/mapbox';
import GithubIcon from './GithubIcon';
import GlobeIcon from './GlobeIcon';
import HandIcon from './HandIcon';
import MapIcon from './MapIcon';
import SquareIcon from './SquareIcon';
import { ToolButton } from './ToolButton';

const MAPBOX_TOKEN = process.env.NEXT_PUBLIC_MAPBOX_TOKEN || '';

// Default to Australia
const DEFAULT_VIEWPORT = {
  longitude: 135.509017,
  latitude: -26.237423,
  zoom: 3,
};

const FIT_BOUNDS_PADDING = 160;
const FIT_BOUNDS_ANIMATION_DURATION_MS = 150;

interface BoundingBox {
  start: [number, number] | null;
  end: [number, number] | null;
}

export default function Map() {
  const mapRef = useRef<MapRef | null>(null);

  const [activeTool, setActiveTool] = useState<'hand' | 'rectangle'>('hand');
  const [boundingBox, setBoundingBox] = useState<BoundingBox>({
    start: null,
    end: null,
  });
  const [isDrawing, setIsDrawing] = useState(false);
  const [fitToBoundsNextRender, setFitToBoundsNextRender] = useState(false);
  const [mapStyle, setMapStyle] = useState<'streets' | 'satellite'>('streets');

  // Parse bounding box from URL hash if it exists
  useEffect(() => {
    const handleHashChange = () => {
      const hash = window.location.hash.slice(1); // Remove the leading '#'
      if (hash) {
        const [lon1, lat1, lon2, lat2] = hash.split(',').map(Number);
        if (!isNaN(lon1) && !isNaN(lat1) && !isNaN(lon2) && !isNaN(lat2)) {
          setBoundingBox({
            start: [lon1, lat1],
            end: [lon2, lat2],
          });

          // Fit map to the bounding box
          setFitToBoundsNextRender(true);
        }
      }
    };

    // Initial check
    handleHashChange();
    window.addEventListener('hashchange', handleHashChange);

    return () => {
      window.removeEventListener('hashchange', handleHashChange);
    };
  }, []);

  // Format coordinate with up to 6 decimal places (no trailing zeros)
  const formatCoordinate = useCallback((coord: number): string => {
    return new Intl.NumberFormat('en-US', {
      minimumFractionDigits: 0,
      maximumFractionDigits: 6,
      useGrouping: false,
    }).format(coord);
  }, []);

  // Format a bounding box as a string, ensuring southwest point is first and northeast point is second
  const formatBoundingBox = useCallback(
    (
      start: [number, number] | null,
      end: [number, number] | null,
      options: {
        separator?: string;
        order?: 'latLon' | 'lonLat'; // Coordinate order in the output string
      } = {},
    ): string => {
      const { separator = ',', order = 'lonLat' } = options;

      if (!start || !end) return '';

      const [lon1, lat1] = start;
      const [lon2, lat2] = end;

      // Calculate the southwest (bottom-left) and northeast (top-right) points
      const minLon = Math.min(lon1, lon2);
      const minLat = Math.min(lat1, lat2);
      const maxLon = Math.max(lon1, lon2);
      const maxLat = Math.max(lat1, lat2);

      if (order === 'lonLat') {
        // Return as lon,lat,lon,lat (default)
        return [
          formatCoordinate(minLon),
          formatCoordinate(minLat),
          formatCoordinate(maxLon),
          formatCoordinate(maxLat),
        ].join(separator);
      } else {
        // Return as lat,lon,lat,lon
        return [
          formatCoordinate(minLat),
          formatCoordinate(minLon),
          formatCoordinate(maxLat),
          formatCoordinate(maxLon),
        ].join(separator);
      }
    },
    [formatCoordinate],
  );

  // Update URL hash with bounding box coordinates
  const updateURL = useCallback(
    (start: [number, number] | null, end: [number, number] | null) => {
      const bboxString = formatBoundingBox(start, end);

      // Update the URL hash without reloading the page
      const newUrl = `${window.location.pathname}${window.location.search}#${bboxString}`;

      window.history.pushState({ path: newUrl }, '', newUrl);
    },
    [formatBoundingBox],
  );

  const handleMouseDown = useCallback(
    (e: MapMouseEvent | MapTouchEvent) => {
      // Only start drawing if the rectangle tool is active
      if (activeTool !== 'rectangle') return;

      const { lng: lon, lat } = e.lngLat;
      setBoundingBox({
        start: [lon, lat],
        end: null,
      });
      setIsDrawing(true);
    },
    [activeTool],
  );

  const handleMouseMove = useCallback(
    (e: MapMouseEvent | MapTouchEvent) => {
      if (activeTool !== 'rectangle' || !isDrawing || !boundingBox.start)
        return;

      const { lng: lon, lat } = e.lngLat;
      setBoundingBox((prev) => ({
        ...prev,
        end: [lon, lat],
      }));
    },
    [activeTool, isDrawing, boundingBox.start],
  );

  const handleMouseUp = useCallback(
    (e: MapMouseEvent | MapTouchEvent) => {
      if (activeTool !== 'rectangle' || !isDrawing || !boundingBox.start)
        return;

      const { lng: lon, lat } = e.lngLat;
      const end: [number, number] = [lon, lat];
      let isBoundsEmpty = false;

      if (boundingBox.start[0] === end[0] && boundingBox.start[1] === end[1]) {
        // If the start and end are the same, the bounding box is empty
        isBoundsEmpty = true;
        setBoundingBox({
          start: null,
          end: null,
        });
      } else {
        setBoundingBox((prev) => ({
          start: prev.start,
          end,
        }));
      }
      setIsDrawing(false);
      setActiveTool('hand'); // Switch back to hand tool after drawing

      // Update URL with the new bounding box
      if (boundingBox.start && !isBoundsEmpty) {
        updateURL(boundingBox.start, end);
        setFitToBoundsNextRender(true);
      } else {
        updateURL(null, null);
      }
    },
    [activeTool, isDrawing, boundingBox.start, updateURL],
  );

  // Render the bounding box as a GeoJSON source and layer
  const renderBoundingBox = useCallback((box: BoundingBox) => {
    if (!box.start || !box.end) {
      // Remove the bounding box if there isn't one
      const map = mapRef.current?.getMap();
      if (map?.getSource('bbox-source')) {
        (map.getSource('bbox-source') as mapboxgl.GeoJSONSource).setData({
          type: 'FeatureCollection',
          features: [],
        });
      }
      return;
    }

    const [lon1, lat1] = box.start;
    const [lon2, lat2] = box.end;

    // Create coordinates for the bounding box polygon
    const coordinates = [
      [lon1, lat1],
      [lon2, lat1],
      [lon2, lat2],
      [lon1, lat2],
      [lon1, lat1],
    ];

    // Create GeoJSON feature
    const geojson: GeoJSON.Feature<GeoJSON.Polygon> = {
      type: 'Feature',
      geometry: {
        type: 'Polygon',
        coordinates: [coordinates],
      },
      properties: {},
    };

    // Add source and layer to the map
    if (mapRef.current) {
      const map = mapRef.current.getMap();

      // Add or update the source
      if (map.getSource('bbox-source')) {
        (map.getSource('bbox-source') as mapboxgl.GeoJSONSource).setData(
          geojson,
        );
      } else {
        map.addSource('bbox-source', {
          type: 'geojson',
          data: geojson,
        });

        // Add fill layer
        map.addLayer({
          id: 'bbox-fill',
          type: 'fill',
          source: 'bbox-source',
          paint: {
            'fill-color': '#0080ff',
            'fill-opacity': 0.2,
          },
        });

        // Add outline layer
        map.addLayer({
          id: 'bbox-outline',
          type: 'line',
          source: 'bbox-source',
          paint: {
            'line-color': '#0080ff',
            'line-width': 2,
          },
        });
      }
    }
  }, []);

  // Get the formatted bounding box string for display
  const getFormattedBoundingBox = useCallback(() => {
    return (
      formatBoundingBox(boundingBox.start, boundingBox.end) ||
      'No bounding box selected'
    );
  }, [boundingBox, formatBoundingBox]);

  // Add keyboard event listeners
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const noModifiers = !e.metaKey && !e.altKey && !e.ctrlKey && !e.shiftKey;
      if (e.key === 'r' && noModifiers) {
        e.preventDefault();
        setActiveTool('rectangle');
      } else if (e.key === 'h' && noModifiers) {
        e.preventDefault();
        setActiveTool('hand');
      } else if (e.key === 's' && noModifiers) {
        e.preventDefault();
        setMapStyle((prev) => (prev === 'streets' ? 'satellite' : 'streets'));
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, []);

  // Render bounding box when the map loads if it was populated from the URL
  const renderBoundingBoxIfExists = useCallback(() => {
    renderBoundingBox(boundingBox);
  }, [boundingBox, renderBoundingBox]);

  useEffect(() => {
    // Render bounding box during/after drawing it
    renderBoundingBoxIfExists();
  }, [boundingBox, renderBoundingBoxIfExists]);

  const fitToBoundsIfRequested = useCallback(() => {
    if (
      fitToBoundsNextRender &&
      mapRef.current &&
      boundingBox.start &&
      boundingBox.end
    ) {
      mapRef.current.fitBounds(
        [
          [
            Math.min(boundingBox.start[0], boundingBox.end[0]),
            Math.min(boundingBox.start[1], boundingBox.end[1]),
          ],
          [
            Math.max(boundingBox.start[0], boundingBox.end[0]),
            Math.max(boundingBox.start[1], boundingBox.end[1]),
          ],
        ],
        {
          padding: FIT_BOUNDS_PADDING,
          duration: FIT_BOUNDS_ANIMATION_DURATION_MS,
        },
      );
      setFitToBoundsNextRender(false);
    }
  }, [fitToBoundsNextRender, boundingBox]);

  return (
    <div className="relative h-full w-full overflow-hidden">
      <MapGL
        ref={mapRef}
        mapboxAccessToken={MAPBOX_TOKEN}
        initialViewState={DEFAULT_VIEWPORT}
        style={{ width: '100%', height: '100%' }}
        mapStyle={
          mapStyle === 'streets'
            ? 'mapbox://styles/mapbox/streets-v12'
            : 'mapbox://styles/mapbox/satellite-streets-v12'
        }
        onMouseDown={handleMouseDown}
        onTouchStart={handleMouseDown}
        onMouseMove={handleMouseMove}
        onTouchMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onTouchEnd={handleMouseUp}
        dragPan={activeTool === 'hand'}
        dragRotate={false}
        touchPitch={false}
        pitch={0}
        bearing={0}
        cursor={activeTool === 'rectangle' ? 'crosshair' : 'grab'}
        onLoad={renderBoundingBoxIfExists}
        onRender={fitToBoundsIfRequested}
      />
      <div className="pointer-events-none absolute inset-3 flex flex-col justify-between gap-3">
        <div className="flex items-start justify-between gap-3">
          {/* Instructions */}
          <div className="rounded bg-white p-2 shadow">
            <p className="text-sm">
              {activeTool === 'hand'
                ? 'Hand mode: Click and drag to move the map'
                : 'Rectangle mode: Click and drag to create a bounding box'}
            </p>
          </div>

          {/* Tool selector */}
          <div className="pointer-events-auto">
            <div className="flex flex-col gap-1 rounded-lg border border-gray-200 bg-white p-2 shadow-lg">
              <ToolButton
                isActive={activeTool === 'hand'}
                onClick={() => setActiveTool('hand')}
                tooltip="Hand tool (H)"
              >
                <HandIcon />
              </ToolButton>
              <ToolButton
                isActive={activeTool === 'rectangle'}
                onClick={() => setActiveTool('rectangle')}
                tooltip="Draw rectangle (R)"
              >
                <SquareIcon />
              </ToolButton>
              <hr className="my-1 h-[1px] border-0 bg-gray-200" />
              <ToolButton
                isActive={mapStyle === 'streets'}
                onClick={() => setMapStyle('streets')}
                tooltip={
                  mapStyle === 'streets' ? 'Streets view' : 'Streets view (S)'
                }
                variant="secondary"
              >
                <MapIcon />
              </ToolButton>
              <ToolButton
                isActive={mapStyle === 'satellite'}
                onClick={() => setMapStyle('satellite')}
                tooltip={
                  mapStyle === 'satellite'
                    ? 'Satellite view'
                    : 'Satellite view (S)'
                }
                variant="secondary"
              >
                <GlobeIcon />
              </ToolButton>
              <hr className="my-1 h-[1px] border-0 bg-gray-200" />
              <ToolButton
                href="https://github.com/JacksonMcKay/bboxy"
                tooltip="View on GitHub"
              >
                <GithubIcon />
              </ToolButton>
            </div>
          </div>
        </div>

        {/* Display bounding box coordinates */}
        <div className="pointer-events-auto self-start rounded bg-white p-2 shadow">
          <p className="font-mono text-sm">
            Bounding box: {getFormattedBoundingBox()}
          </p>
        </div>
      </div>
    </div>
  );
}
