import * as React from "react";
import { useLocation, useNavigate } from "@tanstack/react-router";
import { Header as DsfrHeader } from "@codegouvfr/react-dsfr/Header";
import type { HeaderProps as DsfrHeaderProps } from "@codegouvfr/react-dsfr/Header";
import { defaultRechercheSearch } from "@/lib/route-search.js";

const navItems = [
  { text: "Accueil", to: "/" },
  { text: "Recherche", to: "/recherche" },
  { text: "Comparateur", to: "/comparateur" },
  { text: "Méthodologie", to: "/methodologie" },
];

type RenderSearchInput = NonNullable<DsfrHeaderProps["renderSearchInput"]>;

export function Header() {
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const [query, setQuery] = React.useState("");

  const submitSearch = (text: string) => {
    const trimmed = text.trim();
    if (trimmed.length === 0) return;
    navigate({
      to: "/recherche",
      search: { ...defaultRechercheSearch, q: trimmed },
    });
  };

  return (
    <DsfrHeader
      brandTop={
        <>
          RÉPUBLIQUE
          <br />
          FRANÇAISE
        </>
      }
      homeLinkProps={{
        to: "/",
        href: "/",
        title: "Accueil - Veritas",
      }}
      serviceTitle="Veritas"
      serviceTagline="Transparence des votes parlementaires"
      renderSearchInput={((params) => (
        <input
          {...params}
          name={params.id}
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              submitSearch(query);
            }
          }}
        />
      )) satisfies RenderSearchInput}
      onSearchButtonClick={submitSearch}
      navigation={navItems.map(({ text, to }) => ({
        text,
        isActive: pathname === to,
        linkProps: { to, href: to },
      }))}
      quickAccessItems={[
        {
          iconId: "fr-icon-github-fill",
          text: "GitHub",
          linkProps: {
            to: "https://github.com/tobiasdotrip/veritas",
            href: "https://github.com/tobiasdotrip/veritas",
            target: "_blank",
            rel: "noopener noreferrer",
          },
        },
      ]}
    />
  );
}
