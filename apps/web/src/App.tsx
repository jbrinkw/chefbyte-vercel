import { BrowserRouter, Routes, Route, Link } from 'react-router-dom';
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

    const navLinkStyle = {
        color: '#4b5563',
        textDecoration: 'none',
        padding: '8px 14px',
        borderRadius: '6px',
        fontSize: '14px',
        fontWeight: 500,
        transition: 'all 0.2s ease',
        background: 'transparent',
        border: 'none',
        cursor: 'pointer',
    };

    return (
        <>
            {/* Light Mode Navigation Header */}
            <nav style={{
                background: '#fff',
                padding: '12px 24px',
                marginBottom: '16px',
                borderRadius: '12px',
                boxShadow: '0 2px 8px rgba(0,0,0,0.08)',
                border: '1px solid #e5e7eb',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
            }}>
                <Link to="/home" style={{ textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <span style={{ fontSize: '24px' }}>🍳</span>
                    <span style={{
                        fontSize: '22px',
                        fontWeight: 700,
                        color: '#1f2937',
                        letterSpacing: '-0.5px',
                    }}>ChefByte</span>
                </Link>

                <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                    <Link to="/" style={navLinkStyle}
                        onMouseOver={(e) => { e.currentTarget.style.background = '#f3f4f6'; }}
                        onMouseOut={(e) => { e.currentTarget.style.background = 'transparent'; }}>
                        📷 Scanner
                    </Link>
                    <Link to="/home" style={navLinkStyle}
                        onMouseOver={(e) => { e.currentTarget.style.background = '#f3f4f6'; }}
                        onMouseOut={(e) => { e.currentTarget.style.background = 'transparent'; }}>
                        🏠 Home
                    </Link>
                    <Link to="/inventory" style={navLinkStyle}
                        onMouseOver={(e) => { e.currentTarget.style.background = '#f3f4f6'; }}
                        onMouseOut={(e) => { e.currentTarget.style.background = 'transparent'; }}>
                        📦 Inventory
                    </Link>
                    <Link to="/shopping-list" style={navLinkStyle}
                        onMouseOver={(e) => { e.currentTarget.style.background = '#f3f4f6'; }}
                        onMouseOut={(e) => { e.currentTarget.style.background = 'transparent'; }}>
                        🛒 Shopping
                    </Link>
                    <Link to="/meal-plan" style={navLinkStyle}
                        onMouseOver={(e) => { e.currentTarget.style.background = '#f3f4f6'; }}
                        onMouseOut={(e) => { e.currentTarget.style.background = 'transparent'; }}>
                        📅 Meal Plan
                    </Link>
                    <Link to="/recipes" style={navLinkStyle}
                        onMouseOver={(e) => { e.currentTarget.style.background = '#f3f4f6'; }}
                        onMouseOut={(e) => { e.currentTarget.style.background = 'transparent'; }}>
                        📖 Recipes
                    </Link>
                    <Link to="/walmart" style={navLinkStyle}
                        onMouseOver={(e) => { e.currentTarget.style.background = '#f3f4f6'; }}
                        onMouseOut={(e) => { e.currentTarget.style.background = 'transparent'; }}>
                        🏪 Walmart
                    </Link>
                    <Link to="/settings" style={navLinkStyle}
                        onMouseOver={(e) => { e.currentTarget.style.background = '#f3f4f6'; }}
                        onMouseOut={(e) => { e.currentTarget.style.background = 'transparent'; }}>
                        ⚙️ Settings
                    </Link>

                    <a
                        href="https://docs.chefbyte.app"
                        target="_blank"
                        rel="noreferrer"
                        style={{
                            ...navLinkStyle,
                            color: '#2563eb',
                            border: '1px solid #dbeafe',
                            background: '#eff6ff',
                            padding: '8px 12px',
                        }}
                        onMouseOver={(e) => { e.currentTarget.style.background = '#e0ecff'; }}
                        onMouseOut={(e) => { e.currentTarget.style.background = '#eff6ff'; }}
                    >
                        📘 User Guide
                    </a>

                    <div style={{ width: '1px', height: '24px', background: '#e5e7eb', margin: '0 8px' }} />

                    <button
                        onClick={signOut}
                        style={{
                            background: '#ef4444',
                            color: 'white',
                            border: 'none',
                            padding: '8px 16px',
                            borderRadius: '6px',
                            cursor: 'pointer',
                            fontWeight: 600,
                            fontSize: '14px',
                            transition: 'all 0.2s ease',
                        }}
                        onMouseOver={(e) => { e.currentTarget.style.background = '#dc2626'; }}
                        onMouseOut={(e) => { e.currentTarget.style.background = '#ef4444'; }}
                    >
                        Logout
                    </button>
                </div>
            </nav>

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
