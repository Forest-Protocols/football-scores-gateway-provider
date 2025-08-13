import { PipeError, PipeResponseCodes } from "@forest-protocols/sdk";
import { Logger } from "winston";
import { Prediction } from "./base-provider";
import { ensureError } from "@/utils/ensure-error";

export async function makePredictionRequest(
  url: string,
  apiKey: string,
  challenges: string,
  logger: Logger
) {
  const response = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: challenges,
    signal: AbortSignal.timeout(120000),
  }).catch((err) => {
    const error = ensureError(err);
    logger.debug(`Fetch error cause: ${error.cause}`);

    throw err;
  });

  if (!response.ok) {
    logger.error(
      `API call to ${url} failed with status ${
        response.status
      }: ${await response.text().catch(() => "[body not available]")}`
    );
    throw new PipeError(PipeResponseCodes.INTERNAL_SERVER_ERROR, {
      predictions: "",
      message: `Prediction is failed`,
    });
  }

  logger.debug(
    `Response got from ${url}: ${await response
      .clone() // Clone it so the original one is not consumed
      .text()
      .catch(() => "[not available]")}`
  );

  return (await response.json()) as Prediction[];
}
