/**
 * Create a custom circus icon for Leaflet map
 */
export function createCircusIcon(L: any) {
  return L.divIcon({
    html: `
      <div class="w-8 h-8 rounded-full bg-primary shadow-md flex items-center justify-center text-white font-semibold border-2 border-white">
        <span>SC</span>
      </div>
    `,
    className: 'custom-circus-icon',
    iconSize: [32, 32],
    iconAnchor: [16, 16],
    popupAnchor: [0, -16],
  });
}
