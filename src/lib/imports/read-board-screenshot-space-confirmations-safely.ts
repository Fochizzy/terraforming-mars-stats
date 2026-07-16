import { serializeUnknownError } from '@/lib/errors/describe-unknown-error';
import type { SupportedBoardMapId } from './board-space-maps';
import type {
  BoardScreenshotSpaceConfirmationMap,
  BoardScreenshotSpaceRequest,
} from './read-board-screenshot-space-confirmations';

export async function readBoardScreenshotSpaceConfirmationsSafely(input: {
  input: {
    mapId: SupportedBoardMapId;
    requests: BoardScreenshotSpaceRequest[];
    screenshots: File[];
  };
  readConfirmations: (input: {
    mapId: SupportedBoardMapId;
    requests: BoardScreenshotSpaceRequest[];
    screenshots: File[];
  }) => Promise<BoardScreenshotSpaceConfirmationMap>;
}) {
  try {
    return await input.readConfirmations(input.input);
  } catch (error) {
    console.warn(
      'Board screenshot confirmation OCR failed',
      serializeUnknownError(error),
    );

    return undefined;
  }
}
