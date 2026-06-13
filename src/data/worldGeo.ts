import type { Feature, FeatureCollection, MultiPolygon, Polygon } from 'geojson'

const polygon = (name: string, coordinates: number[][][]): Feature<Polygon, { name: string }> => ({
  type: 'Feature',
  properties: { name },
  geometry: { type: 'Polygon', coordinates },
})

const multiPolygon = (name: string, coordinates: number[][][][]): Feature<MultiPolygon, { name: string }> => ({
  type: 'Feature',
  properties: { name },
  geometry: { type: 'MultiPolygon', coordinates },
})

export const worldGeo: FeatureCollection<Polygon | MultiPolygon, { name: string }> = {
  type: 'FeatureCollection',
  features: [
    polygon('北美洲', [[[-168, 14], [-154, 58], [-128, 72], [-88, 70], [-55, 52], [-68, 24], [-96, 16], [-122, 23], [-168, 14]]]),
    polygon('南美洲', [[[-82, 12], [-54, 8], [-36, -20], [-48, -56], [-70, -52], [-80, -18], [-82, 12]]]),
    polygon('歐洲', [[[-11, 36], [5, 58], [32, 70], [48, 52], [34, 36], [8, 35], [-11, 36]]]),
    polygon('非洲', [[[-18, 35], [36, 32], [52, 10], [42, -35], [16, -35], [-8, -20], [-18, 8], [-18, 35]]]),
    polygon('亞洲', [[[32, 5], [52, 36], [90, 55], [142, 52], [156, 22], [126, -8], [94, 8], [62, 4], [32, 5]]]),
    polygon('澳洲', [[[112, -10], [154, -13], [153, -39], [116, -44], [112, -10]]]),
    polygon('南極洲', [[[-180, -62], [-90, -70], [0, -66], [90, -70], [180, -62], [180, -88], [-180, -88], [-180, -62]]]),
    multiPolygon('主要島嶼', [
      [[[119.5, 21.8], [122.3, 22.6], [122.1, 25.6], [120.5, 25.5], [119.5, 21.8]]],
      [[[129, 31], [145, 34], [146, 44], [138, 45], [130, 36], [129, 31]]],
      [[[100, -1], [119, -5], [122, -9], [106, -7], [100, -1]]],
      [[[-8, 50], [2, 51], [1, 58], [-7, 57], [-8, 50]]],
      [[[167, -48], [178, -41], [174, -34], [166, -39], [167, -48]]],
    ]),
  ],
}
