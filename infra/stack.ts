import { App, CfnOutput, Duration, RemovalPolicy, Stack, StackProps } from "aws-cdk-lib";
import { Construct } from "constructs";
import * as apigwv2 from "aws-cdk-lib/aws-apigatewayv2";
import { WebSocketLambdaIntegration } from "aws-cdk-lib/aws-apigatewayv2-integrations";
import * as dynamodb from "aws-cdk-lib/aws-dynamodb";
import * as iam from "aws-cdk-lib/aws-iam";
import * as lambda from "aws-cdk-lib/aws-lambda";
import * as logs from "aws-cdk-lib/aws-logs";
import { cpSync, mkdirSync } from "node:fs";
import { fileURLToPath } from "node:url";

// SecureString created outside CDK (generated during setup, never printed); shared with the
// Cloudflare Worker as its COACH_SECRET.
const COACH_SECRET_PARAM = "/spotter/coach-worker-secret";

class SpotterRelayStack extends Stack {
  constructor(scope: Construct, id: string, props?: StackProps) {
    super(scope, id, props);

    const table = new dynamodb.Table(this, "Sessions", {
      partitionKey: { name: "pk", type: dynamodb.AttributeType.STRING },
      billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
      timeToLiveAttribute: "expiresAt",
      removalPolicy: RemovalPolicy.DESTROY,
    });

    const relay = new lambda.Function(this, "Relay", {
      runtime: lambda.Runtime.NODEJS_22_X,
      architecture: lambda.Architecture.ARM_64,
      handler: "relay.handler",
      code: lambda.Code.fromAsset(fileURLToPath(new URL("./lambda", import.meta.url)), {
        exclude: ["*.test.mjs"],
      }),
      memorySize: 512,
      // Coach requests wait on an AI provider (8 s timeout in coach.mjs); frames finish in milliseconds.
      timeout: Duration.seconds(20),
      environment: {
        TABLE_NAME: table.tableName,
        COACH_PROVIDER: "workers-ai", // switch to "bedrock" once AWS enables it on this account
        COACH_WORKER_URL: "https://spotter-coach.ramy-comm.workers.dev",
        COACH_SECRET_PARAM: COACH_SECRET_PARAM,
      },
      logGroup: new logs.LogGroup(this, "RelayLogs", {
        retention: logs.RetentionDays.ONE_WEEK,
        removalPolicy: RemovalPolicy.DESTROY,
      }),
    });
    table.grantReadWriteData(relay);
    relay.addToRolePolicy(
      new iam.PolicyStatement({
        actions: ["ssm:GetParameter"],
        resources: [`arn:aws:ssm:${this.region}:${this.account}:parameter${COACH_SECRET_PARAM}`],
      }),
    );
    // Name clips ("Let's go, Ramy!"); see lambda/voiceNames.mjs for the limits.
    relay.addToRolePolicy(new iam.PolicyStatement({ actions: ["polly:SynthesizeSpeech"], resources: ["*"] }));
    relay.addToRolePolicy(
      new iam.PolicyStatement({
        actions: ["bedrock:InvokeModel"],
        resources: [
          `arn:aws:bedrock:*::foundation-model/*`,
          `arn:aws:bedrock:*:${this.account}:inference-profile/*`,
        ],
      }),
    );

    const integration = new WebSocketLambdaIntegration("RelayIntegration", relay);
    const api = new apigwv2.WebSocketApi(this, "RelayApi", {
      connectRouteOptions: { integration },
      disconnectRouteOptions: { integration },
      defaultRouteOptions: { integration },
    });
    const stage = new apigwv2.WebSocketStage(this, "Live", {
      webSocketApi: api,
      stageName: "live",
      autoDeploy: true,
      // Caps the whole API: one active session sends ~15-30 frames/s.
      throttle: { rateLimit: 200, burstLimit: 400 },
    });
    api.grantManageConnections(relay);

    // Phone camera page, served over HTTPS (the camera API requires it) from a Lambda function URL.
    // CloudFront would be the usual choice, but this account can't create CloudFront resources yet.
    const siteDir = fileURLToPath(new URL("./site", import.meta.url));
    mkdirSync(`${siteDir}/public`, { recursive: true });
    cpSync(fileURLToPath(new URL("../phone-web/index.html", import.meta.url)), `${siteDir}/public/index.html`);
    cpSync(fileURLToPath(new URL("../voice/clips", import.meta.url)), `${siteDir}/public/audio`, { recursive: true });
    cpSync(fileURLToPath(new URL("../voice/clips.json", import.meta.url)), `${siteDir}/public/audio/clips.json`);
    cpSync(fileURLToPath(new URL("./lambda/voiceNames.mjs", import.meta.url)), `${siteDir}/voiceNames.mjs`);
    const site = new lambda.Function(this, "PhoneSite", {
      runtime: lambda.Runtime.NODEJS_22_X,
      architecture: lambda.Architecture.ARM_64,
      handler: "handler.handler",
      code: lambda.Code.fromAsset(siteDir),
      memorySize: 128,
      timeout: Duration.seconds(5),
      environment: { RELAY_URL: stage.url, TABLE_NAME: table.tableName },
      logGroup: new logs.LogGroup(this, "PhoneSiteLogs", {
        retention: logs.RetentionDays.ONE_WEEK,
        removalPolicy: RemovalPolicy.DESTROY,
      }),
    });
    table.grantReadData(site); // serves cached name clips; it never writes or calls Polly
    const siteUrl = site.addFunctionUrl({ authType: lambda.FunctionUrlAuthType.NONE });

    new CfnOutput(this, "RelayUrl", { value: stage.url });
    new CfnOutput(this, "PhoneUrl", { value: siteUrl.url });
  }
}

const app = new App();
new SpotterRelayStack(app, "SpotterRelay", { env: { region: "eu-central-1" } });
