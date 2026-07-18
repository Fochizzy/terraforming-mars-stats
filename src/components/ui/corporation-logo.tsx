import Image from 'next/image';
import { getSupabaseGameAssetUrl } from '@/lib/assets/supabase-game-assets';

// Corporation logos are self-hosted in the public tm-corporation-logos Supabase
// bucket, keyed by the content-hashed logo_path recorded on
// public.corporations. The exact production mapping is snapshotted here for UI
// surfaces that only have a corporation name and cannot perform another query.

// Normalized corporation name -> logo filename in the bucket. Generated from
// public.corporations.logo_path; regenerate if the corporation catalog changes.
// A name with no entry (e.g. an unmatched import value) renders nothing instead
// of a broken image.
const CORPORATION_LOGO_PATHS: Readonly<Record<string, string>> = {
  adhaihighorbitconstructions: 'corporation-logo-c9735480add1a7ad7681d781755abd59115b05863094b4cb0a7d246909489d81.png',
  aerongenomics: 'corporation-logo-283aae419c707f4cb7802d50afff6beb93a9eb3467a8ace4dde5fa34016fc185.png',
  aerotech: 'corporation-logo-fa7183b8fcda49cf8b35f299398028b3393a2452d38cb7380b310dc34722421e.png',
  agricolainc: 'corporation-logo-ab81af24c6cf60098c3de77910dfedb1c3735566c8bccdf04f2672213b19a4d6.png',
  ambient: 'corporation-logo-8c208c48fa3e142ba6dfee04f59678b7c29af79fe04c281f103afc5a366d32dd.png',
  anubissecurities: 'corporation-logo-deba3eabdc44c7cfd1220d58f925cba28feaef11ac7f2e92974ac9d961b2b355.png',
  aphrodite: 'corporation-logo-0340f6bacc5e38c38686151e8053dfe96c64f5cff2edbd2db4eb2dd0a21c9858.png',
  arboristcollective: 'corporation-logo-69174dd314119d2220f0fa591125b7bef83e48447c97d78e3063ee84b33056d1.png',
  arcadiancommunities: 'corporation-logo-aef8848555dda7df578fb40255ef73a3e896ee95d11974dfa7eebbf5f24bf318.png',
  aridor: 'corporation-logo-c0ac7676549338be49e6e5c00ebc4cbb961e73546471f76c9bb959c6f0b2d292.png',
  aristarchus: 'corporation-logo-8779a86a4f87c053dcf9943c6fcdb8105d7a1da48c0fe7f770a3349b10898749.png',
  arklight: 'corporation-logo-5a8e5e30b69b6c9dc0d6301a95b8cb26fc43225f1631c05779eac9b2c7b5a60f.png',
  astrodrill: 'corporation-logo-a53e03469ef6fbfe39eb67db9fcf228b4ca4d5bd59caf989788582f9a207c3ee.png',
  athena: 'corporation-logo-a6dc6773ecb509660890991122edb44c262c33ceca8d5aa4ec99805b58354b09.png',
  aurorai: 'corporation-logo-beab74f9ca515a877f1a196bb8f28dee49efdcb1ba61c92cfe2e8b67f22565b8.png',
  beginnercorporation: 'corporation-logo-b189882c70507c841c8567ac5f44737747b762b7d0e7f616b1ac213d92d28dcc.png',
  bentenmaru: 'corporation-logo-ea5400c1d1f50a45d7247f58125df4e1839c5d647e31b035327fd5ca73d30abf.png',
  biosol: 'corporation-logo-8026b23454e80fbd965fee02e3d50c65a5e44f33bda0eefb0c1873f04e7de63d.png',
  celestic: 'corporation-logo-68717f82299ed1328344ba10ace81ddb3cbbeb771ace95fa7be67f44f7bf0597.png',
  cheungshingmars: 'corporation-logo-e91ff72b16cbd9bee8808477fa00b375061b86e7eaf94af0db8b71a882a506b1.png',
  chimera: 'corporation-logo-1004123448eab34121f16c5c04789fe37af7e4d1855aa3b2d660f440ef9ef627.png',
  collegiumcopernicus: 'corporation-logo-122f26fc75024572642aaf97a3221c1619cc729b61ecb57ea777701925bcb850.png',
  colonialone: 'corporation-logo-33dfb53fa46f34a2e5d5c73ee248f6083151059d280ed5fa61bdbce7ba5ef26b.png',
  credicor: 'corporation-logo-fc76d416bb5db8594c6cbef2a7cf922f38d308fa24970f59ed62e7995595a26a.png',
  crescentresearchassociation: 'corporation-logo-093747cf746ea3cf220bf3be010949abffb3e22f6a094b390cba27e75fdc905c.png',
  curiosityii: 'corporation-logo-4a11d51e25cd56611fb1970ecec8af95585f26ee728713ff397078406cd44d90.png',
  demetronlabs: 'corporation-logo-b9fcbf8032cb5b02d32c8300e245c2f56e04d6d9eb10539bd6f198ca706609e1.png',
  ecoline: 'corporation-logo-3ef2716eae0cd154940094e0ffc72d2369281a52605b65818c906b8a7e6af13b.png',
  ecotec: 'corporation-logo-174770e7909764b664b8f971587d959e9aa9a47aab5187d98c417ff05a531596.png',
  eris: 'corporation-logo-a1d01e169fd5b850a382bf3c8352c70d7293d28623a5ed3a3fd7f7c928210f08.png',
  factorum: 'corporation-logo-bffceac3fa291702450fcccaf5d71f25307570255d775a2f13bc6476b4e01e2d.png',
  fauxnews: 'corporation-logo-cd1ec3752a497e87f0568cd90740a4edb00e5554666d5ec9e2d65e9ec1c28c45.png',
  gagarinmobilebase: 'corporation-logo-b2a3393d5111a43b30e87bcb3229a4c258b27fca81ab1c068f0f97ff5e71de04.png',
  habitatmarte: 'corporation-logo-926166d98eb05f8e5a68118b7e28d05020c284055a1d5cac25152f367c41cf53.png',
  hadesphere: 'corporation-logo-8c0ae0906d76d57fefc12ca15d897ef08c12c6d4f00538861e77ce262eba0485.png',
  hecatespeditions: 'corporation-logo-f4916ac82ecb0731253a153028f96d3be2d02bff60c9540b1bb43966ec296b65.png',
  helion: 'corporation-logo-ea50e074669636373bf79c1598cbfd53279d678539d8946e51bf9acaec79cc34.png',
  henkeigenetics: 'corporation-logo-17c34d50ffc3d168eb85fc088ff41dee0fb635ea382578b2dac1f94fc7999922.png',
  hotsprings: 'corporation-logo-041d09ec490399b581aad3de814fd00f4e66c5f27321b81eed3ac966822a7772.png',
  incite: 'corporation-logo-f56c43c63528d13683f38a2057bc1dae1afa26569a72ba846f11c1b554e8b88e.png',
  interplanetarycinematics: 'corporation-logo-f9e4b83dcc8d6119e705695924a105099b1f188f9b3fb7ada003e04f34694707.png',
  intragensanctuaryheadquarters: 'corporation-logo-1807c843a966cff672bc314165cdfdf793a1fe24502e825661d47e15d22d3783.png',
  inventrix: 'corporation-logo-97d7fc6539938cb94c33a03edfa44a3b5ec3f30440c46a15f082b14043e075a7.png',
  jensonboyleco: 'corporation-logo-44e6ecbfa105e7e43f93cf042d973bb1e5c296ae4744f39615117043b314d4e0.png',
  junkventures: 'corporation-logo-108f8fee6b1035e7be38f09e66062bbdf2fda2829f6d88c02a061fd3096fbf5f.png',
  keplertec: 'corporation-logo-5764a7628b63855af8f328e080ec82c9c59a4fcc9055005a00d58c3326bd4980.png',
  kingdomoftauraro: 'corporation-logo-d19914c2e6d6e8eb265b2696202bb153a34e031e7dff640d8c655879f50daad6.png',
  kuipercooperative: 'corporation-logo-0be2716a8957def16f62776051846b267e8c07d5d0df698b4b7c8bb52d45437d.png',
  labourunion: 'corporation-logo-486c982d3a92fe10a16f3219f9acbe00ef734ac879ccd686d22ce7d3114acfe0.png',
  lakefrontresorts: 'corporation-logo-4ca37d58ddf8efccc72d7d311c03c8fac14fb382c1eea70f9fe6da5606f043b4.png',
  lunafirstincorporated: 'corporation-logo-7ae69227108c5ab35f675e5265d1955bcafb5291e96c98b21b900b244305ce48.png',
  lunahyperloopcorporation: 'corporation-logo-ce0fb785b0a89a66df24563b4e61b82026048e03cda5f6efafcf8fcf37f9d9a8.png',
  lunatradefederation: 'corporation-logo-b0291f2afe5b217e03933ab11c06e2419a7acec9884adc142aa0ed82e94bc1ca.png',
  manutech: 'corporation-logo-cb03c5b5d763cde35a8e673d0c573b4150d3d66ba5aeb7266dc33fec846b954e.png',
  maraboutshiritori: 'corporation-logo-1ca2ecc912394d4eb3cfc9783991c51480b3a920c4e7ede205470a0d03d0f231.png',
  marscoalition: 'corporation-logo-cd3615063d9f4ba8261b2da095833bc6a704931c36c93990be80ffcdfa03af8f.png',
  marsdirect: 'corporation-logo-a8c3129c70353661a74942279fb683dffd19de7d94126ab9aaf2abfb24263423.png',
  marsmaths: 'corporation-logo-f122ec56794998d416acd8e02732bb81734e00e4be74533fe66fbf1731df4602.png',
  martianinsurancegroup: 'corporation-logo-3642216b51a57a2645056872a36668debd3c4f4d21300dca86cdda23b98a0378.png',
  midas: 'corporation-logo-91cb3bfcf1dbda1b2b5c3dfb24e382a4b8ce6c82a0cba51ea59246bad75abf2d.png',
  mindsetmars: 'corporation-logo-8752f5fd2304718fca14dae1e62ad2702d2a4e25edfcf7ce83a67ae47c1150d7.png',
  miningguild: 'corporation-logo-3fa09bc23e48af8d346de5952d3034b084ebca1d26b34800ff4d27bf5f0aee8f.png',
  monsinsurance: 'corporation-logo-5a471491a4cf86a644b7426934d3cea716c0300407f7de3a7e7f03d7b7b7d09a.png',
  morningstarinc: 'corporation-logo-2f290201a0e3199e61d61fce6ccd4ec561c665e6a3d6622c13073c2413b24ba2.png',
  nanotechindustries: 'corporation-logo-14d5d1e2cf977a054d6d10fe41659d522692c21c06bcaf3362681b66b4dc88a9.png',
  nirgalenterprises: 'corporation-logo-8de3d5c1563709b2180101717e8dcf35d0d2618e44d1e593c5f62a2c420dfb3d.png',
  odyssey: 'corporation-logo-95760a71ef0cf060ded725fcd302ddfcdeb38f7f0e2cd0d30fbacf75bdb4fd24.png',
  palladinshipping: 'corporation-logo-55b65f046458cf9b64d9fa17ccc9cebf073e94a65b5c1c029a7e453f68dff44e.png',
  pharmacyunion: 'corporation-logo-dc46360f38f6e4e1ee5b05caa254027b431a75824ef547fe729fb2275f4309ec.png',
  philares: 'corporation-logo-bd58849d5539d7c804665090d605d4b81574e7e3a6f3168091f86ed8038f08c3.png',
  phobolog: 'corporation-logo-2da454ab3d53d9faacc88298f660846a40ebed3f40a9b0ba4b06fa1002feca9e.png',
  playwrights: 'corporation-logo-ad0d4bde6451e9bc7220f39cbb9190df9e8b8748c28814ebb5031b5f06cd0dbf.png',
  pointluna: 'corporation-logo-c1ef8aab1384feb7643fca8b8055b3d175df1a5ae34347abdb0ac5700a640a23.png',
  polaris: 'corporation-logo-ca00fc68c564a02be37dde59aac7612db4d425afc84580826902a0bffbcbdbc3.png',
  poldertechdutch: 'corporation-logo-86ba2dc3db655b826ed545a7ee6d1dc5479bc5f645a6c0f6d769313e15db6de8.png',
  polyphemos: 'corporation-logo-003be6f6cc3a5a4e365d69b204b0af7f48b44bbaca87bf0c9b8676cee9a3a83c.png',
  poseidon: 'corporation-logo-41d16ae15e34afa04f31d66d82566c6902bc3138abd1536c58929660024d935c.png',
  pristar: 'corporation-logo-948d9404446dfff1785385cb62b71af23b3fd2198dc5763dd808b2daaec87816.png',
  project10: 'corporation-logo-e16d2d23fb2307786d69908dd814578b1a46e5f5a806be0c2c317736902d195f.png',
  projectworkshop: 'corporation-logo-a850ff142c5c5c9a7b8ef4e1b9e1a5e4d41e63c70c9b2316de5fe4a76d4e4dc6.png',
  recyclon: 'corporation-logo-29e20be3d7cb8d2e6272ffffbe04b9aa61cd40ec0d10e64de5232858455cf80c.png',
  ringcom: 'corporation-logo-3816cbc197b0687bca27858bd62773c8c37904847cb6d139571ab9ce4460b07a.png',
  robinhaulings: 'corporation-logo-a07c584b4a610b5637301e9cad66536dadcbe870811a1e8151b287e540e82dc7.png',
  robinsonindustries: 'corporation-logo-1117a054a416013472e982751d1b15b35b7780338950f3a103d49555e936a228.png',
  sagittafrontierservices: 'corporation-logo-3a30a0b317dd5f0d6736f5d40f21f4de2082a526d2bd096981700391e265cb60.png',
  saturnsystems: 'corporation-logo-9d35cd99dbcbfa373f7ef57a91db1dfb1a7193c612d2db9e091f15e46a103962.png',
  secretsantasociety: 'corporation-logo-4e3ad8e20c1328587c1f93166233dd6b2d4ae7acc84c27396f9782036518a2c4.png',
  septemtribus: 'corporation-logo-8e25225f61c3ecc37c43fff6bf9fe94c72908444817e8f5fd76795989bba518a.png',
  solbank: 'corporation-logo-bd3f5fddcd92653b1022dabbe60573c2e86b7370535b30bf696075ea38ec55d6.png',
  soylentseedlingsystems: 'corporation-logo-ff92a27a00fabfc536b3aec58466602b24a66955c8646da608d73a55884c096c.png',
  spaceways: 'corporation-logo-f33ecb4d4e25b6300d87786e3291931dbf5d1a7d889c68400f8b84fcdb09ce0c.png',
  spire: 'corporation-logo-4e187f25db2d17a3c95964614d632cdd3964cd51c2b918f0487e190db66dda56.png',
  splice: 'corporation-logo-dcbf6c4276269c37aabf8f7b12ce27d92304b606be185c5900482d3235c5d3a0.png',
  steelaris: 'corporation-logo-83e9bdbc066926c97b481be11db06826a41c9cea891130c1a981657a9640680a.png',
  stormcraftincorporated: 'corporation-logo-0d37c649a3fd187332a3667d373f4ee4f2f73b88a2bf5e70f5f88a05f5ff244e.png',
  tempestconsultancy: 'corporation-logo-28c86a9178190725af2dc5f1bdf0bf03e790c336000315b55c13aac1c48d5612.png',
  tempestinc: 'corporation-logo-cac5d7adcdb770160bcaea7849c456d9695ce34659bb7b1819d394f68a722d5e.png',
  teractor: 'corporation-logo-7feb91f864d4724333c0a426af15a731bae7fba647e30f3117140448dcd89b37.png',
  terralabsresearch: 'corporation-logo-7a10135f01761a35b600f37950996615f58bd74736b10111ac2288c435fcea11.png',
  tharsisrepublic: 'corporation-logo-91d85f9f4914f06932da1e75da18eaf2dec9a7cc87c42fbd62a6c97ab1806d77.png',
  thearchaicfoundationinstitute: 'corporation-logo-722b08c3fcbf5ed7247b3a7cfeebbf2d68146d7a6b0dc8c3defeaedb48d48bff.png',
  thedarksideofthemoonsyndicate: 'corporation-logo-2c266baa3e10d50ceeca76cd36c371df73cad54cf5a76ecf52a0adc314cc0f48.png',
  thegrandlunacapitalgroup: 'corporation-logo-4c06115cdf74aed14f7a8a04503203d1c72bf3ed689306903dd8e0da109faedb.png',
  thorgate: 'corporation-logo-30eff9a6d7b4ae6fea646bf2621b8f75278b35b0970a9c6d478f04f9c9b21323.png',
  tychomagnetics: 'corporation-logo-645f72d2b94a7b983b41c4f02713af6cea9690138b5dc83ed4483927bd482f09.png',
  unitednationsmarsinitiative: 'corporation-logo-f40efc99b906e6cbe5833a1d58ce18df1f77b6078182c6e30b5687a8b3d29823.png',
  unitednationsmissionone: 'corporation-logo-645750c78342d537c73e434f6676835ecb0b9c229f35301e81a1cefe8a88170c.png',
  utopiainvest: 'corporation-logo-9f5203c5e8a5a9c471ec1b98ea8a0edce5f68f15eabff5d9d481a2c6c450caae.png',
  valleytrust: 'corporation-logo-35e8a44cf63c746a3345280cd2d0877eb424c194e98dc8d230e8d09d6dab831c.png',
  viron: 'corporation-logo-0d5f710e903b0474c763c6c49d6871060d740202a18bd6a242c01d51bfc48017.png',
  vitor: 'corporation-logo-b34dcd6611174f47f19ac9800704e65d8ac998658c9c351b09fc335c01fe7e45.png',
  voltagon: 'corporation-logo-c12b35fad3c3b06f2d39419fbe70d636b3d81ee4f0b8c8b9333f9c8b1b81ae6b.png',
};

export function normalizeCorporationName(name: string): string {
  return name.toLowerCase().replace(/[^a-z0-9]/g, '');
}

export function hasCorporationLogo(name: string): boolean {
  return normalizeCorporationName(name) in CORPORATION_LOGO_PATHS;
}

export function getCorporationLogoUrl(name: string): string | null {
  const path = CORPORATION_LOGO_PATHS[normalizeCorporationName(name)];
  return path ? getSupabaseGameAssetUrl('tm-corporation-logos', path) : null;
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
      src={getSupabaseGameAssetUrl('tm-corporation-logos', path)}
      unoptimized
      width={size}
    />
  );
}
