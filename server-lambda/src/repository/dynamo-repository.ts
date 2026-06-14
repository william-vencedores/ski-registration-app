import {
  DynamoDBClient,
  CreateTableCommand,
  DescribeTableCommand,
  ResourceNotFoundException,
  KeyType,
  ScalarAttributeType,
  ProjectionType,
  BillingMode,
  ConditionalCheckFailedException,
} from '@aws-sdk/client-dynamodb';
import {
  DynamoDBDocumentClient,
  PutCommand,
  GetCommand,
  QueryCommand,
  UpdateCommand,
  DeleteCommand,
  ScanCommand,
} from '@aws-sdk/lib-dynamodb';
import { config } from '../config/index.js';

const client = new DynamoDBClient({
  region: config.dynamodb.region,
  ...(config.dynamodb.endpoint ? { endpoint: config.dynamodb.endpoint } : {}),
});

const docClient = DynamoDBDocumentClient.from(client, {
  marshallOptions: { removeUndefinedValues: true },
});

const tableName = config.dynamodb.tableName;

export { ConditionalCheckFailedException };

export async function putItem(item: Record<string, unknown>): Promise<void> {
  await docClient.send(new PutCommand({ TableName: tableName, Item: item }));
}

export async function getItem(pk: string, sk: string): Promise<Record<string, unknown> | null> {
  const result = await docClient.send(
    new GetCommand({ TableName: tableName, Key: { PK: pk, SK: sk } })
  );
  return result.Item as Record<string, unknown> | undefined ?? null;
}

export async function queryByPk(pk: string): Promise<Record<string, unknown>[]> {
  const result = await docClient.send(
    new QueryCommand({
      TableName: tableName,
      KeyConditionExpression: 'PK = :pk',
      ExpressionAttributeValues: { ':pk': pk },
    })
  );
  return (result.Items as Record<string, unknown>[]) ?? [];
}

export async function queryByPkAndSkPrefix(
  pk: string,
  skPrefix: string
): Promise<Record<string, unknown>[]> {
  const result = await docClient.send(
    new QueryCommand({
      TableName: tableName,
      KeyConditionExpression: 'PK = :pk AND begins_with(SK, :skPrefix)',
      ExpressionAttributeValues: { ':pk': pk, ':skPrefix': skPrefix },
    })
  );
  return (result.Items as Record<string, unknown>[]) ?? [];
}

export async function queryGsi(
  indexName: string,
  pkName: string,
  pkValue: string,
  skName: string | null,
  skPrefix: string | null
): Promise<Record<string, unknown>[]> {
  let keyExpr = `${pkName} = :pk`;
  const exprValues: Record<string, unknown> = { ':pk': pkValue };

  if (skPrefix != null && skName != null) {
    keyExpr += ` AND begins_with(${skName}, :skPrefix)`;
    exprValues[':skPrefix'] = skPrefix;
  }

  const result = await docClient.send(
    new QueryCommand({
      TableName: tableName,
      IndexName: indexName,
      KeyConditionExpression: keyExpr,
      ExpressionAttributeValues: exprValues,
    })
  );
  return (result.Items as Record<string, unknown>[]) ?? [];
}

export async function updateItem(
  pk: string,
  sk: string,
  updateExpression: string,
  expressionValues: Record<string, unknown>,
  expressionNames?: Record<string, string> | null
): Promise<void> {
  await docClient.send(
    new UpdateCommand({
      TableName: tableName,
      Key: { PK: pk, SK: sk },
      UpdateExpression: updateExpression,
      ExpressionAttributeValues: expressionValues,
      ...(expressionNames ? { ExpressionAttributeNames: expressionNames } : {}),
    })
  );
}

export async function updateItemWithCondition(
  pk: string,
  sk: string,
  updateExpression: string,
  expressionValues: Record<string, unknown>,
  expressionNames: Record<string, string> | null,
  conditionExpression: string
): Promise<void> {
  await docClient.send(
    new UpdateCommand({
      TableName: tableName,
      Key: { PK: pk, SK: sk },
      UpdateExpression: updateExpression,
      ConditionExpression: conditionExpression,
      ExpressionAttributeValues: expressionValues,
      ...(expressionNames ? { ExpressionAttributeNames: expressionNames } : {}),
    })
  );
}

export async function deleteItem(pk: string, sk: string): Promise<void> {
  await docClient.send(
    new DeleteCommand({ TableName: tableName, Key: { PK: pk, SK: sk } })
  );
}

export async function scan(): Promise<Record<string, unknown>[]> {
  const result = await docClient.send(new ScanCommand({ TableName: tableName }));
  return (result.Items as Record<string, unknown>[]) ?? [];
}

export async function scanWithFilter(
  filterExpression: string,
  exprValues: Record<string, unknown>
): Promise<Record<string, unknown>[]> {
  const result = await docClient.send(
    new ScanCommand({
      TableName: tableName,
      FilterExpression: filterExpression,
      ExpressionAttributeValues: exprValues,
    })
  );
  return (result.Items as Record<string, unknown>[]) ?? [];
}

export async function createTableIfNotExists(): Promise<void> {
  try {
    await client.send(new DescribeTableCommand({ TableName: tableName }));
  } catch (e) {
    if (e instanceof ResourceNotFoundException) {
      await client.send(
        new CreateTableCommand({
          TableName: tableName,
          KeySchema: [
            { AttributeName: 'PK', KeyType: KeyType.HASH },
            { AttributeName: 'SK', KeyType: KeyType.RANGE },
          ],
          AttributeDefinitions: [
            { AttributeName: 'PK', AttributeType: ScalarAttributeType.S },
            { AttributeName: 'SK', AttributeType: ScalarAttributeType.S },
            { AttributeName: 'GSI1PK', AttributeType: ScalarAttributeType.S },
            { AttributeName: 'GSI1SK', AttributeType: ScalarAttributeType.S },
            { AttributeName: 'GSI2PK', AttributeType: ScalarAttributeType.S },
            { AttributeName: 'GSI2SK', AttributeType: ScalarAttributeType.S },
          ],
          GlobalSecondaryIndexes: [
            {
              IndexName: 'GSI1',
              KeySchema: [
                { AttributeName: 'GSI1PK', KeyType: KeyType.HASH },
                { AttributeName: 'GSI1SK', KeyType: KeyType.RANGE },
              ],
              Projection: { ProjectionType: ProjectionType.ALL },
            },
            {
              IndexName: 'GSI2',
              KeySchema: [
                { AttributeName: 'GSI2PK', KeyType: KeyType.HASH },
                { AttributeName: 'GSI2SK', KeyType: KeyType.RANGE },
              ],
              Projection: { ProjectionType: ProjectionType.ALL },
            },
          ],
          BillingMode: BillingMode.PAY_PER_REQUEST,
        })
      );
    } else {
      throw e;
    }
  }
}
