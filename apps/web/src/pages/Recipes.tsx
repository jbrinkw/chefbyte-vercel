import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { apiSupabase } from '../lib/api-supabase';

interface Recipe {
    id: number;
    name: string;
    description: string | null;
    base_servings: number;
    calories: number | null;
    carbs: number | null;
    fat: number | null;
    protein: number | null;
    active_time: number | null;
    total_time: number | null;
}

export default function Recipes() {
    const [recipes, setRecipes] = useState<Recipe[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        apiSupabase.getRecipes()
            .then(data => {
                setRecipes(data || []);
            })
            .catch(err => console.error('Error loading recipes:', err))
            .finally(() => setLoading(false));
    }, []);

    return (
        <div className="recipesPage">
            <div className="recipesHeader">
                <h1>Recipes</h1>
                <div className="headerActions">
                    <Link to="/recipes/finder" className="actionBtn finderBtn">
                        Recipe Finder
                    </Link>
                    <Link to="/recipes/create" className="actionBtn createBtn">
                        + New Recipe
                    </Link>
                </div>
            </div>

            <div className="recipesList">
                {loading && <p>Loading recipes...</p>}
                {!loading && recipes.length === 0 && (
                    <div className="emptyState">
                        <p>No recipes yet.</p>
                        <p>Click "New Recipe" to create your first recipe!</p>
                    </div>
                )}
                {recipes.map(recipe => (
                    <Link key={recipe.id} to={`/recipes/edit/${recipe.id}`} className="recipeListItem">
                        <div className="recipeInfo">
                            <h3 className="recipeName">{recipe.name}</h3>
                            {recipe.description && (
                                <p className="recipeDescription">{recipe.description}</p>
                            )}
                            <div className="recipeMeta">
                                <span>{recipe.base_servings} serving{recipe.base_servings !== 1 ? 's' : ''}</span>
                                {recipe.total_time && <span>{recipe.total_time} min</span>}
                            </div>
                        </div>
                        <div className="recipeMacros">
                            <div className="macroItem">
                                <span className="value">{Math.round(Number(recipe.calories) || 0)}</span>
                                <span className="label">Cal</span>
                            </div>
                            <div className="macroItem">
                                <span className="value">{Math.round(Number(recipe.carbs) || 0)}g</span>
                                <span className="label">C</span>
                            </div>
                            <div className="macroItem">
                                <span className="value">{Math.round(Number(recipe.protein) || 0)}g</span>
                                <span className="label">P</span>
                            </div>
                            <div className="macroItem">
                                <span className="value">{Math.round(Number(recipe.fat) || 0)}g</span>
                                <span className="label">F</span>
                            </div>
                        </div>
                    </Link>
                ))}
            </div>
        </div>
    );
}
