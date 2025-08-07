import { useEffect, useRef, useState } from 'react';

export interface GeoJsonModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (bbox: [number, number, number, number]) => void;
}

const GeoJsonModal = ({ isOpen, onClose, onSubmit }: GeoJsonModalProps) => {
  const dialogRef = useRef<HTMLDialogElement>(null);

  // Open/close dialog based on isOpen prop
  useEffect(() => {
    if (!dialogRef.current) return;
    if (isOpen) dialogRef.current.showModal();
    else dialogRef.current.close();
  }, [isOpen]);

  const [input, setInput] = useState<string>('');
  const [error, setError] = useState<string>('');

  // Extract coordinates for bounding box calculation
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const extractCoords = (geometry: any): number[][][] => {
    if (!geometry) return [];
    switch (geometry.type) {
      case 'Point':
        return [[[geometry.coordinates[0], geometry.coordinates[1]]]];
      case 'MultiPoint':
      case 'LineString':
        return [
          geometry.coordinates.map((coord: number[]) => [coord[0], coord[1]]),
        ];
      case 'MultiLineString':
      case 'Polygon':
        return geometry.coordinates.map((ring: number[][]) =>
          ring.map((coord) => [coord[0], coord[1]]),
        );
      case 'MultiPolygon':
        return geometry.coordinates.flatMap((polygon: number[][][]) =>
          polygon.map((ring) => ring.map((coord) => [coord[0], coord[1]])),
        );
      default:
        return [];
    }
  };

  const calculateBoundingBox = (
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    geojson: any,
  ): [number, number, number, number] | null => {
    if (!geojson) return null;
    try {
      let coords: number[][][] = [];
      if (geojson.type === 'Feature') {
        coords = extractCoords(geojson.geometry);
      } else if (geojson.type === 'FeatureCollection') {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        geojson.features.forEach((f: any) =>
          coords.push(...extractCoords(f.geometry)),
        );
      } else if (geojson.type === 'GeometryCollection') {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        geojson.geometries.forEach((g: any) =>
          coords.push(...extractCoords(g)),
        );
      } else {
        coords = extractCoords(geojson);
      }
      if (coords.length === 0) return null;
      let minLng = Infinity,
        minLat = Infinity,
        maxLng = -Infinity,
        maxLat = -Infinity;
      coords.forEach((polygon) => {
        polygon.forEach((point) => {
          const [lng, lat] = point;
          minLng = Math.min(minLng, lng);
          minLat = Math.min(minLat, lat);
          maxLng = Math.max(maxLng, lng);
          maxLat = Math.max(maxLat, lat);
        });
      });
      return [minLng, minLat, maxLng, maxLat];
    } catch {
      return null;
    }
  };

  const handleSubmit = () => {
    setError('');
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let parsed: any;
    try {
      parsed = JSON.parse(input);
    } catch {
      setError('Invalid GeoJSON. Please check your input.');
      return;
    }
    const bbox = calculateBoundingBox(parsed);
    if (!bbox) {
      setError('Could not calculate bounds from the provided GeoJSON');
      return;
    }
    onSubmit(bbox);
    dialogRef.current?.close();
    setInput('');
  };

  return (
    <dialog
      ref={dialogRef}
      // @ts-expect-error -- closedby is a new attribute. `any` makes clicking outside the modal close it.
      closedby="any"
      className="m-auto rounded-lg bg-white p-6 shadow-xl backdrop:bg-[rgba(0,0,0,0.6)]"
      onKeyDown={(e) => e.stopPropagation()}
      onClose={() => {
        onClose();
        setInput('');
        setError('');
      }}
    >
      <h2 className="mb-4 text-xl font-bold">Import GeoJSON</h2>
      <p className="mb-4 text-sm text-gray-600">
        Paste your GeoJSON below to calculate a bounding box. The map will zoom
        to the bounds of your GeoJSON.
      </p>
      <textarea
        className="mb-4 h-64 w-full rounded border border-gray-300 p-2 font-mono text-sm"
        value={input}
        onKeyDown={(e) => e.stopPropagation()}
        onChange={(e) => setInput(e.target.value)}
        placeholder="Paste your GeoJSON here..."
        autoFocus
      />
      {error && (
        <div className="mb-4 rounded bg-red-100 p-2 text-sm text-red-700">
          {error}
        </div>
      )}
      <div className="flex justify-end gap-2">
        <button
          type="button"
          className="rounded bg-gray-200 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-300"
          onClick={onClose}
        >
          Cancel
        </button>
        <button
          type="button"
          className="rounded bg-blue-500 px-4 py-2 text-sm font-medium text-white hover:bg-blue-600"
          onClick={handleSubmit}
        >
          Import
        </button>
      </div>
    </dialog>
  );
};

export default GeoJsonModal;
