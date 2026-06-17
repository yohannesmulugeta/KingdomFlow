/* eslint-env vitest */
import '@testing-library/jest-dom/vitest';
import { vi } from 'vitest';

// Mock the base44 client
vi.mock('@/api/base44Client', () => ({
  base44: {
    auth: {
      me: vi.fn(),
      isAuthenticated: vi.fn(),
      loginViaEmailPassword: vi.fn(),
      logout: vi.fn(),
      updatePassword: vi.fn(),
      redirectToLogin: vi.fn(),
    },
    entities: {
      User: {
        list: vi.fn(),
        filter: vi.fn(),
        get: vi.fn(),
        update: vi.fn(),
        create: vi.fn(),
        delete: vi.fn(),
      },
      Transaction: {
        list: vi.fn(),
        filter: vi.fn(),
        get: vi.fn(),
        update: vi.fn(),
        create: vi.fn(),
        delete: vi.fn(),
      },
      MoneyRequest: {
        list: vi.fn(),
        filter: vi.fn(),
        get: vi.fn(),
        update: vi.fn(),
        create: vi.fn(),
        delete: vi.fn(),
      },
      Fund: {
        list: vi.fn(),
        filter: vi.fn(),
        get: vi.fn(),
        update: vi.fn(),
        create: vi.fn(),
        delete: vi.fn(),
      },
      Budget: {
        list: vi.fn(),
        filter: vi.fn(),
        get: vi.fn(),
        update: vi.fn(),
        create: vi.fn(),
        delete: vi.fn(),
      },
      Branch: {
        list: vi.fn(),
        filter: vi.fn(),
        get: vi.fn(),
        update: vi.fn(),
        create: vi.fn(),
        delete: vi.fn(),
      },
      Department: {
        list: vi.fn(),
        filter: vi.fn(),
        get: vi.fn(),
        update: vi.fn(),
        create: vi.fn(),
        delete: vi.fn(),
      },
      IncomeCategory: {
        list: vi.fn(),
        filter: vi.fn(),
        get: vi.fn(),
        update: vi.fn(),
        create: vi.fn(),
        delete: vi.fn(),
      },
      ExpenseCategory: {
        list: vi.fn(),
        filter: vi.fn(),
        get: vi.fn(),
        update: vi.fn(),
        create: vi.fn(),
        delete: vi.fn(),
      },
      ChurchProfile: {
        list: vi.fn(),
        filter: vi.fn(),
        get: vi.fn(),
        update: vi.fn(),
        create: vi.fn(),
        delete: vi.fn(),
      },
      AuditLog: {
        list: vi.fn(),
        filter: vi.fn(),
        get: vi.fn(),
        update: vi.fn(),
        create: vi.fn(),
        delete: vi.fn(),
      },
      PendingInvitation: {
        list: vi.fn(),
        filter: vi.fn(),
        get: vi.fn(),
        update: vi.fn(),
        create: vi.fn(),
        delete: vi.fn(),
      },
      ApprovalHistory: {
        list: vi.fn(),
        filter: vi.fn(),
        get: vi.fn(),
        update: vi.fn(),
        create: vi.fn(),
        delete: vi.fn(),
      },
      ApprovalRule: {
        list: vi.fn(),
        filter: vi.fn(),
        get: vi.fn(),
        update: vi.fn(),
        create: vi.fn(),
        delete: vi.fn(),
      },
    },
    functions: {
      invoke: vi.fn(),
    },
    users: {
      inviteUser: vi.fn(),
    },
    analytics: {
      track: vi.fn(),
    },
  },
}));

// Mock react-router-dom
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return {
    ...actual,
    useNavigate: () => vi.fn(),
    useParams: () => ({}),
    useLocation: () => ({ pathname: '/' }),
  };
});