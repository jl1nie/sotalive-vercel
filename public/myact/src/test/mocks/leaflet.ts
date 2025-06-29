import { vi } from 'vitest'

// Mock Leaflet for testing
export const mockLeaflet = {
  Map: vi.fn().mockImplementation(() => ({
    setView: vi.fn(),
    addLayer: vi.fn(),
    removeLayer: vi.fn(),
    on: vi.fn(),
    off: vi.fn(),
    getZoom: vi.fn(() => 10),
    getCenter: vi.fn(() => ({ lat: 35.6762, lng: 139.6503 })),
    getBounds: vi.fn(() => ({
      getNorth: vi.fn(() => 36),
      getSouth: vi.fn(() => 35),
      getEast: vi.fn(() => 140),
      getWest: vi.fn(() => 139),
    })),
    invalidateSize: vi.fn(),
    remove: vi.fn(),
  })),
  TileLayer: vi.fn().mockImplementation(() => ({
    addTo: vi.fn(),
    remove: vi.fn(),
  })),
  Marker: vi.fn().mockImplementation(() => ({
    addTo: vi.fn(),
    remove: vi.fn(),
    setLatLng: vi.fn(),
    getLatLng: vi.fn(() => ({ lat: 35.6762, lng: 139.6503 })),
    bindPopup: vi.fn(),
    openPopup: vi.fn(),
    closePopup: vi.fn(),
  })),
  CircleMarker: vi.fn().mockImplementation(() => ({
    addTo: vi.fn(),
    remove: vi.fn(),
    setLatLng: vi.fn(),
    setRadius: vi.fn(),
    bindPopup: vi.fn(),
  })),
  Popup: vi.fn().mockImplementation(() => ({
    setContent: vi.fn(),
    openOn: vi.fn(),
  })),
  Icon: vi.fn().mockImplementation(() => ({})),
  DivIcon: vi.fn().mockImplementation(() => ({})),
  LatLng: vi.fn().mockImplementation((lat: number, lng: number) => ({
    lat,
    lng,
    equals: vi.fn(),
    distanceTo: vi.fn(() => 1000),
  })),
  LatLngBounds: vi.fn().mockImplementation(() => ({
    extend: vi.fn(),
    contains: vi.fn(() => true),
    getNorth: vi.fn(() => 36),
    getSouth: vi.fn(() => 35),
    getEast: vi.fn(() => 140),
    getWest: vi.fn(() => 139),
  })),
  GeoJSON: vi.fn().mockImplementation(() => ({
    addTo: vi.fn(),
    remove: vi.fn(),
    eachLayer: vi.fn(),
  })),
  Control: {
    extend: vi.fn(),
  },
  control: {
    layers: vi.fn(() => ({
      addTo: vi.fn(),
      remove: vi.fn(),
    })),
    scale: vi.fn(() => ({
      addTo: vi.fn(),
      remove: vi.fn(),
    })),
  },
}

// Mock the leaflet module
vi.mock('leaflet', () => mockLeaflet)

// Mock react-leaflet components
vi.mock('react-leaflet', () => ({
  MapContainer: vi.fn(({ children }) => children),
  TileLayer: vi.fn(() => null),
  Marker: vi.fn(() => null),
  Popup: vi.fn(({ children }) => children),
  CircleMarker: vi.fn(() => null),
  GeoJSON: vi.fn(() => null),
  useMap: vi.fn(() => mockLeaflet.Map()),
  useMapEvents: vi.fn(() => {
    // Simulate map events for testing
    return mockLeaflet.Map()
  }),
}))

export default mockLeaflet