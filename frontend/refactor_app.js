const fs = require('fs');

const path = 'c:\\Users\\aksha\\Desktop\\Smart Fuel\\frontend\\src\\App.tsx';
let content = fs.readFileSync(path, 'utf8');

// 1. Add import
content = content.replace(
  "import StationOwnerDashboard from './StationOwnerDashboard';",
  "import StationOwnerDashboard from './StationOwnerDashboard';\nimport CitizenDashboard from './CitizenDashboard';"
);

// 2. Replace App return
content = content.replace(
  `  if (user?.role === 'ADMIN') {
    return <AdminDashboard token={token} user={user} onLogout={handleLogout} />;
  }

  return (
    <div className="min-h-screen bg-gray-50 pb-20">
      <nav className="bg-white shadow-sm px-6 py-4 flex justify-between items-center sticky top-0 z-10">
        <div className="flex items-center space-x-2"><Fuel className="text-blue-600"/><span className="font-bold text-xl">Smart Fuel</span></div>
        <div className="flex items-center space-x-4">
          <span className="text-gray-600 text-sm font-medium bg-gray-100 px-3 py-1 rounded-full">{user?.role}</span>
          <span className="text-gray-600 font-semibold">{user?.name || user?.email}</span>
          <button onClick={handleLogout} className="text-sm font-medium text-red-600 hover:text-red-800">Logout</button>
        </div>
      </nav>
      {user?.role === 'STATION_OWNER' ? (
        <StationOwnerDashboard token={token} user={user} onLogout={handleLogout} />
      ) : (
        <UserDashboard token={token} />
      )}
    </div>
  );
}`,
  `  if (user?.role === 'ADMIN') {
    return <AdminDashboard token={token} user={user} onLogout={handleLogout} />;
  }
  if (user?.role === 'STATION_OWNER') {
    return <StationOwnerDashboard token={token} user={user} onLogout={handleLogout} />;
  }

  return <CitizenDashboard token={token} user={user} onLogout={handleLogout} />;
}`
);

// 3. Remove UserDashboard, UserVehicles, BookFuel, UserReservations
const userDashboardStart = content.indexOf('function UserDashboard(');
const landingPageStart = content.indexOf('function LandingPage(');

if (userDashboardStart !== -1 && landingPageStart !== -1) {
  content = content.substring(0, userDashboardStart) + content.substring(landingPageStart);
}

fs.writeFileSync(path, content, 'utf8');
console.log('App.tsx updated successfully');
