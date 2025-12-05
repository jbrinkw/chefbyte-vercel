import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { apiSupabase } from '../lib/api-supabase';

export default function ShoppingList() {
    const queryClient = useQueryClient();
    const [newItemName, setNewItemName] = useState('');
    const [newItemAmount, setNewItemAmount] = useState('1');

    const { data, isLoading } = useQuery({
        queryKey: ['shoppingList'],
        queryFn: () => apiSupabase.getShoppingList(),
    });

    const addMutation = useMutation({
        mutationFn: (item: { product_id?: number; note?: string; amount: number }) =>
            apiSupabase.addToShoppingList({ product_id: item.product_id, note: item.note, amount: item.amount }),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['shoppingList'] });
            setNewItemName('');
            setNewItemAmount('1');
        },
        onError: (error) => {
            console.error("Failed to add to shopping list:", error);
            alert(`Failed to add item: ${error.message}`);
        }
    });

    const deleteMutation = useMutation({
        mutationFn: (id: number) => apiSupabase.deleteShoppingItem(id),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['shoppingList'] });
        },
    });

    const toggleMutation = useMutation({
        mutationFn: (item: { id: number; done: boolean }) =>
            apiSupabase.updateShoppingItem(item.id, { done: !item.done }),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['shoppingList'] });
        },
    });

    const autoAddBelowMinMutation = useMutation({
        mutationFn: () => apiSupabase.autoAddBelowMinStock(),
        onSuccess: (data) => {
            queryClient.invalidateQueries({ queryKey: ['shoppingList'] });
            alert(`Added ${data.addedCount} item(s) below minimum stock to shopping list`);
        },
    });

    const purchaseMutation = useMutation({
        mutationFn: (itemIds: number[]) => apiSupabase.purchaseShoppingItems(itemIds),
        onSuccess: (data) => {
            queryClient.invalidateQueries({ queryKey: ['shoppingList'] });
            alert(`Added ${data.count} items to inventory!`);
        },
        onError: (error) => {
            console.error("Failed to purchase items:", error);
            alert(`Failed to add to inventory: ${error.message}`);
        }
    });

    const handleAdd = async () => {
        if (!newItemName.trim()) return;

        try {
            const newProduct = await apiSupabase.createProduct({
                name: newItemName,
                is_placeholder: true,
                min_stock_amount: 0,
                default_best_before_days: 0,
                num_servings: 1
            });

            if (newProduct && newProduct.id) {
                addMutation.mutate({
                    product_id: newProduct.id,
                    amount: parseFloat(newItemAmount) || 1,
                });
            }
        } catch (err) {
            console.error("Failed to add manual item:", err);
            alert("Failed to add item. It might already exist as a product.");
        }
    };

    if (isLoading) {
        return <div style={{ padding: '20px' }}>Loading shopping list...</div>;
    }

    const items = data || [];
    const pendingItems = items.filter((item: any) => !item.done);
    const completedItems = items.filter((item: any) => item.done);

    return (
        <div style={{ padding: '20px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                <h1 style={{ margin: 0 }}>Shopping List</h1>
                <button
                    onClick={() => autoAddBelowMinMutation.mutate()}
                    disabled={autoAddBelowMinMutation.isPending}
                    style={{
                        padding: '10px 16px',
                        background: '#007bff',
                        color: '#fff',
                        border: 'none',
                        borderRadius: '6px',
                        cursor: 'pointer',
                        fontSize: '14px',
                        fontWeight: 600
                    }}
                >
                    {autoAddBelowMinMutation.isPending ? 'Adding...' : '📋 Auto-Add Below Min Stock'}
                </button>
            </div>

            {/* Add Item Form */}
            <div style={{
                background: '#f7f7f9',
                padding: '16px',
                borderRadius: '8px',
                marginBottom: '20px',
                display: 'flex',
                gap: '12px'
            }}>
                <input
                    type="text"
                    placeholder="Item name"
                    value={newItemName}
                    onChange={(e) => setNewItemName(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleAdd()}
                    style={{
                        flex: 1,
                        padding: '10px',
                        border: '1px solid #ddd',
                        borderRadius: '6px',
                        fontSize: '14px',
                    }}
                />
                <input
                    type="number"
                    placeholder="Amount"
                    value={newItemAmount}
                    onChange={(e) => setNewItemAmount(e.target.value)}
                    style={{
                        width: '100px',
                        padding: '10px',
                        border: '1px solid #ddd',
                        borderRadius: '6px',
                        fontSize: '14px',
                    }}
                />
                <button
                    onClick={handleAdd}
                    disabled={addMutation.isPending || !newItemName.trim()}
                    style={{
                        padding: '10px 20px',
                        background: '#2f9e44',
                        color: '#fff',
                        border: 'none',
                        borderRadius: '6px',
                        cursor: 'pointer',
                        fontWeight: 600,
                    }}
                >
                    Add
                </button>
            </div>

            {/* Pending Items */}
            <div style={{ background: '#fff', border: '1px solid #ddd', borderRadius: '8px', padding: '16px', marginBottom: '20px' }}>
                <h3 style={{ margin: '0 0 12px', fontSize: '16px', fontWeight: 600 }}>
                    To Buy ({pendingItems.length})
                </h3>
                {pendingItems.length > 0 ? (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                        {pendingItems.map((item: any) => (
                            <div
                                key={item.id}
                                style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '12px',
                                    padding: '10px',
                                    background: '#f7f7f9',
                                    borderRadius: '6px',
                                }}
                            >
                                <input
                                    type="checkbox"
                                    checked={false}
                                    onChange={() => toggleMutation.mutate(item)}
                                    style={{ cursor: 'pointer', width: '18px', height: '18px' }}
                                />
                                <div style={{ flex: 1 }}>
                                    <strong>{item.products?.name || item.note || 'Unknown'}</strong>
                                    <span style={{ marginLeft: '12px', color: '#666' }}>
                                        {item.amount} units
                                    </span>
                                </div>
                                <button
                                    onClick={() => deleteMutation.mutate(item.id)}
                                    style={{
                                        padding: '4px 12px',
                                        background: '#d33',
                                        color: '#fff',
                                        border: 'none',
                                        borderRadius: '4px',
                                        cursor: 'pointer',
                                        fontSize: '12px',
                                    }}
                                >
                                    Remove
                                </button>
                            </div>
                        ))}
                    </div>
                ) : (
                    <div style={{ textAlign: 'center', color: '#999', padding: '20px' }}>
                        No items to buy
                    </div>
                )}
            </div>

            {/* Completed Items */}
            {completedItems.length > 0 && (
                <div style={{ background: '#fff', border: '1px solid #ddd', borderRadius: '8px', padding: '16px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                        <h3 style={{ margin: 0, fontSize: '16px', fontWeight: 600, color: '#666' }}>
                            Purchased ({completedItems.length})
                        </h3>
                        <button
                            onClick={() => purchaseMutation.mutate(completedItems.map((i: any) => i.id))}
                            disabled={purchaseMutation.isPending}
                            style={{
                                padding: '6px 12px',
                                background: '#2f9e44',
                                color: '#fff',
                                border: 'none',
                                borderRadius: '4px',
                                cursor: 'pointer',
                                fontSize: '13px',
                                fontWeight: 600
                            }}
                        >
                            {purchaseMutation.isPending ? 'Processing...' : 'Add Checked to Inventory'}
                        </button>
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                        {completedItems.map((item: any) => (
                            <div
                                key={item.id}
                                style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '12px',
                                    padding: '10px',
                                    background: '#f0f0f0',
                                    borderRadius: '6px',
                                    opacity: 0.7,
                                }}
                            >
                                <input
                                    type="checkbox"
                                    checked={true}
                                    onChange={() => toggleMutation.mutate(item)}
                                    style={{ cursor: 'pointer', width: '18px', height: '18px' }}
                                />
                                <div style={{ flex: 1, textDecoration: 'line-through', color: '#666' }}>
                                    {item.products?.name || item.note || 'Unknown'} - {item.amount} units
                                </div>
                                <button
                                    onClick={() => deleteMutation.mutate(item.id)}
                                    style={{
                                        padding: '4px 12px',
                                        background: '#999',
                                        color: '#fff',
                                        border: 'none',
                                        borderRadius: '4px',
                                        cursor: 'pointer',
                                        fontSize: '12px',
                                    }}
                                >
                                    Remove
                                </button>
                            </div>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
}
