import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiSupabase } from '../lib/api-supabase';

interface Product {
    id: number;
    name: string;
    description: string | null;
    barcode: string | null;
    min_stock_amount: number;
    default_best_before_days: number;
    location_id: number | null;
    qu_id_stock: number | null;
    qu_id_purchase: number | null;
    qu_id_consume: number | null;
    calories_per_serving: number;
    carbs_per_serving: number;
    protein_per_serving: number;
    fat_per_serving: number;
    num_servings: number;
    walmart_link: string | null;
    is_walmart: boolean;
    is_meal_product: boolean;
    price: number;
    // Joined fields
    location_name?: string;
    quantity_units?: { name: string } | null;
}

export default function Products() {
    const queryClient = useQueryClient();
    const [editingProduct, setEditingProduct] = useState<Product | null>(null);

    // Fetch products
    const { data: productsData, isLoading } = useQuery({
        queryKey: ['products'],
        queryFn: () => apiSupabase.getProducts(),
    });

    // Fetch locations for dropdown
    const { data: locationsData } = useQuery({
        queryKey: ['locations'],
        queryFn: () => apiSupabase.getLocations(),
    });

    // Update mutation
    const updateMutation = useMutation({
        mutationFn: (params: Partial<Product> & { id: number }) => {
            const {
                id,
                location_name: _location_name,
                // Exclude fields that don't exist in the database
                default_best_before_days_after_open: _open,
                default_best_before_days_after_freezing: _freezing,
                default_best_before_days_after_thawing: _thawing,
                default_consume_location_id: _consumeLoc,
                // Exclude joined fields from getProducts query
                locations: _locations,
                quantity_units: _quantity_units,
                ...rest
            } = params as any;
            const updates: any = { ...rest };
            // Convert 0/1 to boolean for API
            if (updates.is_walmart !== undefined) updates.is_walmart = !!updates.is_walmart;
            if (updates.is_meal_product !== undefined) updates.is_meal_product = !!updates.is_meal_product;
            return apiSupabase.updateProduct(id, updates);
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['products'] });
            setEditingProduct(null);
        },
    });

    // Create mutation
    const createMutation = useMutation({
        mutationFn: (newProduct: any) => {
            const {
                id: _id,
                location_name: _location_name,
                // Exclude fields that don't exist in the database
                default_best_before_days_after_open: _open,
                default_best_before_days_after_freezing: _freezing,
                default_best_before_days_after_thawing: _thawing,
                default_consume_location_id: _consumeLoc,
                // Exclude joined fields
                locations: _locations,
                quantity_units: _quantity_units,
                ...rest
            } = newProduct;
            const productData: any = { ...rest };
            // Convert 0/1 to boolean for API
            if (productData.is_walmart !== undefined) productData.is_walmart = !!productData.is_walmart;
            if (productData.is_meal_product !== undefined) productData.is_meal_product = !!productData.is_meal_product;
            // Convert 0 to null for foreign key fields to avoid FK constraint violations
            if (productData.location_id === 0) productData.location_id = null;
            if (productData.qu_id_stock === 0) productData.qu_id_stock = null;
            if (productData.qu_id_purchase === 0) productData.qu_id_purchase = null;
            if (productData.qu_id_consume === 0) productData.qu_id_consume = null;
            return apiSupabase.createProduct(productData);
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['products'] });
            setEditingProduct(null);
        },
    });

    // Delete mutation
    const deleteMutation = useMutation({
        mutationFn: (id: number) => apiSupabase.deleteProduct(id),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['products'] });
        },
        onError: (error: any) => {
            alert('Failed to delete product: ' + error.message);
        }
    });

    const [deleteConfirmMap, setDeleteConfirmMap] = useState<Record<number, boolean>>({});

    const handleDelete = (id: number) => {
        if (deleteConfirmMap[id]) {
            // Confirmed
            deleteMutation.mutate(id);
            setDeleteConfirmMap(prev => {
                const next = { ...prev };
                delete next[id];
                return next;
            });
        } else {
            // First click
            setDeleteConfirmMap(prev => ({ ...prev, [id]: true }));
            // Auto-clear after 3s
            setTimeout(() => {
                setDeleteConfirmMap(prev => {
                    const next = { ...prev };
                    delete next[id];
                    return next;
                });
            }, 3000);
        }
    };

    const handleEdit = (product: Product) => {
        setEditingProduct({ ...product });
    };

    const handleCreate = () => {
        setEditingProduct({
            id: 0, // 0 indicates new product
            name: '',
            description: null,
            barcode: null,
            min_stock_amount: 0,
            default_best_before_days: 0,
            location_id: null,
            qu_id_stock: null,
            qu_id_purchase: null,
            qu_id_consume: null,
            calories_per_serving: 0,
            carbs_per_serving: 0,
            protein_per_serving: 0,
            fat_per_serving: 0,
            num_servings: 1,
            walmart_link: null,
            is_walmart: false,
            is_meal_product: false,
            price: 0
        });
    };

    const handleSave = (e: React.FormEvent) => {
        e.preventDefault();
        if (editingProduct) {
            if (editingProduct.id === 0) {
                // Create
                const { id: _id, location_name: _location_name, ...productData } = editingProduct;
                createMutation.mutate(productData);
            } else {
                // Update
                updateMutation.mutate(editingProduct);
            }
        }
    };

    const handleChange = (field: keyof Product, value: any) => {
        if (editingProduct) {
            setEditingProduct({
                ...editingProduct,
                [field]: value,
            });
        }
    };

    if (isLoading) return <div style={{ padding: '20px' }}>Loading products...</div>;

    const products = productsData || [];
    const locations = locationsData || [];

    return (
        <div style={{ padding: '20px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                <h1 style={{ margin: 0 }}>Master Products</h1>
                <button
                    onClick={handleCreate}
                    style={{
                        padding: '10px 20px',
                        background: '#28a745',
                        color: '#fff',
                        border: 'none',
                        borderRadius: '6px',
                        cursor: 'pointer',
                        fontWeight: 600,
                        fontSize: '14px'
                    }}
                >
                    + New Product
                </button>
            </div>

            <div style={{ background: '#fff', border: '1px solid #ddd', borderRadius: '8px', overflow: 'hidden' }}>
                <div className="table-responsive desktop-only">
                    <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                    <thead>
                        <tr style={{ background: '#f7f7f9', borderBottom: '2px solid #ddd' }}>
                            <th style={{ padding: '12px', textAlign: 'left' }}>Name</th>
                            <th style={{ padding: '12px', textAlign: 'left' }}>Barcode</th>
                            <th style={{ padding: '12px', textAlign: 'center' }}>Min Stock</th>
                            <th style={{ padding: '12px', textAlign: 'left' }}>Default Location</th>
                            <th style={{ padding: '12px', textAlign: 'right' }}>Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        {products.map((product: Product) => (
                            <tr key={product.id} style={{ borderBottom: '1px solid #eee' }}>
                                <td style={{ padding: '12px', fontWeight: 600 }}>{product.name}</td>
                                <td style={{ padding: '12px', color: '#666' }}>{product.barcode}</td>
                                <td style={{ padding: '12px', textAlign: 'center' }}>{product.min_stock_amount}</td>
                                <td style={{ padding: '12px' }}>
                                    {locations.find((l: any) => l.id === product.location_id)?.name || '-'}
                                </td>
                                <td style={{ padding: '12px', textAlign: 'right' }}>
                                    <button
                                        onClick={() => handleEdit(product)}
                                        style={{
                                            padding: '6px 12px',
                                            background: '#007bff',
                                            color: '#fff',
                                            border: 'none',
                                            borderRadius: '4px',
                                            cursor: 'pointer',
                                        }}
                                    >
                                        Edit
                                    </button>
                                    <button
                                        onClick={() => handleDelete(product.id)}
                                        style={{
                                            padding: '6px 12px',
                                            background: deleteConfirmMap[product.id] ? '#dc3545' : 'transparent',
                                            color: deleteConfirmMap[product.id] ? '#fff' : '#dc3545',
                                            border: deleteConfirmMap[product.id] ? 'none' : '1px solid #dc3545',
                                            borderRadius: '4px',
                                            cursor: 'pointer',
                                            marginLeft: '8px'
                                        }}
                                    >
                                        {deleteConfirmMap[product.id] ? 'Confirm?' : 'Delete'}
                                    </button>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                    </table>
                </div>

                <div className="mobile-only" style={{ padding: '12px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
                    {products.map((product: Product) => (
                        <div key={product.id} className="card" style={{ padding: '12px', border: '1px solid #eee', borderRadius: '10px' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '8px' }}>
                                <div>
                                    <strong>{product.name}</strong>
                                    {product.barcode && <div style={{ fontSize: '12px', color: '#666' }}>{product.barcode}</div>}
                                    <div style={{ fontSize: '12px', color: '#666' }}>Min: {product.min_stock_amount}</div>
                                    <div style={{ fontSize: '12px', color: '#666' }}>
                                        {locations.find((l: any) => l.id === product.location_id)?.name || '-'}
                                    </div>
                                </div>
                                <div style={{ display: 'flex', gap: '6px' }}>
                                    <button
                                        onClick={() => handleEdit(product)}
                                        className="primary-btn"
                                        style={{ padding: '6px 10px' }}
                                    >
                                        Edit
                                    </button>
                                    <button
                                        onClick={() => handleDelete(product.id)}
                                        className="primary-btn"
                                        style={{
                                            padding: '6px 10px',
                                            background: deleteConfirmMap[product.id] ? '#dc3545' : '#fef2f2',
                                            color: deleteConfirmMap[product.id] ? '#fff' : '#dc3545',
                                            border: deleteConfirmMap[product.id] ? 'none' : '1px solid #dc3545'
                                        }}
                                    >
                                        {deleteConfirmMap[product.id] ? 'Confirm?' : 'Delete'}
                                    </button>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            </div>

            {/* Edit/Create Modal */}
            {editingProduct && (
                <div style={{
                    position: 'fixed',
                    top: 0, left: 0, right: 0, bottom: 0,
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
                        width: 'min(720px, 96vw)',
                        maxWidth: '95%',
                        maxHeight: '90vh',
                        overflowY: 'auto'
                    }}>
                        <h2 style={{ marginTop: 0, borderBottom: '1px solid #eee', paddingBottom: '12px' }}>
                            {editingProduct.id === 0 ? 'Create New Product' : `Edit ${editingProduct.name}`}
                        </h2>

                        <form onSubmit={handleSave}>
                            {/* General Section */}
                            <h3 style={{ fontSize: '1.1em', marginTop: '20px', marginBottom: '12px', color: '#444' }}>General</h3>
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '16px' }}>
                                <div>
                                    <label style={{ display: 'block', marginBottom: '4px', fontWeight: 600 }}>Name</label>
                                    <input
                                        type="text"
                                        value={editingProduct.name}
                                        onChange={(e) => handleChange('name', e.target.value)}
                                        style={{ width: '100%', padding: '8px', border: '1px solid #ddd', borderRadius: '4px' }}
                                        required
                                    />
                                </div>
                                <div>
                                    <label style={{ display: 'block', marginBottom: '4px', fontWeight: 600 }}>Barcode</label>
                                    <input
                                        type="text"
                                        value={editingProduct.barcode || ''}
                                        onChange={(e) => handleChange('barcode', e.target.value)}
                                        style={{ width: '100%', padding: '8px', border: '1px solid #ddd', borderRadius: '4px' }}
                                    />
                                </div>
                            </div>
                            <div style={{ marginBottom: '16px' }}>
                                <label style={{ display: 'block', marginBottom: '4px', fontWeight: 600 }}>Description</label>
                                <textarea
                                    value={editingProduct.description || ''}
                                    onChange={(e) => handleChange('description', e.target.value)}
                                    style={{ width: '100%', padding: '8px', border: '1px solid #ddd', borderRadius: '4px', minHeight: '60px' }}
                                />
                            </div>

                            {/* Inventory Section */}
                            <h3 style={{ fontSize: '1.1em', marginTop: '20px', marginBottom: '12px', color: '#444' }}>Inventory Settings</h3>
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '16px', marginBottom: '16px' }}>
                                <div>
                                    <label style={{ display: 'block', marginBottom: '4px', fontWeight: 600 }}>Min Stock</label>
                                    <input
                                        type="number"
                                        value={editingProduct.min_stock_amount}
                                        onChange={(e) => handleChange('min_stock_amount', parseFloat(e.target.value))}
                                        style={{ width: '100%', padding: '8px', border: '1px solid #ddd', borderRadius: '4px' }}
                                    />
                                </div>
                                <div>
                                    <label style={{ display: 'block', marginBottom: '4px', fontWeight: 600 }}>Default Location</label>
                                    <select
                                        value={editingProduct.location_id || ''}
                                        onChange={(e) => handleChange('location_id', parseInt(e.target.value))}
                                        style={{ width: '100%', padding: '8px', border: '1px solid #ddd', borderRadius: '4px' }}
                                    >
                                        <option value="">Select Location</option>
                                        {locations.map((loc: any) => (
                                            <option key={loc.id} value={loc.id}>{loc.name}</option>
                                        ))}
                                    </select>
                                </div>
                                <div>
                                    <label style={{ display: 'block', marginBottom: '4px', fontWeight: 600 }}>Best Before Days</label>
                                    <input
                                        type="number"
                                        value={editingProduct.default_best_before_days}
                                        onChange={(e) => handleChange('default_best_before_days', parseInt(e.target.value))}
                                        style={{ width: '100%', padding: '8px', border: '1px solid #ddd', borderRadius: '4px' }}
                                    />
                                </div>
                            </div>

                            {/* Nutrition Section */}
                            <h3 style={{ fontSize: '1.1em', marginTop: '20px', marginBottom: '12px', color: '#444' }}>Nutrition (per serving)</h3>
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr 1fr', gap: '12px', marginBottom: '16px' }}>
                                <div>
                                    <label style={{ display: 'block', marginBottom: '4px', fontSize: '0.9em' }}>Calories</label>
                                    <input
                                        type="number"
                                        value={editingProduct.calories_per_serving || 0}
                                        onChange={(e) => handleChange('calories_per_serving', parseFloat(e.target.value))}
                                        style={{ width: '100%', padding: '8px', border: '1px solid #ddd', borderRadius: '4px' }}
                                    />
                                </div>
                                <div>
                                    <label style={{ display: 'block', marginBottom: '4px', fontSize: '0.9em' }}>Carbs (g)</label>
                                    <input
                                        type="number"
                                        value={editingProduct.carbs_per_serving || 0}
                                        onChange={(e) => handleChange('carbs_per_serving', parseFloat(e.target.value))}
                                        style={{ width: '100%', padding: '8px', border: '1px solid #ddd', borderRadius: '4px' }}
                                    />
                                </div>
                                <div>
                                    <label style={{ display: 'block', marginBottom: '4px', fontSize: '0.9em' }}>Protein (g)</label>
                                    <input
                                        type="number"
                                        value={editingProduct.protein_per_serving || 0}
                                        onChange={(e) => handleChange('protein_per_serving', parseFloat(e.target.value))}
                                        style={{ width: '100%', padding: '8px', border: '1px solid #ddd', borderRadius: '4px' }}
                                    />
                                </div>
                                <div>
                                    <label style={{ display: 'block', marginBottom: '4px', fontSize: '0.9em' }}>Fat (g)</label>
                                    <input
                                        type="number"
                                        value={editingProduct.fat_per_serving || 0}
                                        onChange={(e) => handleChange('fat_per_serving', parseFloat(e.target.value))}
                                        style={{ width: '100%', padding: '8px', border: '1px solid #ddd', borderRadius: '4px' }}
                                    />
                                </div>
                                <div>
                                    <label style={{ display: 'block', marginBottom: '4px', fontSize: '0.9em' }}>Servings</label>
                                    <input
                                        type="number"
                                        value={editingProduct.num_servings || 1}
                                        onChange={(e) => handleChange('num_servings', parseFloat(e.target.value))}
                                        style={{ width: '100%', padding: '8px', border: '1px solid #ddd', borderRadius: '4px' }}
                                    />
                                </div>
                            </div>


                            {/* Integration Section */}
                            <h3 style={{ fontSize: '1.1em', marginTop: '20px', marginBottom: '12px', color: '#444' }}>Integration</h3>
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '16px' }}>
                                <div>
                                    <label style={{ display: 'block', marginBottom: '4px', fontWeight: 600 }}>Walmart Link</label>
                                    <input
                                        type="text"
                                        value={editingProduct.walmart_link || ''}
                                        onChange={(e) => handleChange('walmart_link', e.target.value)}
                                        placeholder="https://www.walmart.com/ip/..."
                                        style={{ width: '100%', padding: '8px', border: '1px solid #ddd', borderRadius: '4px' }}
                                    />
                                </div>
                                <div>
                                    <label style={{ display: 'block', marginBottom: '4px', fontWeight: 600 }}>Price ($)</label>
                                    <input
                                        type="number"
                                        step="0.01"
                                        value={editingProduct.price || 0}
                                        onChange={(e) => handleChange('price', parseFloat(e.target.value))}
                                        style={{ width: '100%', padding: '8px', border: '1px solid #ddd', borderRadius: '4px' }}
                                    />
                                </div>
                            </div>
                            <div style={{ display: 'flex', gap: '20px' }}>
                                <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
                                    <input
                                        type="checkbox"
                                        checked={!!editingProduct.is_walmart}
                                        onChange={(e) => handleChange('is_walmart', e.target.checked ? 1 : 0)}
                                    />
                                    Track at Walmart
                                </label>
                                <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
                                    <input
                                        type="checkbox"
                                        checked={!!editingProduct.is_meal_product}
                                        onChange={(e) => handleChange('is_meal_product', e.target.checked ? 1 : 0)}
                                    />
                                    Is Meal Product
                                </label>
                            </div>

                            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', marginTop: '24px', borderTop: '1px solid #eee', paddingTop: '16px' }}>
                                <button
                                    type="button"
                                    onClick={() => setEditingProduct(null)}
                                    style={{
                                        padding: '8px 16px',
                                        background: '#f8f9fa',
                                        border: '1px solid #ddd',
                                        borderRadius: '4px',
                                        cursor: 'pointer'
                                    }}
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    disabled={updateMutation.isPending || createMutation.isPending}
                                    style={{
                                        padding: '8px 16px',
                                        background: '#28a745',
                                        color: '#fff',
                                        border: 'none',
                                        borderRadius: '4px',
                                        cursor: 'pointer'
                                    }}
                                >
                                    {updateMutation.isPending || createMutation.isPending ? 'Saving...' : 'Save Changes'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
