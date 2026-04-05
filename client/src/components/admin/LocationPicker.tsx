import { useRef, useEffect, useState, useCallback } from 'react'
import { useLoadScript, GoogleMap, MarkerF, Autocomplete } from '@react-google-maps/api'

const libraries: ('places')[] = ['places']
const mapContainerStyle = { width: '100%', height: '200px', borderRadius: '8px' }
const defaultCenter = { lat: 39.1911, lng: -106.8175 } // Aspen, CO

interface Props {
  location: string
  lat?: number
  lng?: number
  onChange: (location: string, lat: number, lng: number) => void
}

export default function LocationPicker({ location, lat, lng, onChange }: Props) {
  const { isLoaded } = useLoadScript({
    googleMapsApiKey: import.meta.env.VITE_GOOGLE_MAPS_API_KEY ?? '',
    libraries,
  })

  const autocompleteRef = useRef<google.maps.places.Autocomplete | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const [center, setCenter] = useState(
    lat && lng ? { lat, lng } : defaultCenter
  )
  const [markerPos, setMarkerPos] = useState(
    lat && lng ? { lat, lng } : null
  )

  useEffect(() => {
    if (lat && lng) {
      setCenter({ lat, lng })
      setMarkerPos({ lat, lng })
    }
  }, [lat, lng])

  const onLoad = useCallback((ac: google.maps.places.Autocomplete) => {
    autocompleteRef.current = ac
  }, [])

  const onPlaceChanged = () => {
    const place = autocompleteRef.current?.getPlace()
    if (place?.geometry?.location) {
      const newLat = place.geometry.location.lat()
      const newLng = place.geometry.location.lng()
      const name = place.formatted_address || place.name || ''
      setCenter({ lat: newLat, lng: newLng })
      setMarkerPos({ lat: newLat, lng: newLng })
      onChange(name, newLat, newLng)
    }
  }

  if (!isLoaded) {
    return (
      <div>
        <label className="text-[10px] text-slate-400 uppercase tracking-wider">Location</label>
        <input value={location} readOnly
          className="w-full mt-1 px-3 py-2 rounded-lg bg-white/5 border border-white/10
                     text-white text-sm opacity-50" placeholder="Loading maps..." />
      </div>
    )
  }

  return (
    <div>
      <label className="text-[10px] text-slate-400 uppercase tracking-wider">Location</label>
      <Autocomplete onLoad={onLoad} onPlaceChanged={onPlaceChanged}>
        <input
          ref={inputRef}
          defaultValue={location}
          placeholder="Search for a location..."
          className="w-full mt-1 px-3 py-2 rounded-lg bg-white/5 border border-white/10
                     text-white text-sm focus:outline-none focus:border-glacier"
        />
      </Autocomplete>
      <div className="mt-2 rounded-lg overflow-hidden border border-white/10">
        <GoogleMap
          mapContainerStyle={mapContainerStyle}
          center={center}
          zoom={markerPos ? 12 : 4}
          options={{
            disableDefaultUI: true,
            zoomControl: true,
            styles: [
              { elementType: 'geometry', stylers: [{ color: '#1d2c4d' }] },
              { elementType: 'labels.text.fill', stylers: [{ color: '#8ec3b9' }] },
              { elementType: 'labels.text.stroke', stylers: [{ color: '#1a3646' }] },
              { featureType: 'water', elementType: 'geometry.fill', stylers: [{ color: '#0e1626' }] },
            ],
          }}
        >
          {markerPos && <MarkerF position={markerPos} />}
        </GoogleMap>
      </div>
    </div>
  )
}
