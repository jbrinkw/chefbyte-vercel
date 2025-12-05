import { useState, useEffect, useRef, useCallback } from 'react';
import { apiSupabase } from '../lib/api-supabase';
import { useScannerDetection } from '../hooks/useScannerDetection';
import './Scanner.css';

// Barcode scanner detection constants


interface QueueItem {
    id: string;
    barcode: string;
    name: string;
    productId?: number;
    status: 'success' | 'pending' | 'error';
    action: 'purchase' | 'consume' | 'shopping';
    timestamp: number;
    quantity: number;
    savedQuantity: number;
    error?: string;
    isMealPlanItem?: boolean;
    stockBefore?: number;
    stockAfter?: number;
    servingsPerContainer?: number;
    unitUsed?: 'servings' | 'containers';
    nutrition?: {
        calories: number;
        carbs: number;
        fats: number;
        protein: number;
    };
    isRed?: boolean;
    relatedId?: number; // ID of the created stock item or shopping list item
    locationId?: number;
    expiryDate?: string;
    mealPlanId?: number;
}

export default function Scanner() {
    const [mode, setMode] = useState<'purchase' | 'consume' | 'shopping'>('purchase');
    const [queue, setQueue] = useState<QueueItem[]>([]);
    const [screenValue, setScreenValue] = useState('1');
    const [unitMode, setUnitMode] = useState<'servings' | 'containers'>('servings');
    const [nutritionData, setNutritionData] = useState({
        servings: '',
        calories: '',
        carbs: '',
        fats: '',
        protein: '',
    });
    const [showNutrition, setShowNutrition] = useState(false);
    const [overwriteOnNextDigit, setOverwriteOnNextDigit] = useState(false);
    const [originalMacros, setOriginalMacros] = useState<{ calories: number; carbs: number; fats: number; protein: number } | null>(null);

    // Parity Features State
    const [mealPlanEnabled, setMealPlanEnabled] = useState(false);
    const [filter, setFilter] = useState<'all' | 'new'>('all');
    const [deleteConfirmMap, setDeleteConfirmMap] = useState<Record<string, boolean>>({});
    const [_debugStatus, _setDebugStatus] = useState<string>('');

    const barcodeInputRef = useRef<HTMLInputElement>(null);

    const [activeItemId, setActiveItemId] = useState<string | null>(null);
    const saveTimerRef = useRef<NodeJS.Timeout | null>(null);

    // Ref to track queue for effects without triggering them
    const queueRef = useRef(queue);
    useEffect(() => { queueRef.current = queue; }, [queue]);

    // Barcode scanner detection state (using refs to avoid re-renders)


    // Sound effect
    const beepBad = useCallback(() => {
        try {
            const AC = window.AudioContext || (window as any).webkitAudioContext;
            if (!AC) return;
            const ctx = new AC();
            const osc = ctx.createOscillator();
            const gain = ctx.createGain();
            osc.type = 'square';
            osc.frequency.value = 330;
            gain.gain.value = 0.08;
            osc.connect(gain);
            gain.connect(ctx.destination);
            osc.start();
            setTimeout(() => { osc.stop(); ctx.close(); }, 180);
        } catch (e) {
            console.error('Audio error', e);
        }
    }, []);

    const handleNutritionChange = (field: keyof typeof nutritionData, value: string) => {
        const newData = { ...nutritionData, [field]: value };

        if (field === 'calories' && originalMacros) {
            const newCals = parseFloat(value) || 0;
            const oldCals = originalMacros.calories || 1;
            if (oldCals > 0 && newCals > 0) {
                const ratio = newCals / oldCals;
                newData.carbs = (Math.round((originalMacros.carbs * ratio) * 10) / 10).toString();
                newData.fats = (Math.round((originalMacros.fats * ratio) * 10) / 10).toString();
                newData.protein = (Math.round((originalMacros.protein * ratio) * 10) / 10).toString();
            }
        } else if (['carbs', 'fats', 'protein'].includes(field)) {
            const c = parseFloat(newData.carbs) || 0;
            const f = parseFloat(newData.fats) || 0;
            const p = parseFloat(newData.protein) || 0;
            newData.calories = Math.round((c * 4) + (p * 4) + (f * 9)).toString();
        }

        setNutritionData(newData);
    };

    const addToQueue = (item: QueueItem) => {
        setQueue(prev => [item, ...prev]);
    };

    const updateQueueItem = (id: string, updates: Partial<QueueItem>) => {
        setQueue(prev => prev.map(item => item.id === id ? { ...item, ...updates } : item));
    };

    const saveItem = useCallback(async (item: QueueItem) => {
        if (saveTimerRef.current) clearTimeout(saveTimerRef.current);

        saveTimerRef.current = setTimeout(async () => {
            try {
                let result;

                if (item.action === 'purchase') {
                    // Purchase mode: Keypad edits servingsPerContainer (master data)
                    // We do NOT update stock here (stock was added on initial scan)
                    const newServings = parseFloat(nutritionData.servings) || 1;
                    // We only update if we have a product ID (which we don't store in QueueItem yet, but let's assume we can get it or it's on the item object if we extended it)
                    // For now, we'll try to update using the barcode lookup in the backend if needed, or just log it.
                    // Ideally QueueItem should have product_id.
                    console.log('Updating servings per container to', newServings);
                    // TODO: Call apiSupabase.updateProductServings(item.product_id, newServings)
                    // For now, just update local state
                    // Update local state including nutrition for immediate feedback
                    updateQueueItem(item.id, {
                        servingsPerContainer: newServings,
                        nutrition: {
                            calories: parseFloat(nutritionData.calories) || 0,
                            carbs: parseFloat(nutritionData.carbs) || 0,
                            fats: parseFloat(nutritionData.fats) || 0,
                            protein: parseFloat(nutritionData.protein) || 0
                        }
                    });

                    if (item.productId) {
                        console.log('Updating master data for product', item.productId);
                        const updates: any = { num_servings: newServings };

                        // Also update macros if they exist
                        if (nutritionData.calories) updates.calories_per_serving = parseFloat(nutritionData.calories);
                        if (nutritionData.carbs) updates.carbs_per_serving = parseFloat(nutritionData.carbs);
                        if (nutritionData.fats) updates.fat_per_serving = parseFloat(nutritionData.fats);
                        if (nutritionData.protein) updates.protein_per_serving = parseFloat(nutritionData.protein);

                        await apiSupabase.updateProduct(item.productId, updates);
                    }
                } else if (item.action === 'consume') {
                    // Consume mode: Keypad edits quantity consumed
                    const currentVal = item.quantity;
                    const savedVal = item.savedQuantity;

                    // Convert everything to servings for comparison/meal plan
                    const spc = item.servingsPerContainer || 1;
                    const currentServings = item.unitUsed === 'containers' ? currentVal * spc : currentVal;
                    const savedServings = item.unitUsed === 'containers' ? savedVal * spc : savedVal;

                    const diffServings = currentServings - savedServings;

                    // Handle Meal Plan Updates (Always update if enabled, regardless of diff)
                    if (mealPlanEnabled) {
                        const unitName = item.unitUsed === 'containers' ? 'Container' : 'Serving';

                        if (item.mealPlanId) {
                            // Update existing entry with NEW TOTAL quantity and unit
                            await apiSupabase.updateMealPlanItem(item.mealPlanId, {
                                amount: item.quantity,
                                unitName: unitName
                            });
                        } else if (diffServings > 0) {
                            // No ID yet, create new entry (only if we are adding)
                            // Note: handleBarcodeSubmit creates the initial entry. 
                            // This case handles if we deleted it or something else happened, 
                            // or if we are just increasing quantity on an item that somehow missed the initial add.
                            const today = new Date().toISOString().split('T')[0];
                            const mpResult = await apiSupabase.addConsumedItemToMealPlan(item.barcode, item.quantity, today, unitName);
                            updateQueueItem(item.id, { mealPlanId: mpResult.id });
                        }
                    }

                    if (diffServings !== 0) {
                        // Convert diff to containers for stock update
                        const diffContainers = diffServings / spc;

                        if (diffServings > 0) {
                            // Consume more -> Remove from stock
                            result = await apiSupabase.scanRemove(item.barcode, diffContainers);
                        } else {
                            // Consume less -> Add back to stock
                            result = await apiSupabase.scanAdd(item.barcode, Math.abs(diffContainers));
                        }

                        updateQueueItem(item.id, { savedQuantity: currentVal });
                    }
                } else if (item.action === 'shopping') {
                    const diff = item.quantity - item.savedQuantity;
                    if (diff !== 0) {
                        await apiSupabase.scanAddToShopping(item.barcode, diff);
                        updateQueueItem(item.id, { savedQuantity: item.quantity });
                    }
                }

                // Update stock display if result available
                if (result) {
                    const r = result as any;
                    const currentStock = r.newStockAmount !== undefined ? r.newStockAmount : (r.stock?.amount || 0);
                    updateQueueItem(item.id, {
                        stockAfter: currentStock,
                        stockBefore: item.action === 'consume' ? currentStock + (item.quantity * (item.unitUsed === 'containers' ? (item.servingsPerContainer || 1) : 1) / (item.servingsPerContainer || 1)) : currentStock
                    });
                }

            } catch (err) {
                console.error('Save error:', err);
                beepBad();
            }
        }, 1000);
    }, [mealPlanEnabled, nutritionData]);

    // Auto-save when nutrition data changes (debounced)
    useEffect(() => {
        if (activeItemId && mode === 'purchase') {
            const item = queueRef.current.find(i => i.id === activeItemId);
            if (item) {
                saveItem(item);
            }
        }
    }, [nutritionData, activeItemId, mode, saveItem]);

    const handleBarcodeSubmit = async (barcode: string) => {
        if (!barcode) return;

        const amount = parseFloat(screenValue) || 1;
        const tempId = Date.now().toString() + Math.random().toString(36).substr(2, 9);

        // Add pending item to queue immediately
        const newItem: QueueItem = {
            id: tempId,
            barcode,
            name: `Processing ${barcode}...`,
            status: 'pending',
            action: mode,
            timestamp: Date.now(),
            quantity: amount,
            savedQuantity: amount,
            unitUsed: unitMode,
            isRed: false // Default to false, will update based on result
        };
        addToQueue(newItem);
        setActiveItemId(tempId); // Auto-select new item

        // Clear inputs immediately for next scan
        if (barcodeInputRef.current) {
            barcodeInputRef.current.value = '';
        }
        setScreenValue('1');
        setOverwriteOnNextDigit(true); // Ensure next keypad press replaces value

        try {
            let result: any;
            let createdMealPlanId: number | undefined;

            if (mode === 'shopping') {
                result = await apiSupabase.scanAddToShopping(barcode, amount);
            } else if (mode === 'consume') {
                // For consume, we use scanRemove
                result = await apiSupabase.scanRemove(barcode, amount);

                // Add to meal plan if enabled
                if (mealPlanEnabled) {
                    try {
                        const date = new Date().toISOString().split('T')[0];
                        const unitName = unitMode === 'containers' ? 'Container' : 'Serving';
                        const mpResult = await apiSupabase.addConsumedItemToMealPlan(barcode, amount, date, unitName);
                        createdMealPlanId = mpResult.id;
                    } catch (err) {
                        console.error('Failed to add to meal plan', err);
                    }
                }
            } else {
                // Purchase mode
                result = await apiSupabase.scanAdd(barcode, amount, {
                    servings: nutritionData.servings ? parseFloat(nutritionData.servings) : undefined,
                    calories: nutritionData.calories ? parseFloat(nutritionData.calories) : undefined,
                    carbs: nutritionData.carbs ? parseFloat(nutritionData.carbs) : undefined,
                    fats: nutritionData.fats ? parseFloat(nutritionData.fats) : undefined,
                    protein: nutritionData.protein ? parseFloat(nutritionData.protein) : undefined,
                });
            }

            console.log('DEBUG: scanAdd result:', result);

            // Update queue item with result
            setQueue(prev => {
                console.log(`DEBUG: Updating queue. tempId=${tempId} result=${JSON.stringify(result)}`);
                return prev.map(item => {
                    if (item.id === tempId) {
                        console.log(`DEBUG: Found item ${item.id}. Setting isRed=${result.created}`);
                        let productName = item.name;
                        if (result.product) {
                            productName = result.product.name;
                        } else if (result.shoppingItem) {
                            productName = result.shoppingItem.note || result.product?.name;
                        }

                        // Update nutrition if available
                        if (result.product) {
                            setNutritionData({
                                servings: result.product.num_servings?.toString() || '1',
                                calories: result.product.calories_per_serving?.toString() || '',
                                carbs: result.product.carbs_per_serving?.toString() || '',
                                fats: result.product.fat_per_serving?.toString() || '',
                                protein: result.product.protein_per_serving?.toString() || ''
                            });
                        }

                        // Extract location and expiry
                        let locationId: number | undefined;
                        let expiryDate: string | undefined;

                        if (result.stock) {
                            locationId = result.stock.location_id;
                            if (result.stock.best_before_date) {
                                expiryDate = result.stock.best_before_date.split('T')[0];
                            }
                        }
                        if (!locationId && result.product) {
                            locationId = result.product.location_id;
                        }
                        // Calculate expiry if not set but default exists
                        if (!expiryDate && result.product && result.product.default_best_before_days) {
                            const date = new Date();
                            date.setDate(date.getDate() + result.product.default_best_before_days);
                            expiryDate = date.toISOString().split('T')[0];
                        }

                        // Calculate stockBefore for consume
                        let stockBefore = undefined;
                        if (mode === 'consume' && result.stock?.amount !== undefined) {
                            // stockBefore = current stock + consumed amount
                            // Assuming unitUsed is containers for now, or we need to convert
                            // scanRemove takes amount in containers (or whatever unit stock is tracked in)
                            stockBefore = result.stock.amount + amount;
                        }

                        return {
                            ...item,
                            status: 'success',
                            name: productName,
                            stockAfter: result.stock?.amount, // Update stock level
                            stockBefore,
                            nutrition: result.product && {
                                calories: result.product.calories_per_serving || parseFloat(nutritionData.calories) || 0,
                                carbs: result.product.carbs_per_serving || parseFloat(nutritionData.carbs) || 0,
                                fats: result.product.fat_per_serving || parseFloat(nutritionData.fats) || 0,
                                protein: result.product.protein_per_serving || parseFloat(nutritionData.protein) || 0
                            },
                            productId: result.product?.id,
                            isRed: result.created, // Only mark red if it was a newly created product
                            relatedId: result.stock?.id || result.shoppingItem?.id, // Store related ID for undo
                            locationId,
                            expiryDate,
                            mealPlanId: createdMealPlanId || item.mealPlanId,
                            isMealPlanItem: !!createdMealPlanId || item.isMealPlanItem
                        };
                    }
                    return item;
                });
            });
        } catch (error: any) {
            console.error('Scan failed:', error);
            beepBad(); // Play error sound
            setQueue(prev => prev.map(item => {
                if (item.id === tempId) {
                    return {
                        ...item,
                        status: 'error',
                        name: `Error: ${error.message || 'Unknown error'}`,
                        isRed: true // Mark errors as red too? Or just keep error status.
                    };
                }
                return item;
            }));
        }
    };

    const handleDelete = async (e: React.MouseEvent, item: QueueItem) => {
        e.stopPropagation(); // Prevent row selection

        if (!deleteConfirmMap[item.id]) {
            // First click: Show confirm
            setDeleteConfirmMap(prev => ({ ...prev, [item.id]: true }));
            return;
        }

        // Second click: Execute delete/undo
        try {
            if (item.action === 'purchase') {
                // Undo purchase: Remove stock
                // If we have relatedId (stock ID), we could delete it directly, but scanRemove is safer for now
                // Actually, scanRemove removes by barcode amount.
                await apiSupabase.scanRemove(item.barcode, item.quantity);
            } else if (item.action === 'consume') {
                // Undo consume: Add stock back
                // We need to add back the *consumed amount* (savedQuantity), not necessarily the current edited quantity
                // But wait, scanAdd adds by *containers* or *servings*?
                // scanAdd takes amount. If unitUsed was 'servings', we need to convert back?
                // Actually, scanAdd adds stock amount (containers).

                // If we consumed 1 container, we add 1 container back.
                // If we consumed 5 servings, and spc=5, we add 1 container back.

                const amountToRestore = item.savedQuantity; // This is what was actually processed
                const spc = item.servingsPerContainer || 1;
                const containersToRestore = item.unitUsed === 'containers' ? amountToRestore : (amountToRestore / spc);

                await apiSupabase.scanAdd(item.barcode, containersToRestore);
            } else if (item.action === 'shopping') {
                // Undo shopping: Delete item if we have ID, or remove amount
                if (item.relatedId) {
                    await apiSupabase.deleteShoppingItem(item.relatedId);
                } else {
                    // Fallback if no ID (shouldn't happen for new items)
                    // Just ignore for now or try to remove amount
                }
            }

            // Remove from queue
            setQueue(prev => prev.filter(i => i.id !== item.id));
            if (activeItemId === item.id) {
                setActiveItemId(null);
                setNutritionData({ servings: '', calories: '', carbs: '', fats: '', protein: '' });
                setShowNutrition(false);
            }
        } catch (err) {
            console.error('Failed to delete item', err);
            beepBad();
        }
    };

    // Global barcode scanner detector
    useScannerDetection({
        onBarcodeScanned: (barcode) => handleBarcodeSubmit(barcode),
        protectedInputs: ['barcodeInput', 'servings', 'calories', 'carbs', 'fats', 'protein']
    });

    useEffect(() => {
        setShowNutrition(mode === 'purchase');
        if (mode === 'purchase' || mode === 'shopping') {
            setUnitMode('containers');
        } else {
            setUnitMode(mealPlanEnabled ? 'servings' : 'containers');
        }
    }, [mode, mealPlanEnabled]);

    const handleKeypadClick = (value: string) => {
        if (activeItemId) {
            const item = queue.find(i => i.id === activeItemId);
            if (!item) return;

            if (item.action === 'purchase') {
                let newServings = nutritionData.servings;
                if (value === '←') {
                    newServings = newServings.slice(0, -1) || '';
                    setOverwriteOnNextDigit(false);
                } else if (value === '.') {
                    if (overwriteOnNextDigit) {
                        newServings = '0.';
                        setOverwriteOnNextDigit(false);
                    } else if (!newServings.includes('.')) {
                        newServings += '.';
                    }
                } else {
                    if (overwriteOnNextDigit) {
                        newServings = value;
                        setOverwriteOnNextDigit(false);
                    } else {
                        newServings = (newServings === '0' || newServings === '' ? value : newServings + value);
                    }
                }
                setNutritionData(prev => ({ ...prev, servings: newServings }));
                saveItem({ ...item });
            } else if (item.action === 'consume' || item.action === 'shopping') {
                let newVal = item.quantity.toString();
                if (value === '←') {
                    newVal = newVal.slice(0, -1) || '0';
                    setOverwriteOnNextDigit(false);
                } else if (value === '.') {
                    if (overwriteOnNextDigit) {
                        newVal = '0.';
                        setOverwriteOnNextDigit(false);
                    } else if (!newVal.includes('.')) {
                        newVal += '.';
                    }
                } else {
                    if (overwriteOnNextDigit) {
                        newVal = value;
                        setOverwriteOnNextDigit(false);
                    } else {
                        newVal = newVal === '0' ? value : newVal + value;
                    }
                }

                const quantity = parseFloat(newVal);
                // Only update if valid number
                if (!isNaN(quantity)) {
                    updateQueueItem(item.id, { quantity });
                    // Trigger saveItem logic for consume/shopping updates
                    saveItem({ ...item, quantity });
                }
            }
        } else {
            // Screen input logic
            if (value === '←') {
                setScreenValue(prev => prev.slice(0, -1) || '0');
                setOverwriteOnNextDigit(false);
            } else if (value === '.') {
                if (overwriteOnNextDigit) {
                    setScreenValue('0.');
                    setOverwriteOnNextDigit(false);
                } else if (!screenValue.includes('.')) {
                    setScreenValue(prev => prev + '.');
                }
            } else {
                if (overwriteOnNextDigit) {
                    setScreenValue(value);
                    setOverwriteOnNextDigit(false);
                } else {
                    setScreenValue(prev => (prev === '0' ? value : prev + value));
                }
            }
        }
    };

    const filteredQueue = queue.filter(item => {
        if (filter === 'all') return true;
        return item.isRed;
    });

    return (
        <div className="scanner-container">
            <div className="panel queuePanel">
                <div className="queueHeader">
                    <input
                        ref={barcodeInputRef}
                        id="barcodeInput"
                        type="text"
                        placeholder="Scan or type barcode and press Enter"
                        onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                                e.preventDefault();
                                handleBarcodeSubmit(e.currentTarget.value);
                            }
                        }}
                    />
                </div>
                {_debugStatus && <div id="debug-status" style={{ padding: '10px', background: '#eee', color: 'red', fontWeight: 'bold' }}>{_debugStatus}</div>}
                <div className="logHeader">
                    <div className="logFilterButtons">
                        <button
                            className={`modeBtn small ${filter === 'all' ? 'active' : ''}`}
                            onClick={() => setFilter('all')}
                        >
                            All
                        </button>
                        <button
                            className={`modeBtn small ${filter === 'new' ? 'active' : ''}`}
                            onClick={() => setFilter('new')}
                        >
                            New
                        </button>
                    </div>
                </div>
                <div className="queueList">
                    {filteredQueue.length === 0 ? (
                        <div style={{ padding: '20px', textAlign: 'center', color: '#666' }}>
                            {filter === 'new' ? 'No new items' : 'Ready to scan...'}
                        </div>
                    ) : (
                        filteredQueue.map((item) => {
                            console.log(`DEBUG: Render item ${item.barcode} isRed=${item.isRed}`);
                            let details: React.ReactNode = null;
                            let right: React.ReactNode = null;
                            let badge: React.ReactNode = null;

                            const isConfirming = deleteConfirmMap[item.id];

                            if (item.action === 'purchase') {
                                const amount = item.quantity || 1;
                                const unit = amount === 1 ? 'container' : 'containers';
                                const spc = item.servingsPerContainer || 1;

                                let nutritionText = ' ✏️ Edit Nutrition';
                                if (item.nutrition && (item.nutrition.calories || item.nutrition.carbs || item.nutrition.fats || item.nutrition.protein)) {
                                    nutritionText = ` | Cal: ${item.nutrition.calories} C: ${item.nutrition.carbs}g F: ${item.nutrition.fats}g P: ${item.nutrition.protein}g`;
                                }

                                details = (
                                    <>
                                        Purchased: {amount} {unit} | {spc} servings/container
                                        <span style={{ color: '#666' }}>{nutritionText}</span>
                                        <button
                                            className="deleteBtn"
                                            onClick={(e) => handleDelete(e, item)}
                                            style={{
                                                marginLeft: '10px',
                                                background: isConfirming ? '#d33' : 'transparent',
                                                color: isConfirming ? 'white' : '#999',
                                                border: isConfirming ? 'none' : '1px solid #ddd',
                                                borderRadius: '4px',
                                                padding: '2px 6px',
                                                cursor: 'pointer',
                                                fontSize: '0.8em'
                                            }}
                                        >
                                            {isConfirming ? 'Confirm?' : '🗑️'}
                                        </button>
                                    </>
                                );

                                if (item.isRed) {
                                    badge = <span className="badge new">NEW</span>;
                                }

                                right = `Stock: ${item.stockAfter !== undefined ? Math.round(item.stockAfter * 100) / 100 : '—'}`;
                            } else if (item.action === 'consume') {
                                const amount = item.quantity || 1;
                                const unitUsed = item.unitUsed || 'servings';
                                const unit = amount === 1 ? unitUsed.slice(0, -1) : unitUsed;

                                let stockText = '';
                                if (item.stockBefore !== undefined && item.stockAfter !== undefined) {
                                    stockText = ` | Stock: ${Math.round(item.stockBefore * 100) / 100} → ${Math.round(item.stockAfter * 100) / 100}`;
                                } else if (item.stockAfter !== undefined) {
                                    // Fallback if stockBefore missing
                                    stockText = ` | Stock: ${Math.round(item.stockAfter * 100) / 100}`;
                                }

                                details = (
                                    <>
                                        Consumed: {amount} {unit}
                                        <span style={{ color: '#666' }}>{stockText}</span>
                                        <button
                                            className="deleteBtn"
                                            onClick={(e) => handleDelete(e, item)}
                                            style={{
                                                marginLeft: '10px',
                                                background: isConfirming ? '#d33' : 'transparent',
                                                color: isConfirming ? 'white' : '#999',
                                                border: isConfirming ? 'none' : '1px solid #ddd',
                                                borderRadius: '4px',
                                                padding: '2px 6px',
                                                cursor: 'pointer',
                                                fontSize: '0.8em'
                                            }}
                                        >
                                            {isConfirming ? 'Confirm?' : '🗑️'}
                                        </button>
                                    </>
                                );

                                if (item.isMealPlanItem) {
                                    badge = <span className="badge mp">MP</span>;
                                }

                                right = `${amount} ${unit}`;
                            } else if (item.action === 'shopping') {
                                const diff = (item.quantity || 0) - (item.savedQuantity || 0);
                                const absDiff = Math.abs(diff);
                                const unit = absDiff === 1 ? 'container' : 'containers';
                                let text = `0 containers`;
                                if (diff > 0) text = `Added: ${absDiff} ${unit}`;
                                else if (diff < 0) text = `Removed: ${absDiff} ${unit}`;

                                details = (
                                    <>
                                        {text}
                                        <button
                                            className="deleteBtn"
                                            onClick={(e) => handleDelete(e, item)}
                                            style={{
                                                marginLeft: '10px',
                                                background: isConfirming ? '#d33' : 'transparent',
                                                color: isConfirming ? 'white' : '#999',
                                                border: isConfirming ? 'none' : '1px solid #ddd',
                                                borderRadius: '4px',
                                                padding: '2px 6px',
                                                cursor: 'pointer',
                                                fontSize: '0.8em'
                                            }}
                                        >
                                            {isConfirming ? 'Confirm?' : '🗑️'}
                                        </button>
                                    </>
                                );
                                right = `${item.quantity} ${item.quantity === 1 ? 'container' : 'containers'} in shopping list`;
                            }

                            return (
                                <div
                                    key={item.id}
                                    className={`queueItem ${item.isRed ? 'red' : ''} ${activeItemId === item.id ? 'active' : ''}`}
                                    onClick={async () => {
                                        setActiveItemId(item.id);
                                        setOverwriteOnNextDigit(true);
                                        if (item.isRed) updateQueueItem(item.id, { isRed: false });

                                        // Load nutrition data if in purchase mode
                                        if (item.action === 'purchase') {
                                            try {
                                                // Try to get product ID from barcode if not present
                                                const product = await apiSupabase.getProductByBarcode(item.barcode) as any;
                                                if (product) {
                                                    const macros = {
                                                        calories: parseFloat(product.calories_per_serving) || 0,
                                                        carbs: parseFloat(product.carbs_per_serving) || 0,
                                                        fats: parseFloat(product.fat_per_serving) || 0,
                                                        protein: parseFloat(product.protein_per_serving) || 0,
                                                    };
                                                    setOriginalMacros(macros);
                                                    setNutritionData({
                                                        servings: (item.servingsPerContainer || product.num_servings || 1).toString(),
                                                        calories: macros.calories.toString(),
                                                        carbs: macros.carbs.toString(),
                                                        fats: macros.fats.toString(),
                                                        protein: macros.protein.toString(),
                                                    });
                                                } else if (item.nutrition) {
                                                    // Fallback to item nutrition if product fetch fails
                                                    setNutritionData({
                                                        servings: (item.servingsPerContainer || 1).toString(),
                                                        calories: (item.nutrition.calories || 0).toString(),
                                                        carbs: (item.nutrition.carbs || 0).toString(),
                                                        fats: (item.nutrition.fats || 0).toString(),
                                                        protein: (item.nutrition.protein || 0).toString(),
                                                    });
                                                }
                                            } catch (e) {
                                                console.error('Failed to load nutrition data', e);
                                                // Fallback on error too
                                                if (item.nutrition) {
                                                    setNutritionData({
                                                        servings: (item.servingsPerContainer || 1).toString(),
                                                        calories: (item.nutrition.calories || 0).toString(),
                                                        carbs: (item.nutrition.carbs || 0).toString(),
                                                        fats: (item.nutrition.fats || 0).toString(),
                                                        protein: (item.nutrition.protein || 0).toString(),
                                                    });
                                                }
                                            }
                                        }

                                        if (item.status === 'pending') {
                                            const newName = prompt('Enter product name:', item.name);
                                            if (newName) {
                                                updateQueueItem(item.id, { name: newName, status: 'success' });
                                            }
                                        }
                                    }}
                                >
                                    <div className="name">{item.name}</div>
                                    <div className="details">
                                        {details} {badge}
                                        {item.error && <span style={{ color: 'red' }}> • {item.error}</span>}
                                    </div>
                                    <div className="right">{right}</div>
                                </div>
                            );
                        })
                    )}
                </div>
            </div>

            <div className="panel keypadPanel">
                <button
                    className="actionBtn mealPlanToggle"
                    data-enabled={mealPlanEnabled}
                    onClick={() => {
                        const newState = !mealPlanEnabled;
                        setMealPlanEnabled(newState);
                        if (newState) setMode('consume');
                    }}
                    style={{
                        marginBottom: '10px',
                        background: mealPlanEnabled ? '#2f9e44' : '#d33',
                        color: 'white',
                        border: 'none',
                        padding: '10px',
                        borderRadius: '6px',
                        cursor: 'pointer',
                        fontWeight: 'bold'
                    }}
                    title={mealPlanEnabled ? "Enabled: Consuming adds to meal plan" : "Disabled: Consuming does not add to meal plan"}
                >
                    Consume: Add to Meal Plan
                </button>

                <div className="modeButtons">
                    <button
                        className={`modeBtn ${mode === 'purchase' ? 'active' : ''}`}
                        onClick={() => setMode('purchase')}
                    >
                        Purchase
                    </button>
                    <button
                        className={`modeBtn ${mode === 'consume' ? 'active' : ''}`}
                        onClick={() => setMode('consume')}
                    >
                        Consume
                    </button>
                    <button
                        className={`modeBtn ${mode === 'shopping' ? 'active' : ''}`}
                        onClick={() => setMode('shopping')}
                    >
                        Add to Shopping
                    </button>
                </div>

                <div className="activeBar">
                    <div className="activeName">
                        {queue.length > 0 ? queue[0].name : 'No item selected'}
                    </div>
                </div>

                <div className="screen">
                    <input
                        type="text"
                        value={screenValue}
                        readOnly
                        className="screenInput"
                    />
                    <div className="units">{unitMode}</div>
                </div>

                {showNutrition && (
                    <div className="nutritionEditorForm">
                        <div className="nutritionGrid">
                            <div className="nutritionField">
                                <label>Servings/Container</label>
                                <input
                                    type="text"
                                    inputMode="decimal"
                                    value={nutritionData.servings}
                                    onChange={(e) => setNutritionData(prev => ({ ...prev, servings: e.target.value }))}
                                />
                            </div>
                            <div className="nutritionField">
                                <label>Calories/Serving</label>
                                <input
                                    type="text"
                                    inputMode="decimal"
                                    value={nutritionData.calories}
                                    onChange={(e) => handleNutritionChange('calories', e.target.value)}
                                />
                            </div>
                            <div className="nutritionField">
                                <label>Carbs (g)</label>
                                <input
                                    type="text"
                                    inputMode="decimal"
                                    value={nutritionData.carbs}
                                    onChange={(e) => handleNutritionChange('carbs', e.target.value)}
                                />
                            </div>
                            <div className="nutritionField">
                                <label>Fats (g)</label>
                                <input
                                    type="text"
                                    inputMode="decimal"
                                    value={nutritionData.fats}
                                    onChange={(e) => handleNutritionChange('fats', e.target.value)}
                                />
                            </div>
                            <div className="nutritionField">
                                <label>Protein (g)</label>
                                <input
                                    type="text"
                                    inputMode="decimal"
                                    value={nutritionData.protein}
                                    onChange={(e) => handleNutritionChange('protein', e.target.value)}
                                />
                            </div>
                        </div>
                    </div>
                )}

                <div className="keysGrid">
                    {['7', '8', '9', '4', '5', '6', '1', '2', '3', '.', '0', '←'].map((key) => (
                        <button
                            key={key}
                            className={`key ${key === '←' ? 'op' : ''}`}
                            onClick={() => handleKeypadClick(key)}
                        >
                            {key}
                        </button>
                    ))}
                    <button
                        className="key unitToggle"
                        disabled={mode !== 'consume'}
                        onClick={() => {
                            const newMode = unitMode === 'servings' ? 'containers' : 'servings';
                            setUnitMode(newMode);

                            // Convert active item if exists
                            if (activeItemId) {
                                const item = queue.find(i => i.id === activeItemId);
                                if (item && item.action === 'consume') {
                                    const spc = item.servingsPerContainer || 1;
                                    let newQuantity = item.quantity;

                                    if (newMode === 'servings' && item.unitUsed === 'containers') {
                                        // Containers -> Servings
                                        newQuantity = item.quantity * spc;
                                    } else if (newMode === 'containers' && item.unitUsed === 'servings') {
                                        // Servings -> Containers
                                        newQuantity = item.quantity / spc;
                                    }

                                    // Round to 2 decimals to avoid float errors
                                    newQuantity = Math.round(newQuantity * 100) / 100;

                                    // Also convert savedQuantity so diff remains 0 (if we haven't changed quantity)
                                    let newSavedQuantity = item.savedQuantity;
                                    if (newMode === 'servings' && item.unitUsed === 'containers') {
                                        newSavedQuantity = item.savedQuantity * spc;
                                    } else if (newMode === 'containers' && item.unitUsed === 'servings') {
                                        newSavedQuantity = item.savedQuantity / spc;
                                    }
                                    newSavedQuantity = Math.round(newSavedQuantity * 100) / 100;

                                    updateQueueItem(item.id, {
                                        unitUsed: newMode,
                                        quantity: newQuantity,
                                        savedQuantity: newSavedQuantity
                                    });
                                    setScreenValue(newQuantity.toString());

                                    saveItem({
                                        ...item,
                                        unitUsed: newMode,
                                        quantity: newQuantity,
                                        savedQuantity: newSavedQuantity
                                    });
                                }
                            }
                        }}
                    >
                        {unitMode === 'servings' ? 'Servings' : 'Containers'}
                    </button>
                </div>
            </div>
        </div >
    );
}
