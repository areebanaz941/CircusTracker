import React from "react";
import { useQuery } from "@tanstack/react-query";
import { formatDate } from "@/lib/dateUtils";
import { CircusVenue } from "@shared/schema";

interface SidebarProps {
  isOpen: boolean;
  isAdmin: boolean;
  currentView: "user" | "admin";
}

const Sidebar: React.FC<SidebarProps> = ({ isOpen, isAdmin, currentView }) => {
  // Get current venues (grouped by location)
  const { data: venues } = useQuery<CircusVenue[]>({
    queryKey: ["/api/shows/venues"],
    enabled: currentView === "user",
  });

  // Get recent file uploads
  const { data: uploads } = useQuery<any[]>({
    queryKey: ["/api/uploads"],
    enabled: currentView === "admin" && isAdmin,
  });

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
            <div className="px-4 mb-6">
              <h2 className="text-xs uppercase font-semibold text-gray-400 tracking-wider">View Controls</h2>
              <nav className="mt-2 space-y-1">
                <a href="#" className="flex items-center px-4 py-2 text-white bg-primary-dark rounded-md group">
                  <i className="fas fa-map-marker-alt mr-3"></i>
                  <span>Map View</span>
                </a>
                <a href="#" className="flex items-center px-4 py-2 text-gray-300 hover:text-white hover:bg-navy-light rounded-md group">
                  <i className="fas fa-list mr-3"></i>
                  <span>Show List</span>
                </a>
                <a href="#" className="flex items-center px-4 py-2 text-gray-300 hover:text-white hover:bg-navy-light rounded-md group">
                  <i className="fas fa-filter mr-3"></i>
                  <span>Filter Shows</span>
                </a>
              </nav>
            </div>
            
            <div className="px-4">
              <h2 className="text-xs uppercase font-semibold text-gray-400 tracking-wider">Current Shows</h2>
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
                  <div className="text-gray-400 text-sm p-2">No current shows found</div>
                )}
              </div>
            </div>
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
