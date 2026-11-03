/** Every suite renders in jsdom: unmount after each test (without vitest globals, Testing Library cannot do it by itself). */
import "./animation-event";
import { cleanup } from "@testing-library/react";
import { afterEach } from "vitest";

afterEach(cleanup);
