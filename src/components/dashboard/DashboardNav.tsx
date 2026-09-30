import Link from "next/link";

import { DASHBOARD_NAV } from "./areas";
import type { DashboardArea, DashboardSection } from "./areas";
import { logout } from "./auth-actions";
import { ROLE_LABELS } from "@/lib/permissions";
import { getStaffRole } from "@/lib/staff-session";

type DashboardNavProps = {
  area: DashboardArea;
  current: DashboardSection;
};

export default async function DashboardNav({ area, current }: DashboardNavProps) {
  const role = await getStaffRole();

  return (
    <>
      <style>{`
        .staff-nav-bar {
          display: flex;
          flex-wrap: wrap;
          justify-content: space-between;
          align-items: center;
          gap: 12px;
          margin-bottom: 28px;
        }

        .staff-nav {
          display: flex;
          flex-wrap: wrap;
          gap: 8px;
        }

        .staff-nav-link {
          padding: 10px 18px;
          border: 1px solid rgba(23,23,20,.12);
          border-radius: 999px;
          background: rgba(255,255,255,.55);
          color: #171714;
          font-size: 14px;
          font-weight: 800;
          text-decoration: none;
        }

        .staff-nav-link:hover {
          border-color: #a87c36;
        }

        .staff-nav-link[aria-current="page"] {
          background: #171714;
          border-color: #171714;
          color: #fff;
        }

        .staff-session {
          display: flex;
          align-items: center;
          gap: 8px;
          margin: 0;
        }

        .staff-role {
          padding: 8px 14px;
          border-radius: 999px;
          font-size: 13px;
          font-weight: 700;
          color: #777267;
          background: rgba(255,255,255,.55);
          border: 1px solid rgba(23,23,20,.10);
        }

        .staff-role strong {
          color: #171714;
        }

        .staff-role.is-manager {
          border-color: rgba(168,124,54,.45);
          background: rgba(168,124,54,.12);
        }

        .staff-logout {
          padding: 8px 14px;
          border: 1px solid rgba(23,23,20,.16);
          border-radius: 999px;
          background: transparent;
          color: #171714;
          font: inherit;
          font-size: 13px;
          font-weight: 800;
          cursor: pointer;
        }

        .staff-logout:hover {
          opacity: .75;
        }
      `}</style>

      <div className="staff-nav-bar">
        <nav
          className="staff-nav"
          aria-label={area === "management" ? "Managementmenu" : "Personeelsmenu"}
        >
          {DASHBOARD_NAV[area].map((item) => (
            <Link
              key={item.key}
              href={item.href}
              className="staff-nav-link"
              aria-current={item.key === current ? "page" : undefined}
            >
              {item.label}
            </Link>
          ))}
        </nav>

        {role && (
          <form action={logout} className="staff-session">
            <span className={`staff-role${role === "manager" ? " is-manager" : ""}`}>
              Ingelogd als <strong>{ROLE_LABELS[role]}</strong>
            </span>
            <button type="submit" className="staff-logout">
              Uitloggen
            </button>
          </form>
        )}
      </div>
    </>
  );
}
