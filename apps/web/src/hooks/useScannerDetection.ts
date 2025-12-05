import { useEffect, useRef } from 'react';

interface ScannerDetectionOptions {
    onBarcodeScanned: (barcode: string) => void;
    minBarcodeLength?: number;
    maxBarcodeLength?: number;
    scanSpeedThreshold?: number; // ms between keys
    protectedInputs?: string[]; // IDs of inputs to ignore
}

export const useScannerDetection = ({
    onBarcodeScanned,
    minBarcodeLength = 6,
    maxBarcodeLength = 24,
    scanSpeedThreshold = 50,
    protectedInputs = ['tempItemName', 'tempItemCals', 'tempItemCarbs', 'tempItemFats', 'tempItemProtein', 'barcode']
}: ScannerDetectionOptions) => {
    const bufferRef = useRef<string>('');
    const lastKeyTimeRef = useRef<number>(0);
    const isScanningRef = useRef<boolean>(false);
    const resetTimerRef = useRef<NodeJS.Timeout | null>(null);

    useEffect(() => {
        const isProtectedTarget = (target: EventTarget | null) => {
            if (!target || !(target instanceof HTMLElement)) return false;

            // Check ID
            if (target.id && protectedInputs.includes(target.id)) return true;

            // Check class names (legacy compatibility)
            if (target.classList.contains('customLinkInput') || target.classList.contains('manualPriceInput')) return true;

            // Allow interception for keypad 'screen' input (if it exists), protect other inputs
            const tag = target.tagName.toLowerCase();
            if ((tag === 'input' || tag === 'textarea') && target.id !== 'screen') return true;

            return false;
        };

        const resetBuffer = () => {
            if (resetTimerRef.current) clearTimeout(resetTimerRef.current);
            resetTimerRef.current = setTimeout(() => {
                bufferRef.current = '';
                isScanningRef.current = false;
            }, 300);
        };

        const handleKeyDown = (e: KeyboardEvent) => {
            const target = e.target as HTMLElement;

            // Don't intercept when typing in protected fields
            if (isProtectedTarget(target)) {
                bufferRef.current = '';
                isScanningRef.current = false;
                return;
            }

            const now = Date.now();
            const delta = now - lastKeyTimeRef.current;

            // Digits: accumulate into buffer when arriving quickly
            if (e.key >= '0' && e.key <= '9') {
                const isScreenFocused = target.id === 'screen';

                if (isScreenFocused) {
                    // Special handling for screen input to prevent scanner digits from appearing
                    if (delta < scanSpeedThreshold || bufferRef.current.length === 0) {
                        bufferRef.current += e.key;

                        // If this is the second fast digit, treat as scanner and prevent input
                        if (!isScanningRef.current && bufferRef.current.length >= 2 && delta < scanSpeedThreshold) {
                            isScanningRef.current = true;
                            e.preventDefault();
                            // Note: In React we might need to handle the screen value revert differently 
                            // if it was a controlled input, but preventing default helps.
                        } else if (isScanningRef.current) {
                            e.preventDefault();
                        }
                    } else {
                        // Slow typing -> human; reset scanner detection
                        bufferRef.current = e.key;
                        isScanningRef.current = false;
                    }
                } else {
                    // Non-screen context
                    if (delta < scanSpeedThreshold || bufferRef.current.length === 0) {
                        bufferRef.current += e.key;
                    } else {
                        bufferRef.current = e.key;
                    }
                }

                lastKeyTimeRef.current = now;
                resetBuffer();
                return;
            }

            // Enter: commit if buffer looks like a barcode
            if ((e.key === 'Enter') && bufferRef.current.length >= minBarcodeLength && bufferRef.current.length <= maxBarcodeLength) {
                e.preventDefault();
                e.stopPropagation();

                const barcode = bufferRef.current;
                bufferRef.current = '';
                isScanningRef.current = false;

                onBarcodeScanned(barcode);
                return;
            }

            // Any other key (besides modifiers) clears the buffer
            const isModifier = (e.key === 'Shift' || e.key === 'Control' || e.key === 'Alt' || e.key === 'Meta');
            if (!isModifier) {
                bufferRef.current = '';
                isScanningRef.current = false;
            }
        };

        document.addEventListener('keydown', handleKeyDown, true); // Use capture phase to intercept early

        return () => {
            document.removeEventListener('keydown', handleKeyDown, true);
            if (resetTimerRef.current) clearTimeout(resetTimerRef.current);
        };
    }, [onBarcodeScanned, minBarcodeLength, maxBarcodeLength, scanSpeedThreshold, protectedInputs]);
};
