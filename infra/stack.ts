import { App, CfnOutput, Duration, RemovalPolicy, Stack, StackProps } from "aws-cdk-lib";
import { Construct } from "constructs";
import * as apigwv2 from "aws-cdk-lib/aws-apigatewayv2";
import { WebSocketLambdaIntegration } from "aws-cdk-lib/aws-apigatewayv2-integrations";
import * as dynamodb from "aws-cdk-lib/aws-dynamodb";
import * as lambda from "aws-cdk-lib/aws-lambda";
import * as logs from "aws-cdk-lib/aws-logs";
import { cpSync, mkdirSync } from "node:fs";
import { fileURLToPath } from "node:url";

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
      timeout: Duration.seconds(10),
      environment: { TABLE_NAME: table.tableName },
      logGroup: new logs.LogGroup(this, "RelayLogs", {
        retention: logs.RetentionDays.ONE_WEEK,
        removalPolicy: RemovalPolicy.DESTROY,
      }),
    });
    table.grantReadWriteData(relay);

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
    const site = new lambda.Function(this, "PhoneSite", {
      runtime: lambda.Runtime.NODEJS_22_X,
      architecture: lambda.Architecture.ARM_64,
      handler: "handler.handler",
      code: lambda.Code.fromAsset(siteDir),
      memorySize: 128,
      timeout: Duration.seconds(5),
      environment: { RELAY_URL: stage.url },
      logGroup: new logs.LogGroup(this, "PhoneSiteLogs", {
        retention: logs.RetentionDays.ONE_WEEK,
        removalPolicy: RemovalPolicy.DESTROY,
      }),
    });
    const siteUrl = site.addFunctionUrl({ authType: lambda.FunctionUrlAuthType.NONE });

    new CfnOutput(this, "RelayUrl", { value: stage.url });
    new CfnOutput(this, "PhoneUrl", { value: siteUrl.url });
  }
}

const app = new App();
new SpotterRelayStack(app, "SpotterRelay", { env: { region: "eu-central-1" } });
