import '@testing-library/jest-dom/vitest'

const chromeMock = {
  storage: {
    sync: {
      get: vi.fn(),
      set: vi.fn(),
    },
  },
  runtime: {
    lastError: null,
  },
  tabs: {
    query: vi.fn(),
    remove: vi.fn(),
  },
  downloads: {
    download: vi.fn(),
    showDefaultFolder: vi.fn(),
  },
  i18n: {
    getMessage: vi.fn((key: string) => key),
  },
}

vi.stubGlobal('chrome', chromeMock)
