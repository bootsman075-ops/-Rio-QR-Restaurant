import Link from "next/link";

import LiveRefresh from "../LiveRefresh";
import StaffNav from "../StaffNav";
import ConfirmSubmitButton from "./ConfirmSubmitButton";
import MenuItemForm from "./MenuItemForm";
import SectionForm from "./SectionForm";
import {
  deleteMenuItem,
  deleteSection,
  moveMenuItem,
  setMenuItemAvailability,
  setSectionVisibility,
} from "./actions";
import { requireStaffSession } from "@/lib/staff-session";
import { createAdminClient } from "@/lib/supabase/admin";
import { PILOT_RESTAURANT_SLUG } from "@/lib/reservations";
import { formatPrice, priceToInput } from "@/lib/menu";

export const dynamic = "force-dynamic";

const BASE_PATH = "/staff/menu";

type MenuPageProps = {
  searchParams: Promise<{
    gerecht?: string;
    "nieuw-gerecht"?: string;
    categorie?: string;
    "nieuwe-categorie"?: string;
    ok?: string;
    fout?: string;
  }>;
};

type SectionRow = {
  id: string;
  name: string;
  description: string | null;
  sort_order: number;
  is_visible: boolean;
};

type ItemRow = {
  id: string;
  section_id: string;
  name: string;
  description: string | null;
  price_cents: number;
  image_url: string | null;
  sort_order: number;
  is_available: boolean;
  is_visible: boolean;
};

const SUCCESS_MESSAGES: Record<string, string> = {
  "gerecht-toegevoegd": "Het gerecht is toegevoegd.",
  "gerecht-gewijzigd": "Het gerecht is gewijzigd.",
  "gerecht-verwijderd": "Het gerecht is verwijderd.",
  "categorie-toegevoegd": "De categorie is toegevoegd.",
  "categorie-gewijzigd": "De categorie is gewijzigd.",
  "categorie-verwijderd": "De categorie is verwijderd.",
};

const ERROR_MESSAGES: Record<string, string> = {
  "geen-rechten": "Deze actie is alleen beschikbaar voor een manager.",
  "categorie-niet-leeg":
    "Deze categorie bevat nog gerechten. Verplaats of verwijder die eerst, of verberg de categorie.",
};

export default async function MenuAdminPage({ searchParams }: MenuPageProps) {
  const role = await requireStaffSession();
  const isManager = role === "manager";
  const params = await searchParams;

  const supabaseConfigured =
    !!process.env.NEXT_PUBLIC_SUPABASE_URL && !!process.env.SUPABASE_SECRET_KEY;

  let sections: SectionRow[] = [];
  let items: ItemRow[] = [];
  let loadError = false;

  if (supabaseConfigured) {
    const supabase = createAdminClient();

    const { data: restaurant } = await supabase
      .from("restaurants")
      .select("id")
      .eq("slug", PILOT_RESTAURANT_SLUG)
      .maybeSingle();

    if (!restaurant) {
      loadError = true;
    } else {
      const [sectionsResult, itemsResult] = await Promise.all([
        supabase
          .from("menu_sections")
          .select("id, name, description, sort_order, is_visible")
          .eq("restaurant_id", restaurant.id)
          .order("sort_order", { ascending: true })
          .order("name", { ascending: true }),
        supabase
          .from("menu_items")
          .select(
            "id, section_id, name, description, price_cents, image_url, sort_order, is_available, is_visible",
          )
          .eq("restaurant_id", restaurant.id)
          .order("sort_order", { ascending: true })
          .order("name", { ascending: true }),
      ]);

      if (sectionsResult.error || itemsResult.error) {
        console.error(sectionsResult.error ?? itemsResult.error);
        loadError = true;
      } else {
        sections = sectionsResult.data;
        items = itemsResult.data;
      }
    }
  }

  const editingItem = params.gerecht
    ? (items.find((item) => item.id === params.gerecht) ?? null)
    : null;
  const newItemSection =
    isManager && params["nieuw-gerecht"] === "1" && !editingItem
      ? (sections.find((section) => section.id === params.categorie) ?? sections[0] ?? null)
      : null;
  const editingSection =
    isManager && params.categorie && !params["nieuw-gerecht"]
      ? (sections.find((section) => section.id === params.categorie) ?? null)
      : null;
  const showNewSection = isManager && params["nieuwe-categorie"] === "1";

  const unavailableCount = items.filter((item) => !item.is_available).length;
  const visibleSectionCount = sections.filter((section) => section.is_visible).length;

  const successMessage = params.ok ? SUCCESS_MESSAGES[params.ok] : undefined;
  const errorMessage = params.fout ? ERROR_MESSAGES[params.fout] : undefined;

  return (
    <>
      <style>{`
        :root {
          --bg: #f3efe5;
          --ink: #171714;
          --muted: #777267;
          --gold: #a87c36;
          --paper: #fffdf8;
          --line: rgba(23,23,20,.10);
        }

        * {
          box-sizing: border-box;
        }

        body {
          margin: 0;
          background: var(--bg);
          color: var(--ink);
          font-family: Arial, Helvetica, sans-serif;
        }

        .staff-page {
          min-height: 100vh;
          padding: 42px 20px 80px;
        }

        .wrap {
          width: 100%;
          max-width: 1050px;
          margin: 0 auto;
        }

        .top {
          display: flex;
          justify-content: space-between;
          align-items: flex-end;
          gap: 20px;
          margin-bottom: 34px;
        }

        .eyebrow {
          margin: 0 0 8px;
          color: var(--gold);
          font-size: 12px;
          font-weight: 800;
          letter-spacing: .16em;
          text-transform: uppercase;
        }

        h1 {
          margin: 0;
          font-size: clamp(38px, 7vw, 64px);
          letter-spacing: -.05em;
          font-weight: 500;
        }

        .subtitle {
          margin: 10px 0 0;
          color: var(--muted);
        }

        .top-actions {
          display: flex;
          flex-wrap: wrap;
          gap: 8px;
        }

        .stats {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 12px;
          margin-bottom: 28px;
        }

        .stat {
          padding: 20px;
          background: rgba(255,255,255,.55);
          border: 1px solid var(--line);
          border-radius: 20px;
        }

        .stat-label {
          color: var(--muted);
          font-size: 13px;
        }

        .stat-value {
          margin-top: 8px;
          font-size: 32px;
          font-weight: 700;
        }

        .primary-button,
        .link-button,
        .small-button {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          border: 0;
          border-radius: 999px;
          font-weight: 800;
          cursor: pointer;
          text-decoration: none;
          white-space: nowrap;
          font-family: inherit;
        }

        .primary-button {
          padding: 12px 20px;
          background: var(--ink);
          color: #fff;
          font-size: 14px;
        }

        .primary-button:disabled {
          opacity: .6;
          cursor: wait;
        }

        .link-button {
          padding: 9px 14px;
          background: transparent;
          border: 1px solid rgba(23,23,20,.16);
          color: var(--ink);
          font-size: 13px;
        }

        .small-button {
          padding: 9px 14px;
          background: var(--ink);
          color: #fff;
          font-size: 13px;
        }

        .small-button.light {
          background: transparent;
          border: 1px solid rgba(23,23,20,.16);
          color: var(--ink);
        }

        .small-button.danger {
          background: transparent;
          border: 1px solid rgba(160,50,40,.35);
          color: #a03228;
        }

        .small-button:disabled {
          opacity: .35;
          cursor: not-allowed;
        }

        .primary-button:hover,
        .small-button:hover:not(:disabled),
        .link-button:hover {
          opacity: .82;
        }

        .role-note {
          margin-bottom: 20px;
          padding: 14px 18px;
          border-radius: 16px;
          background: rgba(255,255,255,.55);
          border: 1px solid var(--line);
          color: var(--muted);
          font-size: 14px;
          line-height: 1.5;
        }

        .role-note strong {
          color: var(--ink);
        }

        .notice,
        .notice-error {
          margin-bottom: 20px;
          padding: 14px 18px;
          border-radius: 16px;
          font-size: 14px;
          font-weight: 700;
        }

        .notice {
          background: #eef6ee;
          border: 1px solid rgba(60,130,70,.25);
        }

        .notice-error {
          background: #fff1ef;
          border: 1px solid rgba(160,50,40,.25);
        }

        .edit-panel {
          margin-bottom: 24px;
          padding: 24px;
          background: var(--paper);
          border: 1px solid rgba(168,124,54,.35);
          border-radius: 22px;
        }

        .edit-panel-head {
          display: flex;
          justify-content: space-between;
          align-items: center;
          gap: 12px;
          margin-bottom: 18px;
        }

        .edit-panel h2 {
          margin: 0;
          font-size: 22px;
        }

        .field-grid {
          display: grid;
          grid-template-columns: repeat(2, 1fr);
          gap: 14px;
        }

        .field {
          display: grid;
          gap: 6px;
          font-size: 13px;
          font-weight: 700;
        }

        .field-wide {
          grid-column: 1 / -1;
        }

        .field input:not([type="file"]):not([type="checkbox"]),
        .field select,
        .field textarea {
          width: 100%;
          min-height: 44px;
          padding: 0 12px;
          border: 1px solid rgba(23,23,20,.16);
          border-radius: 12px;
          background: #fff;
          color: var(--ink);
          font: inherit;
          font-weight: 400;
          font-size: 15px;
        }

        .field textarea {
          padding: 10px 12px;
          resize: vertical;
        }

        .field input:focus,
        .field select:focus,
        .field textarea:focus {
          outline: none;
          border-color: var(--gold);
        }

        .image-row {
          display: flex;
          flex-wrap: wrap;
          gap: 16px;
          align-items: flex-start;
        }

        .image-preview {
          width: 160px;
          aspect-ratio: 4 / 3;
          object-fit: cover;
          border-radius: 14px;
          border: 1px solid var(--line);
        }

        .image-controls {
          display: grid;
          gap: 10px;
          font-weight: 400;
        }

        .checkbox {
          display: flex;
          align-items: center;
          gap: 8px;
          font-size: 14px;
        }

        .hint {
          margin: 0;
          color: var(--muted);
          font-size: 13px;
        }

        .form-error {
          margin: 16px 0 0;
          padding: 12px 14px;
          border-radius: 12px;
          background: #fff1ef;
          font-size: 14px;
          font-weight: 400;
        }

        .form-actions {
          margin-top: 18px;
        }

        .menu-section {
          scroll-margin-top: 20px;
          margin-bottom: 26px;
          padding: 22px;
          background: var(--paper);
          border: 1px solid var(--line);
          border-radius: 22px;
        }

        .menu-section.is-hidden {
          background: rgba(255,253,248,.55);
          border-style: dashed;
        }

        .section-head {
          display: flex;
          flex-wrap: wrap;
          justify-content: space-between;
          align-items: flex-start;
          gap: 14px;
          padding-bottom: 16px;
          margin-bottom: 14px;
          border-bottom: 1px solid rgba(23,23,20,.12);
        }

        .section-head h2 {
          margin: 0;
          font-size: 28px;
          font-weight: 500;
          letter-spacing: -.03em;
        }

        .section-meta {
          margin: 6px 0 0;
          color: var(--muted);
          font-size: 14px;
        }

        .actions {
          display: flex;
          flex-wrap: wrap;
          align-items: center;
          gap: 6px;
        }

        .actions form {
          margin: 0;
        }

        .badge {
          display: inline-block;
          margin-left: 8px;
          padding: 3px 10px;
          border-radius: 999px;
          font-size: 12px;
          font-weight: 800;
          letter-spacing: 0;
          vertical-align: middle;
        }

        .badge-hidden { background: rgba(23,23,20,.08); color: var(--muted); }
        .badge-unavailable { background: #fbe6e3; color: #a03228; }

        .items {
          display: grid;
          gap: 10px;
        }

        .item {
          display: grid;
          grid-template-columns: 64px minmax(0, 1fr) auto;
          gap: 16px;
          align-items: center;
          padding: 14px;
          border: 1px solid var(--line);
          border-radius: 16px;
          background: #fff;
        }

        .item.is-unavailable {
          background: #faf6f0;
        }

        .item.is-unavailable .item-name,
        .item.is-unavailable .thumb {
          opacity: .55;
        }

        .thumb {
          width: 64px;
          height: 64px;
          border-radius: 12px;
          object-fit: cover;
          display: grid;
          place-items: center;
          background: var(--bg);
          color: var(--muted);
          font-size: 22px;
          font-weight: 700;
        }

        .item-name {
          margin: 0;
          font-size: 16px;
          font-weight: 800;
        }

        .item-description {
          margin: 4px 0 0;
          color: var(--muted);
          font-size: 13px;
          line-height: 1.45;
        }

        .item-price {
          margin: 6px 0 0;
          font-size: 15px;
          font-weight: 800;
        }

        .item .actions {
          justify-content: flex-end;
        }

        .empty,
        .warning {
          padding: 22px;
          border-radius: 18px;
          background: var(--paper);
          border: 1px solid var(--line);
          color: var(--muted);
        }

        .warning {
          border-color: rgba(168,124,54,.35);
          color: var(--ink);
        }

        .warning strong {
          display: block;
          margin-bottom: 8px;
        }

        @media (max-width: 700px) {
          .top {
            align-items: flex-start;
            flex-direction: column;
          }

          .stats,
          .field-grid {
            grid-template-columns: 1fr;
          }

          .item {
            grid-template-columns: 56px minmax(0, 1fr);
          }

          .thumb {
            width: 56px;
            height: 56px;
          }

          .item .actions {
            grid-column: 1 / -1;
            justify-content: flex-start;
          }
        }
      `}</style>

      <main className="staff-page">
        <div className="wrap">
          <StaffNav current="menu" />

          <header className="top">
            <div>
              <p className="eyebrow">R.I.O. Deventer</p>
              <h1>Menu beheren</h1>
              <p className="subtitle">Wijzigingen zijn direct zichtbaar op de menukaart voor gasten.</p>
            </div>

            {isManager && (
              <div className="top-actions">
                <Link href={`${BASE_PATH}?nieuwe-categorie=1`} className="link-button">
                  + Categorie
                </Link>
                {sections.length > 0 && (
                  <Link href={`${BASE_PATH}?nieuw-gerecht=1`} className="primary-button">
                    + Nieuw gerecht
                  </Link>
                )}
              </div>
            )}
          </header>

          <div className="role-note">
            {isManager ? (
              <>
                Ingelogd als <strong>manager</strong>: volledige toegang tot het menu.
              </>
            ) : (
              <>
                Ingelogd als <strong>personeel</strong>: je kunt gerechten wijzigen en op
                beschikbaar of niet beschikbaar zetten. Gerechten toevoegen of verwijderen,
                de volgorde aanpassen en categorieën beheren kan alleen een manager.
              </>
            )}
          </div>

          {!supabaseConfigured ? (
            <div className="warning">
              <strong>Het menu is nog niet gekoppeld.</strong>
              Voeg de Supabase-gegevens toe aan .env.local.
            </div>
          ) : loadError ? (
            <div className="warning">
              <strong>Het menu kon niet worden geladen.</strong>
              Controleer de serverconfiguratie.
            </div>
          ) : (
            <>
              {successMessage && <div className="notice">{successMessage}</div>}
              {errorMessage && <div className="notice-error">{errorMessage}</div>}

              {editingItem && (
                <MenuItemForm
                  itemId={editingItem.id}
                  imageUrl={editingItem.image_url}
                  sections={sections}
                  cancelHref={`${BASE_PATH}#cat-${editingItem.section_id}`}
                  initialValues={{
                    name: editingItem.name,
                    description: editingItem.description ?? "",
                    price: priceToInput(editingItem.price_cents),
                    section_id: editingItem.section_id,
                  }}
                />
              )}

              {newItemSection && (
                <MenuItemForm
                  itemId={null}
                  imageUrl={null}
                  sections={sections}
                  cancelHref={`${BASE_PATH}#cat-${newItemSection.id}`}
                  initialValues={{
                    name: "",
                    description: "",
                    price: "",
                    section_id: newItemSection.id,
                  }}
                />
              )}

              {(editingSection || showNewSection) && (
                <SectionForm
                  sectionId={editingSection?.id ?? null}
                  cancelHref={editingSection ? `${BASE_PATH}#cat-${editingSection.id}` : BASE_PATH}
                  initialValues={{
                    name: editingSection?.name ?? "",
                    description: editingSection?.description ?? "",
                  }}
                />
              )}

              {params.gerecht && !editingItem && (
                <div className="notice-error">Dit gerecht bestaat niet meer.</div>
              )}

              <section className="stats">
                <div className="stat">
                  <div className="stat-label">Gerechten en dranken</div>
                  <div className="stat-value">{items.length}</div>
                </div>

                <div className="stat">
                  <div className="stat-label">Niet beschikbaar</div>
                  <div className="stat-value">{unavailableCount}</div>
                </div>

                <div className="stat">
                  <div className="stat-label">Zichtbare categorieën</div>
                  <div className="stat-value">
                    {visibleSectionCount} / {sections.length}
                  </div>
                </div>
              </section>

              {sections.length === 0 && (
                <div className="empty">Er zijn nog geen categorieën.</div>
              )}

              {sections.map((section) => {
                const sectionItems = items.filter((item) => item.section_id === section.id);

                return (
                  <section
                    key={section.id}
                    id={`cat-${section.id}`}
                    className={`menu-section${section.is_visible ? "" : " is-hidden"}`}
                  >
                    <div className="section-head">
                      <div>
                        <h2>
                          {section.name}
                          {!section.is_visible && (
                            <span className="badge badge-hidden">Verborgen voor gasten</span>
                          )}
                        </h2>
                        <p className="section-meta">
                          {sectionItems.length}{" "}
                          {sectionItems.length === 1 ? "item" : "items"}
                          {section.description ? ` · ${section.description}` : ""}
                        </p>
                      </div>

                      {isManager && (
                        <div className="actions">
                          <Link
                            href={`${BASE_PATH}?nieuw-gerecht=1&categorie=${section.id}`}
                            className="small-button"
                          >
                            + Gerecht
                          </Link>

                          <Link href={`${BASE_PATH}?categorie=${section.id}`} className="link-button">
                            Naam wijzigen
                          </Link>

                          <form action={setSectionVisibility}>
                            <input type="hidden" name="section_id" value={section.id} />
                            <input type="hidden" name="visible" value={section.is_visible ? "0" : "1"} />
                            <button type="submit" className="small-button light">
                              {section.is_visible ? "Verbergen" : "Tonen"}
                            </button>
                          </form>

                          {sectionItems.length === 0 ? (
                            <form action={deleteSection}>
                              <input type="hidden" name="section_id" value={section.id} />
                              <ConfirmSubmitButton
                                className="small-button danger"
                                message={`Categorie "${section.name}" definitief verwijderen?`}
                              >
                                Verwijderen
                              </ConfirmSubmitButton>
                            </form>
                          ) : (
                            <button
                              type="button"
                              className="small-button danger"
                              disabled
                              title="Alleen lege categorieën kunnen worden verwijderd."
                            >
                              Verwijderen
                            </button>
                          )}
                        </div>
                      )}
                    </div>

                    {sectionItems.length === 0 ? (
                      <div className="empty">Nog geen gerechten in deze categorie.</div>
                    ) : (
                      <div className="items">
                        {sectionItems.map((item, index) => (
                          <article
                            key={item.id}
                            className={`item${item.is_available ? "" : " is-unavailable"}`}
                          >
                            {item.image_url ? (
                              // eslint-disable-next-line @next/next/no-img-element
                              <img src={item.image_url} alt="" className="thumb" loading="lazy" />
                            ) : (
                              <div className="thumb" aria-hidden="true">
                                {item.name.charAt(0).toUpperCase()}
                              </div>
                            )}

                            <div>
                              <p className="item-name">
                                {item.name}
                                {!item.is_available && (
                                  <span className="badge badge-unavailable">Niet beschikbaar</span>
                                )}
                                {!item.is_visible && (
                                  <span className="badge badge-hidden">Verborgen</span>
                                )}
                              </p>
                              {item.description && (
                                <p className="item-description">{item.description}</p>
                              )}
                              <p className="item-price">{formatPrice(item.price_cents)}</p>
                            </div>

                            <div className="actions">
                              <Link href={`${BASE_PATH}?gerecht=${item.id}`} className="link-button">
                                Wijzigen
                              </Link>

                              <form action={setMenuItemAvailability}>
                                <input type="hidden" name="item_id" value={item.id} />
                                <input type="hidden" name="available" value={item.is_available ? "0" : "1"} />
                                <button
                                  type="submit"
                                  className={`small-button${item.is_available ? " light" : ""}`}
                                >
                                  {item.is_available ? "Niet beschikbaar" : "Weer beschikbaar"}
                                </button>
                              </form>

                              {isManager && (
                                <>
                                  <form action={moveMenuItem}>
                                    <input type="hidden" name="item_id" value={item.id} />
                                    <input type="hidden" name="direction" value="up" />
                                    <button
                                      type="submit"
                                      className="small-button light"
                                      disabled={index === 0}
                                      aria-label={`${item.name} omhoog`}
                                      title="Omhoog"
                                    >
                                      ↑
                                    </button>
                                  </form>

                                  <form action={moveMenuItem}>
                                    <input type="hidden" name="item_id" value={item.id} />
                                    <input type="hidden" name="direction" value="down" />
                                    <button
                                      type="submit"
                                      className="small-button light"
                                      disabled={index === sectionItems.length - 1}
                                      aria-label={`${item.name} omlaag`}
                                      title="Omlaag"
                                    >
                                      ↓
                                    </button>
                                  </form>

                                  <form action={deleteMenuItem}>
                                    <input type="hidden" name="item_id" value={item.id} />
                                    <ConfirmSubmitButton
                                      className="small-button danger"
                                      message={`"${item.name}" definitief verwijderen? Tip: met "Niet beschikbaar" blijft het gerecht bewaard.`}
                                    >
                                      Verwijderen
                                    </ConfirmSubmitButton>
                                  </form>
                                </>
                              )}
                            </div>
                          </article>
                        ))}
                      </div>
                    )}
                  </section>
                );
              })}
            </>
          )}
        </div>

        <LiveRefresh />
      </main>
    </>
  );
}
