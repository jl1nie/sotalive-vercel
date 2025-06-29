import React, { useEffect, useState } from 'react'
import { GeoJSON } from 'react-leaflet'
import L from 'leaflet'
import { useMapStore } from '@/stores/mapStore'
import type { GeoJsonObject, Feature } from 'geojson'

// TopoJSON processing utility
const processTopoJSON = async (url: string): Promise<GeoJsonObject | null> => {
  try {
    // Import topojson dynamically to avoid SSR issues
    const topojson = await import('topojson-client')
    
    const response = await fetch(url)
    const data = await response.json()
    
    // Convert TopoJSON to GeoJSON
    const geojson = topojson.feature(data, data.objects[Object.keys(data.objects)[0]])
    return geojson as GeoJsonObject
  } catch (error) {
    console.error('Failed to load TopoJSON:', error)
    return null
  }
}

const TopoJSONLayer: React.FC = () => {
  const [geoJsonData, setGeoJsonData] = useState<GeoJsonObject | null>(null)
  const { preferences } = useMapStore()

  useEffect(() => {
    if (preferences.display_area) {
      processTopoJSON('/json/jaffpota-annotated-v22.json')
        .then(setGeoJsonData)
        .catch(console.error)
    } else {
      setGeoJsonData(null)
    }
  }, [preferences.display_area])

  if (!geoJsonData) {
    return null
  }

  // Style function for park areas
  const getFeatureStyle = () => ({
    color: "#000",
    opacity: 1,
    weight: 1,
    fillColor: '#9fa8da',
    fillOpacity: 0.3
  })

  // Handle feature clicks
  const onEachFeature = (feature: Feature, layer: L.Layer) => {
    if (feature.properties) {
      layer.on({
        click: (e) => {
          const properties = feature.properties
          console.log('Park area clicked:', {
            pota: properties?.POTA,
            jaff: properties?.JAFF,
            name: properties?.NAME,
            position: e.latlng
          })
          
          // TODO: Implement popup display for park areas
          L.DomEvent.stopPropagation(e)
        },
        contextmenu: (e) => {
          const properties = feature.properties
          console.log('Park area right-clicked:', {
            pota: properties?.POTA,
            jaff: `${properties?.JAFF}(${properties?.PID},${properties?.UID})`,
            name: properties?.NAME,
            position: e.latlng
          })
          
          L.DomEvent.stopPropagation(e)
        }
      })
    }
  }

  return (
    <GeoJSON
      data={geoJsonData}
      style={getFeatureStyle}
      onEachFeature={onEachFeature}
    />
  )
}

export default TopoJSONLayer