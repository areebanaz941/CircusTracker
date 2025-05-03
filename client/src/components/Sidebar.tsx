import React, { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { formatDate } from "@/lib/dateUtils";
import { CircusVenue, CircusShowWithCoords } from "@shared/schema";

interface SidebarProps {
  isOpen: boolean;
  isAdmin: boolean;
  currentView: "user" | "admin";
  onCircusVisibilityChange?: (hiddenCircuses: string[]) => void;
}

const Sidebar: React.FC<SidebarProps> = ({ 
  isOpen, 
  isAdmin, 
  currentView,
  onCircusVisibilityChange 
}) => {
  const [activeTab, setActiveTab] = useState<'map' | 'list' | 'filter' | 'checklist'>('map');
  const [hiddenCircuses, setHiddenCircuses] = useState<string[]>([]);
  
  // Get current venues (grouped by location)
  const { data: venues } = useQuery<CircusVenue[]>({
    queryKey: ["/api/shows/venues"],
    enabled: currentView === "user",
  });

  // Get all shows
  const { data: allShows } = useQuery<CircusShowWithCoords[]>({
    queryKey: ["/api/shows"],
    enabled: currentView === "user",
  });

  // Get recent file uploads
  const { data: uploads } = useQuery<any[]>({
    queryKey: ["/api/uploads"],
    enabled: currentView === "admin" && isAdmin,
  });

  // Get unique circus names from all shows
  const uniqueCircusNames = React.useMemo(() => {
    if (!allShows) return [];
    const names = new Set(allShows.map(show => show.circusName));
    return Array.from(names).sort();
  }, [allShows]);

  // Handle checkbox changes
  const handleCircusToggle = (circusName: string) => {
    console.log('Toggling circus:', circusName);
    setHiddenCircuses(prev => {
      const newHiddenCircuses = prev.includes(circusName)
        ? prev.filter(name => name !== circusName)
        : [...prev, circusName];
      
      console.log('New hidden circuses:', newHiddenCircuses);
      
      // Notify parent component about visibility changes
      if (onCircusVisibilityChange) {
        console.log('Calling parent callback with:', newHiddenCircuses);
        onCircusVisibilityChange(newHiddenCircuses);
      } else {
        console.log('No callback function provided!');
      }
      
      return newHiddenCircuses;
    });
  };

  return (
    <aside 
      className={`fixed inset-y-0 left-0 w-64 bg-navy z-30 ${
        isOpen ? "block" : "hidden"
      } lg:block`}
    >
      <div className="h-full flex flex-col overflow-y-auto">
        <div className="flex items-center justify-center h-16 px-4 bg-navy-light">
          <div className="h-10 w-10 mr-2 rounded-md bg-primary flex items-center justify-center text-white">
            <span className="font-bold">SC</span>
          </div>
          <h1 className="text-xl font-bold text-white font-montserrat">Europa SC</h1>
        </div>
        
        {/* User View Navigation */}
        {currentView === "user" && (
          <div className="py-4 flex-1">
            <div className="px-4 mb-4">
              <h2 className="text-xs uppercase font-semibold text-gray-400 tracking-wider">View Controls</h2>
              <nav className="mt-2 space-y-1">
                <a 
                  href="#" 
                  className={`flex items-center px-4 py-2 rounded-md group ${activeTab === 'map' ? 'text-white bg-primary-dark' : 'text-gray-300 hover:text-white hover:bg-navy-light'}`}
                  onClick={() => setActiveTab('map')}
                >
                  <i className="fas fa-map-marker-alt mr-3"></i>
                  <span>Map View</span>
                </a>
                <a 
                  href="#" 
                  className={`flex items-center px-4 py-2 rounded-md group ${activeTab === 'list' ? 'text-white bg-primary-dark' : 'text-gray-300 hover:text-white hover:bg-navy-light'}`}
                  onClick={() => setActiveTab('list')}
                >
                  <i className="fas fa-list mr-3"></i>
                  <span>Show List</span>
                </a>
                <a 
                  href="#" 
                  className={`flex items-center px-4 py-2 rounded-md group ${activeTab === 'filter' ? 'text-white bg-primary-dark' : 'text-gray-300 hover:text-white hover:bg-navy-light'}`}
                  onClick={() => setActiveTab('filter')}
                >
                  <i className="fas fa-filter mr-3"></i>
                  <span>Filter Shows</span>
                </a>
                <a 
                  href="#" 
                  className={`flex items-center px-4 py-2 rounded-md group ${activeTab === 'checklist' ? 'text-white bg-primary-dark' : 'text-gray-300 hover:text-white hover:bg-navy-light'}`}
                  onClick={() => setActiveTab('checklist')}
                >
                  <i className="fas fa-check-square mr-3"></i>
                  <span>Show/Hide Circus</span>
                </a>
              </nav>
            </div>
            
            {/* Map View Content - Venue Locations */}
            {activeTab === 'map' && (
              <div className="px-4">
                <h2 className="text-xs uppercase font-semibold text-gray-400 tracking-wider">Current Venues</h2>
                <div className="mt-2 space-y-2">
                  {venues?.map(venue => (
                    <div key={venue.id} className="p-3 bg-navy-light rounded-md">
                      <div className="font-medium text-white">{venue.city}, {venue.state}</div>
                      <div className="text-sm text-gray-300">{venue.venueName}</div>
                      <div className="text-xs text-gray-400 mt-1">
                        {formatDate(new Date(venue.startDate))} - {formatDate(new Date(venue.endDate))}
                      </div>
                    </div>
                  ))}
                  {!venues?.length && (
                    <div className="text-gray-400 text-sm p-2">No current venues found</div>
                  )}
                </div>
              </div>
            )}
            
            {/* Show List Content - All Shows */}
            {activeTab === 'list' && (
              <div className="px-4">
                <h2 className="text-xs uppercase font-semibold text-gray-400 tracking-wider">All Shows</h2>
                <div className="mt-2 space-y-2 max-h-[calc(100vh-200px)] overflow-y-auto">
                  {allShows?.map(show => (
                    <div key={show.id} className="p-3 bg-navy-light rounded-md">
                      <div className="font-medium text-white">{show.circusName}</div>
                      <div className="text-sm text-gray-300">{show.venueName}</div>
                      <div className="text-sm text-gray-300">{show.city}, {show.state}</div>
                      <div className="text-xs text-gray-400 mt-1">
                        {formatDate(new Date(show.showDate))}
                      </div>
                    </div>
                  ))}
                  {!allShows?.length && (
                    <div className="text-gray-400 text-sm p-2">No shows found</div>
                  )}
                </div>
              </div>
            )}
            
            {/* Filter Content */}
            {activeTab === 'filter' && (
              <div className="px-4">
                <h2 className="text-xs uppercase font-semibold text-gray-400 tracking-wider">Filter Options</h2>
                <div className="mt-2 space-y-4 text-gray-300">
                  <div>
                    <label className="text-sm mb-1 block">Circus Name</label>
                    <input type="text" className="w-full px-3 py-2 bg-navy-light rounded border border-gray-700 text-white text-sm" placeholder="Enter circus name" />
                  </div>
                  
                  <div>
                    <label className="text-sm mb-1 block">City</label>
                    <input type="text" className="w-full px-3 py-2 bg-navy-light rounded border border-gray-700 text-white text-sm" placeholder="Enter city" />
                  </div>
                  
                  <div>
                    <label className="text-sm mb-1 block">State</label>
                    <input type="text" className="w-full px-3 py-2 bg-navy-light rounded border border-gray-700 text-white text-sm" placeholder="Enter state" />
                  </div>
                  
                  <button className="w-full py-2 text-sm bg-primary text-white rounded hover:bg-primary-dark transition-colors">
                    Apply Filters
                  </button>
                </div>
              </div>
            )}

            {/* Checklist Content - Show/Hide Circus */}
            {activeTab === 'checklist' && (
              <div className="px-4">
                <h2 className="text-xs uppercase font-semibold text-gray-400 tracking-wider mb-3">Show/Hide Circus</h2>
                <p className="text-xs text-gray-400 mb-4">Checked circuses will be hidden from the map</p>
                <div className="space-y-2 max-h-[calc(100vh-250px)] overflow-y-auto">
                  {uniqueCircusNames.map(circusName => (
                    <label key={circusName} className="flex items-center p-2 bg-navy-light rounded-md hover:bg-opacity-80 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={hiddenCircuses.includes(circusName)}
                        onChange={() => handleCircusToggle(circusName)}
                        className="form-checkbox h-4 w-4 text-primary rounded border-gray-600 bg-navy-light focus:ring-primary focus:ring-offset-0"
                      />
                      <span className="ml-3 text-sm text-white">{circusName}</span>
                    </label>
                  ))}
                  {uniqueCircusNames.length === 0 && (
                    <div className="text-gray-400 text-sm p-2">No circus names found</div>
                  )}
                </div>
                {hiddenCircuses.length > 0 && (
                  <div className="mt-4 p-2 bg-navy-light rounded-md">
                    <p className="text-xs text-gray-400">
                      {hiddenCircuses.length} circus{hiddenCircuses.length !== 1 ? 'es' : ''} hidden
                    </p>
                  </div>
                )}
              </div>
            )}
          </div>
        )}
        
        {/* Admin View Navigation */}
        {currentView === "admin" && isAdmin && (
          <div className="py-4 flex-1">
            <div className="px-4 mb-6">
              <h2 className="text-xs uppercase font-semibold text-gray-400 tracking-wider">Admin Controls</h2>
              <nav className="mt-2 space-y-1">
                <a href="#" className="flex items-center px-4 py-2 text-white bg-primary-dark rounded-md group">
                  <i className="fas fa-upload mr-3"></i>
                  <span>Upload Data</span>
                </a>
                <a href="#" className="flex items-center px-4 py-2 text-gray-300 hover:text-white hover:bg-navy-light rounded-md group">
                  <i className="fas fa-calendar-alt mr-3"></i>
                  <span>Manage Shows</span>
                </a>
                <a href="#" className="flex items-center px-4 py-2 text-gray-300 hover:text-white hover:bg-navy-light rounded-md group">
                  <i className="fas fa-cog mr-3"></i>
                  <span>Settings</span>
                </a>
              </nav>
            </div>
            
            <div className="px-4">
              <h2 className="text-xs uppercase font-semibold text-gray-400 tracking-wider">Recent Uploads</h2>
              <div className="mt-2 space-y-2">
                {uploads?.map((upload, index) => (
                  <div key={index} className="p-2 bg-navy-light rounded text-sm text-white">
                    <div className="flex items-center">
                      <i className="fas fa-file-excel text-green-500 mr-2"></i>
                      <span>{upload.fileName}</span>
                    </div>
                    <div className="text-xs text-gray-400 mt-1">
                      Uploaded: {formatDate(new Date(upload.uploadDate))}
                    </div>
                  </div>
                ))}
                {!uploads?.length && (
                  <div className="text-gray-400 text-sm p-2">No uploads yet</div>
                )}
              </div>
            </div>
          </div>
        )}
        
        <div className="p-4 mt-auto">
          <div className="text-xs text-gray-400 text-center">© 2023 Europa SC</div>
        </div>
      </div>
    </aside>
  );
};

export default Sidebar;