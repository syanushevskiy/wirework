/**
 * Playground shell — ONLY presentation (guidelines: render-only
 * components): the title and the MENU, which stay while the router swaps
 * the page underneath (`Outlet`). A menu entry is a plain link: the URL is
 * the state, and the route's loader opens the page visit (router.tsx).
 * Styling: Ant Design components plus the app's own semantic classes
 * (index.css); engine and widget packages stay on semantic CSS.
 */
import { Typography } from "antd";
import { NavLink, Outlet } from "react-router";
import { DEMO_HOME, PAGE_ROUTES } from "./routes";

const menu = PAGE_ROUTES.filter((route) => route.menu);
const demoMenu = menu.filter((route) => route.page !== "builder");
const toolsMenu = menu.filter((route) => route.page === "builder");

function MenuLinks({ routes }: { routes: typeof menu }) {
  return (
    <>
      {routes.map(({ page, path, title }) => (
        <NavLink
          key={page}
          to={path}
          // The demo's home is a prefix of its other pages: it is current only when exact.
          end={path === DEMO_HOME}
          data-testid={`nav-${page}`}
          className={({ isActive }) => (isActive ? "pg-nav-link pg-nav-link-active" : "pg-nav-link")}
        >
          {title}
        </NavLink>
      ))}
    </>
  );
}

export function App() {
  return (
    <main className="pg-main">
      <header className="pg-header">
        <Typography.Title level={2} className="pg-title">
          Wirework Playground
        </Typography.Title>
        <nav data-testid="nav" className="pg-nav" aria-label="Pages">
          <Typography.Text type="secondary">demo app</Typography.Text>
          <MenuLinks routes={demoMenu} />
          <span className="pg-nav-divider" aria-hidden="true" />
          <Typography.Text type="secondary">tools</Typography.Text>
          <MenuLinks routes={toolsMenu} />
        </nav>
      </header>
      <Outlet />
    </main>
  );
}
