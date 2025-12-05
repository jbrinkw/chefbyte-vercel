import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { getAuthHeader } from '../lib/api-supabase';

interface Product {
    id: number;
    name: string;
    walmart_link: string | null;
    price: number;
}

interface WalmartOption {
    url: string;
    title: string | null;
    price: number | null;
    image_url: string | null;
}

interface ProductWithOptions extends Product {
    options: WalmartOption[];
    selectedOption: WalmartOption | null;
    customUrl: string;
    notWalmart: boolean;
    loading: boolean;
    error: string | null;
}

interface NonWalmartItem {
    id: number;
    name: string;
    price: number | null;
    manualPrice: string;
}

export default function Walmart() {
    const [missingLinksCount, setMissingLinksCount] = useState<string | number>('-');
    const [missingPricesCount, setMissingPricesCount] = useState<string | number>('-');
    const [products, setProducts] = useState<ProductWithOptions[]>([]);
    const [nonWalmartItems, setNonWalmartItems] = useState<NonWalmartItem[]>([]);
    const [loading, setLoading] = useState(false);
    const [saving, setSaving] = useState(false);
    const [priceUpdateProgress, setPriceUpdateProgress] = useState<{ current: number; total: number } | null>(null);

    useEffect(() => {
        loadCounts();
        loadNonWalmartItems();
    }, []);

    const loadCounts = async () => {
        try {
            // Count products with missing Walmart links
            const { count: missingLinks } = await supabase
                .from('products')
                .select('*', { count: 'exact', head: true })
                .is('walmart_link', null)
                .eq('is_walmart', true);

            // Count products with missing prices
            const { count: missingPrices } = await supabase
                .from('products')
                .select('*', { count: 'exact', head: true })
                .not('walmart_link', 'is', null)
                .is('price', null);

            setMissingLinksCount(missingLinks || 0);
            setMissingPricesCount(missingPrices || 0);
        } catch (error) {
            console.error('Error loading counts:', error);
        }
    };

    const loadNonWalmartItems = async () => {
        try {
            const { data } = await supabase
                .from('products')
                .select('id, name, price')
                .eq('is_walmart', false)
                .is('price', null);

            if (data) {
                setNonWalmartItems(data.map((item: any) => ({
                    ...item,
                    manualPrice: ''
                })));
            }
        } catch (error) {
            console.error('Error loading non-walmart items:', error);
        }
    };

    const loadNext5Products = async () => {
        setLoading(true);
        setProducts([]);
        try {
            // Get products with missing Walmart links using Supabase
            const { data: rawProducts } = await supabase
                .from('products')
                .select('id, name, walmart_link, price')
                .is('walmart_link', null)
                .eq('is_walmart', true)
                .limit(5);

            if (!rawProducts || rawProducts.length === 0) {
                setLoading(false);
                return;
            }

            // Initialize products with loading state
            const initialProducts: ProductWithOptions[] = rawProducts.map((p: any) => ({
                ...p,
                options: [],
                selectedOption: null,
                customUrl: '',
                notWalmart: false,
                loading: true,
                error: null
            }));
            setProducts(initialProducts);

            // Fetch options for each product via serverless search
            const headers = await getAuthHeader();
            const enriched = await Promise.all(initialProducts.map(async (p) => {
                try {
                    const res = await fetch('/api/walmart-scrape', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json', ...headers },
                        body: JSON.stringify({ search_term: p.name })
                    });
                    if (!res.ok) throw new Error(await res.text());
                    const json = await res.json();
                    return {
                        ...p,
                        options: json.results || [],
                        loading: false,
                        error: (json.results || []).length ? null : 'No results found'
                    };
                } catch (err: any) {
                    return {
                        ...p,
                        loading: false,
                        error: err.message || 'Search failed'
                    };
                }
            }));

            setProducts(enriched);
        } catch (error) {
            console.error('Error loading products:', error);
        } finally {
            setLoading(false);
        }
    };

    const selectOption = (productId: number, option: WalmartOption) => {
        setProducts(prev => prev.map(p =>
            p.id === productId ? { ...p, selectedOption: option, customUrl: '', notWalmart: false } : p
        ));
    };

    const handleCustomUrlChange = (productId: number, url: string) => {
        setProducts(prev => prev.map(p =>
            p.id === productId ? { ...p, customUrl: url, selectedOption: null, notWalmart: false } : p
        ));
    };

    const handleNotWalmartChange = (productId: number, checked: boolean) => {
        setProducts(prev => prev.map(p =>
            p.id === productId ? { ...p, notWalmart: checked, selectedOption: null, customUrl: '' } : p
        ));
    };

    const handleManualPriceChange = (itemId: number, price: string) => {
        setNonWalmartItems(prev => prev.map(item =>
            item.id === itemId ? { ...item, manualPrice: price } : item
        ));
    };

    const hasSelections = products.some(p => p.selectedOption || p.customUrl || p.notWalmart);
    const hasManualPrices = nonWalmartItems.some(item => item.manualPrice.trim());

    const cleanWalmartUrl = (url: string): string => {
        try {
            const match = url.match(/^(https?:\/\/(?:www\.)?walmart\.com\/ip\/[^\/]+\/\d+)/);
            return match ? match[1] : url;
        } catch {
            return url;
        }
    };

    const completeUpdates = async () => {
        setSaving(true);
        try {
            // Mark not_walmart items
            const notWalmartIds = products.filter(p => p.notWalmart).map(p => p.id);
            for (const id of notWalmartIds) {
                await supabase
                    .from('products')
                    .update({ is_walmart: false })
                    .eq('id', id);
            }

            // Update products with selected links
            for (const product of products) {
                if (product.notWalmart) continue;

                if (product.selectedOption) {
                    await supabase
                        .from('products')
                        .update({
                            walmart_link: cleanWalmartUrl(product.selectedOption.url),
                            price: product.selectedOption.price ?? undefined
                        })
                        .eq('id', product.id);
                } else if (product.customUrl) {
                    // Just save the URL without price (scraping not implemented yet)
                    await supabase
                        .from('products')
                        .update({
                            walmart_link: cleanWalmartUrl(product.customUrl),
                        })
                        .eq('id', product.id);
                }
            }

            // Refresh and clear
            setProducts([]);
            loadCounts();
            loadNonWalmartItems();
        } catch (error) {
            console.error('Error completing updates:', error);
            alert('Failed to save updates');
        } finally {
            setSaving(false);
        }
    };

    const completeManualPrices = async () => {
        setSaving(true);
        try {
            for (const item of nonWalmartItems) {
                if (item.manualPrice.trim()) {
                    const price = parseFloat(item.manualPrice);
                    if (!isNaN(price)) {
                        await supabase
                            .from('products')
                            .update({ price })
                            .eq('id', item.id);
                    }
                }
            }

            loadCounts();
            loadNonWalmartItems();
        } catch (error) {
            console.error('Error saving manual prices:', error);
            alert('Failed to save prices');
        } finally {
            setSaving(false);
        }
    };

    const startPriceUpdate = async () => {
        if (saving) return;
        setPriceUpdateProgress({ current: 0, total: 0 });
        setSaving(true);
        try {
            const headers = await getAuthHeader();
            const res = await fetch('/api/walmart-update', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', ...headers },
                body: JSON.stringify({})
            });
            const json = await res.json();
            if (!res.ok || json.error) {
                throw new Error(json.error || 'Failed to update prices');
            }
            setPriceUpdateProgress({
                current: json.updated || 0,
                total: json.total || 0
            });
            await loadCounts();
            await loadNonWalmartItems();
        } catch (err: any) {
            console.error('Price update error:', err);
            alert(err.message || 'Price update failed');
        } finally {
            setSaving(false);
        }
    };

    return (
        <div className="walmartManagerView">
            {/* Missing Links Section */}
            <div className="managerCard">
                <h2>Update Missing Walmart Links</h2>
                <div className="counterRow">
                    <span>Missing Links: <strong>{missingLinksCount}</strong></span>
                    <button className="managerBtn" onClick={loadNext5Products} disabled={loading || saving}>
                        {loading ? 'Scraping with 5 workers...' : 'Load Next 5 Products'}
                    </button>
                </div>

                <div className="productOptionsContainer">
                    {/* Loading indicator */}
                    {loading && (
                        <div style={{
                            padding: '40px 20px',
                            textAlign: 'center',
                            backgroundColor: '#e3f2fd',
                            borderRadius: '8px',
                            margin: '12px 0'
                        }}>
                            <div style={{
                                fontSize: '24px',
                                marginBottom: '12px',
                                animation: 'spin 1s linear infinite'
                            }}>⏳</div>
                            <div style={{ fontSize: '16px', fontWeight: 600, color: '#1976d2' }}>
                                Searching Walmart...
                            </div>
                            <div style={{ fontSize: '14px', color: '#666', marginTop: '8px' }}>
                                Scraping search results with 5 parallel workers
                            </div>
                            <style>{`
                                @keyframes spin {
                                    0% { transform: rotate(0deg); }
                                    100% { transform: rotate(360deg); }
                                }
                            `}</style>
                        </div>
                    )}

                    {products.length === 0 && !loading && (
                        <p style={{ color: '#666', textAlign: 'center', padding: '20px' }}>
                            Click "Load Next 5 Products" to start linking products to Walmart
                        </p>
                    )}

                    {products.map((product) => (
                        <div key={product.id} className="productCard" style={{
                            border: '1px solid #ddd',
                            borderRadius: '8px',
                            padding: '16px',
                            marginBottom: '16px',
                            backgroundColor: '#fff'
                        }}>
                            {/* Product header with name and actions */}
                            <div className="productName" style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: '12px',
                                marginBottom: '12px',
                                flexWrap: 'wrap'
                            }}>
                                <span style={{ flex: 1, fontWeight: 600, fontSize: '16px' }}>{product.name}</span>
                                <a
                                    href={`https://www.walmart.com/search?q=${encodeURIComponent(product.name)}`}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="searchLink"
                                    style={{
                                        color: '#1976d2',
                                        textDecoration: 'none',
                                        fontSize: '14px'
                                    }}
                                >
                                    🔍 Search
                                </a>
                                <label style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '6px',
                                    fontSize: '14px',
                                    cursor: 'pointer'
                                }}>
                                    <input
                                        type="checkbox"
                                        checked={product.notWalmart}
                                        onChange={(e) => handleNotWalmartChange(product.id, e.target.checked)}
                                    />
                                    Not a Walmart Item
                                </label>
                            </div>

                            {/* Loading state */}
                            {product.loading && (
                                <div style={{ padding: '20px', textAlign: 'center', color: '#666' }}>
                                    Loading options...
                                </div>
                            )}

                            {/* Error state */}
                            {product.error && !product.loading && (
                                <div style={{ padding: '10px', color: '#d32f2f', fontSize: '14px' }}>
                                    {product.error}
                                </div>
                            )}

                            {/* Options grid */}
                            {!product.loading && product.options.length > 0 && !product.notWalmart && (
                                <div className="optionsGrid" style={{
                                    display: 'grid',
                                    gridTemplateColumns: 'repeat(auto-fill, minmax(150px, 1fr))',
                                    gap: '12px',
                                    marginBottom: '12px'
                                }}>
                                    {product.options.map((option, index) => (
                                        <div
                                            key={index}
                                            className={`optionCard ${product.selectedOption?.url === option.url ? 'selected' : ''}`}
                                            onClick={() => selectOption(product.id, option)}
                                            style={{
                                                border: product.selectedOption?.url === option.url
                                                    ? '3px solid #4caf50'
                                                    : '1px solid #ddd',
                                                borderRadius: '8px',
                                                padding: '12px',
                                                cursor: 'pointer',
                                                backgroundColor: product.selectedOption?.url === option.url
                                                    ? '#f0fff0'
                                                    : '#fafafa',
                                                transition: 'all 0.2s'
                                            }}
                                        >
                                            {/* Radio circle indicator */}
                                            <div style={{
                                                width: '18px',
                                                height: '18px',
                                                borderRadius: '50%',
                                                border: '2px solid #4caf50',
                                                marginBottom: '8px',
                                                backgroundColor: product.selectedOption?.url === option.url
                                                    ? '#4caf50'
                                                    : 'transparent'
                                            }} />

                                            {/* Product image */}
                                            <div style={{
                                                width: '100%',
                                                height: '100px',
                                                backgroundColor: '#f5f5f5',
                                                borderRadius: '4px',
                                                display: 'flex',
                                                alignItems: 'center',
                                                justifyContent: 'center',
                                                marginBottom: '8px',
                                                overflow: 'hidden'
                                            }}>
                                                {option.image_url ? (
                                                    <img
                                                        src={option.image_url}
                                                        alt={option.title || 'Product'}
                                                        style={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain' }}
                                                        onError={(e) => {
                                                            (e.target as HTMLImageElement).style.display = 'none';
                                                        }}
                                                    />
                                                ) : (
                                                    <span style={{ color: '#999', fontSize: '12px' }}>No image</span>
                                                )}
                                            </div>

                                            {/* Product name */}
                                            <div style={{
                                                fontSize: '12px',
                                                lineHeight: '1.3',
                                                marginBottom: '6px',
                                                maxHeight: '40px',
                                                overflow: 'hidden'
                                            }}>
                                                {option.title || 'Unknown Product'}
                                            </div>

                                            {/* Price */}
                                            <a
                                                href={option.url}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                onClick={(e) => e.stopPropagation()}
                                                style={{
                                                    color: '#2e7d32',
                                                    fontWeight: 600,
                                                    fontSize: '14px',
                                                    textDecoration: 'none'
                                                }}
                                            >
                                                {option.price ? `$${option.price.toFixed(2)}` : 'Price N/A'}
                                            </a>
                                        </div>
                                    ))}
                                </div>
                            )}

                            {/* Custom link input */}
                            {!product.notWalmart && (
                                <div className="customLinkBox" style={{
                                    borderTop: '1px solid #eee',
                                    paddingTop: '12px',
                                    marginTop: product.options.length > 0 ? '0' : '12px'
                                }}>
                                    <label style={{ fontSize: '13px', color: '#666', display: 'block', marginBottom: '6px' }}>
                                        Or paste a custom Walmart link:
                                    </label>
                                    <input
                                        type="text"
                                        value={product.customUrl}
                                        onChange={(e) => handleCustomUrlChange(product.id, e.target.value)}
                                        placeholder="https://www.walmart.com/ip/..."
                                        style={{
                                            width: '100%',
                                            padding: '8px 12px',
                                            border: '1px solid #ddd',
                                            borderRadius: '4px',
                                            fontSize: '13px'
                                        }}
                                    />
                                </div>
                            )}
                        </div>
                    ))}
                </div>

                {/* Complete button */}
                {hasSelections && (
                    <button
                        className="completeManagerBtn"
                        onClick={completeUpdates}
                        disabled={saving}
                        style={{
                            width: '100%',
                            padding: '14px',
                            backgroundColor: '#4caf50',
                            color: 'white',
                            border: 'none',
                            borderRadius: '6px',
                            fontSize: '16px',
                            fontWeight: 600,
                            cursor: 'pointer',
                            marginTop: '12px'
                        }}
                    >
                        {saving ? 'Updating...' : 'Complete & Update Selected'}
                    </button>
                )}
            </div>

            {/* Missing Prices Section */}
            <div className="managerCard">
                <h2>Update Missing Prices</h2>
                <div className="counterRow">
                    <span>Products with Links: <strong>{missingPricesCount}</strong></span>
                    <button
                        className="managerBtn"
                        onClick={startPriceUpdate}
                        disabled={priceUpdateProgress !== null}
                    >
                        {priceUpdateProgress ? 'Updating...' : 'Start Price Update'}
                    </button>
                </div>

                {priceUpdateProgress && (
                    <div style={{ marginTop: '12px' }}>
                        <div style={{
                            height: '8px',
                            backgroundColor: '#e0e0e0',
                            borderRadius: '4px',
                            overflow: 'hidden'
                        }}>
                            <div style={{
                                height: '100%',
                                width: `${(priceUpdateProgress.current / priceUpdateProgress.total) * 100}%`,
                                backgroundColor: '#4caf50',
                                transition: 'width 0.3s'
                            }} />
                        </div>
                        <div style={{ fontSize: '13px', color: '#666', marginTop: '6px' }}>
                            Progress: {priceUpdateProgress.current} / {priceUpdateProgress.total}
                        </div>
                    </div>
                )}

                {/* Manual Price Entry for Non-Walmart Items */}
                {nonWalmartItems.length > 0 && (
                    <div style={{
                        marginTop: '20px',
                        paddingTop: '20px',
                        borderTop: '2px solid #e0e0e0'
                    }}>
                        <h3 style={{ margin: '0 0 12px', fontSize: '16px', fontWeight: 600 }}>
                            Manual Price Entry (Non-Walmart Items)
                        </h3>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                            {nonWalmartItems.map(item => (
                                <div key={item.id} style={{
                                    display: 'grid',
                                    gridTemplateColumns: '2fr 1fr',
                                    gap: '12px',
                                    alignItems: 'center',
                                    padding: '12px',
                                    background: '#fff',
                                    border: '1px solid #ddd',
                                    borderRadius: '6px'
                                }}>
                                    <span style={{ fontWeight: 500 }}>{item.name}</span>
                                    <input
                                        type="text"
                                        value={item.manualPrice}
                                        onChange={(e) => handleManualPriceChange(item.id, e.target.value)}
                                        placeholder="$0.00"
                                        style={{
                                            padding: '8px',
                                            border: '1px solid #ccc',
                                            borderRadius: '4px'
                                        }}
                                    />
                                </div>
                            ))}
                        </div>
                        {hasManualPrices && (
                            <button
                                className="completeManagerBtn"
                                onClick={completeManualPrices}
                                disabled={saving}
                                style={{
                                    width: '100%',
                                    padding: '12px',
                                    backgroundColor: '#4caf50',
                                    color: 'white',
                                    border: 'none',
                                    borderRadius: '6px',
                                    fontSize: '15px',
                                    fontWeight: 600,
                                    cursor: 'pointer',
                                    marginTop: '12px'
                                }}
                            >
                                {saving ? 'Saving...' : 'Complete Manual Prices'}
                            </button>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
}
