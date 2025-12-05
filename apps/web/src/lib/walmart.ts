
export function generateWalmartCartLink(items: any[]): string | null {
    const cartItems: string[] = [];

    for (const item of items) {
        if (item.products?.is_placeholder) continue;

        const url = item.products?.walmart_link;
        if (!url) continue;

        // Extract ID from URL
        // Supports:
        // .../ip/Name/12345
        // .../ip/Name/12345?query
        const match = url.match(/\/ip\/[^\/]+\/(\d+)/);
        if (match && match[1]) {
            const qty = Math.ceil(item.amount);
            if (qty > 0) {
                cartItems.push(`${match[1]}|${qty}`);
            }
        }
    }

    if (cartItems.length === 0) return null;

    return `https://affil.walmart.com/cart/addToCart?items=${cartItems.join(',')}`;
}
