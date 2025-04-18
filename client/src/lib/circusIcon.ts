/**
 * Create a custom circus icon for Leaflet map
 * @param L - Leaflet library object
 * @param isActive - Whether the icon should use the active styling
 */
export function createCircusIcon(L: any, isActive: boolean = false) {
  return L.divIcon({
    html: `
      <div class="w-8 h-8 rounded-full ${isActive ? 'bg-primary scale-125 shadow-lg ' : 'bg-primary'} shadow-md flex items-center justify-center text-white font-semibold border-2 border-white transition-all duration-300">
        <span>SC</span>
        ${isActive ? '<span class="absolute top-0 right-0 w-3 h-3 bg-red-500 rounded-full border border-white animate-pulse"></span>' : ''}
      </div>
    `,
    className: 'custom-circus-icon',
    iconSize: [32, 32],
    iconAnchor: [16, 16],
    popupAnchor: [0, -16],
  });
}
