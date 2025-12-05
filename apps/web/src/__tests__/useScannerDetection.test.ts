import { renderHook } from '@testing-library/react';
import { useScannerDetection } from '../hooks/useScannerDetection';
import { describe, it, expect, vi, afterEach, beforeEach } from 'vitest';

describe('useScannerDetection', () => {
    const onBarcodeScanned = vi.fn();

    beforeEach(() => {
        vi.useFakeTimers();
    });

    afterEach(() => {
        vi.clearAllMocks();
        vi.useRealTimers();
    });

    it('should detect a barcode scan', () => {
        renderHook(() => useScannerDetection({ onBarcodeScanned, minBarcodeLength: 3 }));

        let time = 1000;
        vi.setSystemTime(time);

        // Simulate '1'
        document.dispatchEvent(new KeyboardEvent('keydown', { key: '1' }));

        // Simulate '2' 10ms later
        time += 10;
        vi.setSystemTime(time);
        document.dispatchEvent(new KeyboardEvent('keydown', { key: '2' }));

        // Simulate '3' 10ms later
        time += 10;
        vi.setSystemTime(time);
        document.dispatchEvent(new KeyboardEvent('keydown', { key: '3' }));

        // Simulate 'Enter' 10ms later
        time += 10;
        vi.setSystemTime(time);
        const enterEvent = new KeyboardEvent('keydown', { key: 'Enter' });
        vi.spyOn(enterEvent, 'preventDefault');
        document.dispatchEvent(enterEvent);

        expect(onBarcodeScanned).toHaveBeenCalledWith('123');
        expect(enterEvent.preventDefault).toHaveBeenCalled();
    });

    it('should reset buffer on slow typing', () => {
        renderHook(() => useScannerDetection({ onBarcodeScanned, minBarcodeLength: 3 }));

        let time = 1000;
        vi.setSystemTime(time);

        // '1'
        document.dispatchEvent(new KeyboardEvent('keydown', { key: '1' }));

        // '2' 100ms later (slow, threshold is 50ms)
        time += 100;
        vi.setSystemTime(time);
        document.dispatchEvent(new KeyboardEvent('keydown', { key: '2' }));

        // '3' 10ms later (fast)
        time += 10;
        vi.setSystemTime(time);
        document.dispatchEvent(new KeyboardEvent('keydown', { key: '3' }));

        // 'Enter'
        time += 10;
        vi.setSystemTime(time);
        document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter' }));

        // Buffer should be '23' (length 2), which is < minBarcodeLength (3)
        expect(onBarcodeScanned).not.toHaveBeenCalled();
    });

    it('should ignore protected inputs', () => {
        renderHook(() => useScannerDetection({ onBarcodeScanned, protectedInputs: ['protected-input'] }));

        let time = 1000;
        vi.setSystemTime(time);

        const input = document.createElement('input');
        input.id = 'protected-input';
        document.body.appendChild(input);
        input.focus();

        // Simulate scan while focused on protected input
        // Note: dispatchEvent on document will have target as body unless we dispatch on element
        // But the hook listens on document.
        // The event.target will be the focused element if we dispatch on it?
        // Or we can mock the event target.

        const event = new KeyboardEvent('keydown', { key: '1', bubbles: true });
        Object.defineProperty(event, 'target', { value: input });

        document.dispatchEvent(event);

        // ... more keys ...

        // Actually, simpler to just verify buffer logic via internal state if exposed, but we can't.
        // We'll verify it doesn't trigger scan.

        time += 10;
        vi.setSystemTime(time);
        const event2 = new KeyboardEvent('keydown', { key: '2', bubbles: true });
        Object.defineProperty(event2, 'target', { value: input });
        document.dispatchEvent(event2);

        time += 10;
        vi.setSystemTime(time);
        const event3 = new KeyboardEvent('keydown', { key: '3', bubbles: true });
        Object.defineProperty(event3, 'target', { value: input });
        document.dispatchEvent(event3);

        time += 10;
        vi.setSystemTime(time);
        const eventEnter = new KeyboardEvent('keydown', { key: 'Enter', bubbles: true });
        Object.defineProperty(eventEnter, 'target', { value: input });
        document.dispatchEvent(eventEnter);

        expect(onBarcodeScanned).not.toHaveBeenCalled();

        document.body.removeChild(input);
    });
});
