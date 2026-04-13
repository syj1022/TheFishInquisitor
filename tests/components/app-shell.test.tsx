// abstract: Contract tests for the top-level application shell rendering.
// out_of_scope: Integration coverage for parser, evaluator, and voice modules.

import { render, screen } from "@testing-library/react";
import App from "../../src/App";

test("renders TheFishInquisitor title", () => {
  render(<App />);
  expect(screen.getByText("TheFishInquisitor")).toBeInTheDocument();
});
