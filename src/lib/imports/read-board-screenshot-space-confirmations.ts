import sharp from 'sharp';
import { type SupportedBoardMapId } from './board-space-maps';

export type BoardScreenshotTileKind =
  | 'city'
  | 'greenery'
  | 'ocean'
  | 'occupied_other'
  | 'empty'
  | 'unknown';

export type BoardSpaceConfirmation = {
  confidence?: number;
  status: 'confirmed' | 'conflict' | 'inconclusive';
  tileKind: BoardScreenshotTileKind;
};

export type BoardScreenshotSpaceRequest = {
  spaceId: string;
};

export type BoardScreenshotSpaceConfirmationMap = Record<
  string,
  BoardSpaceConfirmation
>;

export type BoardScreenshotSpaceSample = {
  centerX: number;
  centerY: number;
  sampleRadius: number;
};

type BoardScreenshotMapRegistry = {
  boardCenterX: number;
  boardCenterY: number;
  boardRadius: number;
  mapId: SupportedBoardMapId;
  spaces: Record<string, BoardScreenshotSpaceSample>;
};

type DecodedImage = {
  channels: number;
  data: Uint8Array;
  height: number;
  width: number;
};

type ColorSample = {
  average: number;
  b: number;
  g: number;
  maxChannel: number;
  minChannel: number;
  r: number;
};

const FIXTURE_WIDTH = 552;
const FIXTURE_HEIGHT = 437;
const FIXTURE_MIN_DIMENSION = Math.min(FIXTURE_WIDTH, FIXTURE_HEIGHT);

// Hand-mapped from the provided fixture around the Noctis cluster.
const sharedCuratedSpaceSamples: Record<string, BoardScreenshotSpaceSample> = {
  '20': {
    centerX: 145 / FIXTURE_WIDTH,
    centerY: 206 / FIXTURE_HEIGHT,
    sampleRadius: 15 / FIXTURE_MIN_DIMENSION,
  },
  '21': {
    centerX: 114 / FIXTURE_WIDTH,
    centerY: 230 / FIXTURE_HEIGHT,
    sampleRadius: 15 / FIXTURE_MIN_DIMENSION,
  },
  '22': {
    centerX: 147 / FIXTURE_WIDTH,
    centerY: 231 / FIXTURE_HEIGHT,
    sampleRadius: 15 / FIXTURE_MIN_DIMENSION,
  },
  '29': {
    centerX: 104 / FIXTURE_WIDTH,
    centerY: 252 / FIXTURE_HEIGHT,
    sampleRadius: 15 / FIXTURE_MIN_DIMENSION,
  },
  '30': {
    centerX: 147 / FIXTURE_WIDTH,
    centerY: 255 / FIXTURE_HEIGHT,
    sampleRadius: 15 / FIXTURE_MIN_DIMENSION,
  },
  '31': {
    centerX: 230 / FIXTURE_WIDTH,
    centerY: 305 / FIXTURE_HEIGHT,
    sampleRadius: 15 / FIXTURE_MIN_DIMENSION,
  },
  '32': {
    centerX: 224 / FIXTURE_WIDTH,
    centerY: 248 / FIXTURE_HEIGHT,
    sampleRadius: 15 / FIXTURE_MIN_DIMENSION,
  },
  '39': {
    centerX: 148 / FIXTURE_WIDTH,
    centerY: 280 / FIXTURE_HEIGHT,
    sampleRadius: 15 / FIXTURE_MIN_DIMENSION,
  },
  '40': {
    centerX: 152 / FIXTURE_WIDTH,
    centerY: 331 / FIXTURE_HEIGHT,
    sampleRadius: 15 / FIXTURE_MIN_DIMENSION,
  },
};

const boardScreenshotRegistries: Record<
  SupportedBoardMapId,
  BoardScreenshotMapRegistry
> = {
  tharsis: {
    boardCenterX: 244 / FIXTURE_WIDTH,
    boardCenterY: 239 / FIXTURE_HEIGHT,
    boardRadius: 158 / FIXTURE_MIN_DIMENSION,
    mapId: 'tharsis',
    spaces: sharedCuratedSpaceSamples,
  },
  hellas: {
    boardCenterX: 244 / FIXTURE_WIDTH,
    boardCenterY: 239 / FIXTURE_HEIGHT,
    boardRadius: 158 / FIXTURE_MIN_DIMENSION,
    mapId: 'hellas',
    spaces: sharedCuratedSpaceSamples,
  },
  elysium: {
    boardCenterX: 244 / FIXTURE_WIDTH,
    boardCenterY: 239 / FIXTURE_HEIGHT,
    boardRadius: 158 / FIXTURE_MIN_DIMENSION,
    mapId: 'elysium',
    spaces: sharedCuratedSpaceSamples,
  },
};

function clamp(value: number, minimum: number, maximum: number) {
  return Math.min(maximum, Math.max(minimum, value));
}

function getMapRegistry(mapId: SupportedBoardMapId) {
  return boardScreenshotRegistries[mapId];
}

export function getBoardScreenshotSpaceRegistry(
  mapId: SupportedBoardMapId,
): Record<string, BoardScreenshotSpaceSample> {
  return getMapRegistry(mapId).spaces;
}

function getPixelSample(image: DecodedImage, x: number, y: number): ColorSample {
  const clampedX = clamp(Math.round(x), 0, image.width - 1);
  const clampedY = clamp(Math.round(y), 0, image.height - 1);
  const pixelIndex = (clampedY * image.width + clampedX) * image.channels;
  const r = image.data[pixelIndex] ?? 0;
  const g = image.data[pixelIndex + 1] ?? 0;
  const b = image.data[pixelIndex + 2] ?? 0;
  const maxChannel = Math.max(r, g, b);
  const minChannel = Math.min(r, g, b);

  return {
    average: (r + g + b) / 3,
    b,
    g,
    maxChannel,
    minChannel,
    r,
  };
}

function sampleCircularBand(input: {
  centerX: number;
  centerY: number;
  image: DecodedImage;
  radius: number;
}) {
  const samples: ColorSample[] = [];
  const radii = [0.56, 0.68];

  for (const radiusMultiplier of radii) {
    const currentRadius = input.radius * radiusMultiplier;

    for (let index = 0; index < 12; index += 1) {
      const angle = (Math.PI * 2 * index) / 12;
      samples.push(
        getPixelSample(
          input.image,
          input.centerX + Math.cos(angle) * currentRadius,
          input.centerY + Math.sin(angle) * currentRadius,
        ),
      );
    }
  }

  return samples;
}

function sampleInnerRing(input: {
  centerX: number;
  centerY: number;
  image: DecodedImage;
  radius: number;
}) {
  const samples: ColorSample[] = [];

  for (let index = 0; index < 8; index += 1) {
    const angle = (Math.PI * 2 * index) / 8;
    samples.push(
      getPixelSample(
        input.image,
        input.centerX + Math.cos(angle) * input.radius * 0.28,
        input.centerY + Math.sin(angle) * input.radius * 0.28,
      ),
    );
  }

  return samples;
}

function isBackgroundLike(sample: ColorSample) {
  return sample.average < 90 && sample.maxChannel - sample.minChannel < 35;
}

function looksLikeExpectedBoardFrame(
  image: DecodedImage,
  registry: BoardScreenshotMapRegistry,
) {
  const minDimension = Math.min(image.width, image.height);
  const centerX = registry.boardCenterX * image.width;
  const centerY = registry.boardCenterY * image.height;
  const radius = registry.boardRadius * minDimension;
  let outsideBackgroundMatches = 0;
  let insideBoardMatches = 0;

  for (let index = 0; index < 8; index += 1) {
    const angle = (Math.PI * 2 * index) / 8;
    const outsideSample = getPixelSample(
      image,
      centerX + Math.cos(angle) * (radius + minDimension * 0.06),
      centerY + Math.sin(angle) * (radius + minDimension * 0.06),
    );
    const insideSample = getPixelSample(
      image,
      centerX + Math.cos(angle) * radius * 0.62,
      centerY + Math.sin(angle) * radius * 0.62,
    );

    if (isBackgroundLike(outsideSample)) {
      outsideBackgroundMatches += 1;
    }

    if (!isBackgroundLike(insideSample)) {
      insideBoardMatches += 1;
    }
  }

  return outsideBackgroundMatches >= 5 && insideBoardMatches >= 6;
}

function countMatches(
  samples: ColorSample[],
  predicate: (sample: ColorSample) => boolean,
) {
  return samples.reduce(
    (count, sample) => (predicate(sample) ? count + 1 : count),
    0,
  );
}

function buildAverageSample(samples: ColorSample[]) {
  if (samples.length === 0) {
    return {
      average: 0,
      b: 0,
      g: 0,
      maxChannel: 0,
      minChannel: 0,
      r: 0,
    };
  }

  const averageSample = samples.reduce(
    (totals, sample) => ({
      average: totals.average + sample.average,
      b: totals.b + sample.b,
      g: totals.g + sample.g,
      maxChannel: totals.maxChannel + sample.maxChannel,
      minChannel: totals.minChannel + sample.minChannel,
      r: totals.r + sample.r,
    }),
    {
      average: 0,
      b: 0,
      g: 0,
      maxChannel: 0,
      minChannel: 0,
      r: 0,
    },
  );

  return {
    average: averageSample.average / samples.length,
    b: averageSample.b / samples.length,
    g: averageSample.g / samples.length,
    maxChannel: averageSample.maxChannel / samples.length,
    minChannel: averageSample.minChannel / samples.length,
    r: averageSample.r / samples.length,
  };
}

function classifyBandSamples(input: {
  bandSamples: ColorSample[];
  innerSamples: ColorSample[];
}): BoardSpaceConfirmation {
  const totalSamples = input.bandSamples.length;

  if (totalSamples === 0) {
    return {
      status: 'inconclusive',
      tileKind: 'unknown',
    };
  }

  const averageBandSample = buildAverageSample(input.bandSamples);
  const averageInnerSample = buildAverageSample(input.innerSamples);

  if (
    averageBandSample.b > 112 &&
    averageBandSample.b - averageBandSample.g >= 10 &&
    averageBandSample.b - averageBandSample.r >= 12
  ) {
    return {
      confidence: 0.72,
      status: 'confirmed',
      tileKind: 'ocean',
    };
  }

  if (
    averageBandSample.g > 105 &&
    averageBandSample.g - averageBandSample.r >= 18 &&
    averageBandSample.g - averageBandSample.b >= 18
  ) {
    return {
      confidence: 0.72,
      status: 'confirmed',
      tileKind: 'greenery',
    };
  }

  if (
    averageBandSample.average > 130 &&
    Math.abs(averageBandSample.r - averageBandSample.g) <= 30 &&
    Math.abs(averageBandSample.g - averageBandSample.b) <= 30
  ) {
    return {
      confidence: 0.72,
      status: 'confirmed',
      tileKind: 'city',
    };
  }

  const oceanScore =
    countMatches(
      input.bandSamples,
      (sample) =>
        sample.b > 96 && sample.b - sample.g > 6 && sample.b - sample.r > 12,
    ) / totalSamples;
  const greeneryScore =
    countMatches(
      input.bandSamples,
      (sample) =>
        sample.g > 85 && sample.g - sample.r > 16 && sample.g - sample.b > 6,
    ) / totalSamples;
  const cityScore =
    countMatches(
      input.bandSamples,
      (sample) =>
        sample.average > 105 &&
        sample.maxChannel - sample.minChannel < 34 &&
        sample.b - sample.r < 18,
    ) / totalSamples;
  const tanScore =
    countMatches(
      input.bandSamples,
      (sample) =>
        sample.r > 88 && sample.g > 60 && sample.r - sample.b > 18 &&
        sample.g - sample.b > 6,
    ) / totalSamples;
  const classScores = [
    ['ocean', oceanScore],
    ['greenery', greeneryScore],
    ['city', cityScore],
    ['tan', tanScore],
  ] as const;
  const rankedClassScores = [...classScores].sort(
    (left, right) => right[1] - left[1],
  );
  const [bestClass, bestScore] = rankedClassScores[0];
  const secondBestScore = rankedClassScores[1]?.[1] ?? 0;

  if (bestScore < 0.58 || bestScore - secondBestScore < 0.12) {
    return {
      status: 'inconclusive',
      tileKind: 'unknown',
    };
  }

  if (bestClass === 'ocean' || bestClass === 'greenery' || bestClass === 'city') {
    return {
      confidence: Number(bestScore.toFixed(2)),
      status: 'confirmed',
      tileKind: bestClass,
    };
  }

  if (bestClass !== 'tan') {
    return {
      status: 'inconclusive',
      tileKind: 'unknown',
    };
  }

  if (
    averageBandSample.average > 112 ||
    averageInnerSample.average > 105 ||
    averageBandSample.r - averageBandSample.g < 18
  ) {
    return {
      confidence: Number(bestScore.toFixed(2)),
      status: 'confirmed',
      tileKind: 'occupied_other',
    };
  }

  return {
    confidence: Number(bestScore.toFixed(2)),
    status: 'confirmed',
    tileKind: 'empty',
  };
}

function classifySpaceFromImage(input: {
  image: DecodedImage;
  sample: BoardScreenshotSpaceSample;
}) {
  const minDimension = Math.min(input.image.width, input.image.height);
  const centerX = input.sample.centerX * input.image.width;
  const centerY = input.sample.centerY * input.image.height;
  const radius = input.sample.sampleRadius * minDimension;
  let bestResult: BoardSpaceConfirmation = {
    status: 'inconclusive',
    tileKind: 'unknown',
  };

  for (const offsetX of [-4, 0, 4]) {
    for (const offsetY of [-4, 0, 4]) {
      const bandSamples = sampleCircularBand({
        centerX: centerX + offsetX,
        centerY: centerY + offsetY,
        image: input.image,
        radius,
      });
      const innerSamples = sampleInnerRing({
        centerX: centerX + offsetX,
        centerY: centerY + offsetY,
        image: input.image,
        radius,
      });
      const nextResult = classifyBandSamples({
        bandSamples,
        innerSamples,
      });

      if (
        nextResult.status === 'confirmed' &&
        (bestResult.status !== 'confirmed' ||
          (nextResult.confidence ?? 0) > (bestResult.confidence ?? 0))
      ) {
        bestResult = nextResult;
      }
    }
  }

  return bestResult;
}

function mergeSpaceConfirmations(
  confirmations: BoardSpaceConfirmation[],
): BoardSpaceConfirmation {
  const confirmedResults = confirmations.filter(
    (confirmation) => confirmation.status === 'confirmed',
  );

  if (confirmedResults.length === 0) {
    return {
      status: 'inconclusive',
      tileKind: 'unknown',
    };
  }

  const distinctKinds = new Set(
    confirmedResults.map((confirmation) => confirmation.tileKind),
  );

  if (distinctKinds.size > 1) {
    return {
      confidence: Number(
        Math.max(...confirmedResults.map((confirmation) => confirmation.confidence ?? 0)).toFixed(2),
      ),
      status: 'conflict',
      tileKind: 'unknown',
    };
  }

  return confirmedResults.sort(
    (left, right) => (right.confidence ?? 0) - (left.confidence ?? 0),
  )[0];
}

async function decodeScreenshot(file: File): Promise<DecodedImage> {
  const imageBuffer = Buffer.from(await file.arrayBuffer());
  const { data, info } = await sharp(imageBuffer)
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });

  return {
    channels: info.channels,
    data,
    height: info.height,
    width: info.width,
  };
}

export async function readBoardScreenshotSpaceConfirmations(input: {
  mapId: SupportedBoardMapId;
  requests: BoardScreenshotSpaceRequest[];
  screenshots: File[];
}): Promise<BoardScreenshotSpaceConfirmationMap> {
  const registry = getMapRegistry(input.mapId);
  const uniqueSpaceIds = [...new Set(input.requests.map((request) => request.spaceId))];

  if (uniqueSpaceIds.length === 0) {
    return {};
  }

  if (input.screenshots.length === 0) {
    return Object.fromEntries(
      uniqueSpaceIds.map((spaceId) => [
        spaceId,
        {
          status: 'inconclusive',
          tileKind: 'unknown',
        } satisfies BoardSpaceConfirmation,
      ]),
    );
  }

  const decodedImages = await Promise.all(
    input.screenshots.map((screenshot) => decodeScreenshot(screenshot)),
  );
  const resultEntries = uniqueSpaceIds.map((spaceId) => {
    const sample = registry.spaces[spaceId];

    if (!sample) {
      return [
        spaceId,
        {
          status: 'inconclusive',
          tileKind: 'unknown',
        } satisfies BoardSpaceConfirmation,
      ] as const;
    }

    const confirmations = decodedImages.map((image) =>
      looksLikeExpectedBoardFrame(image, registry)
        ? classifySpaceFromImage({
            image,
            sample,
          })
        : ({
            status: 'inconclusive',
            tileKind: 'unknown',
          } satisfies BoardSpaceConfirmation),
    );

    return [spaceId, mergeSpaceConfirmations(confirmations)] as const;
  });

  return Object.fromEntries(resultEntries);
}
