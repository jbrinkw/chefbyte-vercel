import { BrowserRouter, Routes, Route, Link, useLocation } from 'react-router-dom';
import { useState } from 'react';
import Scanner from './pages/Scanner';
import Home from './pages/Home';
import Walmart from './pages/Walmart';
import Recipes from './pages/Recipes';
import RecipeFinder from './pages/RecipeFinder';
import RecipeCreate from './pages/RecipeCreate';
import RecipeEdit from './pages/RecipeEdit';
import Inventory from './pages/Inventory';
import ShoppingList from './pages/ShoppingList';
import MealPlan from './pages/MealPlan';
import Login from './pages/Login';
import Signup from './pages/Signup';
import Settings from './pages/Settings';
import SupabaseTest from './pages/SupabaseTest';
import { AuthProvider, useAuth } from './contexts/AuthContext';

function AppContent() {
    const { user, signOut } = useAuth();
    const location = useLocation();
    const [drawerOpen, setDrawerOpen] = useState(false);

    // Show login/signup routes if not authenticated
    if (!user) {
        return (
            <Routes>
                <Route path="/login" element={<Login />} />
                <Route path="/signup" element={<Signup />} />
                <Route path="*" element={<Login />} />
            </Routes>
        );
    }

    const navLinks = [
        { to: '/', label: '📷 Scanner' },
        { to: '/home', label: '🏠 Home' },
        { to: '/inventory', label: '📦 Inventory' },
        { to: '/shopping-list', label: '🛒 Shopping' },
        { to: '/meal-plan', label: '📅 Meal Plan' },
        { to: '/recipes', label: '📖 Recipes' },
        { to: '/walmart', label: '🏪 Walmart' },
        { to: '/settings', label: '⚙️ Settings' },
    ];

    return (
        <>
            {/* Responsive Navigation Header */}
            <nav className="nav-bar container">
                <Link to="/home" className="nav-brand" onClick={() => setDrawerOpen(false)}>
                    <span style={{ fontSize: '22px' }}>🍳</span>
                    <span style={{ letterSpacing: '-0.4px' }}>ChefByte</span>
                </Link>

                <button className="nav-burger mobile-only" aria-label="Toggle navigation" onClick={() => setDrawerOpen(!drawerOpen)}>
                    ☰ Menu
                </button>

                <div className="nav-links desktop-only">
                    {navLinks.map(link => (
                        <Link
                            key={link.to}
                            to={link.to}
                            className={`nav-link ${location.pathname === link.to ? 'nav-link-active' : ''}`}
                        >
                            {link.label}
                        </Link>
                    ))}
                    <a
                        href="https://docs.chefbyte.app"
                        target="_blank"
                        rel="noreferrer"
                        className="nav-link nav-docs"
                    >
                        📘 User Guide
                    </a>
                    <div className="nav-divider" />
                    <button
                        onClick={signOut}
                        className="primary-btn"
                        style={{ background: '#ef4444' }}
                    >
                        Logout
                    </button>
                </div>
            </nav>

            {/* Mobile Drawer */}
            <div className={`container nav-drawer ${drawerOpen ? 'open' : ''}`}>
                {drawerOpen && (
                    <div className="stack">
                        {navLinks.map(link => (
                            <Link
                                key={link.to}
                                to={link.to}
                                className={`nav-link ${location.pathname === link.to ? 'nav-link-active' : ''}`}
                                onClick={() => setDrawerOpen(false)}
                            >
                                {link.label}
                            </Link>
                        ))}
                        <a
                            href="https://docs.chefbyte.app"
                            target="_blank"
                            rel="noreferrer"
                            className="nav-link nav-docs"
                            onClick={() => setDrawerOpen(false)}
                        >
                            📘 User Guide
                        </a>
                        <button
                            onClick={() => {
                                setDrawerOpen(false);
                                signOut();
                            }}
                            className="primary-btn"
                            style={{ background: '#ef4444' }}
                        >
                            Logout
                        </button>
                    </div>
                )}
            </div>

            {/* Routes */}
            <Routes>
                <Route path="/" element={<Scanner />} />
                <Route path="/scanner" element={<Scanner />} />
                <Route path="/home" element={<Home />} />
                <Route path="/inventory" element={<Inventory />} />
                <Route path="/shopping-list" element={<ShoppingList />} />
                <Route path="/meal-plan" element={<MealPlan />} />
                <Route path="/recipes" element={<Recipes />} />
                <Route path="/recipes/finder" element={<RecipeFinder />} />
                <Route path="/recipes/create" element={<RecipeCreate />} />
                <Route path="/recipes/edit/:id" element={<RecipeEdit />} />
                <Route path="/walmart" element={<Walmart />} />

                <Route path="/settings" element={<Settings />} />
                <Route path="/supabase-test" element={<SupabaseTest />} />
                <Route path="/login" element={<Login />} />
                <Route path="/signup" element={<Signup />} />
            </Routes>
        </>
    );
}

function App() {
    return (
        <BrowserRouter>
            <AuthProvider>
                <AppContent />
            </AuthProvider>
        </BrowserRouter>
    );
}

export default App;
