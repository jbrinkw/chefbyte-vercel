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
        color: 'rgba(255,255,255,0.85)',
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
            {/* Modern Navigation Header */}
            <nav style={{
                background: 'linear-gradient(135deg, #1a1a2e 0%, #16213e 100%)',
                padding: '12px 24px',
                marginBottom: '16px',
                borderRadius: '12px',
                boxShadow: '0 4px 20px rgba(0,0,0,0.15)',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
            }}>
                <Link to="/home" style={{ textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <span style={{ fontSize: '24px' }}>🍳</span>
                    <span style={{
                        fontSize: '22px',
                        fontWeight: 700,
                        background: 'linear-gradient(135deg, #e94560 0%, #ff6b6b 100%)',
                        WebkitBackgroundClip: 'text',
                        WebkitTextFillColor: 'transparent',
                        letterSpacing: '-0.5px',
                    }}>ChefByte</span>
                </Link>

                <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                    <Link to="/" style={navLinkStyle}
                        onMouseOver={(e) => { e.currentTarget.style.background = 'rgba(255,255,255,0.1)'; }}
                        onMouseOut={(e) => { e.currentTarget.style.background = 'transparent'; }}>
                        📷 Scanner
                    </Link>
                    <Link to="/home" style={navLinkStyle}
                        onMouseOver={(e) => { e.currentTarget.style.background = 'rgba(255,255,255,0.1)'; }}
                        onMouseOut={(e) => { e.currentTarget.style.background = 'transparent'; }}>
                        🏠 Home
                    </Link>
                    <Link to="/inventory" style={navLinkStyle}
                        onMouseOver={(e) => { e.currentTarget.style.background = 'rgba(255,255,255,0.1)'; }}
                        onMouseOut={(e) => { e.currentTarget.style.background = 'transparent'; }}>
                        📦 Inventory
                    </Link>
                    <Link to="/shopping-list" style={navLinkStyle}
                        onMouseOver={(e) => { e.currentTarget.style.background = 'rgba(255,255,255,0.1)'; }}
                        onMouseOut={(e) => { e.currentTarget.style.background = 'transparent'; }}>
                        🛒 Shopping
                    </Link>
                    <Link to="/meal-plan" style={navLinkStyle}
                        onMouseOver={(e) => { e.currentTarget.style.background = 'rgba(255,255,255,0.1)'; }}
                        onMouseOut={(e) => { e.currentTarget.style.background = 'transparent'; }}>
                        📅 Meal Plan
                    </Link>
                    <Link to="/recipes" style={navLinkStyle}
                        onMouseOver={(e) => { e.currentTarget.style.background = 'rgba(255,255,255,0.1)'; }}
                        onMouseOut={(e) => { e.currentTarget.style.background = 'transparent'; }}>
                        📖 Recipes
                    </Link>
                    <Link to="/walmart" style={navLinkStyle}
                        onMouseOver={(e) => { e.currentTarget.style.background = 'rgba(255,255,255,0.1)'; }}
                        onMouseOut={(e) => { e.currentTarget.style.background = 'transparent'; }}>
                        🏪 Walmart
                    </Link>
                    <Link to="/settings" style={navLinkStyle}
                        onMouseOver={(e) => { e.currentTarget.style.background = 'rgba(255,255,255,0.1)'; }}
                        onMouseOut={(e) => { e.currentTarget.style.background = 'transparent'; }}>
                        ⚙️ Settings
                    </Link>

                    <div style={{ width: '1px', height: '24px', background: 'rgba(255,255,255,0.2)', margin: '0 8px' }} />

                    <button
                        onClick={signOut}
                        style={{
                            background: 'linear-gradient(135deg, #e94560 0%, #c73e54 100%)',
                            color: 'white',
                            border: 'none',
                            padding: '8px 16px',
                            borderRadius: '6px',
                            cursor: 'pointer',
                            fontWeight: 600,
                            fontSize: '14px',
                            transition: 'all 0.2s ease',
                            boxShadow: '0 2px 8px rgba(233, 69, 96, 0.3)',
                        }}
                        onMouseOver={(e) => { e.currentTarget.style.transform = 'translateY(-1px)'; e.currentTarget.style.boxShadow = '0 4px 12px rgba(233, 69, 96, 0.4)'; }}
                        onMouseOut={(e) => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = '0 2px 8px rgba(233, 69, 96, 0.3)'; }}
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
