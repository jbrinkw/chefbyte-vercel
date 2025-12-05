import { useState, useEffect } from 'react';
import { apiSupabase } from '../lib/api-supabase';

export default function RecipeFinder() {
    const [filters, setFilters] = useState({
        canBeMade: false,
        carbsMin: 0,
        proteinMin: 0,
        activeTimeMax: 45,
        totalTimeMax: 45,
    });
    const [recipes, setRecipes] = useState<any[]>([]);
    const [loading, setLoading] = useState(false);

    const searchRecipes = async () => {
        setLoading(true);
        try {
            // Get all recipes and filter client-side for now
            // (Complex filtering would need a dedicated API method)
            const allRecipes = await apiSupabase.getRecipes();

            // Apply client-side filters
            let filtered = allRecipes || [];

            // Filter by active time
            if (filters.activeTimeMax > 0) {
                filtered = filtered.filter((r: any) =>
                    !r.active_time || r.active_time <= filters.activeTimeMax
                );
            }

            // Filter by total time
            if (filters.totalTimeMax > 0) {
                filtered = filtered.filter((r: any) =>
                    !r.total_time || r.total_time <= filters.totalTimeMax
                );
            }

            setRecipes(filtered);
        } catch (error) {
            console.error('Error loading recipes:', error);
            setRecipes([]);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        searchRecipes();
    }, []);

    return (
        <div className="recipesView">
            <div className="filtersCard">
                <h3>Recipe Finder</h3>

                <div className="filterRow">
                    <label>
                        <input
                            type="checkbox"
                            checked={filters.canBeMade}
                            onChange={(e) => setFilters({ ...filters, canBeMade: e.target.checked })}
                        />
                        {' '}Can be made now
                    </label>
                </div>

                <div className="filterRow">
                    <label>Carbs Percentile (Top %)</label>
                    <div className="sliderControl">
                        <input
                            type="range"
                            min="0"
                            max="100"
                            value={filters.carbsMin}
                            step="10"
                            onChange={(e) => setFilters({ ...filters, carbsMin: Number(e.target.value) })}
                        />
                        <span className="sliderValue">{filters.carbsMin}%</span>
                    </div>
                </div>

                <div className="filterRow">
                    <label>Protein Percentile (Top %)</label>
                    <div className="sliderControl">
                        <input
                            type="range"
                            min="0"
                            max="100"
                            value={filters.proteinMin}
                            step="10"
                            onChange={(e) => setFilters({ ...filters, proteinMin: Number(e.target.value) })}
                        />
                        <span className="sliderValue">{filters.proteinMin}%</span>
                    </div>
                </div>

                <div className="filterRow">
                    <label>Max Active cook time</label>
                    <div className="sliderControl">
                        <input
                            type="range"
                            min="0"
                            max="45"
                            value={filters.activeTimeMax}
                            step="5"
                            onChange={(e) => setFilters({ ...filters, activeTimeMax: Number(e.target.value) })}
                        />
                        <span className="sliderValue">{filters.activeTimeMax} min</span>
                    </div>
                </div>

                <div className="filterRow">
                    <label>Max Total cook time</label>
                    <div className="sliderControl">
                        <input
                            type="range"
                            min="0"
                            max="45"
                            value={filters.totalTimeMax}
                            step="5"
                            onChange={(e) => setFilters({ ...filters, totalTimeMax: Number(e.target.value) })}
                        />
                        <span className="sliderValue">{filters.totalTimeMax} min</span>
                    </div>
                </div>

                <button className="managerBtn" onClick={searchRecipes}>Search Recipes</button>
            </div>

            <div className="managerCard">
                <h2>Results <span>{recipes.length > 0 ? `(${recipes.length})` : ''}</span></h2>
                <div className="recipesGrid">
                    {loading && <p>Loading...</p>}
                    {!loading && recipes.length === 0 && <p>No recipes found</p>}
                    {recipes.map((recipe) => (
                        <div key={recipe.id} className="recipeCard">
                            <div className="recipeName">{recipe.name}</div>
                            {recipe.description && (
                                <div className="recipeDescription">{recipe.description}</div>
                            )}
                            <div className="recipeMacros">
                                <div className="macroItem">
                                    <span className="value">{Math.round(Number(recipe.calories) || 0)}</span>
                                    Cal
                                </div>
                                <div className="macroItem">
                                    <span className="value">{Math.round(Number(recipe.carbs) || 0)}</span>
                                    C
                                </div>
                                <div className="macroItem">
                                    <span className="value">{Math.round(Number(recipe.fat) || 0)}</span>
                                    F
                                </div>
                                <div className="macroItem">
                                    <span className="value">{Math.round(Number(recipe.protein) || 0)}</span>
                                    P
                                </div>
                            </div>
                            <div className="recipeTime">
                                <span>⏱️ Active: {recipe.active_time || 0} min</span>
                                <span>🕐 Total: {recipe.total_time || 0} min</span>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
}
