import '@testing-library/jest-dom';
import { vi } from 'vitest';

// Mock Supabase client
const mockSupabaseClient = {
  auth: {
    getUser: vi.fn().mockResolvedValue({
      data: { user: { id: 'test-user-id' } },
      error: null,
    }),
    signInWithPassword: vi.fn(),
    signUp: vi.fn(),
    signOut: vi.fn(),
    onAuthStateChange: vi.fn(() => ({
      data: { subscription: { unsubscribe: vi.fn() } },
    })),
  },
  from: vi.fn((table: string) => createQueryBuilder(table)),
};

// Query builder mock with chainable methods
function createQueryBuilder(table: string) {
  const data: any[] = [];
  const builder: any = {
    _table: table,
    _filters: [] as any[],
    _data: data,

    select: vi.fn().mockReturnThis(),
    insert: vi.fn().mockReturnThis(),
    update: vi.fn().mockReturnThis(),
    delete: vi.fn().mockReturnThis(),
    upsert: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    neq: vi.fn().mockReturnThis(),
    gt: vi.fn().mockReturnThis(),
    gte: vi.fn().mockReturnThis(),
    lt: vi.fn().mockReturnThis(),
    lte: vi.fn().mockReturnThis(),
    is: vi.fn().mockReturnThis(),
    in: vi.fn().mockReturnThis(),
    not: vi.fn().mockReturnThis(),
    order: vi.fn().mockReturnThis(),
    limit: vi.fn().mockReturnThis(),
    single: vi.fn().mockResolvedValue({ data: null, error: null }),

    // Terminal methods
    then: (resolve: Function) => resolve({ data: [], error: null }),
  };

  return builder;
}

// Mock the supabase module
vi.mock('../lib/supabase', () => ({
  supabase: mockSupabaseClient,
}));

// Export for use in tests
export { mockSupabaseClient, createQueryBuilder };

// Reset mocks between tests
beforeEach(() => {
  vi.clearAllMocks();
});
