import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiSupabase } from '../lib/api-supabase';

export default function Inventory() {
    const queryClient = useQueryClient();

    const { data, isLoading } = useQuery({
        queryKey: ['inventory'],
        queryFn: () => apiSupabase.getInventoryOverview(),
    });

    const consumeMutation = useMutation({
        mutationFn: (params: { product_id: number; amount: number }) =>
            apiSupabase.consumeStock(params.product_id, params.amount),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['inventory'] });
        },
    });

    const purchaseMutation = useMutation({
        mutationFn: (params: { product_id: number; amount: number }) =>
            apiSupabase.purchaseStock(params.product_id, params.amount),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['inventory'] });
        },
    });

    const consumeAllMutation = useMutation({
        mutationFn: (productId: number) => apiSupabase.consumeAllStock(productId),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['inventory'] });
        },
    });

    const getStockStatusColor = (current: number, min: number) => {
        if (current === 0) return '#d33';
        if (current < min) return '#ff9800';
        return '#2f9e44';
    };

    if (isLoading) {
        return <div style={{ padding: '20px' }}>Loading inventory...</div>;
    }

    const items = (data || []).filter((item: any) => Number(item.current_stock) > 0);

    return (
        <div style={{ padding: '20px' }}>
            <h1 style={{ marginBottom: '20px' }}>Inventory</h1>

            <div style={{ background: '#fff', border: '1px solid #ddd', borderRadius: '8px', overflow: 'hidden' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                    <thead>
                        <tr style={{ background: '#f7f7f9', borderBottom: '2px solid #ddd' }}>
                            <th style={{ padding: '12px', textAlign: 'left', fontWeight: 600 }}>Product</th>
                            <th style={{ padding: '12px', textAlign: 'center', fontWeight: 600 }}>Stock</th>
                            <th style={{ padding: '12px', textAlign: 'center', fontWeight: 600 }}>Min</th>
                            <th style={{ padding: '12px', textAlign: 'left', fontWeight: 600 }}>Location</th>
                            <th style={{ padding: '12px', textAlign: 'right', fontWeight: 600 }}>Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        {items && items.length > 0 ? (
                            items.map((item: any) => {
                                const servingsPerContainer = item.num_servings || 1;
                                const servingSize = 1 / servingsPerContainer;

                                return (
                                    <tr key={item.id} style={{ borderBottom: '1px solid #eee' }}>
                                        <td style={{ padding: '12px' }}>
                                            <strong>{item.name}</strong>
                                            {item.barcode && <div style={{ fontSize: '12px', color: '#666' }}>{item.barcode}</div>}
                                            <div style={{ fontSize: '11px', color: '#888' }}>
                                                {servingsPerContainer} servings/container
                                            </div>
                                        </td>
                                        <td style={{ padding: '12px', textAlign: 'center' }}>
                                            <span
                                                style={{
                                                    background: getStockStatusColor(item.current_stock, item.min_stock || 0),
                                                    color: '#fff',
                                                    padding: '4px 12px',
                                                    borderRadius: '12px',
                                                    fontWeight: 600,
                                                }}
                                            >
                                                {Number(item.current_stock).toFixed(2)} {item.unit_name || 'units'}
                                            </span>
                                        </td>
                                        <td style={{ padding: '12px', textAlign: 'center', color: '#666' }}>
                                            {item.min_stock || 0}
                                        </td>
                                        <td style={{ padding: '12px', color: '#666' }}>
                                            {item.location_name || 'N/A'}
                                        </td>
                                        <td style={{ padding: '12px', textAlign: 'right' }}>
                                            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', alignItems: 'flex-end' }}>
                                                {/* Container Controls */}
                                                <div style={{ display: 'flex', gap: '4px', alignItems: 'center' }}>
                                                    <span style={{ fontSize: '10px', color: '#666', marginRight: '4px' }}>Container:</span>
                                                    <button
                                                        onClick={() => purchaseMutation.mutate({ product_id: item.id, amount: 1 })}
                                                        disabled={purchaseMutation.isPending}
                                                        style={{ padding: '4px 8px', background: '#2f9e44', color: '#fff', border: 'none', borderRadius: '4px', cursor: 'pointer' }}
                                                        title="Add 1 Container"
                                                    >
                                                        +1
                                                    </button>
                                                    <button
                                                        onClick={() => consumeMutation.mutate({ product_id: item.id, amount: 1 })}
                                                        disabled={consumeMutation.isPending || Number(item.current_stock) < 1}
                                                        style={{ padding: '4px 8px', background: '#d33', color: '#fff', border: 'none', borderRadius: '4px', cursor: Number(item.current_stock) < 1 ? 'not-allowed' : 'pointer', opacity: Number(item.current_stock) < 1 ? 0.5 : 1 }}
                                                        title="Remove 1 Container"
                                                    >
                                                        -1
                                                    </button>
                                                </div>

                                                {/* Serving Controls */}
                                                <div style={{ display: 'flex', gap: '4px', alignItems: 'center' }}>
                                                    <span style={{ fontSize: '10px', color: '#666', marginRight: '4px' }}>Serving:</span>
                                                    <button
                                                        onClick={() => purchaseMutation.mutate({ product_id: item.id, amount: servingSize })}
                                                        disabled={purchaseMutation.isPending}
                                                        style={{ padding: '4px 8px', background: '#4caf50', color: '#fff', border: 'none', borderRadius: '4px', cursor: 'pointer' }}
                                                        title={`Add 1 Serving (${servingSize.toFixed(2)} units)`}
                                                    >
                                                        +S
                                                    </button>
                                                    <button
                                                        onClick={() => consumeMutation.mutate({ product_id: item.id, amount: servingSize })}
                                                        disabled={consumeMutation.isPending || Number(item.current_stock) < servingSize}
                                                        style={{ padding: '4px 8px', background: '#f44336', color: '#fff', border: 'none', borderRadius: '4px', cursor: Number(item.current_stock) < servingSize ? 'not-allowed' : 'pointer', opacity: Number(item.current_stock) < servingSize ? 0.5 : 1 }}
                                                        title={`Remove 1 Serving (${servingSize.toFixed(2)} units)`}
                                                    >
                                                        -S
                                                    </button>
                                                </div>

                                                {/* Consume All */}
                                                <button
                                                    onClick={() => {
                                                        if (window.confirm('Are you sure you want to consume ALL stock for this product?')) {
                                                            consumeAllMutation.mutate(item.id);
                                                        }
                                                    }}
                                                    disabled={consumeAllMutation.isPending || Number(item.current_stock) === 0}
                                                    style={{
                                                        padding: '4px 8px',
                                                        background: '#333',
                                                        color: '#fff',
                                                        border: 'none',
                                                        borderRadius: '4px',
                                                        cursor: Number(item.current_stock) === 0 ? 'not-allowed' : 'pointer',
                                                        fontSize: '10px',
                                                        marginTop: '4px',
                                                        opacity: Number(item.current_stock) === 0 ? 0.5 : 1
                                                    }}
                                                >
                                                    Consume All
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                );
                            })
                        ) : (
                            <tr>
                                <td colSpan={5} style={{ padding: '40px', textAlign: 'center', color: '#999' }}>
                                    No products in inventory
                                </td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    );
}
