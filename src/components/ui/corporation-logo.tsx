import Image from 'next/image';
import { getPublicEnv } from '@/lib/env';

// Corporation logos are self-hosted in the public tm-corporation-logos Supabase
// bucket, keyed by the logo_path recorded on public.corporations. The catalog is
// a small, fixed vocabulary, so mapping the corporation name to its file here
// avoids a DB round-trip wherever a corporation name string is already on hand
// (see scripts/catalog/upload-game-asset-images.ts).
const CORPORATION_LOGO_PREFIX = `${getPublicEnv().NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/tm-corporation-logos/`;

// Normalized corporation name -> logo filename in the bucket. Generated from
// public.corporations.logo_path; regenerate if the corporation catalog changes.
// A name with no entry (e.g. an unmatched import value) renders nothing instead
// of a broken image.
const CORPORATION_LOGO_PATHS: Readonly<Record<string, string>> = {
  adhaihighorbitconstructions: 'Adhai_High_Orbit_Constructions.png',
  aerongenomics: 'Aeron_Genomics.png',
  aerotech: 'Aerotech.png',
  agricolainc: 'Agricola_Inc.png',
  ambient: 'Ambient_Terraforming_Solutions_For_a_Breathable_Future.png',
  anubissecurities: 'Anubis_securities.png',
  aphrodite: 'Aphrodite.png',
  arboristcollective: 'Arborist_collective.png',
  arcadiancommunities: 'Arcadian Communities.png',
  aridor: 'Aridor.png',
  aristarchus: 'Aristarchus.png',
  arklight: 'Arklight.png',
  astrodrill: 'Astrol Drill.png',
  athena: 'Athena.png',
  aurorai: 'Auror_AI.png',
  beginnercorporation: 'Beginner_Corporation.png',
  bentenmaru: 'Bentenmaru.png',
  biosol: 'Bio-Sol.png',
  celestic: 'Celestic.png',
  cheungshingmars: 'Cheung_Shing_Mars.png',
  chimera: 'Chimera.png',
  collegiumcopernicus: 'Collegium_Copernicus.png',
  colonialone: 'Colonial_One.png',
  credicor: 'Creditcor.png',
  crescentresearchassociation: 'Crescent_Research_Association.png',
  curiosityii: 'Curiosity_II.png',
  demetronlabs: 'Demetron_labs.png',
  ecoline: 'Ecoline.png',
  ecotec: 'EcoTec.png',
  eris: 'Eris.png',
  factorum: 'Factorum.png',
  fauxnews: 'Faux_News.png',
  gagarinmobilebase: 'Gagarian_Mobile_Base.png',
  habitatmarte: 'Habitat_Marte.png',
  hadesphere: 'Hadesphere.png',
  hecatespeditions: 'Hecate_speditions.png',
  helion: 'Helion.png',
  henkeigenetics: 'Henkei_genetics.png',
  hotsprings: 'Hotsprings.png',
  incite: 'Incite.png',
  interplanetarycinematics: 'Interplanetary _Cinematics.png',
  intragensanctuaryheadquarters: 'Intragen_Sanctuary_Headquarters.png',
  inventrix: 'Inventrix.png',
  jensonboyleco: 'Jenson_boyle_and_co.png',
  junkventures: 'Junk_Ventures.png',
  keplertec: 'Keplertec.png',
  kingdomoftauraro: 'Kingdom_of_tauraro.png',
  kuipercooperative: 'Kuiper Cooperative.png',
  labourunion: 'Labour_Union.png',
  lakefrontresorts: 'Lakefront_Resorts.png',
  lunafirstincorporated: 'Luna_First_Incorporated.png',
  lunahyperloopcorporation: 'Luna_Hyperloop_Corporation.png',
  lunatradefederation: 'Luna_Trade_Federation.png',
  manutech: 'Manutech.png',
  maraboutshiritori: 'Marabout_Shiritori.png',
  marscoalition: 'Mars_Coalition.png',
  marsdirect: 'Mars_Direct.png',
  marsmaths: 'Mars_Maths.png',
  martianinsurancegroup: 'Martian_Insurance_Group.png',
  midas: 'Midas.png',
  mindsetmars: 'Mind_Set_Mars.png',
  miningguild: 'Mining Guild.png',
  monsinsurance: 'Mons Insurance.png',
  morningstarinc: 'Morning Star.png',
  nanotechindustries: 'Nanotech_Industries.png',
  nirgalenterprises: 'Nirgal_Enterprises.png',
  odyssey: 'Odyssey.png',
  palladinshipping: 'Palladin_Shipping.png',
  pharmacyunion: 'Pharmacy Union.png',
  philares: 'Philares.png',
  phobolog: 'PhoboLog.png',
  playwrights: 'Playwrights.png',
  pointluna: 'Point Luna.png',
  polaris: "Polaris_Terraforming_Solutions_Guiding_Humanity's_Next_Frontier.png",
  poldertechdutch: 'PolderTech.png',
  polyphemos: 'Polyphemos.png',
  poseidon: 'Poseidon.png',
  pristar: 'Pristar.png',
  project10: 'Project_10.png',
  projectworkshop: 'Project_Workshop.png',
  recyclon: 'Recyclon.png',
  ringcom: 'Ringcom_Terraforming_Solutions_Connecting_a_New_World.png',
  robinhaulings: 'Robin_Hauling.png',
  robinsonindustries: 'Robinson_Industries.png',
  sagittafrontierservices: 'Sagitta_Frontier_Services.png',
  saturnsystems: 'Saturn Systems.png',
  secretsantasociety: 'Secret_Santa_Society.png',
  septemtribus: 'Septem Tribus.png',
  solbank: 'SolBank.png',
  soylentseedlingsystems: 'Soylent_Seedling_Systems.png',
  spaceways: 'Spaceways.png',
  spire: 'Spire.png',
  splice: 'Splice.png',
  steelaris: 'Steelaris_Forging_a_Future_in_Steel_Building_Tomorrow_On_Mars.png',
  stormcraftincorporated: 'Stormcraft_Incorporated.png',
  tempestconsultancy: 'Tempest_Consultancy.png',
  tempestinc: 'Tempest_Inc.png',
  teractor: 'Teractor.png',
  terralabsresearch: 'TerraLabs_Research.png',
  tharsisrepublic: 'Tharsis_Republic.png',
  thearchaicfoundationinstitute: 'The_Archaic_Foundation_Institute.png',
  thedarksideofthemoonsyndicate: 'The_Darkside_Of_The_Moon_Syndicate.png',
  thegrandlunacapitalgroup: 'The_Grand_Luna_Capital_Group.png',
  thorgate: 'Thorgate.png',
  tychomagnetics: 'Tycho Magnetics.png',
  unitednationsmarsinitiative: 'United_Nations_Mars_Initiative.png',
  unitednationsmissionone: 'United_Nations_Mission_One.png',
  utopiainvest: 'Utopia_Invevst.png',
  valleytrust: 'Valley_Trust.png',
  viron: 'Viron.png',
  vitor: 'Vitor.png',
  voltagon: 'Voltagon.png',
};

export function normalizeCorporationName(name: string): string {
  return name.toLowerCase().replace(/[^a-z0-9]/g, '');
}

export function hasCorporationLogo(name: string): boolean {
  return normalizeCorporationName(name) in CORPORATION_LOGO_PATHS;
}

export function getCorporationLogoUrl(name: string): string | null {
  const path = CORPORATION_LOGO_PATHS[normalizeCorporationName(name)];
  return path ? `${CORPORATION_LOGO_PREFIX}${encodeURIComponent(path)}` : null;
}

export function CorporationLogo({
  className,
  name,
  size = 24,
}: {
  className?: string;
  name: string;
  /** Rendered width/height in px; the logo is fit inside a square box. */
  size?: number;
}) {
  const path = CORPORATION_LOGO_PATHS[normalizeCorporationName(name)];

  if (!path) {
    return null;
  }

  return (
    <Image
      alt={`${name} logo`}
      className={`object-contain ${className ?? ''}`}
      height={size}
      src={`${CORPORATION_LOGO_PREFIX}${encodeURIComponent(path)}`}
      unoptimized
      width={size}
    />
  );
}
