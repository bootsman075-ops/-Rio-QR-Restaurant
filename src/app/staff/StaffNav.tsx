import Link from "next/link";

type StaffNavProps = {
  current: "requests" | "reservations" | "menu";
};

const items = [
  { key: "requests", href: "/staff", label: "Tafelverzoeken" },
  { key: "reservations", href: "/staff/reserveringen", label: "Reserveringen" },
  { key: "menu", href: "/staff/menu", label: "Menu beheren" },
] as const;

export default function StaffNav({ current }: StaffNavProps) {
  return (
    <>
      <style>{`
        .staff-nav {
          display: flex;
          flex-wrap: wrap;
          gap: 8px;
          margin-bottom: 28px;
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
      `}</style>

      <nav className="staff-nav" aria-label="Personeelsmenu">
        {items.map((item) => (
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
    </>
  );
}
