import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { apiSupabase } from '../lib/api-supabase';
import dayjs from 'dayjs';

export default function MealPlan() {
    const queryClient = useQueryClient();
    const [selectedDate, setSelectedDate] = useState(dayjs().format('YYYY-MM-DD'));

    // Get current week
    const getWeekDates = (date: string) => {
        const current = dayjs(date);
        const week = [];
        const dayOfWeek = current.day();
        const mondayOffset = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
        const startOfWeek = current.add(mondayOffset, 'day');

        for (let i = 0; i < 7; i++) {
            week.push(startOfWeek.add(i, 'day'));
        }
        return week;
    };

    const weekDays = getWeekDates(selectedDate);
    const startDate = weekDays[0].format('YYYY-MM-DD');
    const endDate = weekDays[6].format('YYYY-MM-DD');

    const { data, isLoading } = useQuery({
        queryKey: ['mealPlan', startDate, endDate],
        queryFn: () => apiSupabase.getMealPlan(startDate, endDate),
    });

    const deleteMealMutation = useMutation({
        mutationFn: (id: number) => apiSupabase.deleteMealPlan(id),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['mealPlan'] });
        },
    });

    const getMealsForDay = (day: string) => {
        if (!data) return [];
        return data.filter((meal: any) => {
            const mealDate = meal.day?.split('T')[0] || meal.day;
            return mealDate === day;
        });
    };

    const goToPreviousWeek = () => {
        setSelectedDate(dayjs(selectedDate).subtract(7, 'day').format('YYYY-MM-DD'));
    };

    const goToNextWeek = () => {
        setSelectedDate(dayjs(selectedDate).add(7, 'day').format('YYYY-MM-DD'));
    };

    const goToToday = () => {
        setSelectedDate(dayjs().format('YYYY-MM-DD'));
    };

    const [isAddModalOpen, setIsAddModalOpen] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');
    const [searchType, setSearchType] = useState<'recipe' | 'product'>('recipe');
    const [searchResults, setSearchResults] = useState<any[]>([]);

    const searchMutation = useMutation({
        mutationFn: async () => {
            if (searchType === 'recipe') {
                const recipes = await apiSupabase.getRecipes();
                return recipes.filter((r: any) => r.name.toLowerCase().includes(searchTerm.toLowerCase()));
            } else {
                const products = await apiSupabase.getProducts();
                return products.filter((p: any) => p.name.toLowerCase().includes(searchTerm.toLowerCase()));
            }
        },
        onSuccess: (data) => {
            setSearchResults(data);
        }
    });

    const addMealMutation = useMutation({
        mutationFn: async (item: any) => {
            // We need to map to the correct API payload.
            // apiSupabase.addMealPlan expects { date, recipe_id, product_id, amount, unit_id? }
            // Let's check api-supabase.ts signature.
            // It takes `meal: Omit<MealPlan, 'id' | 'created_at'>`

            const payload: any = {
                day: selectedDate,
                amount: 1,
                type: searchType,
                // We need qu_id. For recipes, it's usually servings (which might not have a qu_id or use a default).
                // For products, use stock unit.
            };

            if (searchType === 'recipe') {
                payload.recipe_id = item.id;
            } else {
                payload.product_id = item.id;
                payload.qu_id = item.qu_id_stock; // Assuming we have this
            }

            return apiSupabase.createMealPlan(payload);
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['mealPlan'] });
            setIsAddModalOpen(false);
        },
        onError: (error) => {
            console.error('Failed to add meal:', error);
            alert('Failed to add meal. See console for details.');
        }
    });

    const handleSearch = (e: React.FormEvent) => {
        e.preventDefault();
        searchMutation.mutate();
    };

    if (isLoading) {
        return <div style={{ padding: '20px' }}>Loading meal plan...</div>;
    }

    return (
        <div style={{ padding: '20px' }}>
            {/* Header */}
            <div style={{ marginBottom: '20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <h1 style={{ margin: 0 }}>Meal Plan</h1>
                <div style={{ display: 'flex', gap: '8px' }}>
                    <button
                        onClick={() => setIsAddModalOpen(true)}
                        style={{
                            padding: '8px 16px',
                            background: '#27ae60',
                            color: '#fff',
                            border: 'none',
                            borderRadius: '6px',
                            cursor: 'pointer',
                            fontWeight: 600,
                        }}
                    >
                        Add Meal
                    </button>
                    <button
                        onClick={goToPreviousWeek}
                        style={{
                            padding: '8px 16px',
                            background: '#fff',
                            border: '1px solid #ddd',
                            borderRadius: '6px',
                            cursor: 'pointer',
                        }}
                    >
                        ← Previous Week
                    </button>
                    <button
                        onClick={goToToday}
                        style={{
                            padding: '8px 16px',
                            background: '#1e66f5',
                            color: '#fff',
                            border: 'none',
                            borderRadius: '6px',
                            cursor: 'pointer',
                            fontWeight: 600,
                        }}
                    >
                        Today
                    </button>
                    <button
                        onClick={goToNextWeek}
                        style={{
                            padding: '8px 16px',
                            background: '#fff',
                            border: '1px solid #ddd',
                            borderRadius: '6px',
                            cursor: 'pointer',
                        }}
                    >
                        Next Week →
                    </button>
                </div>
            </div>

            {/* Add Meal Modal */}
            {isAddModalOpen && (
                <div style={{
                    position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
                    background: 'rgba(0,0,0,0.5)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 1000
                }}>
                    <div style={{ background: '#fff', padding: '20px', borderRadius: '8px', width: '400px', maxHeight: '80vh', overflowY: 'auto' }}>
                        <h2>Add Meal</h2>
                        <div style={{ marginBottom: '15px' }}>
                            <label style={{ marginRight: '10px' }}>
                                <input
                                    type="radio"
                                    name="type"
                                    checked={searchType === 'recipe'}
                                    onChange={() => setSearchType('recipe')}
                                /> Recipe
                            </label>
                            <label>
                                <input
                                    type="radio"
                                    name="type"
                                    checked={searchType === 'product'}
                                    onChange={() => setSearchType('product')}
                                /> Product
                            </label>
                        </div>
                        <form onSubmit={handleSearch} style={{ display: 'flex', gap: '8px', marginBottom: '15px' }}>
                            <input
                                type="text"
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                placeholder="Search..."
                                style={{ flex: 1, padding: '8px', borderRadius: '4px', border: '1px solid #ddd' }}
                            />
                            <button type="submit" style={{ padding: '8px 16px', background: '#1e66f5', color: '#fff', border: 'none', borderRadius: '4px', cursor: 'pointer' }}>
                                Search
                            </button>
                        </form>

                        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                            {searchResults.map((item: any) => (
                                <div key={item.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px', border: '1px solid #eee', borderRadius: '4px' }}>
                                    <span>{item.name}</span>
                                    <button
                                        onClick={() => addMealMutation.mutate(item)}
                                        style={{ padding: '4px 8px', background: '#27ae60', color: '#fff', border: 'none', borderRadius: '4px', cursor: 'pointer' }}
                                    >
                                        Add
                                    </button>
                                </div>
                            ))}
                        </div>

                        <button
                            onClick={() => setIsAddModalOpen(false)}
                            style={{ marginTop: '20px', width: '100%', padding: '8px', background: '#eee', border: 'none', borderRadius: '4px', cursor: 'pointer' }}
                        >
                            Cancel
                        </button>
                    </div>
                </div>
            )}

            {/* Week Grid */}
            <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(7, 1fr)',
                gap: '12px',
                marginTop: '20px'
            }}>
                {weekDays.map((day) => {
                    const dateStr = day.format('YYYY-MM-DD');
                    const meals = getMealsForDay(dateStr);
                    const isToday = day.isSame(dayjs(), 'day');

                    return (
                        <div
                            key={dateStr}
                            style={{
                                background: isToday ? '#e8f4fd' : '#fff',
                                border: isToday ? '2px solid #1e66f5' : '1px solid #ddd',
                                borderRadius: '8px',
                                padding: '12px',
                                minHeight: '200px',
                                display: 'flex',
                                flexDirection: 'column',
                            }}
                        >
                            <div style={{
                                fontWeight: 600,
                                marginBottom: '12px',
                                paddingBottom: '8px',
                                borderBottom: '1px solid #eee',
                                color: isToday ? '#1e66f5' : '#111'
                            }}>
                                <div className="dayName">{day.format('ddd')}</div>
                                <div className="dayDate">{day.format('MMM D')}</div>
                                {isToday && <div style={{ fontSize: '0.8em', color: '#1890ff', fontWeight: 'bold' }}>TODAY</div>}
                            </div>

                            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', flex: 1 }}>
                                {meals.length > 0 ? (
                                    meals.map((meal: any) => {
                                        const product = meal.products;
                                        const recipe = meal.recipes;
                                        const entity = product || recipe;
                                        const name = entity?.name || 'Unknown';
                                        const type = meal.type === 'recipe' ? 'Recipe' : 'Product';
                                        const amount = meal.amount || 1;

                                        // Unit logic
                                        const unitName = meal.quantity_units?.name || meal.unit_name || 'servings';
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
                                            <div
                                                key={meal.id}
                                                style={{
                                                    background: '#f7f7f9',
                                                    padding: '8px',
                                                    borderRadius: '6px',
                                                    fontSize: '13px',
                                                    display: 'flex',
                                                    flexDirection: 'column',
                                                    gap: '4px',
                                                    position: 'relative',
                                                    border: '1px solid #eee'
                                                }}
                                            >
                                                <div style={{ paddingRight: '20px' }}>
                                                    <div style={{ fontWeight: 600, lineHeight: '1.2' }}>
                                                        {name}
                                                    </div>
                                                    <div style={{
                                                        fontSize: '11px',
                                                        color: '#666',
                                                        marginTop: '2px',
                                                        display: 'flex',
                                                        alignItems: 'center',
                                                        gap: '6px'
                                                    }}>
                                                        <span style={{ background: '#eee', padding: '1px 4px', borderRadius: '3px' }}>{type}</span>
                                                        <span>{amount} {unitName}</span>
                                                    </div>
                                                </div>

                                                <div style={{
                                                    fontSize: '11px',
                                                    color: '#555',
                                                    display: 'flex',
                                                    flexWrap: 'wrap',
                                                    gap: '6px',
                                                    marginTop: '2px'
                                                }}>
                                                    <span>🔥{cals}</span>
                                                    <span>🥩{protein}</span>
                                                    <span>🍞{carbs}</span>
                                                    <span>🥑{fat}</span>
                                                </div>

                                                {product && price > 0 && (
                                                    <div style={{ fontSize: '11px', fontWeight: 600, color: '#27ae60' }}>
                                                        ${price.toFixed(2)}
                                                    </div>
                                                )}

                                                <button
                                                    onClick={() => deleteMealMutation.mutate(meal.id)}
                                                    style={{
                                                        position: 'absolute',
                                                        top: '4px',
                                                        right: '4px',
                                                        padding: '2px 6px',
                                                        background: '#d33',
                                                        color: '#fff',
                                                        border: 'none',
                                                        borderRadius: '3px',
                                                        cursor: 'pointer',
                                                        fontSize: '12px',
                                                        opacity: 0.8
                                                    }}
                                                    title="Remove"
                                                >
                                                    ×
                                                </button>
                                            </div>
                                        );
                                    })
                                ) : (
                                    <div style={{ textAlign: 'center', color: '#999', fontSize: '13px', padding: '20px 0' }}>
                                        No meals planned
                                    </div>
                                )}
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
}
