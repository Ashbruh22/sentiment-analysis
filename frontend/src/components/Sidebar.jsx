import { Link, useLocation } from 'react-router-dom';
import { FaChartBar, FaSearch, FaComments, FaCog } from 'react-icons/fa';

const Sidebar = () => {
  const location = useLocation();

  const menuItems = [
    { path: '/', icon: FaChartBar, label: 'Dashboard' },
    { path: '/analysis', icon: FaSearch, label: 'Analysis' },
    { path: '/reviews', icon: FaComments, label: 'Reviews' },
    { path: '/settings', icon: FaCog, label: 'Settings' }
  ];

  return (
    <div className="bg-gray-800 text-white w-64 min-h-screen p-4">
      <h1 className="text-xl font-bold mb-8">Sentiment Analysis</h1>
      <nav>
        <ul className="space-y-2">
          {menuItems.map(({ path, icon: Icon, label }) => (
            <li key={path}>
              <Link
                to={path}
                className={`flex items-center space-x-2 px-4 py-2 rounded hover:bg-gray-700 ${location.pathname === path ? 'bg-gray-700' : ''}`}
              >
                <Icon className="text-lg" />
                <span>{label}</span>
              </Link>
            </li>
          ))}
        </ul>
      </nav>
    </div>
  );
};

export default Sidebar;