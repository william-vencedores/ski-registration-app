package com.vencedores.ski.repository;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Repository;
import software.amazon.awssdk.services.dynamodb.DynamoDbClient;
import software.amazon.awssdk.services.dynamodb.model.*;

import java.util.HashMap;
import java.util.List;
import java.util.Map;

@Repository
public class DynamoDbRepository {

    private final DynamoDbClient client;
    private final String tableName;

    public DynamoDbRepository(DynamoDbClient client,
                              @Value("${app.dynamodb.table-name}") String tableName) {
        this.client = client;
        this.tableName = tableName;
    }

    public void putItem(Map<String, AttributeValue> item) {
        client.putItem(PutItemRequest.builder()
                .tableName(tableName)
                .item(item)
                .build());
    }

    public Map<String, AttributeValue> getItem(String pk, String sk) {
        var key = Map.of(
                "PK", AttributeValue.builder().s(pk).build(),
                "SK", AttributeValue.builder().s(sk).build()
        );
        var response = client.getItem(GetItemRequest.builder()
                .tableName(tableName)
                .key(key)
                .build());
        return response.hasItem() ? response.item() : null;
    }

    public List<Map<String, AttributeValue>> queryByPk(String pk) {
        var response = client.query(QueryRequest.builder()
                .tableName(tableName)
                .keyConditionExpression("PK = :pk")
                .expressionAttributeValues(Map.of(
                        ":pk", AttributeValue.builder().s(pk).build()
                ))
                .build());
        return response.items();
    }

    public List<Map<String, AttributeValue>> queryByPkAndSkPrefix(String pk, String skPrefix) {
        var response = client.query(QueryRequest.builder()
                .tableName(tableName)
                .keyConditionExpression("PK = :pk AND begins_with(SK, :skPrefix)")
                .expressionAttributeValues(Map.of(
                        ":pk", AttributeValue.builder().s(pk).build(),
                        ":skPrefix", AttributeValue.builder().s(skPrefix).build()
                ))
                .build());
        return response.items();
    }

    public List<Map<String, AttributeValue>> queryGsi(String indexName, String pkName,
                                                       String pkValue, String skName,
                                                       String skPrefix) {
        var exprValues = new HashMap<String, AttributeValue>();
        exprValues.put(":pk", AttributeValue.builder().s(pkValue).build());

        String keyExpr = pkName + " = :pk";
        if (skPrefix != null) {
            keyExpr += " AND begins_with(" + skName + ", :skPrefix)";
            exprValues.put(":skPrefix", AttributeValue.builder().s(skPrefix).build());
        }

        var response = client.query(QueryRequest.builder()
                .tableName(tableName)
                .indexName(indexName)
                .keyConditionExpression(keyExpr)
                .expressionAttributeValues(exprValues)
                .build());
        return response.items();
    }

    public void updateItem(String pk, String sk, String updateExpression,
                           Map<String, AttributeValue> expressionValues,
                           Map<String, String> expressionNames) {
        var builder = UpdateItemRequest.builder()
                .tableName(tableName)
                .key(Map.of(
                        "PK", AttributeValue.builder().s(pk).build(),
                        "SK", AttributeValue.builder().s(sk).build()
                ))
                .updateExpression(updateExpression)
                .expressionAttributeValues(expressionValues);

        if (expressionNames != null && !expressionNames.isEmpty()) {
            builder.expressionAttributeNames(expressionNames);
        }

        client.updateItem(builder.build());
    }

    public void deleteItem(String pk, String sk) {
        client.deleteItem(DeleteItemRequest.builder()
                .tableName(tableName)
                .key(Map.of(
                        "PK", AttributeValue.builder().s(pk).build(),
                        "SK", AttributeValue.builder().s(sk).build()
                ))
                .build());
    }

    public List<Map<String, AttributeValue>> scan() {
        var response = client.scan(ScanRequest.builder()
                .tableName(tableName)
                .build());
        return response.items();
    }

    public List<Map<String, AttributeValue>> scanWithFilter(String filterExpression,
                                                             Map<String, AttributeValue> exprValues) {
        var response = client.scan(ScanRequest.builder()
                .tableName(tableName)
                .filterExpression(filterExpression)
                .expressionAttributeValues(exprValues)
                .build());
        return response.items();
    }

    public void createTableIfNotExists() {
        try {
            client.describeTable(DescribeTableRequest.builder()
                    .tableName(tableName).build());
        } catch (ResourceNotFoundException e) {
            client.createTable(CreateTableRequest.builder()
                    .tableName(tableName)
                    .keySchema(
                            KeySchemaElement.builder().attributeName("PK").keyType(KeyType.HASH).build(),
                            KeySchemaElement.builder().attributeName("SK").keyType(KeyType.RANGE).build()
                    )
                    .attributeDefinitions(
                            AttributeDefinition.builder().attributeName("PK").attributeType(ScalarAttributeType.S).build(),
                            AttributeDefinition.builder().attributeName("SK").attributeType(ScalarAttributeType.S).build(),
                            AttributeDefinition.builder().attributeName("GSI1PK").attributeType(ScalarAttributeType.S).build(),
                            AttributeDefinition.builder().attributeName("GSI1SK").attributeType(ScalarAttributeType.S).build()
                    )
                    .globalSecondaryIndexes(
                            GlobalSecondaryIndex.builder()
                                    .indexName("GSI1")
                                    .keySchema(
                                            KeySchemaElement.builder().attributeName("GSI1PK").keyType(KeyType.HASH).build(),
                                            KeySchemaElement.builder().attributeName("GSI1SK").keyType(KeyType.RANGE).build()
                                    )
                                    .projection(Projection.builder().projectionType(ProjectionType.ALL).build())
                                    .build()
                    )
                    .billingMode(BillingMode.PAY_PER_REQUEST)
                    .build());
        }
    }
}
