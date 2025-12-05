/**
 * Caching layer for locations and other frequently accessed data
 * Refactored to use PostgreSQL
 */

import { supabase } from './db-supabase';

interface Location {
    id: number;
    name: string;
}

// Cache storage
let locationsCache: Location[] | null = null;
let locationsByName: Map<string, Location> | null = null;

/**
 * Load all locations from database
 */
export async function loadLocations(): Promise<Location[]> {
    try {
        const { data: rows, error } = await supabase
            .from('locations')
            .select('*')
            .order('name');

        if (error) throw error;

        locationsCache = rows || [];
        locationsByName = new Map();
        for (const loc of locationsCache) {
            locationsByName.set(loc.name.toLowerCase(), loc);
        }

        console.log(`[caches] Loaded ${locationsCache.length} locations from DB`);
        return locationsCache;
    } catch (err) {
        console.error('[caches] Error loading locations:', err);
        locationsCache = [];
        locationsByName = new Map();
        return [];
    }
}

/**
 * Get all locations (returns cached data after initial load)
 */
export function getLocations(): Location[] {
    if (!locationsCache) {
        throw new Error('Locations cache not initialized. Call loadLocations() first.');
    }
    return locationsCache;
}

/**
 * Find a location by name (case-insensitive)
 */
export function findLocationByName(name: string): Location | null {
    if (!locationsByName) {
        throw new Error('Locations cache not initialized. Call loadLocations() first.');
    }
    return locationsByName.get(name.toLowerCase()) || null;
}

/**
 * Get location by ID
 */
export function getLocationById(id: number): Location | null {
    if (!locationsCache) {
        throw new Error('Locations cache not initialized. Call loadLocations() first.');
    }
    return locationsCache.find(loc => loc.id === id) || null;
}
