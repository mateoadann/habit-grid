import { render, screen } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("../src/services/habitApi.js", () => ({
  getAllHabits: vi.fn().mockResolvedValue([]),
  createHabit: vi.fn(),
  updateHabit: vi.fn(),
  deleteHabit: vi.fn(),
}));

vi.mock("../src/services/contributionApi.js", () => ({
  getContributions: vi.fn().mockResolvedValue([]),
  logContribution: vi.fn(),
}));

vi.mock("../src/services/unitApi.js", () => ({
  getAllUnits: vi.fn().mockResolvedValue([]),
  createUnit: vi.fn(),
  deleteUnit: vi.fn(),
}));

vi.mock("../src/services/integrationApi.js", () => ({
  getIntegrations: vi.fn().mockResolvedValue([]),
  updateIntegration: vi.fn(),
}));

vi.mock("../src/services/syncApi.js", () => ({
  syncStrava: vi.fn(),
  syncGitHub: vi.fn(),
}));

vi.mock("../src/contexts/AuthContext.jsx", () => ({
  useAuth: () => ({
    user: { id: "user_test", username: "testuser" },
    loading: false,
    isAuthenticated: true,
    login: vi.fn(),
    logout: vi.fn(),
  }),
  AuthProvider: ({ children }) => children,
}));

import App from "../src/App.jsx";

describe("App", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders loading state initially", () => {
    render(<App />);
    expect(screen.getByText("Cargando...")).toBeInTheDocument();
  });

  it("renders main heading after data loads", async () => {
    render(<App />);
    const heading = await screen.findByText(/habit/);
    expect(heading).toBeInTheDocument();
  });
});
