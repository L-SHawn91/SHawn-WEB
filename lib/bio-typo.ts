/**
 * Biomedical typo correction dictionary.
 * Ported from SHawn-bio-search/query_expansion.py _TYPO_CORRECTIONS
 * Applied token-by-token to the raw query before sending to sources.
 */

const TYPO_MAP: Record<string, string> = {
  // organoid
  organiod: 'organoid', organoids: 'organoids', organiods: 'organoids',
  organid: 'organoid', organoidd: 'organoid',
  // endometrium
  endometiral: 'endometrial', endometrail: 'endometrial',
  endometirum: 'endometrium', endomerium: 'endometrium',
  endometrim: 'endometrium', uterin: 'uterine', uterins: 'uterine',
  // transcriptomics
  transcriptomcis: 'transcriptomics', trancriptomics: 'transcriptomics',
  transcritomics: 'transcriptomics', transcriptomis: 'transcriptomics',
  // sequencing / RNA
  sequncing: 'sequencing', seqeuncing: 'sequencing',
  'rna-seq': 'RNA-seq', rnaseq: 'RNA-seq',
  'scrna-seq': 'scRNA-seq', scrnaseq: 'scRNA-seq',
  'scrna': 'scRNA',
  // gene / genome
  genmoic: 'genomic', genomcis: 'genomics', genmoics: 'genomics',
  epigenitics: 'epigenetics', epigentics: 'epigenetics', epigeneics: 'epigenetics',
  // implantation
  implantaion: 'implantation', implanation: 'implantation',
  receptiviy: 'receptivity', receptivty: 'receptivity',
  // cell
  singel: 'single', scell: 'single-cell',
  'single-cel': 'single-cell', 'sigle-cell': 'single-cell',
  // cancer
  overian: 'ovarian', ovarin: 'ovarian', ovarain: 'ovarian',
  carciomna: 'carcinoma', carcnioma: 'carcinoma',
  adenocaricnoma: 'adenocarcinoma', adenicarcinoma: 'adenocarcinoma',
  // methylation / epigenetics
  methylaion: 'methylation', metylation: 'methylation',
  methlation: 'methylation', methyltion: 'methylation',
  // differentiation
  differentation: 'differentiation', differntiation: 'differentiation',
  diffrentation: 'differentiation',
  // proliferation
  proliferaton: 'proliferation', proliefration: 'proliferation',
  // apoptosis
  appoptosis: 'apoptosis', apopstosis: 'apoptosis',
  // signaling
  signalling: 'signaling', singaling: 'signaling',
  // DHCR24 / cholesterol (user-specific terms)
  dhcr: 'DHCR24', cholestrol: 'cholesterol', cholesteral: 'cholesterol',
  // progesterone / estrogen
  progestrone: 'progesterone', progesteron: 'progesterone',
  estrogen: 'estrogen', oestrogen: 'estrogen',
  // microenvironment
  microenviroment: 'microenvironment', microenvironment: 'microenvironment',
  // autophagy
  autophgy: 'autophagy', autopaghy: 'autophagy',
  // fibrosis
  fibrois: 'fibrosis', fibrosos: 'fibrosis',
};

/**
 * Correct biomedical typos in a query string.
 * Preserves original casing for tokens that are NOT in the typo map.
 */
export function correctBioTypos(query: string): string {
  if (!query.trim()) return query;
  return query
    .split(/(\s+)/)
    .map((token) => {
      const lower = token.toLowerCase();
      return TYPO_MAP[lower] ?? token;
    })
    .join('');
}
