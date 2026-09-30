import { createClient } from "@/lib/supabase/server";
import ServiceActions from "./ServiceActions";

type PageProps = {
  params: Promise<{
    token: string;
  }>;
};

function sectionSlug(name: string) {
  return name
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/&/g, "en")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

function formatPrice(priceCents: number) {
  return new Intl.NumberFormat("nl-NL", {
    style: "currency",
    currency: "EUR",
  }).format(priceCents / 100);
}

export default async function QrTablePage({ params }: PageProps) {
  const { token } = await params;
  const supabase = await createClient();

  const { data: qrData, error: qrError } = await supabase.rpc(
    "resolve_qr_token",
    {
      p_token: token,
    }
  );

  const table = qrData?.[0];

  if (qrError || !table) {
    return (
      <>
        <style>{`
          * {
            box-sizing: border-box;
          }

          body {
            margin: 0;
            background: #f4f0e8;
            color: #171714;
            font-family: Arial, Helvetica, sans-serif;
          }

          .invalid-wrap {
            min-height: 100vh;
            display: grid;
            place-items: center;
            padding: 24px;
          }

          .invalid-card {
            width: 100%;
            max-width: 460px;
            background: #fff;
            padding: 42px 30px;
            border-radius: 28px;
            text-align: center;
            box-shadow: 0 24px 70px rgba(0,0,0,.08);
          }

          .invalid-mark {
            width: 54px;
            height: 54px;
            border-radius: 50%;
            display: grid;
            place-items: center;
            margin: 0 auto 22px;
            background: #171714;
            color: white;
            font-size: 24px;
          }

          .invalid-card h1 {
            margin: 0 0 12px;
            font-size: 26px;
          }

          .invalid-card p {
            margin: 0;
            color: #6e6b63;
            line-height: 1.6;
          }
        `}</style>

        <main className="invalid-wrap">
          <div className="invalid-card">
            <div className="invalid-mark">!</div>
            <h1>QR-code niet geldig</h1>
            <p>
              Deze QR-code is ongeldig, verlopen of niet meer actief.
            </p>
          </div>
        </main>
      </>
    );
  }

  const { data: sections } = await supabase
    .from("menu_sections")
    .select("id, name, description, sort_order")
    .eq("restaurant_id", table.restaurant_id)
    .eq("is_visible", true)
    .order("sort_order");

  const { data: items } = await supabase
    .from("menu_items")
    .select(
      "id, section_id, name, description, price_cents, sort_order, is_available, image_url"
    )
    .eq("restaurant_id", table.restaurant_id)
    .eq("is_visible", true)
    .order("sort_order");

  const totalItems = items?.length ?? 0;

  return (
    <>
      <style>{`
        :root {
          --ink: #171714;
          --muted: #777267;
          --cream: #f3efe5;
          --cream-dark: #e8e0d0;
          --paper: #fffdf8;
          --line: rgba(23, 23, 20, 0.10);
          --accent: #9c7333;
        }

        * {
          box-sizing: border-box;
        }

        html {
          scroll-behavior: smooth;
        }

        body {
          margin: 0;
          background:
            radial-gradient(circle at top right, rgba(156,115,51,.08), transparent 32%),
            var(--cream);
          color: var(--ink);
          font-family: Arial, Helvetica, sans-serif;
        }

        a {
          color: inherit;
          text-decoration: none;
        }

        .page {
          min-height: 100vh;
        }

        .hero {
          padding: 54px 20px 34px;
        }

        .hero-inner,
        .content {
          width: 100%;
          max-width: 820px;
          margin: 0 auto;
        }

        .eyebrow {
          margin: 0 0 9px;
          color: var(--accent);
          font-size: 12px;
          font-weight: 800;
          letter-spacing: .17em;
          text-transform: uppercase;
        }

        .restaurant-name {
          margin: 0;
          font-size: clamp(52px, 10vw, 88px);
          line-height: .92;
          letter-spacing: -.055em;
          font-weight: 500;
        }

        .brand-tagline {
          margin: 18px 0 0;
          max-width: 520px;
          color: #6f695e;
          font-size: 16px;
          line-height: 1.6;
        }

        .brand-tagline strong {
          display: block;
          margin-bottom: 3px;
          color: #171714;
          font-weight: 700;
        }

        .hero-bottom {
          margin-top: 28px;
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 18px;
          flex-wrap: wrap;
        }

        .table-badge {
          display: inline-flex;
          align-items: center;
          gap: 9px;
          padding: 10px 14px;
          border-radius: 999px;
          background: var(--ink);
          color: white;
          font-size: 14px;
          font-weight: 700;
        }

        .table-dot {
          width: 7px;
          height: 7px;
          background: #d8ad68;
          border-radius: 50%;
        }

        .item-count {
          color: var(--muted);
          font-size: 14px;
        }

        .nav-wrap {
          position: sticky;
          top: 0;
          z-index: 20;
          padding: 10px 0 11px;
          background: rgba(243,239,229,.92);
          backdrop-filter: blur(14px);
          border-top: 1px solid rgba(23,23,20,.04);
          border-bottom: 1px solid rgba(23,23,20,.08);
        }

        .nav {
          max-width: 860px;
          margin: 0 auto;
          padding: 0 20px;
          display: flex;
          gap: 8px;
          overflow-x: auto;
          scrollbar-width: none;
        }

        .nav::-webkit-scrollbar {
          display: none;
        }

        .nav-link {
          flex: 0 0 auto;
          padding: 10px 16px;
          border-radius: 999px;
          background: rgba(255,255,255,.6);
          border: 1px solid var(--line);
          font-size: 14px;
          font-weight: 700;
          transition: all .18s ease;
        }

        .nav-link:hover {
          background: var(--ink);
          color: white;
        }

        .content {
          padding: 42px 20px 90px;
        }

        .menu-title {
          margin: 0 0 10px;
          font-size: clamp(34px, 7vw, 52px);
          letter-spacing: -.04em;
          font-weight: 500;
        }

        .menu-intro {
          max-width: 520px;
          margin: 0 0 50px;
          color: var(--muted);
          font-size: 16px;
          line-height: 1.7;
        }

        .section {
          scroll-margin-top: 92px;
          margin-bottom: 62px;
        }

        .section-heading {
          display: flex;
          align-items: end;
          justify-content: space-between;
          gap: 20px;
          padding-bottom: 16px;
          margin-bottom: 8px;
          border-bottom: 1px solid rgba(23,23,20,.15);
        }

        .section-name {
          margin: 0;
          font-size: clamp(30px, 6vw, 42px);
          line-height: 1;
          letter-spacing: -.035em;
          font-weight: 500;
        }

        .section-number {
          color: var(--accent);
          font-size: 13px;
          font-weight: 800;
          letter-spacing: .1em;
        }

        .section-description {
          margin: 14px 0 24px;
          color: var(--muted);
          line-height: 1.6;
          max-width: 580px;
        }

        .dish-list {
          display: grid;
          gap: 10px;
        }

        .dish {
          position: relative;
          display: grid;
          grid-template-columns: minmax(0, 1fr) auto;
          gap: 22px;
          padding: 22px 22px 21px;
          background: rgba(255,253,248,.76);
          border: 1px solid rgba(23,23,20,.08);
          border-radius: 20px;
          transition:
            transform .18s ease,
            border-color .18s ease,
            box-shadow .18s ease;
        }

        .dish:hover {
          transform: translateY(-2px);
          border-color: rgba(156,115,51,.32);
          box-shadow: 0 16px 36px rgba(42,32,17,.06);
        }

        .dish-main {
          min-width: 0;
        }

        .dish-image {
          grid-column: 1 / -1;
          display: block;
          width: 100%;
          aspect-ratio: 16 / 9;
          object-fit: cover;
          border-radius: 14px;
          background: var(--cream-dark);
        }

        .dish-name {
          margin: 0;
          font-size: 18px;
          line-height: 1.3;
          font-weight: 700;
        }

        .dish-description {
          margin: 8px 0 0;
          color: var(--muted);
          font-size: 14px;
          line-height: 1.55;
        }

        .dish-price {
          align-self: start;
          white-space: nowrap;
          font-size: 17px;
          font-weight: 800;
          letter-spacing: -.02em;
        }

        .unavailable {
          display: inline-flex;
          margin-top: 12px;
          padding: 6px 9px;
          border-radius: 999px;
          background: #eee8dc;
          color: #746b5c;
          font-size: 11px;
          font-weight: 800;
          letter-spacing: .06em;
          text-transform: uppercase;
        }

        .empty {
          padding: 22px;
          border: 1px dashed rgba(23,23,20,.2);
          border-radius: 18px;
          color: var(--muted);
          background: rgba(255,255,255,.34);
        }

        .footer {
          padding: 30px 20px 50px;
          text-align: center;
          color: var(--muted);
          font-size: 12px;
        }

        .footer-line {
          width: 44px;
          height: 1px;
          margin: 0 auto 18px;
          background: var(--accent);
        }

        @media (max-width: 600px) {
          .hero {
            padding-top: 38px;
          }

          .brand-tagline {
          margin: 18px 0 0;
          max-width: 520px;
          color: #6f695e;
          font-size: 16px;
          line-height: 1.6;
        }

        .brand-tagline strong {
          display: block;
          margin-bottom: 3px;
          color: #171714;
          font-weight: 700;
        }

        .hero-bottom {
            margin-top: 24px;
          }

          .content {
            padding-top: 34px;
          }

          .menu-intro {
            margin-bottom: 40px;
          }

          .section {
            margin-bottom: 52px;
          }

          .dish {
            gap: 12px;
            padding: 18px 17px;
            border-radius: 17px;
          }

          .dish-name {
            font-size: 16px;
          }

          .dish-price {
            font-size: 15px;
          }

          .dish-description {
            font-size: 13px;
          }
        }
      `}</style>

      <main className="page">
        <header className="hero">
          <div className="hero-inner">
            <p className="eyebrow">Welkom bij</p>

            <h1 className="restaurant-name">
              R.I.O.
            </h1>

            <p className="brand-tagline">
              <strong>A Taste of Southern Europe Along the IJssel</strong>
              Dine. Share. Stay longer.
            </p>

            <div className="hero-bottom">
              <div className="table-badge">
                <span className="table-dot" />
                {table.table_label ?? `Tafel ${table.table_number}`}
              </div>

              <span className="item-count">
                {totalItems} gerechten
              </span>
            </div>
          </div>
        </header>

        <nav className="nav-wrap" aria-label="Menucategorieën">
          <div className="nav">
            {sections?.map((section) => (
              <a
                key={section.id}
                className="nav-link"
                href={`#${sectionSlug(section.name)}`}
              >
                {section.name}
              </a>
            ))}
          </div>
        </nav>

        <ServiceActions token={token} />

        <div className="content">
          <h2 className="menu-title">Menukaart</h2>

          <p className="menu-intro">
            Ontdek de gerechten van {table.restaurant_name}.
            Selecteer hierboven een categorie of scroll rustig door
            de volledige menukaart.
          </p>

          {sections?.map((section, index) => {
            const sectionItems =
              items?.filter(
                (item) => item.section_id === section.id
              ) ?? [];

            return (
              <section
                className="section"
                id={sectionSlug(section.name)}
                key={section.id}
              >
                <div className="section-heading">
                  <h3 className="section-name">
                    {section.name}
                  </h3>

                  <span className="section-number">
                    {String(index + 1).padStart(2, "0")}
                  </span>
                </div>

                {section.description && (
                  <p className="section-description">
                    {section.description}
                  </p>
                )}

                {sectionItems.length === 0 ? (
                  <div className="empty">
                    Gerechten worden binnenkort toegevoegd.
                  </div>
                ) : (
                  <div className="dish-list">
                    {sectionItems.map((item) => (
                      <article className="dish" key={item.id}>
                        {item.image_url && (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img
                            className="dish-image"
                            src={item.image_url}
                            alt={item.name}
                            loading="lazy"
                          />
                        )}

                        <div className="dish-main">
                          <h4 className="dish-name">
                            {item.name}
                          </h4>

                          {item.description && (
                            <p className="dish-description">
                              {item.description}
                            </p>
                          )}

                          {!item.is_available && (
                            <span className="unavailable">
                              Tijdelijk niet beschikbaar
                            </span>
                          )}
                        </div>

                        <div className="dish-price">
                          {formatPrice(item.price_cents)}
                        </div>
                      </article>
                    ))}
                  </div>
                )}
              </section>
            );
          })}
        </div>

        <footer className="footer">
          <div className="footer-line" />
          R.I.O. · Welle 20 · Deventer
        </footer>
      </main>
    </>
  );
}
