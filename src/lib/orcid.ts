import { parseStringPromise } from 'xml2js';

export async function fetchOrcidPublications(orcidId: string) {
  const res = await fetch(`https://pub.orcid.org/v3.0/${orcidId}/works`, {
    headers: {
      Accept: 'application/vnd.orcid+xml',
    },
  });

  if (!res.ok) {
    throw new Error(`ORCID fetch failed: ${res.status}`);
  }

  const xml = await res.text();
  const parsed = await parseStringPromise(xml);
  const works = parsed['activities:works']?.['activities:group'] ?? [];

  return works.map((work) => {
    return {
      title: work['work:work-summary']?.[0]['work:title']?.[0]['common:title']?.[0] ?? 'Untitled',
      url: work['work:work-summary']?.[0]['common:external-ids']?.[0]['common:external-id']?.[0]['common:external-id-url']?.[0] ?? 
      "https://doi.org/" + 
      work['work:work-summary']?.[0]['common:external-ids']?.[0]['common:external-id']?.[0]['common:external-id-value']?.[0] ?? null,
      date: work['work:work-summary']?.[0]['common:publication-date']?.[0]['common:year']?.[0] ?? null,
      journal: work['work:work-summary']?.[0]['work:journal-title']?.[0] ?? null,
      type: work['work:work-summary']?.[0]['work:type']?.[0] ?? null,
      doi: work['work:work-summary']?.[0]['common:external-ids']?.[0]['common:external-id']?.[0]['common:external-id-value']?.[0] ?? null,
    };
  });
}