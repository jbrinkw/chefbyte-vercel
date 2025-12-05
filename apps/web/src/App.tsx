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

    return (
        <>
            {/* Navigation Header - always visible like original */}
            <div className="headerBar">
                <h1 id="pageTitle">ChefByte</h1>
                <div className="rightActions">
                    <Link to="/" className="actionBtn">Scanner</Link>
                    <Link to="/home" className="actionBtn">Home</Link>
                    <Link to="/inventory" className="actionBtn">Inventory</Link>
                    <Link to="/shopping-list" className="actionBtn">Shopping</Link>
                    <Link to="/meal-plan" className="actionBtn">Meal Plan</Link>
                    <Link to="/recipes" className="actionBtn">Recipes</Link>
                    <Link to="/walmart" className="actionBtn">Walmart</Link>

                    <Link to="/settings" className="actionBtn">Settings</Link>
                    <button
                        onClick={signOut}
                        className="actionBtn"
                        style={{
                            background: '#dc3545',
                            color: 'white',
                            border: 'none',
                            padding: '8px 16px',
                            borderRadius: '4px',
                            cursor: 'pointer',
                            marginLeft: '10px'
                        }}
                    >
                        Logout
                    </button>
                </div>
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
