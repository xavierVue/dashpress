import { cleanup } from "@testing-library/react";
import "@testing-library/jest-dom/extend-expect";

import { server } from "./server";

beforeAll(() => {
  server.listen();
});

afterEach(() => {
  cleanup();
  server.resetHandlers();
});

afterAll(() => server.close());

// if you need to add a handler after calling setupServer for some specific test
// this will remove that handler for the rest of them
// (which is important for test isolation):
