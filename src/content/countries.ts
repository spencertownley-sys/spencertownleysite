// Countries visited. `atlas` matches `properties.name` in world-atlas/countries-50m.json.
// `small` countries are too tiny to see as shapes at world scale, so they also get a marker.

export interface Country {
  name: string
  atlas: string
  region: Region
  lat: number
  lon: number
  small?: boolean
}

export type Region = 'North America' | 'Caribbean' | 'Central and South America' | 'Europe' | 'Africa' | 'Asia'

export const regions: Region[] = ['North America', 'Caribbean', 'Central and South America', 'Europe', 'Africa', 'Asia']

export const countries: Country[] = [
  { name: 'USA', atlas: 'United States of America', region: 'North America', lat: 39.8, lon: -98.6 },
  { name: 'Canada', atlas: 'Canada', region: 'North America', lat: 56.1, lon: -106.3 },
  { name: 'Mexico', atlas: 'Mexico', region: 'North America', lat: 23.6, lon: -102.5 },

  { name: 'Dominican Republic', atlas: 'Dominican Rep.', region: 'Caribbean', lat: 18.7, lon: -70.2, small: true },
  { name: 'The Bahamas', atlas: 'Bahamas', region: 'Caribbean', lat: 25.03, lon: -77.4, small: true },
  { name: 'Jamaica', atlas: 'Jamaica', region: 'Caribbean', lat: 18.1, lon: -77.3, small: true },
  { name: 'St. Vincent', atlas: 'St. Vin. and Gren.', region: 'Caribbean', lat: 13.25, lon: -61.2, small: true },
  { name: 'Aruba', atlas: 'Aruba', region: 'Caribbean', lat: 12.52, lon: -69.97, small: true },
  { name: 'Curaçao', atlas: 'Curaçao', region: 'Caribbean', lat: 12.17, lon: -68.99, small: true },

  { name: 'Panama', atlas: 'Panama', region: 'Central and South America', lat: 8.5, lon: -80.8, small: true },
  { name: 'Costa Rica', atlas: 'Costa Rica', region: 'Central and South America', lat: 9.75, lon: -83.75, small: true },
  { name: 'Colombia', atlas: 'Colombia', region: 'Central and South America', lat: 4.57, lon: -74.3 },

  { name: 'Italy', atlas: 'Italy', region: 'Europe', lat: 42.8, lon: 12.6 },
  { name: 'Vatican City', atlas: 'Vatican', region: 'Europe', lat: 41.9, lon: 12.45, small: true },
  { name: 'Croatia', atlas: 'Croatia', region: 'Europe', lat: 45.1, lon: 15.2, small: true },
  { name: 'Greece', atlas: 'Greece', region: 'Europe', lat: 39.1, lon: 21.8 },
  { name: 'Turkey', atlas: 'Turkey', region: 'Europe', lat: 39.0, lon: 35.2 },
  { name: 'Spain', atlas: 'Spain', region: 'Europe', lat: 40.5, lon: -3.7 },
  { name: 'Germany', atlas: 'Germany', region: 'Europe', lat: 51.2, lon: 10.4 },
  { name: 'Ireland', atlas: 'Ireland', region: 'Europe', lat: 53.4, lon: -8.2 },
  { name: 'Bosnia & Herzegovina', atlas: 'Bosnia and Herz.', region: 'Europe', lat: 43.9, lon: 17.7, small: true },
  { name: 'Switzerland', atlas: 'Switzerland', region: 'Europe', lat: 46.8, lon: 8.2, small: true },
  { name: 'Denmark', atlas: 'Denmark', region: 'Europe', lat: 56.0, lon: 9.5, small: true },
  { name: 'Norway', atlas: 'Norway', region: 'Europe', lat: 61.5, lon: 9.0 },
  { name: 'Sweden', atlas: 'Sweden', region: 'Europe', lat: 62.0, lon: 15.5 },
  { name: 'The Netherlands', atlas: 'Netherlands', region: 'Europe', lat: 52.1, lon: 5.3, small: true },
  { name: 'Austria', atlas: 'Austria', region: 'Europe', lat: 47.5, lon: 14.6, small: true },
  { name: 'Hungary', atlas: 'Hungary', region: 'Europe', lat: 47.2, lon: 19.5, small: true },
  { name: 'France', atlas: 'France', region: 'Europe', lat: 46.6, lon: 2.4 },
  { name: 'Monaco', atlas: 'Monaco', region: 'Europe', lat: 43.74, lon: 7.42, small: true },
  { name: 'Iceland', atlas: 'Iceland', region: 'Europe', lat: 64.96, lon: -19.0 },

  { name: 'Egypt', atlas: 'Egypt', region: 'Africa', lat: 26.8, lon: 30.8 },
  { name: 'Morocco', atlas: 'Morocco', region: 'Africa', lat: 31.8, lon: -7.1 },
  { name: 'South Africa', atlas: 'South Africa', region: 'Africa', lat: -30.6, lon: 22.9 },
  { name: 'Namibia', atlas: 'Namibia', region: 'Africa', lat: -22.96, lon: 18.49 },
  { name: 'Botswana', atlas: 'Botswana', region: 'Africa', lat: -22.3, lon: 24.7 },
  { name: 'Zimbabwe', atlas: 'Zimbabwe', region: 'Africa', lat: -19.0, lon: 29.15 },

  { name: 'Japan', atlas: 'Japan', region: 'Asia', lat: 36.2, lon: 138.3 },
  { name: 'Thailand', atlas: 'Thailand', region: 'Asia', lat: 15.9, lon: 100.99 },
  { name: 'Cambodia', atlas: 'Cambodia', region: 'Asia', lat: 12.6, lon: 104.99, small: true },
  { name: 'Vietnam', atlas: 'Vietnam', region: 'Asia', lat: 14.06, lon: 108.3 },
  { name: 'Singapore', atlas: 'Singapore', region: 'Asia', lat: 1.35, lon: 103.82, small: true },
  { name: 'Laos', atlas: 'Laos', region: 'Asia', lat: 19.86, lon: 102.5, small: true },
  { name: 'Philippines', atlas: 'Philippines', region: 'Asia', lat: 12.9, lon: 121.8 },
  { name: 'South Korea', atlas: 'South Korea', region: 'Asia', lat: 35.9, lon: 127.8, small: true },
  { name: 'Hong Kong', atlas: 'Hong Kong', region: 'Asia', lat: 22.32, lon: 114.17, small: true },
  { name: 'Malaysia', atlas: 'Malaysia', region: 'Asia', lat: 4.2, lon: 101.98 },
]
