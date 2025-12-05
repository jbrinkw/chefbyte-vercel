import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useState, useEffect, useMemo } from 'react';
import { apiSupabase } from '../lib/api-supabase';
import { generateWalmartCartLink } from '../lib/walmart';

export default function Home() {
    const queryClient = useQueryClient();
    const today = new Date().toLocaleDateString('en-CA');

    // Taste Profile State
    const [showTasteProfile, setShowTasteProfile] = useState(false);
    const [tasteProfile, setTasteProfile] = useState('');

    // Target Macros State
    const [showTargetMacros, setShowTargetMacros] = useState(false);
    const [targetCarbs, setTargetCarbs] = useState(300);
    const [targetProtein, setTargetProtein] = useState(150);
    const [targetFats, setTargetFats] = useState(80);

    // Liquid Tracking State
    const [showLiquidModal, setShowLiquidModal] = useState(false);
    const [liquidForm, setLiquidForm] = useState({
        productName: '',
        amount: '',
        calories: '',
        isRefill: false
    });

    // Auto-calculate calories: (carbs×4) + (protein×4) + (fats×9)
    const calculatedCalories = (targetCarbs * 4) + (targetProtein * 4) + (targetFats * 9);

    // Execute meal mutation
    const executeMealMutation = useMutation({
        mutationFn: ({ id, done }: { id: number, done: boolean }) => apiSupabase.executeMeal(id, done),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['mealPlan'] });
            queryClient.invalidateQueries({ queryKey: ['macros'] });
        },
    });

    // Load taste profile from Supabase
    useEffect(() => {
        apiSupabase.getConfig('taste_profile').then(value => {
            if (value) setTasteProfile(value);
        }).catch(() => {
            // Fall back to local storage
            const saved = localStorage.getItem('tasteProfile');
            if (saved) setTasteProfile(saved);
        });
    }, []);

    const saveTasteProfile = async () => {
        try {
            await apiSupabase.setConfig('taste_profile', tasteProfile);
        } catch {
            // Fall back to local storage
            localStorage.setItem('tasteProfile', tasteProfile);
        }
        setShowTasteProfile(false);
    };

    const saveTargetMacros = async () => {
        try {
            await Promise.all([
                apiSupabase.setConfig('goal_calories', String(calculatedCalories)),
                apiSupabase.setConfig('goal_carbs', String(targetCarbs)),
                apiSupabase.setConfig('goal_protein', String(targetProtein)),
                apiSupabase.setConfig('goal_fats', String(targetFats)),
            ]);
            // Refresh macro data
            queryClient.invalidateQueries({ queryKey: ['macros'] });
        } catch (err) {
            console.error('Failed to save target macros:', err);
        }
        setShowTargetMacros(false);
    };

    const handleAddLiquid = async () => {
        try {
            const amount = parseFloat(liquidForm.amount) || 0;
            const calories = parseFloat(liquidForm.calories) || 0;

            if (!liquidForm.productName) {
                alert('Please enter a product name');
                return;
            }

            if (amount <= 0 && calories <= 0 && !liquidForm.isRefill) {
                alert('Please enter amount or calories');
                return;
            }

            await apiSupabase.addManualLiquidEvent({
                product_name: liquidForm.productName,
                consumed: amount,
                calories: calories,
                protein: 0, // TODO: Add macro inputs if needed
                carbs: 0,
                fat: 0,
                is_refill: liquidForm.isRefill
            });

            // Reset and close
            setLiquidForm({ productName: '', amount: '', calories: '', isRefill: false });
            setShowLiquidModal(false);
            queryClient.invalidateQueries({ queryKey: ['macros'] });
        } catch (err) {
            console.error('Failed to add liquid event:', err);
            alert('Failed to add event');
        }
    };

    const handleDeleteLiquid = async (id: number) => {
        if (!confirm('Delete this liquid event?')) return;
        try {
            await apiSupabase.deleteLiquidEvent(id);
            queryClient.invalidateQueries({ queryKey: ['macros'] });
        } catch (err) {
            console.error('Failed to delete liquid event:', err);
            alert('Failed to delete event');
        }
    };

    // Fetch today's meal plan
    const { data: mealPlan, isLoading } = useQuery({
        queryKey: ['mealPlan', 'today'],
        queryFn: () => apiSupabase.getMealPlanToday(),
    });

    // Fetch macro summary (consumed + temp items + goals)
    const { data: macrosSummary } = useQuery({
        queryKey: ['macros', today],
        queryFn: () => apiSupabase.getMacrosSummary(today),
    });

    // Load target macros when macrosSummary loads
    useEffect(() => {
        if (macrosSummary?.goals) {
            setTargetCarbs(macrosSummary.goals.carbs || 300);
            setTargetProtein(macrosSummary.goals.protein || 150);
            setTargetFats(macrosSummary.goals.fats || 80);
        }
    }, [macrosSummary?.goals]);

    // Fetch dashboard stats
    const { data: stats, isLoading: statsLoading } = useQuery({
        queryKey: ['stats'],
        queryFn: () => apiSupabase.getStats(),
    });

    // Calculate planned macros from all meal plan entries (done or not)
    const plannedMacros = useMemo(() => {
        if (!mealPlan || !Array.isArray(mealPlan)) {
            return { calories: 0, protein: 0, carbs: 0, fat: 0 };
        }

        let calories = 0, protein = 0, carbs = 0, fat = 0;

        mealPlan.forEach((meal: any) => {
            if (meal.recipe_id && meal.recipes) {
                calories += meal.recipes.calories || 0;
                protein += meal.recipes.protein || 0;
                carbs += meal.recipes.carbs || 0;
                fat += meal.recipes.fat || 0;
            } else if (meal.product_id && meal.products) {
                const amount = meal.amount || 1;
                // Unit logic
                const unitName = meal.quantity_units?.name || meal.unit_name || 'servings';
                const isContainer = unitName.toLowerCase() === 'container' || unitName.toLowerCase() === 'containers';

                let multiplier = amount;
                if (isContainer && meal.products.num_servings) {
                    multiplier = amount * meal.products.num_servings;
                }

                calories += (meal.products.calories_per_serving || 0) * multiplier;
                protein += (meal.products.protein_per_serving || 0) * multiplier;
                carbs += (meal.products.carbs_per_serving || 0) * multiplier;
                fat += (meal.products.fat_per_serving || 0) * multiplier;
            }
        });

        return { calories, protein, carbs, fat };
    }, [mealPlan]);

    // Filter meal plan into prep and regular meals
    const mealPrepItems = useMemo(() => {
        if (!mealPlan || !Array.isArray(mealPlan)) return [];
        return mealPlan.filter((item: any) => item.is_meal_prep);
    }, [mealPlan]);

    const regularMealItems = useMemo(() => {
        if (!mealPlan || !Array.isArray(mealPlan)) return [];
        return mealPlan.filter((item: any) => !item.is_meal_prep);
    }, [mealPlan]);

    return (
        <div className="grocyHomeView" style={{ display: 'flex', position: 'relative' }}>
            {/* Taste Profile Modal */}
            {showTasteProfile && (
                <div style={{
                    position: 'fixed',
                    top: 0,
                    left: 0,
                    right: 0,
                    bottom: 0,
                    background: 'rgba(0,0,0,0.5)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    zIndex: 1000
                }}>
                    <div style={{
                        background: '#fff',
                        padding: '24px',
                        borderRadius: '8px',
                        width: '400px',
                        boxShadow: '0 4px 12px rgba(0,0,0,0.15)'
                    }}>
                        <h2 style={{ marginTop: 0 }}>Taste Profile</h2>
                        <p style={{ color: '#666', fontSize: '14px' }}>
                            Describe your taste preferences (e.g., "I love spicy food", "No cilantro").
                        </p>
                        <textarea
                            value={tasteProfile}
                            onChange={(e) => setTasteProfile(e.target.value)}
                            style={{
                                width: '100%',
                                height: '100px',
                                padding: '12px',
                                border: '1px solid #ddd',
                                borderRadius: '6px',
                                marginBottom: '16px',
                                fontFamily: 'inherit'
                            }}
                            placeholder="Enter your preferences..."
                        />
                        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
                            <button
                                onClick={() => setShowTasteProfile(false)}
                                style={{
                                    padding: '8px 16px',
                                    background: '#f0f0f0',
                                    border: 'none',
                                    borderRadius: '4px',
                                    cursor: 'pointer'
                                }}
                            >
                                Cancel
                            </button>
                            <button
                                onClick={saveTasteProfile}
                                style={{
                                    padding: '8px 16px',
                                    background: '#1e66f5',
                                    color: '#fff',
                                    border: 'none',
                                    borderRadius: '4px',
                                    cursor: 'pointer',
                                    fontWeight: 600
                                }}
                            >
                                Save Profile
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Target Macros Modal */}
            {showTargetMacros && (
                <div style={{
                    position: 'fixed',
                    top: 0,
                    left: 0,
                    right: 0,
                    bottom: 0,
                    background: 'rgba(0,0,0,0.5)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    zIndex: 1000
                }}>
                    <div style={{
                        background: '#fff',
                        padding: '24px',
                        borderRadius: '8px',
                        width: '400px',
                        boxShadow: '0 4px 12px rgba(0,0,0,0.15)'
                    }}>
                        <h2 style={{ marginTop: 0 }}>Target Macros</h2>
                        <p style={{ color: '#666', fontSize: '14px' }}>
                            Set your daily macro goals. Calories are calculated automatically.
                        </p>

                        <div style={{ marginBottom: '16px' }}>
                            <label style={{ display: 'block', marginBottom: '4px', fontWeight: 600 }}>
                                Calories (calculated)
                            </label>
                            <input
                                type="number"
                                value={calculatedCalories}
                                disabled
                                style={{
                                    width: '100%',
                                    padding: '10px',
                                    border: '1px solid #ddd',
                                    borderRadius: '6px',
                                    background: '#f5f5f5',
                                    color: '#666'
                                }}
                            />
                            <small style={{ color: '#888', fontSize: '11px' }}>
                                (carbs×4) + (protein×4) + (fats×9)
                            </small>
                        </div>

                        <div style={{ marginBottom: '16px' }}>
                            <label style={{ display: 'block', marginBottom: '4px', fontWeight: 600 }}>
                                Carbs (g)
                            </label>
                            <input
                                type="number"
                                value={targetCarbs}
                                onChange={(e) => setTargetCarbs(Number(e.target.value) || 0)}
                                style={{
                                    width: '100%',
                                    padding: '10px',
                                    border: '1px solid #ddd',
                                    borderRadius: '6px'
                                }}
                            />
                        </div>

                        <div style={{ marginBottom: '16px' }}>
                            <label style={{ display: 'block', marginBottom: '4px', fontWeight: 600 }}>
                                Protein (g)
                            </label>
                            <input
                                type="number"
                                value={targetProtein}
                                onChange={(e) => setTargetProtein(Number(e.target.value) || 0)}
                                style={{
                                    width: '100%',
                                    padding: '10px',
                                    border: '1px solid #ddd',
                                    borderRadius: '6px'
                                }}
                            />
                        </div>

                        <div style={{ marginBottom: '16px' }}>
                            <label style={{ display: 'block', marginBottom: '4px', fontWeight: 600 }}>
                                Fats (g)
                            </label>
                            <input
                                type="number"
                                value={targetFats}
                                onChange={(e) => setTargetFats(Number(e.target.value) || 0)}
                                style={{
                                    width: '100%',
                                    padding: '10px',
                                    border: '1px solid #ddd',
                                    borderRadius: '6px'
                                }}
                            />
                        </div>

                        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
                            <button
                                onClick={() => setShowTargetMacros(false)}
                                style={{
                                    padding: '8px 16px',
                                    background: '#f0f0f0',
                                    border: 'none',
                                    borderRadius: '4px',
                                    cursor: 'pointer'
                                }}
                            >
                                Cancel
                            </button>
                            <button
                                onClick={saveTargetMacros}
                                style={{
                                    padding: '8px 16px',
                                    background: '#e67e22',
                                    color: '#fff',
                                    border: 'none',
                                    borderRadius: '4px',
                                    cursor: 'pointer',
                                    fontWeight: 600
                                }}
                            >
                                Save Goals
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Liquid Tracking Modal */}
            {showLiquidModal && (
                <div style={{
                    position: 'fixed',
                    top: 0,
                    left: 0,
                    right: 0,
                    bottom: 0,
                    background: 'rgba(0,0,0,0.5)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    zIndex: 1000
                }}>
                    <div style={{
                        background: '#fff',
                        padding: '24px',
                        borderRadius: '8px',
                        width: '400px',
                        boxShadow: '0 4px 12px rgba(0,0,0,0.15)'
                    }}>
                        <h2 style={{ marginTop: 0 }}>Add Liquid Log</h2>

                        <div style={{ marginBottom: '16px' }}>
                            <label style={{ display: 'block', marginBottom: '4px', fontWeight: 600 }}>Product Name</label>
                            <input
                                type="text"
                                value={liquidForm.productName}
                                onChange={(e) => setLiquidForm({ ...liquidForm, productName: e.target.value })}
                                placeholder="e.g. Water, Coffee, Milk"
                                style={{ width: '100%', padding: '10px', border: '1px solid #ddd', borderRadius: '6px' }}
                            />
                        </div>

                        <div style={{ display: 'flex', gap: '12px', marginBottom: '16px' }}>
                            <div style={{ flex: 1 }}>
                                <label style={{ display: 'block', marginBottom: '4px', fontWeight: 600 }}>Amount (ml/g)</label>
                                <input
                                    type="number"
                                    value={liquidForm.amount}
                                    onChange={(e) => setLiquidForm({ ...liquidForm, amount: e.target.value })}
                                    placeholder="0"
                                    style={{ width: '100%', padding: '10px', border: '1px solid #ddd', borderRadius: '6px' }}
                                />
                            </div>
                            <div style={{ flex: 1 }}>
                                <label style={{ display: 'block', marginBottom: '4px', fontWeight: 600 }}>Calories</label>
                                <input
                                    type="number"
                                    value={liquidForm.calories}
                                    onChange={(e) => setLiquidForm({ ...liquidForm, calories: e.target.value })}
                                    placeholder="0"
                                    style={{ width: '100%', padding: '10px', border: '1px solid #ddd', borderRadius: '6px' }}
                                />
                            </div>
                        </div>

                        <div style={{ marginBottom: '24px' }}>
                            <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
                                <input
                                    type="checkbox"
                                    checked={liquidForm.isRefill}
                                    onChange={(e) => setLiquidForm({ ...liquidForm, isRefill: e.target.checked })}
                                    style={{ width: '18px', height: '18px' }}
                                />
                                <span>This is a refill (adding to container)</span>
                            </label>
                        </div>

                        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
                            <button
                                onClick={() => setShowLiquidModal(false)}
                                style={{ padding: '8px 16px', background: '#f0f0f0', border: 'none', borderRadius: '4px', cursor: 'pointer' }}
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleAddLiquid}
                                style={{ padding: '8px 16px', background: '#3498db', color: '#fff', border: 'none', borderRadius: '4px', cursor: 'pointer', fontWeight: 600 }}
                            >
                                Save Log
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Current Day Macros */}
            <div className="currentDayCard">
                <div className="dayHeader">
                    <span>Today</span>
                    <span style={{ fontSize: '14px', color: '#666' }}>(6:00 AM - 5:59 AM)</span>
                </div>
                <div className="macroGrid">
                    <div className="macroBox">
                        <label>Calories</label>
                        <div>
                            <span>{Math.round(macrosSummary?.consumed?.calories || 0)}</span> /
                            <span>{Math.round(plannedMacros.calories)}</span> /
                            <span>{macrosSummary?.goals?.calories || 0}</span>
                        </div>
                        <small style={{ fontSize: '11px', color: '#888' }}>consumed / planned / goal</small>
                    </div>
                    <div className="macroBox">
                        <label>Carbs</label>
                        <div>
                            <span>{Math.round(macrosSummary?.consumed?.carbs || 0)}</span> /
                            <span>{Math.round(plannedMacros.carbs)}</span> /
                            <span>{macrosSummary?.goals?.carbs || 0}</span>g
                        </div>
                        <small style={{ fontSize: '11px', color: '#888' }}>consumed / planned / goal</small>
                    </div>
                    <div className="macroBox">
                        <label>Fats</label>
                        <div>
                            <span>{Math.round(macrosSummary?.consumed?.fat || 0)}</span> /
                            <span>{Math.round(plannedMacros.fat)}</span> /
                            <span>{macrosSummary?.goals?.fats || 0}</span>g
                        </div>
                        <small style={{ fontSize: '11px', color: '#888' }}>consumed / planned / goal</small>
                    </div>
                    <div className="macroBox">
                        <label>Protein</label>
                        <div>
                            <span>{Math.round(macrosSummary?.consumed?.protein || 0)}</span> /
                            <span>{Math.round(plannedMacros.protein)}</span> /
                            <span>{macrosSummary?.goals?.protein || 0}</span>g
                        </div>
                        <small style={{ fontSize: '11px', color: '#888' }}>consumed / planned / goal</small>
                    </div>
                </div>

                {/* Status Row */}
                <div className="statusRow">
                    <span>Missing Walmart Links: <strong>{statsLoading ? '...' : (stats?.missingWalmartLinks ?? '-')}</strong></span>
                    <span>Missing Prices: <strong>{statsLoading ? '...' : (stats?.missingPrices ?? '-')}</strong></span>
                    <span>Placeholder Items: <strong>{statsLoading ? '...' : (stats?.placeholderItems ?? '-')}</strong></span>
                    <span>Below Min Stock: <strong>{statsLoading ? '...' : (stats?.belowMinStock ?? '-')}</strong></span>
                    <span>Shopping Cart Value: <strong>{statsLoading ? '$...' : `$${stats?.shoppingCartValue?.toFixed(2) ?? '0.00'}`}</strong></span>
                </div>

                {/* Action Buttons */}
                <div style={{ marginTop: '16px', display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
                    <button
                        className="shoppingLinksBtn"
                        onClick={async () => {
                            try {
                                const items = await apiSupabase.getShoppingListForCart();
                                if (!items || items.length === 0) {
                                    alert("Shopping list is empty!");
                                    return;
                                }

                                const deepLink = generateWalmartCartLink(items);

                                if (!deepLink) {
                                    alert(`No valid Walmart items found.`);
                                    return;
                                }

                                window.open(deepLink, '_blank');

                            } catch (e) {
                                console.error(e);
                                alert("Failed to generate cart link");
                            }
                        }}
                    >
                        🛒 Open Shopping List Links
                    </button>

                    <button
                        className="shoppingLinksBtn"
                        style={{ background: '#ff8c00' }}
                        onClick={async () => {
                            if (!confirm("This will 'purchase' all non-placeholder items in your shopping list and move them to inventory. Continue?")) return;
                            try {
                                const res = await apiSupabase.importShoppingList();
                                alert(`Imported ${res.imported} items to inventory!`);
                                queryClient.invalidateQueries({ queryKey: ['shoppingList'] });
                                queryClient.invalidateQueries({ queryKey: ['stock'] });
                            } catch (e) {
                                console.error(e);
                                alert("Failed to import shopping list");
                            }
                        }}
                    >
                        📥 Import Shopping List
                    </button>

                    <button
                        className="shoppingLinksBtn"
                        style={{ background: '#1e66f5' }}
                        onClick={async () => {
                            try {
                                const res = await apiSupabase.syncMealPlanToCart(7);
                                alert(`Added ${res.added} missing items to shopping list!`);
                                queryClient.invalidateQueries({ queryKey: ['shoppingList'] });
                            } catch (e) {
                                console.error(e);
                                alert("Failed to sync meal plan");
                            }
                        }}
                    >
                        🍽️ Meal Plan → Cart
                    </button>

                    <button
                        className="shoppingLinksBtn"
                        style={{ background: '#9b59b6' }}
                        onClick={() => setShowTasteProfile(true)}
                    >
                        📝 Taste Profile
                    </button>
                    <button
                        className="shoppingLinksBtn"
                        style={{ background: '#e67e22' }}
                        onClick={() => setShowTargetMacros(true)}
                    >
                        🎯 Target Macros
                    </button>
                </div>
            </div>

            {/* Today's Meal Prep */}
            <div className="plannedRecipesSection">
                <h3>Today's Meal Prep</h3>
                <div className="plannedRecipesList">
                    {isLoading && <p>Loading...</p>}
                    {!isLoading && mealPrepItems.length === 0 && (
                        <p style={{ color: '#666', fontStyle: 'italic' }}>No meal prep scheduled for today</p>
                    )}
                    {!isLoading && mealPrepItems.map((item: any) => {
                        const product = item.products;
                        const recipe = item.recipes;
                        const entity = product || recipe;
                        const name = entity?.name || 'Unknown';
                        const type = item.type === 'recipe' ? 'Recipe' : 'Product';
                        const amount = item.amount || 1;

                        // Unit logic
                        const unitName = item.quantity_units?.name || item.unit_name || 'servings';
                        const isContainer = unitName.toLowerCase() === 'container' || unitName.toLowerCase() === 'containers';

                        let multiplier = amount;
                        if (isContainer && product?.num_servings) {
                            multiplier = amount * product.num_servings;
                        }

                        // Calculate totals
                        const cals = Math.round((entity?.calories_per_serving || entity?.calories || 0) * multiplier);
                        const protein = Math.round((entity?.protein_per_serving || entity?.protein || 0) * multiplier);
                        const carbs = Math.round((entity?.carbs_per_serving || entity?.carbs || 0) * multiplier);
                        const fat = Math.round((entity?.fat_per_serving || entity?.fat || 0) * multiplier);
                        const price = product ? (product.price || 0) * amount : 0; // Recipes don't have direct price yet

                        return (
                            <div key={item.id} className="plannedRecipeCard" style={{
                                opacity: item.done ? 0.6 : 1,
                                display: 'flex',
                                justifyContent: 'space-between',
                                alignItems: 'center',
                                padding: '12px',
                                border: '1px solid #eee',
                                borderRadius: '8px',
                                marginBottom: '8px',
                                background: '#fff'
                            }}>
                                <div className="plannedRecipeInfo" style={{ flex: 1 }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                                        <strong style={{ textDecoration: item.done ? 'line-through' : 'none', fontSize: '1.1em' }}>
                                            {name}
                                        </strong>
                                        <span style={{
                                            fontSize: '0.8em',
                                            background: '#eee',
                                            padding: '2px 6px',
                                            borderRadius: '4px',
                                            color: '#666'
                                        }}>
                                            {type}
                                        </span>
                                    </div>

                                    <div className="plannedRecipeMeta" style={{ fontSize: '0.9em', color: '#555', marginBottom: '4px' }}>
                                        <span style={{ fontWeight: 600 }}>{amount} {unitName}</span>
                                        {product && price > 0 && (
                                            <span style={{ marginLeft: '10px', color: '#27ae60', fontWeight: 600 }}>
                                                ${price.toFixed(2)}
                                            </span>
                                        )}
                                    </div>

                                    <div className="plannedRecipeMacros" style={{ fontSize: '0.85em', color: '#777', display: 'flex', gap: '12px' }}>
                                        <span>🔥 {cals} kcal</span>
                                        <span>🥩 P: {protein}g</span>
                                        <span>🍞 C: {carbs}g</span>
                                        <span>🥑 F: {fat}g</span>
                                    </div>
                                </div>

                                <div className="plannedRecipeActions" style={{ marginLeft: '16px' }}>
                                    <button
                                        className={item.done ? 'undo' : 'execute'}
                                        disabled={executeMealMutation.isPending}
                                        onClick={() => executeMealMutation.mutate({ id: item.id, done: !item.done })}
                                        style={{
                                            background: item.done ? '#7f8c8d' : '#27ae60',
                                            color: 'white',
                                            border: 'none',
                                            padding: '8px 16px',
                                            borderRadius: '6px',
                                            cursor: 'pointer',
                                            fontWeight: 600,
                                            minWidth: '80px'
                                        }}
                                    >
                                        {executeMealMutation.isPending ? '...' : (item.done ? 'Undo' : 'Execute')}
                                    </button>
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>

            {/* Today's Meals */}
            <div className="plannedRecipesSection">
                <h3>Today's Meals</h3>
                <div className="plannedRecipesList">
                    {isLoading && <p style={{ color: '#666', fontStyle: 'italic' }}>Loading...</p>}
                    {!isLoading && regularMealItems.length === 0 && (
                        <p style={{ color: '#666', fontStyle: 'italic' }}>No meals scheduled for today</p>
                    )}
                    {!isLoading && regularMealItems.map((item: any) => {
                        const product = item.products;
                        const recipe = item.recipes;
                        const entity = product || recipe;
                        const name = entity?.name || 'Unknown';
                        const type = item.type === 'recipe' ? 'Recipe' : 'Product';
                        const amount = item.amount || 1;

                        // Unit logic
                        const unitName = item.quantity_units?.name || item.unit_name || 'servings';
                        const isContainer = unitName.toLowerCase() === 'container' || unitName.toLowerCase() === 'containers';

                        let multiplier = amount;
                        if (isContainer && product?.num_servings) {
                            multiplier = amount * product.num_servings;
                        }

                        // Calculate totals
                        const cals = Math.round((entity?.calories_per_serving || entity?.calories || 0) * multiplier);
                        const protein = Math.round((entity?.protein_per_serving || entity?.protein || 0) * multiplier);
                        const carbs = Math.round((entity?.carbs_per_serving || entity?.carbs || 0) * multiplier);
                        const fat = Math.round((entity?.fat_per_serving || entity?.fat || 0) * multiplier);
                        const price = product ? (product.price || 0) * amount : 0;

                        return (
                            <div key={item.id} className="plannedRecipeCard" style={{
                                opacity: item.done ? 0.6 : 1,
                                display: 'flex',
                                justifyContent: 'space-between',
                                alignItems: 'center',
                                padding: '12px',
                                border: '1px solid #eee',
                                borderRadius: '8px',
                                marginBottom: '8px',
                                background: '#fff'
                            }}>
                                <div className="plannedRecipeInfo" style={{ flex: 1 }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                                        <strong style={{ textDecoration: item.done ? 'line-through' : 'none', fontSize: '1.1em' }}>
                                            {name}
                                        </strong>
                                        <span style={{
                                            fontSize: '0.8em',
                                            background: '#eee',
                                            padding: '2px 6px',
                                            borderRadius: '4px',
                                            color: '#666'
                                        }}>
                                            {type}
                                        </span>
                                    </div>

                                    <div className="plannedRecipeMeta" style={{ fontSize: '0.9em', color: '#555', marginBottom: '4px' }}>
                                        <span style={{ fontWeight: 600 }}>{amount} {unitName}</span>
                                        {product && price > 0 && (
                                            <span style={{ marginLeft: '10px', color: '#27ae60', fontWeight: 600 }}>
                                                ${price.toFixed(2)}
                                            </span>
                                        )}
                                    </div>

                                    <div className="plannedRecipeMacros" style={{ fontSize: '0.85em', color: '#777', display: 'flex', gap: '12px' }}>
                                        <span>🔥 {cals} kcal</span>
                                        <span>🥩 P: {protein}g</span>
                                        <span>🍞 C: {carbs}g</span>
                                        <span>🥑 F: {fat}g</span>
                                    </div>
                                </div>

                                <div className="plannedRecipeActions" style={{ marginLeft: '16px' }}>
                                    <button
                                        className="execute"
                                        disabled={executeMealMutation.isPending}
                                        onClick={() => executeMealMutation.mutate({ id: item.id, done: !item.done })}
                                        style={{
                                            background: item.done ? '#7f8c8d' : '#2ecc71',
                                            color: 'white',
                                            border: 'none',
                                            padding: '8px 16px',
                                            borderRadius: '6px',
                                            cursor: 'pointer',
                                            fontWeight: 600,
                                            minWidth: '80px'
                                        }}
                                    >
                                        {executeMealMutation.isPending ? '...' : (item.done ? 'Undo' : 'Mark Done')}
                                    </button>
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>

            {/* Consumed Items (Temp & Liquid) */}
            <div className="plannedRecipesSection">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                    <h3 style={{ margin: 0 }}>Consumed Items</h3>
                    <button
                        onClick={() => setShowLiquidModal(true)}
                        style={{
                            background: '#3498db',
                            color: 'white',
                            border: 'none',
                            padding: '4px 12px',
                            borderRadius: '4px',
                            cursor: 'pointer',
                            fontSize: '13px'
                        }}
                    >
                        + Add Liquid
                    </button>
                </div>
                <div className="plannedRecipesList">
                    {/* Temp Items */}
                    {macrosSummary?.tempItems?.map((item: any) => (
                        <div key={`temp-${item.id}`} className="plannedRecipeCard" style={{ borderLeft: '4px solid #f1c40f' }}>
                            <div className="plannedRecipeInfo">
                                <strong>{item.name}</strong>
                                <span className="plannedRecipeMeta">
                                    {Math.round(item.calories)} cal · {item.protein}p {item.carbs}c {item.fat}f
                                </span>
                            </div>
                            <div className="plannedRecipeActions">
                                <span style={{ fontSize: '12px', color: '#888' }}>Temp Log</span>
                            </div>
                        </div>
                    ))}

                    {/* Liquid Events */}
                    {macrosSummary?.liquidEvents?.map((event: any) => (
                        <div key={`liquid-${event.id}`} className="plannedRecipeCard" style={{
                            borderLeft: event.is_refill ? '4px solid #2ecc71' : '4px solid #3498db',
                            opacity: event.is_refill ? 0.8 : 1
                        }}>
                            <div className="plannedRecipeInfo">
                                <strong>
                                    {event.product_name || 'Liquid'}
                                    {event.is_refill && <span style={{
                                        marginLeft: '8px',
                                        fontSize: '11px',
                                        background: '#2ecc71',
                                        color: 'white',
                                        padding: '2px 6px',
                                        borderRadius: '10px'
                                    }}>REFILL</span>}
                                </strong>
                                <span className="plannedRecipeMeta">
                                    {event.is_refill ? 'Added to container' : `${Math.round(event.consumed)}ml · ${Math.round(event.calories)} cal`}
                                </span>
                            </div>
                            <div className="plannedRecipeActions" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                <span style={{ fontSize: '12px', color: '#888' }}>
                                    {new Date(event.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                </span>
                                <button
                                    onClick={() => handleDeleteLiquid(event.id)}
                                    style={{
                                        background: 'none',
                                        border: 'none',
                                        cursor: 'pointer',
                                        color: '#e74c3c',
                                        padding: '4px',
                                        fontSize: '16px'
                                    }}
                                    title="Delete"
                                >
                                    ×
                                </button>
                            </div>
                        </div>
                    ))}

                    {(!macrosSummary?.tempItems?.length && !macrosSummary?.liquidEvents?.length) && (
                        <p style={{ color: '#666', fontStyle: 'italic' }}>No extra items consumed today</p>
                    )}
                </div>
            </div>
        </div>
    );
}
