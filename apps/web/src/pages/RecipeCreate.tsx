import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { apiSupabase } from '../lib/api-supabase';

interface Product {
    id: number;
    name: string;
    barcode: string | null;
    calories_per_serving: number | null;
    carbs_per_serving: number | null;
    protein_per_serving: number | null;
    fat_per_serving: number | null;
    num_servings: number | null;
}

interface QuantityUnit {
    id: number;
    name: string;
    name_plural: string | null;
}

interface Ingredient {
    id?: number;
    product_id: number;
    product_name: string;
    amount: number;
    qu_id: number;
    unit_name: string;
    note: string;
}

interface RecipeForm {
    name: string;
    description: string;
    base_servings: number;
    active_time: number;
    total_time: number;
    instructions: string;
}

export default function RecipeCreate() {
    const navigate = useNavigate();
    const [form, setForm] = useState<RecipeForm>({
        name: '',
        description: '',
        base_servings: 1,
        active_time: 0,
        total_time: 0,
        instructions: '',
    });
    const [ingredients, setIngredients] = useState<Ingredient[]>([]);
    const [products, setProducts] = useState<Product[]>([]);
    const [quantityUnits, setQuantityUnits] = useState<QuantityUnit[]>([]);
    const [productSearch, setProductSearch] = useState('');
    const [showProductDropdown, setShowProductDropdown] = useState(false);
    const [newIngredient, setNewIngredient] = useState({ product_id: 0, product_name: '', amount: 1, qu_id: 0, unit_name: '', note: '' });
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState('');
    const searchRef = useRef<HTMLDivElement>(null);
    const unitSelectRef = useRef<HTMLSelectElement>(null);
    const quantityUnitsRef = useRef<QuantityUnit[]>([]);
    const newIngredientRef = useRef(newIngredient);

    // Keep refs in sync with state
    useEffect(() => {
        quantityUnitsRef.current = quantityUnits;
    }, [quantityUnits]);

    useEffect(() => {
        newIngredientRef.current = newIngredient;
    }, [newIngredient]);

    // Load products and quantity units
    useEffect(() => {
        apiSupabase.getProducts()
            .then(data => {
                setProducts(data || []);
            })
            .catch(err => console.error('Error loading products:', err));

        apiSupabase.getQuantityUnits()
            .then(data => {
                if (data) {
                    // Filter to only Serving and Container, prioritize Serving first
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

    // Filter products based on search
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

    const addIngredient = () => {
        const currentIngredient = newIngredientRef.current;
        if (!currentIngredient.product_id || currentIngredient.amount <= 0) {
            return;
        }
        // Read the actual unit value from the DOM to avoid stale closure issues
        const selectValue = unitSelectRef.current?.value;
        const actualQuId = selectValue ? parseInt(selectValue) : currentIngredient.qu_id;
        const actualUnit = quantityUnitsRef.current.find(u => u.id === actualQuId);

        const ingredientToAdd = {
            ...currentIngredient,
            qu_id: actualQuId,
            unit_name: actualUnit?.name || currentIngredient.unit_name || 'Serving'
        };

        setIngredients(prev => [...prev, ingredientToAdd]);
        // Reset with default Serving unit
        const servingUnit = quantityUnitsRef.current.find(u => u.name === 'Serving');
        setNewIngredient({
            product_id: 0,
            product_name: '',
            amount: 1,
            qu_id: servingUnit?.id || 0,
            unit_name: servingUnit?.name || 'Serving',
            note: ''
        });
        setProductSearch('');
    };

    const removeIngredient = (index: number) => {
        setIngredients(ingredients.filter((_, i) => i !== index));
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');

        if (!form.name.trim()) {
            setError('Recipe name is required');
            return;
        }

        setSaving(true);

        try {
            // Create recipe
            const recipe = await apiSupabase.createRecipe({
                name: form.name.trim(),
                description: form.description.trim() || null,
                base_servings: form.base_servings,
                active_time: form.active_time || null,
                total_time: form.total_time || null,
            });

            const recipeId = recipe.id;

            // Add ingredients
            for (const ing of ingredients) {
                await apiSupabase.addRecipeIngredient({
                    recipe_id: recipeId,
                    product_id: ing.product_id,
                    amount: ing.amount,
                    qu_id: ing.qu_id || null,
                    note: ing.note || null,
                });
            }

            // Navigate to the recipe list or edit page
            navigate(`/recipes/edit/${recipeId}`);
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to create recipe');
        } finally {
            setSaving(false);
        }
    };

    return (
        <div className="recipeCreatePage">
            <form onSubmit={handleSubmit}>
                <div className="recipeCreateHeader">
                    <h1>Create Recipe</h1>
                    <div className="headerActions">
                        <button type="button" className="cancelBtn" onClick={() => navigate('/recipes')}>
                            Cancel
                        </button>
                        <button type="submit" className="saveBtn" disabled={saving}>
                            {saving ? 'Saving...' : 'Save Recipe'}
                        </button>
                    </div>
                </div>

                {error && <div className="errorMessage">{error}</div>}

                {/* Basic Info Section */}
                <div className="recipeSection">
                    <h2>Basic Information</h2>
                    <div className="formGrid">
                        <div className="formGroup full">
                            <label>Recipe Name *</label>
                            <input
                                type="text"
                                value={form.name}
                                onChange={(e) => setForm({ ...form, name: e.target.value })}
                                placeholder="Enter recipe name"
                                required
                            />
                        </div>

                        <div className="formGroup full">
                            <label>Description</label>
                            <textarea
                                value={form.description}
                                onChange={(e) => setForm({ ...form, description: e.target.value })}
                                placeholder="Brief description of the recipe"
                                rows={2}
                            />
                        </div>

                        <div className="formGroup">
                            <label>Servings</label>
                            <input
                                type="number"
                                min="1"
                                value={form.base_servings}
                                onChange={(e) => setForm({ ...form, base_servings: parseInt(e.target.value) || 1 })}
                            />
                        </div>

                        <div className="formGroup">
                            <label>Active Time (min)</label>
                            <input
                                type="number"
                                min="0"
                                value={form.active_time}
                                onChange={(e) => setForm({ ...form, active_time: parseInt(e.target.value) || 0 })}
                                placeholder="Hands-on cooking time"
                            />
                        </div>

                        <div className="formGroup">
                            <label>Total Time (min)</label>
                            <input
                                type="number"
                                min="0"
                                value={form.total_time}
                                onChange={(e) => setForm({ ...form, total_time: parseInt(e.target.value) || 0 })}
                                placeholder="Total time including waiting"
                            />
                        </div>
                    </div>
                </div>

                {/* Ingredients Section */}
                <div className="recipeSection">
                    <h2>Ingredients</h2>

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
                                ref={unitSelectRef}
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
                        {ingredients.length === 0 ? (
                            <p className="noIngredients">No ingredients added yet. Search for products above to add them.</p>
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
                                    {ingredients.map((ing, index) => {
                                        const unit = quantityUnits.find(u => u.id === ing.qu_id);
                                        return (
                                        <tr key={index}>
                                            <td>{ing.product_name}</td>
                                            <td>{ing.amount} {unit?.name || ing.unit_name || 'Serving'}</td>
                                            <td>{ing.note || '-'}</td>
                                            <td>
                                                <button
                                                    type="button"
                                                    onClick={() => removeIngredient(index)}
                                                    className="removeIngredientBtn"
                                                >
                                                    x
                                                </button>
                                            </td>
                                        </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        )}
                    </div>
                </div>

                {/* Instructions Section */}
                <div className="recipeSection">
                    <h2>Instructions</h2>
                    <textarea
                        value={form.instructions}
                        onChange={(e) => setForm({ ...form, instructions: e.target.value })}
                        placeholder="Enter cooking instructions..."
                        rows={8}
                        className="instructionsTextarea"
                    />
                </div>
            </form>
        </div>
    );
}
