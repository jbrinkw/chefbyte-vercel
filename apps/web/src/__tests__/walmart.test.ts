
import { describe, it, expect } from 'vitest';
import { generateWalmartCartLink } from '../lib/walmart';

describe('generateWalmartCartLink', () => {
    it('should generate a link for a single item', () => {
        const items = [
            {
                amount: 1,
                products: {
                    walmart_link: 'https://www.walmart.com/ip/Some-Product/12345',
                    is_placeholder: false
                }
            }
        ];
        const link = generateWalmartCartLink(items);
        expect(link).toBe('https://affil.walmart.com/cart/addToCart?items=12345|1');
    });

    it('should generate a link for multiple items with different quantities', () => {
        const items = [
            {
                amount: 2,
                products: {
                    walmart_link: 'https://www.walmart.com/ip/Product-One/11111',
                    is_placeholder: false
                }
            },
            {
                amount: 5,
                products: {
                    walmart_link: 'https://www.walmart.com/ip/Product-Two/22222?query=param',
                    is_placeholder: false
                }
            }
        ];
        const link = generateWalmartCartLink(items);
        expect(link).toBe('https://affil.walmart.com/cart/addToCart?items=11111|2,22222|5');
    });

    it('should ignore placeholders and items without links', () => {
        const items = [
            {
                amount: 1,
                products: {
                    walmart_link: 'https://www.walmart.com/ip/Valid/33333',
                    is_placeholder: false
                }
            },
            {
                amount: 1,
                products: {
                    is_placeholder: true
                }
            },
            {
                amount: 1,
                products: {
                    walmart_link: '',
                    is_placeholder: false
                }
            }
        ];
        const link = generateWalmartCartLink(items);
        expect(link).toBe('https://affil.walmart.com/cart/addToCart?items=33333|1');
    });

    it('should return null if no valid items found', () => {
        const items = [
            {
                amount: 1,
                products: { is_placeholder: true }
            }
        ];
        const link = generateWalmartCartLink(items);
        expect(link).toBeNull();
    });

    it('should handle fractional amounts by rounding up', () => {
        const items = [
            {
                amount: 1.5,
                products: {
                    walmart_link: 'https://www.walmart.com/ip/Milk/44444',
                    is_placeholder: false
                }
            }
        ];
        const link = generateWalmartCartLink(items);
        expect(link).toBe('https://affil.walmart.com/cart/addToCart?items=44444|2');
    });
});
