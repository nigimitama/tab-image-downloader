import { vi } from "vitest"
import "@testing-library/jest-dom/vitest"

const chromeMock = {
  storage: {
    sync: {
      get: vi.fn(),
      set: vi.fn(),
    },
  },
  runtime: {
    lastError: null,
    onInstalled: {
      addListener: vi.fn(),
    },
    onStartup: {
      addListener: vi.fn(),
    },
    onMessage: {
      addListener: vi.fn(),
    },
  },
  tabs: {
    query: vi.fn(),
    remove: vi.fn(),
  },
  downloads: {
    download: vi.fn(),
    showDefaultFolder: vi.fn(),
  },
  scripting: {
    executeScript: vi.fn(),
  },
  declarativeNetRequest: {
    updateDynamicRules: vi.fn(),
    RuleActionType: {
      MODIFY_HEADERS: "modifyHeaders",
    },
    HeaderOperation: {
      SET: "set",
    },
    ResourceType: {
      IMAGE: "image",
      OTHER: "other",
      XMLHTTPREQUEST: "xmlhttprequest",
    },
  },
  i18n: {
    getMessage: vi.fn((key: string) => key),
  },
}

vi.stubGlobal("chrome", chromeMock)
