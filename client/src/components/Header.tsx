import React from "react";

interface HeaderProps {
  isAdmin: boolean;
  toggleSidebar: () => void;
  currentView: "user" | "admin";
  switchToUserView: () => void;
  switchToAdminView: () => void;
}

const Header: React.FC<HeaderProps> = ({
  isAdmin,
  toggleSidebar,
  currentView,
  switchToUserView,
  switchToAdminView
}) => {
  const [currentDate, setCurrentDate] = React.useState<string>(
    new Date().toLocaleDateString("en-US", {
      month: "long",
      day: "numeric",
      year: "numeric"
    })
  );

  return (
    <header className="bg-white shadow-sm fixed top-0 left-0 right-0 z-10 lg:pl-64">
      <div className="flex items-center justify-between h-16 px-4 md:px-6">
        <div className="flex items-center">
          <button 
            className="text-gray-500 hover:text-gray-700 lg:hidden mr-2"
            onClick={toggleSidebar}
          >
            <i className="fas fa-bars text-xl"></i>
          </button>
          <div className="flex items-center">
            <div className="h-8 w-8 mr-2 rounded-md bg-primary flex items-center justify-center text-white">
              <span className="font-bold">SC</span>
            </div>
            <h1 className="text-xl font-semibold text-navy font-montserrat hidden sm:block">Europa SC Tracker</h1>
          </div>
        </div>
        <div className="flex items-center space-x-3">
          <span className="text-sm text-gray-600 hidden sm:block">{currentDate}</span>
          <div className="flex border border-gray-300 rounded-md overflow-hidden">
            <button 
              className={`px-3 py-1 text-sm ${currentView === "user" ? "bg-primary text-white" : "bg-white text-gray-700"}`}
              onClick={switchToUserView}
            >
              Map View
            </button>
            <button 
              className={`px-3 py-1 text-sm ${currentView === "admin" ? "bg-primary text-white" : "bg-white text-gray-700"}`}
              onClick={switchToAdminView}
            >
              Admin
            </button>
          </div>
        </div>
      </div>
    </header>
  );
};

export default Header;
