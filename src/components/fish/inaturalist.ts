// iNaturalist 공개 API로 어종을 검색한다(인증 불필요).

export type TaxonResult = {
  id: string;
  name: string;
  scientific: string;
  class: string;
  photoUrl: string | null;
  photoAttr: string;
  observationsCount: number;
};

type INatTaxon = {
  id: number;
  name: string;
  preferred_common_name?: string;
  iconic_taxon_name?: string | null;
  observations_count?: number;
  default_photo?: { medium_url?: string; attribution?: string } | null;
};

export async function searchTaxa(keyword: string): Promise<TaxonResult[]> {
  const res = await fetch(
    `https://api.inaturalist.org/v1/taxa?q=${encodeURIComponent(keyword)}&locale=ko&per_page=20&rank=species`,
  );
  const data: { results?: INatTaxon[] } = await res.json();
  return (data.results ?? []).map((item) => ({
    id: String(item.id),
    name: item.preferred_common_name || item.name,
    scientific: item.name,
    class: item.iconic_taxon_name || '',
    photoUrl: item.default_photo?.medium_url || null,
    photoAttr: item.default_photo?.attribution || '',
    observationsCount: item.observations_count || 0,
  }));
}
