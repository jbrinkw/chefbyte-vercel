import { useState, useEffect, useRef } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { apiSupabase } from '../lib/api-supabase';

interface Product {
    id: number;
    name: string;
    barcode: string | null;
    calories_per_serving: number | null;
}

interface QuantityUnit {
    id: number;
    name: string;
    name_plural: string | null;
}

interface Ingredient {
    id: number;
    product_id: number;
    product_name: string;
    amount: number;
    unit_name: string | null;
    note: string | null;
}

interface Recipe {
    id: number;
    name: string;
    description: string | null;
    base_servings: number;
    active_time: number | null;
    total_time: number | null;
    calories: number | null;
    carbs: number | null;
    fat: number | null;
    protein: number | null;
    ingredients: Ingredient[];
}

export default function RecipeEdit() {
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();
    const [recipe, setRecipe] = useState<Recipe | null>(null);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState('');

    // Product search
    const [products, setProducts] = useState<Product[]>([]);
    const [quantityUnits, setQuantityUnits] = useState<QuantityUnit[]>([]);
    const [productSearch, setProductSearch] = useState('');
    const [showProductDropdown, setShowProductDropdown] = useState(false);
    const [newIngredient, setNewIngredient] = useState({ product_id: 0, product_name: '', amount: 1, qu_id: 0, unit_name: '', note: '' });
    const searchRef = useRef<HTMLDivElement>(null);
    const quantityUnitsRef = useRef<QuantityUnit[]>([]);

    // Keep ref in sync with state
    useEffect(() => {
        quantityUnitsRef.current = quantityUnits;
    }, [quantityUnits]);

    // Load recipe
    useEffect(() => {
        if (!id) return;

        apiSupabase.getRecipe(parseInt(id))
            .then(data => {
                // Transform ingredients to match expected format
                const formattedRecipe = {
                    ...data,
                    ingredients: data.ingredients?.map((ing: any) => ({
                        id: ing.id,
                        product_id: ing.product_id,
                        product_name: ing.products?.name || 'Unknown',
                        amount: ing.amount,
                        unit_name: null, // QU info not in this query
                        note: ing.note,
                    })) || [],
                };
                setRecipe(formattedRecipe);
            })
            .catch(() => setError('Failed to load recipe'))
            .finally(() => setLoading(false));
    }, [id]);

    // Load products and quantity units
    useEffect(() => {
        apiSupabase.getProducts()
            .then(data => {
                setProducts(data || []);
            });

        apiSupabase.getQuantityUnits()
            .then(data => {
                if (data) {
                    // Filter to only Serving and Container
                    const units = data.filter((u: QuantityUnit) =>
                        u.name === 'Serving' || u.name === 'Container'
                    );
                    setQuantityUnits(units);
                    // Set default to Serving if available
                    const servingUnit = units.find((u: QuantityUnit) => u.name === 'Serving');
                    if (servingUnit) {
                        setNewIngredient(prev => ({ ...prev, qu_id: servingUnit.id, unit_name: servingUnit.name }));
                    }
                }
            })
            .catch(err => console.error('Error loading quantity units:', err));
    }, []);

    // Close dropdown when clicking outside
    useEffect(() => {
        function handleClickOutside(event: MouseEvent) {
            if (searchRef.current && !searchRef.current.contains(event.target as Node)) {
                setShowProductDropdown(false);
            }
        }
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const filteredProducts = products.filter(p =>
        p.name.toLowerCase().includes(productSearch.toLowerCase())
    ).slice(0, 10);

    const selectProduct = (product: Product) => {
        setNewIngredient(prev => ({
            ...prev,
            product_id: product.id,
            product_name: product.name
        }));
        setProductSearch(product.name);
        setShowProductDropdown(false);
    };

    const addIngredient = async () => {
        if (!recipe || !newIngredient.product_id) return;

        try {
            await apiSupabase.addRecipeIngredient({
                recipe_id: recipe.id,
                product_id: newIngredient.product_id,
                amount: newIngredient.amount,
                qu_id: newIngredient.qu_id || null,
                note: newIngredient.note || null,
            });

            // Reload recipe to get updated ingredients and macros
            const data = await apiSupabase.getRecipe(recipe.id);
            const formattedRecipe = {
                ...data,
                ingredients: data.ingredients?.map((ing: any) => ({
                    id: ing.id,
                    product_id: ing.product_id,
                    product_name: ing.products?.name || 'Unknown',
                    amount: ing.amount,
                    unit_name: null,
                    note: ing.note,
                })) || [],
            };
            setRecipe(formattedRecipe);

            // Reset with default Serving unit
            const servingUnit = quantityUnits.find(u => u.name === 'Serving');
            setNewIngredient({
                product_id: 0,
                product_name: '',
                amount: 1,
                qu_id: servingUnit?.id || 0,
                unit_name: servingUnit?.name || 'Serving',
                note: ''
            });
            setProductSearch('');
        } catch (err) {
            console.error('Failed to add ingredient:', err);
        }
    };

    const removeIngredient = async (ingredientId: number) => {
        if (!recipe) return;

        try {
            await apiSupabase.deleteRecipeIngredient(recipe.id, ingredientId);

            // Reload recipe
            const data = await apiSupabase.getRecipe(recipe.id);
            const formattedRecipe = {
                ...data,
                ingredients: data.ingredients?.map((ing: any) => ({
                    id: ing.id,
                    product_id: ing.product_id,
                    product_name: ing.products?.name || 'Unknown',
                    amount: ing.amount,
                    unit_name: null,
                    note: ing.note,
                })) || [],
            };
            setRecipe(formattedRecipe);
        } catch (err) {
            console.error('Failed to remove ingredient:', err);
        }
    };

    const handleSave = async () => {
        if (!recipe) return;
        setSaving(true);
        setError('');

        try {
            await apiSupabase.updateRecipe(recipe.id, {
                name: recipe.name,
                description: recipe.description,
                base_servings: recipe.base_servings,
            });

            navigate('/recipes');
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to save');
        } finally {
            setSaving(false);
        }
    };

    const handleDelete = async () => {
        if (!recipe || !confirm('Are you sure you want to delete this recipe?')) return;

        try {
            await apiSupabase.deleteRecipe(recipe.id);
            navigate('/recipes');
        } catch (err) {
            console.error('Failed to delete recipe:', err);
        }
    };

    if (loading) {
        return <div className="recipeEditPage"><p>Loading...</p></div>;
    }

    if (!recipe) {
        return <div className="recipeEditPage"><p>Recipe not found</p></div>;
    }

    return (
        <div className="recipeEditPage">
            <div className="recipeEditHeader">
                <h1>Edit Recipe</h1>
                <div className="headerActions">
                    <button type="button" className="deleteBtn" onClick={handleDelete}>
                        Delete
                    </button>
                    <button type="button" className="cancelBtn" onClick={() => navigate('/recipes')}>
                        Cancel
                    </button>
                    <button type="button" className="saveBtn" onClick={handleSave} disabled={saving}>
                        {saving ? 'Saving...' : 'Save Changes'}
                    </button>
                </div>
            </div>

            {error && <div className="errorMessage">{error}</div>}

            {/* Basic Info Section */}
            <div className="recipeSection">
                <h2>Basic Information</h2>
                <div className="formGrid">
                    <div className="formGroup full">
                        <label>Recipe Name</label>
                        <input
                            type="text"
                            value={recipe.name}
                            onChange={(e) => setRecipe({ ...recipe, name: e.target.value })}
                        />
                    </div>

                    <div className="formGroup full">
                        <label>Description</label>
                        <textarea
                            value={recipe.description || ''}
                            onChange={(e) => setRecipe({ ...recipe, description: e.target.value })}
                            rows={2}
                        />
                    </div>

                    <div className="formGroup">
                        <label>Servings</label>
                        <input
                            type="number"
                            min="1"
                            value={recipe.base_servings}
                            onChange={(e) => setRecipe({ ...recipe, base_servings: parseInt(e.target.value) || 1 })}
                        />
                    </div>
                </div>

                {/* Calculated Macros */}
                <div className="calculatedMacros">
                    <h3>Nutrition (per serving, calculated from ingredients)</h3>
                    <div className="macrosDisplay">
                        <div className="macroBox">
                            <span className="value">{Math.round(Number(recipe.calories) || 0)}</span>
                            <span className="label">Calories</span>
                        </div>
                        <div className="macroBox">
                            <span className="value">{Math.round(Number(recipe.carbs) || 0)}g</span>
                            <span className="label">Carbs</span>
                        </div>
                        <div className="macroBox">
                            <span className="value">{Math.round(Number(recipe.protein) || 0)}g</span>
                            <span className="label">Protein</span>
                        </div>
                        <div className="macroBox">
                            <span className="value">{Math.round(Number(recipe.fat) || 0)}g</span>
                            <span className="label">Fat</span>
                        </div>
                    </div>
                </div>
            </div>

            {/* Ingredients Section */}
            <div className="recipeSection">
                <h2>Ingredients ({recipe.ingredients?.length || 0})</h2>

                {/* Add ingredient form */}
                <div className="addIngredientForm">
                    <div className="ingredientInputRow">
                        <div className="productSearchContainer" ref={searchRef}>
                            <input
                                type="text"
                                value={productSearch}
                                onChange={(e) => {
                                    setProductSearch(e.target.value);
                                    setShowProductDropdown(true);
                                    setNewIngredient(prev => ({ ...prev, product_id: 0, product_name: '' }));
                                }}
                                onFocus={() => setShowProductDropdown(true)}
                                placeholder="Search for a product..."
                                className="productSearchInput"
                            />
                            {showProductDropdown && productSearch && filteredProducts.length > 0 && (
                                <div className="productDropdown">
                                    {filteredProducts.map(product => (
                                        <div
                                            key={product.id}
                                            className="productOption"
                                            onClick={() => selectProduct(product)}
                                        >
                                            <span className="productName">{product.name}</span>
                                            {product.calories_per_serving && (
                                                <span className="productCals">{product.calories_per_serving} cal</span>
                                            )}
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>

                        <input
                            type="number"
                            min="0.1"
                            step="0.1"
                            value={newIngredient.amount}
                            onChange={(e) => setNewIngredient({ ...newIngredient, amount: parseFloat(e.target.value) || 0 })}
                            placeholder="Amount"
                            className="amountInput"
                        />

                        <select
                            value={newIngredient.qu_id}
                            onChange={(e) => {
                                const newQuId = parseInt(e.target.value);
                                const selectedUnit = quantityUnitsRef.current.find(u => u.id === newQuId);
                                setNewIngredient(prev => ({
                                    ...prev,
                                    qu_id: newQuId,
                                    unit_name: selectedUnit?.name || ''
                                }));
                            }}
                            className="unitSelect"
                        >
                            {quantityUnits.map(unit => (
                                <option key={unit.id} value={unit.id}>
                                    {unit.name_plural || unit.name}
                                </option>
                            ))}
                        </select>

                        <input
                            type="text"
                            value={newIngredient.note}
                            onChange={(e) => setNewIngredient({ ...newIngredient, note: e.target.value })}
                            placeholder="Note (optional)"
                            className="noteInput"
                        />

                        <button
                            type="button"
                            onClick={addIngredient}
                            disabled={!newIngredient.product_id}
                            className="addIngredientBtn"
                        >
                            + Add
                        </button>
                    </div>
                </div>

                {/* Ingredients list */}
                <div className="ingredientsList">
                    {(!recipe.ingredients || recipe.ingredients.length === 0) ? (
                        <p className="noIngredients">No ingredients added yet.</p>
                    ) : (
                        <table className="ingredientsTable">
                            <thead>
                                <tr>
                                    <th>Product</th>
                                    <th>Amount</th>
                                    <th>Note</th>
                                    <th></th>
                                </tr>
                            </thead>
                            <tbody>
                                {recipe.ingredients.map((ing) => (
                                    <tr key={ing.id}>
                                        <td>{ing.product_name}</td>
                                        <td>{ing.amount} {ing.unit_name || 'serving(s)'}</td>
                                        <td>{ing.note || '-'}</td>
                                        <td>
                                            <button
                                                type="button"
                                                onClick={() => removeIngredient(ing.id)}
                                                className="removeIngredientBtn"
                                            >
                                                x
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    )}
                </div>
            </div>
        </div>
    );
}
