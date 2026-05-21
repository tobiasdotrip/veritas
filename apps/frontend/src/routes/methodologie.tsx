import { createFileRoute } from "@tanstack/react-router";
import { Card } from "@/components/ui/Card";

export const Route = createFileRoute("/methodologie")({
  component: MethodologiePage,
});

function MethodologiePage() {
  return (
    <div className="max-w-3xl space-y-8 py-8">
      <h1 className="text-2xl font-bold text-text-primary">Méthodologie</h1>

      <section className="space-y-3">
        <h2 className="text-lg font-semibold text-text-primary">
          Sources des données
        </h2>
        <p className="text-text-secondary">
          Les données sont issues des fichiers ouverts de l'Assemblée nationale
          (licence Ouverte 2.0). Les scrutins, votes nominatifs, députés et
          organes politiques sont synchronisés quotidiennement via un pipeline
          ETL idempotent.
        </p>
      </section>

      <section className="space-y-3">
        <h2 className="text-lg font-semibold text-text-primary">
          Calcul des indicateurs
        </h2>
        <Card>
          <dl className="space-y-4">
            <div>
              <dt className="text-sm font-medium text-text-primary">
                Taux de participation
              </dt>
              <dd className="text-sm text-text-secondary">
                Nombre de votes exprimés (pour, contre, abstention) divisé par
                le nombre total de scrutins éligibles sur la période.
              </dd>
            </div>
            <div>
              <dt className="text-sm font-medium text-text-primary">
                Taux de loyauté
              </dt>
              <dd className="text-sm text-text-secondary">
                Nombre de votes alignés avec la position majoritaire du groupe
                politique divisé par le nombre de scrutins où le député a voté
                et le groupe a exprimé une position majoritaire.
              </dd>
            </div>
            <div>
              <dt className="text-sm font-medium text-text-primary">
                Concordance (comparateur)
              </dt>
              <dd className="text-sm text-text-secondary">
                Intersection des scrutins où les députés comparés ont tous voté
                (pour, contre ou abstention). Le score est le pourcentage de
                votes identiques sur cet échantillon.
              </dd>
            </div>
          </dl>
        </Card>
      </section>

      <section className="space-y-3">
        <h2 className="text-lg font-semibold text-text-primary">
          Limites connues
        </h2>
        <ul className="list-disc space-y-1 pl-5 text-text-secondary">
          <li>
            Les thématiques sont classées par mots-clés sur le titre et l'objet
            du scrutin (MVP). Une revue manuelle peut être nécessaire.
          </li>
          <li>
            Les changements d'affiliation en cours de législature peuvent
            affecter le calcul de la loyauté sur la période complète.
          </li>
          <li>
            Les votes par délégation sont comptabilisés comme des votes exprimés
            mais signalés distinctement.
          </li>
        </ul>
      </section>
    </div>
  );
}
