import { Footer as DsfrFooter } from "@codegouvfr/react-dsfr/Footer";

export function Footer() {
  return (
    <DsfrFooter
      accessibility="partially compliant"
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
      contentDescription={
        <>
          <strong>Veritas</strong> — Transparence des votes parlementaires.
          Données ouvertes de l&apos;Assemblée nationale.
        </>
      }
      linkList={[
        {
          categoryName: "Navigation",
          links: [
            { text: "Accueil", linkProps: { to: "/", href: "/" } },
            { text: "Recherche", linkProps: { to: "/recherche", href: "/recherche" } },
            { text: "Comparateur", linkProps: { to: "/comparateur", href: "/comparateur" } },
            { text: "Méthodologie", linkProps: { to: "/methodologie", href: "/methodologie" } },
          ],
        },
      ]}
      bottomItems={[
        {
          text: "Méthodologie",
          linkProps: { to: "/methodologie", href: "/methodologie" },
        },
        {
          iconId: "fr-icon-github-fill",
          text: "Code source",
          linkProps: {
            to: "https://github.com/tobiasdotrip/veritas",
            href: "https://github.com/tobiasdotrip/veritas",
            target: "_blank",
            rel: "noopener noreferrer",
          },
        },
      ]}
      license={
        <>
          Sauf mention contraire, tous les contenus de ce site sont sous{" "}
          <a
            href="https://github.com/tobiasdotrip/veritas/blob/main/LICENSE"
            target="_blank"
            rel="noopener noreferrer"
          >
            licence MIT
          </a>
          .
        </>
      }
    />
  );
}
