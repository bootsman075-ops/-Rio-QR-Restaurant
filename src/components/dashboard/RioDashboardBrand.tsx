import Image from "next/image";

import type { DashboardArea } from "./areas";

/**
 * Rio's tenant-specific branding. Only render this for restaurantSlug
 * "rio-deventer" so other restaurant tenants keep their own presentation.
 * No new data fetches and no impact on any authorization or mutations.
 */
export default function RioDashboardBrand({ area }: { area: DashboardArea }) {
  return (
    <div className="rio-masthead">
      <div className="rio-masthead-identity">
        <Image
          src="/rio-logo.png"
          width={267}
          height={127}
          alt="RIO Deventer"
          className="rio-masthead-logo"
          priority
        />
        <div className="rio-masthead-intro">
          <span className="rio-masthead-overline">R.I.O. · Deventer</span>
          <span className="rio-masthead-caption">Restaurantdashboard</span>
        </div>
      </div>
      <span className="rio-masthead-area">
        {area === "management" ? "Managementomgeving" : "Personeelsomgeving"}
      </span>
    </div>
  );
}
