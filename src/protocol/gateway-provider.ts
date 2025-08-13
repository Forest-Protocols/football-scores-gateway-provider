import {
  Agreement,
  DeploymentStatus,
  PipeError,
  PipeResponseCodes,
  PipeResponseCodeType,
} from "@forest-protocols/sdk";
import { DetailedOffer, Resource } from "@/types";
import { z } from "zod";
import { VirtualProviderConfigurationInformation } from "@/abstract/AbstractProvider";
import {
  ScorePredictionResourceDetails,
  ScorePredictionServiceProvider,
} from "./base-provider";
import { makePredictionRequest } from "./utils";

/**
 * Gateway Provider (gPROV) is a Provider type that acts as a gateway for its
 * implementation with a set of configuration to the Virtual Providers (vPROV)
 * that are registered on it. You can find an example implementation of a gPROV right below.
 */
export class GatewayProviderImplementation extends ScorePredictionServiceProvider {
  /**
   * Returns what kind of configuration can be applied by a vPROV. The returned
   * object will be used to show vPROVs to inform them about what configurations
   * are available and their meanings. So feel free to structure that object as you wish!
   * As long as it is meaningful and can be understood by the vPROVs, it is fine.
   */
  get availableVirtualProviderConfigurations(): Record<
    string,
    VirtualProviderConfigurationInformation
  > {
    return {
      apiBaseURL: {
        example: "https://api.score-prediction.net",
        format: "http(s)://<address>(port if needed)",
        description:
          "The API that will be used for the predictions. Must be compatible with Prediction API spec",
        required: true,
      },
      apiKey: {
        example: "4vXK8xf3wTYJzVk18ADtoRkhblC79gvgZ0XhEFPc", // Example key
        description: `API key that will be included in the "Authorization" header`,
        required: true,
      },
    };
  }

  /**
   * Returns the Zod schema that will be used when vPROVs wants to configure their Offers.
   */
  get virtualProviderConfigurationSchema() {
    return z.object({
      apiBaseURL: z.string().url(),
      apiKey: z.string(),
    });
  }

  async predictFixtureResults(
    agreement: Agreement,
    resource: Resource,
    challenges: string
  ): Promise<{ predictions: string; responseCode: PipeResponseCodeType }> {
    // Find the configuration of the Offer
    const configuration = await this.getVirtualProviderConfiguration(
      agreement.offerId,
      this.protocol.address
    );

    // Check the existence of the configuration
    if (!configuration) {
      throw new PipeError(PipeResponseCodes.INTERNAL_SERVER_ERROR, {
        message: "Configuration of the Offer is not found",
      });
    }

    // Remove milliseconds from the kickoffTime string from each challenge
    // Because some of the APIs may throw error because their parsing approaches
    const objChallenges = JSON.parse(challenges) as { kickoffTime: string }[];
    const challengesToPredict = JSON.stringify(
      objChallenges.map((challenge) => {
        return {
          ...challenge,
          kickoffTime:
            // The only dot character that exists in the kickoffTime string is the dot character that separates the time and milliseconds.
            new Date(challenge.kickoffTime).toISOString().split(".")[0] + "Z",
        };
      })
    );

    // Fetch predictions from Genius API
    const apiResponse = await makePredictionRequest(
      configuration.apiBaseURL,
      configuration.apiKey,
      challengesToPredict,
      this.logger
    );
    return {
      predictions: JSON.stringify(apiResponse),
      responseCode: PipeResponseCodes.OK,
    };
  }

  async create(
    agreement: Agreement,
    offer: DetailedOffer
  ): Promise<ScorePredictionResourceDetails> {
    if (typeof offer.details == "object") {
      const numberOfPredictions =
        (
          offer.details?.params["Number of Predictions"] as {
            value: number;
            unit: string;
          }
        )?.value || 0;

      return {
        status: DeploymentStatus.Running,
        Predictions_Allowance_Count: numberOfPredictions,
        Predictions_Count: 0,
      };
    }
    throw new Error("Invalid offer details");
  }

  async getDetails(
    agreement: Agreement,
    offer: DetailedOffer,
    resource: Resource
  ): Promise<ScorePredictionResourceDetails> {
    return {
      ...resource.details,
      status: resource.deploymentStatus,
    };
  }

  async delete(
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    agreement: Agreement,
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    offer: DetailedOffer,
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    resource: Resource
  ): Promise<void> {}
}
